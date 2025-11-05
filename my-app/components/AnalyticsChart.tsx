import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, colors } from '@/constants/styles';

interface AnalyticsChartProps {
  data?: number[];
}

export default function AnalyticsChart({ data = [60, 80, 45, 90, 70] }: AnalyticsChartProps) {
  return (
    <View style={styles.container}>
      {data.map((height, index) => (
        <View key={index} style={[styles.barContainer, { height: `${height}%` }]}>
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.bar}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(26, 26, 46, 0.6)',
    height: 120,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    gap: 8,
  },
  barContainer: {
    flex: 1,
  },
  bar: {
    flex: 1,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
});
