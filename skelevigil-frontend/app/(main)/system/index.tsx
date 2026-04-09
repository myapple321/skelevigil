import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FirebaseError } from 'firebase/app';
import { router } from 'expo-router';
import { deleteUser, signOut, type User } from 'firebase/auth';
import type { ComponentProps } from 'react';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSfxPreference } from '@/src/contexts/SfxPreferenceContext';
import { useVaultProgress } from '@/src/contexts/VaultProgressContext';
import { getFirebaseAuth } from '@/src/firebase/firebaseApp';
import { mapAuthErrorMessage } from '@/src/firebase/mapAuthError';
import { SV } from '@/src/theme/skelevigil';

const DELETE_NEEDS_RECENT_SIGN_IN_MSG =
  'For your security, we need a fresh sign-in before your account can be deleted. Sign out, sign back in with the same method you usually use, then return here and tap Delete Account again.';

function signInMethodLabel(providerId: string): string | null {
  switch (providerId) {
    case 'password':
      return 'Email';
    case 'google.com':
      return 'Google';
    case 'apple.com':
      return 'Apple';
    default:
      return null;
  }
}

/** Email + linked providers shown in the delete-account warning. */
function deleteModalAccountSummary(user: User): { emailDisplay: string; methodsLabel: string } {
  const fromProviders = user.providerData
    .map((p) => p.email)
    .find((e) => typeof e === 'string' && e.length > 0);
  const emailDisplay =
    (user.email && user.email.length > 0 ? user.email : fromProviders) ??
    'No email address on file for this account';

  const labels = user.providerData
    .map((p) => signInMethodLabel(p.providerId))
    .filter((x): x is string => x != null);
  const unique = [...new Set(labels)];
  const methodsLabel =
    unique.length > 0 ? unique.join(', ') : 'the sign-in method you used';

  return { emailDisplay, methodsLabel };
}

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function SoundEffectsRow() {
  const { sfxEnabled, setSfxEnabled, hydrated } = useSfxPreference();
  return (
    <View style={styles.toggleRow}>
      <View style={styles.rowMain}>
        <Ionicons name="volume-high-outline" size={22} color={SV.neonCyan} style={styles.rowIcon} />
        <View style={styles.toggleTextBlock}>
          <Text style={styles.toggleTitle}>Sound effects</Text>
          <Text style={styles.toggleSub}>Short sound when a tile is revealed.</Text>
        </View>
      </View>
      <Switch
        value={sfxEnabled}
        disabled={!hydrated}
        onValueChange={(v) => void setSfxEnabled(v)}
        trackColor={{ false: 'rgba(255,255,255,0.12)', true: 'rgba(0,255,255,0.35)' }}
        thumbColor={sfxEnabled ? SV.surgicalWhite : 'rgba(200,200,200,0.95)'}
        ios_backgroundColor="rgba(255,255,255,0.12)"
      />
    </View>
  );
}

function Row({
  title,
  onPress,
  iconName,
}: {
  title: string;
  onPress: () => void;
  iconName: IoniconName;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.rowMain}>
        <Ionicons name={iconName} size={22} color={SV.neonCyan} style={styles.rowIcon} />
        <Text style={styles.rowTitle}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={SV.muted} />
    </Pressable>
  );
}

export default function SystemIndexScreen() {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteNeedsRecentSignIn, setDeleteNeedsRecentSignIn] = useState(false);
  const { debugBuyThreeVaultCredits } = useVaultProgress();

  const closeDeleteModal = () => {
    if (deleteBusy) return;
    setDeleteOpen(false);
    setDeleteError(null);
    setDeleteNeedsRecentSignIn(false);
  };

  const deleteModalSummary = useMemo(() => {
    if (!deleteOpen) return null;
    const user = getFirebaseAuth().currentUser;
    return user ? deleteModalAccountSummary(user) : null;
  }, [deleteOpen]);

  const onConfirmDeleteAccount = async () => {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    if (!user) {
      setDeleteError('You are not signed in.');
      return;
    }
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteUser(user);
      setDeleteOpen(false);
      router.replace('/(auth)');
    } catch (e) {
      if (e instanceof FirebaseError && e.code === 'auth/requires-recent-login') {
        setDeleteNeedsRecentSignIn(true);
        setDeleteError(DELETE_NEEDS_RECENT_SIGN_IN_MSG);
      } else {
        setDeleteNeedsRecentSignIn(false);
        setDeleteError(mapAuthErrorMessage(e));
      }
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Modal
        visible={deleteOpen}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeDeleteModal}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete your account?</Text>
            {deleteModalSummary ? (
              <View style={styles.modalAccountBox}>
                <View style={styles.modalAccountRow}>
                  <Text style={styles.modalAccountLabel}>Account email </Text>
                  <Text style={styles.modalAccountValue}>{deleteModalSummary.emailDisplay}</Text>
                </View>
                <View style={styles.modalAccountRow}>
                  <Text style={styles.modalAccountLabel}>Sign-in </Text>
                  <Text style={styles.modalAccountValue}>{deleteModalSummary.methodsLabel}</Text>
                </View>
              </View>
            ) : null}
            <Text style={styles.modalBody}>
              This permanently removes this SkeleVigil sign-in account and cannot be undone. If you
              use this app on other devices, you will be signed out everywhere.
            </Text>
            {deleteError ? (
              <Text style={deleteNeedsRecentSignIn ? styles.modalHint : styles.modalErr}>
                {deleteError}
              </Text>
            ) : null}
            {deleteNeedsRecentSignIn ? (
              <Pressable
                onPress={() => {
                  void signOut(getFirebaseAuth())
                    .then(() => {
                      setDeleteOpen(false);
                      setDeleteError(null);
                      setDeleteNeedsRecentSignIn(false);
                      router.replace('/(auth)');
                    })
                    .catch(() => {
                      setDeleteNeedsRecentSignIn(false);
                      setDeleteError(
                        'Could not sign out from here. Close this dialog, use Logout on the System screen, sign in again, then try Delete Account.',
                      );
                    });
                }}
                disabled={deleteBusy}
                style={({ pressed }) => [
                  styles.signOutToContinueBtn,
                  pressed && !deleteBusy && styles.signOutToContinueBtnPressed,
                ]}>
                <Text style={styles.signOutToContinueText}>Sign out now</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => void onConfirmDeleteAccount()}
              disabled={deleteBusy}
              style={({ pressed }) => [
                styles.deleteAccountBtn,
                pressed && !deleteBusy && styles.deleteAccountBtnPressed,
                deleteBusy && styles.deleteAccountBtnDisabled,
              ]}>
              <Text style={styles.deleteAccountBtnText}>
                {deleteBusy ? 'Deleting…' : 'Delete Account'}
              </Text>
            </Pressable>
            <Pressable onPress={closeDeleteModal} disabled={deleteBusy} style={styles.modalCancelWrap}>
              <Text style={[styles.modalCancel, deleteBusy && styles.modalCancelDisabled]}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>My Account</Text>
        <View style={styles.card}>
          <Row
            title="My Profile"
            iconName="person-circle-outline"
            onPress={() => router.push('/(main)/system/profile')}
          />
        </View>

        <Text style={styles.sectionTitle}>Sign In & Security</Text>
        <View style={styles.card}>
          <Row
            title="Change Password"
            iconName="key-outline"
            onPress={() => router.push('/(main)/system/change-password')}
          />
          <View style={styles.divider} />
          <Row
            title="Delete Account"
            iconName="trash-outline"
            onPress={() => {
              setDeleteError(null);
              setDeleteNeedsRecentSignIn(false);
              setDeleteOpen(true);
            }}
          />
        </View>

        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.card}>
          <SoundEffectsRow />
        </View>

        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.card}>
          <Row
            title="Help & Questions"
            iconName="help-circle-outline"
            onPress={() => router.push('/(main)/system/help')}
          />
          <View style={styles.divider} />
          <Row
            title="About SkeleVigil"
            iconName="information-circle-outline"
            onPress={() => router.push('/(main)/system/about')}
          />
        </View>

        <View style={styles.logoutWrap}>
          <Pressable
            onPress={() => {
              void signOut(getFirebaseAuth()).then(() => router.replace('/(auth)'));
            }}
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutPressed]}>
            <FontAwesome6 name="right-from-bracket" size={18} color={SV.mediumOrange} />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>

        <View style={styles.debugWrap}>
          <Text style={styles.debugTitle}>DEBUG</Text>
          <Pressable
            onPress={debugBuyThreeVaultCredits}
            style={({ pressed }) => [styles.debugBuyBtn, pressed && styles.debugBuyPressed]}>
            <Text style={styles.debugBuyText}>Buy 3 Vault Credits - $0.99</Text>
          </Pressable>
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
    paddingTop: 18,
    paddingBottom: 34,
  },
  sectionTitle: {
    color: SV.neonCyan,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 10,
  },
  card: {
    backgroundColor: SV.gunmetal,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.18)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  rowIcon: {
    marginTop: 1,
  },
  rowPressed: {
    backgroundColor: 'rgba(0,255,255,0.06)',
  },
  rowTitle: {
    flex: 1,
    color: SV.surgicalWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  toggleRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  toggleTitle: {
    color: SV.surgicalWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  toggleSub: {
    color: SV.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,255,255,0.12)',
    marginLeft: 16 + 22 + 12,
  },
  logoutWrap: {
    marginTop: 26,
    alignItems: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,138,0,0.7)',
    backgroundColor: 'rgba(255,138,0,0.06)',
    minWidth: 200,
  },
  logoutPressed: {
    opacity: 0.85,
  },
  logoutText: {
    color: SV.mediumOrange,
    fontSize: 16,
    fontWeight: '700',
  },
  debugWrap: {
    marginTop: 18,
    alignItems: 'center',
    gap: 10,
  },
  debugTitle: {
    color: SV.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  debugBuyBtn: {
    minWidth: 260,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.55)',
    backgroundColor: 'rgba(0,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugBuyPressed: {
    opacity: 0.85,
  },
  debugBuyText: {
    color: SV.neonCyan,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
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
  modalAccountBox: {
    marginBottom: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(0,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.2)',
    gap: 8,
  },
  modalAccountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 4,
  },
  modalAccountLabel: {
    color: SV.neonCyan,
    fontSize: 14,
    fontWeight: '700',
  },
  modalAccountValue: {
    color: SV.surgicalWhite,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    flexShrink: 1,
  },
  modalBody: {
    color: 'rgba(240,240,240,0.88)',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  modalErr: {
    color: '#FF8A8A',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalHint: {
    color: 'rgba(255, 236, 200, 0.95)',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 14,
  },
  signOutToContinueBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: 'rgba(0,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.45)',
  },
  signOutToContinueBtnPressed: {
    opacity: 0.88,
  },
  signOutToContinueText: {
    color: SV.neonCyan,
    fontSize: 16,
    fontWeight: '700',
  },
  deleteAccountBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,138,0,0.7)',
    backgroundColor: 'rgba(255,138,0,0.06)',
  },
  deleteAccountBtnPressed: {
    opacity: 0.85,
  },
  deleteAccountBtnDisabled: {
    opacity: 0.5,
  },
  deleteAccountBtnText: {
    color: SV.mediumOrange,
    fontSize: 16,
    fontWeight: '700',
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

