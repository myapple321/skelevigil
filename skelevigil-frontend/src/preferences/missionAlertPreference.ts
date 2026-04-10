import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@skelevigil/mission-alerts-enabled';

/** Default OFF until the user enables Mission Alerts in System. */
export async function getMissionAlertsEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === null) return false;
    return raw === '1' || raw === 'true';
  } catch {
    return false;
  }
}

export async function setMissionAlertsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
}
