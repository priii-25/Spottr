import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import StatusBar from '@/components/StatusBar';
import ScreenTitle from '@/components/ScreenTitle';
import AIBadge from '@/components/AIBadge';
import StatBox from '@/components/StatBox';
import Button from '@/components/Button';
import { commonStyles, gradients, colors } from '@/constants/styles';

export default function AnalysisScreen() {
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
        <ScreenTitle title="AI Analysis" />
        
        <AIBadge text="Multi-Modal Processing" />
        
        <View style={[commonStyles.mapArea, { height: 160 }]}>
          <View style={styles.mapGrid} />
          <View style={[commonStyles.mapMarker, { top: '45%', left: '45%' }]}>
            <Text style={styles.markerText}>×</Text>
          </View>
        </View>
        
        <View style={styles.detailCard}>
          <Text style={styles.hazardName}>Pothole Detected</Text>
          <Text style={styles.location}>📍 Ring Road, Sector 14</Text>
          
          <View style={styles.measurements}>
            <View style={styles.measurementBox}>
              <Text style={styles.measurementLabel}>Depth</Text>
              <Text style={styles.measurementValue}>8 cm</Text>
            </View>
            <View style={styles.measurementBox}>
              <Text style={styles.measurementLabel}>Size</Text>
              <Text style={styles.measurementValue}>45 cm</Text>
            </View>
          </View>
          
          <Text style={[commonStyles.severityLabel, { marginTop: 12 }]}>Severity Assessment</Text>
          <View style={commonStyles.sliderTrack}>
            <View style={[commonStyles.sliderFill, { width: '65%' }]} />
            <View style={[commonStyles.sliderThumb, { left: '65%' }]} />
          </View>
          <View style={commonStyles.sliderLabels}>
            <Text style={commonStyles.sliderLabelText}>Minor</Text>
            <Text style={commonStyles.sliderLabelText}>Critical</Text>
          </View>
        </View>
        
        <View style={[commonStyles.statGrid, { marginBottom: 12 }]}>
          <StatBox number="24" label="Reports" />
          <StatBox number="18" label="Verified" />
        </View>
        
        <Button title="Verify Hazard" style={{ marginBottom: 8 }} />
        <Button title="Mark Resolved" secondary />
        
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
  mapGrid: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.1)',
  },
  markerText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '600',
  },
  detailCard: {
    backgroundColor: 'rgba(26, 26, 46, 0.6)',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  hazardName: {
    fontSize: 13,
    color: colors.white,
    fontWeight: '600',
    marginBottom: 8,
  },
  location: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 10,
  },
  measurements: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  measurementBox: {
    flex: 1,
    backgroundColor: 'rgba(0,245,255,0.1)',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  measurementLabel: {
    fontSize: 11,
    color: colors.primary,
  },
  measurementValue: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '600',
  },
});
