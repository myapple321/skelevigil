/**
 * **Neural blocks**: discrete path through 5×5 cells (no continuous “string” in pixel space).
 *
 * Coordinates (game spec):
 * - `(0,0)` = bottom-left; **X** increases right; **Y** increases **up**.
 * - “Linear Y” = a vertical run of adjacent blocks, e.g. (3,0)–(3,1)–(3,2)–(3,3).
 *
 * SVG uses viewBox 0–100 with RN row 0 at the top: `screenRow = 4 - y`.
 */

export type BlockCoord = { x: number; y: number };

const MAX = 4;

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function clampBlock(b: BlockCoord): BlockCoord {
  return {
    x: Math.min(MAX, Math.max(0, Math.round(b.x))),
    y: Math.min(MAX, Math.max(0, Math.round(b.y))),
  };
}

function dedupeConsecutive(blocks: BlockCoord[]): BlockCoord[] {
  const out: BlockCoord[] = [];
  for (const b of blocks) {
    const c = clampBlock(b);
    const prev = out[out.length - 1];
    if (!prev || prev.x !== c.x || prev.y !== c.y) out.push(c);
  }
  return out;
}

/** RN tile index: row-major, row 0 = top; matches `GlimpseRevealBoard` cell order. */
export function blockToTileIndex(b: BlockCoord): number {
  const screenRow = MAX - b.y;
  return screenRow * 5 + b.x;
}
// Rendering happens in `GlimpseRevealBoard` using the same 5×5 flex layout + gap as tiles,
// so neural blocks align perfectly and can be fully hidden by opaque tiles.

/** Bottom row, left column, or interior — user space. */
function pickStartBlock(): BlockCoord {
  const r = Math.random();
  if (r < 0.34) return { x: randInt(0, MAX), y: 0 };
  if (r < 0.67) return { x: 0, y: randInt(0, MAX) };
  return { x: randInt(1, MAX - 1), y: randInt(1, MAX - 1) };
}

/** Linear X: fixed y, steps along x (3–5 blocks). */
function walkLineX(): BlockCoord[] {
  for (let t = 0; t < 24; t++) {
    const y = randInt(0, MAX);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const len = randInt(3, 5);
    let x = randInt(0, MAX);
    const out: BlockCoord[] = [{ x, y }];
    let ok = true;
    for (let i = 1; i < len; i++) {
      x += dir;
      if (x < 0 || x > MAX) {
        ok = false;
        break;
      }
      out.push({ x, y });
    }
    if (ok) return out;
  }
  return [
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
  ];
}

/** Linear Y: fixed x, steps along y (3–5 blocks) — e.g. column 3, y=0..3. */
function walkLineY(): BlockCoord[] {
  for (let t = 0; t < 24; t++) {
    const x = randInt(0, MAX);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const len = randInt(3, 5);
    let y = randInt(0, MAX);
    const out: BlockCoord[] = [{ x, y }];
    let ok = true;
    for (let i = 1; i < len; i++) {
      y += dir;
      if (y < 0 || y > MAX) {
        ok = false;
        break;
      }
      out.push({ x, y });
    }
    if (ok) return out;
  }
  return [
    { x: 3, y: 0 },
    { x: 3, y: 1 },
    { x: 3, y: 2 },
    { x: 3, y: 3 },
  ];
}

function walkDiagonal(): BlockCoord[] {
  for (let t = 0; t < 24; t++) {
    const dx = Math.random() < 0.5 ? 1 : -1;
    const dy = Math.random() < 0.5 ? 1 : -1;
    const len = randInt(3, 5);
    let x = randInt(0, MAX);
    let y = randInt(0, MAX);
    const out: BlockCoord[] = [{ x, y }];
    let ok = true;
    for (let i = 1; i < len; i++) {
      x += dx;
      y += dy;
      if (x < 0 || x > MAX || y < 0 || y > MAX) {
        ok = false;
        break;
      }
      out.push({ x, y });
    }
    if (ok) return out;
  }
  return [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    { x: 2, y: 2 },
    { x: 3, y: 3 },
  ];
}

/** Orthogonal L: horizontal leg then vertical or the reverse. */
function walkL(): BlockCoord[] {
  for (let t = 0; t < 24; t++) {
    const horizontalFirst = Math.random() < 0.5;
    const dir1 = Math.random() < 0.5 ? 1 : -1;
    const dir2 = Math.random() < 0.5 ? 1 : -1;
    const leg1 = randInt(2, 3);
    const leg2 = randInt(2, 3);
    const start = pickStartBlock();
    const out: BlockCoord[] = [start];
    let ok = true;

    if (horizontalFirst) {
      let { x, y } = start;
      for (let i = 0; i < leg1; i++) {
        x += dir1;
        if (x < 0 || x > MAX) {
          ok = false;
          break;
        }
        out.push({ x, y });
      }
      if (!ok) continue;
      ({ x, y } = out[out.length - 1]!);
      for (let i = 0; i < leg2; i++) {
        y += dir2;
        if (y < 0 || y > MAX) {
          ok = false;
          break;
        }
        out.push({ x, y });
      }
    } else {
      let { x, y } = start;
      for (let i = 0; i < leg1; i++) {
        y += dir1;
        if (y < 0 || y > MAX) {
          ok = false;
          break;
        }
        out.push({ x, y });
      }
      if (!ok) continue;
      ({ x, y } = out[out.length - 1]!);
      for (let i = 0; i < leg2; i++) {
        x += dir2;
        if (x < 0 || x > MAX) {
          ok = false;
          break;
        }
        out.push({ x, y });
      }
    }
    if (ok && out.length >= 3) return dedupeConsecutive(out);
  }
  return walkLineY();
}

/** V: left foot → apex → right foot (block centers). */
function walkVShape(): BlockCoord[] {
  for (let t = 0; t < 20; t++) {
    const ax = randInt(1, MAX - 1);
    const ay = randInt(1, MAX - 1);
    const d = randInt(1, 2);
    const openDown = Math.random() < 0.5;
    if (openDown) {
      const left = { x: ax - d, y: ay - d };
      const right = { x: ax + d, y: ay - d };
      if (left.x < 0 || right.x > MAX || left.y < 0 || right.y < 0) continue;
      return [left, { x: ax, y: ay }, right];
    }
    const left = { x: ax - d, y: ay + d };
    const right = { x: ax + d, y: ay + d };
    if (left.x < 0 || right.x > MAX || left.y > MAX || right.y > MAX) continue;
    return [left, { x: ax, y: ay }, right];
  }
  return [
    { x: 1, y: 3 },
    { x: 2, y: 2 },
    { x: 3, y: 3 },
  ];
}

type Pattern = 'X' | 'Y' | 'D' | 'L' | 'V_SHAPE';

/**
 * Random path through adjacent blocks (≥3 cells). New path each New Game.
 */
export function generateRandomNeuralBlocks(): BlockCoord[] {
  const patterns: Pattern[] = ['X', 'Y', 'D', 'L', 'V_SHAPE'];

  for (let attempt = 0; attempt < 16; attempt++) {
    const p = patterns[randInt(0, patterns.length - 1)]!;
    let pts: BlockCoord[] = [];
    switch (p) {
      case 'X':
        pts = walkLineX();
        break;
      case 'Y':
        pts = walkLineY();
        break;
      case 'D':
        pts = walkDiagonal();
        break;
      case 'L':
        pts = walkL();
        break;
      case 'V_SHAPE':
        pts = walkVShape();
        break;
    }
    pts = dedupeConsecutive(pts);
    if (pts.length >= 2) return pts;
  }

  return walkLineY();
}
