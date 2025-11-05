import { View, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import StatusBar from '@/components/StatusBar';
import ScreenTitle from '@/components/ScreenTitle';
import AIBadge from '@/components/AIBadge';
import StatBox from '@/components/StatBox';
import AnalyticsChart from '@/components/AnalyticsChart';
import Button from '@/components/Button';
import { commonStyles, gradients } from '@/constants/styles';

export default function HomeScreen() {
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
        <ScreenTitle title="AI Dashboard" />
        
        <AIBadge text="Neural Network Active" />
        
        <View style={commonStyles.statGrid}>
          <StatBox number="247" label="Detected" />
          <StatBox number="12" label="Nearby" />
          <StatBox number="89%" label="Accuracy" />
          <StatBox number="156" label="Verified" />
        </View>
        
        <AnalyticsChart data={[60, 80, 45, 90, 70]} />
        
        <Button title="Start Detection" style={{ marginBottom: 8 }} />
        <Button title="View Neural Map" secondary />
        
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
