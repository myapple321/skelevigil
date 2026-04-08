import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { SV } from '@/src/theme/skelevigil';

import {
  GLIMPSE_CELL_GAP,
  GLIMPSE_GRID_INSET,
  GLIMPSE_PREVIEW_SIZE,
} from '@/src/components/game/GlimpseBlockGrid';

type Props = {
  colors: string[];
  size?: number;
  matPadding?: number;
  cellGap?: number;
  revealed: boolean[];
  onRevealCell: (index: number) => void;
};

/**
 * 5×5 grey tiles over a dark mat; tapping a tile removes it and reveals the neural strand beneath.
 * Strand layer uses pointerEvents="none" so it never receives touches.
 */
export function GlimpseRevealBoard({
  colors,
  size = GLIMPSE_PREVIEW_SIZE,
  matPadding = GLIMPSE_GRID_INSET,
  cellGap = GLIMPSE_CELL_GAP,
  revealed,
  onRevealCell,
}: Props) {
  return (
    <View style={[styles.artFrame, { width: size, height: size }]}>
      <View style={[styles.innerPad, { padding: matPadding }]}>
        <View style={styles.playField} pointerEvents="box-none">
          <View style={styles.strandLayer} pointerEvents="none" collapsable={false}>
            <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <Path
                d="M 6 58 L 22 38 L 38 58 L 54 36 L 70 56 L 86 38 L 94 48"
                stroke="rgba(0,255,255,0.22)"
                strokeWidth={5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M 6 58 L 22 38 L 38 58 L 54 36 L 70 56 L 86 38 L 94 48"
                stroke={SV.neonCyan}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <View
            style={[styles.tileLayer, { gap: cellGap }]}
            pointerEvents="box-none"
            collapsable={false}>
            {[0, 1, 2, 3, 4].map((row) => (
              <View key={row} style={[styles.row, { gap: cellGap }]}>
                {[0, 1, 2, 3, 4].map((col) => {
                  const idx = row * 5 + col;
                  const isRevealed = revealed[idx] === true;
                  return (
                    <Pressable
                      key={col}
                      disabled={isRevealed}
                      onPress={() => onRevealCell(idx)}
                      style={styles.cellPressable}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isRevealed
                          ? `Tile ${idx + 1} revealed`
                          : `Remove tile ${idx + 1}`
                      }
                      accessibilityState={{ disabled: isRevealed }}>
                      <View
                        style={[
                          styles.cell,
                          isRevealed ? styles.cellRevealed : null,
                          !isRevealed
                            ? { backgroundColor: colors[idx] ?? SV.muted }
                            : null,
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  artFrame: {
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(0,255,255,0.45)',
  },
  innerPad: {
    flex: 1,
    backgroundColor: SV.abyss,
  },
  playField: {
    flex: 1,
    position: 'relative',
  },
  strandLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
    elevation: 0,
  },
  tileLayer: {
    flex: 1,
    position: 'relative',
    zIndex: 2,
    elevation: 8,
    backgroundColor: 'transparent',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  cellPressable: {
    flex: 1,
  },
  cell: {
    flex: 1,
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 1.5,
  },
  cellRevealed: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
  },
});
