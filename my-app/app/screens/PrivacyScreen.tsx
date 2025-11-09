import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import ScreenTitle from '@/components/ScreenTitle';
import AIBadge from '@/components/AIBadge';
import { commonStyles, gradients, colors } from '@/constants/styles';

export default function PrivacyScreen() {
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
        <ScreenTitle title="Privacy" />
        
        <View style={styles.privacyIcon}>
          <Text style={styles.iconText}>🔒</Text>
        </View>
        
        <AIBadge text="End-to-End Encryption Active" fullWidth centered />
        
        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Text style={styles.featureIconText}>👤</Text>
          </View>
          <Text style={styles.featureText}>Face Blurring (On-Device)</Text>
        </View>
        
        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Text style={styles.featureIconText}>🚗</Text>
          </View>
          <Text style={styles.featureText}>License Plate Masking</Text>
        </View>
        
        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Text style={styles.featureIconText}>🔐</Text>
          </View>
          <Text style={styles.featureText}>Homomorphic Encryption</Text>
        </View>
        
        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Text style={styles.featureIconText}>📡</Text>
          </View>
          <Text style={styles.featureText}>Federated Learning</Text>
        </View>
        
        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Text style={styles.featureIconText}>🗑️</Text>
          </View>
          <Text style={styles.featureText}>Auto Data Deletion (7 days)</Text>
        </View>
        
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Privacy Score</Text>
          <MaskedView maskElement={<Text style={styles.scoreValue}>A+</Text>}>
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ height: 40 }}
            >
              <Text style={[styles.scoreValue, { opacity: 0 }]}>A+</Text>
            </LinearGradient>
          </MaskedView>
        </View>
        
        <View style={{ height: 80 }} />
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
  privacyIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 'auto',
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  iconText: {
    fontSize: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: 'rgba(26, 26, 46, 0.4)',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.1)',
  },
  featureIcon: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIconText: {
    fontSize: 14,
  },
  featureText: {
    flex: 1,
    fontSize: 12,
    color: colors.white,
  },
  scoreContainer: {
    backgroundColor: 'rgba(26, 26, 46, 0.6)',
    padding: 14,
    borderRadius: 10,
    marginTop: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 11,
    color: colors.primary,
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '700',
  },
});
