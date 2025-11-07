# Camera Setup Instructions

## Install expo-camera

Run this command in the `my-app` directory:

```bash
npm install expo-camera
```

## Update app.json

Add the camera plugin configuration to your `app.json`:

```json
{
  "expo": {
    "name": "my-app",
    "slug": "my-app",
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Allow Spottr to access your camera for AI hazard detection."
        }
      ]
    ]
  }
}
```

## Test the Camera

1. **Start the development server:**
   ```bash
   npx expo start
   ```

2. **Run on a physical device** (camera won't work in simulator):
   - Scan the QR code with Expo Go app (iOS/Android)
   - Or run `npx expo run:ios` or `npx expo run:android`

3. **Test the workflow:**
   - Navigate to the Camera tab (📷)
   - Tap "Start Detection" button
   - Grant camera permission when prompted
   - Point camera at road/surface
   - Tap the white circle button to capture
   - Review the detected hazard type
   - Tap "Confirm & Report Hazard" or "Cancel"

## Features

- ✅ Live camera preview
- ✅ Camera permission handling
- ✅ Image capture with large tap button
- ✅ AI detection simulation (random hazard types)
- ✅ Confirmation modal with image preview
- ✅ Detection history tracking
- ✅ Confidence percentage display

## Simulated Hazard Types

The AI detection currently simulates detection of:
- Pothole
- Speed Breaker  
- Debris
- Road Crack

Each with a confidence level of 80-100%.

## Future Enhancements

- Connect to real YOLOv8 model for actual detection
- Add video recording mode
- Real-time detection overlay on camera feed
- GPS tagging for hazard locations
- Upload to backend server
