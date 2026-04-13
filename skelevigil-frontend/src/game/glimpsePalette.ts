/** Same luminance ramp as the Phases Glimpse preview: 244 → 62 across 25 steps. */
const GLIMPSE_GREY_LIGHT = 244;
const GLIMPSE_GREY_DARK = 62;

/** 25 evenly spaced grey RGB strings (light → dark), one per block. */
export function buildGlimpseGreyPalette(): string[] {
  const light = GLIMPSE_GREY_LIGHT;
  const dark = GLIMPSE_GREY_DARK;
  return Array.from({ length: 25 }, (_, i) => {
    const t = i / 24;
    const v = Math.round(light + (dark - light) * t);
    return `rgb(${v},${v},${v})`;
  });
}

/** Same 25 greys as `buildGlimpseGreyPalette`, assigned to cells in random order (Fisher–Yates). */
export function shuffledGlimpseGreyPalette(): string[] {
  const palette = [...buildGlimpseGreyPalette()];
  for (let i = palette.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = palette[i];
    palette[i] = palette[j]!;
    palette[j] = tmp!;
  }
  return palette;
}

/**
 * Stare excavation covers: teal-tinted ramp (not neutral grey) so the play surface matches
 * The Stare / diamond chrome; still 50 distinguishable shades after shuffle.
 */
export function buildStareGreyPalette(): string[] {
  const light = { r: 175, g: 245, b: 245 };
  const dark = { r: 18, g: 58, b: 62 };
  return Array.from({ length: 50 }, (_, i) => {
    const t = i / 49;
    const r = Math.round(light.r + (dark.r - light.r) * t);
    const g = Math.round(light.g + (dark.g - light.g) * t);
    const b = Math.round(light.b + (dark.b - light.b) * t);
    return `rgb(${r},${g},${b})`;
  });
}

/** Same 50 greys as {@link buildStareGreyPalette}, shuffled per mission. */
export function shuffledStareGreyPalette(): string[] {
  const palette = [...buildStareGreyPalette()];
  for (let i = palette.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = palette[i];
    palette[i] = palette[j]!;
    palette[j] = tmp!;
  }
  return palette;
}
