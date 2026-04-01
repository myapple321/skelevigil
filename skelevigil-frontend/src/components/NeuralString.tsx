import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { G, Rect } from 'react-native-svg';
import Animated, {
  type SharedValue,
  Easing,
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

/** One full turn every 80s, linear — barely perceptible, calm for seniors */
const SPIN_DURATION_MS = 80_000;

const SVG_WIDTH = 220;
const SVG_HEIGHT = 100;

/**
 * Shrinks the art so a full 360° spin (after inner 45° tilt) stays inside the login “slot”
 * between subtitle and buttons on typical phone widths.
 */
const SLOT_HEIGHT = 130;
const LAYOUT_SCALE = 0.52;

/** Geometric center of the 4-diamond row in viewBox (0–210): x = 112, y = 50 → layout px */
const PIVOT_X = (112 / 210) * SVG_WIDTH;
const PIVOT_Y = SVG_HEIGHT / 2;

type PulseDiamondProps = {
  cx: number;
  cy: number;
  x: number;
  y: number;
  size: number;
  phase: number;
  pulse: SharedValue<number>;
};

function PulseDiamond({ cx, cy, x, y, size, phase, pulse }: PulseDiamondProps) {
  const animatedProps = useAnimatedProps(() => {
    const t = ((pulse.value + phase) % 1 + 1) % 1;
    return {
      fill: interpolateColor(t, [0, 0.5, 1], ['#004444', '#00FFFF', '#004444']),
      opacity: 0.5 + 0.5 * (1 - Math.abs(t - 0.5) * 2),
    };
  });

  return (
    <G transform={`rotate(45, ${cx}, ${cy})`}>
      <AnimatedRect x={x} y={y} width={size} height={size} animatedProps={animatedProps} />
    </G>
  );
}

export function NeuralString() {
  const pulse = useSharedValue(0);
  const spinDeg = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1500 }), -1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- SharedValue instance is stable
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(spinDeg);
      spinDeg.value = 0;
      return;
    }
    spinDeg.value = withRepeat(
      withTiming(360, { duration: SPIN_DURATION_MS, easing: Easing.linear }),
      -1,
      false
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- SharedValue instance is stable
  }, [reduceMotion]);

  /** Pivot via translates — order: move pivot to origin, rotate, move back */
  const spinStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -PIVOT_X },
      { translateY: -PIVOT_Y },
      { rotate: `${spinDeg.value}deg` },
      { translateX: PIVOT_X },
      { translateY: PIVOT_Y },
    ],
  }));

  return (
    <View style={styles.anchor}>
      <View style={styles.scaleWrap}>
        <Animated.View style={[styles.spinStage, spinStyle]} collapsable={false}>
          <View style={styles.tilt45}>
            <Svg width={SVG_WIDTH} height={SVG_HEIGHT} viewBox="0 0 210 100">
              <PulseDiamond cx={52} cy={50} x={42} y={40} size={20} phase={0} pulse={pulse} />
              <PulseDiamond cx={92} cy={50} x={82} y={40} size={20} phase={0.2} pulse={pulse} />
              <PulseDiamond cx={132} cy={50} x={122} y={40} size={20} phase={0.4} pulse={pulse} />
              <PulseDiamond cx={172} cy={50} x={162} y={40} size={20} phase={0.6} pulse={pulse} />
            </Svg>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    width: '100%',
    maxWidth: '100%',
    height: SLOT_HEIGHT,
    marginBottom: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleWrap: {
    transform: [{ scale: LAYOUT_SCALE }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinStage: {
    width: SVG_WIDTH,
    height: SVG_HEIGHT,
    overflow: 'hidden',
  },
  tilt45: {
    transform: [{ rotate: '45deg' }],
  },
});
