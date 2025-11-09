# Spottr 🚗💨

**Real-time AI-Powered Road Hazard Detection System**

Spottr is an intelligent mobile application that uses computer vision and deep learning to detect and alert drivers about road hazards in real-time.

---

## 🌟 Features

### 🎯 Core Functionality
- **Real-time Hazard Detection** - AI-powered camera detection using YOLO-NAS
- **GPS Location Tracking** - High-accuracy location tracking for each detection
- **Community Verification** - Crowd-sourced hazard validation system
- **Live Statistics Dashboard** - Track detections, accuracy, and nearby hazards
- **Multi-modal Severity Assessment** - Advanced severity scoring with weather integration

### 🧠 AI Capabilities
- YOLO NAS-based object detection
- Face & license plate privacy filters
- Real-time WebSocket streaming
- Segmentation & depth estimation framework (SAM + MiDaS ready)

### 📱 Mobile App Features
- Beautiful modern UI with gradient designs
- Smooth animations and transitions
- Community hazard feed with demo data
- Interactive map exploration
- Settings and privacy controls

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18 or higher)
- **Python** (3.8 or higher)
- **Expo CLI** (`npm install -g expo-cli`)
- **Android/iOS device** or emulator

### 📦 Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/priii-25/Spottr.git
cd Spottr
```

#### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Install additional dependencies (if needed)
pip install aiohttp mediapipe easyocr segment-anything mobile-sam timm

```

#### 3. Mobile App Setup

```bash
# Navigate to app directory
cd my-app

# Install Node dependencies
npm install

# Install additional Expo packages
npx expo install expo-location expo-image-manipulator expo-file-system
```

---

## 🎮 Running the Application

### Start Backend Server

```bash
cd backend
python main.py
```

Backend will run on: `http://localhost:8000`

**Note:** Update the IP address in `my-app/services/detection-config.ts` to match your machine's local IP:
```typescript
export const DETECTION_SERVICE_URL = 'ws://YOUR_LOCAL_IP:8000/ws/detect';
export const API_BASE_URL = 'http://YOUR_LOCAL_IP:8000';
```

### Start Mobile App

```bash
cd my-app
npx expo start
```
---

## 📁 Project Structure

```
Spottr/
├── backend/                    # FastAPI Backend
│   ├── main.py                # Main server file
│   ├── config.py              # Configuration
│   ├── services/
│   │   ├── detection_service.py      # YOLO-NAS detection
│   │   ├── severity_assessment.py   # AI severity analysis
│   │   └── websocket_manager.py     # WebSocket handler
│   ├── models/
│   │   └── weights/
│   │       └── best.pt        # YOLO-NAS model weights
│   └── requirements.txt
│
├── my-app/                    # React Native Mobile App
│   ├── app/
│   │   ├── (tabs)/           # Tab navigation screens
│   │   │   ├── index.tsx     # Home screen
│   │   │   ├── camera.tsx    # Camera detection
│   │   │   ├── explore.tsx   # Map view
│   │   │   ├── community.tsx # Community feed
│   │   │   └── settings.tsx  # Settings
│   │   └── screens/          # Full screen components
│   ├── components/           # Reusable UI components
│   ├── services/
│   │   ├── detection-client.ts      # WebSocket client
│   │   ├── detection-config.ts      # App configuration
│   │   └── crowd-intelligence.ts    # Community API
│   └── constants/
│       ├── styles.ts         # Global styles
│       └── theme.ts          # Theme configuration
│
└── models/                   # YOLO-NAS Training Files
    ├── args.yaml
    └── edi_yolov8_21dcc8.py
```

---

## ⚙️ Configuration

### Detection Settings (`my-app/services/detection-config.ts`)

```typescript
export const DETECTION_CONFIG = {
  maxFrameRate: 2,              // FPS (lower = better performance)
  frameQualityJpeg: 0.6,        // JPEG quality (0.6 = 60%)
  enablePrivacyFilters: false,  // Face/plate blurring (CPU intensive)
  includeAnnotatedImage: true,  // Return detection boxes
  confidenceThreshold: 0.5,     // Min detection confidence
  iouThreshold: 0.4,           // Intersection over Union threshold
};
```

### Backend Configuration (`backend/config.py`)

- WebSocket settings
- Model paths
- Detection parameters
- Privacy filter settings

---

## 🔧 Technical Details

### AI Models
- **Detection**: YOLOv8 (custom trained on road hazards)
- **Privacy**: MediaPipe (face detection) + EasyOCR (license plates)
- **Segmentation**: Segment Anything Model (SAM) framework ready
- **Depth**: MiDaS depth estimation framework ready

### Performance Optimizations
- Image resizing to 640x480 before processing
- JPEG compression (60% quality)
- 2 FPS frame rate to reduce CPU load
- Privacy filters disabled by default (enable with GPU)
- Legacy file system API for compatibility

### Backend API Endpoints
- `GET /health` - Health check
- `WebSocket /ws/detect` - Real-time detection stream
- `POST /hazards/{id}/assess_severity` - Severity analysis
- `GET /hazards/nearby` - Get nearby hazards
- `POST /hazards/{id}/feedback` - Submit community feedback

---
