import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Alert } from 'react-native';

import {
  cancelMissionScheduledNotifications,
  clearMonthlyGiftScheduleStorage,
  syncMissionNotifications,
} from '@/src/notifications/missionNotificationsController';
import { requestMissionNotificationPermission } from '@/src/notifications/requestMissionNotificationPermission';
import { getFirebaseAuth } from '@/src/firebase/firebaseApp';
import { getMissionAlertsEnabled, setMissionAlertsEnabled as persistMissionAlerts } from '@/src/preferences/missionAlertPreference';

type MissionAlertContextValue = {
  missionAlertsEnabled: boolean;
  setMissionAlertsEnabled: (enabled: boolean) => Promise<void>;
  hydrated: boolean;
};

const MissionAlertContext = createContext<MissionAlertContextValue | null>(null);

export function MissionAlertProvider({ children }: { children: ReactNode }) {
  const [missionAlertsEnabled, setMissionAlertsEnabledState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void getMissionAlertsEnabled().then((v) => {
      setMissionAlertsEnabledState(v);
      setHydrated(true);
    });
  }, []);

  const setMissionAlertsEnabled = useCallback(async (enabled: boolean) => {
    if (!enabled) {
      setMissionAlertsEnabledState(false);
      await persistMissionAlerts(false);
      await cancelMissionScheduledNotifications();
      await clearMonthlyGiftScheduleStorage();
      return;
    }

    const ok = await requestMissionNotificationPermission();
    if (!ok) {
      Alert.alert(
        'Notifications disabled',
        'Mission Alerts need notification permission. You can enable them in Settings when you are ready.',
      );
      return;
    }

    setMissionAlertsEnabledState(true);
    await persistMissionAlerts(true);
    await syncMissionNotifications({
      missionAlertsEnabled: true,
      signedIn: getFirebaseAuth().currentUser != null,
    });
  }, []);

  const value = useMemo(
    () => ({ missionAlertsEnabled, setMissionAlertsEnabled, hydrated }),
    [missionAlertsEnabled, setMissionAlertsEnabled, hydrated],
  );

  return <MissionAlertContext.Provider value={value}>{children}</MissionAlertContext.Provider>;
}

export function useMissionAlert(): MissionAlertContextValue {
  const ctx = useContext(MissionAlertContext);
  if (!ctx) {
    throw new Error('useMissionAlert must be used within MissionAlertProvider');
  }
  return ctx;
}
