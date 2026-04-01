import { Stack } from 'expo-router';

import { SV } from '@/src/theme/skelevigil';

export default function SystemLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: SV.abyss },
        headerTintColor: SV.neonCyan,
        headerTitleStyle: { color: SV.surgicalWhite, fontWeight: '600' },
        contentStyle: { backgroundColor: SV.abyss },
      }}>
      <Stack.Screen name="index" options={{ title: 'System' }} />
      <Stack.Screen name="profile" options={{ title: 'My Profile' }} />
      <Stack.Screen name="help" options={{ title: 'Help & Questions' }} />
      <Stack.Screen name="about" options={{ title: 'About SkeleVigil' }} />
    </Stack>
  );
}

