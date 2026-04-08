import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

const TILE_SOURCE = require('../../assets/sounds/tile-fail.wav');

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
    player = createAudioPlayer(TILE_SOURCE, { updateInterval: 500 });
    player.volume = 0.52;
  }
  return player;
}

/** Short "wrong / fail" blip when an UNTOUCHABLE neural block is touched. */
export async function playTileFailSfx(): Promise<void> {
  try {
    await ensureAudioMode();
    const p = ensurePlayer();
    await p.seekTo(0);
    p.play();
  } catch {
    // Ignore playback errors (e.g. interrupted session).
  }
}

