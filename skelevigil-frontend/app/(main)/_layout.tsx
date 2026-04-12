import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { PHASE_ACCENTS } from '@/src/theme/phaseAccents';
import { SV } from '@/src/theme/skelevigil';

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: SV.abyss },
        headerTintColor: SV.neonCyan,
        headerTitleStyle: { color: PHASE_ACCENTS.stare.primary, fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: SV.abyss,
          borderTopColor: 'rgba(0,255,255,0.2)',
        },
        tabBarActiveTintColor: SV.neonCyan,
        tabBarInactiveTintColor: SV.muted,
      }}>
      <Tabs.Screen
        name="phases"
        options={{
          title: 'Phases',
          tabBarLabel: 'Phases',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="layers" size={size ?? 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vigil"
        options={{
          title: 'Vigil',
          tabBarLabel: 'Vigil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size ?? 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Vault',
          tabBarLabel: 'Vault',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size ?? 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="system"
        options={{
          title: 'System',
          tabBarLabel: 'System',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size ?? 24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
