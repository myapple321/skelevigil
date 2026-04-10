import * as Notifications from 'expo-notifications';
import type { NotificationResponse } from 'expo-notifications';
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

/** Body for the next monthly gift, matching `giftRotationIndex` (0 Trance, 1 Stare, 2 Glimpse). */
export function monthlyGiftNotificationBodyForRotationIndex(rotationIndex: number): string {
  const i = Math.min(2, Math.max(0, Math.trunc(rotationIndex) % 3));
  switch (i) {
    case 0:
      return 'Access Authorized: A free Trance mission has been added to your Vault. Secure the dual-planes now.';
    case 1:
      return 'Vault Sync: You have earned one free Stare restoration. The diamonds await.';
    case 2:
      return 'Mission Gift: Your Glimpse reserves have been replenished. Tap here to start.';
    default:
      return 'Mission Gift: Your Glimpse reserves have been replenished. Tap here to start.';
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
const REENGAGEMENT_SECONDS = 4 * 24 * 60 * 60;

/** Inclusive 1–30 days from “now” for the next monthly gift notification. */
export function randomOffsetMsWithin30Days(): number {
  const days = 1 + Math.floor(Math.random() * 30);
  return days * DAY_MS;
}

let androidChannelReady = false;

/**
 * DEBUG-only: cycles 0→1→2 on each Monthly Gift test tap so all three notification bodies
 * can be previewed without claiming (vault `giftRotationIndex` only moves on real claim).
 */
let debugMonthlyGiftPreviewIndex = 0;

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

async function scheduleMonthlyGiftAt(date: Date, giftRotationIndex: number): Promise<void> {
  await ensureMissionAndroidChannel();
  await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_MONTHLY_GIFT).catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: NOTIF_ID_MONTHLY_GIFT,
    content: {
      title: 'SkeleVigil',
      body: monthlyGiftNotificationBodyForRotationIndex(giftRotationIndex),
      data: { [DATA_KIND]: KIND_MONTHLY_GIFT, giftRotationIndex },
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
 * `giftRotationIndex` selects which phase copy is shown (next claim target).
 */
export async function syncMonthlyGiftSchedule(giftRotationIndex: number): Promise<void> {
  let nextAt = await getMonthlyGiftNextFireAtMs();
  const now = Date.now();
  if (nextAt === null || nextAt <= now) {
    nextAt = now + randomOffsetMsWithin30Days();
    await setMonthlyGiftNextFireAtMs(nextAt);
  }
  await scheduleMonthlyGiftAt(new Date(nextAt), giftRotationIndex);
}

/** After a successful claim or when initializing monthly for a signed-in user. */
export async function rescheduleMonthlyGiftFromNow(nextGiftRotationIndex: number): Promise<void> {
  const nextAt = Date.now() + randomOffsetMsWithin30Days();
  await setMonthlyGiftNextFireAtMs(nextAt);
  await scheduleMonthlyGiftAt(new Date(nextAt), nextGiftRotationIndex);
}

export async function clearMonthlyGiftScheduleStorage(): Promise<void> {
  await setMonthlyGiftNextFireAtMs(null);
}

/**
 * Re-engagement: always 4 days from now (idle). Monthly: next randomized slot, signed-in only.
 * Pass current `giftRotationIndex` (0–2) so notification body matches the next grant.
 *
 * `reengagementOnly`: refresh the 4-day idle timer without rescheduling the monthly gift.
 * Use on AppState "active" so a stale React `giftRotationIndex` cannot overwrite the monthly
 * notification right after a claim (would keep showing Trance forever).
 */
export async function syncMissionNotifications(opts: {
  missionAlertsEnabled: boolean;
  signedIn: boolean;
  /** Used for monthly notification copy; default 0 if omitted. */
  giftRotationIndex?: number;
  reengagementOnly?: boolean;
}): Promise<void> {
  if (!opts.missionAlertsEnabled) {
    await cancelMissionScheduledNotifications();
    return;
  }

  await scheduleReengagementNotification();

  if (opts.reengagementOnly) {
    if (!opts.signedIn) {
      await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_MONTHLY_GIFT).catch(() => undefined);
    }
    return;
  }

  if (opts.signedIn) {
    const gri =
      typeof opts.giftRotationIndex === 'number' && Number.isFinite(opts.giftRotationIndex)
        ? Math.min(2, Math.max(0, Math.trunc(opts.giftRotationIndex) % 3))
        : 0;
    await syncMonthlyGiftSchedule(gri);
  } else {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_MONTHLY_GIFT).catch(() => undefined);
  }
}

export function parseNotificationKind(
  data: Record<string, unknown> | undefined | null,
): string | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data[DATA_KIND];
  if (typeof raw === 'string') return raw;
  if (raw != null && typeof raw !== 'object') return String(raw);
  return null;
}

function monthlyGiftBodyMatches(body: string | null | undefined): boolean {
  if (!body) return false;
  return (
    body.includes('dual-planes') ||
    body.includes('diamonds await') ||
    body.includes('Glimpse reserves have been replenished')
  );
}

/**
 * Monthly gift tap handling: `data.svKind` is sometimes missing on iOS; use request identifier + body.
 */
export function isMonthlyGiftNotificationResponse(response: NotificationResponse): boolean {
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  if (parseNotificationKind(data) === KIND_MONTHLY_GIFT) return true;
  if (response.notification.request.identifier === NOTIF_ID_MONTHLY_GIFT) return true;
  return monthlyGiftBodyMatches(response.notification.request.content.body);
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

/**
 * Schedules a test monthly notification. Each call uses the next preview slot (Trance → Stare → Glimpse)
 * so repeated DEBUG taps show all three copies. Tapping the notification still applies the real vault rotation.
 */
export async function debugScheduleMonthlyGiftInSeconds(seconds = 3): Promise<void> {
  await ensureMissionAndroidChannel();
  const gri = debugMonthlyGiftPreviewIndex % 3;
  debugMonthlyGiftPreviewIndex = (debugMonthlyGiftPreviewIndex + 1) % 3;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'SkeleVigil',
      body: monthlyGiftNotificationBodyForRotationIndex(gri),
      data: { [DATA_KIND]: KIND_MONTHLY_GIFT, giftRotationIndex: gri, debug: true },
      sound: 'default',
    },
    trigger: missionChannelTrigger({
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
    }),
  });
}
