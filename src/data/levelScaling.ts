/**
 * Procedural level scaling knobs — tuned for 50 levels per map act.
 */

import type { EnemyKind } from './gameConfig';
import { LEVELS_PER_MAP } from './campaignConfig';

export const levelScaling = {
  /** Base enemy HP at level 1 of an act (before map/difficulty multipliers). */
  baseEnemyHp: 22,
  /** Per-level HP growth within a map act (compound). */
  hpGrowthPerActLevel: 1.042,
  /** Extra HP multiplier per map act index. */
  mapHpScale: 0.16,
  /** Base path speed at act level 1. */
  baseEnemySpeed: 0.082,
  /** Speed added from start to end of an act (0..1 act intensity). */
  speedActScale: 0.032,
  /** Speed added per map act. */
  speedMapScale: 0.004,
  /** Base coin reward at act level 1. */
  baseCoinReward: 5,
  coinPerActLevel: 0.18,
  coinPerMap: 2.2,
  /** Spawn interval at act level 1 (seconds). */
  baseSpawnRate: 1.22,
  spawnRatePerActLevel: 0.0045,
  spawnRatePerMap: 0.012,
  minSpawnRate: 0.42,
  /** Act entry (first level of maps 2+) — easier rebuild window. */
  actEntryHpMul: 0.86,
  actEntrySpawnMul: 1.08,
  actEntryCoinMul: 1.12,
  /** Boss wave minion tuning. */
  bossMinionHpMul: 0.9,
  bossMinionSpawnMul: 0.9,
  bossMinionCountBase: 18,
  bossMinionCountPerMap: 2,
  bossMinionCountPerActLevel: 0.12,
  /** Boss stat formula. */
  bossBaseHp: 4800,
  bossHpGrowth: 1.28,
  finalBossHpMul: 1.7,
  bossCoinBase: 280,
  bossCoinPerMap: 95,
  finalBossCoinBonus: 550,
  bossSpeedBase: 0.048,
  bossSpeedPerMap: 0.0011,
  bossSpeedMin: 0.026,
  bossRadiusBase: 1.85,
  bossRadiusPerMap: 0.045,
  finalBossRadiusBonus: 0.28,
  /** When each minion archetype enters the roster within a 50-level act. */
  enemyUnlocks: {
    goblin: { minMap: 0, minLevelInMap: 1 },
    wisp: { minMap: 0, minLevelInMap: 8 },
    brute: { minMap: 1, minLevelInMap: 14 },
    treant: { minMap: 3, minLevelInMap: 26 },
  } satisfies Partial<Record<EnemyKind, { minMap: number; minLevelInMap: number }>>,
  /** Mini-boss every 10 levels within an act (10, 20, 30, 40 — not map finales). */
  miniBossHpFrac: [0.22, 0.28, 0.34, 0.4] as readonly number[],
  miniBossCoinFrac: 0.38,
  miniBossSpeedMul: 1.08,
  miniBossMinionCountMul: 0.72,
  miniBossMinionHpMul: 0.92,
  /** Display names for milestone levels within each act (cycles for 50-level acts). */
  levelNames: [
    'Whispering Approach',
    'Mossy Crossing',
    'Dewfall Path',
    'Twilight Bend',
    'Violet Pass',
    'Hexed Trail',
    'Wraithwood March',
    'Ember Crossing',
    'Shadow Maw',
    'Guardian Gate',
  ],
  bossColorFallback: '#ff3b5c',
} as const;

export function enemyKindsForLevel(mapIndex: number, levelInMap: number): EnemyKind[] {
  const kinds: EnemyKind[] = [];
  for (const [kind, rule] of Object.entries(levelScaling.enemyUnlocks) as [EnemyKind, { minMap: number; minLevelInMap: number }][]) {
    if (mapIndex >= rule.minMap && levelInMap >= rule.minLevelInMap) {
      kinds.push(kind);
    }
  }
  return kinds.length ? kinds : ['goblin'];
}

export function levelNameForAct(levelInMap: number): string {
  const names = levelScaling.levelNames;
  const milestone = Math.min(names.length, Math.max(1, Math.ceil((levelInMap / LEVELS_PER_MAP) * names.length)));
  const base = names[milestone - 1] ?? names[0];
  if (levelInMap === 1 || levelInMap === LEVELS_PER_MAP) return base;
  return `${base} · ${levelInMap}`;
}

export function campaignProgress(level: number, totalLevels: number): number {
  return (level - 1) / Math.max(1, totalLevels - 1);
}

export function actIntensity(levelInMap: number): number {
  return (levelInMap - 1) / Math.max(1, LEVELS_PER_MAP - 1);
}

/** Mini-boss gate levels within each act (10, 20, 30, 40). */
export function isMiniBossLevel(_level: number, levelInMap: number): boolean {
  return levelInMap > 0 && levelInMap < LEVELS_PER_MAP && levelInMap % 10 === 0;
}

export function miniBossStage(levelInMap: number): number {
  return Math.floor(levelInMap / 10) - 1;
}
