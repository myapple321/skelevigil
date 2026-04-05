import { router } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthFooter } from '@/src/components/auth/AuthFooter';
import { SvButton } from '@/src/components/auth/SvButton';
import { SvTextField } from '@/src/components/auth/SvTextField';
import { getFirebaseAuth } from '@/src/firebase/firebaseApp';
import { mapAuthErrorMessage } from '@/src/firebase/mapAuthError';
import { splitErrorParagraphs } from '@/src/firebase/splitErrorParagraphs';
import { SV } from '@/src/theme/skelevigil';

export default function CreateAccountScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onCreate = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Please enter email and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    setErrorMessage(null);
    setBusy(true);
    try {
      await createUserWithEmailAndPassword(getFirebaseAuth(), trimmedEmail, password);
      router.replace('/(main)/phases');
    } catch (e) {
      setErrorMessage(mapAuthErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const errorParts = errorMessage ? splitErrorParagraphs(errorMessage) : null;
  const longSingleBlock =
    errorParts !== null && !errorParts.detail && errorParts.primary.length > 120;

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
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.hint}>Use at least 6 characters for your password.</Text>
        {errorParts ? (
          <View style={styles.errorBanner} accessibilityRole="alert">
            <Text
              style={longSingleBlock ? styles.errorDetail : styles.errorPrimary}
              maxFontSizeMultiplier={1.35}>
              {errorParts.primary}
            </Text>
            {errorParts.detail ? (
              <Text style={styles.errorDetail} maxFontSizeMultiplier={1.35}>
                {errorParts.detail}
              </Text>
            ) : null}
          </View>
        ) : null}
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
          placeholder="Choose a password"
          secureTextEntry
        />
        <SvButton
          title={busy ? 'Creating account…' : 'Create Account'}
          onPress={() => void onCreate()}
          style={styles.cta}
          disabled={busy}
        />
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
  errorBanner: {
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 214, 120, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 210, 100, 0.42)',
  },
  errorPrimary: {
    color: '#FFF4D6',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'left',
  },
  errorDetail: {
    marginTop: 10,
    color: 'rgba(248, 248, 248, 0.94)',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    textAlign: 'left',
  },
  cta: {
    marginTop: 8,
    marginBottom: 28,
  },
});
