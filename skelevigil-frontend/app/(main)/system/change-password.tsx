import { router } from 'expo-router';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  type User,
} from 'firebase/auth';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SvButton } from '@/src/components/auth/SvButton';
import { SvTextField } from '@/src/components/auth/SvTextField';
import { getFirebaseAuth } from '@/src/firebase/firebaseApp';
import { mapAuthErrorMessage } from '@/src/firebase/mapAuthError';
import { SV } from '@/src/theme/skelevigil';

function userHasPasswordProvider(user: User): boolean {
  return user.providerData.some((p) => p.providerId === 'password');
}

function accountEmail(user: User): string | null {
  if (user.email) return user.email;
  const pw = user.providerData.find((p) => p.providerId === 'password');
  return pw?.email ?? null;
}

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const auth = getFirebaseAuth();
  const user = auth.currentUser;

  const canChangePassword = useMemo(() => user != null && userHasPasswordProvider(user), [user]);

  const emailDisplay = useMemo(() => (user ? accountEmail(user) : null), [user]);

  const onSubmit = async () => {
    if (!user || !canChangePassword) return;
    const email = accountEmail(user);
    if (!email) {
      setErrorMessage('No email is available for this account.');
      return;
    }
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage('Please fill in all fields.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMessage('New password must be different from your current password.');
      return;
    }

    setErrorMessage(null);
    setBusy(true);
    try {
      const cred = EmailAuthProvider.credential(email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);
      router.back();
    } catch (e) {
      setErrorMessage(mapAuthErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.info}>You are not signed in.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!canChangePassword) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.info}>
            Your account does not use an email and password for SkeleVigil. You signed in with
            Google, Apple, or another provider, so there is no password to change here. Use Log in
            with Email only if this account has email and password enabled.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.hint}>
          {emailDisplay
            ? `Use the password for ${emailDisplay}. New password must be at least 6 characters.`
            : 'Enter your current password, then choose a new one (at least 6 characters).'}
        </Text>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <SvTextField
          label="Current password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Current password"
          secureTextEntry
        />
        <SvTextField
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="At least 6 characters"
          secureTextEntry
        />
        <SvTextField
          label="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Repeat new password"
          secureTextEntry
        />
        <SvButton
          title={busy ? 'Updating…' : 'Update password'}
          onPress={() => void onSubmit()}
          disabled={busy}
          style={styles.cta}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: SV.abyss,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scroll: {
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 32,
  },
  hint: {
    color: 'rgba(240,240,240,0.72)',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  info: {
    color: 'rgba(240,240,240,0.88)',
    fontSize: 15,
    lineHeight: 22,
  },
  error: {
    color: '#FF6B6B',
    fontSize: 14,
    marginBottom: 16,
    fontWeight: '600',
  },
  cta: {
    marginTop: 12,
  },
});
