import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';

import { getFirebaseFirestore } from '@/src/firebase/firebaseApp';
import {
  DEFAULT_VAULT_PROGRESS,
  FREE_MISSION_CREDIT_ALLOWANCE,
  type VaultAttemptsLeft,
  type VaultProgress,
} from '@/src/preferences/vaultProgress';

/**
 * Per-phase reserve ceilings for free restoration (and room for purchases).
 * Must not equal starting reserves: e.g. Trance starts at 1 but must be able to grow (1 → 2 → …).
 */
export const VAULT_RESERVE_CAP: VaultAttemptsLeft = {
  trance: 10,
  stare: 20,
  glimpse: 50,
};

const COLLECTION = 'userVaultProgress';

function vaultDocRef(uid: string) {
  return doc(getFirebaseFirestore(), COLLECTION, uid);
}

function clampAttempts(a: Partial<VaultAttemptsLeft> | undefined): VaultAttemptsLeft {
  return {
    glimpse:
      typeof a?.glimpse === 'number'
        ? Math.max(0, Math.trunc(a.glimpse))
        : DEFAULT_VAULT_PROGRESS.attemptsLeft.glimpse,
    stare:
      typeof a?.stare === 'number'
        ? Math.max(0, Math.trunc(a.stare))
        : DEFAULT_VAULT_PROGRESS.attemptsLeft.stare,
    trance:
      typeof a?.trance === 'number'
        ? Math.max(0, Math.trunc(a.trance))
        : DEFAULT_VAULT_PROGRESS.attemptsLeft.trance,
  };
}

function progressFromDoc(data: Record<string, unknown> | undefined): VaultProgress {
  if (!data) return DEFAULT_VAULT_PROGRESS;
  const smRaw = data.successfulMissions;
  const successfulMissions =
    typeof smRaw === 'number' ? Math.max(0, Math.min(10, Math.trunc(smRaw))) : 0;
  const alRaw = data.attemptsLeft;
  const attemptsLeft =
    alRaw && typeof alRaw === 'object' && !Array.isArray(alRaw)
      ? clampAttempts(alRaw as Partial<VaultAttemptsLeft>)
      : DEFAULT_VAULT_PROGRESS.attemptsLeft;
  const lmRaw = data.lifetimeMissions;
  const lifetimeMissions =
    typeof lmRaw === 'number' ? Math.max(0, Math.trunc(lmRaw)) : DEFAULT_VAULT_PROGRESS.lifetimeMissions;

  return {
    successfulMissions,
    lifetimeMissions,
    creditsTowardFreeMission: Math.max(0, FREE_MISSION_CREDIT_ALLOWANCE - successfulMissions),
    attemptsLeft,
  };
}

function toFirestorePayload(p: VaultProgress): Record<string, unknown> {
  return {
    successfulMissions: p.successfulMissions,
    lifetimeMissions: p.lifetimeMissions,
    attemptsLeft: {
      glimpse: p.attemptsLeft.glimpse,
      stare: p.attemptsLeft.stare,
      trance: p.attemptsLeft.trance,
    },
    updatedAt: serverTimestamp(),
  };
}

/** Highest difficulty below cap: Trance > Stare > Glimpse. */
export function pickTierToIncrement(attempts: VaultAttemptsLeft): keyof VaultAttemptsLeft | null {
  if (attempts.trance < VAULT_RESERVE_CAP.trance) return 'trance';
  if (attempts.stare < VAULT_RESERVE_CAP.stare) return 'stare';
  if (attempts.glimpse < VAULT_RESERVE_CAP.glimpse) return 'glimpse';
  return null;
}

export function nextProgressAfterSuccess(prev: VaultProgress): {
  next: VaultProgress;
  grantedFreeAttempt: boolean;
} {
  let successfulMissions = prev.successfulMissions + 1;
  const lifetimeMissions = prev.lifetimeMissions + 1;
  const attemptsLeft = { ...prev.attemptsLeft };
  let grantedFreeAttempt = false;

  if (successfulMissions >= FREE_MISSION_CREDIT_ALLOWANCE) {
    successfulMissions = 0;
    const tier = pickTierToIncrement(attemptsLeft);
    if (tier) {
      attemptsLeft[tier] += 1;
      grantedFreeAttempt = true;
    }
  }

  return {
    grantedFreeAttempt,
    next: {
      ...prev,
      successfulMissions,
      lifetimeMissions,
      attemptsLeft,
      creditsTowardFreeMission: Math.max(0, FREE_MISSION_CREDIT_ALLOWANCE - successfulMissions),
    },
  };
}

export async function seedVaultDocIfMissing(uid: string, seed: VaultProgress): Promise<void> {
  const ref = vaultDocRef(uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, toFirestorePayload(seed), { merge: true });
}

export function subscribeVaultProgress(
  uid: string,
  onProgress: (p: VaultProgress) => void,
): Unsubscribe {
  return onSnapshot(
    vaultDocRef(uid),
    (snap) => {
      if (!snap.exists()) {
        onProgress(DEFAULT_VAULT_PROGRESS);
        return;
      }
      onProgress(progressFromDoc(snap.data() as Record<string, unknown>));
    },
    () => {
      onProgress(DEFAULT_VAULT_PROGRESS);
    },
  );
}

export async function transactionRecordGlimpseSuccess(uid: string): Promise<{
  grantedFreeAttempt: boolean;
}> {
  const ref = vaultDocRef(uid);
  const grantedFreeAttempt = await runTransaction(getFirebaseFirestore(), async (tx) => {
    const snap = await tx.get(ref);
    const prev = snap.exists()
      ? progressFromDoc(snap.data() as Record<string, unknown>)
      : DEFAULT_VAULT_PROGRESS;

    const { next, grantedFreeAttempt: granted } = nextProgressAfterSuccess(prev);
    tx.set(ref, toFirestorePayload(next), { merge: true });
    return granted;
  });

  return { grantedFreeAttempt };
}

export async function transactionRecordGlimpseFailure(uid: string): Promise<void> {
  const ref = vaultDocRef(uid);
  await runTransaction(getFirebaseFirestore(), async (tx) => {
    const snap = await tx.get(ref);
    const prev = snap.exists()
      ? progressFromDoc(snap.data() as Record<string, unknown>)
      : DEFAULT_VAULT_PROGRESS;
    const attemptsLeft = {
      ...prev.attemptsLeft,
      glimpse: Math.max(0, prev.attemptsLeft.glimpse - 1),
    };
    const next: VaultProgress = {
      ...prev,
      attemptsLeft,
      creditsTowardFreeMission: Math.max(0, FREE_MISSION_CREDIT_ALLOWANCE - prev.successfulMissions),
    };
    tx.set(ref, toFirestorePayload(next), { merge: true });
  });
}

export async function transactionDebugBuyThreeGlimpse(uid: string): Promise<void> {
  const ref = vaultDocRef(uid);
  await runTransaction(getFirebaseFirestore(), async (tx) => {
    const snap = await tx.get(ref);
    const prev = snap.exists()
      ? progressFromDoc(snap.data() as Record<string, unknown>)
      : DEFAULT_VAULT_PROGRESS;
    const attemptsLeft = {
      ...prev.attemptsLeft,
      glimpse: prev.attemptsLeft.glimpse + 3,
    };
    const next: VaultProgress = { ...prev, attemptsLeft };
    tx.set(ref, toFirestorePayload(next), { merge: true });
  });
}
