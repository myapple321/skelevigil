import { onAuthStateChanged } from 'firebase/auth';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useMissionAlert } from '@/src/contexts/MissionAlertContext';
import { useVaultProgress } from '@/src/contexts/VaultProgressContext';
import { getFirebaseAuth } from '@/src/firebase/firebaseApp';
import {
  KIND_REENGAGEMENT,
  isMonthlyGiftNotificationResponse,
  parseNotificationKind,
  syncMissionNotifications,
} from '@/src/notifications/missionNotificationsController';

/**
 * Foreground presentation, reschedule on app active, auth changes, and monthly-gift claim on tap.
 */
export function MissionNotificationsBinder() {
  const { missionAlertsEnabled, hydrated: missionHydrated } = useMissionAlert();
  const { claimMonthlyGiftNotificationReward, progress, hydrated: vaultHydrated } = useVaultProgress();
  const lastMonthlyKey = useRef<string | null>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const processResponse = useCallback(
    async (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      const kind = parseNotificationKind(data);
      if (kind === KIND_REENGAGEMENT) {
        void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
        return;
      }
      if (!isMonthlyGiftNotificationResponse(response)) {
        void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
        return;
      }

      const id = response.notification.request.identifier;
      const date = response.notification.date;
      const key = `${id}:${date}`;
      if (lastMonthlyKey.current === key) return;
      lastMonthlyKey.current = key;

      await claimMonthlyGiftNotificationReward();
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

  /** Re-engagement + monthly body keyed to Firestore `giftRotationIndex` (never use stale index from foreground). */
  useEffect(() => {
    if (!missionHydrated || !vaultHydrated) return;

    const runFull = () => {
      void syncMissionNotifications({
        missionAlertsEnabled,
        signedIn: getFirebaseAuth().currentUser != null,
        giftRotationIndex: progressRef.current.giftRotationIndex,
        reengagementOnly: false,
      });
    };

    runFull();
    const unsubAuth = onAuthStateChanged(getFirebaseAuth(), () => {
      runFull();
    });
    return () => unsubAuth();
  }, [missionAlertsEnabled, missionHydrated, vaultHydrated, progress.giftRotationIndex]);

  /** Foreground: only reset the 4-day idle notification; do not reschedule monthly (avoids wiping post-claim rotation). */
  useEffect(() => {
    if (!missionHydrated) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void syncMissionNotifications({
          missionAlertsEnabled,
          signedIn: getFirebaseAuth().currentUser != null,
          reengagementOnly: true,
        });
      }
    });
    return () => sub.remove();
  }, [missionAlertsEnabled, missionHydrated]);

  return null;
}
