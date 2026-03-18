/**
 * Seeded random number generator using the mulberry32 algorithm.
 * When no seed is set, falls back to Math.random().
 *
 * Each cube gets its own RNG instance via makeRng(index) so that
 * per-cube behaviour is deterministic regardless of frame timing.
 */

let currentSeed: string | null = null;

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}

export function setSeed(seed: string) {
  currentSeed = seed.trim() === '' ? null : seed;
}

/** Returns an independent RNG for the given cube index. */
export function makeRng(index: number): () => number {
  if (currentSeed === null) return Math.random;
  return mulberry32(hashString(`${currentSeed}:${index}`));
}
