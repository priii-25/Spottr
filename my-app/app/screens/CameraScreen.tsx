import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import StatusBar from '@/components/StatusBar';
import ScreenTitle from '@/components/ScreenTitle';
import AIBadge from '@/components/AIBadge';
import Button from '@/components/Button';
import { commonStyles, gradients, colors } from '@/constants/styles';

export default function CameraScreen() {
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
          <View style={commonStyles.detectionBadge}>
            <View style={styles.recordingDot} />
            <Text style={commonStyles.detectionBadgeText}>Recording</Text>
          </View>
          <View style={styles.cameraContent}>
            <Text style={styles.cameraIcon}>📹</Text>
            <Text style={styles.cameraText}>AI Processing Feed</Text>
          </View>
        </View>
        
        <AIBadge text="YOLOv8 + SAM Active" fullWidth centered />
        
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Recent Detections</Text>
          <View style={[commonStyles.listItem, { marginBottom: 6 }]}>
            <Text style={commonStyles.listItemText}>Pothole</Text>
            <Text style={commonStyles.listItemSubtext}>2 min ago</Text>
          </View>
          <View style={commonStyles.listItem}>
            <Text style={commonStyles.listItemText}>Speed Breaker</Text>
            <Text style={commonStyles.listItemSubtext}>5 min ago</Text>
          </View>
        </View>
        
        <Button title="Stop Detection" />
        
        <View style={{ height: 80 }} />
      </ScrollView>
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
});
