import { View, ScrollView, StyleSheet, Text, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import MaskedView from '@react-native-masked-view/masked-view';
import StatusBar from '@/components/StatusBar';
import ScreenTitle from '@/components/ScreenTitle';
import AIBadge from '@/components/AIBadge';
import StatBox from '@/components/StatBox';
import { commonStyles, gradients, colors } from '@/constants/styles';
import { DETECTION_SERVICE_URL, HAZARD_ICONS } from '@/services/detection-config';
import { 
  CrowdIntelligenceClient, 
  Hazard, 
  getStatusColor, 
  getSeverityColor, 
  formatConfidence,
  getTimeAgo,
  CrowdStats
} from '@/services/crowd-intelligence';

export default function CommunityScreen() {
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [stats, setStats] = useState<CrowdStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userId] = useState(`user_${Date.now()}`); // In production, use actual user ID
  
  const crowdClient = new CrowdIntelligenceClient(DETECTION_SERVICE_URL);

  // Mock location (in production, use actual GPS)
  const mockLocation = { latitude: 37.7749, longitude: -122.4194 };

  const loadNearbyHazards = useCallback(async () => {
    try {
      setLoading(true);
      const nearbyHazards = await crowdClient.getNearbyHazards(
        mockLocation.latitude,
        mockLocation.longitude,
        1000, // 1km radius
        false
      );
      setHazards(nearbyHazards);
    } catch (error) {
      console.error('Failed to load hazards:', error);
    } finally {
      setLoading(false);
    }
  }, [mockLocation.latitude, mockLocation.longitude]);

  const loadStats = useCallback(async () => {
    try {
      const crowdStats = await crowdClient.getStats();
      setStats(crowdStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  useEffect(() => {
    loadNearbyHazards();
    loadStats();
  }, [loadNearbyHazards, loadStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadNearbyHazards(), loadStats()]);
    setRefreshing(false);
  }, [loadNearbyHazards, loadStats]);

  const handleConfirm = async (hazard: Hazard) => {
    try {
      const updated = await crowdClient.confirmHazard(
        hazard.hazard_id,
        userId,
        mockLocation
      );
      
      setHazards(prev => 
        prev.map(h => h.hazard_id === updated.hazard_id ? updated : h)
      );
      
      Alert.alert('✅ Confirmed!', 'Thank you for verifying this hazard.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to confirm hazard');
    }
  };

  const handleDeny = async (hazard: Hazard) => {
    Alert.alert(
      'Deny Hazard?',
      'Are you sure this hazard does not exist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = await crowdClient.denyHazard(hazard.hazard_id, userId, mockLocation);
              setHazards(prev => prev.map(h => h.hazard_id === updated.hazard_id ? updated : h));
              Alert.alert('✅ Recorded', 'Your feedback helps improve accuracy.');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to deny hazard');
            }
          }
        }
      ]
    );
  };

  const handleResolve = async (hazard: Hazard) => {
    Alert.alert(
      'Mark as Fixed?',
      'Has this hazard been repaired?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Fixed',
          onPress: async () => {
            try {
              const updated = await crowdClient.resolveHazard(hazard.hazard_id, userId, mockLocation);
              setHazards(prev => prev.filter(h => h.hazard_id !== updated.hazard_id));
              Alert.alert('🎉 Great!', 'Thanks for updating the community!');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to resolve hazard');
            }
          }
        }
      ]
    );
  };
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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          <StatusBar />
          <ScreenTitle title="Crowd Intelligence" />
        
        <AIBadge text="Community-Verified Hazards" fullWidth centered />
        
        {/* Statistics */}
        {stats && (
          <View style={commonStyles.statGrid}>
            <StatBox number={stats.active_hazards.toString()} label="Active Hazards" />
            <StatBox number={stats.verified_hazards.toString()} label="Verified" />
          </View>
        )}
        
        {/* Nearby Hazards */}
        <Text style={styles.sectionTitle}>
          Nearby Hazards {hazards.length > 0 && `(${hazards.length})`}
        </Text>
        
        {loading && hazards.length === 0 ? (
          <Text style={styles.emptyText}>Loading nearby hazards...</Text>
        ) : hazards.length === 0 ? (
          <Text style={styles.emptyText}>No active hazards nearby 🎉</Text>
        ) : (
          hazards.map((hazard) => {
            const icon = HAZARD_ICONS[hazard.class_name] || HAZARD_ICONS['Default'];
            const statusColor = getStatusColor(hazard.status);
            
            return (
              <View key={hazard.hazard_id} style={styles.hazardCard}>
                <View style={styles.hazardHeader}>
                  <View style={styles.hazardTitleRow}>
                    <Text style={styles.hazardIcon}>{icon}</Text>
                    <View style={styles.hazardTitleContainer}>
                      <Text style={styles.hazardTitle}>{hazard.class_name}</Text>
                      <Text style={styles.hazardTime}>{getTimeAgo(hazard.detection_timestamp)}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                    <Text style={styles.badgeText}>{hazard.status}</Text>
                  </View>
                </View>
                
                {/* Crowd Intelligence */}
                <View style={styles.crowdInfo}>
                  <View style={styles.crowdStat}>
                    <Text style={styles.crowdValue}>
                      {formatConfidence(hazard.crowd_intelligence.confidence_score)}
                    </Text>
                    <Text style={styles.crowdLabel}>Confidence</Text>
                  </View>
                  <View style={styles.crowdStat}>
                    <Text style={styles.crowdValue}>
                      ✅ {hazard.crowd_intelligence.confirmations}
                    </Text>
                    <Text style={styles.crowdLabel}>Confirms</Text>
                  </View>
                  <View style={styles.crowdStat}>
                    <Text style={styles.crowdValue}>
                      ❌ {hazard.crowd_intelligence.denials}
                    </Text>
                    <Text style={styles.crowdLabel}>Denies</Text>
                  </View>
                </View>
                
                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.confirmButton]}
                    onPress={() => handleConfirm(hazard)}
                  >
                    <Text style={styles.actionButtonText}>✓ Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.denyButton]}
                    onPress={() => handleDeny(hazard)}
                  >
                    <Text style={styles.actionButtonText}>✗ Deny</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.resolveButton]}
                    onPress={() => handleResolve(hazard)}
                  >
                    <Text style={styles.actionButtonText}>✓ Fixed</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
        
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
  emptyText: {
    color: colors.white,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
    fontSize: 14,
    opacity: 0.7,
  },
  hazardCard: {
    backgroundColor: 'rgba(26, 26, 46, 0.6)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  hazardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  hazardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  hazardIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  hazardTitleContainer: {
    flex: 1,
  },
  hazardTitle: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '600',
    marginBottom: 4,
  },
  hazardTime: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  crowdInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.1)',
  },
  crowdStat: {
    alignItems: 'center',
  },
  crowdValue: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: 4,
  },
  crowdLabel: {
    fontSize: 10,
    color: colors.white,
    opacity: 0.6,
    textTransform: 'uppercase',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    backgroundColor: 'rgba(0, 255, 127, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 127, 0.3)',
  },
  denyButton: {
    backgroundColor: 'rgba(255, 69, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 0, 0.3)',
  },
  resolveButton: {
    backgroundColor: 'rgba(0, 245, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
  },
  actionButtonText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: '600',
  },
});
