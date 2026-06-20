/**
 * Centralized combat simulation — tower targeting, firing, and projectile movement.
 * Runs in a single useFrame hook instead of per-tower / per-projectile React loops.
 */

import { statsForPlaced } from '../data/towerStats';
import type { PlacedTower } from './store';
import { isSimRunning, simDelta, type GameState } from './store';
import {
  enemyRegistry,
  applyHit,
  simClock,
  type EnemyRuntime,
} from './registry';
import { rebuildSpatialGrid, findTargetInGrid } from './spatialGrid';
import { getQualityBudgets, perfStats, shouldUseProjectileTrails } from './performance';
import { spawnBurst } from './effects';

const RETARGET_INTERVAL = 0.22;
const POOL_CAPACITY = 120;

export interface ProjectileRuntime {
  id: number;
  active: boolean;
  towerType: string;
  x: number;
  y: number;
  z: number;
  targetId: number;
  damage: number;
  speed: number;
  color: string;
  splashRadius?: number;
  slow?: { factor: number; duration: number };
  dot?: { dps: number; duration: number };
  life: number;
  lastSeenX: number;
  lastSeenZ: number;
}

interface TowerSimState {
  cooldown: number;
  retargetTimer: number;
  targetId: number | null;
  rangeSq: number;
  x: number;
  z: number;
  towerType: string;
  fromY: number;
  damage: number;
  speed: number;
  color: string;
  splashRadius?: number;
  slow?: { factor: number; duration: number };
  dot?: { dps: number; duration: number };
  cooldownBase: number;
}

const towerSim = new Map<number, TowerSimState>();
const projectilePool: ProjectileRuntime[] = [];
let nextProjectileId = 1;
let activeProjectileCount = 0;

function createProjectileSlot(id: number): ProjectileRuntime {
  return {
    id,
    active: false,
    towerType: '',
    x: 0,
    y: 0,
    z: 0,
    targetId: 0,
    damage: 0,
    speed: 0,
    color: '#fff',
    life: 0,
    lastSeenX: 0,
    lastSeenZ: 0,
  };
}

function ensureProjectilePool(): void {
  while (projectilePool.length < POOL_CAPACITY) {
    projectilePool.push(createProjectileSlot(nextProjectileId++));
  }
}

ensureProjectilePool();

export function getActiveProjectileCount(): number {
  return activeProjectileCount;
}

export function getProjectilePool(): readonly ProjectileRuntime[] {
  return projectilePool;
}

export function clearCombatSim(): void {
  towerSim.clear();
  lastTowerSyncKey = '';
  for (const p of projectilePool) p.active = false;
  activeProjectileCount = 0;
}

let lastTowerSyncKey = '';

function towerSyncKey(placed: PlacedTower[]): string {
  if (placed.length === 0) return '';
  return placed.map((t) => `${t.id}:${t.towerId}:${t.level}:${t.position.join(',')}`).join('|');
}

/** Keep tower sim in sync when towers are placed or cleared between levels. */
export function syncTowerSim(placed: PlacedTower[]): void {
  const ids = new Set(placed.map((t) => t.id));
  for (const id of towerSim.keys()) {
    if (!ids.has(id)) towerSim.delete(id);
  }
  for (const t of placed) {
    const stats = statsForPlaced(t.towerId, t.level);
    if (!stats) continue;
    const rangeSq = stats.range * stats.range;
    const existing = towerSim.get(t.id);
    if (existing) {
      existing.x = t.position[0];
      existing.z = t.position[2];
      existing.rangeSq = rangeSq;
      existing.damage = stats.damage;
      existing.speed = stats.projectileSpeed;
      existing.fromY = stats.fromY;
      existing.color = stats.projectileColor;
      existing.splashRadius = stats.splashRadius;
      existing.slow = stats.slow;
      existing.dot = stats.dot;
      existing.cooldownBase = stats.cooldown;
      continue;
    }
    towerSim.set(t.id, {
      cooldown: Math.random() * stats.cooldown,
      retargetTimer: Math.random() * RETARGET_INTERVAL,
      targetId: null,
      rangeSq,
      x: t.position[0],
      z: t.position[2],
      towerType: t.towerId,
      fromY: stats.fromY,
      damage: stats.damage,
      speed: stats.projectileSpeed,
      color: stats.projectileColor,
      splashRadius: stats.splashRadius,
      slow: stats.slow,
      dot: stats.dot,
      cooldownBase: stats.cooldown,
    });
  }
}

function acquireProjectile(): ProjectileRuntime | null {
  const max = getQualityBudgets().maxProjectiles;
  if (activeProjectileCount >= max) return null;

  ensureProjectilePool();
  for (const p of projectilePool) {
    if (!p.active) return p;
  }
  return null;
}

function spawnProjectile(from: TowerSimState, targetId: number): void {
  const p = acquireProjectile();
  if (!p) return;
  p.active = true;
  p.towerType = from.towerType;
  p.x = from.x;
  p.y = from.fromY;
  p.z = from.z;
  p.targetId = targetId;
  p.damage = from.damage;
  p.speed = from.speed;
  p.color = from.color;
  p.splashRadius = from.splashRadius;
  p.slow = from.slow;
  p.dot = from.dot;
  p.life = 0;
  p.lastSeenX = from.x;
  p.lastSeenZ = from.z;
  activeProjectileCount++;
}

function resolveTarget(id: number | null): EnemyRuntime | null {
  if (id == null) return null;
  const e = enemyRegistry.get(id);
  return e && e.alive ? e : null;
}

function detonateProjectile(p: ProjectileRuntime, impactX: number, impactZ: number): void {
  applyHit({
    targetId: p.targetId,
    impactX,
    impactZ,
    damage: p.damage,
    elapsed: simClock.now,
    splashRadius: p.splashRadius,
    slow: p.slow,
    dot: p.dot,
  });
  if (p.splashRadius) spawnBurst([impactX, 0.8, impactZ], p.color);
  p.active = false;
  activeProjectileCount = Math.max(0, activeProjectileCount - 1);
}

function updateTowers(dt: number): void {
  if (enemyRegistry.size === 0) return;

  rebuildSpatialGrid(enemyRegistry.values());

  for (const ts of towerSim.values()) {
    ts.cooldown -= dt;
    ts.retargetTimer -= dt;

    if (ts.retargetTimer <= 0 || !resolveTarget(ts.targetId)) {
      ts.retargetTimer = RETARGET_INTERVAL;
      const target = findTargetInGrid(enemyRegistry, ts.x, ts.z, ts.rangeSq);
      ts.targetId = target?.id ?? null;
    }

    if (ts.cooldown > 0) continue;

    const target = resolveTarget(ts.targetId);
    if (!target) continue;

    ts.cooldown = ts.cooldownBase;
    spawnProjectile(ts, target.id);
  }
}

function updateProjectiles(dt: number): void {
  for (const p of projectilePool) {
    if (!p.active) continue;

    p.life += dt;
    if (p.life > 4) {
      p.active = false;
      activeProjectileCount = Math.max(0, activeProjectileCount - 1);
      continue;
    }

    const target = enemyRegistry.get(p.targetId);
    if (!target || !target.alive) {
      if (p.splashRadius) {
        detonateProjectile(p, p.lastSeenX, p.lastSeenZ);
      } else {
        p.active = false;
        activeProjectileCount = Math.max(0, activeProjectileCount - 1);
      }
      continue;
    }

    p.lastSeenX = target.x;
    p.lastSeenZ = target.z;

    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const dz = target.z - p.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const step = p.speed * dt;
    const hitDist = step + 0.3;

    if (distSq <= hitDist * hitDist) {
      detonateProjectile(p, target.x, target.z);
      continue;
    }

    const dist = Math.sqrt(distSq);
    const inv = step / dist;
    p.x += dx * inv;
    p.y += dy * inv;
    p.z += dz * inv;
  }
}

/** Single entry point called from the game loop each frame. */
export function updateCombat(realDelta: number, gs: GameState): void {
  if (!isSimRunning(gs)) return;
  const dt = simDelta(realDelta, gs);

  const key = towerSyncKey(gs.placedTowers);
  if (key !== lastTowerSyncKey) {
    lastTowerSyncKey = key;
    syncTowerSim(gs.placedTowers);
  }
  updateTowers(dt);
  updateProjectiles(dt);

  perfStats.projectiles = activeProjectileCount;
  perfStats.towers = towerSim.size;
  // trails flag for renderer
  void shouldUseProjectileTrails(activeProjectileCount, gs.gameSpeed);
}

export { shouldUseProjectileTrails };
