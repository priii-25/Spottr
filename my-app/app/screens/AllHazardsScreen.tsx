import { View, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import StatusBar from '@/components/StatusBar';
import ScreenTitle from '@/components/ScreenTitle';
import HazardCard from '@/components/HazardCard';
import { commonStyles, gradients, colors } from '@/constants/styles';

export default function AllHazardsScreen() {
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
        <ScreenTitle title="All Hazards" />
        
        <TextInput
          style={commonStyles.searchBox}
          placeholder="🔍 Search hazards..."
          placeholderTextColor="rgba(0, 245, 255, 0.5)"
        />
        
        <HazardCard title="Pothole" distance="1.2 km" confidence={94} />
        <HazardCard title="Stalled Vehicle" distance="500 m" confidence={87} />
        <HazardCard title="Debris" distance="800 m" confidence={91} />
        <HazardCard title="Speed Breaker" distance="2.5 km" confidence={96} />
        
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
});
