import { Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { commonStyles, gradients } from '@/constants/styles';

interface ScreenTitleProps {
  title: string;
}

export default function ScreenTitle({ title }: ScreenTitleProps) {
  return (
    <MaskedView
      maskElement={<Text style={commonStyles.screenTitle}>{title}</Text>}
    >
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ height: 30 }}
      >
        <Text style={[commonStyles.screenTitle, { opacity: 0 }]}>{title}</Text>
      </LinearGradient>
    </MaskedView>
  );
}
