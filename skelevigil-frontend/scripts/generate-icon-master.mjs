#!/usr/bin/env node
/**
 * Builds assets/icon_master.png from assets/icon-reference-source.png
 *
 * - 1024×1024, opaque: flattens any alpha onto charcoal (#141416).
 * - Removes an outer “white mat” when the artwork is a rounded block on ~#FEFEFE:
 *   edge-connected near-white, low-chroma pixels become charcoal so iOS masks edge-to-edge.
 * - Source should match final art (isometric scene, tweezers, filament thickness,
 *   luminance gradient). Adjust filament to ~10px and node colors in the design file,
 *   export to icon-reference-source.png, then run this script.
 *
 *   npm run generate:icon-master
 *
 * Legacy vector-only flow: node scripts/generate-icon-master-vector.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcPath = path.join(root, 'assets', 'icon-reference-source.png');
const outPath = path.join(root, 'assets', 'icon_master.png');

const CHARCOAL = { r: 20, g: 20, b: 22 };

/**
 * Pixels reachable from the border that look like flat white/gray padding (high luminance,
 * low chroma). Skips cyan/highlights because they fail the chroma cap.
 */
function replaceBorderConnectedNearWhite(data, w, h, outRgb) {
  const R = outRgb.r;
  const G = outRgb.g;
  const B = outRgb.b;
  const n = w * h;
  const visited = new Uint8Array(n);
  const qx = new Int32Array(n);
  const qy = new Int32Array(n);
  let qh = 0;

  function isMat(i) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const avg = (r + g + b) / 3;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    return avg >= 248 && chroma <= 10;
  }

  function enqueue(x, y) {
    const idx = y * w + x;
    if (visited[idx]) return;
    const p = idx * 3;
    if (!isMat(p)) return;
    visited[idx] = 1;
    qx[qh] = x;
    qy[qh] = y;
    qh++;
  }

  for (let x = 0; x < w; x++) {
    enqueue(x, 0);
    enqueue(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    enqueue(0, y);
    enqueue(w - 1, y);
  }

  for (let qt = 0; qt < qh; qt++) {
    const x = qx[qt];
    const y = qy[qt];
    if (x > 0) enqueue(x - 1, y);
    if (x + 1 < w) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y + 1 < h) enqueue(x, y + 1);
  }

  let replaced = 0;
  for (let idx = 0; idx < n; idx++) {
    if (!visited[idx]) continue;
    const p = idx * 3;
    data[p] = R;
    data[p + 1] = G;
    data[p + 2] = B;
    replaced++;
  }
  return replaced;
}

async function main() {
  if (!fs.existsSync(srcPath)) {
    console.error(`Missing source: ${path.relative(root, srcPath)}`);
    process.exit(1);
  }

  const { data, info } = await sharp(srcPath)
    .resize(1024, 1024, { fit: 'cover', position: 'centre' })
    .flatten({ background: CHARCOAL })
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 3) {
    console.error(`Expected 3 channels after flatten, got ${info.channels}`);
    process.exit(1);
  }

  const rgb = data;
  const replaced = replaceBorderConnectedNearWhite(rgb, info.width, info.height, CHARCOAL);
  console.log(`Outer white mat removed: ${replaced} pixels`);

  await sharp(rgb, {
    raw: { width: info.width, height: info.height, channels: 3 },
  })
    .png({ compressionLevel: 9, effort: 10, palette: false })
    .toFile(outPath);

  const meta = await sharp(outPath).metadata();
  console.log(
    `Wrote ${path.relative(root, outPath)} (${meta.width}x${meta.height}, channels=${meta.channels})`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
