/**
 * SkeleVigil master icon (1024). Export: npm run generate:icon-master
 */
import Svg, { G, Path, Polyline, Rect } from 'react-native-svg';

const VIEW = 1024;
const BG = '#000000';
const GUNMETAL = '#1A1A1B';
const FILAMENT = '#00BBBB';

const DIAMOND_SIDE = 54;
const HALF = DIAMOND_SIDE / 2;

/** 45deg strand BL to TR; each step toward BL is 15% dimmer (flat fills). */
const CENTERS: { x: number; y: number; fill: string }[] = [
  { x: 386.942, y: 637.058, fill: '#008C8C' },
  { x: 470.314, y: 553.686, fill: '#00B2B2' },
  { x: 553.686, y: 470.314, fill: '#00D9D9' },
  { x: 637.058, y: 386.942, fill: '#00FFFF' },
];

const polyPoints = CENTERS.map((p) => `${p.x},${p.y}`).join(' ');

/** '[' centerline: top bar, left spine, bottom bar; y aligned with strand extent. */
const BRACKET_PATH = 'M 298 349 L 186 349 L 186 675 L 298 675';

const GROUP_TX = 93;

type Props = { size?: number };

export function SkeleVigilAppIconMaster({ size = VIEW }: Props) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`}>
      <Rect width={VIEW} height={VIEW} fill={BG} />
      <G transform={`translate(${GROUP_TX} 0)`}>
        <Path
          d={BRACKET_PATH}
          fill="none"
          stroke={GUNMETAL}
          strokeWidth={44}
          strokeLinecap="square"
          strokeLinejoin="miter"
          strokeMiterlimit={8}
        />
        <Polyline
          points={polyPoints}
          fill="none"
          stroke={FILAMENT}
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {CENTERS.map((c, i) => (
          <G key={i} transform={`translate(${c.x} ${c.y}) rotate(45)`}>
            <Rect x={-HALF} y={-HALF} width={DIAMOND_SIDE} height={DIAMOND_SIDE} fill={c.fill} />
          </G>
        ))}
      </G>
    </Svg>
  );
}
