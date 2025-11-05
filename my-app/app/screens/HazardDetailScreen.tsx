import { View, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import StatusBar from '@/components/StatusBar';
import ScreenTitle from '@/components/ScreenTitle';
import AIBadge from '@/components/AIBadge';
import Button from '@/components/Button';
import { commonStyles, gradients, colors } from '@/constants/styles';

export default function HazardDetailScreen() {
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
        <ScreenTitle title="Hazard Overview" />
        
        <AIBadge text="Multi-Modal Analysis" />
        
        <View style={[commonStyles.mapArea, { height: 160 }]}>
          <View style={styles.mapGrid} />
          <View style={[commonStyles.mapMarker, { top: '45%', left: '45%' }]}>
            <Text style={styles.markerText}>×</Text>
          </View>
        </View>
        
        <View style={commonStyles.severityContainer}>
          <Text style={commonStyles.severityLabel}>AI Severity Score</Text>
          <View style={commonStyles.sliderTrack}>
            <View style={[commonStyles.sliderFill, { width: '40%' }]} />
            <View style={[commonStyles.sliderThumb, { left: '40%' }]} />
          </View>
          <View style={commonStyles.sliderLabels}>
            <Text style={commonStyles.sliderLabelText}>Minor</Text>
            <Text style={commonStyles.sliderLabelText}>Critical</Text>
          </View>
        </View>
        
        <Button title="Verify Hazard" style={{ marginTop: 15, marginBottom: 8 }} />
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
});
