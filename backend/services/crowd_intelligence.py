"""Crowd intelligence service for hazard verification and refinement."""
import time
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import asyncio
from collections import defaultdict

from logger import setup_logger

logger = setup_logger(__name__)


class HazardStatus(Enum):
    """Hazard verification status."""
    UNVERIFIED = "unverified"  # Initial detection, not yet verified
    VERIFIED = "verified"      # Confirmed by multiple users
    DISPUTED = "disputed"      # Mixed feedback from users
    RESOLVED = "resolved"      # Hazard no longer exists (confirmed by users)
    EXPIRED = "expired"        # Too old without recent confirmations


class FeedbackType(Enum):
    """User feedback types."""
    CONFIRM = "confirm"        # User confirms hazard exists
    DENY = "deny"             # User denies hazard exists
    UPDATE = "update"         # User updates hazard details
    RESOLVE = "resolve"       # User marks hazard as resolved


@dataclass
class UserFeedback:
    """Individual user feedback on a hazard."""
    user_id: str
    feedback_type: FeedbackType
    timestamp: float
    location: Optional[Tuple[float, float]] = None  # (lat, lon)
    confidence: float = 1.0
    comment: Optional[str] = None


@dataclass
class Hazard:
    """Hazard with crowd intelligence data."""
    hazard_id: str
    class_name: str
    initial_confidence: float
    location: Tuple[float, float]  # (lat, lon)
    bbox: List[float]  # [x1, y1, x2, y2]
    detection_timestamp: float
    status: HazardStatus = HazardStatus.UNVERIFIED
    
    # Crowd intelligence fields
    confirmations: int = 0
    denials: int = 0
    total_feedback: int = 0
    confidence_score: float = 0.0  # Calculated from crowd feedback
    last_updated: float = field(default_factory=time.time)
    feedback_history: List[UserFeedback] = field(default_factory=list)
    verified_by: List[str] = field(default_factory=list)  # User IDs
    
    # Metadata
    severity: str = "medium"  # low, medium, high, critical
    expires_at: Optional[float] = None
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            'hazard_id': self.hazard_id,
            'class_name': self.class_name,
            'initial_confidence': round(self.initial_confidence, 3),
            'location': {
                'lat': self.location[0],
                'lon': self.location[1]
            },
            'bbox': [round(coord, 2) for coord in self.bbox],
            'detection_timestamp': self.detection_timestamp,
            'status': self.status.value,
            'crowd_intelligence': {
                'confirmations': self.confirmations,
                'denials': self.denials,
                'total_feedback': self.total_feedback,
                'confidence_score': round(self.confidence_score, 3),
                'verified_by_count': len(self.verified_by)
            },
            'last_updated': self.last_updated,
            'severity': self.severity,
            'expires_at': self.expires_at
        }


class CrowdIntelligenceService:
    """Service for managing crowd-sourced hazard verification."""
    
    def __init__(
        self,
        verification_threshold: int = 3,
        denial_threshold: int = 2,
        expiry_hours: int = 24,
        proximity_radius_meters: float = 50.0
    ):
        """
        Initialize crowd intelligence service.
        
        Args:
            verification_threshold: Minimum confirmations to mark as verified
            denial_threshold: Minimum denials to mark as disputed/resolved
            expiry_hours: Hours before hazard expires without feedback
            proximity_radius_meters: Radius for nearby user detection
        """
        self.verification_threshold = verification_threshold
        self.denial_threshold = denial_threshold
        self.expiry_hours = expiry_hours
        self.proximity_radius_meters = proximity_radius_meters
        
        # Storage
        self.hazards: Dict[str, Hazard] = {}  # hazard_id -> Hazard
        self.user_feedback: Dict[str, List[str]] = defaultdict(list)  # user_id -> [hazard_ids]
        self._lock = asyncio.Lock()
        
        # Statistics
        self.stats = {
            'total_hazards': 0,
            'verified_hazards': 0,
            'resolved_hazards': 0,
            'disputed_hazards': 0,
            'total_feedback': 0,
            'unique_contributors': 0
        }
        
        logger.info(f"Crowd Intelligence Service initialized:")
        logger.info(f"  - Verification threshold: {verification_threshold}")
        logger.info(f"  - Denial threshold: {denial_threshold}")
        logger.info(f"  - Expiry hours: {expiry_hours}")
        logger.info(f"  - Proximity radius: {proximity_radius_meters}m")
    
    async def add_hazard(
        self,
        hazard_id: str,
        class_name: str,
        confidence: float,
        location: Tuple[float, float],
        bbox: List[float],
        user_id: Optional[str] = None
    ) -> Hazard:
        """
        Add a new hazard to the crowd intelligence system.
        
        Args:
            hazard_id: Unique hazard identifier
            class_name: Type of hazard
            confidence: Initial AI confidence
            location: (lat, lon)
            bbox: Bounding box coordinates
            user_id: User who reported it
            
        Returns:
            Created Hazard object
        """
        async with self._lock:
            # Check if similar hazard already exists nearby
            existing = await self._find_nearby_hazard(location, class_name)
            if existing:
                logger.info(f"Found existing nearby hazard: {existing.hazard_id}")
                return existing
            
            # Create new hazard
            hazard = Hazard(
                hazard_id=hazard_id,
                class_name=class_name,
                initial_confidence=confidence,
                location=location,
                bbox=bbox,
                detection_timestamp=time.time(),
                confidence_score=confidence,  # Initial score = AI confidence
                expires_at=time.time() + (self.expiry_hours * 3600)
            )
            
            # Determine initial severity
            hazard.severity = self._calculate_severity(class_name, confidence)
            
            self.hazards[hazard_id] = hazard
            self.stats['total_hazards'] += 1
            
            logger.info(f"Added new hazard: {hazard_id} ({class_name}) at {location}")
            
            return hazard
    
    async def submit_feedback(
        self,
        hazard_id: str,
        user_id: str,
        feedback_type: FeedbackType,
        user_location: Optional[Tuple[float, float]] = None,
        confidence: float = 1.0,
        comment: Optional[str] = None
    ) -> Optional[Hazard]:
        """
        Submit user feedback for a hazard.
        
        Args:
            hazard_id: ID of hazard to provide feedback on
            user_id: User providing feedback
            feedback_type: Type of feedback
            user_location: User's current location
            confidence: User's confidence in their feedback (0-1)
            comment: Optional comment
            
        Returns:
            Updated Hazard object or None if not found
        """
        async with self._lock:
            hazard = self.hazards.get(hazard_id)
            if not hazard:
                logger.warning(f"Hazard not found: {hazard_id}")
                return None
            
            # Check if user is nearby (if location provided)
            if user_location:
                distance = self._calculate_distance(hazard.location, user_location)
                if distance > self.proximity_radius_meters:
                    logger.warning(
                        f"User {user_id} too far from hazard {hazard_id}: {distance:.1f}m"
                    )
                    return None
            
            # Check if user already provided feedback
            if user_id in hazard.verified_by:
                logger.info(f"User {user_id} already provided feedback for {hazard_id}")
                return hazard
            
            # Create feedback record
            feedback = UserFeedback(
                user_id=user_id,
                feedback_type=feedback_type,
                timestamp=time.time(),
                location=user_location,
                confidence=confidence,
                comment=comment
            )
            
            # Update hazard based on feedback
            hazard.feedback_history.append(feedback)
            hazard.verified_by.append(user_id)
            hazard.total_feedback += 1
            hazard.last_updated = time.time()
            
            if feedback_type == FeedbackType.CONFIRM:
                hazard.confirmations += 1
                logger.info(f"Hazard {hazard_id} confirmed by {user_id} ({hazard.confirmations} total)")
                
            elif feedback_type == FeedbackType.DENY:
                hazard.denials += 1
                logger.info(f"Hazard {hazard_id} denied by {user_id} ({hazard.denials} total)")
                
            elif feedback_type == FeedbackType.RESOLVE:
                hazard.denials += 1
                logger.info(f"Hazard {hazard_id} marked as resolved by {user_id}")
            
            # Update user feedback tracking
            if user_id not in self.user_feedback:
                self.stats['unique_contributors'] += 1
            self.user_feedback[user_id].append(hazard_id)
            self.stats['total_feedback'] += 1
            
            # Recalculate hazard status and confidence
            await self._update_hazard_status(hazard)
            
            return hazard
    
    async def _update_hazard_status(self, hazard: Hazard) -> None:
        """Update hazard status based on crowd feedback."""
        # Calculate crowd confidence score
        if hazard.total_feedback > 0:
            # Weighted average of confirmations vs denials
            confirmation_weight = hazard.confirmations * 1.0
            denial_weight = hazard.denials * -0.8
            
            # Include initial AI confidence with lower weight over time
            age_hours = (time.time() - hazard.detection_timestamp) / 3600
            ai_weight = max(0.3, 1.0 - (age_hours / 24))  # Decay over 24 hours
            
            total_weight = (
                confirmation_weight + 
                abs(denial_weight) + 
                (hazard.initial_confidence * ai_weight)
            )
            
            hazard.confidence_score = (
                confirmation_weight + 
                (hazard.initial_confidence * ai_weight)
            ) / total_weight
            
        else:
            # No feedback yet, use AI confidence
            hazard.confidence_score = hazard.initial_confidence
        
        # Update status based on thresholds
        old_status = hazard.status
        
        if hazard.denials >= self.denial_threshold:
            if hazard.confirmations < hazard.denials:
                hazard.status = HazardStatus.RESOLVED
                self.stats['resolved_hazards'] += 1
            else:
                hazard.status = HazardStatus.DISPUTED
                self.stats['disputed_hazards'] += 1
                
        elif hazard.confirmations >= self.verification_threshold:
            hazard.status = HazardStatus.VERIFIED
            if old_status != HazardStatus.VERIFIED:
                self.stats['verified_hazards'] += 1
                
        elif hazard.denials > 0 and hazard.confirmations > 0:
            hazard.status = HazardStatus.DISPUTED
            if old_status != HazardStatus.DISPUTED:
                self.stats['disputed_hazards'] += 1
        
        # Check expiry
        if hazard.expires_at and time.time() > hazard.expires_at:
            if hazard.confirmations == 0:
                hazard.status = HazardStatus.EXPIRED
        
        if old_status != hazard.status:
            logger.info(f"Hazard {hazard.hazard_id} status: {old_status.value} → {hazard.status.value}")
    
    async def get_hazards_nearby(
        self,
        location: Tuple[float, float],
        radius_meters: float = 500.0,
        include_resolved: bool = False
    ) -> List[Hazard]:
        """
        Get hazards near a location.
        
        Args:
            location: (lat, lon)
            radius_meters: Search radius
            include_resolved: Include resolved hazards
            
        Returns:
            List of nearby hazards
        """
        async with self._lock:
            nearby = []
            
            for hazard in self.hazards.values():
                # Skip resolved/expired unless requested
                if not include_resolved:
                    if hazard.status in [HazardStatus.RESOLVED, HazardStatus.EXPIRED]:
                        continue
                
                # Check distance
                distance = self._calculate_distance(location, hazard.location)
                if distance <= radius_meters:
                    nearby.append(hazard)
            
            # Sort by confidence score (highest first)
            nearby.sort(key=lambda h: h.confidence_score, reverse=True)
            
            return nearby
    
    async def get_hazard(self, hazard_id: str) -> Optional[Hazard]:
        """Get a specific hazard by ID."""
        async with self._lock:
            return self.hazards.get(hazard_id)
    
    async def _find_nearby_hazard(
        self,
        location: Tuple[float, float],
        class_name: str
    ) -> Optional[Hazard]:
        """Find existing hazard of same type nearby."""
        for hazard in self.hazards.values():
            if hazard.class_name == class_name:
                distance = self._calculate_distance(location, hazard.location)
                if distance <= self.proximity_radius_meters:
                    # Don't merge with resolved hazards
                    if hazard.status != HazardStatus.RESOLVED:
                        return hazard
        return None
    
    def _calculate_distance(
        self,
        loc1: Tuple[float, float],
        loc2: Tuple[float, float]
    ) -> float:
        """
        Calculate distance between two coordinates in meters.
        Uses Haversine formula.
        """
        from math import radians, sin, cos, sqrt, atan2
        
        lat1, lon1 = radians(loc1[0]), radians(loc1[1])
        lat2, lon2 = radians(loc2[0]), radians(loc2[1])
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        # Earth radius in meters
        radius = 6371000
        
        return radius * c
    
    def _calculate_severity(self, class_name: str, confidence: float) -> str:
        """Calculate hazard severity based on type and confidence."""
        severity_map = {
            'Pothole': 'high',
            'Speed Breaker': 'medium',
            'Debris': 'critical',
            'Road Crack': 'low',
        }
        
        base_severity = severity_map.get(class_name, 'medium')
        
        # Adjust based on confidence
        if confidence > 0.8 and base_severity in ['medium', 'high']:
            severity_levels = {'low': 1, 'medium': 2, 'high': 3, 'critical': 4}
            current = severity_levels[base_severity]
            upgraded = min(current + 1, 4)
            return {1: 'low', 2: 'medium', 3: 'high', 4: 'critical'}[upgraded]
        
        return base_severity
    
    async def cleanup_expired(self) -> int:
        """Remove expired hazards. Returns count of removed hazards."""
        async with self._lock:
            current_time = time.time()
            expired_ids = []
            
            for hazard_id, hazard in self.hazards.items():
                # Mark as expired if past expiry time with no confirmations
                if hazard.expires_at and current_time > hazard.expires_at:
                    if hazard.confirmations == 0:
                        expired_ids.append(hazard_id)
                        hazard.status = HazardStatus.EXPIRED
            
            # Remove expired hazards
            for hazard_id in expired_ids:
                del self.hazards[hazard_id]
            
            if expired_ids:
                logger.info(f"Cleaned up {len(expired_ids)} expired hazards")
            
            return len(expired_ids)
    
    def get_stats(self) -> Dict:
        """Get service statistics."""
        return {
            **self.stats,
            'active_hazards': len(self.hazards),
            'verification_threshold': self.verification_threshold,
            'denial_threshold': self.denial_threshold
        }
    
    def get_user_contribution(self, user_id: str) -> Dict:
        """Get user's contribution statistics."""
        feedback_count = len(self.user_feedback.get(user_id, []))
        
        # Calculate reputation score
        reputation = min(100, feedback_count * 5)  # 5 points per feedback, max 100
        
        return {
            'user_id': user_id,
            'total_feedback': feedback_count,
            'reputation_score': reputation,
            'hazards_contributed': self.user_feedback.get(user_id, [])
        }


# Global service instance
crowd_intelligence_service = CrowdIntelligenceService(
    verification_threshold=3,
    denial_threshold=2,
    expiry_hours=24,
    proximity_radius_meters=50.0
)
