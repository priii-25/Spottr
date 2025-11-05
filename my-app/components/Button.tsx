import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { commonStyles, gradients, colors } from '@/constants/styles';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  secondary?: boolean;
  style?: any;
}

export default function Button({ title, onPress, secondary, style }: ButtonProps) {
  if (secondary) {
    return (
      <TouchableOpacity
        style={[commonStyles.button, commonStyles.buttonSecondary, style]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={[commonStyles.buttonText, commonStyles.buttonSecondaryText]}>
          {title}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={style}>
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[commonStyles.button, styles.gradient]}
      >
        <Text style={commonStyles.buttonText}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gradient: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
});
