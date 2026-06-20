/**
 * Procedural level scaling knobs — tune difficulty curves here.
 */

import type { EnemyKind } from './gameConfig';
import { LEVELS_PER_MAP } from './maps';

export const levelScaling = {
  /** Base enemy HP at level 1 before map/difficulty multipliers. */
  baseEnemyHp: 22,
  /** Per-level HP growth (compound). */
  hpGrowth: 1.052,
  /** Extra HP multiplier per map act index. */
  mapHpScale: 0.14,
  /** Base path speed at level 1. */
  baseEnemySpeed: 0.082,
  /** Speed added over full campaign progress (0..1). */
  speedProgressScale: 0.038,
  /** Speed added per map act. */
  speedMapScale: 0.003,
  /** Base coin reward at level 1. */
  baseCoinReward: 5,
  coinPerLevel: 0.24,
  coinPerMap: 1.5,
  /** Spawn interval at level 1 (seconds). */
  baseSpawnRate: 1.28,
  spawnRatePerLevel: 0.0075,
  spawnRatePerMap: 0.015,
  minSpawnRate: 0.48,
  /** Act entry (first level of maps 2+) — easier rebuild window. */
  actEntryHpMul: 0.88,
  actEntrySpawnMul: 1.06,
  actEntryCoinMul: 1.08,
  /** Boss wave minion tuning. */
  bossMinionHpMul: 0.92,
  bossMinionSpawnMul: 0.92,
  bossMinionCountBase: 14,
  bossMinionCountPerMap: 1.2,
  /** Boss stat formula. */
  bossBaseHp: 5200,
  bossHpGrowth: 1.32,
  finalBossHpMul: 1.65,
  bossCoinBase: 220,
  bossCoinPerMap: 85,
  finalBossCoinBonus: 400,
  bossSpeedBase: 0.048,
  bossSpeedPerMap: 0.0012,
  bossSpeedMin: 0.028,
  bossRadiusBase: 1.85,
  bossRadiusPerMap: 0.04,
  finalBossRadiusBonus: 0.25,
  /** When each minion archetype enters the roster (map index OR level-in-map threshold). */
  enemyUnlocks: {
    goblin: { minMap: 0, minLevelInMap: 1 },
    wisp: { minMap: 1, minLevelInMap: 3 },
    brute: { minMap: 2, minLevelInMap: 5 },
    treant: { minMap: 4, minLevelInMap: 7 },
  } satisfies Partial<Record<EnemyKind, { minMap: number; minLevelInMap: number }>>,
  /** Display names for levels 1–N within each map act. */
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
  /** Fallback boss tint if map has no bossColor. */
  bossColorFallback: '#ff3b5c',
} as const;

export function enemyKindsForLevel(mapIndex: number, levelInMap: number): EnemyKind[] {
  const kinds: EnemyKind[] = [];
  for (const [kind, rule] of Object.entries(levelScaling.enemyUnlocks) as [EnemyKind, { minMap: number; minLevelInMap: number }][]) {
    if (mapIndex >= rule.minMap || levelInMap >= rule.minLevelInMap) {
      kinds.push(kind);
    }
  }
  return kinds.length ? kinds : ['goblin'];
}

export function levelNameForAct(levelInMap: number): string {
  const idx = levelInMap - 1;
  return levelScaling.levelNames[idx] ?? `Trial ${levelInMap}`;
}

export function campaignProgress(level: number, totalLevels: number): number {
  return (level - 1) / Math.max(1, totalLevels - 1);
}

export function actIntensity(levelInMap: number): number {
  return (levelInMap - 1) / Math.max(1, LEVELS_PER_MAP - 1);
}
