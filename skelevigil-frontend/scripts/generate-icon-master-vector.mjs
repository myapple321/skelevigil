#!/usr/bin/env node
/** Rasterize scripts/skelevigil-icon-master.svg → assets/icon_master.png (flat vector mark). */

import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const svgPath = path.join(__dirname, 'skelevigil-icon-master.svg');
const outPath = path.join(root, 'assets', 'icon_master.png');

const svg = fs.readFileSync(svgPath, 'utf8');
const resvg = new Resvg(svg, {
  background: '#000000',
  fitTo: { mode: 'width', width: 1024, height: 1024 },
});
const pngData = resvg.render();
fs.writeFileSync(outPath, pngData.asPng());
console.log(`Wrote ${path.relative(root, outPath)} (from vector)`);
