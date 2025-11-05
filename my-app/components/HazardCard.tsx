import { View, Text } from 'react-native';
import { commonStyles } from '@/constants/styles';

interface HazardCardProps {
  title: string;
  distance: string;
  confidence: number;
}

export default function HazardCard({ title, distance, confidence }: HazardCardProps) {
  return (
    <View style={commonStyles.hazardCard}>
      <Text style={commonStyles.hazardTitle}>⚠ {title}</Text>
      <Text style={commonStyles.hazardDistance}>{distance}</Text>
      <View style={commonStyles.confidenceMeter}>
        <Text style={commonStyles.confidenceMeterText}>AI Conf:</Text>
        <View style={commonStyles.confidenceBar}>
          <View
            style={[commonStyles.confidenceFill, { width: `${confidence}%` }]}
          />
        </View>
        <Text style={commonStyles.confidenceMeterText}>{confidence}%</Text>
      </View>
    </View>
  );
}
