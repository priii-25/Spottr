# Privacy Features Setup Guide

## Quick Start

### 1. Install Dependencies

```powershell
# Navigate to backend
cd backend

# Install privacy libraries
pip install mtcnn==0.1.1 easyocr==1.7.2 cryptography==44.0.0

# Or install all requirements
pip install -r requirements.txt
```

### 2. Configure Privacy Settings

Edit `backend/config.py` or create `backend/.env`:

```env
# Privacy Features
ENABLE_FACE_BLUR=true
ENABLE_PLATE_BLUR=true
BLUR_STRENGTH=99
MIN_FACE_CONFIDENCE=0.9
MIN_PLATE_CONFIDENCE=0.5

# Encryption
ENCRYPT_METADATA=true
ENCRYPTION_KEY=spottr_secure_detection_key_2024
```

### 3. Start Backend with Privacy Enabled

```powershell
cd backend
python main.py
```

You should see in logs:
```
INFO: Privacy Filter Service initialized
INFO:   - Face blur: True
INFO:   - Plate blur: True
INFO:   - Blur strength: 99
INFO: ✓ MTCNN face detector loaded
INFO: ✓ EasyOCR reader loaded
INFO: Privacy filters ready!
```

### 4. Configure Mobile App

Edit `my-app/services/detection-config.ts`:

```typescript
export const DETECTION_CONFIG = {
  enablePrivacyFilters: true,    // Enable privacy
  encryptMetadata: true,          // Encrypt data
  showPrivacyIndicator: true,     // Show privacy badge
};
```

### 5. Test Privacy Features

#### Test 1: Face Blurring
1. Point camera at a person's face
2. Start detection
3. Check backend logs for: `"Blurred X face(s)"`
4. Verify green privacy badge appears in UI

#### Test 2: License Plate Blurring
1. Point camera at vehicle license plate
2. Start detection
3. Check backend logs for: `"Blurred X license plate(s)"`
4. Verify privacy protection is active

#### Test 3: Encrypted Metadata
1. Start detection
2. Check backend logs for: `"Metadata encrypted"`
3. Verify response includes `"privacy_protected": true`
4. Confirm no raw frames in network traffic

## Verification Checklist

- [ ] Backend shows "Privacy filters ready!" on startup
- [ ] Mobile app shows "🔒 Privacy Protected" badge
- [ ] Faces are detected and blurred (check logs)
- [ ] License plates are detected and blurred (check logs)
- [ ] Metadata is encrypted (check response)
- [ ] No raw frames transmitted (monitor network)
- [ ] Detection still works on filtered frames

## Troubleshooting

### MTCNN Not Loading
**Error**: `ImportError: No module named 'mtcnn'`

**Solution**:
```powershell
pip install mtcnn==0.1.1
```

### EasyOCR Installation Issues
**Error**: `Could not find a version that satisfies the requirement easyocr`

**Solution**:
```powershell
# Install with specific Python version
python -m pip install easyocr==1.7.2

# Or upgrade pip first
python -m pip install --upgrade pip
pip install easyocr==1.7.2
```

### Cryptography Installation Issues (Windows)
**Error**: `error: Microsoft Visual C++ 14.0 or greater is required`

**Solution**:
1. Install Visual C++ Build Tools: https://visualstudio.microsoft.com/visual-cpp-build-tools/
2. Or use pre-built wheels:
```powershell
pip install --upgrade pip
pip install cryptography==44.0.0
```

### Privacy Filters Not Working
**Problem**: No blurring detected in logs

**Check**:
1. Verify settings: `enable_face_blur=True` and `enable_plate_blur=True`
2. Check if MTCNN/EasyOCR loaded successfully in startup logs
3. Test with clear face/plate images
4. Increase confidence thresholds if needed

### Performance Issues
**Problem**: Detection is very slow

**Solutions**:
1. Reduce frame rate:
   ```typescript
   maxFrameRate: 3  // Lower from 5
   ```

2. Disable OCR if not needed:
   ```python
   enable_plate_blur = False
   ```

3. Lower image quality:
   ```typescript
   frameQualityJpeg: 0.6  // Lower from 0.8
   ```

## Performance Expectations

### With Privacy Filters Enabled
- **Face Detection**: +50-150ms per frame
- **OCR Processing**: +100-300ms per frame
- **Blur Application**: +10-20ms per region
- **Total Overhead**: 200-500ms per frame

### Recommendations
- **Frame Rate**: 3-5 FPS (already configured)
- **Image Quality**: 0.6-0.8 JPEG quality
- **Resolution**: 640x480 (default)

## Privacy Validation

### Manual Testing Script

Create `backend/test_privacy.py`:

```python
import asyncio
import cv2
from services.privacy_filter import privacy_filter_service

async def test_privacy():
    # Initialize
    await privacy_filter_service.initialize()
    
    # Load test image (replace with your image path)
    img = cv2.imread("test_image.jpg")
    
    # Apply filters
    filtered_img, privacy_regions = await privacy_filter_service.apply_privacy_filters(img)
    
    # Save result
    cv2.imwrite("filtered_output.jpg", filtered_img)
    
    # Print results
    print(f"Privacy regions detected: {len(privacy_regions)}")
    for region in privacy_regions:
        print(f"  - {region.region_type}: {region.confidence:.2%}")

if __name__ == "__main__":
    asyncio.run(test_privacy())
```

Run:
```powershell
cd backend
python test_privacy.py
```

### Network Traffic Monitoring

Use browser DevTools or Wireshark to verify:
1. Only encrypted metadata transmitted
2. No base64 image data in WebSocket messages
3. Payload size: ~2KB (not ~100KB for frames)

## Production Deployment

### Security Checklist
- [ ] Change default encryption key
- [ ] Store encryption key in secure environment variable
- [ ] Enable HTTPS/WSS only
- [ ] Implement certificate pinning
- [ ] Regular security audits
- [ ] Log sanitization (no PII in logs)
- [ ] Rate limiting on API endpoints
- [ ] Regular dependency updates

### Environment Variables (Production)
```env
# Use strong random key
ENCRYPTION_KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

# Enable all privacy features
ENABLE_FACE_BLUR=true
ENABLE_PLATE_BLUR=true
ENCRYPT_METADATA=true

# Production settings
ENV=production
LOG_LEVEL=WARNING
```

## Support

For issues or questions:
- Check `PRIVACY.md` for detailed documentation
- Review `PRIVACY_ARCHITECTURE.md` for architecture details
- Open GitHub issue for bugs
- Contact privacy@spottr.app for privacy concerns

---

**Last Updated**: November 8, 2025
