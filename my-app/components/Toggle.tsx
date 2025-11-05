import { TouchableOpacity, View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useState } from 'react';
import { commonStyles, colors } from '@/constants/styles';
import { LinearGradient } from 'expo-linear-gradient';

interface ToggleProps {
  value?: boolean;
  onValueChange?: (value: boolean) => void;
}

export default function Toggle({ value: initialValue = false, onValueChange }: ToggleProps) {
  const [isActive, setIsActive] = useState(initialValue);

  const thumbStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: withTiming(isActive ? 22 : 0, { duration: 300 }),
        },
      ],
    };
  });

  const handleToggle = () => {
    const newValue = !isActive;
    setIsActive(newValue);
    onValueChange?.(newValue);
  };

  return (
    <TouchableOpacity onPress={handleToggle} activeOpacity={0.8}>
      <View style={[commonStyles.toggle, isActive && styles.activeToggle]}>
        <Animated.View style={[commonStyles.toggleThumb, thumbStyle]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  activeToggle: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
