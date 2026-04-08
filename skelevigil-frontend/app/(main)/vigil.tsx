import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  GLIMPSE_CELL_GAP,
  GLIMPSE_GRID_INSET,
  GLIMPSE_PREVIEW_SIZE,
} from '@/src/components/game/GlimpseBlockGrid';
import { playTileFailSfx } from '@/src/audio/tileFailSfx';
import { playTileRevealSfx } from '@/src/audio/tileRevealSfx';
import { GlimpseRevealBoard } from '@/src/components/game/GlimpseRevealBoard';
import { useSfxPreference } from '@/src/contexts/SfxPreferenceContext';
import { shuffledGlimpseGreyPalette } from '@/src/game/glimpsePalette';
import { generateRandomNeuralBlocks, neuralBlockToTileIndex } from '@/src/game/neuralBlocks';
import { SV } from '@/src/theme/skelevigil';

const MEMORIZE_MS = 5000;
const SCAN_MS = 2000;
const PLAY_TIME_SEC = 25;
const TIMEOUT_AMBER = '#FFBF00';

export default function VigilScreen() {
  const { sfxEnabled } = useSfxPreference();
  const { width } = useWindowDimensions();
  const gridSize = Math.min(Math.max(width - 40, 220), 360);
  const scale = gridSize / GLIMPSE_PREVIEW_SIZE;
  const matPadding = Math.max(6, Math.round(GLIMPSE_GRID_INSET * scale));
  const cellGap = Math.max(2, Math.round(GLIMPSE_CELL_GAP * scale));

  const [neuralBlocks, setNeuralBlocks] = useState(() => generateRandomNeuralBlocks());
  const [phase, setPhase] = useState<'memorize' | 'play'>('memorize');
  const [memorizeSecondsLeft, setMemorizeSecondsLeft] = useState(5);
  const [failedIndex, setFailedIndex] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [playSecondsLeft, setPlaySecondsLeft] = useState(PLAY_TIME_SEC);
  const [passedExcavation, setPassedExcavation] = useState(false);
  const [scanProgress, setScanProgress] = useState<number | null>(null);
  const [finishPulse, setFinishPulse] = useState(false);
  const [successPulseToken, setSuccessPulseToken] = useState(0);

  const [gridColors, setGridColors] = useState(() => shuffledGlimpseGreyPalette());
  const [revealed, setRevealed] = useState<boolean[]>(() =>
    Array.from({ length: 25 }, () => false),
  );
  const revealedRef = useRef(revealed);
  revealedRef.current = revealed;
  const finishScanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timedOutRef = useRef(timedOut);
  timedOutRef.current = timedOut;

  useEffect(() => {
    setPhase('memorize');
    setMemorizeSecondsLeft(5);
    setFailedIndex(null);
    setTimedOut(false);
    setPassedExcavation(false);
    const tick = setInterval(() => {
      setMemorizeSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    const done = setTimeout(() => {
      clearInterval(tick);
      setPhase('play');
    }, MEMORIZE_MS);
    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [neuralBlocks]);

  useEffect(() => {
    if (phase !== 'play') return;
    if (failedIndex != null || passedExcavation || timedOut) return;

    setPlaySecondsLeft(PLAY_TIME_SEC);
    const id = setInterval(() => {
      setPlaySecondsLeft((s) => {
        if (s <= 1) {
          if (finishScanTimerRef.current) {
            clearInterval(finishScanTimerRef.current);
            finishScanTimerRef.current = null;
          }
          setScanProgress(null);
          setTimedOut(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, neuralBlocks, failedIndex, passedExcavation, timedOut]);

  const startNewGame = () => {
    setPhase('memorize');
    setMemorizeSecondsLeft(5);
    setNeuralBlocks(generateRandomNeuralBlocks());
    setGridColors(shuffledGlimpseGreyPalette());
    setFailedIndex(null);
    setTimedOut(false);
    setPassedExcavation(false);
    setScanProgress(null);
    if (finishScanTimerRef.current) {
      clearInterval(finishScanTimerRef.current);
      finishScanTimerRef.current = null;
    }
    setFinishPulse(false);
    const fresh = Array.from({ length: 25 }, () => false);
    revealedRef.current = fresh;
    setRevealed(fresh);
  };

  const onRevealCell = (index: number) => {
    if (phase !== 'play') return;
    if (failedIndex != null || timedOut) return;
    if (revealedRef.current[index]) return;

    const neuralTileSet = new Set(neuralBlocks.map(neuralBlockToTileIndex));
    if (neuralTileSet.has(index)) {
      setFailedIndex(index);
      setTimedOut(false);
      setPassedExcavation(false);
      if (sfxEnabled) void playTileFailSfx();
      return;
    }

    if (sfxEnabled) void playTileRevealSfx();
    setRevealed((prev) => {
      if (prev[index]) return prev;
      const next = [...prev];
      next[index] = true;
      revealedRef.current = next;
      return next;
    });
  };

  const onOpenFinishHelp = () => {
    Alert.alert(
      'Finish Excavation',
      'Tap this when you believe you have safely revealed the entire Hidden Path. The system will scan your excavation to see if the Strand is still intact.',
    );
  };

  const onOpenNewGameHelp = () => {
    Alert.alert('New Game', 'Tap here to reset the vault and begin a fresh mission.');
  };

  const onFinishExcavation = () => {
    if (phase !== 'play') return;
    if (failedIndex != null || timedOut) return;
    if (scanProgress != null) return;

    setFinishPulse(true);
    setTimeout(() => setFinishPulse(false), 220);

    const neuralTileSet = new Set(neuralBlocks.map(neuralBlockToTileIndex));
    setScanProgress(0);
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const next = Math.min(1, elapsed / SCAN_MS);
      setScanProgress(next);
      if (next >= 1) {
        clearInterval(timer);
        finishScanTimerRef.current = null;
        setScanProgress(null);

        const current = revealedRef.current;
        const safeTilesAllRevealed = current.every((isRevealed, idx) =>
          neuralTileSet.has(idx) ? true : isRevealed,
        );
        const neuralTileTouched = current.some((isRevealed, idx) =>
          neuralTileSet.has(idx) ? isRevealed : false,
        );
        const success =
          safeTilesAllRevealed &&
          !neuralTileTouched &&
          failedIndex == null &&
          !timedOutRef.current;

        if (success) {
          setPassedExcavation(true);
          setSuccessPulseToken((n) => n + 1);
          const fullyRevealed = Array.from({ length: 25 }, () => true);
          revealedRef.current = fullyRevealed;
          setRevealed(fullyRevealed);
          return;
        }

        const firstNeuralIdx = neuralBlocks.length > 0 ? neuralBlockToTileIndex(neuralBlocks[0]!) : 0;
        setFailedIndex(firstNeuralIdx);
        setTimedOut(false);
        setPassedExcavation(false);
        if (sfxEnabled) void playTileFailSfx();
      }
    }, 16);
    finishScanTimerRef.current = timer;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, phase === 'play' && styles.titlePlaySpacing]}>The Glimpse</Text>
        {phase === 'memorize' ? (
          <Text style={styles.memorizeHint} accessibilityLiveRegion="polite">
            Memorize the neural blocks. Tiles return in {memorizeSecondsLeft}s.
          </Text>
        ) : passedExcavation ? (
          <Text style={styles.successHint} accessibilityLiveRegion="polite">
            Success! You revealed the pattern perfectly. Tap New Game for your next grid.
          </Text>
        ) : timedOut ? (
          <Text style={styles.timeoutHint} accessibilityLiveRegion="polite">
            Time limit reached. This attempt is over. Tap 'New Game' start a fresh mission.
          </Text>
        ) : failedIndex != null ? (
          <Text style={styles.failHint} accessibilityLiveRegion="polite">
            The Strand has shattered. Tap 'New Game' to try a fresh grid.
          </Text>
        ) : phase === 'play' ? (
          <Text style={styles.playTimerHint} accessibilityLiveRegion="polite">
            Excavation time remaining: {playSecondsLeft}s
          </Text>
        ) : null}
        <View style={styles.gridWrap}>
          <GlimpseRevealBoard
            colors={gridColors}
            neuralBlocks={neuralBlocks}
            showTiles={phase === 'play'}
            failedIndex={failedIndex}
            timedOut={timedOut}
            scanProgress={scanProgress}
            successPulseToken={successPulseToken}
            size={gridSize}
            matPadding={matPadding}
            cellGap={cellGap}
            revealed={revealed}
            onRevealCell={onRevealCell}
          />
        </View>
        <View style={styles.newGameRow}>
          <Pressable
            onPress={onOpenNewGameHelp}
            style={({ pressed }) => [styles.newGameInfoBtn, pressed && styles.newGameInfoBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="New game info">
            <Text style={styles.newGameInfoText}>i</Text>
          </Pressable>
          <Pressable
            onPress={startNewGame}
            style={({ pressed }) => [
              styles.newGameBtn,
              pressed && styles.newGameBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="New game, shuffle the grid">
            <Text style={styles.newGameBtnText}>New Game</Text>
          </Pressable>
        </View>
        <View style={styles.finishBottomRow}>
          <Pressable
            onPress={onOpenFinishHelp}
            style={({ pressed }) => [styles.finishInfoBtn, pressed && styles.finishInfoBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Finish excavation info">
            <Text style={styles.finishInfoText}>i</Text>
          </Pressable>
          <Pressable
            onPress={onFinishExcavation}
            disabled={
              phase !== 'play' || failedIndex != null || timedOut || scanProgress != null
            }
            style={({ pressed }) => [
              styles.finishBtn,
              pressed && styles.finishBtnPressed,
              finishPulse && styles.finishBtnPulse,
              (phase !== 'play' || failedIndex != null || timedOut || scanProgress != null) &&
                styles.finishBtnDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Finish Excavation">
            <Text style={styles.finishBtnText}>Finish Excavation</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: SV.abyss,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
    alignItems: 'center',
  },
  title: {
    color: SV.surgicalWhite,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  titlePlaySpacing: {
    marginBottom: 20,
  },
  memorizeHint: {
    color: SV.neonCyan,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    maxWidth: 340,
  },
  timeoutHint: {
    color: TIMEOUT_AMBER,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,191,0,0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,191,0,0.35)',
    maxWidth: 360,
  },
  playTimerHint: {
    color: SV.muted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 12,
    maxWidth: 360,
  },
  failHint: {
    color: '#FFC68A',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,255,255,0.06)',
    borderRadius: 8,
    maxWidth: 360,
  },
  successHint: {
    color: SV.neonCyan,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,255,255,0.08)',
    borderRadius: 8,
    maxWidth: 360,
  },
  gridWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  newGameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  newGameInfoBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: SV.neonCyan,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,255,255,0.08)',
  },
  newGameInfoBtnPressed: {
    opacity: 0.85,
  },
  newGameInfoText: {
    color: SV.neonCyan,
    fontSize: 16,
    fontWeight: '700',
  },
  newGameBtn: {
    alignSelf: 'center',
    minWidth: 210,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    backgroundColor: SV.black,
    borderWidth: 1,
    borderColor: SV.neonCyan,
  },
  newGameBtnPressed: {
    opacity: 0.88,
  },
  newGameBtnText: {
    color: SV.surgicalWhite,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  finishWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  finishBottomRow: {
    marginTop: 0,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  finishInfoBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: SV.neonCyan,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,255,255,0.08)',
  },
  finishInfoBtnPressed: {
    opacity: 0.85,
  },
  finishInfoText: {
    color: SV.neonCyan,
    fontSize: 16,
    fontWeight: '700',
  },
  finishBtn: {
    minWidth: 210,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: SV.neonCyan,
    borderWidth: 1,
    borderColor: SV.neonCyan,
    shadowColor: SV.neonCyan,
    shadowOpacity: 0.24,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
  },
  finishBtnPressed: {
    opacity: 0.9,
  },
  finishBtnPulse: {
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
  finishBtnDisabled: {
    opacity: 0.55,
  },
  finishBtnText: {
    color: SV.black,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
});
