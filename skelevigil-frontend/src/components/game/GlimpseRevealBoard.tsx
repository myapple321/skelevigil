import { Pressable, StyleSheet, View } from 'react-native';

import { SV } from '@/src/theme/skelevigil';

import {
  GLIMPSE_CELL_GAP,
  GLIMPSE_GRID_INSET,
  GLIMPSE_PREVIEW_SIZE,
} from '@/src/components/game/GlimpseBlockGrid';
import { type BlockCoord, blockToTileIndex } from '@/src/game/neuralString';

type Props = {
  colors: string[];
  /** Path cells; each is drawn as its own rounded rect (no line between cells). */
  neuralBlocks: BlockCoord[];
  /** When false, only the mat + neural blocks show — tiles hidden. */
  showTiles: boolean;
  size?: number;
  matPadding?: number;
  cellGap?: number;
  revealed: boolean[];
  onRevealCell: (index: number) => void;
};

/**
 * 5×5 grey tiles over a dark mat; tapping a tile removes it and reveals neural blocks beneath.
 * Neural block layer uses pointerEvents="none" so it never receives touches.
 */
export function GlimpseRevealBoard({
  colors,
  neuralBlocks,
  showTiles,
  size = GLIMPSE_PREVIEW_SIZE,
  matPadding = GLIMPSE_GRID_INSET,
  cellGap = GLIMPSE_CELL_GAP,
  revealed,
  onRevealCell,
}: Props) {
  const neuralTileSet = new Set(neuralBlocks.map(blockToTileIndex));

  return (
    <View style={[styles.artFrame, { width: size, height: size }]}>
      <View style={[styles.innerPad, { padding: matPadding }]}>
        <View style={styles.playField} pointerEvents="box-none">
          <View style={[styles.neuralBlockLayer, { gap: cellGap }]} pointerEvents="none">
            {[0, 1, 2, 3, 4].map((row) => (
              <View key={row} style={[styles.row, { gap: cellGap }]} pointerEvents="none">
                {[0, 1, 2, 3, 4].map((col) => {
                  const idx = row * 5 + col;
                  const isNeural = neuralTileSet.has(idx);
                  return (
                    <View key={col} style={styles.cellPressable} pointerEvents="none">
                      <View
                        pointerEvents="none"
                        style={[
                          styles.neuralCell,
                          isNeural ? styles.neuralCellOn : styles.neuralCellOff,
                        ]}
                      />
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
          {showTiles ? (
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
          ) : null}
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
  /* zIndex 0 (not negative): with tiles off, -1 painted behind innerPad and the blocks vanished. */
  neuralBlockLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
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
  neuralCell: {
    flex: 1,
    borderRadius: 2,
  },
  neuralCellOff: {
    backgroundColor: 'transparent',
  },
  neuralCellOn: {
    backgroundColor: 'rgba(0,255,255,0.14)',
    borderWidth: 2,
    borderColor: SV.neonCyan,
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
