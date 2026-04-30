/**
 * Trance play-field hex fills: warm amber ramp (light cream → deep ember), shuffled per mission,
 * parallel to {@link shuffledStareGreyPalette} / {@link shuffledGlimpseGreyPalette}.
 */

import { STARE_GRID_TILE_COUNT } from './stareNeuralBlocks';

/** Evenly ramped amber-tinted RGB strings (highlight → deep), one per 7×5 hex. */
export function buildTranceAmberFieldPalette(): string[] {
  const light = { r: 255, g: 236, b: 210 };
  const dark = { r: 58, g: 28, b: 8 };
  const denom = Math.max(1, STARE_GRID_TILE_COUNT - 1);
  return Array.from({ length: STARE_GRID_TILE_COUNT }, (_, i) => {
    const t = i / denom;
    const r = Math.round(light.r + (dark.r - light.r) * t);
    const g = Math.round(light.g + (dark.g - light.g) * t);
    const b = Math.round(light.b + (dark.b - light.b) * t);
    return `rgb(${r},${g},${b})`;
  });
}

/** Same ramp as {@link buildTranceAmberFieldPalette}, Fisher–Yates shuffle per sortie. */
export function shuffledTranceAmberPalette(): string[] {
  const palette = buildTranceAmberFieldPalette().slice();
  for (let i = palette.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = palette[i];
    palette[i] = palette[j]!;
    palette[j] = tmp!;
  }
  return palette;
}
