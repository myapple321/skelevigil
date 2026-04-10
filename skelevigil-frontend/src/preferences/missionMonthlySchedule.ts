import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@skelevigil/mission-monthly-next-fire-ms';

/** Unix ms when the next monthly gift local notification should fire. */
export async function getMonthlyGiftNextFireAtMs(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export async function setMonthlyGiftNextFireAtMs(ms: number | null): Promise<void> {
  if (ms === null) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, String(Math.trunc(ms)));
}
