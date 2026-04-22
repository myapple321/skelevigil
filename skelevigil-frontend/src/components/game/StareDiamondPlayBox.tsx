import { useCallback, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { stareRowStackPullDp } from '@/src/game/stareMeshOverlap';
import { SV } from '@/src/theme/skelevigil';

const ROWS = 7;
const COLS = 5;

/** Width:height — matches 7×5 Stare board (`StareRevealBoard`); tune if mesh clips. */
const PLAY_BOX_ASPECT_RATIO = 5 / 7;

/** Reference lattice: black gutters (hairlines) between bright cyan diamonds. */
const FIELD_BLACK = '#121212';
const DIAMOND_CYAN = SV.neonCyan;
/** Neural strand cells — brighter than field diamonds for memorization contrast. */
const NEURAL_STRAND_BORDER_ICY = '#B8FFFF';
/**
 * ~max inscribed rotated square in cell — drives “hairline” black inside each tile.
 * If tips clip, lower to ~0.992 before touching stack/nudge.
 */
const DIAMOND_SIDE_FIT = 0.82;
/** Teal frame inset inside the aspect outer (`margin` on `playBoxFace`). */
const BORDER_VERTICAL_INSET_DP = 34;
/** Inside-face bleed — match `StareRevealBoard` so phase art doesn’t clip diamond tips. */
const FIELD_MESH_TOP_BLEED_DP = 36;
const FIELD_MESH_BOTTOM_BLEED_DP = 26;

type Props = {
  /** Stare phase chrome (outer border). */
  borderColor: string;
  /** Tile indices (0–34, row-major top→bottom) that belong to the neural strand. */
  neuralTileIndices?: ReadonlySet<number>;
  /**
   * Fixed outer width for small tiles (e.g. Phases `ART_SIZE` square). Height follows `5:7` aspect.
   * Tighter face/mesh padding so seven rows stay readable.
   */
  previewWidth?: number;
};

/**
 * 7 × 5 = 35 diamonds: stagger via translateX on odd rows (1-based rows 2,4,6).
 * Opaque cells + row overlap painted over stagger rows’ tips; cells stay transparent (mesh from face).
 */
export function StareDiamondPlayBox({
  borderColor,
  neuralTileIndices,
  previewWidth,
}: Props) {
  const measuredRef = useRef(false);
  const [diamondSidePx, setDiamondSidePx] = useState<number | null>(null);
  const [staggerShiftPx, setStaggerShiftPx] = useState(0);
  const isPreview = previewWidth != null;
  const faceMarginV = isPreview ? 6 : BORDER_VERTICAL_INSET_DP;
  const fieldPadTop = isPreview ? 6 : FIELD_MESH_TOP_BLEED_DP;
  const fieldPadBottom = isPreview ? 6 : FIELD_MESH_BOTTOM_BLEED_DP;

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
    setStaggerShiftPx(Math.max(0, Math.round((cellW / 2) * 1000) / 1000));
  }, []);

  return (
    <View
      style={[
        styles.playBoxOuter,
        isPreview && {
          width: previewWidth,
          maxWidth: previewWidth,
          alignSelf: 'center',
        },
      ]}
      collapsable={false}
      accessibilityRole="image"
      accessibilityLabel="Stare play grid, thirty-five diamond tiles, staggered rows">
      <View
        style={[styles.playBoxFace, { borderColor, marginVertical: faceMarginV }]}
        collapsable={false}>
        <View
          style={[styles.field, { paddingTop: fieldPadTop, paddingBottom: fieldPadBottom }]}
          collapsable={false}>
        {Array.from({ length: ROWS }, (_, row) => {
          const stagger = row % 2 === 1;
          const stackPullDp = stareRowStackPullDp(row, null);
          const nudgeY = 0;
          return (
            <View
              key={row}
              style={[
                styles.row,
                row > 0 && {
                  transform: [{ translateY: -stackPullDp }],
                  zIndex: row,
                },
              ]}>
              <View
                onLayout={onRowInnerLayout}
                style={[
                  styles.rowInner,
                  stagger && staggerShiftPx > 0 && { transform: [{ translateX: staggerShiftPx }] },
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
    overflow: 'hidden',
    zIndex: 0,
  },
  playBoxFace: {
    flex: 1,
    borderWidth: 3,
    borderRadius: 10,
    backgroundColor: FIELD_BLACK,
    overflow: 'hidden',
  },
  field: {
    flex: 1,
    minHeight: 0,
    paddingLeft: '2.5%',
    /**
     * Inset for stagger (`translateX` on odd rows). Was ~22% and left a wide empty band at right;
     * ~12% is usually enough vs 9% shift + rotated corners — raise if the 5th diamond clips.
     */
    paddingRight: '12%',
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
    justifyContent: 'flex-start',
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
