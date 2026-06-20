/**
 * Campaign helpers that depend on map config (no circular imports).
 */

import type { DifficultyDef } from './difficulties';
import { MAPS, getMapForLevel, getMapIndex, TOTAL_LEVELS } from './maps';

export { TOTAL_LEVELS };

export function clampLevel(level: number): number {
  return Math.min(Math.max(level, 1), TOTAL_LEVELS);
}

/** First level of a new map act (after a map transition). */
export function isActEntryLevel(level: number): boolean {
  if (level <= 1) return false;
  const map = getMapForLevel(level);
  return level === map.levelStart;
}

/** Coins awarded when entering a new map after clearing the prior act boss. */
export function getMapTransitionBonus(diff: DifficultyDef, enteringLevel: number): number {
  const mapIndex = getMapIndex(enteringLevel);
  return Math.round(diff.mapTransitionBonus * (0.7 + mapIndex * 0.05));
}

/** Final boss display name from the last map config. */
export function getFinalBossName(): string {
  return MAPS[MAPS.length - 1].bossName;
}
