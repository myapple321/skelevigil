import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FirebaseError } from 'firebase/app';
import { router } from 'expo-router';
import { deleteUser, onAuthStateChanged, signOut, type User } from 'firebase/auth';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMissionAlert } from '@/src/contexts/MissionAlertContext';
import { useSessionSecurity } from '@/src/contexts/SessionSecurityContext';
import { useSfxPreference } from '@/src/contexts/SfxPreferenceContext';
import { PurchaseAllocationModal } from '@/src/components/vault/PurchaseAllocationModal';
import { useVaultProgress } from '@/src/contexts/VaultProgressContext';
import {
  debugScheduleMonthlyGiftInSeconds,
  debugScheduleReengagementInSeconds,
} from '@/src/notifications/missionNotificationsController';
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

function MissionAlertsRow() {
  const { missionAlertsEnabled, setMissionAlertsEnabled, hydrated } = useMissionAlert();
  return (
    <View style={styles.toggleRow}>
      <View style={styles.rowMain}>
        <Ionicons name="notifications-outline" size={24} color={SV.neonCyan} style={styles.rowIcon} />
        <View style={styles.toggleTextBlock}>
          <Text style={styles.missionToggleTitle}>Mission Alerts</Text>
          <Text style={styles.missionToggleSub}>
            Enable to receive mission briefings, recovery reminders, and monthly free mission rewards.
            {' Default is off.'}
          </Text>
        </View>
      </View>
      <View style={styles.missionSwitchWrap} accessibilityRole="none">
        <Switch
          accessibilityLabel="Mission Alerts"
          value={missionAlertsEnabled}
          disabled={!hydrated}
          onValueChange={(v) => void setMissionAlertsEnabled(v)}
          trackColor={{ false: 'rgba(255,255,255,0.12)', true: 'rgba(0,255,255,0.35)' }}
          thumbColor={missionAlertsEnabled ? SV.surgicalWhite : 'rgba(200,200,200,0.95)'}
          ios_backgroundColor="rgba(255,255,255,0.12)"
          style={styles.missionSwitch}
        />
      </View>
    </View>
  );
}

function SoundEffectsRow() {
  const { sfxEnabled, setSfxEnabled, hydrated } = useSfxPreference();
  return (
    <View style={styles.toggleRow}>
      <View style={styles.rowMain}>
        <Ionicons name="volume-high-outline" size={22} color={SV.neonCyan} style={styles.rowIcon} />
        <View style={styles.toggleTextBlock}>
          <Text style={styles.toggleTitle}>Sound effects</Text>
          <Text style={styles.toggleSub}>Short sound when a tile is revealed. Default is off.</Text>
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
  valueSuffix,
}: {
  title: string;
  onPress: () => void;
  iconName: IoniconName;
  /** Optional inline value shown near chevron, e.g. current Lock-Screen timeout. */
  valueSuffix?: string;
}) {
  const a11yLabel = valueSuffix ? `${title}, ${valueSuffix}` : title;
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={a11yLabel}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.rowMain}>
        <Ionicons name={iconName} size={22} color={SV.neonCyan} style={styles.rowIcon} />
        <View style={styles.rowTitleWrap}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>
      <View style={styles.rowTail}>
        {valueSuffix ? (
          <Text style={styles.rowValueSuffix} numberOfLines={1}>
            {valueSuffix}
          </Text>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={SV.muted} />
      </View>
    </Pressable>
  );
}

export default function SystemIndexScreen() {
  const { lockScreenMinutes, hydrated: lockScreenPrefsHydrated } = useSessionSecurity();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteNeedsRecentSignIn, setDeleteNeedsRecentSignIn] = useState(false);
  const { progress, grantThreeVaultCreditsToPhase } = useVaultProgress();
  const [debugPurchaseAllocOpen, setDebugPurchaseAllocOpen] = useState(false);
  const [systemUser, setSystemUser] = useState<User | null>(() => getFirebaseAuth().currentUser);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), setSystemUser);
    return unsub;
  }, []);

  const systemIsGuest = systemUser?.isAnonymous === true;

  const goToLoginFromGuest = async () => {
    try {
      await signOut(getFirebaseAuth());
      router.replace('/(auth)');
    } catch {
      Alert.alert('Sign out failed', 'Please try again.');
    }
  };
  const { missionAlertsEnabled, hydrated: missionAlertsHydrated } = useMissionAlert();

  const debugMissionAlertsReady = missionAlertsHydrated && missionAlertsEnabled;

  type DebugActionKey = 'buy' | 'reengagement' | 'monthlyGift';
  const [debugActionBusy, setDebugActionBusy] = useState<DebugActionKey | null>(null);
  const debugAsyncGateRef = useRef(false);

  /** Notify DEBUG actions often resolve in a few ms — keep dim visible long enough to perceive. */
  const DEBUG_ACTION_MIN_DIM_MS = 520;

  const runDebugAsync = useCallback(async (key: DebugActionKey, fn: () => Promise<void>) => {
    if (debugAsyncGateRef.current) return;
    debugAsyncGateRef.current = true;
    setDebugActionBusy(key);
    const started = Date.now();
    try {
      await fn();
    } finally {
      const elapsed = Date.now() - started;
      const remainder = Math.max(0, DEBUG_ACTION_MIN_DIM_MS - elapsed);
      if (remainder > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, remainder));
      }
      debugAsyncGateRef.current = false;
      setDebugActionBusy(null);
    }
  }, []);

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
      <PurchaseAllocationModal
        visible={debugPurchaseAllocOpen}
        onRequestClose={() => setDebugPurchaseAllocOpen(false)}
        isGuest={systemIsGuest}
        attemptsLeft={progress.attemptsLeft}
        onLinkAccount={() => void goToLoginFromGuest()}
        onSelectPhase={(tier) => {
          setDebugPurchaseAllocOpen(false);
          void runDebugAsync('buy', async () => {
            await grantThreeVaultCreditsToPhase(tier);
            Alert.alert('Vault Synchronized', 'Added 3 Mission Reserve credits to the selected phase.');
          });
        }}
      />
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
            title="Lock-Screen"
            iconName="lock-closed-outline"
            valueSuffix={
              lockScreenPrefsHydrated ? `${lockScreenMinutes} Minutes` : undefined
            }
            onPress={() => router.push('/(main)/system/lock-screen')}
          />
          <Text style={styles.lockScreenSubtext}>
            Select inactivity timeout options: 5, 10, 20, or 30 Minutes. Enabling &apos;Keep
            Awake&apos; in settings will prevent your device from sleeping during active Missions.
          </Text>
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
          {Platform.OS !== 'web' ? (
            <>
              <View style={styles.divider} />
              <MissionAlertsRow />
            </>
          ) : null}
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
          <View style={styles.debugDividerRow}>
            <View style={styles.debugDividerLine} />
            <Text style={styles.debugTitle}>DEBUG</Text>
            <View style={styles.debugDividerLine} />
          </View>
          <Pressable
            onPress={() => setDebugPurchaseAllocOpen(true)}
            accessibilityState={{ busy: debugActionBusy === 'buy' }}
            style={({ pressed }) => [
              styles.debugBuyBtn,
              debugActionBusy === 'buy' && styles.debugBuyDimmed,
              pressed && debugActionBusy === null && styles.debugBuyPressed,
            ]}>
            <Text style={styles.debugBuyText}>DEBUG [Buy 3 Vault Credits - $0.99]</Text>
          </Pressable>
          {Platform.OS !== 'web' ? (
            <>
              <Pressable
                accessibilityHint={
                  debugMissionAlertsReady
                    ? undefined
                    : 'Turn on Mission Alerts in Preferences first.'
                }
                accessibilityState={{
                  disabled: !debugMissionAlertsReady,
                  busy: debugActionBusy === 'reengagement',
                }}
                onPress={() =>
                  void runDebugAsync('reengagement', () => debugScheduleReengagementInSeconds(3))
                }
                disabled={!debugMissionAlertsReady}
                style={({ pressed }) => [
                  styles.debugBuyBtn,
                  debugActionBusy === 'reengagement' && styles.debugBuyDimmed,
                  pressed && debugMissionAlertsReady && debugActionBusy === null && styles.debugBuyPressed,
                  !debugMissionAlertsReady && styles.debugBuyBtnDisabled,
                ]}>
                <Text
                  style={[
                    styles.debugBuyText,
                    !debugMissionAlertsReady && styles.debugBuyTextDisabled,
                  ]}>
                  DEBUG [Re-Engagement Notify]
                </Text>
              </Pressable>
              <Pressable
                accessibilityHint={
                  debugMissionAlertsReady
                    ? undefined
                    : 'Turn on Mission Alerts in Preferences first.'
                }
                accessibilityState={{
                  disabled: !debugMissionAlertsReady,
                  busy: debugActionBusy === 'monthlyGift',
                }}
                onPress={() =>
                  void runDebugAsync('monthlyGift', () => debugScheduleMonthlyGiftInSeconds(3))
                }
                disabled={!debugMissionAlertsReady}
                style={({ pressed }) => [
                  styles.debugBuyBtn,
                  debugActionBusy === 'monthlyGift' && styles.debugBuyDimmed,
                  pressed && debugMissionAlertsReady && debugActionBusy === null && styles.debugBuyPressed,
                  !debugMissionAlertsReady && styles.debugBuyBtnDisabled,
                ]}>
                <Text
                  style={[
                    styles.debugBuyText,
                    !debugMissionAlertsReady && styles.debugBuyTextDisabled,
                  ]}>
                  DEBUG [Monthly Gift Notify]
                </Text>
              </Pressable>
            </>
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
  rowTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: SV.surgicalWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  rowTail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  rowValueSuffix: {
    color: SV.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  /** Align with row title column (matches divider inset). */
  lockScreenSubtext: {
    marginLeft: 16 + 22 + 12,
    marginRight: 16,
    marginTop: -6,
    marginBottom: 10,
    color: SV.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
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
  missionToggleTitle: {
    color: SV.surgicalWhite,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  missionToggleSub: {
    color: SV.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  missionSwitchWrap: {
    transform: [{ scaleX: 1.28 }, { scaleY: 1.22 }],
    marginRight: -2,
  },
  missionSwitch: {
    minWidth: 52,
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
    alignSelf: 'stretch',
  },
  debugDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  debugDividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    minHeight: 1,
    backgroundColor: 'rgba(0,255,255,0.45)',
  },
  debugTitle: {
    color: 'rgba(240,240,240,0.82)',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
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
  /** Active DEBUG action in progress (awaiting async). */
  debugBuyDimmed: {
    opacity: 0.42,
    backgroundColor: 'rgba(0,255,255,0.04)',
  },
  debugBuyText: {
    color: SV.neonCyan,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  debugBuyBtnDisabled: {
    opacity: 0.45,
    borderColor: 'rgba(0,255,255,0.25)',
  },
  debugBuyTextDisabled: {
    color: SV.muted,
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

