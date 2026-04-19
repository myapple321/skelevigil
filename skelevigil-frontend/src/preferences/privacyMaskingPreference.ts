import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@skelevigil/privacy-masking';

/** Default off so existing users see full email until they opt in. */
export async function getPrivacyMaskingEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === null) return false;
    return raw === '1' || raw === 'true';
  } catch {
    return false;
  }
}

export async function setPrivacyMaskingEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
}
