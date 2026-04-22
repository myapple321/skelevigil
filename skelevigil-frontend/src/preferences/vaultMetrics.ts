import AsyncStorage from '@react-native-async-storage/async-storage';

import { getFirebaseAuth } from '@/src/firebase/firebaseApp';
import type { VaultAttemptsLeft } from '@/src/preferences/vaultProgress';

function currentVaultMetricsStorageKey(): string {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return '@skelevigil/vault-metrics-v1/unsigned';
  return `@skelevigil/vault-metrics-v1/uid/${uid}`;
}

type PhaseMetric = {
  attempts: number;
  successes: number;
  failures: number;
};

export type VaultMetrics = {
  totalAttempts: number;
  totalSuccesses: number;
  totalFailures: number;
  currentStreak: number;
  bestStreak: number;
  phase: Record<keyof VaultAttemptsLeft, PhaseMetric>;
  /** Successes by phase within the current active streak (reset on failure). */
  currentStreakPhaseWins: Record<keyof VaultAttemptsLeft, number>;
};

const EMPTY_PHASE_METRIC: PhaseMetric = { attempts: 0, successes: 0, failures: 0 };
const EMPTY_STREAK_PHASE_WINS: Record<keyof VaultAttemptsLeft, number> = {
  glimpse: 0,
  stare: 0,
  trance: 0,
};

export const DEFAULT_VAULT_METRICS: VaultMetrics = {
  totalAttempts: 0,
  totalSuccesses: 0,
  totalFailures: 0,
  currentStreak: 0,
  bestStreak: 0,
  phase: {
    glimpse: { ...EMPTY_PHASE_METRIC },
    stare: { ...EMPTY_PHASE_METRIC },
    trance: { ...EMPTY_PHASE_METRIC },
  },
  currentStreakPhaseWins: { ...EMPTY_STREAK_PHASE_WINS },
};

function normalizePhaseMetric(raw: unknown): PhaseMetric {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_PHASE_METRIC };
  const p = raw as Partial<PhaseMetric>;
  return {
    attempts: typeof p.attempts === 'number' ? Math.max(0, Math.trunc(p.attempts)) : 0,
    successes: typeof p.successes === 'number' ? Math.max(0, Math.trunc(p.successes)) : 0,
    failures: typeof p.failures === 'number' ? Math.max(0, Math.trunc(p.failures)) : 0,
  };
}

function normalizeMetrics(raw: unknown): VaultMetrics {
  if (!raw || typeof raw !== 'object') return DEFAULT_VAULT_METRICS;
  const data = raw as Partial<VaultMetrics>;
  const phaseRaw = data.phase;
  const streakWinsRaw = data.currentStreakPhaseWins;

  return {
    totalAttempts:
      typeof data.totalAttempts === 'number' ? Math.max(0, Math.trunc(data.totalAttempts)) : 0,
    totalSuccesses:
      typeof data.totalSuccesses === 'number' ? Math.max(0, Math.trunc(data.totalSuccesses)) : 0,
    totalFailures:
      typeof data.totalFailures === 'number' ? Math.max(0, Math.trunc(data.totalFailures)) : 0,
    currentStreak:
      typeof data.currentStreak === 'number' ? Math.max(0, Math.trunc(data.currentStreak)) : 0,
    bestStreak: typeof data.bestStreak === 'number' ? Math.max(0, Math.trunc(data.bestStreak)) : 0,
    phase: {
      glimpse: normalizePhaseMetric((phaseRaw as Record<string, unknown> | undefined)?.glimpse),
      stare: normalizePhaseMetric((phaseRaw as Record<string, unknown> | undefined)?.stare),
      trance: normalizePhaseMetric((phaseRaw as Record<string, unknown> | undefined)?.trance),
    },
    currentStreakPhaseWins: {
      glimpse:
        typeof (streakWinsRaw as Record<string, unknown> | undefined)?.glimpse === 'number'
          ? Math.max(0, Math.trunc((streakWinsRaw as Record<string, number>).glimpse))
          : 0,
      stare:
        typeof (streakWinsRaw as Record<string, unknown> | undefined)?.stare === 'number'
          ? Math.max(0, Math.trunc((streakWinsRaw as Record<string, number>).stare))
          : 0,
      trance:
        typeof (streakWinsRaw as Record<string, unknown> | undefined)?.trance === 'number'
          ? Math.max(0, Math.trunc((streakWinsRaw as Record<string, number>).trance))
          : 0,
    },
  };
}

export async function getVaultMetrics(): Promise<VaultMetrics> {
  try {
    const raw = await AsyncStorage.getItem(currentVaultMetricsStorageKey());
    if (!raw) return DEFAULT_VAULT_METRICS;
    return normalizeMetrics(JSON.parse(raw));
  } catch {
    return DEFAULT_VAULT_METRICS;
  }
}

export async function setVaultMetrics(metrics: VaultMetrics): Promise<void> {
  await AsyncStorage.setItem(currentVaultMetricsStorageKey(), JSON.stringify(metrics));
}

export function nextVaultMetricsAfterMission(
  prev: VaultMetrics,
  tier: keyof VaultAttemptsLeft,
  success: boolean,
): VaultMetrics {
  const next: VaultMetrics = {
    ...prev,
    phase: {
      glimpse: { ...prev.phase.glimpse },
      stare: { ...prev.phase.stare },
      trance: { ...prev.phase.trance },
    },
    currentStreakPhaseWins: { ...prev.currentStreakPhaseWins },
  };

  next.totalAttempts += 1;
  next.phase[tier].attempts += 1;

  if (success) {
    next.totalSuccesses += 1;
    next.phase[tier].successes += 1;
    next.currentStreak += 1;
    next.bestStreak = Math.max(next.bestStreak, next.currentStreak);
    next.currentStreakPhaseWins[tier] += 1;
  } else {
    next.totalFailures += 1;
    next.phase[tier].failures += 1;
    next.currentStreak = 0;
    next.currentStreakPhaseWins = { ...EMPTY_STREAK_PHASE_WINS };
  }

  return next;
}

export function calcRatePercent(successes: number, attempts: number): number {
  if (attempts <= 0) return 0;
  return Math.round((successes / attempts) * 100);
}

/**
 * 0..100 weighted quality signal:
 * - success rate 70%
 * - streak quality (best streak / 10, capped) 20%
 * - phase balance (mean per-phase success) 10%
 */
export function calcEfficiencyScore(metrics: VaultMetrics): number {
  const successRate = calcRatePercent(metrics.totalSuccesses, metrics.totalAttempts);
  const streakQuality = Math.min(100, Math.round((metrics.bestStreak / 10) * 100));
  const phaseRates = (['glimpse', 'stare', 'trance'] as const).map((tier) =>
    calcRatePercent(metrics.phase[tier].successes, metrics.phase[tier].attempts),
  );
  const phaseBalance = Math.round((phaseRates[0] + phaseRates[1] + phaseRates[2]) / 3);
  return Math.round(successRate * 0.7 + streakQuality * 0.2 + phaseBalance * 0.1);
}
