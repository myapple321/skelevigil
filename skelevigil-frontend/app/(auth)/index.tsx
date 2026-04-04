import Ionicons from '@expo/vector-icons/Ionicons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthFooter } from '@/src/components/auth/AuthFooter';
import { GoogleMarkIcon } from '@/src/components/auth/GoogleMarkIcon';
import { SvButton } from '@/src/components/auth/SvButton';
import { NeuralString } from '@/src/components/NeuralString';
import { isAppleAuthUserCanceled, signInWithAppleForFirebase } from '@/src/firebase/appleAuth';
import { getFirebaseAuth } from '@/src/firebase/firebaseApp';
import { mapAuthErrorMessage } from '@/src/firebase/mapAuthError';
import { SV } from '@/src/theme/skelevigil';
import {
  GOOGLE_OAUTH_CLIENT_IDS,
  googleIosRedirectNativeUri,
} from '@/src/firebase/googleOAuthClientIds';

/** Stable object for expo-auth-session; must match Info.plist URL scheme for this iOS client. */
const GOOGLE_IOS_REDIRECT_URI_OPTIONS =
  Platform.OS === 'ios' && GOOGLE_OAUTH_CLIENT_IDS.iosClientId
    ? {
        native: googleIosRedirectNativeUri(GOOGLE_OAUTH_CLIENT_IDS.iosClientId),
      }
    : {};

export default function LoginLandingScreen() {
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [appleBusy, setAppleBusy] = useState(false);
  const [appleError, setAppleError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const webId = GOOGLE_OAUTH_CLIENT_IDS.webClientId;
  const iosId = GOOGLE_OAUTH_CLIENT_IDS.iosClientId;

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    {
      clientId: webId,
      webClientId: webId,
      ...(iosId ? { iosClientId: iosId } : {}),
      ...(GOOGLE_OAUTH_CLIENT_IDS.androidClientId
        ? { androidClientId: GOOGLE_OAUTH_CLIENT_IDS.androidClientId }
        : {}),
      scopes: ['profile', 'email'],
    },
    GOOGLE_IOS_REDIRECT_URI_OPTIONS,
  );

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }
    void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  useEffect(() => {
    const handleResponse = async () => {
      if (!response) return;

      if (response.type === 'success') {
        const idToken = (response.params as any)?.id_token as string | undefined;
        if (!idToken) {
          setGoogleError('Google did not return an id token. Please try again.');
          setGoogleBusy(false);
          return;
        }

        try {
          const credential = GoogleAuthProvider.credential(idToken);
          await signInWithCredential(getFirebaseAuth(), credential);
          router.replace('/(main)/phases');
        } catch (e) {
          setGoogleError(mapAuthErrorMessage(e));
        } finally {
          setGoogleBusy(false);
        }
      } else if (response.type === 'error') {
        setGoogleError('Google sign-in failed. Please try again.');
        setGoogleBusy(false);
      } else if (response.type === 'dismiss') {
        setGoogleError(null);
        setGoogleBusy(false);
      }
    };

    void handleResponse();
  }, [response]);

  const onGooglePress = async () => {
    setGoogleError(null);

    if (!GOOGLE_OAUTH_CLIENT_IDS.webClientId) {
      setGoogleError('Missing Google web client ID. Update src/firebase/googleOAuthClientIds.ts.');
      return;
    }
    if (!promptAsync) return;

    setGoogleBusy(true);
    try {
      const res = await promptAsync();
      // Clear busy when the sheet closes without a token; Firebase completion clears it on success.
      if (res.type !== 'success') {
        setGoogleBusy(false);
      }
    } catch {
      setGoogleError('Google sign-in failed. Please try again.');
      setGoogleBusy(false);
    }
  };

  const onApplePress = async () => {
    setAppleError(null);
    if (Platform.OS !== 'ios' || !appleAvailable) {
      return;
    }

    setAppleBusy(true);
    try {
      await signInWithAppleForFirebase(getFirebaseAuth());
      router.replace('/(main)/phases');
    } catch (e) {
      if (isAppleAuthUserCanceled(e)) {
        setAppleError(null);
      } else {
        setAppleError(mapAuthErrorMessage(e));
      }
    } finally {
      setAppleBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>SkeleVigil</Text>
        <Text style={styles.subtitle}>THE ART OF THE IMMUTABLE</Text>
        <NeuralString />
        <View style={styles.actions}>
          <SvButton title="Log in with Email" onPress={() => router.push('/(auth)/login-email')} />
          {Platform.OS === 'ios' ? (
            <>
              <SvButton
                variant="secondary"
                title="Log in with Apple"
                onPress={() => void onApplePress()}
                icon={<Ionicons name="logo-apple" size={22} color="#FFFFFF" />}
                disabled={appleBusy || !appleAvailable}
              />
              {appleError ? <Text style={styles.oauthError}>{appleError}</Text> : null}
              <SvButton
                variant="secondary"
                title="Log in with Google"
                onPress={() => void onGooglePress()}
                icon={<GoogleMarkIcon size={22} />}
                disabled={googleBusy || !request || appleBusy}
              />
              {googleError ? <Text style={styles.oauthError}>{googleError}</Text> : null}
            </>
          ) : (
            <>
              <SvButton
                variant="secondary"
                title="Log in with Google"
                onPress={() => void onGooglePress()}
                icon={<GoogleMarkIcon size={22} />}
                disabled={googleBusy || !request}
              />
              {googleError ? <Text style={styles.oauthError}>{googleError}</Text> : null}
            </>
          )}
        </View>
        <AuthFooter onHelpPress={() => {}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: SV.abyss,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontFamily: 'SpaceMono',
    fontSize: 28,
    color: SV.surgicalWhite,
    textAlign: 'center',
    letterSpacing: 4,
  },
  subtitle: {
    marginTop: 10,
    marginBottom: 24,
    fontSize: 11,
    color: SV.neonCyan,
    textAlign: 'center',
    letterSpacing: 2,
    fontWeight: '600',
  },
  actions: {
    gap: 14,
    marginBottom: 32,
  },
  oauthError: {
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 2,
  },
});
