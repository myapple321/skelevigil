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
