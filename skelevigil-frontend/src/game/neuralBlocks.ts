/**
 * **Neural blocks**: discrete path through 5×5 cells (no continuous “string” in pixel space).
 *
 * Coordinates (game spec):
 * - `(0,0)` = bottom-left; **X** increases right; **Y** increases **up**.
 * - “Linear Y” = a vertical run of adjacent blocks, e.g. (3,0)–(3,1)–(3,2)–(3,3).
 *
 * SVG uses viewBox 0–100 with RN row 0 at the top: `screenRow = 4 - y`.
 */

export type NeuralBlock = { x: number; y: number };

const MAX = 4;

/** Glimpse Strand length bounds (orthogonal self-avoiding path on 5×5). Max 16 = full perimeter ring. */
export const GLIMPSE_NEURAL_PATH_LENGTH_MIN = 2;
export const GLIMPSE_NEURAL_PATH_LENGTH_MAX = 16;

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function blockKey(b: NeuralBlock): string {
  return `${b.x},${b.y}`;
}

function orthogonalNeighbors(b: NeuralBlock): NeuralBlock[] {
  const n: NeuralBlock[] = [];
  if (b.x > 0) n.push({ x: b.x - 1, y: b.y });
  if (b.x < MAX) n.push({ x: b.x + 1, y: b.y });
  if (b.y > 0) n.push({ x: b.x, y: b.y - 1 });
  if (b.y < MAX) n.push({ x: b.x, y: b.y + 1 });
  return n;
}

/**
 * Random self-avoiding orthogonal walk of exactly `targetLen` cells (if possible).
 * Retries with new starts up to `maxStarts` times.
 */
function tryRandomSelfAvoidingWalk(targetLen: number, maxStarts: number): NeuralBlock[] | null {
  for (let s = 0; s < maxStarts; s++) {
    const start: NeuralBlock = { x: randInt(0, MAX), y: randInt(0, MAX) };
    const path: NeuralBlock[] = [start];
    const visited = new Set<string>([blockKey(start)]);
    while (path.length < targetLen) {
      const cur = path[path.length - 1]!;
      const opts = orthogonalNeighbors(cur).filter((n) => !visited.has(blockKey(n)));
      if (opts.length === 0) break;
      const next = opts[randInt(0, opts.length - 1)]!;
      visited.add(blockKey(next));
      path.push(next);
    }
    if (path.length === targetLen) return path;
  }
  return null;
}

/** RN tile index: row-major, row 0 = top; matches `GlimpseRevealBoard` cell order. */
export function neuralBlockToTileIndex(b: NeuralBlock): number {
  const screenRow = MAX - b.y;
  return screenRow * 5 + b.x;
}

/** Ordered path signature (tile indices along the Strand). Used to avoid repeating recent missions. */
export function neuralPathFingerprint(blocks: NeuralBlock[]): string {
  return blocks.map(neuralBlockToTileIndex).join(',');
}

const RECENT_MISSION_PATHS_MAX = 5;
const recentMissionPathFingerprints: string[] = [];

function rememberMissionPath(blocks: NeuralBlock[]): void {
  const fp = neuralPathFingerprint(blocks);
  recentMissionPathFingerprints.push(fp);
  while (recentMissionPathFingerprints.length > RECENT_MISSION_PATHS_MAX) {
    recentMissionPathFingerprints.shift();
  }
}

/** Minimal 2-cell fallback (center column). */
function fallbackNeuralPathShort(): NeuralBlock[] {
  return [
    { x: 2, y: 2 },
    { x: 2, y: 3 },
  ];
}

/**
 * One random candidate: orthogonal self-avoiding path, length in
 * [GLIMPSE_NEURAL_PATH_LENGTH_MIN, GLIMPSE_NEURAL_PATH_LENGTH_MAX].
 */
function generateRandomNeuralBlocksCandidate(): NeuralBlock[] {
  for (let round = 0; round < 56; round++) {
    const targetLen = randInt(GLIMPSE_NEURAL_PATH_LENGTH_MIN, GLIMPSE_NEURAL_PATH_LENGTH_MAX);
    const path = tryRandomSelfAvoidingWalk(targetLen, 500);
    if (path) return path;
  }
  for (let len = GLIMPSE_NEURAL_PATH_LENGTH_MAX; len >= GLIMPSE_NEURAL_PATH_LENGTH_MIN; len--) {
    const path = tryRandomSelfAvoidingWalk(len, 800);
    if (path) return path;
  }
  return fallbackNeuralPathShort();
}

const AVOID_REPEAT_ATTEMPTS = 96;

/**
 * Random path through adjacent blocks (length 2–16); **avoids repeating the same path** as any of
 * the last {@link RECENT_MISSION_PATHS_MAX} missions when possible. New path each New Mission.
 */
export function generateRandomNeuralBlocks(): NeuralBlock[] {
  for (let attempt = 0; attempt < AVOID_REPEAT_ATTEMPTS; attempt++) {
    const candidate = generateRandomNeuralBlocksCandidate();
    const fp = neuralPathFingerprint(candidate);
    if (!recentMissionPathFingerprints.includes(fp)) {
      rememberMissionPath(candidate);
      return candidate;
    }
  }

  const fallback = generateRandomNeuralBlocksCandidate();
  rememberMissionPath(fallback);
  return fallback;
}
