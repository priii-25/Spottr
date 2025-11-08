import { View, ScrollView, StyleSheet, Text, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import StatusBar from '@/components/StatusBar';
import ScreenTitle from '@/components/ScreenTitle';
import AIBadge from '@/components/AIBadge';
import { commonStyles, gradients, colors } from '@/constants/styles';
import { DETECTION_SERVICE_URL, HAZARD_ICONS } from '@/services/detection-config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SeverityAssessment {
  severity_level: string;
  severity_score: number;
  segmentation: any;
  depth: any;
  weather: any;
  contextual_factors: Record<string, any>;
  recommendations: string[];
  risk_multipliers: Record<string, number>;
}

export default function HazardDetailScreen() {
  const params = useLocalSearchParams();
  const hazardId = params.hazard_id as string;
  const hazardType = params.hazard_type as string || 'Unknown';
  const confidence = params.confidence as string || '0';

  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<SeverityAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSeverityAssessment();
  }, [hazardId]);

  const loadSeverityAssessment = async () => {
    try {
      setLoading(true);
      setError(null);

      const vehicleSpeed = 50; // km/h
      const timeOfDay = getTimeOfDay();

      const response = await fetch(
        `${DETECTION_SERVICE_URL}/hazards/${hazardId}/assess_severity?vehicle_speed=${vehicleSpeed}&time_of_day=${timeOfDay}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error('Failed to load severity assessment');
      }

      const data = await response.json();
      setAssessment(data.assessment);
    } catch (err) {
      console.error('Failed to load assessment:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getTimeOfDay = (): string => {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  };

  const getSeverityColor = (level: string): string => {
    switch (level) {
      case 'critical': return '#FF0000';
      case 'high': return '#FF6B00';
      case 'moderate': return '#FFA500';
      case 'low': return '#FFD700';
      case 'minimal': return '#00FF7F';
      default: return colors.primary;
    }
  };

  return (
    <LinearGradient colors={gradients.screen} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <StatusBar />
          
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <ScreenTitle title="Hazard Analysis" />
          </View>

          {/* Hazard Info */}
          <View style={styles.hazardCard}>
            <Text style={styles.hazardIcon}>
              {HAZARD_ICONS[hazardType] || HAZARD_ICONS['Default']}
            </Text>
            <Text style={styles.hazardTitle}>{hazardType}</Text>
            <Text style={styles.hazardSubtitle}>
              Detection Confidence: {confidence}%
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Analyzing hazard severity...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>❌ {error}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={loadSeverityAssessment}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : assessment ? (
            <>
              {/* Severity Score */}
              <View style={styles.severityCard}>
                <Text style={styles.severityIcon}>🎯</Text>
                <Text style={[styles.severityLevel, { color: getSeverityColor(assessment.severity_level) }]}>
                  {assessment.severity_level.toUpperCase()}
                </Text>
                <View style={styles.scoreContainer}>
                  <Text style={styles.scoreLabel}>Severity Score</Text>
                  <Text style={[styles.scoreValue, { color: getSeverityColor(assessment.severity_level) }]}>
                    {assessment.severity_score.toFixed(1)}/100
                  </Text>
                </View>
              </View>

              {/* Segmentation Analysis */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>📐 Segmentation Analysis</Text>
                <AIBadge text="SAM-based Boundary Detection" fullWidth centered />
                
                {assessment.segmentation && (
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Area: </Text>
                    <Text style={styles.dataValue}>
                      {assessment.segmentation.area_m2?.toFixed(2) || 'N/A'} m²
                    </Text>
                  </View>
                )}
              </View>

              {/* Depth Analysis */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>📏 3D Depth Estimation</Text>
                <AIBadge text="MiDaS Dense Prediction" fullWidth centered />
                
                {assessment.depth && (
                  <>
                    <View style={styles.dataRow}>
                      <Text style={styles.dataLabel}>Max Depth: </Text>
                      <Text style={[styles.dataValue, styles.criticalValue]}>
                        {assessment.depth.max_depth_cm?.toFixed(1)} cm
                      </Text>
                    </View>
                    <View style={styles.dataRow}>
                      <Text style={styles.dataLabel}>Category: </Text>
                      <Text style={styles.dataValue}>
                        {assessment.depth.depth_category}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              {/* Weather */}
              {assessment.weather && (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>🌤️ Weather Impact</Text>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Condition: </Text>
                    <Text style={styles.dataValue}>{assessment.weather.condition}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Temperature: </Text>
                    <Text style={styles.dataValue}>{assessment.weather.temperature}°C</Text>
                  </View>
                </View>
              )}

              {/* Recommendations */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>💡 Safety Recommendations</Text>
                
                {assessment.recommendations.map((rec, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <Text style={styles.recommendationText}>{rec}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <View style={{ height: 40 }} />
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
  header: {
    marginBottom: 20,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  hazardCard: {
    backgroundColor: 'rgba(26, 26, 46, 0.6)',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  hazardIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  hazardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 5,
  },
  hazardSubtitle: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.7,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.white,
    fontSize: 16,
    marginTop: 15,
    fontWeight: '600',
  },
  errorContainer: {
    padding: 30,
    alignItems: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 245, 255, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  severityCard: {
    backgroundColor: 'rgba(26, 26, 46, 0.8)',
    padding: 25,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(0, 245, 255, 0.3)',
  },
  severityIcon: {
    fontSize: 64,
    marginBottom: 10,
  },
  severityLevel: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 15,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  scoreLabel: {
    color: colors.white,
    fontSize: 14,
    marginBottom: 5,
    opacity: 0.7,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: 'rgba(26, 26, 46, 0.6)',
    padding: 18,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dataLabel: {
    color: colors.white,
    fontSize: 14,
    opacity: 0.7,
  },
  dataValue: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  criticalValue: {
    color: '#FF6B00',
  },
  recommendationItem: {
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  recommendationText: {
    color: colors.white,
    fontSize: 13,
    lineHeight: 20,
  },
});
