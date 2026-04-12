import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useEffect, useRef } from 'react';

import { PHASE_ACCENTS } from '@/src/theme/phaseAccents';
import { SV } from '@/src/theme/skelevigil';

import {
  GLIMPSE_CELL_GAP,
  GLIMPSE_GRID_INSET,
  GLIMPSE_PREVIEW_SIZE,
} from '@/src/components/game/GlimpseBlockGrid';
import { type NeuralBlock, neuralBlockToTileIndex } from '@/src/game/neuralBlocks';

type Props = {
  colors: string[];
  /** Path cells; each is drawn as its own rounded rect (no line between cells). */
  neuralBlocks: NeuralBlock[];
  /** When false, only the mat + neural blocks show — tiles hidden. */
  showTiles: boolean;
  /** If set, animate the given tile as a "fail" shatter and disable further taps. */
  failedIndex?: number | null;
  /** Excavation time expired: dim tiles / signal-loss overlay. */
  timedOut?: boolean;
  /** 0..1 pressure toward deadline; tiles dim progressively (signal loss). Null = off. */
  excavationPressureFraction?: number | null;
  /** 0..1 while system scan runs; null when idle. */
  scanProgress?: number | null;
  /** Increment to trigger success heartbeat pulse on neural blocks. */
  successPulseToken?: number;
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
  failedIndex = null,
  timedOut = false,
  excavationPressureFraction = null,
  scanProgress = null,
  successPulseToken = 0,
  size = GLIMPSE_PREVIEW_SIZE,
  matPadding = GLIMPSE_GRID_INSET,
  cellGap = GLIMPSE_CELL_GAP,
  revealed,
  onRevealCell,
}: Props) {
  const neuralTileSet = new Set(neuralBlocks.map(neuralBlockToTileIndex));
  const failAnim = useFailAnim(failedIndex);
  const heartbeatAnim = useSuccessPulse(successPulseToken);
  const signalLossOpacity = useSignalLossOverlay(timedOut);
  const playFieldSize = Math.max(0, size - matPadding * 2);
  const scanTopPx =
    scanProgress == null ? null : Math.min(1, Math.max(0, scanProgress)) * playFieldSize;
  const pressure = excavationPressureFraction == null ? 0 : Math.min(1, Math.max(0, excavationPressureFraction));
  const pressureOpacity = pressure * 0.76;

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
                        ]}>
                        {isNeural ? (
                          <Animated.View pointerEvents="none" style={[styles.neuralPulseFill, heartbeatAnim]} />
                        ) : null}
                      </View>
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
                    const disabledAll = failedIndex != null || timedOut;
                    return (
                      <Pressable
                        key={col}
                        disabled={isRevealed || disabledAll}
                        onPress={() => onRevealCell(idx)}
                        style={styles.cellPressable}
                        accessibilityRole="button"
                        accessibilityLabel={
                          isRevealed
                            ? `Tile ${idx + 1} revealed`
                            : `Remove tile ${idx + 1}`
                        }
                        accessibilityState={{ disabled: isRevealed }}>
                        <Animated.View
                          style={[
                            styles.cell,
                            isRevealed ? styles.cellRevealed : null,
                            !isRevealed
                              ? { backgroundColor: colors[idx] ?? SV.muted }
                              : null,
                            idx === failedIndex ? failAnim : null,
                          ]}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          ) : null}
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
  );
}

const styles = StyleSheet.create({
  artFrame: {
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: PHASE_ACCENTS.glimpse.primary,
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
  signalLossOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 6,
    elevation: 12,
    backgroundColor: SV.black,
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
    overflow: 'hidden',
  },
  neuralCellOff: {
    backgroundColor: 'transparent',
  },
  neuralCellOn: {
    backgroundColor: 'rgba(0,255,255,0.14)',
    borderWidth: 2,
    borderColor: SV.neonCyan,
  },
  neuralPulseFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,255,255,0.28)',
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

function useFailAnim(failedIndex: number | null): any {
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

function useSuccessPulse(successPulseToken: number): any {
  const beatRef = useRef(new Animated.Value(0));
  const prevTokenRef = useRef(successPulseToken);

  useEffect(() => {
    if (successPulseToken === prevTokenRef.current) return;
    prevTokenRef.current = successPulseToken;
    const p = beatRef.current;
    p.setValue(0);
    Animated.sequence([
      Animated.timing(p, { toValue: 1, duration: 230, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(p, { toValue: 0, duration: 230, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(p, { toValue: 1, duration: 230, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(p, { toValue: 0, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
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
