import { Animated, Easing, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';

import { SV } from '@/src/theme/skelevigil';

const ROWS = 7;
const COLS = 5;

/** Width:height — 7 rows vs 5 columns keeps the diamond field shorter on phones than the old 10-row board. */
const PLAY_BOX_ASPECT_RATIO = 5 / 7;
const FIELD_BLACK = '#121212';
/** Non-neural lattice fill (teal) — play phase only; memorize matches Glimpse (strand only, no solid field). */
const DIAMOND_CYAN = SV.neonCyan;
const NEURAL_STRAND_BORDER_ICY = '#B8FFFF';
const STAGGER_SHIFT = '9%';
const VERT_NUDGE_DP = 38;
const ROW_STACK_DP = 44;
const BETWEEN_PAIRS_ROW_OVERLAP_DP = 78;
const DIAMOND_SIDE_FIT = 0.997;
/** Teal frame sits inside the aspect box via vertical margin (same inset as the old absolute face). */
const BORDER_VERTICAL_INSET_DP = 12;
/**
 * Padding *inside* the bordered face — rotated squares extend past their layout box; `playBoxFace` uses
 * `overflow: 'hidden'`. Top is larger than bottom (row nudge + seam overlap pulls visuals upward).
 */
const FIELD_MESH_TOP_BLEED_DP = 36;
const FIELD_MESH_BOTTOM_BLEED_DP = 26;
/** Min gap between flex columns (pt). Avoid ~0 values — tiny `gap` breaks column widths on some RN builds. */
const ROW_GAP = 1;

type Props = {
  borderColor: string;
  neuralTileIndices: ReadonlySet<number>;
  colors: string[];
  showTiles: boolean;
  failedIndex?: number | null;
  timedOut?: boolean;
  excavationPressureFraction?: number | null;
  scanProgress?: number | null;
  successPulseToken?: number;
  revealed: boolean[];
  onRevealCell: (index: number) => void;
};

/**
 * Stare: 7×5 diamond lattice (35 tiles); play-phase covers are rotated squares matching each diamond
 * (not axis-aligned cell rectangles), so the mesh stays visually diamond-shaped.
 */
export function StareRevealBoard({
  borderColor,
  neuralTileIndices,
  colors,
  showTiles,
  failedIndex = null,
  timedOut = false,
  excavationPressureFraction = null,
  scanProgress = null,
  successPulseToken = 0,
  revealed,
  onRevealCell,
}: Props) {
  const [diamondSidePx, setDiamondSidePx] = useState<number | null>(null);
  const [fieldHeight, setFieldHeight] = useState(0);

  const failAnim = useFailAnim(failedIndex);
  const heartbeatAnim = useSuccessPulse(successPulseToken);
  const signalLossOpacity = useSignalLossOverlay(timedOut);
  const scanTopPx =
    scanProgress == null || fieldHeight <= 0
      ? null
      : Math.min(1, Math.max(0, scanProgress)) * fieldHeight;
  const pressure =
    excavationPressureFraction == null ? 0 : Math.min(1, Math.max(0, excavationPressureFraction));
  const pressureOpacity = pressure * 0.76;

  /** Rows share geometry; fixed row height avoids flex:1 equal slices + overlap leaving false gaps (Glimpse uses fixed 5×5). */
  const onRowInnerLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width < 8 || height < 8) return;
    const cellW = (width - 4 * ROW_GAP) / 5;
    const cellH = height;
    const side = (Math.min(cellW, cellH) / Math.SQRT2) * DIAMOND_SIDE_FIT;
    setDiamondSidePx(side);
  }, []);

  const onFieldLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) setFieldHeight(h);
  }, []);

  return (
    <View
      style={styles.playBoxOuter}
      collapsable={false}
      accessibilityRole="image"
      accessibilityLabel="Stare excavation grid, thirty-five diamond tiles">
      <View style={[styles.playBoxFace, { borderColor }]} collapsable={false}>
        <View style={styles.field} collapsable={false} onLayout={onFieldLayout}>
        <View style={styles.playField} pointerEvents="box-none">
          <View collapsable={false} style={styles.meshRowsWrap}>
          {Array.from({ length: ROWS }, (_, row) => {
            const isLastRow = row === ROWS - 1;
            const stagger = row % 2 === 1;
            /** Extra overlap at even row seams (was tuned for 10 rows). Last row index is odd on 10×5, even on 7×5 — skip extra pull on final row. */
            const betweenPairs = row >= 2 && row % 2 === 0 && row < ROWS - 1;
            const baseNudgeY =
              diamondSidePx == null
                ? 0
                : (row % 2 === 0 ? 1 : -1) * Math.min(VERT_NUDGE_DP, diamondSidePx * 0.55);
            /** Last row: no downward nudge — avoids painting past the bottom inner edge. */
            const nudgeY = isLastRow ? 0 : baseNudgeY;
            return (
              <View
                key={row}
                style={[
                  styles.row,
                  row > 0 && {
                    marginTop: -(ROW_STACK_DP + (betweenPairs ? BETWEEN_PAIRS_ROW_OVERLAP_DP : 0)),
                  },
                ]}>
                <View
                  onLayout={onRowInnerLayout}
                  style={[styles.rowInner, stagger && { transform: [{ translateX: STAGGER_SHIFT }] }]}>
                  {Array.from({ length: COLS }, (_, col) => {
                    const idx = row * COLS + col;
                    const isNeural = neuralTileIndices.has(idx);
                    const isRevealed = revealed[idx] === true;
                    const disabledAll = failedIndex != null || timedOut;
                    /**
                     * Memorize: only `isNeural` cells render — strand style (Glimpse: path vs empty).
                     * Play: full lattice; safe excavations use `diamondExcavated`.
                     */
                    const latticeDiamondStyle = showTiles
                      ? isNeural
                        ? styles.diamondNeuralStrand
                        : isRevealed
                          ? styles.diamondExcavated
                          : styles.diamondField
                      : styles.diamondNeuralStrand;
                    const showLatticeDiamond =
                      diamondSidePx != null && (showTiles || isNeural);
                    return (
                      <View key={idx} style={styles.cell}>
                        <View style={styles.diamondWrap} pointerEvents="none">
                          {showLatticeDiamond ? (
                            <View
                              style={[
                                styles.diamond,
                                latticeDiamondStyle,
                                {
                                  width: diamondSidePx,
                                  height: diamondSidePx,
                                  transform: [{ translateY: nudgeY }, { rotate: '45deg' }],
                                },
                              ]}>
                              {isNeural ? (
                                <Animated.View
                                  pointerEvents="none"
                                  style={[styles.neuralStrandPulseFill, heartbeatAnim]}
                                />
                              ) : null}
                            </View>
                          ) : null}
                        </View>
                        {showTiles && diamondSidePx != null ? (
                          <View style={styles.coverDiamondSlot} pointerEvents="box-none">
                            <Pressable
                              disabled={isRevealed || disabledAll}
                              onPress={() => onRevealCell(idx)}
                              style={[
                                styles.coverPressableFace,
                                {
                                  width: diamondSidePx,
                                  height: diamondSidePx,
                                  transform: [{ translateY: nudgeY }, { rotate: '45deg' }],
                                },
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel={
                                isRevealed ? `Tile ${idx + 1} revealed` : `Remove tile ${idx + 1}`
                              }
                              accessibilityState={{ disabled: isRevealed }}>
                              <Animated.View
                                style={[
                                  StyleSheet.absoluteFillObject,
                                  styles.coverTile,
                                  isRevealed ? styles.coverTileRevealed : null,
                                  !isRevealed
                                    ? { backgroundColor: colors[idx] ?? SV.muted }
                                    : null,
                                  idx === failedIndex ? failAnim : null,
                                ]}
                              />
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
          </View>
          {showTiles && excavationPressureFraction != null && pressureOpacity > 0 ? (
            <View
              pointerEvents="none"
              style={[styles.signalPressureOverlay, { opacity: pressureOpacity }]}
            />
          ) : null}
          {scanTopPx != null ? (
            <View pointerEvents="none" style={[styles.scanSweepWrap, { top: scanTopPx }]}>
              <View style={styles.scanSweepCore} />
            </View>
          ) : null}
          {showTiles && timedOut ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.signalLossOverlay, { opacity: signalLossOpacity }]}
            />
          ) : null}
        </View>
        </View>
      </View>
    </View>
  );
}

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
    marginVertical: BORDER_VERTICAL_INSET_DP,
    borderWidth: 3,
    borderRadius: 10,
    backgroundColor: FIELD_BLACK,
    overflow: 'hidden',
  },
  field: {
    flex: 1,
    minHeight: 0,
    paddingLeft: '2.5%',
    paddingRight: '12%',
    paddingTop: FIELD_MESH_TOP_BLEED_DP,
    paddingBottom: FIELD_MESH_BOTTOM_BLEED_DP,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  playField: {
    flex: 1,
    position: 'relative',
    minHeight: 0,
    overflow: 'visible',
    justifyContent: 'flex-start',
  },
  /** Must fill `playField` so seven `flex:1` rows get real height (`flexGrow:0` left ~2 rows + empty band). */
  meshRowsWrap: {
    flex: 1,
    alignSelf: 'stretch',
    minHeight: 0,
    width: '100%',
  },
  row: {
    flex: 1,
    minHeight: 0,
    overflow: 'visible',
  },
  rowInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    gap: ROW_GAP,
    minWidth: 0,
    overflow: 'visible',
  },
  cell: {
    flex: 1,
    minWidth: 0,
    overflow: 'visible',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  /** Top-align (all rows): last-row `flex-end` caused a false “blank” band between rows 5 and 7. */
  coverDiamondSlot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
    elevation: 6,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  coverPressableFace: {
    borderRadius: 1,
    overflow: 'hidden',
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
  /** Safe tile excavated: no solid lattice fill (same idea as Glimpse `cellRevealed` + transparent neural off-cell). */
  diamondExcavated: {
    backgroundColor: 'transparent',
  },
  diamondNeuralStrand: {
    backgroundColor: 'rgba(184,255,255,0.14)',
    borderWidth: 3,
    borderColor: NEURAL_STRAND_BORDER_ICY,
  },
  neuralStrandPulseFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(184,255,255,0.28)',
  },
  coverTile: {
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 1.5,
  },
  coverTileRevealed: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
  },
  signalPressureOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
    elevation: 10,
    backgroundColor: SV.black,
  },
  scanSweepWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    marginTop: -6,
    zIndex: 5,
    elevation: 11,
    alignItems: 'stretch',
  },
  scanSweepCore: {
    height: 12,
    backgroundColor: 'rgba(0,255,255,0.68)',
    shadowColor: SV.neonCyan,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  signalLossOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 6,
    elevation: 12,
    backgroundColor: SV.black,
  },
});

function useFailAnim(failedIndex: number | null): Record<string, unknown> {
  const progressRef = useRef(new Animated.Value(0));
  const prevIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (failedIndex == null) return;
    if (prevIndexRef.current === failedIndex) return;
    prevIndexRef.current = failedIndex;

    const p = progressRef.current;
    p.setValue(0);
    Animated.sequence([
      Animated.timing(p, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [failedIndex]);

  const p = progressRef.current;

  const shake = p.interpolate({
    inputRange: [0, 0.08, 0.16, 0.24, 0.32, 0.42, 1],
    outputRange: [0, -6, 6, -5, 4, 0, 0],
  });
  const rot = p.interpolate({
    inputRange: [0, 0.25, 0.5, 1],
    outputRange: ['0deg', '-3deg', '2deg', '0deg'],
  });
  const scale = p.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [1, 0.92, 0.18],
  });
  const opacity = p.interpolate({
    inputRange: [0, 0.65, 1],
    outputRange: [1, 1, 0],
  });

  return {
    opacity,
    transform: [{ translateX: shake }, { rotate: rot }, { scale }],
  };
}

function useSignalLossOverlay(active: boolean): Animated.Value {
  const opacity = useRef(new Animated.Value(0)).current;
  const prevRef = useRef(false);

  useEffect(() => {
    if (active && !prevRef.current) {
      prevRef.current = true;
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 0.34,
        duration: 720,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
    if (!active && prevRef.current) {
      prevRef.current = false;
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [active, opacity]);

  return opacity;
}

function useSuccessPulse(successPulseToken: number): Record<string, unknown> {
  const beatRef = useRef(new Animated.Value(0));
  const prevTokenRef = useRef(successPulseToken);

  useEffect(() => {
    if (successPulseToken === prevTokenRef.current) return;
    prevTokenRef.current = successPulseToken;
    const p = beatRef.current;
    p.setValue(0);
    Animated.sequence([
      Animated.timing(p, {
        toValue: 1,
        duration: 230,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(p, {
        toValue: 0,
        duration: 230,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(p, {
        toValue: 1,
        duration: 230,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(p, {
        toValue: 0,
        duration: 260,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [successPulseToken]);

  const p = beatRef.current;
  const opacity = p.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.9],
  });
  const scale = p.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });
  return { opacity, transform: [{ scale }] };
}
