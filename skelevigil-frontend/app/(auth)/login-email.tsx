import { router } from 'expo-router';
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
import { SV } from '@/src/theme/skelevigil';

const SAVE_EMAIL_PREF_KEY = 'skelevigil.auth.saveEmail.v1';

export default function LoginEmailScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saveEmail, setSaveEmail] = useState(false);

  useEffect(() => {
    const loadSaveEmailPreference = async () => {
      try {
        const raw = await AsyncStorage.getItem(SAVE_EMAIL_PREF_KEY);
        if (raw === null) return;
        setSaveEmail(raw === 'true');
      } catch {
        // Keep default when storage is unavailable.
      }
    };
    loadSaveEmailPreference();
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

  const onLogIn = () => {
    // Task 1b: wire Firebase Auth
    router.replace('/(main)/phases');
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
        <Text style={styles.hint}>Placeholder — Firebase Auth in task 1b</Text>
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
        <SvButton title="Log in" onPress={onLogIn} style={styles.cta} />
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
    marginBottom: 20,
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
