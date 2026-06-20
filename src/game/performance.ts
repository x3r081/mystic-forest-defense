/**
 * Runtime quality settings and performance diagnostics.
 * Auto-lowers quality when FPS drops; dev overlay reads `perfStats`.
 */

export type QualityLevel = 'high' | 'medium' | 'low';

export interface QualityBudgets {
  maxProjectiles: number;
  maxFloating: number;
  maxBursts: number;
  maxBaseHits: number;
  projectileTrails: boolean;
  trailMinQuality: QualityLevel;
  fireflyMul: number;
  fogMul: number;
  shadowMap: number;
  postFxIntensity: number;
  pathGlow: boolean;
}

const BUDGETS: Record<QualityLevel, QualityBudgets> = {
  high: {
    maxProjectiles: 120,
    maxFloating: 48,
    maxBursts: 16,
    maxBaseHits: 6,
    projectileTrails: true,
    trailMinQuality: 'high',
    fireflyMul: 1,
    fogMul: 1,
    shadowMap: 1024,
    postFxIntensity: 0.8,
    pathGlow: true,
  },
  medium: {
    maxProjectiles: 80,
    maxFloating: 32,
    maxBursts: 10,
    maxBaseHits: 4,
    projectileTrails: true,
    trailMinQuality: 'medium',
    fireflyMul: 0.65,
    fogMul: 0.7,
    shadowMap: 512,
    postFxIntensity: 0.55,
    pathGlow: true,
  },
  low: {
    maxProjectiles: 48,
    maxFloating: 18,
    maxBursts: 6,
    maxBaseHits: 3,
    projectileTrails: false,
    trailMinQuality: 'low',
    fireflyMul: 0.35,
    fogMul: 0.4,
    shadowMap: 0,
    postFxIntensity: 0.35,
    pathGlow: false,
  },
};

export const perfStats = {
  fps: 60,
  enemies: 0,
  towers: 0,
  projectiles: 0,
  particles: 0,
  quality: 'high' as QualityLevel,
};

let manualQuality: QualityLevel | null = null;
let lowStreak = 0;
let highStreak = 0;

export function getQuality(): QualityLevel {
  return manualQuality ?? perfStats.quality;
}

export function setManualQuality(q: QualityLevel | null): void {
  manualQuality = q;
  if (q) perfStats.quality = q;
}

export function getQualityBudgets(): QualityBudgets {
  return BUDGETS[getQuality()];
}

/** Call once per frame with smoothed FPS and live entity counts. */
export function updatePerformance(
  fps: number,
  counts: { enemies: number; towers: number; projectiles: number; particles: number },
): void {
  perfStats.fps = fps;
  perfStats.enemies = counts.enemies;
  perfStats.towers = counts.towers;
  perfStats.projectiles = counts.projectiles;
  perfStats.particles = counts.particles;

  if (manualQuality) return;

  if (fps < 42) {
    lowStreak++;
    highStreak = 0;
  } else if (fps > 54) {
    highStreak++;
    lowStreak = 0;
  }

  if (lowStreak >= 45) {
    if (perfStats.quality === 'high') perfStats.quality = 'medium';
    else if (perfStats.quality === 'medium') perfStats.quality = 'low';
    lowStreak = 0;
  } else if (highStreak >= 120 && perfStats.quality !== 'high') {
    if (perfStats.quality === 'low') perfStats.quality = 'medium';
    else if (perfStats.quality === 'medium') perfStats.quality = 'high';
    highStreak = 0;
  }
}

export function shouldUseProjectileTrails(activeCount: number, gameSpeed: number): boolean {
  const b = getQualityBudgets();
  if (!b.projectileTrails) return false;
  if (gameSpeed >= 2 && activeCount > 24) return false;
  if (activeCount > 40) return false;
  return true;
}

export function scaledDecorCount(base: number): number {
  return Math.max(4, Math.round(base * getQualityBudgets().fireflyMul));
}
