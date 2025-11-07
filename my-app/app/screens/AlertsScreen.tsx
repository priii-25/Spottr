import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import StatusBar from '@/components/StatusBar';
import ScreenTitle from '@/components/ScreenTitle';
import AIBadge from '@/components/AIBadge';
import HazardCard from '@/components/HazardCard';
import Button from '@/components/Button';
import { commonStyles, gradients, colors } from '@/constants/styles';

interface HazardDetail {
  title: string;
  distance: string;
  confidence: number;
  depth?: string;
  size?: string;
  severity: number;
  location: string;
  reports: number;
  verified: number;
}

const hazards: HazardDetail[] = [
  {
    title: 'Pothole',
    distance: '1.2 km ahead',
    confidence: 94,
    depth: '8 cm',
    size: '45 cm',
    severity: 65,
    location: 'Ring Road, Sector 14',
    reports: 24,
    verified: 18,
  },
  {
    title: 'Stalled Vehicle',
    distance: '500 m ahead',
    confidence: 87,
    severity: 40,
    location: 'Main Street, Block A',
    reports: 12,
    verified: 10,
  },
];

export default function AlertsScreen() {
  const [selectedHazard, setSelectedHazard] = useState<HazardDetail | null>(null);

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
        <StatusBar />
        <ScreenTitle title="Live AI Alerts" />
        
        <AIBadge text="Scanning Environment" />
        
        <View style={commonStyles.mapArea}>
          <View style={styles.mapGrid} />
          <View style={[commonStyles.mapMarker, { top: '25%', left: '35%' }]}>
            <Text style={styles.markerText}>×</Text>
          </View>
          <View style={[commonStyles.mapMarker, { top: '55%', left: '60%', width: 35, height: 35 }]}>
            <Text style={styles.markerText}>×</Text>
          </View>
        </View>
        
        {hazards.map((hazard, index) => (
          <TouchableOpacity 
            key={index} 
            onPress={() => setSelectedHazard(hazard)}
            activeOpacity={0.7}
          >
            <HazardCard 
              title={hazard.title} 
              distance={hazard.distance} 
              confidence={hazard.confidence} 
            />
          </TouchableOpacity>
        ))}
        
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Hazard Detail Modal */}
      <Modal
        visible={selectedHazard !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedHazard(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={gradients.screen}
              style={styles.modalGradient}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>{selectedHazard?.title} Details</Text>
                
                <View style={styles.detailCard}>
                  <Text style={styles.location}>📍 {selectedHazard?.location}</Text>
                  
                  {selectedHazard?.depth && selectedHazard?.size && (
                    <View style={styles.measurements}>
                      <View style={styles.measurementBox}>
                        <Text style={styles.measurementLabel}>Depth</Text>
                        <Text style={styles.measurementValue}>{selectedHazard.depth}</Text>
                      </View>
                      <View style={styles.measurementBox}>
                        <Text style={styles.measurementLabel}>Size</Text>
                        <Text style={styles.measurementValue}>{selectedHazard.size}</Text>
                      </View>
                    </View>
                  )}
                  
                  <View style={styles.measurements}>
                    <View style={styles.measurementBox}>
                      <Text style={styles.measurementLabel}>Distance</Text>
                      <Text style={styles.measurementValue}>{selectedHazard?.distance}</Text>
                    </View>
                    <View style={styles.measurementBox}>
                      <Text style={styles.measurementLabel}>Confidence</Text>
                      <Text style={styles.measurementValue}>{selectedHazard?.confidence}%</Text>
                    </View>
                  </View>

                  <Text style={[commonStyles.severityLabel, { marginTop: 12 }]}>Severity Assessment</Text>
                  <View style={commonStyles.sliderTrack}>
                    <View style={[commonStyles.sliderFill, { width: `${selectedHazard?.severity || 0}%` }]} />
                    <View style={[commonStyles.sliderThumb, { left: `${selectedHazard?.severity || 0}%` }]} />
                  </View>
                  <View style={commonStyles.sliderLabels}>
                    <Text style={commonStyles.sliderLabelText}>Minor</Text>
                    <Text style={commonStyles.sliderLabelText}>Critical</Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{selectedHazard?.reports}</Text>
                    <Text style={styles.statLabel}>Reports</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{selectedHazard?.verified}</Text>
                    <Text style={styles.statLabel}>Verified</Text>
                  </View>
                </View>

                <Button title="Verify Hazard" style={{ marginBottom: 8 }} />
                <Button title="Mark Resolved" secondary style={{ marginBottom: 8 }} />
                <Button 
                  title="Close" 
                  secondary 
                  onPress={() => setSelectedHazard(null)}
                />
              </ScrollView>
            </LinearGradient>
          </View>
        </View>
      </Modal>
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
  mapGrid: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.1)',
  },
  markerText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    maxHeight: '85%',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
  },
  modalGradient: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  detailCard: {
    backgroundColor: 'rgba(26, 26, 46, 0.6)',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  location: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 10,
  },
  measurements: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  measurementBox: {
    flex: 1,
    backgroundColor: 'rgba(0,245,255,0.1)',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  measurementLabel: {
    fontSize: 11,
    color: colors.primary,
  },
  measurementValue: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  statItem: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.8)',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(0, 245, 255, 0.7)',
    marginTop: 5,
    textTransform: 'uppercase',
  },
});
