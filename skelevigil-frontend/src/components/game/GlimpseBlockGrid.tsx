import { StyleSheet, View } from 'react-native';

import { SV } from '@/src/theme/skelevigil';

export const GLIMPSE_PREVIEW_SIZE = 132;
export const GLIMPSE_GRID_INSET = 8;
export const GLIMPSE_CELL_GAP = 3;

type Props = {
  /** Length 25: row-major cell colors (same ramp as Phases, any order). */
  colors: string[];
  /** Outer frame width/height. */
  size?: number;
  matPadding?: number;
  cellGap?: number;
};

export function GlimpseBlockGrid({
  colors,
  size = GLIMPSE_PREVIEW_SIZE,
  matPadding = GLIMPSE_GRID_INSET,
  cellGap = GLIMPSE_CELL_GAP,
}: Props) {
  return (
    <View style={[styles.artFrame, { width: size, height: size }]}>
      <View style={[styles.glimpseMat, { padding: matPadding }]}>
        <View style={[styles.glimpseGrid, { gap: cellGap }]}>
          {[0, 1, 2, 3, 4].map((row) => (
            <View key={row} style={[styles.glimpseRow, { gap: cellGap }]}>
              {[0, 1, 2, 3, 4].map((col) => {
                const idx = row * 5 + col;
                return (
                  <View
                    key={col}
                    style={[
                      styles.glimpseCell,
                      { backgroundColor: colors[idx] ?? SV.muted },
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  artFrame: {
    borderRadius: 6,
    overflow: 'hidden',
  },
  glimpseMat: {
    flex: 1,
    backgroundColor: '#EFEFEF',
  },
  glimpseGrid: {
    flex: 1,
  },
  glimpseRow: {
    flex: 1,
    flexDirection: 'row',
  },
  glimpseCell: {
    flex: 1,
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 1.5,
    elevation: 1,
  },
});
