import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation, useRouter } from 'expo-router';
import {
  onAuthStateChanged,
  sendEmailVerification,
  verifyBeforeUpdateEmail,
  type User,
} from 'firebase/auth';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getFirebaseAuth } from '@/src/firebase/firebaseApp';
import { mapAuthErrorMessage } from '@/src/firebase/mapAuthError';
import {
  computeProfileEmailVerified,
  isEmailManagedBySocialProvider,
  syncUserProfileMirrorFromAuth,
} from '@/src/firebase/userProfileMirror';
import { SV } from '@/src/theme/skelevigil';

const PROFILE_STORAGE_KEY = 'skelevigil.profile.v1';
const PROFILE_PENDING_EMAIL_KEY = 'skelevigil.profile.pendingEmail.v1';

function managedByLabel(user: User | null): string | null {
  if (!user) return null;
  if (isEmailManagedBySocialProvider(user)) {
    const ids = user.providerData.map((p) => p.providerId);
    if (ids.includes('apple.com')) return 'Managed by your Apple account.';
    if (ids.includes('google.com')) return 'Managed by your Google account.';
  }
  return null;
}

export default function MyProfileScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const [authUser, setAuthUser] = useState<User | null>(() => getFirebaseAuth().currentUser);
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [emailDraft, setEmailDraft] = useState('');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [verifyEmailBusy, setVerifyEmailBusy] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (u) => setAuthUser(u));
    return unsub;
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as { fullName?: string; email?: string };
          setFullName(saved.fullName ?? '');
        }
        const pending = await AsyncStorage.getItem(PROFILE_PENDING_EMAIL_KEY);
        if (pending && pending.length > 0) setPendingVerificationEmail(pending);
      } catch {
        // ignore
      }
    };
    void load();
  }, []);

  const socialEmailLocked = useMemo(() => isEmailManagedBySocialProvider(authUser), [authUser]);

  useEffect(() => {
    if (!pendingVerificationEmail || !authUser?.email) return;
    if (authUser.email.toLowerCase() === pendingVerificationEmail.toLowerCase()) {
      setPendingVerificationEmail(null);
      void AsyncStorage.removeItem(PROFILE_PENDING_EMAIL_KEY);
    }
  }, [authUser?.email, pendingVerificationEmail]);

  useFocusEffect(
    useCallback(() => {
      const u = getFirebaseAuth().currentUser;
      if (!u || u.isAnonymous) return;
      void u.reload().then(() => {
        setAuthUser(getFirebaseAuth().currentUser);
        void syncUserProfileMirrorFromAuth(u.uid);
      });
    }, []),
  );

  const onEditSavePress = useCallback(async () => {
    const user = getFirebaseAuth().currentUser;
    if (!user || user.isAnonymous) return;

    if (!isEditing) {
      setIsEditing(true);
      setEmailDraft(user.email ?? '');
      return;
    }

    const trimmedName = fullName.trim();
    const nextEmail = emailDraft.trim();

    try {
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ fullName: trimmedName }));
      setFullName(trimmedName);

      if (!socialEmailLocked && nextEmail.length > 0) {
        const current = user.email ?? '';
        if (nextEmail.toLowerCase() !== current.toLowerCase()) {
          await verifyBeforeUpdateEmail(user, nextEmail);
          setPendingVerificationEmail(nextEmail);
          await AsyncStorage.setItem(PROFILE_PENDING_EMAIL_KEY, nextEmail);
          Alert.alert(
            'Confirm your new email',
            `We sent a link to ${nextEmail}. Open it to finish the update. Your current sign-in email stays active until then.`,
          );
        }
      }

      setIsEditing(false);
    } catch (e) {
      Alert.alert('Could not save', mapAuthErrorMessage(e));
    }
  }, [isEditing, fullName, emailDraft, socialEmailLocked]);

  const onSendVerificationEmail = useCallback(async () => {
    const user = getFirebaseAuth().currentUser;
    if (!user || user.isAnonymous || isEmailManagedBySocialProvider(user)) return;
    if (user.emailVerified || !(user.email && user.email.length > 0)) return;
    setVerifyEmailBusy(true);
    try {
      await sendEmailVerification(user);
      Alert.alert(
        'Verification sent',
        `We emailed a link to ${user.email}. Open it to verify this address.`,
      );
    } catch (e) {
      Alert.alert('Could not send email', mapAuthErrorMessage(e));
    } finally {
      setVerifyEmailBusy(false);
    }
  }, []);

  useLayoutEffect(() => {
    const headerLeft = () => (
      <Pressable onPress={() => router.back()} hitSlop={10}>
        <Text style={styles.headerAction}>{'< Back'}</Text>
      </Pressable>
    );
    if (!authUser || authUser.isAnonymous) {
      navigation.setOptions({
        headerLeft,
        headerRight: () => null,
      });
      return;
    }
    navigation.setOptions({
      headerLeft,
      headerRight: () => (
        <Pressable onPress={() => void onEditSavePress()} hitSlop={10}>
          <Text style={styles.headerAction}>{isEditing ? 'Save' : 'Edit'}</Text>
        </Pressable>
      ),
    });
  }, [navigation, router, isEditing, onEditSavePress, authUser]);

  if (!authUser || authUser.isAnonymous) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.guestTitle}>Profile needs a Neural Link</Text>
          <Text style={styles.guestBody}>
            Sign in with Email, Google, or Apple from the System tab to manage your profile.
          </Text>
          <Pressable onPress={() => router.back()} style={styles.guestBack}>
            <Text style={styles.headerAction}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const displayEmail = authUser.email ?? '';
  const showVerified = computeProfileEmailVerified(authUser);
  const managedFooter = managedByLabel(authUser);
  const emailEditable = isEditing && !socialEmailLocked;
  const emailInputValue = socialEmailLocked ? displayEmail : isEditing ? emailDraft : displayEmail;
  const showSendVerificationEmail =
    !socialEmailLocked &&
    !authUser.emailVerified &&
    displayEmail.length > 0 &&
    !pendingVerificationEmail;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.group}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputReadOnly]}
            value={fullName}
            onChangeText={setFullName}
            placeholder="e.g. John Smith"
            placeholderTextColor={SV.muted}
            editable={isEditing}
          />
        </View>

        <View style={styles.group}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Email</Text>
            {showVerified ? (
              <View style={styles.verifiedBadge} accessibilityLabel="Verified email">
                <Ionicons name="checkmark-circle" size={17} color={SV.neonCyan} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            ) : null}
          </View>
          <TextInput
            style={[
              styles.input,
              (!isEditing || socialEmailLocked) && styles.inputReadOnly,
              socialEmailLocked && styles.inputLockedSocial,
            ]}
            value={emailInputValue}
            onChangeText={setEmailDraft}
            placeholder="e.g. john.smith@example.com"
            placeholderTextColor={SV.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={emailEditable}
          />
          {managedFooter ? (
            <Text style={styles.managedFooter}>{managedFooter}</Text>
          ) : !socialEmailLocked && pendingVerificationEmail ? (
            <Text style={styles.pendingText}>
              Pending verification: we emailed a confirmation link to {pendingVerificationEmail}.
            </Text>
          ) : !socialEmailLocked && !authUser.emailVerified && displayEmail.length > 0 ? (
            <Text style={styles.hintText}>
              Check your inbox to verify this email address and secure your account.
            </Text>
          ) : null}
          {showSendVerificationEmail ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send verification email"
              disabled={verifyEmailBusy}
              onPress={() => void onSendVerificationEmail()}
              style={({ pressed }) => [
                styles.verifyEmailBtn,
                pressed && !verifyEmailBusy && styles.verifyEmailBtnPressed,
                verifyEmailBusy && styles.verifyEmailBtnDisabled,
              ]}>
              {verifyEmailBusy ? (
                <ActivityIndicator color={SV.neonCyan} />
              ) : (
                <Text style={styles.verifyEmailBtnText}>Send verification email</Text>
              )}
            </Pressable>
          ) : null}
        </View>
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
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 12,
  },
  guestTitle: {
    color: SV.neonCyan,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  guestBody: {
    color: 'rgba(240,240,240,0.85)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  guestBack: {
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerAction: {
    color: SV.neonCyan,
    fontSize: 16,
    fontWeight: '600',
  },
  group: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  label: {
    color: SV.surgicalWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  verifiedText: {
    color: SV.neonCyan,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  input: {
    color: SV.surgicalWhite,
    backgroundColor: SV.gunmetal,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputReadOnly: {
    opacity: 0.92,
  },
  inputLockedSocial: {
    opacity: 0.65,
    borderColor: 'rgba(0,255,255,0.14)',
    backgroundColor: 'rgba(30,36,40,0.95)',
  },
  managedFooter: {
    marginTop: 8,
    color: SV.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  pendingText: {
    marginTop: 8,
    color: 'rgba(255, 214, 140, 0.95)',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  hintText: {
    marginTop: 8,
    color: SV.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  verifyEmailBtn: {
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.45)',
    backgroundColor: 'rgba(0,255,255,0.08)',
    minHeight: 48,
  },
  verifyEmailBtnPressed: {
    opacity: 0.88,
  },
  verifyEmailBtnDisabled: {
    opacity: 0.65,
  },
  verifyEmailBtnText: {
    color: SV.neonCyan,
    fontSize: 16,
    fontWeight: '700',
  },
});
