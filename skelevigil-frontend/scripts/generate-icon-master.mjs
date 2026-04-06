#!/usr/bin/env node
/**
 * Rasterizes scripts/skelevigil-icon-master.svg → assets/icon_master.png (1024×1024).
 *
 * Run from skelevigil-frontend:
 *   npm install
 *   npm run generate:icon-master
 *
 * Pixel size 1024×1024 is what iOS/Android need. “72 DPI” is print metadata; this PNG
 * is screen-ready. To tag 72 DPI in metadata: exiftool -XResolution=72 -YResolution=72 assets/icon_master.png
 */

import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const svgPath = path.join(__dirname, 'skelevigil-icon-master.svg');
const outDir = path.join(root, 'assets');
const outPath = path.join(outDir, 'icon_master.png');

function main() {
  const svg = fs.readFileSync(svgPath, 'utf8');
  fs.mkdirSync(outDir, { recursive: true });

  const resvg = new Resvg(svg, {
    background: '#0D0D0D',
    fitTo: {
      mode: 'width',
      width: 1024,
      height: 1024,
    },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  fs.writeFileSync(outPath, pngBuffer);
  console.log(`Wrote ${path.relative(root, outPath)} (1024×1024, flattened)`);
}

main();
