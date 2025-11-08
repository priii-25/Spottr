import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatusBar from '@/components/StatusBar';
import ScreenTitle from '@/components/ScreenTitle';
import Toggle from '@/components/Toggle';
import { commonStyles, gradients, colors } from '@/constants/styles';

export default function SettingsScreen() {
  return (
    <LinearGradient
      colors={gradients.screen}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <StatusBar />
          <ScreenTitle title="Settings" />
        
        <View style={commonStyles.settingsSection}>
          <View style={commonStyles.settingsItem}>
            <Text style={commonStyles.settingsText}>Auto-Detection</Text>
            <Toggle value={true} />
          </View>
          <View style={commonStyles.settingsItem}>
            <Text style={commonStyles.settingsText}>Sound Alerts</Text>
            <Toggle value={true} />
          </View>
          <View style={commonStyles.settingsItem}>
            <Text style={commonStyles.settingsText}>Privacy Mode</Text>
            <Toggle value={true} />
          </View>
          <View style={[commonStyles.settingsItem, commonStyles.settingsItemLast]}>
            <Text style={commonStyles.settingsText}>Data Upload</Text>
            <Toggle value={false} />
          </View>
        </View>
        
        <View style={commonStyles.settingsSection}>
          <View style={commonStyles.settingsItem}>
            <Text style={commonStyles.settingsText}>Account</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
          <View style={commonStyles.settingsItem}>
            <Text style={commonStyles.settingsText}>About</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
          <View style={[commonStyles.settingsItem, commonStyles.settingsItemLast]}>
            <Text style={commonStyles.settingsText}>Help & Support</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>
        
        <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  chevron: {
    fontSize: 16,
    color: colors.primary,
  },
});
