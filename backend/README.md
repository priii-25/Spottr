# Spottr Detection Backend

Production-ready real-time road hazard detection backend using YOLOv8 and WebSockets.

## Features

- ✅ **Real-time Detection**: WebSocket-based frame processing
- ✅ **YOLOv8 Integration**: State-of-the-art object detection
- ✅ **High Performance**: Async processing with connection pooling
- ✅ **Production Ready**: Comprehensive logging, error handling, and monitoring
- ✅ **Scalable**: Connection management and resource optimization
- ✅ **CORS Enabled**: Cross-origin support for mobile clients

## Prerequisites

- Python 3.9+
- CUDA (optional, for GPU acceleration)
- Model weights: `../models/weights/best.pt`

## Installation

1. **Create virtual environment**:
```bash
python -m venv venv
```

2. **Activate virtual environment**:
```bash
# Windows
.\venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. **Install dependencies**:
```bash
pip install -r requirements.txt
```

4. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your settings
```

## Configuration

Edit `.env` file:

```env
# Server
HOST=0.0.0.0
PORT=8000
ENV=production

# Model
MODEL_PATH=../models/weights/best.pt
CONFIDENCE_THRESHOLD=0.25
IOU_THRESHOLD=0.45

# Performance
USE_CUDA=true
DEVICE=cuda

# CORS (adjust for your mobile app)
CORS_ORIGINS=exp://,http://localhost:8081
```

## Running the Server

### Development Mode
```bash
python main.py
```

### Production Mode
```bash
ENV=production uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### With PM2 (recommended for production)
```bash
pm2 start main.py --name spottr-detection --interpreter python
```

## API Endpoints

### REST Endpoints

#### Health Check
```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "device": "cuda",
  "connections": 2
}
```

#### Model Info
```http
GET /model/info
```

Response:
```json
{
  "status": "loaded",
  "model_type": "YOLOv8",
  "device": "cuda",
  "classes": {"0": "Pothole", "1": "Speed Breaker", ...},
  "confidence_threshold": 0.25
}
```

#### Connection Stats
```http
GET /connections/stats
```

### WebSocket Endpoint

**URL**: `ws://localhost:8000/ws/detect/{client_id}`

#### Client → Server Messages

**Frame for Detection**:
```json
{
  "type": "frame",
  "data": "base64_encoded_image_data",
  "frame_id": "frame_001",
  "timestamp": 1234567890.123,
  "include_annotated": true
}
```

**Ping**:
```json
{
  "type": "ping"
}
```

**Disconnect**:
```json
{
  "type": "disconnect"
}
```

#### Server → Client Messages

**Connection Established**:
```json
{
  "type": "connected",
  "client_id": "mobile_001",
  "message": "Connected to detection service",
  "model_info": { ... }
}
```

**Detection Result**:
```json
{
  "type": "detection",
  "frame_id": "frame_001",
  "detections": [
    {
      "class_id": 0,
      "class_name": "Pothole",
      "confidence": 0.95,
      "bbox": [100, 150, 200, 250],
      "timestamp": 1234567890.123
    }
  ],
  "detection_count": 1,
  "processing_time_ms": 45.2,
  "timestamp": 1234567890.456,
  "annotated_image": "base64_encoded_annotated_image"
}
```

**Pong**:
```json
{
  "type": "pong",
  "timestamp": 1234567890.123
}
```

**Error**:
```json
{
  "type": "error",
  "message": "Error description"
}
```

## Performance Optimization

### GPU Acceleration
- Ensure CUDA is installed: `nvidia-smi`
- Set `DEVICE=cuda` in `.env`
- Model automatically uses GPU if available

### Frame Rate Optimization
- Client should throttle frame sending (recommended: 5-10 FPS)
- Server processes frames asynchronously
- Connection pooling prevents overload

### Memory Management
- Frames are processed in streaming fashion
- No frame buffering on server (handled by client)
- Automatic cleanup on disconnect

## Monitoring

### Logs
Logs are written to:
- Console: Formatted output
- File: `logs/detection.log` (JSON format in production)

### Metrics
Monitor these endpoints:
- `/health` - Service health status
- `/connections/stats` - Active connections and processing stats

## Troubleshooting

### Model Not Found
```
Error: Model file not found at: /path/to/best.pt
```
**Solution**: Verify `MODEL_PATH` in `.env` points to correct location

### CUDA Not Available
```
Using CPU for inference
```
**Solution**: Install CUDA toolkit or set `DEVICE=cpu`

### Connection Limit Reached
```
Connection limit reached. Rejecting client
```
**Solution**: Increase `WS_MAX_CONNECTIONS` or scale horizontally

### High Latency
- Reduce frame resolution on client side
- Lower frame rate (5-10 FPS recommended)
- Use GPU acceleration
- Consider load balancing for multiple clients

## Deployment

### Docker (Recommended)
See `Dockerfile` for containerized deployment

### Cloud Deployment
- AWS: EC2 with GPU (p3 instances)
- GCP: Compute Engine with GPU
- Azure: NC-series VMs

### Load Balancing
For multiple instances:
- Use sticky sessions (WebSocket requirement)
- Consider Redis for session management
- Nginx or HAProxy for load balancing

## Security

- [ ] Add authentication (JWT tokens)
- [ ] Rate limiting per client
- [ ] Input validation and sanitization
- [ ] HTTPS/WSS in production
- [ ] Environment variable encryption

## License

Proprietary - Spottr Project

## Support

For issues and questions, contact the development team.
