/**
 * Simple grid-based spatial hash for enemy lookups.
 * Rebuilt once per combat frame before tower targeting runs.
 */

import type { EnemyRuntime } from './registry';

const CELL = 3;
const MIN_X = -16;
const MIN_Z = -10;

const grid = new Map<number, number[]>();

function cellKey(cx: number, cz: number): number {
  return cx * 1000 + cz;
}

function toCell(v: number, min: number): number {
  return Math.floor((v - min) / CELL);
}

/** Clear and repopulate the grid from live enemies. */
export function rebuildSpatialGrid(enemies: Iterable<EnemyRuntime>): void {
  grid.clear();
  for (const e of enemies) {
    if (!e.alive) continue;
    const cx = toCell(e.x, MIN_X);
    const cz = toCell(e.z, MIN_Z);
    const key = cellKey(cx, cz);
    let bucket = grid.get(key);
    if (!bucket) {
      bucket = [];
      grid.set(key, bucket);
    }
    bucket.push(e.id);
  }
}

/**
 * Find the enemy furthest along the path within range of (x, z).
 * Only scans grid cells overlapping the tower's range circle.
 */
export function findTargetInGrid(
  enemies: Map<number, EnemyRuntime>,
  x: number,
  z: number,
  rangeSq: number,
): EnemyRuntime | null {
  const range = Math.sqrt(rangeSq);
  const minCx = toCell(x - range, MIN_X);
  const maxCx = toCell(x + range, MIN_X);
  const minCz = toCell(z - range, MIN_Z);
  const maxCz = toCell(z + range, MIN_Z);

  let best: EnemyRuntime | null = null;
  let bestProgress = -1;

  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cz = minCz; cz <= maxCz; cz++) {
      const bucket = grid.get(cellKey(cx, cz));
      if (!bucket) continue;
      for (const id of bucket) {
        const e = enemies.get(id);
        if (!e || !e.alive) continue;
        const dx = e.x - x;
        const dz = e.z - z;
        const d2 = dx * dx + dz * dz;
        if (d2 <= rangeSq && e.progress > bestProgress) {
          best = e;
          bestProgress = e.progress;
        }
      }
    }
  }

  return best;
}
