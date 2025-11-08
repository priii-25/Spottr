"""Encryption utilities for secure metadata transmission."""
import base64
import json
from typing import Any, Dict
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
from cryptography.hazmat.backends import default_backend
import os

from logger import setup_logger

logger = setup_logger(__name__)


class EncryptionService:
    """Service for encrypting detection metadata."""
    
    def __init__(self, encryption_key: str = None):
        """
        Initialize encryption service.
        
        Args:
            encryption_key: Base encryption key. If None, generates a new one.
        """
        if encryption_key:
            # Derive key from provided string
            self.key = self._derive_key(encryption_key.encode())
        else:
            # Generate a new key
            self.key = Fernet.generate_key()
            logger.warning("Generated new encryption key. Store this securely!")
            logger.info(f"Key (base64): {self.key.decode()}")
        
        self.cipher = Fernet(self.key)
        logger.info("Encryption service initialized")
    
    def _derive_key(self, password: bytes, salt: bytes = None) -> bytes:
        """
        Derive encryption key from password using PBKDF2.
        
        Args:
            password: Password to derive key from
            salt: Salt for key derivation (uses fixed salt if None)
            
        Returns:
            Derived key bytes
        """
        if salt is None:
            # Use fixed salt for consistency (in production, store this securely)
            salt = b'spottr_privacy_salt_2024'
        
        kdf = PBKDF2(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        
        key = base64.urlsafe_b64encode(kdf.derive(password))
        return key
    
    def encrypt_metadata(self, metadata: Dict[str, Any]) -> str:
        """
        Encrypt metadata dictionary to base64 string.
        
        Args:
            metadata: Dictionary to encrypt
            
        Returns:
            Encrypted base64 string
        """
        try:
            # Convert to JSON
            json_data = json.dumps(metadata)
            
            # Encrypt
            encrypted_bytes = self.cipher.encrypt(json_data.encode())
            
            # Convert to base64 for transmission
            encrypted_b64 = base64.b64encode(encrypted_bytes).decode('utf-8')
            
            return encrypted_b64
            
        except Exception as e:
            logger.error(f"Encryption error: {str(e)}")
            raise
    
    def decrypt_metadata(self, encrypted_b64: str) -> Dict[str, Any]:
        """
        Decrypt base64 encrypted string to metadata dictionary.
        
        Args:
            encrypted_b64: Base64 encrypted string
            
        Returns:
            Decrypted metadata dictionary
        """
        try:
            # Decode base64
            encrypted_bytes = base64.b64decode(encrypted_b64)
            
            # Decrypt
            decrypted_bytes = self.cipher.decrypt(encrypted_bytes)
            
            # Parse JSON
            metadata = json.loads(decrypted_bytes.decode())
            
            return metadata
            
        except Exception as e:
            logger.error(f"Decryption error: {str(e)}")
            raise
    
    def get_key(self) -> str:
        """Get the encryption key as base64 string."""
        return self.key.decode()
    
    @staticmethod
    def generate_key() -> str:
        """Generate a new random encryption key."""
        return Fernet.generate_key().decode()


# Global encryption service instance
# In production, load this from secure configuration
encryption_service = EncryptionService(
    encryption_key="spottr_secure_detection_key_2024"
)
