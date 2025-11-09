import { View, ScrollView, StyleSheet, Text, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import MaskedView from '@react-native-masked-view/masked-view';
import ScreenTitle from '@/components/ScreenTitle';
import AIBadge from '@/components/AIBadge';
import StatBox from '@/components/StatBox';
import { commonStyles, gradients, colors } from '@/constants/styles';
import { API_BASE_URL, HAZARD_ICONS } from '@/services/detection-config';
import { 
  CrowdIntelligenceClient, 
  Hazard, 
  getStatusColor, 
  getSeverityColor, 
  formatConfidence,
  getTimeAgo,
  CrowdStats
} from '@/services/crowd-intelligence';

// Mock demo data
const DEMO_HAZARDS: Hazard[] = [
  {
    hazard_id: 'demo_1',
    class_name: 'pothole',
    severity: 'high',
    location: { lat: 37.7749, lon: -122.4194 },
    bbox: [100, 100, 200, 200],
    detection_timestamp: Date.now() - 2 * 60 * 60 * 1000,
    initial_confidence: 0.87,
    status: 'unverified',
    crowd_intelligence: {
      confirmations: 6,
      denials: 1,
      total_feedback: 7,
      confidence_score: 0.87,
      verified_by_count: 6
    },
    last_updated: Date.now() - 10 * 60 * 1000
  },
  {
    hazard_id: 'demo_3',
    class_name: 'debris',
    severity: 'low',
    location: { lat: 37.7748, lon: -122.4193 },
    bbox: [80, 80, 180, 180],
    detection_timestamp: Date.now() - 45 * 60 * 1000,
    initial_confidence: 0.71,
    status: 'unverified',
    crowd_intelligence: {
      confirmations: 2,
      denials: 0,
      total_feedback: 2,
      confidence_score: 0.71,
      verified_by_count: 2
    },
    last_updated: Date.now() - 15 * 60 * 1000
  },
  {
    hazard_id: 'demo_4',
    class_name: 'speed_bump',
    severity: 'medium',
    location: { lat: 37.7751, lon: -122.4196 },
    bbox: [150, 150, 250, 250],
    detection_timestamp: Date.now() - 3 * 60 * 60 * 1000,
    initial_confidence: 0.82,
    status: 'verified',
    crowd_intelligence: {
      confirmations: 4,
      denials: 0,
      total_feedback: 4,
      confidence_score: 0.82,
      verified_by_count: 4
    },
    last_updated: Date.now() - 20 * 60 * 1000
  }
];

const DEMO_STATS: CrowdStats = {
  total_hazards: 12,
  verified_hazards: 9,
  resolved_hazards: 2,
  disputed_hazards: 1,
  total_feedback: 42,
  unique_contributors: 14,
  active_hazards: 10,
  verification_threshold: 3,
  denial_threshold: 5
};

export default function CommunityScreen() {
  const [hazards, setHazards] = useState<Hazard[]>(DEMO_HAZARDS);
  const [stats, setStats] = useState<CrowdStats | null>(DEMO_STATS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userId] = useState(`user_${Date.now()}`); // In production, use actual user ID
  
  const crowdClient = new CrowdIntelligenceClient(API_BASE_URL);

  // Mock location (in production, use actual GPS)
  const mockLocation = { latitude: 37.7749, longitude: -122.4194 };

  const loadNearbyHazards = useCallback(async () => {
    try {
      setLoading(true);
      // Use demo data instead of API call for demo
      setHazards(DEMO_HAZARDS);
    } catch (error) {
      console.error('Failed to load hazards:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      // Use demo stats instead of API call for demo
      setStats(DEMO_STATS);
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
          <ScreenTitle title="Community" />
        
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
