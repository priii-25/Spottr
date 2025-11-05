# 🚗 Spottr - AI Road Hazard Detection App

A React Native mobile application built with Expo that replicates the complete UI design from `design.html`. This app features an AI-powered road hazard detection system with a stunning cyberpunk-inspired interface.

## ✨ Features

### Main Screens (Tab Navigation)
1. **Dashboard (Home)** - AI Dashboard with statistics, analytics chart, and quick actions
2. **Alerts** - Live AI alerts showing nearby hazards on an interactive map
3. **Camera** - Live detection mode with camera feed and recent detections
4. **AI Models** - View and manage AI models (YOLOv8, SAM, MiDaS, Temporal Consistency)
5. **Settings** - App settings with toggles and navigation to other screens

### Additional Screens
- **All Hazards** - Searchable list of all detected hazards
- **Hazard Detail** - Detailed view of a specific hazard with severity assessment
- **Report Hazard** - Manual hazard reporting with type selection and severity slider
- **AI Analysis** - Detailed AI analysis of detected hazards with measurements
- **Community** - Crowd intelligence, leaderboard, and user contributions
- **Privacy** - Privacy features including encryption, face blurring, and data protection

## 🎨 Design System

### Color Palette
- **Primary**: `#00f5ff` (Cyan)
- **Primary Dark**: `#0066ff` (Blue)
- **Background**: `#0a0a0a` → `#1a1a2e` (Dark gradient)
- **Screen Background**: `#0f0f1e` → `#1a1a2e`

### Key Components

#### Reusable Components
- `StatusBar` - Custom status bar with time and system icons
- `ScreenTitle` - Gradient text titles
- `AIBadge` - Animated badge showing AI status
- `Button` - Primary and secondary gradient buttons
- `StatBox` - Statistics display boxes with gradient numbers
- `HazardCard` - Hazard information cards with confidence meters
- `Toggle` - Animated toggle switches
- `AnalyticsChart` - Bar chart visualization

### Animations
- Pulsing AI status indicators
- Scanning line effects
- Smooth transitions and hover effects
- Animated toggle switches

## 📱 Screen Navigation

```
Tab Navigation (Bottom Bar):
├── Home (⌂) - Dashboard
├── Alerts (⚠) - Live AI Alerts
├── Camera (📷) - Live Detection
├── AI (🧠) - AI Models
└── Settings (⚙) - App Settings

Standalone Screens (Accessible via navigation):
├── All Hazards
├── Hazard Detail
├── Report Hazard
├── AI Analysis
├── Community
└── Privacy
```

## 🛠️ Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router (File-based routing)
- **Animations**: React Native Reanimated
- **Gradients**: expo-linear-gradient
- **UI Components**: Custom components with masked views
- **TypeScript**: Full type safety

## 📦 Installation

```bash
cd my-app
npm install
```

## 🚀 Running the App

```bash
# Start the development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on Web
npm run web
```

## 📂 Project Structure

```
my-app/
├── app/
│   ├── (tabs)/           # Tab navigation screens
│   │   ├── index.tsx     # Dashboard
│   │   ├── alerts.tsx    # Alerts screen
│   │   ├── camera.tsx    # Camera screen
│   │   ├── models.tsx    # AI Models screen
│   │   └── settings.tsx  # Settings screen
│   ├── screens/          # Standalone screens
│   │   ├── AlertsScreen.tsx
│   │   ├── CameraScreen.tsx
│   │   ├── AIModelsScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   ├── AllHazardsScreen.tsx
│   │   ├── HazardDetailScreen.tsx
│   │   ├── ReportHazardScreen.tsx
│   │   ├── AnalysisScreen.tsx
│   │   ├── CommunityScreen.tsx
│   │   └── PrivacyScreen.tsx
│   └── _layout.tsx
├── components/           # Reusable components
│   ├── StatusBar.tsx
│   ├── ScreenTitle.tsx
│   ├── AIBadge.tsx
│   ├── Button.tsx
│   ├── StatBox.tsx
│   ├── HazardCard.tsx
│   ├── Toggle.tsx
│   └── AnalyticsChart.tsx
└── constants/
    ├── styles.ts        # Shared styles and theme
    └── theme.ts         # Theme configuration
```

## 🎯 Key Features Implementation

### Gradient Text
Uses `MaskedView` with `LinearGradient` to create gradient text effects on titles and statistics.

### Interactive Maps
Map areas with grid overlays and animated markers showing hazard locations.

### Confidence Meters
Visual representation of AI confidence levels with animated progress bars.

### Severity Sliders
Interactive severity assessment sliders with visual feedback.

### Tab Navigation
Custom tab bar with emoji icons matching the design wireframes exactly.

## 🎨 Styling

All styles are centralized in `constants/styles.ts` with:
- Color palette
- Gradient definitions
- Common component styles
- Reusable style patterns

## 📱 Responsive Design

The app is designed to work on:
- iOS devices
- Android devices
- Web browsers (Expo Web)

## 🔧 Customization

To customize the app:
1. Modify colors in `constants/styles.ts`
2. Update component styles in individual component files
3. Add new screens in `app/screens/`
4. Update navigation in `app/(tabs)/_layout.tsx`

## 📄 License

This project is part of the Spottr road hazard detection system.

---

Built with ❤️ using React Native and Expo
