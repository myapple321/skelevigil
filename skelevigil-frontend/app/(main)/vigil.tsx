import { useRef, useState } from 'react';
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
import { playTileRevealSfx } from '@/src/audio/tileRevealSfx';
import { GlimpseRevealBoard } from '@/src/components/game/GlimpseRevealBoard';
import { useSfxPreference } from '@/src/contexts/SfxPreferenceContext';
import { shuffledGlimpseGreyPalette } from '@/src/game/glimpsePalette';
import { SV } from '@/src/theme/skelevigil';

export default function VigilScreen() {
  const { sfxEnabled } = useSfxPreference();
  const { width } = useWindowDimensions();
  const gridSize = Math.min(Math.max(width - 40, 220), 360);
  const scale = gridSize / GLIMPSE_PREVIEW_SIZE;
  const matPadding = Math.max(6, Math.round(GLIMPSE_GRID_INSET * scale));
  const cellGap = Math.max(2, Math.round(GLIMPSE_CELL_GAP * scale));

  const [gridColors, setGridColors] = useState(() => shuffledGlimpseGreyPalette());
  const [revealed, setRevealed] = useState<boolean[]>(() =>
    Array.from({ length: 25 }, () => false),
  );
  const revealedRef = useRef(revealed);
  revealedRef.current = revealed;

  const startNewGame = () => {
    setGridColors(shuffledGlimpseGreyPalette());
    const fresh = Array.from({ length: 25 }, () => false);
    revealedRef.current = fresh;
    setRevealed(fresh);
  };

  const onRevealCell = (index: number) => {
    if (revealedRef.current[index]) return;
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
        <Text style={styles.title}>The Glimpse</Text>
        <View style={styles.gridWrap}>
          <GlimpseRevealBoard
            colors={gridColors}
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
    marginBottom: 20,
    textAlign: 'center',
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
