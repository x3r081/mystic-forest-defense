import type { EnemyKind } from './gameConfig';
import type { MapId } from './maps';
import { TOTAL_LEVELS } from './maps';
import { generateLevelConfig } from './levelGenerator';

export { TOTAL_LEVELS } from './maps';

export interface LevelVisual {
  background: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  ambient: number;
  accent: string;
  accentIntensity: number;
  pathColor: string;
  fireflyColor: string;
  fireflyCount: number;
  intensity: number;
}

export interface BossDef {
  name: string;
  health: number;
  speed: number;
  coinReward: number;
  radius: number;
  color: string;
}

export interface LevelDef {
  id: number;
  name: string;
  mapId: MapId;
  /** Shown on first level of each map in the prepare screen. */
  introText?: string;
  enemyCount: number;
  enemyHealth: number;
  enemySpeed: number;
  coinReward: number;
  spawnRate: number;
  enemyKinds: EnemyKind[];
  visual: LevelVisual;
  boss?: BossDef;
}

/** Base level data (no difficulty applied). Cached per level. */
const cache = new Map<number, LevelDef>();

export function getLevel(level: number): LevelDef {
  const clamped = Math.min(Math.max(level, 1), TOTAL_LEVELS);
  let def = cache.get(clamped);
  if (!def) {
    def = generateLevelConfig(clamped);
    cache.set(clamped, def);
  }
  return def;
}

/** Clear cached levels (e.g. after balance tweaks in dev). */
export function clearLevelCache(): void {
  cache.clear();
}
