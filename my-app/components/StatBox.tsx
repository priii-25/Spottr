import { View, Text } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { commonStyles, gradients } from '@/constants/styles';

interface StatBoxProps {
  number: string;
  label: string;
}

export default function StatBox({ number, label }: StatBoxProps) {
  return (
    <View style={commonStyles.statBox}>
      <MaskedView maskElement={<Text style={commonStyles.statNumber}>{number}</Text>}>
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ height: 30 }}
        >
          <Text style={[commonStyles.statNumber, { opacity: 0 }]}>{number}</Text>
        </LinearGradient>
      </MaskedView>
      <Text style={commonStyles.statLabel}>{label}</Text>
    </View>
  );
}
