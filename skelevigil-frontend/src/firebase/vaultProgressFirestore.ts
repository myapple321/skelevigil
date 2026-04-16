import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';

import { getFirebaseAuth, getFirebaseFirestore } from '@/src/firebase/firebaseApp';
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
const USERS_COLLECTION = 'users';

function vaultDocRef(uid: string) {
  return doc(getFirebaseFirestore(), COLLECTION, uid);
}

function usersDocRef(uid: string) {
  return doc(getFirebaseFirestore(), USERS_COLLECTION, uid);
}

/** Primary provider id for profile / mirror metadata (e.g. google.com). */
function resolveAuthProviderForMirror(): string {
  const u = getFirebaseAuth().currentUser;
  if (!u) return 'unknown';
  const fromList = u.providerData[0]?.providerId;
  return fromList ?? u.providerId ?? 'unknown';
}

/**
 * Public profile doc mirror (`users/{uid}`) — kept in sync with `userVaultProgress/{uid}`.
 * `vault` uses product field names plus analytics fields; canonical game state remains on userVaultProgress.
 */
function usersMirrorPayload(p: VaultProgress, authProvider: string): Record<string, unknown> {
  return {
    vault: {
      glimpseReserves: p.attemptsLeft.glimpse,
      stareReserves: p.attemptsLeft.stare,
      tranceReserves: p.attemptsLeft.trance,
      restorationProgress: p.successfulMissions,
      lifetimeMissions: p.lifetimeMissions,
      giftRotationIndex: p.giftRotationIndex,
    },
    lastSync: serverTimestamp(),
    authProvider,
  };
}

export async function syncUserVaultProgressAndUsersMirror(uid: string, p: VaultProgress): Promise<void> {
  const authProvider = resolveAuthProviderForMirror();
  const db = getFirebaseFirestore();
  const batch = writeBatch(db);
  batch.set(vaultDocRef(uid), toFirestorePayload(p), { merge: true });
  batch.set(usersDocRef(uid), usersMirrorPayload(p, authProvider), { merge: true });
  await batch.commit();
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
  const griRaw = data.giftRotationIndex;
  const giftRotationIndex =
    typeof griRaw === 'number' && Number.isFinite(griRaw)
      ? Math.min(2, Math.max(0, Math.trunc(griRaw) % 3))
      : DEFAULT_VAULT_PROGRESS.giftRotationIndex;

  return {
    successfulMissions,
    lifetimeMissions,
    giftRotationIndex,
    creditsTowardFreeMission: Math.max(0, FREE_MISSION_CREDIT_ALLOWANCE - successfulMissions),
    attemptsLeft,
  };
}

function toFirestorePayload(p: VaultProgress): Record<string, unknown> {
  return {
    successfulMissions: p.successfulMissions,
    lifetimeMissions: p.lifetimeMissions,
    giftRotationIndex: p.giftRotationIndex,
    attemptsLeft: {
      glimpse: p.attemptsLeft.glimpse,
      stare: p.attemptsLeft.stare,
      trance: p.attemptsLeft.trance,
    },
    updatedAt: serverTimestamp(),
  };
}

/** Monthly gift: Trance → Stare → Glimpse by index, then wrap. */
export const GIFT_ROTATION_ORDER: (keyof VaultAttemptsLeft)[] = ['trance', 'stare', 'glimpse'];

/** Post-claim confirmation (modal), per product copy. */
export function freeMissionClaimedModalText(tier: keyof VaultAttemptsLeft): string {
  const name = tier === 'trance' ? 'Trance' : tier === 'stare' ? 'Stare' : 'Glimpse';
  return `Free Mission Claimed! Your ${name} reserves have been increased by 1.`;
}

/**
 * Pure rotational monthly gift: always +1 on the current phase index, then advance 0→1→2→0.
 * No reserve caps (monthly gift is additive regardless of current balance).
 */
export function applyMonthlyGiftRotationClaim(prev: VaultProgress): {
  next: VaultProgress;
  securedTier: keyof VaultAttemptsLeft;
} {
  const rawGri = prev.giftRotationIndex;
  const normalizedGri =
    typeof rawGri === 'number' && Number.isFinite(rawGri) ? Math.trunc(rawGri) : 0;
  const idx = Math.min(2, Math.max(0, normalizedGri % 3));
  const tier = GIFT_ROTATION_ORDER[idx];
  const attemptsLeft = { ...prev.attemptsLeft };
  attemptsLeft[tier] += 1;
  const nextIndex = (idx + 1) % 3;
  return {
    next: {
      ...prev,
      attemptsLeft,
      giftRotationIndex: nextIndex,
    },
    securedTier: tier,
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

/** Auth restore helper: fetch existing canonical progress, or initialize from local seed. */
export async function fetchOrCreateVaultProgress(
  uid: string,
  seed: VaultProgress,
): Promise<VaultProgress> {
  const authProvider = resolveAuthProviderForMirror();
  const ref = vaultDocRef(uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const p = progressFromDoc(snap.data() as Record<string, unknown>);
    await setDoc(usersDocRef(uid), usersMirrorPayload(p, authProvider), { merge: true });
    return p;
  }
  const seeded: VaultProgress = {
    ...seed,
    attemptsLeft: { ...seed.attemptsLeft },
    creditsTowardFreeMission: Math.max(0, FREE_MISSION_CREDIT_ALLOWANCE - seed.successfulMissions),
  };
  await syncUserVaultProgressAndUsersMirror(uid, seeded);
  return seeded;
}

/** Debug / QA: overwrite vault doc with default reserves and mission progress. */
export async function resetVaultProgressDocToDefault(uid: string): Promise<void> {
  await syncUserVaultProgressAndUsersMirror(uid, DEFAULT_VAULT_PROGRESS);
}

/** Debug / QA: write full vault state (same shape as normal sync). */
export async function writeVaultProgressDoc(uid: string, p: VaultProgress): Promise<void> {
  await syncUserVaultProgressAndUsersMirror(uid, p);
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
    const ap = resolveAuthProviderForMirror();
    tx.set(ref, toFirestorePayload(next), { merge: true });
    tx.set(usersDocRef(uid), usersMirrorPayload(next, ap), { merge: true });
    return granted;
  });

  return { grantedFreeAttempt };
}

function nextProgressAfterTierDebit(
  prev: VaultProgress,
  tier: keyof VaultAttemptsLeft,
): VaultProgress {
  const attemptsLeft = {
    ...prev.attemptsLeft,
    [tier]: Math.max(0, prev.attemptsLeft[tier] - 1),
  };
  return {
    ...prev,
    attemptsLeft,
    creditsTowardFreeMission: Math.max(0, FREE_MISSION_CREDIT_ALLOWANCE - prev.successfulMissions),
  };
}

export async function transactionRecordMissionFailure(
  uid: string,
  tier: keyof VaultAttemptsLeft,
): Promise<void> {
  const ref = vaultDocRef(uid);
  await runTransaction(getFirebaseFirestore(), async (tx) => {
    const snap = await tx.get(ref);
    const prev = snap.exists()
      ? progressFromDoc(snap.data() as Record<string, unknown>)
      : DEFAULT_VAULT_PROGRESS;
    const next = nextProgressAfterTierDebit(prev, tier);
    const ap = resolveAuthProviderForMirror();
    tx.set(ref, toFirestorePayload(next), { merge: true });
    tx.set(usersDocRef(uid), usersMirrorPayload(next, ap), { merge: true });
  });
}

/** @deprecated Prefer {@link transactionRecordMissionFailure} with explicit tier. */
export async function transactionRecordGlimpseFailure(uid: string): Promise<void> {
  return transactionRecordMissionFailure(uid, 'glimpse');
}

/** Spend one reserve for the given phase tier (e.g. New Mission). */
export async function transactionDeductAttempt(
  uid: string,
  tier: keyof VaultAttemptsLeft,
): Promise<void> {
  const ref = vaultDocRef(uid);
  await runTransaction(getFirebaseFirestore(), async (tx) => {
    const snap = await tx.get(ref);
    const prev = snap.exists()
      ? progressFromDoc(snap.data() as Record<string, unknown>)
      : DEFAULT_VAULT_PROGRESS;
    const next = nextProgressAfterTierDebit(prev, tier);
    const ap = resolveAuthProviderForMirror();
    tx.set(ref, toFirestorePayload(next), { merge: true });
    tx.set(usersDocRef(uid), usersMirrorPayload(next, ap), { merge: true });
  });
}

/** Spend one Glimpse reserve (e.g. New Mission) without recording a failed mission. */
export async function transactionDeductGlimpseAttempt(uid: string): Promise<void> {
  return transactionDeductAttempt(uid, 'glimpse');
}

/** +3 Mission Reserves for one phase (debug / post-IAP success). */
export async function transactionGrantThreeVaultCreditsForPhase(
  uid: string,
  tier: keyof VaultAttemptsLeft,
): Promise<void> {
  const ref = vaultDocRef(uid);
  await runTransaction(getFirebaseFirestore(), async (tx) => {
    const snap = await tx.get(ref);
    const prev = snap.exists()
      ? progressFromDoc(snap.data() as Record<string, unknown>)
      : DEFAULT_VAULT_PROGRESS;
    const attemptsLeft = {
      ...prev.attemptsLeft,
      [tier]: prev.attemptsLeft[tier] + 3,
    };
    const next: VaultProgress = { ...prev, attemptsLeft };
    const ap = resolveAuthProviderForMirror();
    tx.set(ref, toFirestorePayload(next), { merge: true });
    tx.set(usersDocRef(uid), usersMirrorPayload(next, ap), { merge: true });
  });
}

export async function transactionDebugBuyThreeGlimpse(uid: string): Promise<void> {
  return transactionGrantThreeVaultCreditsForPhase(uid, 'glimpse');
}

/** Monthly gift: pure rotational +1; persists giftRotationIndex. */
export async function transactionGrantMonthlyGiftRotation(uid: string): Promise<{
  securedTier: keyof VaultAttemptsLeft;
  nextGiftRotationIndex: number;
  nextProgress: VaultProgress;
}> {
  const ref = vaultDocRef(uid);
  return runTransaction(getFirebaseFirestore(), async (tx) => {
    const snap = await tx.get(ref);
    const prev = snap.exists()
      ? progressFromDoc(snap.data() as Record<string, unknown>)
      : DEFAULT_VAULT_PROGRESS;
    const { next, securedTier } = applyMonthlyGiftRotationClaim(prev);
    const ap = resolveAuthProviderForMirror();
    tx.set(ref, toFirestorePayload(next), { merge: true });
    tx.set(usersDocRef(uid), usersMirrorPayload(next, ap), { merge: true });
    return {
      securedTier,
      nextGiftRotationIndex: next.giftRotationIndex,
      nextProgress: next,
    };
  });
}

/** Lightweight session ping used by inactivity warning "Continue Mission". */
export async function writeSessionHeartbeat(uid: string): Promise<void> {
  await setDoc(
    vaultDocRef(uid),
    {
      sessionHeartbeatAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
