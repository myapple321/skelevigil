import { useCallback, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { SV } from '@/src/theme/skelevigil';

const ROWS = 10;
const COLS = 5;

/**
 * Play box width/height. Was 5/10 (height = 2×width); a slightly larger ratio shortens the box
 * so the border sits closer to the mesh with less empty band top/bottom (tune if mesh clips).
 */
const PLAY_BOX_ASPECT_RATIO = 5 / 9;

/** Reference lattice: black gutters (hairlines) between bright cyan diamonds. */
const FIELD_BLACK = '#121212';
const DIAMOND_CYAN = SV.neonCyan;
/** Neural strand cells — brighter than field diamonds for memorization contrast. */
const NEURAL_STRAND_BORDER_ICY = '#B8FFFF';
/**
 * Half a column pitch for brick stagger. `translateX` draws past layout width — row stays
 * overflow:visible so the 5th diamond is not clipped.
 */
const STAGGER_SHIFT = '9%';

/**
 * Vertical nudge before rotate — pulls neighbors together at row seams.
 * Larger `VERT_NUDGE_DP` / nudge cap ⇒ thinner black between rows (watch clipping).
 */
const VERT_NUDGE_DP = 38;
/**
 * Applied as negative `marginTop` on rows 2…10 — larger value ⇒ stronger stack ⇒ less vertical gap.
 * Decreasing this widens row spacing (more black), not less.
 */
const ROW_STACK_DP = 44;
/**
 * Extra negative margin on rows 2,4,6,8 (0-based) for between-pair seams; same “larger = tighter” rule.
 */
const BETWEEN_PAIRS_ROW_OVERLAP_DP = 78;
/**
 * ~max inscribed rotated square in cell — drives “hairline” black inside each tile.
 * If tips clip, lower to ~0.992 before touching stack/nudge.
 */
const DIAMOND_SIDE_FIT = 0.997;
/** Border-only vertical inset (visual frame hug). */
const BORDER_VERTICAL_INSET_DP = 34;

type Props = {
  /** Stare phase chrome (outer border). */
  borderColor: string;
  /** Tile indices (0–49, row-major top→bottom) that belong to the neural strand. */
  neuralTileIndices?: ReadonlySet<number>;
};

/**
 * 10 × 5 = 50 diamonds: stagger via translateX on odd indices (1-based rows 2,4,6,8,10).
 * Opaque cells + row overlap painted over stagger rows’ tips; cells stay transparent (mesh from face).
 */
export function StareDiamondPlayBox({
  borderColor,
  neuralTileIndices,
}: Props) {
  const measuredRef = useRef(false);
  const [diamondSidePx, setDiamondSidePx] = useState<number | null>(null);

  /** One measurement: all rows share cell geometry; width-% diamonds can exceed cell height and clip. */
  const onRowInnerLayout = useCallback((e: LayoutChangeEvent) => {
    if (measuredRef.current) return;
    const { width, height } = e.nativeEvent.layout;
    if (width < 8 || height < 8) return;
    measuredRef.current = true;
    const cellW = (width - 4 * ROW_GAP) / 5;
    const cellH = height;
    const side = (Math.min(cellW, cellH) / Math.SQRT2) * DIAMOND_SIDE_FIT;
    setDiamondSidePx(side);
  }, []);

  return (
    <View
      style={styles.playBoxOuter}
      collapsable={false}
      accessibilityRole="image"
      accessibilityLabel="Stare play grid, fifty diamond tiles, staggered rows">
      <View
        pointerEvents="none"
        style={[styles.playBoxFace, { borderColor }]}
      />
      <View style={styles.field} collapsable={false}>
        {Array.from({ length: ROWS }, (_, row) => {
          const stagger = row % 2 === 1;
          const betweenPairs = row >= 2 && row % 2 === 0;
          const nudgeY =
            diamondSidePx == null
              ? 0
              : (row % 2 === 0 ? 1 : -1) *
                  Math.min(VERT_NUDGE_DP, diamondSidePx * 0.55);
          return (
            <View
              key={row}
              style={[
                styles.row,
                row > 0 && {
                  marginTop: -(
                    ROW_STACK_DP +
                    (betweenPairs ? BETWEEN_PAIRS_ROW_OVERLAP_DP : 0)
                  ),
                },
              ]}>
              <View
                onLayout={onRowInnerLayout}
                style={[
                  styles.rowInner,
                  stagger && { transform: [{ translateX: STAGGER_SHIFT }] },
                ]}>
                {Array.from({ length: COLS }, (_, col) => {
                  const key = row * COLS + col;
                  const isNeural = neuralTileIndices?.has(key) ?? false;
                  return (
                    <View key={key} style={styles.cell}>
                      <View style={styles.diamondWrap}>
                        {diamondSidePx != null ? (
                          <View
                            style={[
                              styles.diamond,
                              isNeural ? styles.diamondNeuralStrand : styles.diamondField,
                              {
                                width: diamondSidePx,
                                height: diamondSidePx,
                                transform: [
                                  { translateY: nudgeY },
                                  { rotate: '45deg' },
                                ],
                              },
                            ]}
                          />
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Horizontal black between columns — keep small so zig-zag mesh stays thin. */
const ROW_GAP = 0.12;

const styles = StyleSheet.create({
  playBoxOuter: {
    alignSelf: 'center',
    width: '96%',
    maxWidth: 312,
    aspectRatio: PLAY_BOX_ASPECT_RATIO,
    overflow: 'visible',
    zIndex: 0,
  },
  playBoxFace: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: BORDER_VERTICAL_INSET_DP,
    bottom: BORDER_VERTICAL_INSET_DP,
    borderWidth: 3,
    borderRadius: 10,
    backgroundColor: FIELD_BLACK,
  },
  field: {
    flex: 1,
    zIndex: 1,
    paddingLeft: '2.5%',
    /**
     * Inset for stagger (`translateX` on odd rows). Was ~22% and left a wide empty band at right;
     * ~12% is usually enough vs 9% shift + rotated corners — raise if the 5th diamond clips.
     */
    paddingRight: '12%',
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  row: {
    flex: 1,
    minHeight: 0,
    overflow: 'visible',
  },
  /** Same 5× flex columns; gap avoids margin overflow that clipped the 5th diamond. */
  rowInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    gap: ROW_GAP,
    minWidth: 0,
    overflow: 'visible',
  },
  /** Transparent: next row’s overlap must not paint black over this row’s diamond tips (stagger rows). */
  cell: {
    flex: 1,
    minWidth: 0,
    overflow: 'visible',
    backgroundColor: 'transparent',
  },
  diamondWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  diamond: {
    borderRadius: 1,
    overflow: 'hidden',
  },
  diamondField: {
    backgroundColor: DIAMOND_CYAN,
  },
  diamondNeuralStrand: {
    backgroundColor: 'rgba(184,255,255,0.14)',
    borderWidth: 3,
    borderColor: NEURAL_STRAND_BORDER_ICY,
  },
});
