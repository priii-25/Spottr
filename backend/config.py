"""Configuration management for the detection backend."""
import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    env: str = "development"
    
    # Model Configuration
    model_path: str = "../models/weights/best.pt"
    confidence_threshold: float = 0.25
    iou_threshold: float = 0.45
    max_detections: int = 300
    
    # WebSocket Configuration
    ws_max_connections: int = 10
    ws_heartbeat_interval: int = 30
    ws_message_queue_size: int = 100
    
    # Performance
    use_cuda: bool = False
    device: str = "cpu"
    max_workers: int = 4
    frame_buffer_size: int = 5
    
    # CORS
    cors_origins: str = "*"
    
    # Privacy & Security
    enable_face_blur: bool = True
    enable_plate_blur: bool = True
    blur_strength: int = 99  # Must be odd number
    min_face_confidence: float = 0.5  # MediaPipe confidence (0.5 recommended)
    min_plate_confidence: float = 0.5
    encrypt_metadata: bool = True
    encryption_key: str = "spottr_secure_detection_key_2024"
    
    # Logging
    log_level: str = "INFO"
    log_file: str = "logs/detection.log"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from string to list."""
        if self.cors_origins == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    @property
    def model_path_absolute(self) -> Path:
        """Get absolute path to model file."""
        base_dir = Path(__file__).parent
        model_path = base_dir / self.model_path
        return model_path.resolve()
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.env == "production"
    
    def validate_model_path(self) -> bool:
        """Validate that model file exists."""
        return self.model_path_absolute.exists()


# Global settings instance
settings = Settings()

# Create logs directory if it doesn't exist
log_dir = Path(__file__).parent / "logs"
log_dir.mkdir(exist_ok=True)
