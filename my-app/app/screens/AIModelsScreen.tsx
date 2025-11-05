import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import StatusBar from '@/components/StatusBar';
import ScreenTitle from '@/components/ScreenTitle';
import AIBadge from '@/components/AIBadge';
import { commonStyles, gradients, colors } from '@/constants/styles';

export default function AIModelsScreen() {
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
        <ScreenTitle title="AI Models" />
        
        <AIBadge text="Edge-Cloud Hybrid" />
        
        <View style={commonStyles.modelCard}>
          <Text style={commonStyles.modelName}>YOLOv8 Detection</Text>
          <Text style={commonStyles.modelStatus}>✓ Active • Edge Processing</Text>
          <View style={[commonStyles.confidenceMeter, { marginTop: 8 }]}>
            <Text style={commonStyles.confidenceMeterText}>Performance:</Text>
            <View style={commonStyles.confidenceBar}>
              <View style={[commonStyles.confidenceFill, { width: '92%' }]} />
            </View>
            <Text style={commonStyles.confidenceMeterText}>92%</Text>
          </View>
        </View>
        
        <View style={commonStyles.modelCard}>
          <Text style={commonStyles.modelName}>SAM Segmentation</Text>
          <Text style={commonStyles.modelStatus}>✓ Active • Cloud Processing</Text>
          <View style={[commonStyles.confidenceMeter, { marginTop: 8 }]}>
            <Text style={commonStyles.confidenceMeterText}>Accuracy:</Text>
            <View style={commonStyles.confidenceBar}>
              <View style={[commonStyles.confidenceFill, { width: '88%' }]} />
            </View>
            <Text style={commonStyles.confidenceMeterText}>88%</Text>
          </View>
        </View>
        
        <View style={commonStyles.modelCard}>
          <Text style={commonStyles.modelName}>MiDaS Depth Estimation</Text>
          <Text style={commonStyles.modelStatus}>○ Standby • Cloud Processing</Text>
          <View style={[commonStyles.confidenceMeter, { marginTop: 8 }]}>
            <Text style={commonStyles.confidenceMeterText}>Ready:</Text>
            <View style={commonStyles.confidenceBar}>
              <View style={[commonStyles.confidenceFill, { width: '100%' }]} />
            </View>
            <Text style={commonStyles.confidenceMeterText}>100%</Text>
          </View>
        </View>
        
        <View style={commonStyles.modelCard}>
          <Text style={commonStyles.modelName}>Temporal Consistency</Text>
          <Text style={commonStyles.modelStatus}>✓ Active • Video Analysis</Text>
          <View style={[commonStyles.confidenceMeter, { marginTop: 8 }]}>
            <Text style={commonStyles.confidenceMeterText}>Tracking:</Text>
            <View style={commonStyles.confidenceBar}>
              <View style={[commonStyles.confidenceFill, { width: '95%' }]} />
            </View>
            <Text style={commonStyles.confidenceMeterText}>95%</Text>
          </View>
        </View>
        
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
