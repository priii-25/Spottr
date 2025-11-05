import { View, Text, StyleSheet } from 'react-native';
import { commonStyles } from '@/constants/styles';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { useEffect } from 'react';

interface AIBadgeProps {
  text: string;
  fullWidth?: boolean;
  centered?: boolean;
}

export default function AIBadge({ text, fullWidth, centered }: AIBadgeProps) {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0.5, { duration: 1000 })
        ),
        -1,
        false
      ),
      transform: [
        {
          scale: withRepeat(
            withSequence(
              withTiming(1, { duration: 1000 }),
              withTiming(0.8, { duration: 1000 })
            ),
            -1,
            false
          ),
        },
      ],
    };
  });

  return (
    <View
      style={[
        commonStyles.aiBadge,
        fullWidth && styles.fullWidth,
        centered && styles.centered,
      ]}
    >
      <Animated.View style={[commonStyles.aiPulse, animatedStyle]} />
      <Text style={commonStyles.aiBadgeText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  centered: {
    justifyContent: 'center',
  },
});
