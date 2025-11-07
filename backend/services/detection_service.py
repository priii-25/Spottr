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

logger = setup_logger(__name__)


class Detection:
    """Data class for detection results."""
    
    def __init__(
        self,
        class_id: int,
        class_name: str,
        confidence: float,
        bbox: List[float],
        timestamp: float
    ):
        self.class_id = class_id
        self.class_name = class_name
        self.confidence = confidence
        self.bbox = bbox  # [x1, y1, x2, y2]
        self.timestamp = timestamp
    
    def to_dict(self) -> Dict:
        """Convert detection to dictionary."""
        return {
            'class_id': self.class_id,
            'class_name': self.class_name,
            'confidence': round(self.confidence, 3),
            'bbox': [round(coord, 2) for coord in self.bbox],
            'timestamp': self.timestamp
        }


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
        frame_id: Optional[str] = None
    ) -> Tuple[List[Detection], Optional[bytes]]:
        """
        Perform detection on image bytes.
        
        Args:
            image_bytes: Raw image bytes
            frame_id: Optional frame identifier for tracking
            
        Returns:
            Tuple of (detections list, annotated image bytes)
        """
        if not self.model_loaded:
            raise RuntimeError("Model not initialized. Call initialize() first.")
        
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                raise ValueError("Failed to decode image")
            
            # Run detection
            results = await self._run_inference(img)
            
            # Parse results
            detections = self._parse_results(results)
            
            # Annotate image
            annotated_bytes = await self._annotate_image(img, results)
            
            if frame_id:
                logger.debug(
                    f"Frame {frame_id}: {len(detections)} detections"
                )
            
            return detections, annotated_bytes
            
        except Exception as e:
            logger.error(f"Detection error: {str(e)}")
            raise
    
    async def detect_from_base64(
        self,
        base64_str: str,
        frame_id: Optional[str] = None
    ) -> Tuple[List[Detection], Optional[str]]:
        """
        Perform detection on base64 encoded image.
        
        Args:
            base64_str: Base64 encoded image string
            frame_id: Optional frame identifier
            
        Returns:
            Tuple of (detections list, annotated image base64)
        """
        try:
            # Remove data URL prefix if present
            if ',' in base64_str:
                base64_str = base64_str.split(',')[1]
            
            # Decode base64
            image_bytes = base64.b64decode(base64_str)
            
            # Perform detection
            detections, annotated_bytes = await self.detect_from_bytes(
                image_bytes,
                frame_id
            )
            
            # Convert annotated image back to base64
            annotated_base64 = None
            if annotated_bytes:
                annotated_base64 = base64.b64encode(annotated_bytes).decode('utf-8')
            
            return detections, annotated_base64
            
        except Exception as e:
            logger.error(f"Base64 detection error: {str(e)}")
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
