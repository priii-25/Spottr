"""Privacy filter service for face and license plate detection and blurring."""
import cv2
import numpy as np
from typing import List, Tuple, Optional
from pathlib import Path
import asyncio

try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False
    print("Warning: MediaPipe not available. Face detection disabled.")

try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False
    print("Warning: EasyOCR not available. License plate detection disabled.")

from logger import setup_logger
from config import settings

logger = setup_logger(__name__)


class PrivacyRegion:
    """Data class for privacy-sensitive regions."""
    
    def __init__(
        self,
        bbox: List[int],
        region_type: str,  # 'face' or 'license_plate'
        confidence: float = 1.0
    ):
        self.bbox = bbox  # [x1, y1, x2, y2]
        self.region_type = region_type
        self.confidence = confidence
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            'bbox': self.bbox,
            'type': self.region_type,
            'confidence': round(self.confidence, 3)
        }


class PrivacyFilterService:
    """Service for detecting and blurring faces and license plates."""
    
    def __init__(
        self,
        enable_face_blur: bool = True,
        enable_plate_blur: bool = True,
        blur_strength: int = 99,
        min_face_confidence: float = 0.5,
        min_plate_confidence: float = 0.5
    ):
        """
        Initialize privacy filter service.
        
        Args:
            enable_face_blur: Enable face detection and blurring
            enable_plate_blur: Enable license plate detection and blurring
            blur_strength: Gaussian blur kernel size (must be odd)
            min_face_confidence: Minimum confidence for face detection (MediaPipe default: 0.5)
            min_plate_confidence: Minimum confidence for plate detection
        """
        self.enable_face_blur = enable_face_blur and MEDIAPIPE_AVAILABLE
        self.enable_plate_blur = enable_plate_blur and EASYOCR_AVAILABLE
        self.blur_strength = blur_strength if blur_strength % 2 == 1 else blur_strength + 1
        self.min_face_confidence = min_face_confidence
        self.min_plate_confidence = min_plate_confidence
        
        # Initialize detectors
        self.face_detector = None
        self.mp_face_detection = None
        self.ocr_reader: Optional[easyocr.Reader] = None
        self._lock = asyncio.Lock()
        
        logger.info(f"Privacy Filter Service initialized:")
        logger.info(f"  - Face blur: {self.enable_face_blur} (MediaPipe)")
        logger.info(f"  - Plate blur: {self.enable_plate_blur}")
        logger.info(f"  - Blur strength: {self.blur_strength}")
    
    async def initialize(self) -> None:
        """Initialize face and OCR detectors."""
        try:
            if self.enable_face_blur and MEDIAPIPE_AVAILABLE:
                logger.info("Initializing MediaPipe face detector...")
                loop = asyncio.get_event_loop()
                
                # Initialize MediaPipe Face Detection
                self.mp_face_detection = mp.solutions.face_detection
                self.face_detector = self.mp_face_detection.FaceDetection(
                    model_selection=0,  # 0 for short-range (< 2m), 1 for full-range
                    min_detection_confidence=self.min_face_confidence
                )
                logger.info("✓ MediaPipe face detector loaded (10× faster than MTCNN)")
            
            if self.enable_plate_blur and EASYOCR_AVAILABLE:
                logger.info("Initializing EasyOCR for license plate detection...")
                loop = asyncio.get_event_loop()
                # Use English only for faster processing
                self.ocr_reader = await loop.run_in_executor(
                    None,
                    lambda: easyocr.Reader(['en'], gpu=False)
                )
                logger.info("✓ EasyOCR reader loaded")
            
            logger.info("Privacy filter service ready!")
            
        except Exception as e:
            logger.error(f"Failed to initialize privacy filters: {str(e)}")
            raise
    
    async def apply_privacy_filters(
        self,
        image: np.ndarray,
        return_metadata: bool = True
    ) -> Tuple[np.ndarray, Optional[List[PrivacyRegion]]]:
        """
        Apply privacy filters to image (blur faces and license plates).
        
        Args:
            image: Input image as numpy array (BGR format)
            return_metadata: Whether to return detected privacy regions
            
        Returns:
            Tuple of (filtered_image, privacy_regions)
        """
        if not self.enable_face_blur and not self.enable_plate_blur:
            return image, [] if return_metadata else None
        
        try:
            filtered_image = image.copy()
            privacy_regions: List[PrivacyRegion] = []
            
            # Detect and blur faces
            if self.enable_face_blur and self.face_detector:
                face_regions = await self._detect_faces(image)
                privacy_regions.extend(face_regions)
                filtered_image = self._blur_regions(filtered_image, face_regions)
                logger.info(f"  Blurred {len(face_regions)} face(s)")
            
            # Detect and blur license plates
            if self.enable_plate_blur and self.ocr_reader:
                plate_regions = await self._detect_license_plates(image)
                privacy_regions.extend(plate_regions)
                filtered_image = self._blur_regions(filtered_image, plate_regions)
                logger.info(f"  Blurred {len(plate_regions)} license plate(s)")
            
            metadata = privacy_regions if return_metadata else None
            return filtered_image, metadata
            
        except Exception as e:
            logger.error(f"Privacy filter error: {str(e)}")
            # Return original image if filtering fails
            return image, [] if return_metadata else None
    
    async def _detect_faces(self, image: np.ndarray) -> List[PrivacyRegion]:
        """Detect faces using MediaPipe (10× faster than MTCNN on CPU)."""
        if not self.face_detector:
            return []
        
        try:
            # Convert BGR to RGB for MediaPipe
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Run detection in thread pool
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(
                None,
                self.face_detector.process,
                rgb_image
            )
            
            face_regions = []
            if results.detections:
                h, w, _ = image.shape
                
                for detection in results.detections:
                    # Get confidence score
                    confidence = detection.score[0]
                    
                    if confidence >= self.min_face_confidence:
                        # Get bounding box (normalized coordinates)
                        bbox = detection.location_data.relative_bounding_box
                        
                        # Convert to pixel coordinates
                        x = int(bbox.xmin * w)
                        y = int(bbox.ymin * h)
                        box_w = int(bbox.width * w)
                        box_h = int(bbox.height * h)
                        
                        # Add padding for better privacy (20% on each side)
                        padding_x = int(box_w * 0.2)
                        padding_y = int(box_h * 0.2)
                        
                        x1 = max(0, x - padding_x)
                        y1 = max(0, y - padding_y)
                        x2 = min(w, x + box_w + padding_x)
                        y2 = min(h, y + box_h + padding_y)
                        
                        face_regions.append(
                            PrivacyRegion(
                                bbox=[x1, y1, x2, y2],
                                region_type='face',
                                confidence=confidence
                            )
                        )
            
            return face_regions
            
        except Exception as e:
            logger.error(f"Face detection error: {str(e)}")
            return []
    
    async def _detect_license_plates(self, image: np.ndarray) -> List[PrivacyRegion]:
        """Detect license plates using OCR."""
        if not self.ocr_reader:
            return []
        
        try:
            # Run OCR in thread pool
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(
                None,
                lambda: self.ocr_reader.readtext(image)
            )
            
            plate_regions = []
            for bbox, text, confidence in results:
                # Filter for potential license plates:
                # - Text should be alphanumeric
                # - Reasonable length (4-10 characters)
                # - High confidence
                text_clean = ''.join(c for c in text if c.isalnum())
                
                if (
                    4 <= len(text_clean) <= 10 and
                    confidence >= self.min_plate_confidence and
                    any(c.isdigit() for c in text_clean) and
                    any(c.isalpha() for c in text_clean)
                ):
                    # Convert bbox format
                    bbox_np = np.array(bbox)
                    x1 = int(bbox_np[:, 0].min())
                    y1 = int(bbox_np[:, 1].min())
                    x2 = int(bbox_np[:, 0].max())
                    y2 = int(bbox_np[:, 1].max())
                    
                    # Add padding (30% on each side for plates)
                    w = x2 - x1
                    h = y2 - y1
                    padding_x = int(w * 0.3)
                    padding_y = int(h * 0.3)
                    
                    x1 = max(0, x1 - padding_x)
                    y1 = max(0, y1 - padding_y)
                    x2 = min(image.shape[1], x2 + padding_x)
                    y2 = min(image.shape[0], y2 + padding_y)
                    
                    plate_regions.append(
                        PrivacyRegion(
                            bbox=[x1, y1, x2, y2],
                            region_type='license_plate',
                            confidence=confidence
                        )
                    )
            
            return plate_regions
            
        except Exception as e:
            logger.error(f"License plate detection error: {str(e)}")
            return []
    
    def _blur_regions(
        self,
        image: np.ndarray,
        regions: List[PrivacyRegion]
    ) -> np.ndarray:
        """Apply Gaussian blur to specified regions."""
        result = image.copy()
        
        for region in regions:
            x1, y1, x2, y2 = region.bbox
            
            # Extract region
            roi = result[y1:y2, x1:x2]
            
            if roi.size > 0:
                # Apply Gaussian blur
                blurred_roi = cv2.GaussianBlur(
                    roi,
                    (self.blur_strength, self.blur_strength),
                    0
                )
                
                # Replace region with blurred version
                result[y1:y2, x1:x2] = blurred_roi
        
        return result
    
    def get_service_info(self) -> dict:
        """Get service configuration info."""
        return {
            'face_blur_enabled': self.enable_face_blur,
            'plate_blur_enabled': self.enable_plate_blur,
            'blur_strength': self.blur_strength,
            'min_face_confidence': self.min_face_confidence,
            'min_plate_confidence': self.min_plate_confidence,
            'face_detector': 'mediapipe' if MEDIAPIPE_AVAILABLE else 'none',
            'mediapipe_available': MEDIAPIPE_AVAILABLE,
            'easyocr_available': EASYOCR_AVAILABLE
        }


# Global service instance initialized with settings from config
privacy_filter_service = PrivacyFilterService(
    enable_face_blur=settings.enable_face_blur,
    enable_plate_blur=settings.enable_plate_blur,
    blur_strength=settings.blur_strength,
    min_face_confidence=settings.min_face_confidence,
    min_plate_confidence=settings.min_plate_confidence
)
