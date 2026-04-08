#!/usr/bin/env node
/**
 * Writes assets/sounds/tile-fail.wav — short "wrong" UI blip for neural-block fail.
 *   node scripts/generate-tile-fail-sfx.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '..', 'assets', 'sounds', 'tile-fail.wav');

const sampleRate = 22050;
const durationSec = 0.095;
const numSamples = Math.floor(sampleRate * durationSec);
const numChannels = 1;
const bitsPerSample = 16;
const blockAlign = (numChannels * bitsPerSample) / 8;
const byteRate = sampleRate * blockAlign;
const dataSize = numSamples * blockAlign;
const buffer = Buffer.alloc(44 + dataSize);

buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(numChannels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(byteRate, 28);
buffer.writeUInt16LE(blockAlign, 32);
buffer.writeUInt16LE(bitsPerSample, 34);
buffer.write('data', 36);
buffer.writeUInt32LE(dataSize, 40);

// Downward chirp + tiny noise, with fast decay (distinct from the reveal blip).
const f0 = 520;
const f1 = 210;
for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  const k = Math.min(1, t / durationSec);
  const freq = f0 + (f1 - f0) * k;
  const env = Math.exp(-t * 32);
  const tone = Math.sin(2 * Math.PI * freq * t);
  const noise = (Math.random() * 2 - 1) * 0.06;
  const sample = (tone * 0.34 + noise) * env * 0.45;
  const clamped = Math.max(-1, Math.min(1, sample));
  buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, buffer);
console.log(`Wrote ${path.relative(path.join(__dirname, '..'), outPath)}`);

