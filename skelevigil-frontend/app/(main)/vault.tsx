import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  PurchaseAllocationModal,
  type VaultPhaseTier,
} from '@/src/components/vault/PurchaseAllocationModal';
import { usePrivacyMasking } from '@/src/contexts/PrivacyMaskingContext';
import { useVaultProgress } from '@/src/contexts/VaultProgressContext';
import { getFirebaseAuth } from '@/src/firebase/firebaseApp';
import { maskEmailAddress } from '@/src/privacy/maskEmail';
import { getMonthlyGiftNextFireAtMs } from '@/src/preferences/missionMonthlySchedule';
import { FREE_MISSION_CREDIT_ALLOWANCE } from '@/src/preferences/vaultProgress';
import { calcEfficiencyScore, calcRatePercent } from '@/src/preferences/vaultMetrics';
import { SV } from '@/src/theme/skelevigil';

const CREDENTIAL_PEEK_MS = 4000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** UI assumes up to ~30 days between monthly gift notifications (matches scheduling window). */
const MONTHLY_WINDOW_MS = 30 * DAY_MS;

function credentialVariant(user: User | null): 'guest' | 'apple' | 'google' | 'email' {
  if (!user || user.isAnonymous) return 'guest';
  const ids = user.providerData.map((p) => p.providerId);
  if (ids.includes('apple.com')) return 'apple';
  if (ids.includes('google.com')) return 'google';
  return 'email';
}

/** Same fills as Phases screen Play now buttons (`PHASE_BTN` in phases.tsx). */
const PHASE_RESERVE_LABEL_COLOR = {
  glimpseGrey: '#8A8E91',
  stareTeal: '#0E9595',
  tranceLightOrange: '#F5BF8A',
} as const;

type MetricsModalId = 'performance' | 'streak';
type HapticMethod = 'selection';
type HapticModule = {
  trigger: (
    method: HapticMethod,
    options: { enableVibrateFallback: boolean; ignoreAndroidSystemSettings: boolean },
  ) => void;
};
const HAPTIC_OPTIONS = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
} as const;

let cachedHapticModule: HapticModule | null = null;
function triggerSelectionHaptic(): void {
  try {
    if (!cachedHapticModule) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('react-native-haptic-feedback') as { default?: HapticModule } | HapticModule;
      cachedHapticModule = ('default' in mod ? mod.default : mod) ?? null;
    }
    cachedHapticModule?.trigger('selection', HAPTIC_OPTIONS);
  } catch {
    // best effort
  }
}

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const [currentUser, setCurrentUser] = useState<User | null>(() => getFirebaseAuth().currentUser);
  const { progress, metrics, hydrated, metricsHydrated } = useVaultProgress();
  const { privacyMaskingEnabled, hydrated: privacyHydrated } = usePrivacyMasking();
  const [purchaseAllocationOpen, setPurchaseAllocationOpen] = useState(false);
  const [weeklyAdModalOpen, setWeeklyAdModalOpen] = useState(false);
  const [metricsModalOpen, setMetricsModalOpen] = useState<MetricsModalId | null>(null);
  const [monthlyNextFireMs, setMonthlyNextFireMs] = useState<number | null>(null);
  const [peekFullCredential, setPeekFullCredential] = useState(false);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshMonthlySchedule = useCallback(async () => {
    const ms = await getMonthlyGiftNextFireAtMs();
    setMonthlyNextFireMs(ms);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshMonthlySchedule();
      const id = setInterval(() => void refreshMonthlySchedule(), 60_000);
      return () => clearInterval(id);
    }, [refreshMonthlySchedule]),
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (user) => setCurrentUser(user));
    return unsub;
  }, []);

  const clearPeekTimer = useCallback(() => {
    if (peekTimerRef.current) {
      clearTimeout(peekTimerRef.current);
      peekTimerRef.current = null;
    }
  }, []);

  const onPeekCredential = useCallback(() => {
    setPeekFullCredential(true);
    clearPeekTimer();
    peekTimerRef.current = setTimeout(() => {
      setPeekFullCredential(false);
      peekTimerRef.current = null;
    }, CREDENTIAL_PEEK_MS);
  }, [clearPeekTimer]);

  useEffect(() => () => clearPeekTimer(), [clearPeekTimer]);

  const isGuest = useMemo(() => currentUser?.isAnonymous === true, [currentUser]);

  const authVariant = useMemo(() => credentialVariant(currentUser), [currentUser]);

  const excavatorLine = useMemo(() => {
    if (authVariant === 'guest') {
      return {
        prefix: 'Guest ID:',
        value: 'Temporary Session',
        showEye: false,
      };
    }
    const email = currentUser?.email?.trim() ?? '';
    const raw = email.length > 0 ? email : '—';
    const useMask = privacyHydrated && privacyMaskingEnabled && raw !== '—';
    const masked = raw === '—' ? '—' : maskEmailAddress(raw);
    const visible = !useMask || peekFullCredential ? raw : masked;
    const prefix =
      authVariant === 'apple' ? 'Apple ID:' : authVariant === 'google' ? 'Google ID:' : 'User ID:';
    return {
      prefix,
      value: visible,
      showEye: Boolean(useMask && raw !== '—'),
    };
  }, [authVariant, currentUser, privacyHydrated, privacyMaskingEnabled, peekFullCredential]);

  const goToLoginFromGuest = async () => {
    try {
      await signOut(getFirebaseAuth());
      router.replace('/(auth)');
    } catch {
      Alert.alert('Sign out failed', 'Please try again.');
    }
  };

  /**
   * Purchase flow: open allocation modal first. After user picks a phase, call RevenueCat
   * `Purchases.purchasePackage` (not wired yet). On IAP success, grant +3 to that phase in Firestore.
   */
  const onBuyVaultCredits = () => {
    setPurchaseAllocationOpen(true);
  };

  const onPurchaseAllocationSelectPhase = (tier: VaultPhaseTier) => {
    setPurchaseAllocationOpen(false);
    if (isGuest) return;
    Alert.alert(
      'RevenueCat',
      `This is a RevenueCat placeholder and will be added later.\n\nSelected phase: ${tier}. Wire Purchases.purchasePackage here, then on success call grant +3 for this phase in Firestore.`,
    );
  };

  const monthlyDaysRemaining = useMemo(() => {
    if (monthlyNextFireMs == null) return null;
    const msLeft = monthlyNextFireMs - Date.now();
    if (msLeft <= 0) return 0;
    return Math.max(1, Math.ceil(msLeft / DAY_MS));
  }, [monthlyNextFireMs]);

  const monthlyProgressFraction = useMemo(() => {
    if (monthlyNextFireMs == null) return 0;
    const msLeft = Math.max(0, monthlyNextFireMs - Date.now());
    return Math.min(1, 1 - Math.min(1, msLeft / MONTHLY_WINDOW_MS));
  }, [monthlyNextFireMs]);

  const phaseRates = useMemo(
    () => ({
      glimpse: calcRatePercent(metrics.phase.glimpse.successes, metrics.phase.glimpse.attempts),
      stare: calcRatePercent(metrics.phase.stare.successes, metrics.phase.stare.attempts),
      trance: calcRatePercent(metrics.phase.trance.successes, metrics.phase.trance.attempts),
    }),
    [metrics],
  );

  const successRate = useMemo(
    () => calcRatePercent(metrics.totalSuccesses, metrics.totalAttempts),
    [metrics.totalAttempts, metrics.totalSuccesses],
  );
  const efficiencyScore = useMemo(() => calcEfficiencyScore(metrics), [metrics]);
  const phaseMastery = useMemo(() => {
    const entries = [
      { tier: 'glimpse' as const, wins: metrics.currentStreakPhaseWins.glimpse },
      { tier: 'stare' as const, wins: metrics.currentStreakPhaseWins.stare },
      { tier: 'trance' as const, wins: metrics.currentStreakPhaseWins.trance },
    ];
    const top = entries.reduce((a, b) => (b.wins > a.wins ? b : a), entries[0]!);
    if (metrics.currentStreak <= 0 || top.wins <= 0) return 'No active chain yet.';
    return `${top.tier[0]!.toUpperCase()}${top.tier.slice(1)} (${top.wins} wins in current streak)`;
  }, [metrics.currentStreak, metrics.currentStreakPhaseWins]);
  const vigilanceStatus =
    metrics.currentStreak === 0
      ? 'Chain Severed. Start a new mission to begin restoration.'
      : metrics.currentStreak >= 5
        ? 'High Synchronization. The chain remains intact.'
        : 'Chain active. Keep restoring without interruption.';

  const onOpenMetricsModal = useCallback((id: MetricsModalId) => {
    triggerSelectionHaptic();
    setMetricsModalOpen(id);
  }, []);

  /** Placeholder until weekly ad + cooldown are persisted (7-day window for bar). */
  const weeklyAdProgressFraction = 4 / 7;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Modal
        visible={metricsModalOpen != null}
        transparent
        animationType="fade"
        onRequestClose={() => setMetricsModalOpen(null)}>
        <Pressable style={styles.weeklyModalBackdrop} onPress={() => setMetricsModalOpen(null)}>
          <Pressable style={styles.metricsModalCard} onPress={(e) => e.stopPropagation()}>
            {metricsModalOpen === 'performance' ? (
              <>
                <Text style={styles.metricsModalTitle}>Performance Summary</Text>
                <Text style={styles.metricsLine}>
                  Success Rate: <Text style={styles.metricsStrong}>{successRate}%</Text>
                </Text>
                <Text style={styles.metricsLine}>
                  Mission Volume:{' '}
                  <Text style={styles.metricsStrong}>{metrics.totalAttempts}</Text>
                </Text>
                <Text style={styles.metricsLine}>
                  Efficiency Score:{' '}
                  <Text style={styles.metricsStrong}>{efficiencyScore}</Text>
                </Text>
                <Text style={[styles.metricsLine, styles.metricsSectionHeader]}>Phase Breakdown</Text>
                {(['glimpse', 'stare', 'trance'] as const).map((tier) => {
                  const rate = phaseRates[tier];
                  const toneStyle =
                    rate >= 80
                      ? styles.metricRateStrong
                      : rate < 50
                        ? styles.metricRateWarning
                        : styles.metricRateNeutral;
                  const phaseLabel = `${tier[0]!.toUpperCase()}${tier.slice(1)}`;
                  return (
                    <View key={tier} style={styles.phaseMetricRow}>
                      <Text style={styles.phaseMetricLabel}>
                        {phaseLabel}: <Text style={toneStyle}>{rate}%</Text>
                      </Text>
                      <View style={styles.phaseMetricTrack}>
                        <View style={[styles.phaseMetricFill, { width: `${rate}%` }]} />
                      </View>
                    </View>
                  );
                })}
              </>
            ) : (
              <>
                <Text style={styles.metricsModalTitle}>Streak Tracker</Text>
                <Text style={styles.metricsLine}>
                  Active Streak:{' '}
                  <Text style={styles.metricsStrong}>{metrics.currentStreak}</Text>
                </Text>
                <Text style={styles.metricsLine}>
                  Best Streak: <Text style={styles.metricsStrong}>{metrics.bestStreak}</Text>
                </Text>
                <Text style={styles.metricsLine}>
                  Phase Mastery: <Text style={styles.metricsStrong}>{phaseMastery}</Text>
                </Text>
                <Text style={[styles.metricsLine, styles.metricsSectionHeader]}>Vigilance Status</Text>
                <Text style={styles.metricsHint}>{vigilanceStatus}</Text>
              </>
            )}
            <Pressable
              onPress={() => setMetricsModalOpen(null)}
              style={({ pressed }) => [styles.weeklyModalOk, pressed && styles.weeklyModalOkPressed]}>
              <Text style={styles.weeklyModalOkText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={weeklyAdModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setWeeklyAdModalOpen(false)}>
        <Pressable style={styles.weeklyModalBackdrop} onPress={() => setWeeklyAdModalOpen(false)}>
          <Pressable style={styles.weeklyModalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.weeklyModalTitle}>Weekly Ad</Text>
            <Text style={styles.weeklyModalBody}>
              Rewarded weekly ad playback will be added in a future update.
            </Text>
            <Pressable
              onPress={() => setWeeklyAdModalOpen(false)}
              style={({ pressed }) => [styles.weeklyModalOk, pressed && styles.weeklyModalOkPressed]}>
              <Text style={styles.weeklyModalOkText}>OK</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <PurchaseAllocationModal
        visible={purchaseAllocationOpen}
        onRequestClose={() => setPurchaseAllocationOpen(false)}
        isGuest={isGuest}
        attemptsLeft={progress.attemptsLeft}
        onLinkAccount={() => void goToLoginFromGuest()}
        onSelectPhase={onPurchaseAllocationSelectPhase}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 12) + 28 },
        ]}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vault Key.</Text>
          <View style={styles.credentialCard}>
            <View style={styles.credentialRow}>
              <Text style={styles.credentialPrefix}>{excavatorLine.prefix}</Text>
              <Text
                style={styles.credentialValue}
                numberOfLines={3}
                accessibilityLabel={`${excavatorLine.prefix} ${excavatorLine.value}`}>
                {excavatorLine.value}
              </Text>
              {excavatorLine.showEye ? (
                <Pressable
                  onPress={onPeekCredential}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={
                    peekFullCredential
                      ? 'Full email visible; will hide shortly'
                      : 'Reveal full email for a few seconds'
                  }>
                  <Ionicons
                    name={peekFullCredential ? 'eye' : 'eye-outline'}
                    size={22}
                    color={SV.neonCyan}
                  />
                </Pressable>
              ) : (
                <View style={styles.credentialEyeSpacer} />
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vault Scoreboard</Text>
          <View style={styles.trackingBox}>
            <Text style={styles.trackingTitle}>Mission Reserves Available</Text>
            <Text style={[styles.trackingLine, { color: PHASE_RESERVE_LABEL_COLOR.glimpseGrey }]}>
              Glimpse Phase: {progress.attemptsLeft.glimpse}
            </Text>
            <Text style={[styles.trackingLine, { color: PHASE_RESERVE_LABEL_COLOR.stareTeal }]}>
              Stare Phase: {progress.attemptsLeft.stare}
            </Text>
            <Text style={[styles.trackingLine, { color: PHASE_RESERVE_LABEL_COLOR.tranceLightOrange }]}>
              Trance Phase: {progress.attemptsLeft.trance}
            </Text>
          </View>
          <View style={[styles.trackingBox, styles.restorationBox]}>
            <View style={styles.restorationHeaderRow}>
              <Text style={styles.restorationLabel}>Progress to Free Restoration</Text>
              <Text style={styles.restorationCount} accessibilityLabel="Progress to free restoration">
                {progress.successfulMissions} / {FREE_MISSION_CREDIT_ALLOWANCE}
              </Text>
            </View>
            <View
              style={styles.progressTrack}
              accessibilityRole="progressbar"
              accessibilityValue={{
                min: 0,
                max: FREE_MISSION_CREDIT_ALLOWANCE,
                now: progress.successfulMissions,
              }}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(1, progress.successfulMissions / FREE_MISSION_CREDIT_ALLOWANCE) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.trackingLine}>
              Lifetime Missions Secured: {progress.lifetimeMissions}
            </Text>
          </View>
          {!hydrated ? <Text style={styles.syncHint}>Syncing vault progress...</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vault Metrics</Text>
          <View style={styles.metricsCardRow}>
            <Pressable
              onPress={() => onOpenMetricsModal('performance')}
              style={({ pressed }) => [styles.metricsCard, pressed && styles.metricsCardPressed]}
              accessibilityRole="button"
              accessibilityLabel="Performance metrics, tap for detailed analytics">
              <Ionicons name="bar-chart-outline" size={18} color={SV.neonCyan} />
              <Text style={styles.metricsCardTitle}>Performance</Text>
              <Text style={styles.metricsCardHint}>Tap for detailed analytics.</Text>
            </Pressable>
            <Pressable
              onPress={() => onOpenMetricsModal('streak')}
              style={({ pressed }) => [styles.metricsCard, pressed && styles.metricsCardPressed]}
              accessibilityRole="button"
              accessibilityLabel="Streak tracker, tap for streak history">
              <Ionicons name="flame-outline" size={18} color={SV.neonCyan} />
              <Text style={styles.metricsCardTitle}>Streak Tracker</Text>
              <Text style={styles.metricsCardHint}>Tap for streak history.</Text>
            </Pressable>
          </View>
          {!metricsHydrated ? <Text style={styles.syncHint}>Syncing vault metrics...</Text> : null}
        </View>

        <View style={[styles.section, styles.restorationSection]}>
          <Text style={styles.sectionTitle}>Vault Restoration</Text>

          {isGuest ? (
            <View style={styles.guestRestorationBlock}>
              <Text style={styles.securitySectionTitle}>Vault Security</Text>
              <View style={styles.securityCard}>
                <Text style={styles.securityStatus}>Status: Guest Mode (Unsecured).</Text>
                <Pressable onPress={() => void goToLoginFromGuest()} style={styles.securityLinkWrap}>
                  <Text style={styles.securityLink}>Link Account</Text>
                </Pressable>
                <Text style={styles.securityHint}>Secure your vault across devices.</Text>
                <Text style={styles.securityExtraHint}>
                  Required to unlock Weekly and Monthly restorations.
                </Text>
              </View>
            </View>
          ) : (
            <>
              <Pressable
                onPress={onBuyVaultCredits}
                style={({ pressed }) => [styles.restorationCyanBtn, pressed && styles.restorationCyanBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Buy 3 credits for 99 cents, instant access">
                <View style={styles.restorationBtnRow}>
                  <Ionicons name="flash" size={22} color={SV.black} />
                  <View style={styles.restorationBtnTextCol}>
                    <Text style={styles.restorationBtnEyebrow}>Instant</Text>
                    <Text style={styles.restorationBtnTitle}>Buy 3 Credits — $0.99</Text>
                  </View>
                </View>
              </Pressable>
              <Text style={styles.restorationInstantSub}>
                One-time purchase. No recurring fees.
              </Text>

              <Pressable
                onPress={() => setWeeklyAdModalOpen(true)}
                style={({ pressed }) => [
                  styles.restorationWeeklyOutlineBtn,
                  styles.restorationWeeklyOutlineBtnCompact,
                  pressed && styles.restorationWeeklyOutlineBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Watch weekly ad for one credit">
                <View style={styles.restorationBtnRow}>
                  <Ionicons name="radio-outline" size={20} color={SV.neonCyan} />
                  <View style={styles.restorationBtnTextCol}>
                    <Text style={styles.restorationWeeklyEyebrow}>Weekly</Text>
                    <Text style={styles.restorationWeeklyTitle}>Watch Weekly Ad — +1 Credit</Text>
                  </View>
                </View>
              </Pressable>
              <View style={styles.weeklyProgressTrackWrap}>
                <View style={styles.nextMissionProgressTrack}>
                  <View
                    style={[
                      styles.nextMissionProgressFill,
                      { width: `${weeklyAdProgressFraction * 100}%` },
                    ]}
                  />
                </View>
              </View>
              <Text style={styles.nextMissionSub}>
                Available once a week. 3 days remaining
              </Text>
              <Text style={styles.nextMissionHint}>Weekly Credit in progress.</Text>

              <View style={styles.nextMissionCard}>
                <View style={styles.nextMissionHeader}>
                  <Ionicons name="hourglass-outline" size={18} color={SV.neonCyan} />
                  <Text style={styles.nextMissionLabel}>Next Free Mission</Text>
                </View>
                <View
                  style={styles.nextMissionProgressTrack}
                  accessibilityRole="progressbar"
                  accessibilityValue={
                    monthlyNextFireMs != null
                      ? {
                          min: 0,
                          max: 100,
                          now: Math.round(monthlyProgressFraction * 100),
                        }
                      : undefined
                  }>
                  <View
                    style={[
                      styles.nextMissionProgressFill,
                      { width: `${monthlyProgressFraction * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.nextMissionSub}>
                  {monthlyDaysRemaining == null
                    ? 'Available once a month. Syncing schedule…'
                    : monthlyDaysRemaining === 0
                      ? 'Available once a month. Eligible now — watch for your Mission Alert.'
                      : `Available once a month. ${monthlyDaysRemaining} day${
                          monthlyDaysRemaining === 1 ? '' : 's'
                        } remaining`}
                </Text>
                <Text style={styles.nextMissionHint}>Monthly restoration in progress.</Text>
              </View>
            </>
          )}
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
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    padding: 24,
    gap: 10,
  },
  section: {
    width: '100%',
  },
  sectionTitle: {
    color: SV.neonCyan,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  credentialCard: {
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.25)',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  credentialRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  credentialPrefix: {
    color: SV.surgicalWhite,
    fontSize: 14,
    fontWeight: '700',
    minWidth: 88,
    paddingTop: 2,
  },
  credentialValue: {
    flex: 1,
    minWidth: 0,
    color: 'rgba(240,240,240,0.95)',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  credentialEyeSpacer: {
    width: 22,
    height: 22,
  },
  restorationLabel: {
    flex: 1,
    color: SV.surgicalWhite,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'left',
  },
  restorationCount: {
    color: SV.surgicalWhite,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
    textAlign: 'right',
  },
  restorationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressTrack: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0,255,255,0.12)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.28)',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: SV.neonCyan,
  },
  trackingBox: {
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.25)',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 14,
    gap: 6,
  },
  trackingTitle: {
    color: SV.surgicalWhite,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  trackingLine: {
    color: 'rgba(240,240,240,0.92)',
    fontSize: 14,
    fontWeight: '600',
  },
  restorationBox: {
    marginTop: 12,
  },
  syncHint: {
    marginTop: 10,
    color: SV.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  metricsCardRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricsCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.28)',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    minHeight: 92,
    justifyContent: 'center',
  },
  metricsCardPressed: {
    opacity: 0.9,
    backgroundColor: 'rgba(0,255,255,0.06)',
  },
  metricsCardTitle: {
    marginTop: 6,
    color: SV.surgicalWhite,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  metricsCardHint: {
    marginTop: 4,
    color: SV.muted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  metricsModalCard: {
    backgroundColor: SV.gunmetal,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.3)',
    width: '100%',
    maxWidth: 360,
  },
  metricsModalTitle: {
    color: SV.neonCyan,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  metricsLine: {
    color: SV.surgicalWhite,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  metricsStrong: {
    color: SV.surgicalWhite,
    fontWeight: '800',
  },
  metricsSectionHeader: {
    marginTop: 8,
    color: SV.neonCyan,
    fontWeight: '700',
  },
  metricsHint: {
    marginTop: 2,
    color: 'rgba(240,240,240,0.92)',
    fontSize: 13,
    lineHeight: 19,
  },
  phaseMetricRow: {
    marginTop: 6,
    marginBottom: 2,
  },
  phaseMetricLabel: {
    color: SV.surgicalWhite,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricRateStrong: {
    color: SV.neonCyan,
    fontWeight: '800',
  },
  metricRateWarning: {
    color: '#D9A57A',
    fontWeight: '800',
  },
  metricRateNeutral: {
    color: 'rgba(240,240,240,0.92)',
    fontWeight: '700',
  },
  phaseMetricTrack: {
    width: '100%',
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(0,255,255,0.1)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.22)',
  },
  phaseMetricFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: SV.neonCyan,
  },
  restorationSection: {
    alignItems: 'stretch',
    marginBottom: 8,
    width: '100%',
  },
  guestRestorationBlock: {
    width: '100%',
    alignItems: 'stretch',
  },
  restorationCyanBtn: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    minHeight: 54,
    backgroundColor: SV.neonCyan,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  /** Secondary “reward” action: outlined cyan vs solid primary Buy button. */
  restorationWeeklyOutlineBtn: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    minHeight: 50,
    backgroundColor: 'rgba(0,255,255,0.06)',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(0,255,255,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  restorationWeeklyOutlineBtnCompact: {
    marginTop: 14,
  },
  restorationWeeklyOutlineBtnPressed: {
    opacity: 0.9,
    backgroundColor: 'rgba(0,255,255,0.1)',
  },
  restorationWeeklyEyebrow: {
    color: 'rgba(0,255,255,0.62)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  restorationWeeklyTitle: {
    color: SV.neonCyan,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  restorationCyanBtnPressed: {
    opacity: 0.88,
  },
  restorationBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  restorationBtnTextCol: {
    flex: 1,
    minWidth: 0,
  },
  restorationBtnEyebrow: {
    color: 'rgba(0,0,0,0.55)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  restorationBtnTitle: {
    color: SV.black,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  restorationInstantSub: {
    marginTop: 10,
    color: 'rgba(240,240,240,0.95)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  weeklyProgressTrackWrap: {
    marginTop: 8,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  nextMissionCard: {
    marginTop: 18,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.28)',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  nextMissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 10,
    width: '100%',
  },
  nextMissionLabel: {
    color: SV.neonCyan,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  nextMissionProgressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,255,255,0.1)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.25)',
    marginBottom: 10,
  },
  nextMissionProgressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: SV.neonCyan,
  },
  nextMissionSub: {
    color: 'rgba(240,240,240,0.92)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 19,
  },
  nextMissionHint: {
    marginTop: 6,
    color: SV.muted,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 17,
  },
  weeklyModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  weeklyModalCard: {
    backgroundColor: SV.gunmetal,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.3)',
  },
  weeklyModalTitle: {
    color: SV.neonCyan,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  weeklyModalBody: {
    color: SV.surgicalWhite,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 18,
  },
  weeklyModalOk: {
    alignSelf: 'center',
    backgroundColor: SV.neonCyan,
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 8,
  },
  weeklyModalOkPressed: {
    opacity: 0.88,
  },
  weeklyModalOkText: {
    color: SV.black,
    fontSize: 15,
    fontWeight: '800',
  },
  securitySectionTitle: {
    color: '#E8AE73',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 10,
    textAlign: 'center',
  },
  securityCard: {
    borderWidth: 1,
    borderColor: 'rgba(232,174,115,0.45)',
    borderRadius: 10,
    backgroundColor: 'rgba(120,56,40,0.16)',
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  securityStatus: {
    color: 'rgba(255,232,210,0.95)',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  securityLinkWrap: {
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 6,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityLink: {
    color: '#FFD3AA',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  securityHint: {
    marginTop: 2,
    color: 'rgba(255,212,178,0.75)',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    textAlign: 'center',
  },
  securityExtraHint: {
    marginTop: 10,
    paddingHorizontal: 4,
    color: 'rgba(255,212,178,0.88)',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
});
