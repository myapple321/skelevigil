import * as Notifications from 'expo-notifications';
import type { DateTriggerInput, TimeIntervalTriggerInput } from 'expo-notifications';
import { Platform } from 'react-native';

import {
  getMonthlyGiftNextFireAtMs,
  setMonthlyGiftNextFireAtMs,
} from '@/src/preferences/missionMonthlySchedule';

export const MISSION_ANDROID_CHANNEL_ID = 'mission-alerts';

export const NOTIF_ID_REENGAGEMENT = 'sv-mission-reengagement';
export const NOTIF_ID_MONTHLY_GIFT = 'sv-mission-monthly-gift';

export const DATA_KIND = 'svKind';
export const KIND_REENGAGEMENT = 'reengagement';
export const KIND_MONTHLY_GIFT = 'monthly_gift';

export const COPY_REENGAGEMENT_BODY =
  'The neural block is waiting to be excavated. Return to the Vigil to continue your progress.';
export const COPY_MONTHLY_BODY =
  'A Free Mission has been authorized. Tap here to claim your access and secure the Immutable Strand.';

const DAY_MS = 24 * 60 * 60 * 1000;
const REENGAGEMENT_SECONDS = 4 * 24 * 60 * 60;

/** Inclusive 1–30 days from “now” for the next monthly gift notification. */
export function randomOffsetMsWithin30Days(): number {
  const days = 1 + Math.floor(Math.random() * 30);
  return days * DAY_MS;
}

let androidChannelReady = false;

export async function ensureMissionAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android' || androidChannelReady) return;
  await Notifications.setNotificationChannelAsync(MISSION_ANDROID_CHANNEL_ID, {
    name: 'Mission Alerts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
  androidChannelReady = true;
}

function missionChannelTrigger(base: TimeIntervalTriggerInput): TimeIntervalTriggerInput;
function missionChannelTrigger(base: DateTriggerInput): DateTriggerInput;
function missionChannelTrigger(
  base: TimeIntervalTriggerInput | DateTriggerInput,
): TimeIntervalTriggerInput | DateTriggerInput {
  if (Platform.OS === 'android') {
    return { ...base, channelId: MISSION_ANDROID_CHANNEL_ID };
  }
  return base;
}

export async function cancelMissionScheduledNotifications(): Promise<void> {
  await Promise.all([
    Notifications.cancelScheduledNotificationAsync(NOTIF_ID_REENGAGEMENT).catch(() => undefined),
    Notifications.cancelScheduledNotificationAsync(NOTIF_ID_MONTHLY_GIFT).catch(() => undefined),
  ]);
}

async function scheduleReengagementNotification(): Promise<void> {
  await ensureMissionAndroidChannel();
  await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_REENGAGEMENT).catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: NOTIF_ID_REENGAGEMENT,
    content: {
      title: 'SkeleVigil',
      body: COPY_REENGAGEMENT_BODY,
      data: { [DATA_KIND]: KIND_REENGAGEMENT },
      sound: 'default',
    },
    trigger: missionChannelTrigger({
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: REENGAGEMENT_SECONDS,
      repeats: false,
    }),
  });
}

async function scheduleMonthlyGiftAt(date: Date): Promise<void> {
  await ensureMissionAndroidChannel();
  await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_MONTHLY_GIFT).catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: NOTIF_ID_MONTHLY_GIFT,
    content: {
      title: 'SkeleVigil',
      body: COPY_MONTHLY_BODY,
      data: { [DATA_KIND]: KIND_MONTHLY_GIFT },
      sound: 'default',
    },
    trigger: missionChannelTrigger({
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    }),
  });
}

/**
 * Rolls the stored monthly fire time forward until it is in the future, then schedules.
 * Call only when signed in (monthly gift mutates server-side vault on tap).
 */
export async function syncMonthlyGiftSchedule(): Promise<void> {
  let nextAt = await getMonthlyGiftNextFireAtMs();
  const now = Date.now();
  if (nextAt === null || nextAt <= now) {
    nextAt = now + randomOffsetMsWithin30Days();
    await setMonthlyGiftNextFireAtMs(nextAt);
  }
  await scheduleMonthlyGiftAt(new Date(nextAt));
}

/** After a successful claim or when initializing monthly for a signed-in user. */
export async function rescheduleMonthlyGiftFromNow(): Promise<void> {
  const nextAt = Date.now() + randomOffsetMsWithin30Days();
  await setMonthlyGiftNextFireAtMs(nextAt);
  await scheduleMonthlyGiftAt(new Date(nextAt));
}

export async function clearMonthlyGiftScheduleStorage(): Promise<void> {
  await setMonthlyGiftNextFireAtMs(null);
}

/**
 * Re-engagement: always 4 days from now (idle). Monthly: next randomized slot, signed-in only.
 */
export async function syncMissionNotifications(opts: {
  missionAlertsEnabled: boolean;
  signedIn: boolean;
}): Promise<void> {
  if (!opts.missionAlertsEnabled) {
    await cancelMissionScheduledNotifications();
    return;
  }

  await scheduleReengagementNotification();

  if (opts.signedIn) {
    await syncMonthlyGiftSchedule();
  } else {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_MONTHLY_GIFT).catch(() => undefined);
  }
}

export function parseNotificationKind(
  data: Record<string, unknown> | undefined | null,
): string | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data[DATA_KIND];
  return typeof raw === 'string' ? raw : null;
}

/** DEBUG: fires after a short delay with production copy + data. */
export async function debugScheduleReengagementInSeconds(seconds = 3): Promise<void> {
  await ensureMissionAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'SkeleVigil',
      body: COPY_REENGAGEMENT_BODY,
      data: { [DATA_KIND]: KIND_REENGAGEMENT, debug: true },
      sound: 'default',
    },
    trigger: missionChannelTrigger({
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
    }),
  });
}

export async function debugScheduleMonthlyGiftInSeconds(seconds = 3): Promise<void> {
  await ensureMissionAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'SkeleVigil',
      body: COPY_MONTHLY_BODY,
      data: { [DATA_KIND]: KIND_MONTHLY_GIFT, debug: true },
      sound: 'default',
    },
    trigger: missionChannelTrigger({
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
    }),
  });
}
