"""YOLOv8 detection service for real-time hazard detection."""
import asyncio
import base64
import time
from typing import List, Dict, Optional, Tuple
from pathlib import Path
import io

import cv2
import numpy as np
from PIL import Image
from ultralytics import YOLO
import torch

from config import settings
from logger import setup_logger
from services.privacy_filter import privacy_filter_service, PrivacyRegion
from services.encryption_service import encryption_service

logger = setup_logger(__name__)


class Detection:
    """Data class for detection results."""
    
    def __init__(
        self,
        class_id: int,
        class_name: str,
        confidence: float,
        bbox: List[float],
        timestamp: float,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        altitude: Optional[float] = None,
        accuracy: Optional[float] = None
    ):
        self.class_id = class_id
        self.class_name = class_name
        self.confidence = confidence
        self.bbox = bbox  # [x1, y1, x2, y2]
        self.timestamp = timestamp
        self.latitude = latitude
        self.longitude = longitude
        self.altitude = altitude
        self.accuracy = accuracy
    
    def to_dict(self) -> Dict:
        """Convert detection to dictionary."""
        result = {
            'class_id': self.class_id,
            'class_name': self.class_name,
            'confidence': round(self.confidence, 3),
            'bbox': [round(coord, 2) for coord in self.bbox],
            'timestamp': self.timestamp
        }
        
        # Add location data if available
        if self.latitude is not None and self.longitude is not None:
            result['location'] = {
                'latitude': round(self.latitude, 6),
                'longitude': round(self.longitude, 6)
            }
            if self.altitude is not None:
                result['location']['altitude'] = round(self.altitude, 2)
            if self.accuracy is not None:
                result['location']['accuracy'] = round(self.accuracy, 2)
        
        return result


class DetectionService:
    """Service for YOLOv8 model inference and detection."""
    
    def __init__(self):
        """Initialize the detection service."""
        self.model: Optional[YOLO] = None
        self.device: str = settings.device
        self.model_loaded: bool = False
        self.class_names: Dict[int, str] = {}
        self._lock = asyncio.Lock()
        
    async def initialize(self) -> None:
        """Initialize and load the YOLOv8 model."""
        try:
            logger.info(f"Initializing detection service...")
            logger.info(f"Model path: {settings.model_path_absolute}")
            logger.info(f"Device: {self.device}")
            
            if not settings.validate_model_path():
                raise FileNotFoundError(
                    f"Model file not found at: {settings.model_path_absolute}"
                )
            
            # Load model in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            self.model = await loop.run_in_executor(
                None,
                self._load_model
            )
            
            self.class_names = self.model.names
            self.model_loaded = True
            
            logger.info(f"Model loaded successfully!")
            logger.info(f"Classes: {list(self.class_names.values())}")
            logger.info(f"Confidence threshold: {settings.confidence_threshold}")
            
            # Initialize privacy filters
            logger.info("Initializing privacy filter service...")
            await privacy_filter_service.initialize()
            logger.info("Privacy filters ready!")
            
        except Exception as e:
            logger.error(f"Failed to initialize detection service: {str(e)}")
            raise
    
    def _load_model(self) -> YOLO:
        """Load YOLO model (blocking operation)."""
        model = YOLO(str(settings.model_path_absolute))
        
        # Set device
        if self.device == "cuda" and torch.cuda.is_available():
            model.to("cuda")
            logger.info(f"Using CUDA: {torch.cuda.get_device_name(0)}")
        else:
            model.to("cpu")
            logger.info("Using CPU for inference")
        
        # Warmup
        dummy = np.zeros((640, 640, 3), dtype=np.uint8)
        model.predict(dummy, conf=settings.confidence_threshold, verbose=False)
        
        return model
    
    async def detect_from_bytes(
        self,
        image_bytes: bytes,
        frame_id: Optional[str] = None,
        apply_privacy_filters: bool = True
    ) -> Tuple[List[Detection], Optional[bytes], Optional[List[dict]]]:
        """
        Perform detection on image bytes with privacy filtering.
        
        Args:
            image_bytes: Raw image bytes
            frame_id: Optional frame identifier for tracking
            apply_privacy_filters: Whether to apply face/license plate blurring
            
        Returns:
            Tuple of (detections list, annotated image bytes, privacy regions)
        """
        if not self.model_loaded:
            raise RuntimeError("Model not initialized. Call initialize() first.")
        
        try:
            logger.info(f"     Converting bytes to image...")
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                logger.error(f"    Failed to decode image from bytes")
                raise ValueError("Failed to decode image")
            
            logger.info(f"    Image shape: {img.shape} (HxWxC)")
            
            # Apply privacy filters BEFORE detection
            privacy_regions = None
            if apply_privacy_filters:
                logger.info(f"   🔒 Applying privacy filters...")
                img, privacy_regions_obj = await privacy_filter_service.apply_privacy_filters(img)
                privacy_regions = [r.to_dict() for r in privacy_regions_obj] if privacy_regions_obj else None
                logger.info(f"    Privacy filtering complete")
            
            # Run detection on privacy-filtered image
            logger.info(f"   🤖 Running YOLO inference...")
            logger.info(f"      Confidence threshold: {settings.confidence_threshold}")
            logger.info(f"      IOU threshold: {settings.iou_threshold}")
            results = await self._run_inference(img)
            
            logger.info(f"    Inference complete")
            
            # Parse results
            logger.info(f"    Parsing results...")
            detections = self._parse_results(results)
            logger.info(f"    Parsed {len(detections)} detections")
            
            # Annotate image (on already filtered image)
            annotated_bytes = await self._annotate_image(img, results)
            
            return detections, annotated_bytes, privacy_regions
            
        except Exception as e:
            logger.error(f"    Detection error: {str(e)}")
            raise
    
    async def detect_from_base64(
        self,
        base64_str: str,
        frame_id: Optional[str] = None,
        apply_privacy_filters: bool = True,
        encrypt_metadata: bool = True,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        altitude: Optional[float] = None,
        accuracy: Optional[float] = None
    ) -> Tuple[List[Detection], Optional[str], Optional[str]]:
        """
        Perform detection on base64 encoded image with privacy and encryption.
        
        Args:
            base64_str: Base64 encoded image string
            frame_id: Optional frame identifier
            apply_privacy_filters: Whether to apply face/license plate blurring
            encrypt_metadata: Whether to encrypt detection metadata
            latitude: GPS latitude coordinate
            longitude: GPS longitude coordinate
            altitude: GPS altitude in meters
            accuracy: GPS accuracy in meters
            
        Returns:
            Tuple of (detections list, annotated image base64, encrypted metadata)
        """
        try:
            logger.info(f" [{frame_id}] Received frame for detection")
            logger.info(f"    Base64 length: {len(base64_str)} chars")
            
            # Remove data URL prefix if present
            if ',' in base64_str:
                base64_str = base64_str.split(',')[1]
                logger.info(f"     Removed data URL prefix")
            
            # Decode base64
            logger.info(f"    Decoding base64...")
            image_bytes = base64.b64decode(base64_str)
            logger.info(f"    Decoded to {len(image_bytes)} bytes")
            
            # Perform detection with privacy filters
            logger.info(f"    Running detection...")
            detections, annotated_bytes, privacy_regions = await self.detect_from_bytes(
                image_bytes,
                frame_id,
                apply_privacy_filters
            )
            
            # Add GPS location to detections
            if latitude is not None and longitude is not None:
                logger.info(f"    📍 GPS Location: {latitude:.6f}, {longitude:.6f}")
                if accuracy is not None:
                    logger.info(f"       Accuracy: ±{accuracy:.2f}m")
                for det in detections:
                    det.latitude = latitude
                    det.longitude = longitude
                    det.altitude = altitude
                    det.accuracy = accuracy
            
            logger.info(f"    Found {len(detections)} detections")
            for det in detections:
                location_str = f" @ ({det.latitude:.6f}, {det.longitude:.6f})" if det.latitude else ""
                logger.info(f"      - {det.class_name}: {det.confidence:.2%} at {det.bbox}{location_str}")
            
            # Convert annotated image back to base64
            annotated_base64 = None
            if annotated_bytes:
                annotated_base64 = base64.b64encode(annotated_bytes).decode('utf-8')
                logger.info(f"     Generated annotated image")
            
            # Encrypt metadata if requested
            encrypted_metadata = None
            if encrypt_metadata:
                metadata = {
                    'frame_id': frame_id,
                    'detections': [det.to_dict() for det in detections],
                    'privacy_regions': privacy_regions,
                    'timestamp': time.time(),
                    'location': {
                        'latitude': latitude,
                        'longitude': longitude,
                        'altitude': altitude,
                        'accuracy': accuracy
                    } if latitude is not None and longitude is not None else None
                }
                encrypted_metadata = encryption_service.encrypt_metadata(metadata)
                logger.info(f"    Metadata encrypted")
            
            logger.info(f" [{frame_id}] Detection complete\n")
            return detections, annotated_base64, encrypted_metadata
            
        except Exception as e:
            logger.error(f" [{frame_id}] Base64 detection error: {str(e)}")
            raise
    
    async def _run_inference(self, img: np.ndarray):
        """Run model inference asynchronously."""
        loop = asyncio.get_event_loop()
        
        # Run inference in thread pool
        results = await loop.run_in_executor(
            None,
            lambda: self.model.predict(
                img,
                conf=settings.confidence_threshold,
                iou=settings.iou_threshold,
                max_det=settings.max_detections,
                verbose=False
            )
        )
        
        return results[0] if results else None
    
    def _parse_results(self, results) -> List[Detection]:
        """Parse YOLO results into Detection objects."""
        detections = []
        timestamp = time.time()
        
        if results is None or results.boxes is None:
            return detections
        
        boxes = results.boxes
        
        for i in range(len(boxes)):
            box = boxes[i]
            
            # Extract box data
            bbox = box.xyxy[0].cpu().numpy().tolist()
            confidence = float(box.conf[0].cpu())
            class_id = int(box.cls[0].cpu())
            class_name = self.class_names.get(class_id, f"Class_{class_id}")
            
            detection = Detection(
                class_id=class_id,
                class_name=class_name,
                confidence=confidence,
                bbox=bbox,
                timestamp=timestamp
            )
            
            detections.append(detection)
        
        return detections
    
    async def _annotate_image(
        self,
        img: np.ndarray,
        results
    ) -> Optional[bytes]:
        """Annotate image with detection results."""
        try:
            if results is None:
                return None
            
            # Plot results on image
            annotated = results.plot(
                conf=True,
                labels=True,
                boxes=True,
                line_width=2
            )
            
            # Convert to bytes
            _, buffer = cv2.imencode('.jpg', annotated)
            return buffer.tobytes()
            
        except Exception as e:
            logger.error(f"Annotation error: {str(e)}")
            return None
    
    def get_model_info(self) -> Dict:
        """Get information about the loaded model."""
        if not self.model_loaded:
            return {'status': 'not_loaded'}
        
        return {
            'status': 'loaded',
            'model_type': 'YOLOv8',
            'model_path': str(settings.model_path_absolute),
            'device': self.device,
            'classes': self.class_names,
            'confidence_threshold': settings.confidence_threshold,
            'iou_threshold': settings.iou_threshold,
            'max_detections': settings.max_detections
        }
    
    async def health_check(self) -> Dict:
        """Check if service is healthy."""
        if not self.model_loaded:
            return {
                'status': 'unhealthy',
                'reason': 'Model not loaded'
            }
        
        return {
            'status': 'healthy',
            'device': self.device,
            'model_loaded': True
        }


# Global service instance
detection_service = DetectionService()
