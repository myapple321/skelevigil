import Ionicons from '@expo/vector-icons/Ionicons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import { FirebaseError } from 'firebase/app';
import {
  GoogleAuthProvider,
  linkWithCredential,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  type AuthCredential,
} from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthFooter } from '@/src/components/auth/AuthFooter';
import { GoogleMarkIcon } from '@/src/components/auth/GoogleMarkIcon';
import { SvButton } from '@/src/components/auth/SvButton';
import { SvTextField } from '@/src/components/auth/SvTextField';
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

  const [googleLinkOpen, setGoogleLinkOpen] = useState(false);
  const [googleLinkEmail, setGoogleLinkEmail] = useState('');
  const [googleLinkPassword, setGoogleLinkPassword] = useState('');
  const [googleLinkError, setGoogleLinkError] = useState<string | null>(null);
  const [googleLinkBusy, setGoogleLinkBusy] = useState(false);
  const pendingGoogleLinkCredRef = useRef<AuthCredential | null>(null);

  const [guestAlertOpen, setGuestAlertOpen] = useState(false);
  const [guestBusy, setGuestBusy] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);

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
          if (
            e instanceof FirebaseError &&
            e.code === 'auth/account-exists-with-different-credential'
          ) {
            const pending = GoogleAuthProvider.credentialFromError(e);
            const email = e.customData?.email as string | undefined;
            if (pending && email) {
              pendingGoogleLinkCredRef.current = pending;
              setGoogleLinkEmail(email);
              setGoogleLinkPassword('');
              setGoogleLinkError(null);
              setGoogleLinkOpen(true);
              setGoogleError(null);
            } else {
              setGoogleError(mapAuthErrorMessage(e));
            }
          } else {
            setGoogleError(mapAuthErrorMessage(e));
          }
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
    if (appleBusy) return;

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
    if (Platform.OS !== 'ios' || !appleAvailable || googleBusy) {
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

  const closeGoogleLinkModal = () => {
    pendingGoogleLinkCredRef.current = null;
    setGoogleLinkOpen(false);
    setGoogleLinkPassword('');
    setGoogleLinkError(null);
  };

  const closeGuestAlert = () => {
    if (guestBusy) return;
    setGuestAlertOpen(false);
    setGuestError(null);
  };

  const onGuestUnderstand = async () => {
    setGuestError(null);
    setGuestBusy(true);
    try {
      await signInAnonymously(getFirebaseAuth());
      setGuestAlertOpen(false);
      router.replace('/(main)/phases');
    } catch (e) {
      setGuestError(mapAuthErrorMessage(e));
    } finally {
      setGuestBusy(false);
    }
  };

  const onConfirmGoogleLink = async () => {
    const pwd = googleLinkPassword;
    if (!pwd) {
      setGoogleLinkError('Enter your SkeleVigil password to link Google sign-in.');
      return;
    }
    const pending = pendingGoogleLinkCredRef.current;
    if (!pending) {
      setGoogleLinkError('Sign-in expired. Try Log in with Google again.');
      return;
    }

    setGoogleLinkError(null);
    setGoogleLinkBusy(true);
    try {
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, googleLinkEmail.trim(), pwd);
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user after sign-in.');
      }
      await linkWithCredential(user, pending);
      pendingGoogleLinkCredRef.current = null;
      setGoogleLinkOpen(false);
      setGoogleLinkPassword('');
      router.replace('/(main)/phases');
    } catch (err) {
      setGoogleLinkError(mapAuthErrorMessage(err));
    } finally {
      setGoogleLinkBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Modal
        visible={guestAlertOpen}
        transparent
        animationType="fade"
        onRequestClose={closeGuestAlert}>
        <Pressable style={styles.modalBackdrop} onPress={closeGuestAlert}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Welcome!</Text>
            <Text style={styles.modalBody}>
              You can play now without an account. Please note: Your progress is saved only on this
              device. If you delete the app, your Vault Credits cannot be recovered.

              {'\n\n'}Guests can’t purchase Vault Credits. Log in with Email, Apple, or Google to
              purchase.
            </Text>
            {guestError ? <Text style={styles.modalErr}>{guestError}</Text> : null}
            <SvButton
              title={guestBusy ? 'Signing in…' : 'I Understand'}
              onPress={() => void onGuestUnderstand()}
              disabled={guestBusy}
              style={styles.modalPrimary}
            />
            <Pressable onPress={closeGuestAlert} style={styles.modalCancelWrap} disabled={guestBusy}>
              <Text style={[styles.modalCancel, guestBusy && styles.modalCancelDisabled]}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      <Modal
        visible={googleLinkOpen}
        transparent
        animationType="fade"
        onRequestClose={closeGoogleLinkModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeGoogleLinkModal}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Link Google to your account</Text>
            <Text style={styles.modalBody}>
              An account already exists for {googleLinkEmail || 'this email'} with email and password.
              Enter that password once to link Google sign-in to the same account.
            </Text>
            <SvTextField
              label="Password"
              value={googleLinkPassword}
              onChangeText={setGoogleLinkPassword}
              placeholder="Your SkeleVigil password"
              secureTextEntry
            />
            {googleLinkError ? <Text style={styles.modalErr}>{googleLinkError}</Text> : null}
            <SvButton
              title={googleLinkBusy ? 'Linking…' : 'Link and continue'}
              onPress={() => void onConfirmGoogleLink()}
              disabled={googleLinkBusy}
              style={styles.modalPrimary}
            />
            <Pressable onPress={closeGoogleLinkModal} style={styles.modalCancelWrap}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>SkeleVigil</Text>
        <Text style={styles.subtitle}>THE ART OF THE IMMUTABLE</Text>
        <NeuralString />
        <View style={styles.actions}>
          <SvButton
            title="Log in with Email"
            onPress={() => router.push('/(auth)/login-email')}
            icon={<Ionicons name="mail" size={22} color={SV.black} />}
          />
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
                disabled={googleBusy || !request}
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
          <Pressable
            onPress={() => {
              setGuestError(null);
              setGuestAlertOpen(true);
            }}
            style={({ pressed }) => [
              styles.guestButton,
              pressed && styles.guestButtonPressed,
            ]}>
            <Text style={styles.guestButtonText}>Log in as Guest</Text>
          </Pressable>
        </View>
        <AuthFooter onHelpPress={() => router.push('/(auth)/login-help')} />
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
  guestButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: SV.neonCyan,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestButtonPressed: {
    opacity: 0.85,
  },
  guestButtonText: {
    color: SV.neonCyan,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  oauthError: {
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: SV.gunmetal,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.35)',
    padding: 20,
  },
  modalTitle: {
    color: SV.surgicalWhite,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  modalBody: {
    color: 'rgba(240,240,240,0.85)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  modalErr: {
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  modalPrimary: {
    marginTop: 8,
  },
  modalCancelWrap: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 8,
  },
  modalCancel: {
    color: SV.neonCyan,
    fontSize: 15,
    fontWeight: '600',
  },
  modalCancelDisabled: {
    opacity: 0.45,
  },
});
