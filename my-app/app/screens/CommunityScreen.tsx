import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaskedView from '@react-native-masked-view/masked-view';
import StatusBar from '@/components/StatusBar';
import ScreenTitle from '@/components/ScreenTitle';
import AIBadge from '@/components/AIBadge';
import StatBox from '@/components/StatBox';
import { commonStyles, gradients, colors } from '@/constants/styles';

export default function CommunityScreen() {
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
          <ScreenTitle title="Crowd Intelligence" />
        
        <AIBadge text="Federated Learning Network" />
        
        <View style={commonStyles.statGrid}>
          <StatBox number="2.4K" label="Active Users" />
          <StatBox number="847" label="Your Reports" />
        </View>
        
        <View style={styles.contributionSection}>
          <Text style={styles.sectionTitle}>Your Contribution</Text>
          <View style={styles.contributionRow}>
            <Text style={styles.contributionLabel}>Accuracy Score</Text>
            <Text style={styles.contributionValue}>96%</Text>
          </View>
          <View style={styles.contributionRow}>
            <Text style={styles.contributionLabel}>Reputation Level</Text>
            <Text style={styles.contributionValue}>Expert</Text>
          </View>
          <View style={styles.contributionRow}>
            <Text style={styles.contributionLabel}>Rewards Earned</Text>
            <Text style={styles.contributionValue}>2,450 pts</Text>
          </View>
        </View>
        
        <View style={styles.contributionSection}>
          <Text style={styles.sectionTitle}>Recent Validations</Text>
          <View style={[commonStyles.listItem, { marginBottom: 6 }]}>
            <Text style={commonStyles.listItemText}>Pothole - Ring Rd</Text>
            <Text style={commonStyles.listItemSubtext}>+50 pts</Text>
          </View>
          <View style={[commonStyles.listItem, { marginBottom: 6 }]}>
            <Text style={commonStyles.listItemText}>Debris - NH-44</Text>
            <Text style={commonStyles.listItemSubtext}>+30 pts</Text>
          </View>
          <View style={commonStyles.listItem}>
            <Text style={commonStyles.listItemText}>Speed Breaker</Text>
            <Text style={commonStyles.listItemSubtext}>+40 pts</Text>
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
  contributionSection: {
    backgroundColor: 'rgba(26, 26, 46, 0.6)',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  sectionTitle: {
    fontSize: 11,
    color: colors.primary,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  contributionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  contributionLabel: {
    fontSize: 12,
    color: colors.white,
  },
  contributionValue: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
});
