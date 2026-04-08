import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@skelevigil/sfx-enabled';

/** Default OFF until the user enables sound in System. */
export async function getSfxEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === null) return false;
    return raw === '1' || raw === 'true';
  } catch {
    return false;
  }
}

export async function setSfxEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
}
