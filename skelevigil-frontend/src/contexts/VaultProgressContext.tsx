import { FirebaseError } from 'firebase/app';
import { onAuthStateChanged } from 'firebase/auth';
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

import {
  nextProgressAfterSuccess,
  pickTierToIncrement,
  seedVaultDocIfMissing,
  subscribeVaultProgress,
  transactionDebugBuyThreeGlimpse,
  transactionGrantMonthlyGiftFreeAttempt,
  transactionRecordGlimpseFailure,
  transactionRecordGlimpseSuccess,
} from '@/src/firebase/vaultProgressFirestore';
import { getFirebaseAuth } from '@/src/firebase/firebaseApp';
import {
  DEFAULT_VAULT_PROGRESS,
  getVaultProgress,
  setVaultProgress,
  type VaultProgress,
} from '@/src/preferences/vaultProgress';
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
  hydrated: boolean;
  recordGlimpseSuccess: () => void;
  recordGlimpseFailure: () => void;
  debugBuyThreeVaultCredits: () => void;
  claimMonthlyGiftNotificationReward: () => Promise<{ granted: boolean }>;
};

const VaultProgressContext = createContext<VaultProgressContextValue | null>(null);

export function VaultProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<VaultProgress>(DEFAULT_VAULT_PROGRESS);
  const [hydrated, setHydrated] = useState(false);
  const [firestoreUid, setFirestoreUid] = useState<string | null>(null);
  const [rewardModalVisible, setRewardModalVisible] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    let unsubFs: (() => void) | undefined;
    let cancelled = false;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubFs) {
        unsubFs();
        unsubFs = undefined;
      }

      if (!user) {
        setFirestoreUid(null);
        void getVaultProgress().then((loaded) => {
          if (cancelled) return;
          setProgress(loaded);
          setHydrated(true);
        });
        return;
      }

      setFirestoreUid(user.uid);
      setHydrated(false);

      void (async () => {
        try {
          const local = await getVaultProgress();
          if (cancelled) return;
          await seedVaultDocIfMissing(user.uid, local);
          if (cancelled) return;
          unsubFs = subscribeVaultProgress(user.uid, (p) => {
            if (!cancelled) {
              setProgress(p);
              setHydrated(true);
            }
          });
        } catch {
          if (!cancelled) {
            setProgress(DEFAULT_VAULT_PROGRESS);
            setHydrated(true);
          }
        }
      })();
    });

    return () => {
      cancelled = true;
      unsubAuth();
      unsubFs?.();
    };
  }, []);

  const updateLocalOnly = useCallback((updater: (prev: VaultProgress) => VaultProgress) => {
    setProgress((prev) => {
      const next = updater(prev);
      void setVaultProgress(next);
      return next;
    });
  }, []);

  const recordGlimpseSuccess = useCallback(() => {
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
  }, [firestoreUid]);

  const recordGlimpseFailure = useCallback(() => {
    if (firestoreUid) {
      void (async () => {
        try {
          await transactionRecordGlimpseFailure(firestoreUid);
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
        glimpse: Math.max(0, prev.attemptsLeft.glimpse - 1),
      },
    }));
  }, [firestoreUid, updateLocalOnly]);

  const debugBuyThreeVaultCredits = useCallback(() => {
    if (firestoreUid) {
      void (async () => {
        try {
          await transactionDebugBuyThreeGlimpse(firestoreUid);
        } catch (err) {
          alertVaultFirestoreError(err, 'update');
        }
      })();
      return;
    }

    updateLocalOnly((prev) => ({
      ...prev,
      attemptsLeft: {
        ...prev.attemptsLeft,
        glimpse: prev.attemptsLeft.glimpse + 3,
      },
    }));
  }, [firestoreUid, updateLocalOnly]);

  const claimMonthlyGiftNotificationReward = useCallback(async (): Promise<{ granted: boolean }> => {
    if (firestoreUid) {
      try {
        const granted = await transactionGrantMonthlyGiftFreeAttempt(firestoreUid);
        if (granted) {
          Alert.alert('Claimed', 'A free mission attempt was added to your Vault.');
        } else {
          Alert.alert('Could not claim', 'Your Vault reserves are full.');
        }
        return { granted };
      } catch (err) {
        alertVaultFirestoreError(err, 'update');
        return { granted: false };
      }
    }

    const local = await getVaultProgress();
    const tier = pickTierToIncrement(local.attemptsLeft);
    if (!tier) {
      Alert.alert('Could not claim', 'Your Vault reserves are full.');
      return { granted: false };
    }
    const attemptsLeft = {
      ...local.attemptsLeft,
      [tier]: local.attemptsLeft[tier] + 1,
    };
    const next: VaultProgress = { ...local, attemptsLeft };
    await setVaultProgress(next);
    setProgress(next);
    Alert.alert('Claimed', 'A free mission attempt was added to your Vault.');
    return { granted: true };
  }, [firestoreUid]);

  const dismissReward = useCallback(() => setRewardModalVisible(false), []);

  const value = useMemo(
    () => ({
      progress,
      hydrated,
      recordGlimpseSuccess,
      recordGlimpseFailure,
      debugBuyThreeVaultCredits,
      claimMonthlyGiftNotificationReward,
    }),
    [
      progress,
      hydrated,
      recordGlimpseSuccess,
      recordGlimpseFailure,
      debugBuyThreeVaultCredits,
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
