import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import StatusBar from '@/components/StatusBar';
import ScreenTitle from '@/components/ScreenTitle';
import AIBadge from '@/components/AIBadge';
import HazardCard from '@/components/HazardCard';
import { commonStyles, gradients, colors } from '@/constants/styles';

export default function AlertsScreen() {
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
        <ScreenTitle title="Live AI Alerts" />
        
        <AIBadge text="Scanning Environment" />
        
        <View style={commonStyles.mapArea}>
          <View style={styles.mapGrid} />
          <View style={[commonStyles.mapMarker, { top: '25%', left: '35%' }]}>
            <Text style={styles.markerText}>×</Text>
          </View>
          <View style={[commonStyles.mapMarker, { top: '55%', left: '60%', width: 35, height: 35 }]}>
            <Text style={styles.markerText}>×</Text>
          </View>
        </View>
        
        <HazardCard title="Pothole" distance="1.2 km ahead" confidence={94} />
        <HazardCard title="Stalled Vehicle" distance="500 m ahead" confidence={87} />
        
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
