/**
 * Stare excavation covers: teal-tinted ramp (not neutral grey) so the play surface matches
 * The Stare / diamond chrome; one shade per diamond tile, shuffled per mission.
 */

import { STARE_GRID_TILE_COUNT } from './stareNeuralBlocks';

/** Evenly ramped teal-tinted RGB strings (light → dark), one per Stare diamond. */
export function buildStareGreyPalette(): string[] {
  const light = { r: 175, g: 245, b: 245 };
  const dark = { r: 18, g: 58, b: 62 };
  const denom = Math.max(1, STARE_GRID_TILE_COUNT - 1);
  return Array.from({ length: STARE_GRID_TILE_COUNT }, (_, i) => {
    const t = i / denom;
    const r = Math.round(light.r + (dark.r - light.r) * t);
    const g = Math.round(light.g + (dark.g - light.g) * t);
    const b = Math.round(light.b + (dark.b - light.b) * t);
    return `rgb(${r},${g},${b})`;
  });
}

/** Same ramp as {@link buildStareGreyPalette}, assigned to cells in random order (Fisher–Yates). */
export function shuffledStareGreyPalette(): string[] {
  const palette = buildStareGreyPalette().slice();
  for (let i = palette.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = palette[i];
    palette[i] = palette[j]!;
    palette[j] = tmp!;
  }
  return palette;
}
