/**
 * Campaign structure — single source of truth for level/map math.
 */

import type { DifficultyDef } from './difficulties';

export const LEVELS_PER_MAP = 50;
export const MAP_COUNT = 10;
export const TOTAL_LEVELS = LEVELS_PER_MAP * MAP_COUNT;

/** HUD act progress is shown as this many segments (each spans LEVELS_PER_MAP / segments levels). */
export const ACT_PROGRESS_SEGMENTS = 10;

export function clampLevel(level: number): number {
  return Math.min(Math.max(level, 1), TOTAL_LEVELS);
}

export function getMapIndexForLevel(level: number): number {
  return Math.floor((clampLevel(level) - 1) / LEVELS_PER_MAP);
}

/** First level of a new map act (51, 101, …). */
export function isMapTransitionLevel(level: number): boolean {
  const clamped = clampLevel(level);
  return clamped > 1 && (clamped - 1) % LEVELS_PER_MAP === 0;
}

/** True after clearing the last level of a map act (50, 100, …). */
export function isMapTransition(completedLevel: number): boolean {
  const clamped = clampLevel(completedLevel);
  return clamped > 0 && clamped < TOTAL_LEVELS && clamped % LEVELS_PER_MAP === 0;
}

export function getLevelInMap(level: number): number {
  return ((clampLevel(level) - 1) % LEVELS_PER_MAP) + 1;
}

/** 0-based segment index within the current map act (for HUD dots). */
export function getActProgressSegment(level: number): number {
  return Math.min(
    ACT_PROGRESS_SEGMENTS - 1,
    Math.floor((getLevelInMap(level) - 1) / (LEVELS_PER_MAP / ACT_PROGRESS_SEGMENTS)),
  );
}

export function attachLevelRanges<T extends Record<string, unknown>>(
  maps: T[],
): (T & { levelStart: number; levelEnd: number })[] {
  return maps.map((map, index) => ({
    ...map,
    levelStart: index * LEVELS_PER_MAP + 1,
    levelEnd: (index + 1) * LEVELS_PER_MAP,
  }));
}

/** First level of a new map act (after a map transition). */
export function isActEntryLevel(level: number): boolean {
  return isMapTransitionLevel(level);
}

/** Coins awarded when entering a new map after clearing the prior act boss. */
export function getMapTransitionBonus(diff: DifficultyDef, enteringLevel: number): number {
  const mapIndex = getMapIndexForLevel(enteringLevel);
  return Math.round(diff.mapTransitionBonus * (0.7 + mapIndex * 0.05));
}

/** Final boss display name — set after ALL_MAPS is built. */
let finalBossName = 'Heartwood Eternal';

export function setFinalBossName(name: string): void {
  finalBossName = name;
}

export function getFinalBossName(): string {
  return finalBossName;
}
