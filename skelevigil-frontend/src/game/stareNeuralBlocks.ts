/**
 * Stare phase: neural strand on a **5×7** cell lattice (35 diamond tiles; 7 rows × 5 columns).
 *
 * Coordinates match Glimpse convention: `(0,0)` = bottom-left, **x** right, **y** up.
 * RN tile order matches `StareRevealBoard` / `StareDiamondPlayBox`: row-major, row 0 = **top**
 * → index `(Y_MAX - y) * 5 + x`.
 */

export type StareNeuralBlock = { x: number; y: number };

export const STARE_NEURAL_PATH_LENGTH_MIN = 2;
/** 35 cells on the grid; keep strand strictly shorter than full board. */
export const STARE_NEURAL_PATH_LENGTH_MAX = 30;

const X_MAX = 4;
const Y_MAX = 6;

/** 5 columns × 7 screen rows of diamond tiles (matches `StareRevealBoard`). */
export const STARE_GRID_TILE_COUNT = (X_MAX + 1) * (Y_MAX + 1);

export type StareNeuralPatternKind =
  | 'L'
  | 'V'
  | 'U'
  | 'Y'
  | 'Z'
  | 'line_ortho'
  | 'line_diag'
  | 'zigzag_ortho'
  | 'zigzag_diag';

const ALL_PATTERN_KINDS: StareNeuralPatternKind[] = [
  'L',
  'V',
  'U',
  'Y',
  'Z',
  'line_ortho',
  'line_diag',
  'zigzag_ortho',
  'zigzag_diag',
];

const RECENT_STARE_PATTERN_MAX = 10;
const recentStarePatternKinds: StareNeuralPatternKind[] = [];

function rememberStarePattern(kind: StareNeuralPatternKind): void {
  recentStarePatternKinds.push(kind);
  while (recentStarePatternKinds.length > RECENT_STARE_PATTERN_MAX) {
    recentStarePatternKinds.shift();
  }
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function blockKey(b: StareNeuralBlock): string {
  return `${b.x},${b.y}`;
}

function inBounds(b: StareNeuralBlock): boolean {
  return b.x >= 0 && b.x <= X_MAX && b.y >= 0 && b.y <= Y_MAX;
}

function add(a: StareNeuralBlock, d: StareNeuralBlock): StareNeuralBlock {
  return { x: a.x + d.x, y: a.y + d.y };
}

function isAdjacent8(a: StareNeuralBlock, b: StareNeuralBlock): boolean {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return dx <= 1 && dy <= 1 && (dx + dy > 0);
}

/** Walk `moves` offsets from `start`; self-avoiding; returns null if any step leaves bounds or revisits. */
function walkFrom(start: StareNeuralBlock, moves: StareNeuralBlock[]): StareNeuralBlock[] | null {
  const path: StareNeuralBlock[] = [start];
  const visited = new Set<string>([blockKey(start)]);
  for (const step of moves) {
    const next = add(path[path.length - 1]!, step);
    if (!inBounds(next)) return null;
    const k = blockKey(next);
    if (visited.has(k)) return null;
    if (!isAdjacent8(path[path.length - 1]!, next)) return null;
    visited.add(k);
    path.push(next);
  }
  return path;
}

/** RN tile index: row 0 = top (matches `StareDiamondPlayBox` key = row * 5 + col). */
export function stareNeuralBlockToTileIndex(b: StareNeuralBlock): number {
  const screenRow = Y_MAX - b.y;
  return screenRow * 5 + b.x;
}

function randomStart(): StareNeuralBlock {
  return { x: randInt(0, X_MAX), y: randInt(0, Y_MAX) };
}

/** Straight orthogonal ray: exactly `len` cells. */
function tryLineOrtho(len: number): StareNeuralBlock[] | null {
  const dirs = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  for (let t = 0; t < 120; t++) {
    const d = dirs[randInt(0, 3)]!;
    const start = randomStart();
    const end = add(start, { x: d.x * (len - 1), y: d.y * (len - 1) });
    if (!inBounds(end)) continue;
    const moves: StareNeuralBlock[] = Array.from({ length: len - 1 }, () => ({ ...d }));
    const path = walkFrom(start, moves);
    if (path && path.length === len) return path;
  }
  return null;
}

/** Straight diagonal (45° on the square lattice): exactly `len` cells. */
function tryLineDiag(len: number): StareNeuralBlock[] | null {
  const dirs = [
    { x: 1, y: 1 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
    { x: -1, y: -1 },
  ];
  for (let t = 0; t < 120; t++) {
    const d = dirs[randInt(0, 3)]!;
    const start = randomStart();
    const end = add(start, { x: d.x * (len - 1), y: d.y * (len - 1) });
    if (!inBounds(end)) continue;
    const moves: StareNeuralBlock[] = Array.from({ length: len - 1 }, () => ({ ...d }));
    const path = walkFrom(start, moves);
    if (path && path.length === len) return path;
  }
  return null;
}

/** Zig-zag: alternate two orthogonal directions (e.g. E,N,E,N,…). */
function tryZigZagOrtho(len: number): StareNeuralBlock[] | null {
  const orth = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  for (let t = 0; t < 160; t++) {
    const a = orth[randInt(0, 3)]!;
    let b = orth[randInt(0, 3)]!;
    let guard = 0;
    while ((a.x === b.x && a.y === b.y) || a.x === -b.x || a.y === -b.y) {
      b = orth[randInt(0, 3)]!;
      guard++;
      if (guard > 20) break;
    }
    const moves: StareNeuralBlock[] = [];
    for (let i = 0; i < len - 1; i++) {
      moves.push(i % 2 === 0 ? { ...a } : { ...b });
    }
    const path = walkFrom(randomStart(), moves);
    if (path && path.length === len) return path;
  }
  return null;
}

/** Zig-zag: alternate two diagonal directions (e.g. NE, SE, NE, SE,…). */
function tryZigZagDiag(len: number): StareNeuralBlock[] | null {
  const diags = [
    { x: 1, y: 1 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
    { x: -1, y: -1 },
  ];
  for (let t = 0; t < 160; t++) {
    const a = diags[randInt(0, 3)]!;
    let b = diags[randInt(0, 3)]!;
    let guard = 0;
    while (a.x === b.x && a.y === b.y) {
      b = diags[randInt(0, 3)]!;
      guard++;
      if (guard > 20) break;
    }
    const moves: StareNeuralBlock[] = [];
    for (let i = 0; i < len - 1; i++) {
      moves.push(i % 2 === 0 ? { ...a } : { ...b });
    }
    const path = walkFrom(randomStart(), moves);
    if (path && path.length === len) return path;
  }
  return null;
}

/** Orthogonal L: `a` steps in dir1, then `b` steps in perpendicular dir2 (shared corner). */
function tryShapeL(len: number): StareNeuralBlock[] | null {
  if (len < 3) return tryLineOrtho(len);
  for (let t = 0; t < 200; t++) {
    const a = randInt(2, len - 1);
    const b = len - a + 1;
    if (b < 1) continue;
    const horiz = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
    ];
    const vert = [
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    const d1 = randInt(0, 1) === 0 ? horiz[randInt(0, 1)]! : vert[randInt(0, 1)]!;
    const d2 =
      d1.x === 0
        ? horiz[randInt(0, 1)]!
        : vert[randInt(0, 1)]!;
    const moves: StareNeuralBlock[] = [
      ...Array.from({ length: a - 1 }, () => ({ ...d1 })),
      ...Array.from({ length: b - 1 }, () => ({ ...d2 })),
    ];
    const path = walkFrom(randomStart(), moves);
    if (path && path.length === len) return path;
  }
  return null;
}

/** V: first leg along NE, second along NW from apex (45° legs). */
function tryShapeV(len: number): StareNeuralBlock[] | null {
  if (len < 3) return tryLineDiag(len);
  const NE = { x: 1, y: 1 };
  const NW = { x: -1, y: 1 };
  for (let t = 0; t < 200; t++) {
    const k = randInt(1, len - 2);
    const m = len - k;
    const moves: StareNeuralBlock[] = [
      ...Array.from({ length: k - 1 }, () => ({ ...NE })),
      ...Array.from({ length: m - 1 }, () => ({ ...NW })),
    ];
    const path = walkFrom(randomStart(), moves);
    if (path && path.length === len) return path;
  }
  return null;
}

/** U: up left leg, across top, down right leg (orthogonal). */
function tryShapeU(len: number): StareNeuralBlock[] | null {
  if (len < 4) return tryShapeL(len);
  for (let t = 0; t < 240; t++) {
    for (let a = 2; a <= len - 2; a++) {
      for (let b = 2; b <= len - 2; b++) {
        if (2 * a + b - 2 !== len) continue;
        const dirs = [
          { leg: { x: 0, y: 1 }, across: { x: 1, y: 0 }, down: { x: 0, y: -1 } },
          { leg: { x: 0, y: 1 }, across: { x: -1, y: 0 }, down: { x: 0, y: -1 } },
          { leg: { x: 1, y: 0 }, across: { x: 0, y: 1 }, down: { x: -1, y: 0 } },
        ];
        const pack = dirs[randInt(0, dirs.length - 1)]!;
        const moves: StareNeuralBlock[] = [
          ...Array.from({ length: a - 1 }, () => ({ ...pack.leg })),
          ...Array.from({ length: b - 1 }, () => ({ ...pack.across })),
          ...Array.from({ length: a - 1 }, () => ({ ...pack.down })),
        ];
        const path = walkFrom(randomStart(), moves);
        if (path && path.length === len) return path;
      }
    }
  }
  return null;
}

/** Y (λ): north stem then NE branch. */
function tryShapeY(len: number): StareNeuralBlock[] | null {
  if (len < 3) return tryShapeL(len);
  const N = { x: 0, y: 1 };
  const NE = { x: 1, y: 1 };
  for (let t = 0; t < 200; t++) {
    const stem = randInt(1, len - 2);
    const branch = len - stem;
    const moves: StareNeuralBlock[] = [
      ...Array.from({ length: stem - 1 }, () => ({ ...N })),
      ...Array.from({ length: branch - 1 }, () => ({ ...NE })),
    ];
    const path = walkFrom(randomStart(), moves);
    if (path && path.length === len) return path;
  }
  return null;
}

/** Z: top edge, SW stairstep, bottom edge (8-connected). */
function tryShapeZ(len: number): StareNeuralBlock[] | null {
  if (len < 4) return tryLineOrtho(len);
  const E = { x: 1, y: 0 };
  const W = { x: -1, y: 0 };
  const SW = { x: -1, y: -1 };
  for (let t = 0; t < 260; t++) {
    const topW = randInt(2, Math.min(12, len - 2));
    const botW = randInt(2, Math.min(12, len - 2));
    const mid = len - topW - botW + 2;
    if (mid < 1) continue;
    const start = randomStart();
    const moves: StareNeuralBlock[] = [];
    const topDir = randInt(0, 1) === 0 ? E : W;
    for (let i = 0; i < topW - 1; i++) moves.push({ ...topDir });
    for (let i = 0; i < mid - 1; i++) moves.push({ ...SW });
    const botDir = randInt(0, 1) === 0 ? E : W;
    for (let i = 0; i < botW - 1; i++) moves.push({ ...botDir });
    if (moves.length !== len - 1) continue;
    const path = walkFrom(start, moves);
    if (path && path.length === len) return path;
  }
  return null;
}

function generatePathForKind(kind: StareNeuralPatternKind, len: number): StareNeuralBlock[] | null {
  switch (kind) {
    case 'line_ortho':
      return tryLineOrtho(len);
    case 'line_diag':
      return tryLineDiag(len);
    case 'zigzag_ortho':
      return tryZigZagOrtho(len);
    case 'zigzag_diag':
      return tryZigZagDiag(len);
    case 'L':
      return tryShapeL(len);
    case 'V':
      return tryShapeV(len);
    case 'U':
      return tryShapeU(len);
    case 'Y':
      return tryShapeY(len);
    case 'Z':
      return tryShapeZ(len);
    default:
      return null;
  }
}

function fallbackShortPath(): StareNeuralBlock[] {
  return [
    { x: 2, y: 0 },
    { x: 2, y: 1 },
  ];
}

const NEIGHBORS8: StareNeuralBlock[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: 1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
];

/**
 * Random self-avoiding 8-neighbor walk (last resort when letter templates fail).
 */
function tryRandomSelfAvoidingWalk8(targetLen: number, maxStarts: number): StareNeuralBlock[] | null {
  for (let s = 0; s < maxStarts; s++) {
    const start: StareNeuralBlock = { x: randInt(0, X_MAX), y: randInt(0, Y_MAX) };
    const path: StareNeuralBlock[] = [start];
    const visited = new Set<string>([blockKey(start)]);
    while (path.length < targetLen) {
      const cur = path[path.length - 1]!;
      const opts = NEIGHBORS8.map((d) => add(cur, d)).filter(
        (n) => inBounds(n) && !visited.has(blockKey(n)),
      );
      if (opts.length === 0) break;
      const next = opts[randInt(0, opts.length - 1)]!;
      visited.add(blockKey(next));
      path.push(next);
    }
    if (path.length === targetLen) return path;
  }
  return null;
}

/**
 * Self-avoiding 8-neighbor path, length in [STARE_NEURAL_PATH_LENGTH_MIN, STARE_NEURAL_PATH_LENGTH_MAX],
 * chosen pattern not repeated in the last 10 Stare missions.
 */
export function generateRandomStareNeuralBlocks(): StareNeuralBlock[] {
  const len = randInt(STARE_NEURAL_PATH_LENGTH_MIN, STARE_NEURAL_PATH_LENGTH_MAX);

  const shuffledKinds = [...ALL_PATTERN_KINDS].sort(() => Math.random() - 0.5);
  const eligible = shuffledKinds.filter((k) => !recentStarePatternKinds.includes(k));
  const order = eligible.length > 0 ? eligible : shuffledKinds;

  for (const kind of order) {
    for (let attempt = 0; attempt < 48; attempt++) {
      const path = generatePathForKind(kind, len);
      if (path) {
        rememberStarePattern(kind);
        return path;
      }
    }
  }

  for (let r = 0; r < 80; r++) {
    const k = ALL_PATTERN_KINDS[randInt(0, ALL_PATTERN_KINDS.length - 1)]!;
    const path = generatePathForKind(k, len);
    if (path) {
      rememberStarePattern(k);
      return path;
    }
  }

  const walk = tryRandomSelfAvoidingWalk8(len, 900);
  if (walk) {
    // Rare escape hatch: no letter template fit; do not log a named pattern.
    return walk;
  }

  const fb = fallbackShortPath();
  rememberStarePattern('line_ortho');
  return fb;
}

/** Ordered tile-index signature (for tests / future dedupe by geometry). */
export function stareNeuralPathFingerprint(blocks: StareNeuralBlock[]): string {
  return blocks.map(stareNeuralBlockToTileIndex).join(',');
}
