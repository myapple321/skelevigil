import AsyncStorage from '@react-native-async-storage/async-storage';

export const LOCK_SCREEN_MINUTE_OPTIONS = [5, 10, 20, 30] as const;
export type LockScreenMinutes = (typeof LOCK_SCREEN_MINUTE_OPTIONS)[number];

const LOCK_MINUTES_KEY = '@skelevigil/lock-screen-minutes';
const KEEP_AWAKE_MISSIONS_KEY = '@skelevigil/keep-awake-during-missions';

export const DEFAULT_LOCK_SCREEN_MINUTES: LockScreenMinutes = 30;
export const DEFAULT_KEEP_AWAKE_DURING_MISSIONS = false;

function parseLockScreenMinutes(raw: string | null): LockScreenMinutes {
  const asNum = raw == null ? Number.NaN : Number(raw);
  if (
    LOCK_SCREEN_MINUTE_OPTIONS.some((option) => option === asNum)
  ) {
    return asNum as LockScreenMinutes;
  }
  return DEFAULT_LOCK_SCREEN_MINUTES;
}

export async function getLockScreenMinutes(): Promise<LockScreenMinutes> {
  try {
    const raw = await AsyncStorage.getItem(LOCK_MINUTES_KEY);
    return parseLockScreenMinutes(raw);
  } catch {
    return DEFAULT_LOCK_SCREEN_MINUTES;
  }
}

export async function setLockScreenMinutes(minutes: LockScreenMinutes): Promise<void> {
  await AsyncStorage.setItem(LOCK_MINUTES_KEY, String(minutes));
}

export async function getKeepAwakeDuringMissions(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEEP_AWAKE_MISSIONS_KEY);
    if (raw == null) return DEFAULT_KEEP_AWAKE_DURING_MISSIONS;
    return raw === '1' || raw === 'true';
  } catch {
    return DEFAULT_KEEP_AWAKE_DURING_MISSIONS;
  }
}

export async function setKeepAwakeDuringMissions(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEEP_AWAKE_MISSIONS_KEY, enabled ? '1' : '0');
}
