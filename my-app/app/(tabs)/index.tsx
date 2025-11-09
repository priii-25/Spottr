import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import ScreenTitle from '@/components/ScreenTitle';
import AIBadge from '@/components/AIBadge';
import StatBox from '@/components/StatBox';
import { commonStyles, gradients } from '@/constants/styles';

export default function HomeScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Animate entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={gradients.screen}
      style={styles.container}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <Animated.View 
          style={[
            styles.heroSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <ScreenTitle title="Home" />
          <Text style={styles.subtitle}>Real-time Hazard Detection System</Text>
          
          <AIBadge text="🧠 Neural Network Active" />
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View 
          style={[
            styles.quickActions,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/camera')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#6366f1', '#8b5cf6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionGradient}
            >
              <Text style={styles.actionIcon}>📸</Text>
              <Text style={styles.actionTitle}>Start Detection</Text>
              <Text style={styles.actionSubtitle}>Launch Camera AI</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/explore')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#ec4899', '#f43f5e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionGradient}
            >
              <Text style={styles.actionIcon}>🗺️</Text>
              <Text style={styles.actionTitle}>Explore Map</Text>
              <Text style={styles.actionSubtitle}>View All Hazards</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Stats Section */}
        <Animated.View 
          style={[
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <Text style={styles.sectionTitle}>📊 Today's Statistics</Text>
          <View style={commonStyles.statGrid}>
            <StatBox number="12" label="Detected" />
            <StatBox number="8" label="Nearby" />
            <StatBox number="94%" label="Accuracy" />
            <StatBox number="9" label="Verified" />
          </View>
        </Animated.View>

        {/* Community Section */}
        <TouchableOpacity 
          style={styles.communityBanner}
          onPress={() => router.push('/(tabs)/community')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#0ea5e9', '#06b6d4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.communityGradient}
          >
            <View style={styles.communityContent}>
              <Text style={styles.communityIcon}>👥</Text>
              <View style={styles.communityText}>
                <Text style={styles.communityTitle}>Join the Community</Text>
                <Text style={styles.communitySubtitle}>Help verify hazards & earn rewards</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  heroSection: {
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  actionCard: {
    flex: 1,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
    marginTop: 8,
  },
  communityBanner: {
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  communityGradient: {
    padding: 20,
  },
  communityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  communityIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  communityText: {
    flex: 1,
  },
  communityTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  communitySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
});
