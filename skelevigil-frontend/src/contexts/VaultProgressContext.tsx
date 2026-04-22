import { FirebaseError } from 'firebase/app';
import { signOut } from 'firebase/auth';
import { router } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { MonthlyGiftRewardModal } from '@/src/components/vault/MonthlyGiftRewardModal';
import {
  applyMonthlyGiftRotationClaim,
  freeMissionClaimedModalText,
  nextProgressAfterSuccess,
  resetVaultProgressDocToDefault,
  writeVaultProgressDoc,
  transactionGrantThreeVaultCreditsForPhase,
  transactionDeductAttempt,
  transactionGrantMonthlyGiftRotation,
  transactionRecordMissionFailure,
  transactionRecordGlimpseSuccess,
} from '@/src/firebase/vaultProgressFirestore';
import { rescheduleMonthlyGiftFromNow } from '@/src/notifications/missionNotificationsController';
import { getFirebaseAuth } from '@/src/firebase/firebaseApp';
import { useVaultSync } from '@/src/hooks/useVaultSync';
import { resolveAuthUserForClaim } from '@/src/firebase/resolveAuthUserForClaim';
import {
  DEFAULT_VAULT_PROGRESS,
  getVaultProgress,
  setVaultProgress,
  type VaultAttemptsLeft,
  type VaultProgress,
} from '@/src/preferences/vaultProgress';
import {
  DEFAULT_VAULT_METRICS,
  getVaultMetrics,
  nextVaultMetricsAfterMission,
  setVaultMetrics,
  type VaultMetrics,
} from '@/src/preferences/vaultMetrics';
import { SV } from '@/src/theme/skelevigil';

const REWARD_TITLE = 'Vault Sync Complete!';
const REWARD_BODY =
  '10 successful missions have earned you 1 Free Restoration.';

function alertVaultFirestoreError(e: unknown, context: 'save' | 'update') {
  const title = context === 'save' ? 'Could not save progress' : 'Could not update';
  if (e instanceof FirebaseError && e.code === 'permission-denied') {
    Alert.alert(
      title,
      'Firestore blocked this request (permission denied). Publish the SkeleVigil Firestore rules that allow users to read and write userVaultProgress/{theirUserId}, or paste the same rules in Firebase Console → Firestore → Rules and click Publish.',
    );
    return;
  }
  Alert.alert(title, 'Check your connection and try again.');
}

type VaultProgressContextValue = {
  progress: VaultProgress;
  metrics: VaultMetrics;
  hydrated: boolean;
  metricsHydrated: boolean;
  /** Debug: reset reserves, free-restoration progress, lifetime missions, and gift index to defaults. */
  debugResetVaultProgressToDefault: () => Promise<void>;
  /** Debug: set full vault state (Firestore or local + monthly gift reschedule). */
  debugApplyVaultProgress: (next: VaultProgress) => Promise<void>;
  recordGlimpseSuccess: () => void;
  recordMissionSuccess: (tier: keyof VaultAttemptsLeft) => void;
  recordGlimpseFailure: () => void;
  recordMissionFailure: (tier: keyof VaultAttemptsLeft) => void;
  deductGlimpseAttempt: () => void;
  deductVaultAttempt: (tier: keyof VaultAttemptsLeft) => void;
  /** Debug / future post-purchase: +3 reserves for the chosen phase (Firestore or local). */
  grantThreeVaultCreditsToPhase: (tier: keyof VaultAttemptsLeft) => Promise<void>;
  claimMonthlyGiftNotificationReward: () => Promise<void>;
};

const VaultProgressContext = createContext<VaultProgressContextValue | null>(null);

export function VaultProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<VaultProgress>(DEFAULT_VAULT_PROGRESS);
  const [metrics, setMetrics] = useState<VaultMetrics>(DEFAULT_VAULT_METRICS);
  const [hydrated, setHydrated] = useState(false);
  const [metricsHydrated, setMetricsHydrated] = useState(false);
  const [firestoreUid, setFirestoreUid] = useState<string | null>(null);
  const [rewardModalVisible, setRewardModalVisible] = useState(false);
  const [monthlyGiftModalVisible, setMonthlyGiftModalVisible] = useState(false);
  const [monthlyGiftMessage, setMonthlyGiftMessage] = useState('');

  useVaultSync({ setProgress, setHydrated, setFirestoreUid });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const saved = await getVaultMetrics();
      if (cancelled) return;
      setMetrics(saved);
      setMetricsHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [firestoreUid]);

  const updateLocalOnly = useCallback((updater: (prev: VaultProgress) => VaultProgress) => {
    setProgress((prev) => {
      const next = updater(prev);
      void setVaultProgress(next);
      return next;
    });
  }, []);

  const updateMetricsOnly = useCallback((updater: (prev: VaultMetrics) => VaultMetrics) => {
    setMetrics((prev) => {
      const next = updater(prev);
      void setVaultMetrics(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!metricsHydrated) return;
    if (metrics.totalAttempts > 0) return;
    if (progress.lifetimeMissions <= 0) return;
    updateMetricsOnly((prev) => {
      if (prev.totalAttempts > 0) return prev;
      const seededSuccesses = Math.max(0, Math.trunc(progress.lifetimeMissions));
      return {
        ...prev,
        totalAttempts: seededSuccesses,
        totalSuccesses: seededSuccesses,
        currentStreak: 0,
        bestStreak: Math.max(prev.bestStreak, 0),
        phase: {
          ...prev.phase,
          // Historical success events were previously recorded through Glimpse-only API.
          glimpse: {
            ...prev.phase.glimpse,
            attempts: Math.max(prev.phase.glimpse.attempts, seededSuccesses),
            successes: Math.max(prev.phase.glimpse.successes, seededSuccesses),
          },
        },
      };
    });
  }, [
    metricsHydrated,
    metrics.totalAttempts,
    progress.lifetimeMissions,
    updateMetricsOnly,
  ]);

  const recordMissionSuccess = useCallback(
    (tier: keyof VaultAttemptsLeft) => {
      updateMetricsOnly((prev) => nextVaultMetricsAfterMission(prev, tier, true));
      if (firestoreUid) {
        void (async () => {
          try {
            const { grantedFreeAttempt } = await transactionRecordGlimpseSuccess(firestoreUid);
            if (grantedFreeAttempt) setRewardModalVisible(true);
          } catch (err) {
            alertVaultFirestoreError(err, 'save');
          }
        })();
        return;
      }

      setProgress((prev) => {
        const { next, grantedFreeAttempt } = nextProgressAfterSuccess(prev);
        if (grantedFreeAttempt) {
          queueMicrotask(() => setRewardModalVisible(true));
        }
        void setVaultProgress(next);
        return next;
      });
    },
    [firestoreUid, updateMetricsOnly],
  );

  const recordGlimpseSuccess = useCallback(() => {
    recordMissionSuccess('glimpse');
  }, [recordMissionSuccess]);

  const recordMissionFailure = useCallback(
    (tier: keyof VaultAttemptsLeft) => {
      updateMetricsOnly((prev) => nextVaultMetricsAfterMission(prev, tier, false));
      if (firestoreUid) {
        void (async () => {
          try {
            await transactionRecordMissionFailure(firestoreUid, tier);
          } catch (err) {
            alertVaultFirestoreError(err, 'save');
          }
        })();
        return;
      }

      updateLocalOnly((prev) => ({
        ...prev,
        attemptsLeft: {
          ...prev.attemptsLeft,
          [tier]: Math.max(0, prev.attemptsLeft[tier] - 1),
        },
      }));
    },
    [firestoreUid, updateLocalOnly, updateMetricsOnly],
  );

  const recordGlimpseFailure = useCallback(
    () => recordMissionFailure('glimpse'),
    [recordMissionFailure],
  );

  const deductVaultAttempt = useCallback(
    (tier: keyof VaultAttemptsLeft) => {
      if (firestoreUid) {
        void (async () => {
          try {
            await transactionDeductAttempt(firestoreUid, tier);
          } catch (err) {
            alertVaultFirestoreError(err, 'save');
          }
        })();
        return;
      }

      updateLocalOnly((prev) => ({
        ...prev,
        attemptsLeft: {
          ...prev.attemptsLeft,
          [tier]: Math.max(0, prev.attemptsLeft[tier] - 1),
        },
      }));
    },
    [firestoreUid, updateLocalOnly],
  );

  const deductGlimpseAttempt = useCallback(
    () => deductVaultAttempt('glimpse'),
    [deductVaultAttempt],
  );

  const grantThreeVaultCreditsToPhase = useCallback(
    async (tier: keyof VaultAttemptsLeft): Promise<void> => {
      if (firestoreUid) {
        try {
          await transactionGrantThreeVaultCreditsForPhase(firestoreUid, tier);
        } catch (err) {
          alertVaultFirestoreError(err, 'update');
        }
        return;
      }

      updateLocalOnly((prev) => ({
        ...prev,
        attemptsLeft: {
          ...prev.attemptsLeft,
          [tier]: prev.attemptsLeft[tier] + 3,
        },
      }));
    },
    [firestoreUid, updateLocalOnly],
  );

  const claimMonthlyGiftNotificationReward = useCallback(async () => {
    const authUser = await resolveAuthUserForClaim();
    if (authUser?.isAnonymous) {
      Alert.alert(
        'Secure Account to Claim',
        'Guest accounts cannot claim monthly gifts. Link Email, Apple, or Google to secure your progress and claim rewards.',
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Go to Login',
            onPress: () =>
              void (async () => {
                try {
                  await signOut(getFirebaseAuth());
                  router.replace('/(auth)');
                } catch {
                  Alert.alert('Sign out failed', 'Please try again.');
                }
              })(),
          },
        ],
      );
      const p = await getVaultProgress();
      await rescheduleMonthlyGiftFromNow(p.giftRotationIndex);
      return;
    }

    /**
     * Use Auth uid, not `firestoreUid` state. On cold open from a notification,
     * `firestoreUid` can still be null while `currentUser` is already restored — the
     * local-only branch would run, then Firestore snapshot overwrites UI without the +1.
     */
    const signedInUid = authUser && !authUser.isAnonymous ? authUser.uid : null;
    if (signedInUid) {
      try {
        const { securedTier, nextGiftRotationIndex, nextProgress } =
          await transactionGrantMonthlyGiftRotation(signedInUid);
        setProgress(nextProgress);
        void setVaultProgress(nextProgress);
        setMonthlyGiftMessage(freeMissionClaimedModalText(securedTier));
        setMonthlyGiftModalVisible(true);
        await rescheduleMonthlyGiftFromNow(nextGiftRotationIndex);
      } catch (err) {
        alertVaultFirestoreError(err, 'update');
      }
      return;
    }

    const local = await getVaultProgress();
    const { next, securedTier } = applyMonthlyGiftRotationClaim(local);
    await setVaultProgress(next);
    setProgress(next);
    setMonthlyGiftMessage(freeMissionClaimedModalText(securedTier));
    setMonthlyGiftModalVisible(true);
    await rescheduleMonthlyGiftFromNow(next.giftRotationIndex);
  }, []);

  const dismissReward = useCallback(() => setRewardModalVisible(false), []);
  const dismissMonthlyGift = useCallback(() => setMonthlyGiftModalVisible(false), []);

  const debugResetVaultProgressToDefault = useCallback(async () => {
    const fresh: VaultProgress = {
      ...DEFAULT_VAULT_PROGRESS,
      attemptsLeft: { ...DEFAULT_VAULT_PROGRESS.attemptsLeft },
    };
    if (firestoreUid) {
      try {
        await resetVaultProgressDocToDefault(firestoreUid);
        setProgress(fresh);
        await setVaultProgress(fresh);
        await rescheduleMonthlyGiftFromNow(fresh.giftRotationIndex);
      } catch (err) {
        alertVaultFirestoreError(err, 'save');
      }
      return;
    }

    setProgress(fresh);
    await setVaultProgress(fresh);
    await rescheduleMonthlyGiftFromNow(fresh.giftRotationIndex);
  }, [firestoreUid]);

  const debugApplyVaultProgress = useCallback(
    async (next: VaultProgress) => {
      const snapshot: VaultProgress = {
        ...next,
        attemptsLeft: { ...next.attemptsLeft },
      };
      if (firestoreUid) {
        try {
          await writeVaultProgressDoc(firestoreUid, snapshot);
          setProgress(snapshot);
          await setVaultProgress(snapshot);
          await rescheduleMonthlyGiftFromNow(snapshot.giftRotationIndex);
        } catch (err) {
          alertVaultFirestoreError(err, 'save');
        }
        return;
      }

      setProgress(snapshot);
      await setVaultProgress(snapshot);
      await rescheduleMonthlyGiftFromNow(snapshot.giftRotationIndex);
    },
    [firestoreUid],
  );

  const value = useMemo(
    () => ({
      progress,
      metrics,
      hydrated,
      metricsHydrated,
      debugResetVaultProgressToDefault,
      debugApplyVaultProgress,
      recordGlimpseSuccess,
      recordMissionSuccess,
      recordGlimpseFailure,
      recordMissionFailure,
      deductGlimpseAttempt,
      deductVaultAttempt,
      grantThreeVaultCreditsToPhase,
      claimMonthlyGiftNotificationReward,
    }),
    [
      progress,
      metrics,
      hydrated,
      metricsHydrated,
      debugResetVaultProgressToDefault,
      debugApplyVaultProgress,
      recordGlimpseSuccess,
      recordMissionSuccess,
      recordGlimpseFailure,
      recordMissionFailure,
      deductGlimpseAttempt,
      deductVaultAttempt,
      grantThreeVaultCreditsToPhase,
      claimMonthlyGiftNotificationReward,
    ],
  );

  return (
    <VaultProgressContext.Provider value={value}>
      {children}
      <Modal
        visible={rewardModalVisible}
        transparent
        animationType="fade"
        onRequestClose={dismissReward}>
        <View style={styles.rewardBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={dismissReward}
            accessibilityLabel="Dismiss vault reward"
          />
          <View style={styles.rewardCard}>
            <Text style={styles.rewardTitle}>{REWARD_TITLE}</Text>
            <Text style={styles.rewardBody}>{REWARD_BODY}</Text>
            <Pressable
              onPress={dismissReward}
              style={({ pressed }) => [styles.rewardOk, pressed && styles.rewardOkPressed]}>
              <Text style={styles.rewardOkText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <MonthlyGiftRewardModal
        visible={monthlyGiftModalVisible}
        message={monthlyGiftMessage}
        onDismiss={dismissMonthlyGift}
      />
    </VaultProgressContext.Provider>
  );
}

export function useVaultProgress(): VaultProgressContextValue {
  const ctx = useContext(VaultProgressContext);
  if (!ctx) {
    throw new Error('useVaultProgress must be used within VaultProgressProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  rewardBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  rewardCard: {
    width: '100%',
    maxWidth: 360,
    zIndex: 1,
    backgroundColor: SV.gunmetal,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.35)',
    padding: 20,
  },
  rewardTitle: {
    color: SV.neonCyan,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  rewardBody: {
    color: SV.surgicalWhite,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 18,
  },
  rewardOk: {
    alignSelf: 'center',
    backgroundColor: SV.neonCyan,
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 8,
  },
  rewardOkPressed: {
    opacity: 0.88,
  },
  rewardOkText: {
    color: SV.black,
    fontSize: 16,
    fontWeight: '700',
  },
});
