import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Alert, Modal, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useRef, useEffect, useCallback } from 'react';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import StatusBar from '@/components/StatusBar';
import ScreenTitle from '@/components/ScreenTitle';
import AIBadge from '@/components/AIBadge';
import Button from '@/components/Button';
import { commonStyles, gradients, colors } from '@/constants/styles';
import { DetectionWebSocketClient, Detection as ServerDetection, DetectionResponse } from '@/services/detection-client';
import { DETECTION_SERVICE_URL, DETECTION_CONFIG, HAZARD_ICONS } from '@/services/detection-config';

interface Detection {
  id: number;
  type: string;
  timestamp: string;
  confidence: number;
  image?: string;
  bbox?: [number, number, number, number];
}

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [detectedType, setDetectedType] = useState('Pothole');
  const [processingStats, setProcessingStats] = useState({
    fps: 0,
    avgLatency: 0,
    totalDetections: 0
  });
  
  const cameraRef = useRef<CameraView>(null);
  const wsClientRef = useRef<DetectionWebSocketClient | null>(null);
  const frameIntervalRef = useRef<any>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const detectionCountRef = useRef<number>(0);

  // Initialize WebSocket connection
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
        wsClientRef.current = null;
      }
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    };
  }, []);

  // Connect to detection service
  const connectToService = useCallback(async () => {
    try {
      setIsConnecting(true);

      const client = new DetectionWebSocketClient({
        url: DETECTION_SERVICE_URL,
        clientId: `mobile_${Date.now()}`,
        onConnected: (data) => {
          console.log('Connected to detection service:', data.model_info);
          setIsConnected(true);
          setIsConnecting(false);
        },
        onDetection: handleDetectionResponse,
        onError: (error) => {
          console.error('Detection error:', error);
          Alert.alert('Detection Error', error);
        },
        onDisconnected: () => {
          console.log('Disconnected from detection service');
          setIsConnected(false);
          if (isRecording) {
            stopDetection();
          }
        },
        autoReconnect: true,
        reconnectInterval: 3000,
      });

      await client.connect();
      wsClientRef.current = client;
    } catch (error) {
      console.error('Connection failed:', error);
      setIsConnecting(false);
      setIsConnected(false);
      Alert.alert(
        'Connection Failed',
        'Could not connect to detection service. Make sure the backend server is running.',
        [
          { text: 'OK' },
          { text: 'Retry', onPress: connectToService }
        ]
      );
    }
  }, [isRecording]);

  // Handle detection response from server
  const handleDetectionResponse = useCallback((response: DetectionResponse) => {
    console.log('\n' + '🎯'.repeat(30));
    console.log('PROCESSING DETECTION RESPONSE');
    console.log('🎯'.repeat(30));
    console.log('Response data:', {
      type: response.type,
      frame_id: response.frame_id,
      detection_count: response.detection_count,
      processing_time_ms: response.processing_time_ms,
      timestamp: response.timestamp,
    });

    if (response.detections && response.detections.length > 0) {
      console.log('✅ DETECTIONS FOUND:', response.detections.length);
      response.detections.forEach((det, idx) => {
        console.log(`   ${idx + 1}. ${det.class_name}:`, {
          confidence: `${(det.confidence * 100).toFixed(1)}%`,
          bbox: det.bbox,
          class_id: det.class_id,
        });
      });

      // Convert server detections to UI format
      const newDetections: Detection[] = response.detections.map((det, idx) => ({
        id: Date.now() + idx,
        type: det.class_name,
        timestamp: 'Just now',
        confidence: Math.round(det.confidence * 100),
        bbox: det.bbox,
      }));

      console.log('💾 Adding to UI detection list...');
      // Add to detection list (keep last 20)
      setDetections(prev => [...newDetections, ...prev].slice(0, 20));

      // Update stats
      detectionCountRef.current += newDetections.length;
      setProcessingStats(prev => ({
        fps: response.processing_time_ms ? Math.round(1000 / response.processing_time_ms) : prev.fps,
        avgLatency: response.processing_time_ms || prev.avgLatency,
        totalDetections: detectionCountRef.current,
      }));

      console.log('📊 Updated stats:', {
        fps: response.processing_time_ms ? Math.round(1000 / response.processing_time_ms) : 'N/A',
        avgLatency: response.processing_time_ms,
        totalDetections: detectionCountRef.current,
      });

      // Alert for high-confidence detections
      if (DETECTION_CONFIG.alertOnDetection) {
        newDetections.forEach(det => {
          if (det.confidence >= DETECTION_CONFIG.minConfidenceForAlert * 100) {
            const icon = HAZARD_ICONS[det.type] || HAZARD_ICONS['Default'];
            console.log(`🚨 HIGH CONFIDENCE: ${icon} ${det.type} detected with ${det.confidence}% confidence`);
          }
        });
      }
    } else {
      console.log('⚪ NO DETECTIONS in this frame');
    }
    console.log('🎯'.repeat(30) + '\n');
  }, []);

  // Capture and send frame for detection
  const captureAndDetectFrame = useCallback(async () => {
    if (!cameraRef.current || !wsClientRef.current || !isConnected) {
      console.log('⏸️  Skipping frame capture:', {
        hasCamera: !!cameraRef.current,
        hasWsClient: !!wsClientRef.current,
        isConnected,
      });
      return;
    }

    try {
      // Throttle frame rate
      const now = Date.now();
      const timeSinceLastFrame = now - lastFrameTimeRef.current;
      const minInterval = 1000 / DETECTION_CONFIG.maxFrameRate;

      if (timeSinceLastFrame < minInterval) {
        console.log(`⏱️  Throttling frame (${timeSinceLastFrame.toFixed(0)}ms < ${minInterval.toFixed(0)}ms)`);
        return;
      }

      lastFrameTimeRef.current = now;

      console.log('\n' + '='.repeat(60));
      console.log('📸 CAPTURING FRAME FROM CAMERA');
      console.log('='.repeat(60));
      console.log('⏰ Timestamp:', new Date().toISOString());
      console.log('📊 Frame config:', {
        quality: DETECTION_CONFIG.frameQualityJpeg,
        maxFrameRate: DETECTION_CONFIG.maxFrameRate,
        timeSinceLastFrame: `${timeSinceLastFrame.toFixed(0)}ms`,
      });

      // Take picture
      console.log('📷 Taking picture...');
      const photo = await cameraRef.current.takePictureAsync({
        quality: DETECTION_CONFIG.frameQualityJpeg,
        base64: true,
        skipProcessing: true,
      });

      console.log('✅ Picture captured:', {
        hasPhoto: !!photo,
        hasBase64: !!photo?.base64,
        uri: photo?.uri,
        width: photo?.width,
        height: photo?.height,
      });

      if (photo && photo.base64) {
        console.log('📦 Base64 data:', {
          length: photo.base64.length,
          preview: photo.base64.substring(0, 50) + '...',
        });

        console.log('🚀 Sending frame to WebSocket client...');
        await wsClientRef.current.detectFrame(
          photo.base64,
          `frame_${now}`,
          DETECTION_CONFIG.includeAnnotatedImage
        );
        console.log('✅ Frame sent successfully!');
      } else {
        console.error('❌ No photo or base64 data available');
      }
      console.log('='.repeat(60) + '\n');
    } catch (error) {
      console.error('\n' + '❌'.repeat(30));
      console.error('FRAME CAPTURE ERROR:');
      console.error('Error:', error);
      console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('❌'.repeat(30) + '\n');
    }
  }, [isConnected]);

  // Start detection
  const startDetection = useCallback(async () => {
    console.log('\n' + '🚀'.repeat(30));
    console.log('STARTING DETECTION MODE');
    console.log('🚀'.repeat(30));

    // Check permissions
    if (!permission?.granted) {
      console.log('📋 Requesting camera permission...');
      const result = await requestPermission();
      if (!result.granted) {
        console.error('❌ Camera permission denied');
        Alert.alert('Permission Required', 'Camera permission is needed for detection');
        return;
      }
      console.log('✅ Camera permission granted');
    }

    // Connect to service if not connected
    if (!isConnected && !isConnecting) {
      console.log('🔌 Not connected, initiating connection...');
      await connectToService();
    }

    // Wait for connection
    if (!wsClientRef.current || !isConnected) {
      console.warn('⚠️  Waiting for connection to detection service...');
      Alert.alert('Not Connected', 'Please wait for connection to detection service');
      return;
    }

    console.log('✅ Connected to detection service');
    console.log('🎬 Starting frame capture...');
    console.log('📊 Detection config:', {
      maxFrameRate: DETECTION_CONFIG.maxFrameRate,
      frameQualityJpeg: DETECTION_CONFIG.frameQualityJpeg,
      confidenceThreshold: DETECTION_CONFIG.confidenceThreshold,
      includeAnnotatedImage: DETECTION_CONFIG.includeAnnotatedImage,
    });

    // Start recording and frame capture
    setIsRecording(true);
    detectionCountRef.current = 0;

    // Set up frame capture interval
    const intervalMs = 1000 / DETECTION_CONFIG.maxFrameRate;
    console.log(`⏱️  Setting up frame capture interval: ${intervalMs.toFixed(0)}ms (${DETECTION_CONFIG.maxFrameRate} FPS)`);
    
    frameIntervalRef.current = setInterval(
      captureAndDetectFrame,
      intervalMs
    );

    console.log('✅ Detection mode active!');
    console.log('🚀'.repeat(30) + '\n');
  }, [permission, isConnected, isConnecting, connectToService, captureAndDetectFrame]);

  // Stop detection
  const stopDetection = useCallback(() => {
    setIsRecording(false);

    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
  }, []);

  const handleTakePicture = async () => {
    if (cameraRef.current) {
      try {
        // Temporarily pause detection
        const wasRecording = isRecording;
        if (wasRecording) {
          stopDetection();
        }

        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          base64: true,
        });

        if (photo && photo.uri) {
          setCapturedImage(photo.uri);

          // If connected to service, use real detection
          if (wsClientRef.current && isConnected && photo.base64) {
            try {
              // Send for detection (this will trigger handleDetectionResponse)
              await wsClientRef.current.detectFrame(photo.base64, `manual_${Date.now()}`, true);
              
              // Wait a moment for detection response
              setTimeout(() => {
                // Use the latest detection
                if (detections.length > 0) {
                  setDetectedType(detections[0].type);
                  setShowConfirmModal(true);
                }
              }, 500);
            } catch (error) {
              console.error('Manual detection error:', error);
              // Fallback to mock detection
              useMockDetection();
            }
          } else {
            // Use mock detection if not connected
            useMockDetection();
          }
        }

        // Resume detection if it was running
        if (wasRecording) {
          setTimeout(() => startDetection(), 1000);
        }
      } catch (error) {
        console.error('Picture capture error:', error);
        Alert.alert('Error', 'Failed to capture image');
      }
    }
  };

  const useMockDetection = () => {
    const hazardTypes = ['Pothole', 'Speed Breaker', 'Debris', 'Road Crack'];
    const randomType = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];
    setDetectedType(randomType);
    setShowConfirmModal(true);
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
                <View style={[styles.recordingDot, isConnected && styles.recordingDotActive]} />
                <Text style={commonStyles.detectionBadgeText}>
                  {isConnected ? 'Detecting' : 'Connecting...'}
                </Text>
              </View>
              
              {/* Stats overlay */}
              {isConnected && (
                <View style={styles.statsOverlay}>
                  <Text style={styles.statsText}>
                    {processingStats.avgLatency.toFixed(0)}ms • {processingStats.totalDetections} detected
                  </Text>
                </View>
              )}
              
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
                <Text style={commonStyles.detectionBadgeText}>
                  {isConnecting ? 'Connecting...' : isConnected ? 'Ready' : 'Offline'}
                </Text>
              </View>
              <View style={styles.cameraContent}>
                {isConnecting ? (
                  <>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.cameraText}>Connecting to AI Service...</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.cameraIcon}>📹</Text>
                    <Text style={styles.cameraText}>
                      {isConnected ? 'Ready for Detection' : 'Tap Start to Begin'}
                    </Text>
                    {!isConnected && (
                      <TouchableOpacity 
                        onPress={connectToService}
                        style={styles.connectButton}
                      >
                        <Text style={styles.connectButtonText}>Connect to Service</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </>
          )}
        </View>
        
        <AIBadge 
          text={isConnected ? "YOLOv8 Connected" : "YOLOv8 Offline"} 
          fullWidth 
          centered 
        />
        
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>
            Recent Detections {detections.length > 0 && `(${detections.length})`}
          </Text>
          {detections.length === 0 ? (
            <Text style={styles.noDetectionsText}>
              {isRecording ? 'Scanning for hazards...' : 'No detections yet'}
            </Text>
          ) : (
            detections.slice(0, 5).map((detection) => {
              const icon = HAZARD_ICONS[detection.type] || HAZARD_ICONS['Default'];
              return (
                <View key={detection.id} style={[commonStyles.listItem, { marginBottom: 6 }]}>
                  <View style={styles.detectionItem}>
                    <Text style={styles.detectionIcon}>{icon}</Text>
                    <View>
                      <Text style={commonStyles.listItemText}>{detection.type}</Text>
                      <Text style={styles.confidenceText}>Confidence: {detection.confidence}%</Text>
                    </View>
                  </View>
                  <Text style={commonStyles.listItemSubtext}>{detection.timestamp}</Text>
                </View>
              );
            })
          )}
        </View>
        
        {isRecording ? (
          <Button title="Stop Detection" onPress={stopDetection} />
        ) : (
          <Button 
            title={isConnected ? "Start Detection" : "Connect & Start"} 
            onPress={startDetection}
            disabled={isConnecting}
          />
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
    backgroundColor: '#999',
    borderRadius: 4,
  },
  recordingDotActive: {
    backgroundColor: colors.primary,
  },
  statsOverlay: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statsText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
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
  detectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detectionIcon: {
    fontSize: 20,
  },
  noDetectionsText: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 12,
  },
  connectButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 245, 255, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  connectButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
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
