/**
 * Mutable per-frame runtime state for the battle simulation.
 *
 * Enemy positions, hit points and status effects change every frame, which is
 * far too often to live in React/Zustand state. Instead the canonical fast-path
 * data lives here in a plain Map that the game loop mutates directly, while the
 * Zustand store keeps the coarse, render-facing data (which enemies exist, coins,
 * lives, etc.). Components read these values imperatively inside `useFrame`.
 */

import type { MapId } from '../data/maps';
import { spawnFloatingText } from './effects';

export interface EnemyRuntime {
  id: number;
  /** Map this enemy was spawned on — path movement uses this map's pathPoints. */
  mapId: MapId;
  /** 0..1 progress along the path. */
  progress: number;
  x: number;
  y: number;
  z: number;
  hp: number;
  maxHp: number;
  /** Base path-fraction per second before slows are applied. */
  baseSpeed: number;
  /** Time (in clock seconds) until which a slow is active. */
  slowUntil: number;
  /** Speed multiplier while slowed. */
  slowFactor: number;
  /** Active damage-over-time stacks. */
  dots: { dps: number; until: number }[];
  /** Fractional damage resistance, 0..1. */
  armor: number;
  isBoss: boolean;
  radius: number;
  /** False once the enemy has been removed; projectiles stop chasing it. */
  alive: boolean;
}

export const enemyRegistry = new Map<number, EnemyRuntime>();

/**
 * Simulation clock, advanced by the speed-scaled delta in the level loop.
 * Status-effect timers (slows, damage-over-time) are measured against this
 * rather than the wall clock, so their *durations* stay correct at any game
 * speed: at 2x they simply resolve in half the real time.
 */
export const simClock = { now: 0 };

export function clearRuntime() {
  enemyRegistry.clear();
  simClock.now = 0;
}

// Dev-only handle so tooling can inspect live combat state.
if (import.meta.env?.DEV) {
  (window as unknown as { __reg?: unknown }).__reg = enemyRegistry;
}

/**
 * Pick the best enemy in range for a tower at (x, z): the one furthest along
 * the path (closest to the base), which is the standard tower-defense priority.
 */
export function findTarget(x: number, z: number, range: number): EnemyRuntime | null {
  let best: EnemyRuntime | null = null;
  let bestProgress = -1;
  const r2 = range * range;
  for (const e of enemyRegistry.values()) {
    if (!e.alive) continue;
    const dx = e.x - x;
    const dz = e.z - z;
    if (dx * dx + dz * dz <= r2 && e.progress > bestProgress) {
      best = e;
      bestProgress = e.progress;
    }
  }
  return best;
}

export interface HitParams {
  targetId: number;
  impactX: number;
  impactZ: number;
  damage: number;
  elapsed: number;
  splashRadius?: number;
  slow?: { factor: number; duration: number };
  dot?: { dps: number; duration: number };
}

/** Apply a projectile's impact: direct damage, splash, slow and/or DoT. */
export function applyHit(p: HitParams) {
  const target = enemyRegistry.get(p.targetId);
  if (target && target.alive) {
    const dealt = p.damage * (1 - target.armor);
    target.hp -= dealt;
    spawnFloatingText([target.x, target.y + target.radius + 0.2, target.z], `${Math.round(dealt)}`, 'damage');
    if (p.slow) {
      target.slowUntil = p.elapsed + p.slow.duration;
      target.slowFactor = p.slow.factor;
    }
    if (p.dot) {
      target.dots.push({ dps: p.dot.dps, until: p.elapsed + p.dot.duration });
    }
  }

  if (p.splashRadius) {
    const r2 = p.splashRadius * p.splashRadius;
    for (const e of enemyRegistry.values()) {
      if (!e.alive || e.id === p.targetId) continue;
      const dx = e.x - p.impactX;
      const dz = e.z - p.impactZ;
      if (dx * dx + dz * dz <= r2) {
        // splash deals reduced damage to nearby foes, also mitigated by armor
        const dealt = p.damage * 0.6 * (1 - e.armor);
        e.hp -= dealt;
        spawnFloatingText([e.x, e.y + e.radius + 0.2, e.z], `${Math.round(dealt)}`, 'splash');
      }
    }
  }
}
