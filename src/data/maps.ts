/**
 * Scalable map config system — 10 maps × 10 levels = 100 levels.
 */

export type MapId =
  | 'mystic-forest'
  | 'moonlit-ruins'
  | 'sunken-moss-marsh'
  | 'emberroot-hollow'
  | 'crystal-canopy'
  | 'haunted-elderwood'
  | 'frostpine-sanctuary'
  | 'verdant-skygrove'
  | 'shadowthorn-labyrinth'
  | 'heart-ancient-forest';

export type VisualTheme =
  | 'forest'
  | 'ruins'
  | 'marsh'
  | 'ember'
  | 'crystal'
  | 'haunted'
  | 'frost'
  | 'skygrove'
  | 'shadowthorn'
  | 'ancient-heart';

export interface GroundPatch {
  x: number;
  z: number;
  r: number;
  color: string;
  opacity: number;
}

export interface LightingConfig {
  background: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  ambient: number;
  ambientColor: string;
  accent: string;
  accentIntensity: number;
  pathColor: string;
  fireflyColor: string;
  fireflySecondary: string;
  fogSecondary: string;
  directionalColor: string;
  moonLight?: { position: [number, number, number]; color: string; intensity: number };
}

export interface GameMapConfig {
  id: MapId;
  name: string;
  levelStart: number;
  levelEnd: number;
  pathPoints: [number, number][];
  pathWidth: number;
  visualTheme: VisualTheme;
  decorationSeed: number;
  scatterSeed: number;
  groundColor: string;
  grassColor: string;
  pathAuraColor: string;
  groundPatches: GroundPatch[];
  lightingConfig: LightingConfig;
  introText: string;
  bossName: string;
  bossColor: string;
  /** Optional map-specific scenery anchors (e.g. central ruin arch). */
  mapAnchors?: Array<{
    kind: 'arch';
    position: [number, number, number];
    scale: number;
    rotation: number;
    placementBlocker?: boolean;
    footprintRadius?: number;
  }>;
}

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

/** All battlefield maps in level order. */
export const MAPS = ALL_MAPS;

/** Total playable levels (last map's levelEnd). */
export const TOTAL_LEVELS = MAPS[MAPS.length - 1].levelEnd;

/** Levels per map act (derived from first map span; HUD act dots). */
export const LEVELS_PER_MAP = MAPS[0].levelEnd - MAPS[0].levelStart + 1;
export const MAP_COUNT = MAPS.length;

/** Resolve the map config for a level number (1–100). */
export function getMapForLevel(level: number): GameMapConfig {
  return MAPS.find((m) => level >= m.levelStart && level <= m.levelEnd) ?? MAPS[0];
}

/** Level index within its map act (1-based). */
export function getLevelInMap(level: number): number {
  const map = getMapForLevel(level);
  return level - map.levelStart + 1;
}

/** Map index (0-based). */
export function getMapIndex(level: number): number {
  const idx = MAPS.findIndex((m) => level >= m.levelStart && level <= m.levelEnd);
  return idx >= 0 ? idx : 0;
}

export function getMap(id: MapId): GameMapConfig {
  return MAPS.find((m) => m.id === id) ?? MAPS[0];
}

export function isFinalLevel(level: number): boolean {
  return level === TOTAL_LEVELS;
}

export function isBossLevel(level: number): boolean {
  const map = getMapForLevel(level);
  return level === map.levelEnd;
}

export function isMapTransition(levelCompleted: number): boolean {
  if (levelCompleted >= TOTAL_LEVELS) return false;
  const map = getMapForLevel(levelCompleted);
  return levelCompleted === map.levelEnd;
}

/** @deprecated Use getMapForLevel */
export function getMapForWave(wave: number): GameMapConfig | undefined {
  return getMapForLevel(wave);
}

/** @deprecated Use getMapForLevel */
export function getMapConfigForRound(round: number): GameMapConfig {
  return getMapForLevel(round);
}

/** @deprecated Use getMapForLevel */
export function getMapForRound(round: number): MapId {
  return getMapForLevel(round).id;
}

/** @deprecated Use visualTheme */
export type MapTheme = VisualTheme;
