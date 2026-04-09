import AsyncStorage from '@react-native-async-storage/async-storage';

export type VaultAttemptsLeft = {
  glimpse: number;
  stare: number;
  trance: number;
};

export type VaultProgress = {
  creditsTowardFreeMission: number;
  successfulMissions: number;
  attemptsLeft: VaultAttemptsLeft;
};

const STORAGE_KEY = '@skelevigil/vault-progress-v1';
export const FREE_MISSION_CREDIT_ALLOWANCE = 10;

export const DEFAULT_VAULT_PROGRESS: VaultProgress = {
  creditsTowardFreeMission: FREE_MISSION_CREDIT_ALLOWANCE,
  successfulMissions: 0,
  attemptsLeft: {
    glimpse: 3,
    stare: 2,
    trance: 1,
  },
};

export async function getVaultProgress(): Promise<VaultProgress> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<VaultProgress> | null;
    if (!parsed || typeof parsed !== 'object') return DEFAULT_VAULT_PROGRESS;

    const attempts = parsed.attemptsLeft;
    const successfulMissions =
      typeof parsed.successfulMissions === 'number'
        ? Math.max(0, Math.trunc(parsed.successfulMissions))
        : DEFAULT_VAULT_PROGRESS.successfulMissions;
    return {
      // Source of truth: allowance (10) minus successful missions.
      creditsTowardFreeMission: Math.max(0, FREE_MISSION_CREDIT_ALLOWANCE - successfulMissions),
      successfulMissions,
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
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}
