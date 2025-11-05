import { View, Text } from 'react-native';
import { commonStyles } from '@/constants/styles';

export default function StatusBar() {
  return (
    <View style={commonStyles.statusBar}>
      <Text style={commonStyles.statusBarText}>9:41</Text>
      <Text style={commonStyles.statusBarText}>⚡︎📶 ☰</Text>
    </View>
  );
}
