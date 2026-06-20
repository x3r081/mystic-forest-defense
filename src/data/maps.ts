/**
 * Scalable map config system — MAP_COUNT maps × LEVELS_PER_MAP levels.
 */

export type {
  MapId,
  VisualTheme,
  MapTheme,
  GroundPatch,
  LightingConfig,
  GameMapConfig,
  MapTemplate,
} from './mapTypes';

export {
  map1MysticForest,
  map2MoonlitRuinsGrove,
  map3SunkenMossMarsh,
  map4EmberrootHollow,
  map5CrystalCanopy,
  map6HauntedElderwood,
  map7FrostpineSanctuary,
  map8VerdantSkygrove,
  map9ShadowthornLabyrinth,
  map10HeartAncientForest,
  ALL_MAPS,
} from './mapDefinitions';

import { ALL_MAPS } from './mapDefinitions';
import {
  TOTAL_LEVELS,
  getMapIndexForLevel,
  setFinalBossName,
} from './campaignConfig';

export {
  LEVELS_PER_MAP,
  MAP_COUNT,
  TOTAL_LEVELS,
  getMapIndexForLevel,
  getLevelInMap,
  isMapTransition,
  isMapTransitionLevel,
} from './campaignConfig';

export const MAPS = ALL_MAPS;

setFinalBossName(MAPS[MAPS.length - 1].bossName);

export function getMapForLevel(level: number) {
  const index = getMapIndexForLevel(level);
  return MAPS[index] ?? MAPS[0];
}

export function getMapIndex(level: number): number {
  return getMapIndexForLevel(level);
}

export function getMap(id: import('./mapTypes').MapId) {
  return MAPS.find((m) => m.id === id) ?? MAPS[0];
}

export function isFinalLevel(level: number): boolean {
  return level === TOTAL_LEVELS;
}

export function isBossLevel(level: number): boolean {
  const map = getMapForLevel(level);
  return level === map.levelEnd;
}

/** @deprecated Use getMapForLevel */
export function getMapForWave(wave: number) {
  return getMapForLevel(wave);
}

/** @deprecated Use getMapForLevel */
export function getMapConfigForRound(round: number) {
  return getMapForLevel(round);
}

/** @deprecated Use getMapForLevel */
export function getMapForRound(round: number) {
  return getMapForLevel(round).id;
}
