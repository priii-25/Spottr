import { View, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import StatusBar from '@/components/StatusBar';
import ScreenTitle from '@/components/ScreenTitle';
import Button from '@/components/Button';
import { commonStyles, gradients, colors } from '@/constants/styles';

const HAZARD_TYPES = ['Pothole', 'Speed Breaker', 'Debris', 'Stalled Vehicle'];

export default function ReportHazardScreen() {
  const [selectedType, setSelectedType] = useState('Pothole');
  const [severity, setSeverity] = useState(60);

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
        <ScreenTitle title="Report Hazard" />
        
        <View style={styles.typeSection}>
          <Text style={styles.sectionTitle}>Hazard Type</Text>
          {HAZARD_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={styles.radioItem}
              onPress={() => setSelectedType(type)}
              activeOpacity={0.7}
            >
              <Text style={styles.radioText}>{type}</Text>
              <View style={styles.radioButton}>
                {selectedType === type && <View style={styles.radioButtonSelected} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={[commonStyles.severityContainer, { marginBottom: 15 }]}>
          <Text style={commonStyles.severityLabel}>Severity Level</Text>
          <View style={commonStyles.sliderTrack}>
            <View style={[commonStyles.sliderFill, { width: `${severity}%` }]} />
            <View style={[commonStyles.sliderThumb, { left: `${severity}%` }]} />
          </View>
          <View style={commonStyles.sliderLabels}>
            <Text style={commonStyles.sliderLabelText}>Minor</Text>
            <Text style={commonStyles.sliderLabelText}>Critical</Text>
          </View>
        </View>
        
        <Button title="Submit Report" />
        
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
  typeSection: {
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
  radioItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(26, 26, 46, 0.4)',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  radioText: {
    color: colors.white,
    fontSize: 13,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    backgroundColor: colors.primary,
    borderRadius: 5,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
});
