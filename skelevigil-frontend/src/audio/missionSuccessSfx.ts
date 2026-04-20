import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

const MISSION_SUCCESS_SOURCE = require('../../assets/sounds/mission-success.wav');

let audioModePromise: Promise<void> | null = null;
let player: AudioPlayer | null = null;

async function ensureAudioMode(): Promise<void> {
  if (!audioModePromise) {
    audioModePromise = setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: false,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    });
  }
  await audioModePromise;
}

function ensurePlayer(): AudioPlayer {
  if (!player) {
    player = createAudioPlayer(MISSION_SUCCESS_SOURCE, { updateInterval: 500 });
    player.volume = 0.68;
  }
  return player;
}

/** Pre-load on screen focus/mount to keep mission success cue snappy. */
export async function preloadMissionSuccessSfx(): Promise<void> {
  try {
    await ensureAudioMode();
    ensurePlayer();
  } catch {
    // Ignore preload failures; playback helper still guards and no-ops.
  }
}

/** Celebratory cue for successful excavation. */
export async function playMissionSuccessSfx(): Promise<void> {
  try {
    await ensureAudioMode();
    const p = ensurePlayer();
    await p.seekTo(0);
    p.play();
  } catch {
    // Ignore playback errors (e.g. interrupted session).
  }
}
