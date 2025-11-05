import { Tabs } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { colors } from '@/constants/styles';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: 'rgba(0, 245, 255, 0.4)',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: 'rgba(26, 26, 46, 0.95)',
          borderTopColor: 'rgba(0, 245, 255, 0.2)',
          borderTopWidth: 1,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⌂</Text>,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚠</Text>,
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: 'Camera',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📷</Text>,
        }}
      />
      <Tabs.Screen
        name="models"
        options={{
          title: 'AI',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🧠</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚙</Text>,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null, // Hide from tabs
        }}
      />
    </Tabs>
  );
}

