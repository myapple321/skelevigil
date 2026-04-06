/**
 * Static 1024 neural-strand icon (preview). Export PNG: npm run generate:icon-master
 */
import Svg, { G, Path, Polyline, Rect } from 'react-native-svg';

const VIEW = 1024;
const BG = '#0D0D0D';
/** Dim bracket; #121212 on #0D0D0D vanishes at icon scale—slightly lighter for visibility. */
const FRAME = '#2A2A2A';
const CYAN_BRIGHT = '#00FFFF';
const CYAN_DIM = '#00AAAA';

const DIAMOND_SIDE = 54;
const HALF = DIAMOND_SIDE / 2;

/** BL to TR along y = 1024 - x; last = top-right (bright pulse). */
const CENTERS: { x: number; y: number; fill: string }[] = [
  { x: 386.942, y: 637.058, fill: CYAN_DIM },
  { x: 470.314, y: 553.686, fill: CYAN_DIM },
  { x: 553.686, y: 470.314, fill: CYAN_DIM },
  { x: 637.058, y: 386.942, fill: CYAN_BRIGHT },
];

const polyPoints = CENTERS.map((p) => `${p.x},${p.y}`).join(' ');

/** Guardian-style thick C; stroke centerline, opening right toward strand. */
const FRAME_PATH = 'M 304 184 L 126 184 L 126 840 L 304 840';

type Props = { size?: number };

export function SkeleVigilAppIconMaster({ size = VIEW }: Props) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`}>
      <Rect width={VIEW} height={VIEW} fill={BG} />
      <Path
        d={FRAME_PATH}
        fill="none"
        stroke={FRAME}
        strokeWidth={44}
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeMiterlimit={8}
      />
      <Polyline
        points={polyPoints}
        fill="none"
        stroke={CYAN_DIM}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {CENTERS.map((c, i) => (
        <G key={i} transform={`translate(${c.x} ${c.y}) rotate(45)`}>
          <Rect x={-HALF} y={-HALF} width={DIAMOND_SIDE} height={DIAMOND_SIDE} fill={c.fill} />
        </G>
      ))}
    </Svg>
  );
}
