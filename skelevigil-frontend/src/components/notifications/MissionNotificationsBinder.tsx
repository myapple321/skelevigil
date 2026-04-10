import { onAuthStateChanged } from 'firebase/auth';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useMissionAlert } from '@/src/contexts/MissionAlertContext';
import { useVaultProgress } from '@/src/contexts/VaultProgressContext';
import { getFirebaseAuth } from '@/src/firebase/firebaseApp';
import {
  KIND_MONTHLY_GIFT,
  parseNotificationKind,
  rescheduleMonthlyGiftFromNow,
  syncMissionNotifications,
} from '@/src/notifications/missionNotificationsController';

/**
 * Foreground presentation, reschedule on app active, auth changes, and monthly-gift claim on tap.
 */
export function MissionNotificationsBinder() {
  const { missionAlertsEnabled, hydrated: missionHydrated } = useMissionAlert();
  const { claimMonthlyGiftNotificationReward } = useVaultProgress();
  const lastMonthlyKey = useRef<string | null>(null);

  const processResponse = useCallback(
    async (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      const kind = parseNotificationKind(data);
      if (kind !== KIND_MONTHLY_GIFT) {
        void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
        return;
      }

      const id = response.notification.request.identifier;
      const date = response.notification.date;
      const key = `${id}:${date}`;
      if (lastMonthlyKey.current === key) return;
      lastMonthlyKey.current = key;

      await claimMonthlyGiftNotificationReward();
      await rescheduleMonthlyGiftFromNow();
      void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    },
    [claimMonthlyGiftNotificationReward],
  );

  const processResponseRef = useRef(processResponse);
  processResponseRef.current = processResponse;

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      void processResponse(response);
    });
    return () => sub.remove();
  }, [processResponse]);

  useEffect(() => {
    void Notifications.getLastNotificationResponseAsync().then((last) => {
      if (last) void processResponseRef.current(last);
    });
  }, []);

  useEffect(() => {
    if (!missionHydrated) return;

    const run = () => {
      void syncMissionNotifications({
        missionAlertsEnabled,
        signedIn: getFirebaseAuth().currentUser != null,
      });
    };

    run();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });

    const unsubAuth = onAuthStateChanged(getFirebaseAuth(), () => {
      run();
    });

    return () => {
      sub.remove();
      unsubAuth();
    };
  }, [missionAlertsEnabled, missionHydrated]);

  return null;
}
