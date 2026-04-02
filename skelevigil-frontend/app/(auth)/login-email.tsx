import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthFooter } from '@/src/components/auth/AuthFooter';
import { SvButton } from '@/src/components/auth/SvButton';
import { SvTextField } from '@/src/components/auth/SvTextField';
import { getFirebaseAuth } from '@/src/firebase/firebaseApp';
import { mapAuthErrorMessage } from '@/src/firebase/mapAuthError';
import { SV } from '@/src/theme/skelevigil';

const SAVE_EMAIL_PREF_KEY = 'skelevigil.auth.saveEmail.v1';
const SAVED_EMAIL_KEY = 'skelevigil.auth.savedEmail.v1';

export default function LoginEmailScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saveEmail, setSaveEmail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const raw = await AsyncStorage.getItem(SAVE_EMAIL_PREF_KEY);
        const wantsSave = raw === 'true';
        setSaveEmail(wantsSave);
        if (wantsSave) {
          const saved = await AsyncStorage.getItem(SAVED_EMAIL_KEY);
          if (saved) setEmail(saved);
        }
      } catch {
        // Keep defaults when storage is unavailable.
      }
    };
    loadPrefs();
  }, []);

  const onToggleSaveEmail = async () => {
    const nextValue = !saveEmail;
    setSaveEmail(nextValue);
    try {
      await AsyncStorage.setItem(SAVE_EMAIL_PREF_KEY, String(nextValue));
    } catch {
      // Keep UI responsive even if write fails.
    }
  };

  const onLogIn = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Please enter email and password.');
      return;
    }
    setErrorMessage(null);
    setBusy(true);
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), trimmedEmail, password);
      if (saveEmail) {
        await AsyncStorage.setItem(SAVED_EMAIL_KEY, trimmedEmail);
      } else {
        await AsyncStorage.removeItem(SAVED_EMAIL_KEY);
      }
      router.replace('/(main)/phases');
    } catch (e) {
      setErrorMessage(mapAuthErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Log in with Email</Text>
        <Text style={styles.hint}>Sign in with your SkeleVigil account.</Text>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <SvTextField
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
        />
        <SvTextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry
        />
        <Pressable
          style={styles.checkRow}
          onPress={onToggleSaveEmail}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: saveEmail }}>
          <View style={[styles.box, saveEmail && styles.boxOn]}>
            {saveEmail ? <Text style={styles.tick}>✓</Text> : null}
          </View>
          <Text style={styles.checkLabel}>Save email</Text>
        </Pressable>
        <SvButton
          title={busy ? 'Signing in…' : 'Log in'}
          onPress={() => void onLogIn()}
          style={styles.cta}
          disabled={busy}
        />
        <Pressable style={styles.signUpWrap} onPress={() => router.push('/(auth)/create-account')}>
          <Text style={styles.signUp}>New here? Sign up</Text>
        </Pressable>
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
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  back: {
    color: SV.neonCyan,
    fontSize: 16,
  },
  scroll: {
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  title: {
    fontFamily: 'SpaceMono',
    fontSize: 20,
    color: SV.surgicalWhite,
    marginBottom: 8,
    letterSpacing: 1,
  },
  hint: {
    color: 'rgba(240,240,240,0.72)',
    fontSize: 12,
    marginBottom: 12,
  },
  error: {
    color: '#FF6B6B',
    fontSize: 14,
    marginBottom: 16,
    fontWeight: '600',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
    gap: 10,
  },
  box: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: SV.neonCyan,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SV.gunmetal,
  },
  boxOn: {
    backgroundColor: 'rgba(0,255,255,0.15)',
  },
  tick: {
    color: SV.neonCyan,
    fontSize: 14,
    fontWeight: '700',
  },
  checkLabel: {
    color: SV.neonCyan,
    fontSize: 15,
  },
  cta: {
    marginBottom: 20,
  },
  signUpWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  signUp: {
    color: SV.neonCyan,
    fontSize: 15,
    textDecorationLine: 'underline',
  },
});
