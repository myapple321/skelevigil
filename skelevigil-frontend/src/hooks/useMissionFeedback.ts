import { useCallback, useEffect, useRef } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

/**
 * Art direction: `success_chime.mp3` / `shatter_dissonant.mp3`. Repo ships `.wav` placeholders under
 * `assets/sounds/` — swap files and `require` paths when MP3s are ready (`expo-audio` supports both).
 */
const SUCCESS_CHIME_SOURCE = require('../../assets/sounds/success_chime.wav');
const SHATTER_DISSONANT_SOURCE = require('../../assets/sounds/shatter_dissonant.wav');

/** Hard stop for failure cue (~0.8s abrupt cutoff per spec). */
const SHATTER_PLAYBACK_CUTOFF_MS = 800;

type HapticMethod = 'notificationSuccess' | 'impactHeavy' | 'impactLight';

type HapticModule = {
  trigger: (method: HapticMethod, options: typeof HAPTIC_OPTIONS) => void;
};

const HAPTIC_OPTIONS = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
} as const;

let cachedHaptic: HapticModule | null = null;

function getHapticModule(): HapticModule | null {
  if (cachedHaptic) return cachedHaptic;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-haptic-feedback') as { default?: HapticModule } | HapticModule;
    cachedHaptic = ('default' in mod ? mod.default : mod) ?? null;
    return cachedHaptic;
  } catch {
    return null;
  }
}

function triggerHaptic(method: HapticMethod): void {
  const h = getHapticModule();
  if (h) h.trigger(method, HAPTIC_OPTIONS);
}

export type MissionFeedbackControls = {
  playSuccess: () => Promise<void>;
  playFailure: () => Promise<void>;
};

let sharedAudioModePromise: Promise<void> | null = null;

async function ensureAudioMode(): Promise<void> {
  if (!sharedAudioModePromise) {
    sharedAudioModePromise = setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    });
  }
  await sharedAudioModePromise;
}

/**
 * Pre-loads mission success / failure sounds via `expo-audio` (same stack as `missionSuccessSfx`) and
 * exposes `playSuccess` / `playFailure` with paired `react-native-haptic-feedback` profiles.
 */
export function useMissionFeedback(): MissionFeedbackControls {
  const successPlayerRef = useRef<AudioPlayer | null>(null);
  const failurePlayerRef = useRef<AudioPlayer | null>(null);
  const failureHapticTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const shatterStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFailureHaptics = useCallback(() => {
    for (const t of failureHapticTimeoutsRef.current) clearTimeout(t);
    failureHapticTimeoutsRef.current = [];
  }, []);

  const clearShatterStop = useCallback(() => {
    if (shatterStopTimerRef.current != null) {
      clearTimeout(shatterStopTimerRef.current);
      shatterStopTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await ensureAudioMode();
        if (cancelled) return;

        const success = createAudioPlayer(SUCCESS_CHIME_SOURCE, { updateInterval: 500 });
        const failure = createAudioPlayer(SHATTER_DISSONANT_SOURCE, { updateInterval: 500 });
        success.volume = 0.82;
        failure.volume = 0.82;

        if (cancelled) {
          success.remove();
          failure.remove();
          return;
        }

        successPlayerRef.current = success;
        failurePlayerRef.current = failure;
      } catch {
        // Pre-load is best-effort; playback helpers no-op if refs stay null.
      }
    })();

    return () => {
      cancelled = true;
      clearFailureHaptics();
      clearShatterStop();
      successPlayerRef.current?.remove();
      failurePlayerRef.current?.remove();
      successPlayerRef.current = null;
      failurePlayerRef.current = null;
    };
  }, [clearFailureHaptics, clearShatterStop]);

  const playSuccess = useCallback(async () => {
    try {
      await ensureAudioMode();
      const p = successPlayerRef.current;
      if (!p) return;
      await p.seekTo(0);
      p.play();
      triggerHaptic('notificationSuccess');
    } catch {
      // Ignore playback / haptic errors.
    }
  }, []);

  const playFailure = useCallback(async () => {
    clearFailureHaptics();
    clearShatterStop();

    try {
      triggerHaptic('impactHeavy');
      failureHapticTimeoutsRef.current = [
        setTimeout(() => triggerHaptic('impactLight'), 50),
        setTimeout(() => triggerHaptic('impactLight'), 120),
        setTimeout(() => triggerHaptic('impactLight'), 200),
      ];

      await ensureAudioMode();
      const p = failurePlayerRef.current;
      if (p) {
        await p.seekTo(0);
        p.play();
        shatterStopTimerRef.current = setTimeout(() => {
          try {
            p.pause();
            void p.seekTo(0);
          } catch {
            // ignore
          }
          shatterStopTimerRef.current = null;
        }, SHATTER_PLAYBACK_CUTOFF_MS);
      }
    } catch {
      // Ignore playback / haptic errors.
    }
  }, [clearFailureHaptics, clearShatterStop]);

  return { playSuccess, playFailure };
}
