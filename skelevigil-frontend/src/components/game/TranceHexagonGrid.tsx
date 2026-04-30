import { useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Polygon, Text as SvgText } from 'react-native-svg';

const ROWS = 7;
const COLS = 5;
const GRID_COUNT = ROWS * COLS;
const SQRT3 = Math.sqrt(3);
/** Width/height of staggered pointy-top bbox — shell uses this so `contain`-style scale fills the frame without column clip. */
const HEX_BBOX_WH =
  (SQRT3 * (COLS + 0.5)) / (1.5 * (ROWS - 1) + 2);

export type TranceHexStatus = 'active' | 'shattered' | 'future';

type Props = {
  statuses: TranceHexStatus[];
  onPressCell?: (index: number) => void;
  disabled?: boolean;
  label?: string;
  /** `memory`: dark future tiles (memorize / idle). `field`: amber future tiles (excavation play). */
  surface?: 'memory' | 'field';
  /** Per-cell fills for `surface="field"` future hexes (35 shuffled ambers); from {@link shuffledTranceAmberPalette}. */
  fieldFills?: string[];
};

type HexColors = {
  fill: string;
  stroke: string;
};

const STATUS_COLORS: Record<TranceHexStatus, HexColors> = {
  active: { fill: '#E89A2D', stroke: '#FFD79A' },
  shattered: { fill: '#673313', stroke: '#FFAF57' },
  future: { fill: '#2E2116', stroke: '#7E5630' },
};

/** Fallback when `fieldFills` is missing — flat amber. */
const FUTURE_FIELD: HexColors = { fill: '#E89A2D', stroke: '#A86A28' };

function strokeForFieldFill(fill: string): string {
  const rgb = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(fill.trim());
  if (rgb) {
    const r = Math.max(0, Math.min(255, Math.round(Number(rgb[1]) * 0.52)));
    const g = Math.max(0, Math.min(255, Math.round(Number(rgb[2]) * 0.4)));
    const b = Math.max(0, Math.min(255, Math.round(Number(rgb[3]) * 0.26)));
    return `rgb(${r},${g},${b})`;
  }
  return FUTURE_FIELD.stroke;
}

function fieldColorsAtIndex(idx: number, fieldFills: string[] | undefined): HexColors {
  const fill = fieldFills?.[idx] ?? FUTURE_FIELD.fill;
  return { fill, stroke: strokeForFieldFill(fill) };
}

function colorsForStatus(
  status: TranceHexStatus,
  surface: 'memory' | 'field',
  idx: number,
  fieldFills: string[] | undefined,
): HexColors {
  if (status === 'active') return STATUS_COLORS.active;
  if (status === 'shattered') return STATUS_COLORS.shattered;
  if (surface === 'field') return fieldColorsAtIndex(idx, fieldFills);
  return STATUS_COLORS.future;
}

function clampStatuses(statuses: TranceHexStatus[]): TranceHexStatus[] {
  if (statuses.length >= GRID_COUNT) return statuses.slice(0, GRID_COUNT);
  return [
    ...statuses,
    ...Array.from({ length: GRID_COUNT - statuses.length }, (): TranceHexStatus => 'future'),
  ];
}

/** Pointy-top regular hex: circumradius R = distance center → vertex. */
function hexPolygonPoints(cx: number, cy: number, R: number): string {
  const parts: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const rad = (-Math.PI / 2 + (i * Math.PI) / 3);
    parts.push(`${cx + R * Math.cos(rad)},${cy + R * Math.sin(rad)}`);
  }
  return parts.join(' ');
}

export function TranceHexagonGrid({
  statuses,
  onPressCell,
  disabled = false,
  label = 'Trance hexagon excavation grid, thirty-five cells',
  surface = 'memory',
  fieldFills,
}: Props) {
  const safeStatuses = clampStatuses(statuses);
  const [layout, setLayout] = useState({ w: 0, h: 0 });

  const onShellLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const w = Number(width);
    const h = Number(height);
    if (Number.isFinite(w) && Number.isFinite(h) && w > 4 && h > 4) {
      setLayout({ w, h });
    }
  }, []);

  const geometry = useMemo(() => {
    const pad = 10;
    if (!Number.isFinite(layout.w) || !Number.isFinite(layout.h)) return null;
    const innerW = Math.max(0, layout.w - pad * 2);
    const innerH = Math.max(0, layout.h - pad * 2);
    if (!Number.isFinite(innerW) || !Number.isFinite(innerH) || innerW < 8 || innerH < 8) {
      return null;
    }

    /** Pointy-top row-major: odd rows offset half a horizontal step. */
    const sFromW = innerW / (SQRT3 * (COLS + 0.5));
    const sFromH = innerH / (1.5 * (ROWS - 1) + 2);
    if (!Number.isFinite(sFromW) || !Number.isFinite(sFromH)) return null;
    const smin = Math.min(sFromW, sFromH);
    const s = Math.max(4, smin * 0.98);
    if (!Number.isFinite(s) || s <= 0) return null;
    const R = s;

    /** Staggered rows: min x is left of col0 on an even row, max x is right of col4 on an odd row → width (COLS+0.5)*√3*s. */
    const gridW = SQRT3 * s * (COLS + 0.5);
    const gridH = 1.5 * s * (ROWS - 1) + 2 * s;
    const bboxLeft = pad + (innerW - gridW) / 2;
    /** `cx` on even rows is column-0 center, not bbox left; that center sits √3·s/2 to the right of the left flat edge. */
    const originX = bboxLeft + (SQRT3 * s) / 2;
    const originY = pad + (innerH - gridH) / 2;

    const cells: {
      idx: number;
      cx: number;
      cy: number;
      left: number;
      top: number;
      w: number;
      h: number;
    }[] = [];

    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const idx = row * COLS + col;
        const cx = originX + SQRT3 * s * (col + 0.5 * (row % 2));
        const cy = originY + s + 1.5 * s * row;
        const left = cx - (SQRT3 * s) / 2;
        const top = cy - s;
        const w = SQRT3 * s;
        const h = 2 * s;
        cells.push({ idx, cx, cy, left, top, w, h });
      }
    }

    return { pad, s, R, cells, svgW: layout.w, svgH: layout.h };
  }, [layout.h, layout.w]);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={label}
      style={styles.shell}
      onLayout={onShellLayout}>
      {geometry ? (
        <>
          <Svg width={geometry.svgW} height={geometry.svgH} style={StyleSheet.absoluteFill}>
            {geometry.cells.map(({ idx, cx, cy }) => {
              const status = safeStatuses[idx] ?? 'future';
              const { fill, stroke } = colorsForStatus(status, surface, idx, fieldFills);
              return (
                <Polygon
                  key={idx}
                  points={hexPolygonPoints(cx, cy, geometry.R * 0.94)}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={1.6}
                />
              );
            })}
            {geometry.cells.map(({ idx, cx, cy }) => {
              if (safeStatuses[idx] !== 'shattered') return null;
              return (
                <SvgText
                  key={`x-${idx}`}
                  x={cx}
                  y={cy + geometry.R * 0.12}
                  fill="#FFD6AA"
                  fontSize={Math.max(9, geometry.R * 0.55)}
                  fontWeight="700"
                  textAnchor="middle">
                  x
                </SvgText>
              );
            })}
          </Svg>
          {geometry.cells.map(({ idx, left, top, w, h }) => (
            <Pressable
              key={`hit-${idx}`}
              disabled={disabled || !onPressCell}
              onPress={() => onPressCell?.(idx)}
              style={({ pressed }) => [
                styles.hit,
                { left, top, width: w, height: h },
                pressed && !disabled && onPressCell ? styles.hitPressed : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Hex tile ${idx + 1}, ${safeStatuses[idx] ?? 'future'}`}
              accessibilityState={{ disabled: disabled || !onPressCell }}
            />
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '96%',
    maxWidth: 312,
    aspectRatio: HEX_BBOX_WH,
    alignSelf: 'center',
    borderWidth: 3,
    borderRadius: 10,
    borderColor: '#E89A2D',
    backgroundColor: '#120B07',
    overflow: 'hidden',
    position: 'relative',
  },
  hit: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  hitPressed: {
    opacity: 0.88,
    backgroundColor: 'rgba(255,215,154,0.08)',
  },
});
