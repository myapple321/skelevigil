import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { AuthGate } from '@/src/components/auth/AuthGate';
import { MissionNotificationsBinder } from '@/src/components/notifications/MissionNotificationsBinder';
import { MissionAlertProvider } from '@/src/contexts/MissionAlertContext';
import { PrivacyMaskingProvider } from '@/src/contexts/PrivacyMaskingContext';
import { SessionSecurityProvider } from '@/src/contexts/SessionSecurityContext';
import { SfxPreferenceProvider } from '@/src/contexts/SfxPreferenceContext';
import { VaultProgressProvider } from '@/src/contexts/VaultProgressContext';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

SplashScreen.preventAutoHideAsync();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0D0D0D',
    card: '#0D0D0D',
    text: '#F0F0F0',
    border: 'rgba(0,255,255,0.2)',
    primary: '#00FFFF',
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="light" />
      <SfxPreferenceProvider>
        <MissionAlertProvider>
          <PrivacyMaskingProvider>
            <VaultProgressProvider>
              <SessionSecurityProvider>
                {Platform.OS !== 'web' ? <MissionNotificationsBinder /> : null}
                <AuthGate>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(main)" />
                    <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true }} />
                  </Stack>
                </AuthGate>
              </SessionSecurityProvider>
            </VaultProgressProvider>
          </PrivacyMaskingProvider>
        </MissionAlertProvider>
      </SfxPreferenceProvider>
    </ThemeProvider>
  );
}
