/**
 * Detection service configuration
 */

// Get local IP for development
// Update this with your computer's local IP when running backend
const BASE_URL = __DEV__
  ? 'http://10.7.10.20:8000' // Your local IP - Backend running on this machine
  : 'https://your-production-url.com'; // Update for production

// WebSocket URL (for camera detection)
export const DETECTION_SERVICE_URL = BASE_URL.replace('http', 'ws');

// HTTP API URL (for crowd intelligence and severity assessment)
export const API_BASE_URL = BASE_URL;

export const DETECTION_CONFIG = {
  // Frame processing
  maxFrameRate: 2, // Process max 2 frames per second (reduced for CPU)
  frameQualityJpeg: 0.6, // JPEG quality (0.0 - 1.0) - reduced for faster processing
  frameWidth: 640, // Resize frame width for faster processing
  frameHeight: 480, // Resize frame height
  
  // Detection parameters
  confidenceThreshold: 0.25,
  includeAnnotatedImage: false, // Set to true to receive annotated frames
  
  // Privacy & Security
  enablePrivacyFilters: false, // Disable for faster processing (Enable later with GPU)
  encryptMetadata: true, // Encrypt detection metadata
  noRawFootageTransmission: true, // Only send metadata, not raw video
  
  // WebSocket
  autoReconnect: true,
  reconnectInterval: 3000,
  heartbeatInterval: 30000,
  
  // UI
  showBoundingBoxes: true,
  showConfidence: true,
  alertOnDetection: true,
  minConfidenceForAlert: 0.75,
  showPrivacyIndicator: true, // Show privacy protection status
};

export const HAZARD_COLORS: Record<string, string> = {
  'Pothole': '#FF6B6B',
  'Speed Breaker': '#4ECDC4',
  'Debris': '#FFE66D',
  'Road Crack': '#FF8C42',
  'Default': '#00F5FF',
};

export const HAZARD_ICONS: Record<string, string> = {
  'Pothole': '🕳️',
  'Speed Breaker': '⚠️',
  'Debris': '🚧',
  'Road Crack': '⚡',
  'Default': '📍',
};
