import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { RESULTS, requestNotifications } from 'react-native-permissions';

/**
 * iOS: `react-native-permissions` notification APIs require the optional Notifications
 * native subspec (`setup_permissions(['Notifications'])` + pod install). Dev clients built
 * without that hit "Notifications permission pod is missing". Expo ships notification
 * permission with `expo-notifications`, so we use that on iOS.
 *
 * Android: use `react-native-permissions` for POST_NOTIFICATIONS (API 33+).
 */
export async function requestMissionNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const res = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: true },
    });
    return res.granted;
  }

  const notif = await requestNotifications(['alert', 'sound', 'badge']);
  return notif.status === RESULTS.GRANTED || notif.status === RESULTS.LIMITED;
}
