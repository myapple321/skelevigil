#!/usr/bin/env node
/**
 * Writes assets/sounds/mission-success.wav — short celebratory two-tone cue.
 *   node scripts/generate-mission-success-sfx.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '..', 'assets', 'sounds', 'mission-success.wav');

const sampleRate = 22050;
const durationSec = 0.26;
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

// Upward two-tone "victory ping" with soft shimmer.
for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  const firstTone = t < 0.12 ? Math.sin(2 * Math.PI * 740 * t) * Math.exp(-t * 20) : 0;
  const secondT = Math.max(0, t - 0.11);
  const secondTone =
    t >= 0.1 ? Math.sin(2 * Math.PI * 1080 * secondT) * Math.exp(-secondT * 16) : 0;
  const shimmer = Math.sin(2 * Math.PI * 1440 * t) * Math.exp(-t * 34) * 0.18;
  const sample = (firstTone * 0.55 + secondTone * 0.65 + shimmer) * 0.42;
  const clamped = Math.max(-1, Math.min(1, sample));
  buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, buffer);
console.log(`Wrote ${path.relative(path.join(__dirname, '..'), outPath)}`);
