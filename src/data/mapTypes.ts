/**
 * Map type definitions (no runtime imports — safe for mapDefinitions).
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
  mapAnchors?: Array<{
    kind: 'arch';
    position: [number, number, number];
    scale: number;
    rotation: number;
    placementBlocker?: boolean;
    footprintRadius?: number;
  }>;
}

export type MapTemplate = Omit<GameMapConfig, 'levelStart' | 'levelEnd'>;

/** @deprecated Use visualTheme */
export type MapTheme = VisualTheme;
