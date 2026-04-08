import { useEffect, useRef, useState } from 'react';
import {
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

  const [gridColors, setGridColors] = useState(() => shuffledGlimpseGreyPalette());
  const [revealed, setRevealed] = useState<boolean[]>(() =>
    Array.from({ length: 25 }, () => false),
  );
  const revealedRef = useRef(revealed);
  revealedRef.current = revealed;

  useEffect(() => {
    setPhase('memorize');
    setMemorizeSecondsLeft(5);
    setFailedIndex(null);
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

  const startNewGame = () => {
    setPhase('memorize');
    setMemorizeSecondsLeft(5);
    setNeuralBlocks(generateRandomNeuralBlocks());
    setGridColors(shuffledGlimpseGreyPalette());
    setFailedIndex(null);
    const fresh = Array.from({ length: 25 }, () => false);
    revealedRef.current = fresh;
    setRevealed(fresh);
  };

  const onRevealCell = (index: number) => {
    if (phase !== 'play') return;
    if (failedIndex != null) return;
    if (revealedRef.current[index]) return;

    const neuralTileSet = new Set(neuralBlocks.map(neuralBlockToTileIndex));
    if (neuralTileSet.has(index)) {
      setFailedIndex(index);
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
        ) : failedIndex != null ? (
          <Text style={styles.failHint} accessibilityLiveRegion="polite">
            The Strand has shattered. Tap 'New Game' to try a fresh grid.
          </Text>
        ) : null}
        <View style={styles.gridWrap}>
          <GlimpseRevealBoard
            colors={gridColors}
            neuralBlocks={neuralBlocks}
            showTiles={phase === 'play'}
            failedIndex={failedIndex}
            size={gridSize}
            matPadding={matPadding}
            cellGap={cellGap}
            revealed={revealed}
            onRevealCell={onRevealCell}
          />
        </View>
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
  gridWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  newGameBtn: {
    alignSelf: 'center',
    marginTop: 28,
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
});
