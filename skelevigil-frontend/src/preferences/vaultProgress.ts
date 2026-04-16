import AsyncStorage from '@react-native-async-storage/async-storage';

import { getFirebaseAuth } from '@/src/firebase/firebaseApp';

/** Pre–per-UID vault; migrated once on first read for the active session. */
const LEGACY_VAULT_STORAGE_KEY = '@skelevigil/vault-progress-v1';

function currentVaultStorageKey(): string {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return '@skelevigil/vault-progress-v2/unsigned';
  return `@skelevigil/vault-progress-v2/uid/${uid}`;
}

/** One-time copy from legacy global key into this account bucket, then drop legacy. */
async function migrateLegacyVaultIfNeeded(targetKey: string): Promise<void> {
  const existing = await AsyncStorage.getItem(targetKey);
  if (existing) return;
  const legacy = await AsyncStorage.getItem(LEGACY_VAULT_STORAGE_KEY);
  if (!legacy) return;
  await AsyncStorage.setItem(targetKey, legacy);
  await AsyncStorage.removeItem(LEGACY_VAULT_STORAGE_KEY);
}

export type VaultAttemptsLeft = {
  glimpse: number;
  stare: number;
  trance: number;
};

export type VaultProgress = {
  creditsTowardFreeMission: number;
  successfulMissions: number;
  /** Running total of successful missions (never reset by the 10-mission restoration cycle). */
  lifetimeMissions: number;
  attemptsLeft: VaultAttemptsLeft;
  /**
   * Monthly gift rotation: 0 = Trance, 1 = Stare, 2 = Glimpse (advances after each claim attempt).
   */
  giftRotationIndex: number;
};

export const FREE_MISSION_CREDIT_ALLOWANCE = 10;

export const DEFAULT_VAULT_PROGRESS: VaultProgress = {
  creditsTowardFreeMission: FREE_MISSION_CREDIT_ALLOWANCE,
  successfulMissions: 0,
  lifetimeMissions: 0,
  giftRotationIndex: 0,
  attemptsLeft: {
    glimpse: 3,
    stare: 2,
    trance: 1,
  },
};

/**
 * Debug / QA: coerce raw numbers into a valid VaultProgress. successfulMissions is clamped
 * 0..FREE_MISSION_CREDIT_ALLOWANCE so it matches Firestore `progressFromDoc` behavior.
 */
export function normalizeVaultProgressFromDebugInput(input: {
  glimpse: number;
  stare: number;
  trance: number;
  successfulMissions: number;
  lifetimeMissions: number;
  giftRotationIndex: number;
}): VaultProgress {
  const successfulMissions = Math.max(
    0,
    Math.min(FREE_MISSION_CREDIT_ALLOWANCE, Math.trunc(input.successfulMissions)),
  );
  const lifetimeMissions = Math.max(0, Math.trunc(input.lifetimeMissions));
  const giftRotationIndex = Number.isFinite(input.giftRotationIndex)
    ? Math.min(2, Math.max(0, Math.trunc(input.giftRotationIndex) % 3))
    : 0;
  return {
    creditsTowardFreeMission: Math.max(0, FREE_MISSION_CREDIT_ALLOWANCE - successfulMissions),
    successfulMissions,
    lifetimeMissions,
    giftRotationIndex,
    attemptsLeft: {
      glimpse: Math.max(0, Math.trunc(input.glimpse)),
      stare: Math.max(0, Math.trunc(input.stare)),
      trance: Math.max(0, Math.trunc(input.trance)),
    },
  };
}

export async function getVaultProgress(): Promise<VaultProgress> {
  try {
    const key = currentVaultStorageKey();
    await migrateLegacyVaultIfNeeded(key);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return DEFAULT_VAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<VaultProgress> | null;
    if (!parsed || typeof parsed !== 'object') return DEFAULT_VAULT_PROGRESS;

    const attempts = parsed.attemptsLeft;
    const successfulMissions =
      typeof parsed.successfulMissions === 'number'
        ? Math.max(0, Math.trunc(parsed.successfulMissions))
        : DEFAULT_VAULT_PROGRESS.successfulMissions;
    const lifetimeMissions =
      typeof parsed.lifetimeMissions === 'number'
        ? Math.max(0, Math.trunc(parsed.lifetimeMissions))
        : DEFAULT_VAULT_PROGRESS.lifetimeMissions;
    const griRaw = parsed.giftRotationIndex;
    const giftRotationIndex =
      typeof griRaw === 'number' && Number.isFinite(griRaw)
        ? Math.min(2, Math.max(0, Math.trunc(griRaw) % 3))
        : DEFAULT_VAULT_PROGRESS.giftRotationIndex;
    return {
      // Source of truth: allowance (10) minus successful missions.
      creditsTowardFreeMission: Math.max(0, FREE_MISSION_CREDIT_ALLOWANCE - successfulMissions),
      successfulMissions,
      lifetimeMissions,
      giftRotationIndex,
      attemptsLeft: {
        glimpse:
          attempts && typeof attempts.glimpse === 'number'
            ? Math.max(0, Math.trunc(attempts.glimpse))
            : DEFAULT_VAULT_PROGRESS.attemptsLeft.glimpse,
        stare:
          attempts && typeof attempts.stare === 'number'
            ? Math.max(0, Math.trunc(attempts.stare))
            : DEFAULT_VAULT_PROGRESS.attemptsLeft.stare,
        trance:
          attempts && typeof attempts.trance === 'number'
            ? Math.max(0, Math.trunc(attempts.trance))
            : DEFAULT_VAULT_PROGRESS.attemptsLeft.trance,
      },
    };
  } catch {
    return DEFAULT_VAULT_PROGRESS;
  }
}

export async function setVaultProgress(progress: VaultProgress): Promise<void> {
  const key = currentVaultStorageKey();
  await migrateLegacyVaultIfNeeded(key);
  await AsyncStorage.setItem(key, JSON.stringify(progress));
}
