/**
 * Static 1024 “neural string” mark for previews or docs.
 * Export flattened PNG: npm run generate:icon-master
 */
import Svg, { G, Polyline, Rect } from 'react-native-svg';

const VIEW = 1024;
const BG = '#0D0D0D';
const CYAN = '#00FFFF';
const DIAMOND_SIDE = 54;
const HALF = DIAMOND_SIDE / 2;

/** Centers along 45° diagonal (y = 1024 − x), symmetric about (512,512). */
const CENTERS: { x: number; y: number }[] = [
  { x: 386.942, y: 637.058 },
  { x: 470.314, y: 553.686 },
  { x: 553.686, y: 470.314 },
  { x: 637.058, y: 386.942 },
];

const polyPoints = CENTERS.map((p) => `${p.x},${p.y}`).join(' ');

type Props = { size?: number };

export function SkeleVigilAppIconMaster({ size = VIEW }: Props) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`}>
      <Rect width={VIEW} height={VIEW} fill={BG} />
      <Polyline
        points={polyPoints}
        fill="none"
        stroke={CYAN}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {CENTERS.map((c, i) => (
        <G key={i} transform={`translate(${c.x} ${c.y}) rotate(45)`}>
          <Rect x={-HALF} y={-HALF} width={DIAMOND_SIDE} height={DIAMOND_SIDE} fill={CYAN} />
        </G>
      ))}
    </Svg>
  );
}
