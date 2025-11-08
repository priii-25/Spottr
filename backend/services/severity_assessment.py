"""
Advanced Severity Assessment Service
Combines segmentation, depth estimation, and contextual factors
"""
import asyncio
import time
from typing import Optional, Dict, List, Tuple
from dataclasses import dataclass
from enum import Enum
import io

import cv2
import numpy as np
import torch
from PIL import Image
import aiohttp

from logger import setup_logger

logger = setup_logger(__name__)


class SeverityLevel(str, Enum):
    """Hazard severity levels"""
    CRITICAL = "critical"      # Immediate danger
    HIGH = "high"             # Significant hazard
    MODERATE = "moderate"     # Noticeable hazard
    LOW = "low"              # Minor concern
    MINIMAL = "minimal"       # Barely detectable


class WeatherCondition(str, Enum):
    """Weather conditions affecting severity"""
    CLEAR = "clear"
    RAINY = "rainy"
    FOGGY = "foggy"
    SNOWY = "snowy"
    STORMY = "stormy"


@dataclass
class SegmentationResult:
    """Segmentation analysis result"""
    mask: np.ndarray              # Binary mask
    area_pixels: int              # Area in pixels
    area_m2: Optional[float]      # Estimated real-world area (m²)
    perimeter: float              # Perimeter length
    circularity: float            # Shape metric (0-1)
    bbox: List[int]              # [x1, y1, x2, y2]
    
    def to_dict(self) -> Dict:
        return {
            'area_pixels': self.area_pixels,
            'area_m2': round(self.area_m2, 3) if self.area_m2 else None,
            'perimeter': round(self.perimeter, 2),
            'circularity': round(self.circularity, 3),
            'bbox': self.bbox
        }


@dataclass
class DepthAnalysis:
    """Depth estimation result"""
    depth_map: np.ndarray         # Depth map
    max_depth: float             # Maximum depth (cm)
    avg_depth: float             # Average depth (cm)
    volume_cm3: Optional[float]  # Estimated volume (cm³)
    depth_category: str          # shallow/moderate/deep
    
    def to_dict(self) -> Dict:
        return {
            'max_depth_cm': round(self.max_depth, 2),
            'avg_depth_cm': round(self.avg_depth, 2),
            'volume_cm3': round(self.volume_cm3, 2) if self.volume_cm3 else None,
            'depth_category': self.depth_category
        }


@dataclass
class WeatherData:
    """Weather information"""
    condition: WeatherCondition
    temperature: float           # Celsius
    humidity: float             # Percentage
    visibility: float           # Kilometers
    precipitation: float        # mm/hour
    
    def to_dict(self) -> Dict:
        return {
            'condition': self.condition.value,
            'temperature': round(self.temperature, 1),
            'humidity': round(self.humidity, 1),
            'visibility': round(self.visibility, 1),
            'precipitation': round(self.precipitation, 1)
        }


@dataclass
class SeverityAssessment:
    """Complete severity assessment"""
    severity_level: SeverityLevel
    severity_score: float        # 0-100
    segmentation: SegmentationResult
    depth: DepthAnalysis
    weather: Optional[WeatherData]
    contextual_factors: Dict
    recommendations: List[str]
    risk_multipliers: Dict
    
    def to_dict(self) -> Dict:
        return {
            'severity_level': self.severity_level.value,
            'severity_score': round(self.severity_score, 2),
            'segmentation': self.segmentation.to_dict(),
            'depth': self.depth.to_dict(),
            'weather': self.weather.to_dict() if self.weather else None,
            'contextual_factors': self.contextual_factors,
            'recommendations': self.recommendations,
            'risk_multipliers': self.risk_multipliers
        }


class SeverityAssessmentService:
    """Service for advanced hazard severity assessment"""
    
    def __init__(self, weather_api_key: Optional[str] = None):
        """Initialize severity assessment service"""
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.weather_api_key = weather_api_key or "demo"  # Demo key for testing
        
        # Model initialization flags
        self.sam_model = None
        self.depth_model = None
        self.models_loaded = False
        
        logger.info(f"Severity Assessment Service initialized on {self.device}")
    
    async def initialize(self):
        """Load segmentation and depth models"""
        try:
            logger.info("Loading segmentation and depth models...")
            
            # Load lightweight segmentation model (simulate for now)
            # In production: Use MobileSAM or SAM
            logger.info("  ⚡ Segmentation model loaded (simulated)")
            self.sam_model = "mobilesam_loaded"
            
            # Load depth estimation model (simulate for now)
            # In production: Use MiDaS or DPT
            logger.info("  📏 Depth model loaded (simulated)")
            self.depth_model = "midas_loaded"
            
            self.models_loaded = True
            logger.info("✅ All models loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load models: {e}")
            raise
    
    async def assess_severity(
        self,
        image: np.ndarray,
        bbox: List[int],
        class_name: str,
        confidence: float,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        vehicle_speed: Optional[float] = None,  # km/h
        time_of_day: Optional[str] = None
    ) -> SeverityAssessment:
        """
        Perform comprehensive severity assessment
        
        Args:
            image: Input image (BGR)
            bbox: Bounding box [x1, y1, x2, y2]
            class_name: Hazard type
            confidence: Detection confidence
            latitude: GPS latitude
            longitude: GPS longitude
            vehicle_speed: Current vehicle speed (km/h)
            time_of_day: Time context (morning/afternoon/evening/night)
        
        Returns:
            SeverityAssessment with complete analysis
        """
        try:
            logger.info(f"\n{'='*60}")
            logger.info(f"🔍 SEVERITY ASSESSMENT: {class_name}")
            logger.info(f"{'='*60}")
            
            # Extract hazard region
            x1, y1, x2, y2 = bbox
            hazard_region = image[y1:y2, x1:x2]
            
            # 1. Segmentation Analysis
            logger.info("1️⃣ Performing segmentation analysis...")
            segmentation = await self._segment_hazard(hazard_region, class_name)
            logger.info(f"   Area: {segmentation.area_m2:.2f} m² ({segmentation.area_pixels} pixels)")
            
            # 2. Depth Estimation
            logger.info("2️⃣ Estimating depth...")
            depth = await self._estimate_depth(hazard_region, class_name)
            logger.info(f"   Max depth: {depth.max_depth:.1f} cm")
            logger.info(f"   Category: {depth.depth_category}")
            
            # 3. Weather Data
            weather = None
            if latitude and longitude:
                logger.info("3️⃣ Fetching weather data...")
                weather = await self._fetch_weather(latitude, longitude)
                if weather:
                    logger.info(f"   Condition: {weather.condition.value}")
                    logger.info(f"   Temperature: {weather.temperature}°C")
            
            # 4. Calculate Severity Score
            logger.info("4️⃣ Calculating severity score...")
            severity_score, risk_multipliers = self._calculate_severity_score(
                segmentation=segmentation,
                depth=depth,
                class_name=class_name,
                confidence=confidence,
                weather=weather,
                vehicle_speed=vehicle_speed,
                time_of_day=time_of_day
            )
            
            # 5. Determine Severity Level
            severity_level = self._get_severity_level(severity_score)
            logger.info(f"   Severity: {severity_level.value.upper()} ({severity_score:.1f}/100)")
            
            # 6. Generate Contextual Factors
            contextual_factors = {
                'detection_confidence': round(confidence * 100, 1),
                'vehicle_speed_kmh': vehicle_speed,
                'time_of_day': time_of_day,
                'location': f"{latitude:.6f}, {longitude:.6f}" if latitude else None,
                'has_weather_data': weather is not None
            }
            
            # 7. Generate Recommendations
            recommendations = self._generate_recommendations(
                severity_level=severity_level,
                class_name=class_name,
                depth=depth,
                weather=weather,
                vehicle_speed=vehicle_speed
            )
            
            logger.info(f"{'='*60}\n")
            
            return SeverityAssessment(
                severity_level=severity_level,
                severity_score=severity_score,
                segmentation=segmentation,
                depth=depth,
                weather=weather,
                contextual_factors=contextual_factors,
                recommendations=recommendations,
                risk_multipliers=risk_multipliers
            )
            
        except Exception as e:
            logger.error(f"Severity assessment failed: {e}")
            raise
    
    async def _segment_hazard(
        self,
        image: np.ndarray,
        class_name: str
    ) -> SegmentationResult:
        """
        Perform segmentation using SAM/MobileSAM
        """
        # Simulate segmentation (in production, use actual model)
        h, w = image.shape[:2]
        
        # Create simulated mask (in production: use SAM)
        mask = np.zeros((h, w), dtype=np.uint8)
        center_x, center_y = w // 2, h // 2
        
        if class_name == "Pothole":
            # Irregular circular shape for pothole
            cv2.ellipse(mask, (center_x, center_y), (w//3, h//3), 0, 0, 360, 255, -1)
        elif class_name == "Speed Breaker":
            # Elongated horizontal shape
            cv2.rectangle(mask, (w//6, h//3), (5*w//6, 2*h//3), 255, -1)
        else:
            # Generic irregular shape
            cv2.ellipse(mask, (center_x, center_y), (w//3, h//4), 0, 0, 360, 255, -1)
        
        # Calculate metrics
        area_pixels = cv2.countNonZero(mask)
        
        # Estimate real-world area (assuming ~50 pixels = 1 meter at typical distance)
        pixels_per_meter = 50
        area_m2 = area_pixels / (pixels_per_meter ** 2)
        
        # Calculate perimeter
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        perimeter = cv2.arcLength(contours[0], True) if contours else 0
        
        # Calculate circularity (4π * area / perimeter²)
        circularity = (4 * np.pi * area_pixels) / (perimeter ** 2) if perimeter > 0 else 0
        circularity = min(circularity, 1.0)
        
        # Get bounding box
        x, y, w_box, h_box = cv2.boundingRect(contours[0]) if contours else (0, 0, w, h)
        bbox = [int(x), int(y), int(x + w_box), int(y + h_box)]
        
        return SegmentationResult(
            mask=mask,
            area_pixels=area_pixels,
            area_m2=area_m2,
            perimeter=perimeter,
            circularity=circularity,
            bbox=bbox
        )
    
    async def _estimate_depth(
        self,
        image: np.ndarray,
        class_name: str
    ) -> DepthAnalysis:
        """
        Estimate depth using MiDaS or DPT
        """
        # Simulate depth estimation (in production, use actual model)
        h, w = image.shape[:2]
        
        # Create simulated depth map
        depth_map = np.zeros((h, w), dtype=np.float32)
        
        # Simulate depth based on hazard type
        if class_name == "Pothole":
            # Deep depression in center
            y_coords, x_coords = np.ogrid[:h, :w]
            center_y, center_x = h // 2, w // 2
            distance = np.sqrt((x_coords - center_x)**2 + (y_coords - center_y)**2)
            max_distance = np.sqrt(center_x**2 + center_y**2)
            depth_map = 15 * (1 - distance / max_distance)  # 0-15 cm depth
            max_depth = 15.0
            avg_depth = 8.0
            depth_category = "deep"
            
        elif class_name == "Speed Breaker":
            # Elevated (negative depth = height)
            depth_map = np.full((h, w), -8.0)  # 8cm height
            max_depth = -8.0
            avg_depth = -8.0
            depth_category = "elevated"
            
        elif class_name == "Road Crack":
            # Shallow crack
            depth_map = np.random.uniform(0, 3, (h, w))  # 0-3 cm
            max_depth = 3.0
            avg_depth = 1.5
            depth_category = "shallow"
            
        else:
            # Generic moderate depth
            depth_map = np.random.uniform(0, 8, (h, w))
            max_depth = 8.0
            avg_depth = 4.0
            depth_category = "moderate"
        
        # Calculate volume (area × average depth)
        area_cm2 = (h * w) / (50 ** 2) * 10000  # Convert to cm²
        volume_cm3 = area_cm2 * abs(avg_depth) if avg_depth != 0 else None
        
        return DepthAnalysis(
            depth_map=depth_map,
            max_depth=abs(max_depth),
            avg_depth=abs(avg_depth),
            volume_cm3=volume_cm3,
            depth_category=depth_category
        )
    
    async def _fetch_weather(
        self,
        latitude: float,
        longitude: float
    ) -> Optional[WeatherData]:
        """
        Fetch weather data from API
        """
        try:
            # Using Open-Meteo API (free, no key required)
            url = f"https://api.open-meteo.com/v1/forecast"
            params = {
                'latitude': latitude,
                'longitude': longitude,
                'current': 'temperature_2m,relative_humidity_2m,precipitation,weather_code',
                'timezone': 'auto'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=5)) as response:
                    if response.status == 200:
                        data = await response.json()
                        current = data.get('current', {})
                        
                        # Map weather code to condition
                        weather_code = current.get('weather_code', 0)
                        condition = self._map_weather_code(weather_code)
                        
                        return WeatherData(
                            condition=condition,
                            temperature=current.get('temperature_2m', 20.0),
                            humidity=current.get('relative_humidity_2m', 50.0),
                            visibility=10.0,  # Default
                            precipitation=current.get('precipitation', 0.0)
                        )
            
            return None
            
        except Exception as e:
            logger.warning(f"Failed to fetch weather: {e}")
            return None
    
    def _map_weather_code(self, code: int) -> WeatherCondition:
        """Map WMO weather code to condition"""
        if code == 0:
            return WeatherCondition.CLEAR
        elif code in [51, 53, 55, 61, 63, 65, 80, 81, 82]:
            return WeatherCondition.RAINY
        elif code in [45, 48]:
            return WeatherCondition.FOGGY
        elif code in [71, 73, 75, 77, 85, 86]:
            return WeatherCondition.SNOWY
        elif code in [95, 96, 99]:
            return WeatherCondition.STORMY
        else:
            return WeatherCondition.CLEAR
    
    def _calculate_severity_score(
        self,
        segmentation: SegmentationResult,
        depth: DepthAnalysis,
        class_name: str,
        confidence: float,
        weather: Optional[WeatherData],
        vehicle_speed: Optional[float],
        time_of_day: Optional[str]
    ) -> Tuple[float, Dict]:
        """
        Calculate comprehensive severity score (0-100)
        """
        base_score = 0.0
        risk_multipliers = {}
        
        # 1. Size Factor (0-30 points)
        if segmentation.area_m2:
            if segmentation.area_m2 > 2.0:
                size_score = 30
            elif segmentation.area_m2 > 1.0:
                size_score = 25
            elif segmentation.area_m2 > 0.5:
                size_score = 20
            elif segmentation.area_m2 > 0.2:
                size_score = 15
            else:
                size_score = 10
            base_score += size_score
            risk_multipliers['size'] = round(size_score / 30, 2)
        
        # 2. Depth Factor (0-30 points)
        if class_name == "Pothole":
            if depth.max_depth > 10:
                depth_score = 30
            elif depth.max_depth > 7:
                depth_score = 25
            elif depth.max_depth > 5:
                depth_score = 20
            elif depth.max_depth > 3:
                depth_score = 15
            else:
                depth_score = 10
        elif class_name == "Speed Breaker":
            if abs(depth.max_depth) > 12:
                depth_score = 25
            elif abs(depth.max_depth) > 8:
                depth_score = 20
            else:
                depth_score = 15
        else:
            depth_score = 15
        
        base_score += depth_score
        risk_multipliers['depth'] = round(depth_score / 30, 2)
        
        # 3. Confidence Factor (0-15 points)
        confidence_score = confidence * 15
        base_score += confidence_score
        risk_multipliers['confidence'] = round(confidence, 2)
        
        # 4. Weather Multiplier (×1.0 to ×1.5)
        weather_multiplier = 1.0
        if weather:
            if weather.condition == WeatherCondition.RAINY:
                weather_multiplier = 1.4
            elif weather.condition == WeatherCondition.STORMY:
                weather_multiplier = 1.5
            elif weather.condition == WeatherCondition.FOGGY:
                weather_multiplier = 1.3
            elif weather.condition == WeatherCondition.SNOWY:
                weather_multiplier = 1.4
        
        risk_multipliers['weather'] = weather_multiplier
        
        # 5. Speed Multiplier (×1.0 to ×1.4)
        speed_multiplier = 1.0
        if vehicle_speed:
            if vehicle_speed > 80:
                speed_multiplier = 1.4
            elif vehicle_speed > 60:
                speed_multiplier = 1.3
            elif vehicle_speed > 40:
                speed_multiplier = 1.2
            elif vehicle_speed > 20:
                speed_multiplier = 1.1
        
        risk_multipliers['speed'] = speed_multiplier
        
        # 6. Time of Day Multiplier (×1.0 to ×1.2)
        time_multiplier = 1.0
        if time_of_day == "night":
            time_multiplier = 1.2
        elif time_of_day == "evening":
            time_multiplier = 1.1
        
        risk_multipliers['time'] = time_multiplier
        
        # Apply multipliers
        total_multiplier = weather_multiplier * speed_multiplier * time_multiplier
        final_score = min(base_score * total_multiplier, 100.0)
        
        return final_score, risk_multipliers
    
    def _get_severity_level(self, score: float) -> SeverityLevel:
        """Map score to severity level"""
        if score >= 80:
            return SeverityLevel.CRITICAL
        elif score >= 60:
            return SeverityLevel.HIGH
        elif score >= 40:
            return SeverityLevel.MODERATE
        elif score >= 20:
            return SeverityLevel.LOW
        else:
            return SeverityLevel.MINIMAL
    
    def _generate_recommendations(
        self,
        severity_level: SeverityLevel,
        class_name: str,
        depth: DepthAnalysis,
        weather: Optional[WeatherData],
        vehicle_speed: Optional[float]
    ) -> List[str]:
        """Generate safety recommendations"""
        recommendations = []
        
        if severity_level == SeverityLevel.CRITICAL:
            recommendations.append("⚠️ IMMEDIATE ACTION: Slow down significantly")
            recommendations.append("🚗 Reduce speed to < 20 km/h")
            recommendations.append("🛑 Consider alternate route if possible")
        elif severity_level == SeverityLevel.HIGH:
            recommendations.append("⚠️ High hazard: Proceed with caution")
            recommendations.append("🚗 Reduce speed to < 40 km/h")
        elif severity_level == SeverityLevel.MODERATE:
            recommendations.append("⚡ Moderate hazard: Stay alert")
            recommendations.append("🚗 Maintain safe speed")
        
        # Weather-specific
        if weather:
            if weather.condition == WeatherCondition.RAINY:
                recommendations.append("🌧️ Wet conditions: Increase braking distance")
            elif weather.condition == WeatherCondition.FOGGY:
                recommendations.append("🌫️ Low visibility: Use fog lights")
            elif weather.condition == WeatherCondition.SNOWY:
                recommendations.append("❄️ Slippery conditions: Drive extra carefully")
        
        # Hazard-specific
        if class_name == "Pothole" and depth.max_depth > 10:
            recommendations.append("🕳️ Deep pothole: Severe vehicle damage risk")
        elif class_name == "Speed Breaker":
            recommendations.append("🚧 Speed breaker: Reduce speed before crossing")
        
        return recommendations


# Global service instance
severity_service = SeverityAssessmentService()
