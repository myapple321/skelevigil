import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { G, Rect } from 'react-native-svg';
import Animated, {
  type SharedValue,
  interpolateColor,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

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

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1500 }), -1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- SharedValue instance is stable
  }, []);

  return (
    <View style={styles.anchor}>
      <View style={styles.rotated}>
        <Svg width={220} height={100} viewBox="0 0 210 100">
          <PulseDiamond cx={52} cy={50} x={42} y={40} size={20} phase={0} pulse={pulse} />
          <PulseDiamond cx={92} cy={50} x={82} y={40} size={20} phase={0.2} pulse={pulse} />
          <PulseDiamond cx={132} cy={50} x={122} y={40} size={20} phase={0.4} pulse={pulse} />
          <PulseDiamond cx={172} cy={50} x={162} y={40} size={20} phase={0.6} pulse={pulse} />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    minHeight: 160,
    width: '100%',
  },
  rotated: {
    transform: [{ rotate: '45deg' }],
  },
});
