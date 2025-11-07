import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Alert, Modal, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useRef } from 'react';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import StatusBar from '@/components/StatusBar';
import ScreenTitle from '@/components/ScreenTitle';
import AIBadge from '@/components/AIBadge';
import Button from '@/components/Button';
import { commonStyles, gradients, colors } from '@/constants/styles';

interface Detection {
  id: number;
  type: string;
  timestamp: string;
  confidence: number;
  image?: string;
}

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([
    { id: 1, type: 'Pothole', timestamp: '2 min ago', confidence: 94 },
    { id: 2, type: 'Speed Breaker', timestamp: '5 min ago', confidence: 89 },
  ]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [detectedType, setDetectedType] = useState('Pothole');
  const cameraRef = useRef<CameraView>(null);

  const handleStartRecording = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed for detection');
        return;
      }
    }
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  const handleTakePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        setCapturedImage(photo?.uri || null);
        
        // Simulate AI detection
        const hazardTypes = ['Pothole', 'Speed Breaker', 'Debris', 'Road Crack'];
        const randomType = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];
        const randomConfidence = Math.floor(Math.random() * 20) + 80; // 80-100%
        
        setDetectedType(randomType);
        setShowConfirmModal(true);
      } catch (error) {
        Alert.alert('Error', 'Failed to capture image');
      }
    }
  };

  const handleConfirmHazard = () => {
    if (capturedImage) {
      const newDetection: Detection = {
        id: detections.length + 1,
        type: detectedType,
        timestamp: 'Just now',
        confidence: Math.floor(Math.random() * 20) + 80,
        image: capturedImage,
      };
      setDetections([newDetection, ...detections]);
      setShowConfirmModal(false);
      setCapturedImage(null);
      Alert.alert('Success', 'Hazard reported successfully!');
    }
  };

  const handleCancelDetection = () => {
    setShowConfirmModal(false);
    setCapturedImage(null);
  };

  return (
    <LinearGradient
      colors={gradients.screen}
      style={styles.container}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <StatusBar />
        <ScreenTitle title="Live Detection" />
        
        <View style={commonStyles.cameraView}>
          {isRecording && permission?.granted ? (
            <View style={styles.cameraContainer}>
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="back"
              />
              <View style={commonStyles.detectionBadge}>
                <View style={styles.recordingDot} />
                <Text style={commonStyles.detectionBadgeText}>Recording</Text>
              </View>
              <TouchableOpacity 
                style={styles.captureButton}
                onPress={handleTakePicture}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={commonStyles.detectionBadge}>
                <View style={styles.recordingDot} />
                <Text style={commonStyles.detectionBadgeText}>Ready</Text>
              </View>
              <View style={styles.cameraContent}>
                <Text style={styles.cameraIcon}>📹</Text>
                <Text style={styles.cameraText}>AI Processing Feed</Text>
              </View>
            </>
          )}
        </View>
        
        <AIBadge text="YOLOv8 + SAM Active" fullWidth centered />
        
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Recent Detections</Text>
          {detections.slice(0, 5).map((detection) => (
            <View key={detection.id} style={[commonStyles.listItem, { marginBottom: 6 }]}>
              <View>
                <Text style={commonStyles.listItemText}>{detection.type}</Text>
                <Text style={styles.confidenceText}>Confidence: {detection.confidence}%</Text>
              </View>
              <Text style={commonStyles.listItemSubtext}>{detection.timestamp}</Text>
            </View>
          ))}
        </View>
        
        {isRecording ? (
          <Button title="Stop Detection" onPress={handleStopRecording} />
        ) : (
          <Button title="Start Detection" onPress={handleStartRecording} />
        )}
        
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancelDetection}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={gradients.screen}
              style={styles.modalGradient}
            >
              <Text style={styles.modalTitle}>Confirm Detection</Text>
              
              {capturedImage && (
                <Image 
                  source={{ uri: capturedImage }} 
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              )}
              
              <View style={styles.detectionInfo}>
                <Text style={styles.detectionLabel}>Detected:</Text>
                <Text style={styles.detectionType}>{detectedType}</Text>
              </View>
              
              <AIBadge text="AI Analysis Complete" fullWidth centered />
              
              <Button 
                title="Confirm & Report Hazard" 
                onPress={handleConfirmHazard}
                style={{ marginTop: 15, marginBottom: 8 }}
              />
              <Button 
                title="Cancel" 
                secondary 
                onPress={handleCancelDetection}
              />
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  recordingDot: {
    width: 8,
    height: 8,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  cameraContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  cameraContent: {
    alignItems: 'center',
  },
  cameraIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  cameraText: {
    color: colors.primary,
    fontSize: 13,
  },
  captureButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.white,
  },
  recentSection: {
    backgroundColor: 'rgba(26, 26, 46, 0.6)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  recentTitle: {
    fontSize: 11,
    color: colors.primary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  confidenceText: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '85%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 15,
  },
  detectionInfo: {
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  detectionLabel: {
    color: '#999',
    fontSize: 14,
    marginBottom: 5,
  },
  detectionType: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '700',
  },
});
