import { Stack } from 'expo-router';

import { SvHeaderBack } from '@/src/components/SvHeaderBack';
import { PHASE_ACCENTS } from '@/src/theme/phaseAccents';
import { SV } from '@/src/theme/skelevigil';

export default function SystemLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: SV.abyss },
        headerTintColor: SV.neonCyan,
        headerTitleStyle: { color: PHASE_ACCENTS.stare.primary, fontWeight: '700' },
        contentStyle: { backgroundColor: SV.abyss },
      }}>
      <Stack.Screen name="index" options={{ title: 'System' }} />
      <Stack.Screen name="profile" options={{ title: 'My Profile' }} />
      <Stack.Screen
        name="change-password"
        options={{
          title: 'Change Password',
          headerBackTitleVisible: false,
          headerLeft: () => <SvHeaderBack />,
        }}
      />
      <Stack.Screen
        name="help"
        options={{
          title: 'Help & Questions',
          headerBackTitleVisible: false,
          headerLeft: () => <SvHeaderBack />,
        }}
      />
      <Stack.Screen
        name="about"
        options={{
          title: 'About SkeleVigil',
          headerBackTitleVisible: false,
          headerLeft: () => <SvHeaderBack />,
        }}
      />
      <Stack.Screen
        name="privacy-policy"
        options={{
          title: 'Privacy Policy',
          headerBackTitleVisible: false,
          headerStyle: { backgroundColor: '#000000' },
          contentStyle: { backgroundColor: '#000000' },
          headerLeft: () => <SvHeaderBack />,
        }}
      />
      <Stack.Screen
        name="terms-of-service"
        options={{
          title: 'Terms of Service',
          headerBackTitleVisible: false,
          headerStyle: { backgroundColor: '#000000' },
          contentStyle: { backgroundColor: '#000000' },
          headerLeft: () => <SvHeaderBack />,
        }}
      />
    </Stack>
  );
}

