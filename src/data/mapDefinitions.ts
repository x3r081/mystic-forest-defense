/**
 * All 10 battlefield map definitions ({@link LEVELS_PER_MAP} levels each).
 */

import type { MapTemplate, GameMapConfig, LightingConfig } from './mapTypes';
import { attachLevelRanges } from './campaignConfig';

const mkLighting = (
  base: Partial<LightingConfig> & Pick<LightingConfig, 'background' | 'fog' | 'accent' | 'pathColor'>,
): LightingConfig => ({
  fogNear: 14,
  fogFar: 38,
  ambient: 0.4,
  ambientColor: base.accent,
  accentIntensity: 0.6,
  fireflyColor: base.pathColor,
  fireflySecondary: base.accent,
  fogSecondary: base.fog,
  directionalColor: base.accent,
  ...base,
});

export const map1MysticForest: MapTemplate = {
  id: 'mystic-forest',
  name: 'Mystic Forest',
  pathPoints: [
    [-12.5, 3], [-9, -2.5], [-5.5, 2.5], [-2, -3], [1.5, 1.5], [5, -2.5], [8.5, 2.5], [12.5, -0.5],
  ],
  pathWidth: 1.25,
  visualTheme: 'forest',
  decorationSeed: 20260620,
  scatterSeed: 42,
  groundColor: '#0d1a14',
  grassColor: '#347a4d',
  pathAuraColor: '#1a3d2e',
  groundPatches: [
    { x: -11, z: -5, r: 7, color: '#1e4a32', opacity: 0.22 },
    { x: 10, z: -6, r: 6, color: '#2f6a47', opacity: 0.2 },
  ],
  lightingConfig: mkLighting({
    background: '#0a1218', fog: '#142820', accent: '#5eead4', pathColor: '#7ef9c4', ambientColor: '#c8e8d8',
  }),
  introText: 'Ancient roots stir beneath the moss. The corruption first crept in here — hold the glade.',
  bossName: 'Ancient Forest Corruptor',
  bossColor: '#ff3b5c',
};

export const map2MoonlitRuinsGrove: MapTemplate = {
  id: 'moonlit-ruins',
  name: 'Moonlit Ruins Grove',
  pathPoints: [
    [-13, -5.5], [-10, -1.5], [-7, 3], [-3.5, 4.5], [0, 3.5], [3.5, 4], [5, 0.5], [2, -3.5], [6, -2.5], [10, 1.5], [13, 5.5],
  ],
  pathWidth: 1.3,
  visualTheme: 'ruins',
  decorationSeed: 20260711,
  scatterSeed: 77,
  groundColor: '#0a0e1c',
  grassColor: '#2a4560',
  pathAuraColor: '#1a2848',
  groundPatches: [
    { x: -10, z: -4, r: 7, color: '#1a2848', opacity: 0.24 },
    { x: 12, z: 6, r: 7, color: '#1a2848', opacity: 0.2 },
  ],
  lightingConfig: mkLighting({
    background: '#060810', fog: '#0c1428', accent: '#8899ff', pathColor: '#a8c0ff', ambientColor: '#8898cc',
    fogNear: 12, fogFar: 36, moonLight: { position: [-6, 12, -4], color: '#6688ff', intensity: 0.4 },
  }),
  introText: 'Moonlight spills over shattered stone. Rebuild your wards among the fallen arches.',
  bossName: 'Moonlit Eclipse Warden',
  bossColor: '#c040ff',
  mapAnchors: [
    {
      kind: 'arch',
      position: [0.5, 0, 2.8],
      scale: 1.35,
      rotation: 0.35,
      placementBlocker: true,
      footprintRadius: 0.22,
    },
  ],
};

export const map3SunkenMossMarsh: MapTemplate = {
  id: 'sunken-moss-marsh',
  name: 'Sunken Moss Marsh',
  pathPoints: [
    [-12, -4], [-10, 0], [-8, 3.5], [-5, 1], [-3, -2.5], [0, -3.5], [3, -1], [6, 2.5], [9, 0], [12, 3.5],
  ],
  pathWidth: 1.28,
  visualTheme: 'marsh',
  decorationSeed: 20260801,
  scatterSeed: 103,
  groundColor: '#0a1610',
  grassColor: '#2a5a40',
  pathAuraColor: '#1a4030',
  groundPatches: [
    { x: -8, z: -3, r: 8, color: '#1a3830', opacity: 0.28 },
    { x: 7, z: 2, r: 7, color: '#204838', opacity: 0.25 },
  ],
  lightingConfig: mkLighting({
    background: '#061210', fog: '#0a2820', accent: '#6ee8b0', pathColor: '#8fffd0', ambientColor: '#a0e8c8',
    fogNear: 10, fogFar: 32, ambient: 0.36,
  }),
  introText: 'Swamp mist rolls between glowing lily pads. The path sinks — tread carefully.',
  bossName: 'Bog Leviathan',
  bossColor: '#40c0a0',
};

export const map4EmberrootHollow: MapTemplate = {
  id: 'emberroot-hollow',
  name: 'Emberroot Hollow',
  pathPoints: [
    [-13, 2], [-9, -4], [-5, 3], [-1, -2], [2, 4], [5, -3], [8, 2], [11, -1], [13, -3],
  ],
  pathWidth: 1.25,
  visualTheme: 'ember',
  decorationSeed: 20260815,
  scatterSeed: 118,
  groundColor: '#1a0c08',
  grassColor: '#5a4020',
  pathAuraColor: '#3a2010',
  groundPatches: [
    { x: -9, z: 0, r: 6, color: '#4a2010', opacity: 0.3 },
    { x: 8, z: -2, r: 7, color: '#602810', opacity: 0.28 },
  ],
  lightingConfig: mkLighting({
    background: '#120808', fog: '#281008', accent: '#ff8844', pathColor: '#ffb070', ambientColor: '#ffc898',
    fogNear: 13, fogFar: 34, ambient: 0.44, accentIntensity: 0.75,
  }),
  introText: 'Warm embers pulse beneath burnt roots. Lava cracks glow along the hollow path.',
  bossName: 'Emberroot Colossus',
  bossColor: '#ff8844',
};

export const map5CrystalCanopy: MapTemplate = {
  id: 'crystal-canopy',
  name: 'Crystal Canopy',
  pathPoints: [
    [-12.5, -2], [-9, 3], [-5, -1], [-1, 4], [3, 0], [7, 3], [10, -2], [13, 2],
  ],
  pathWidth: 1.22,
  visualTheme: 'crystal',
  decorationSeed: 20260901,
  scatterSeed: 131,
  groundColor: '#0c1420',
  grassColor: '#3a6080',
  pathAuraColor: '#204060',
  groundPatches: [
    { x: -6, z: 3, r: 6, color: '#3060a0', opacity: 0.22 },
    { x: 9, z: -1, r: 7, color: '#4080c0', opacity: 0.2 },
  ],
  lightingConfig: mkLighting({
    background: '#080c18', fog: '#102040', accent: '#80d0ff', pathColor: '#b0e8ff', ambientColor: '#c0f0ff',
    fogNear: 15, fogFar: 40, ambient: 0.48, accentIntensity: 0.8,
  }),
  introText: 'Magical crystals pierce an elevated canopy. Glowing bridges span the radiant path.',
  bossName: 'Prism Sovereign',
  bossColor: '#80d0ff',
};

export const map6HauntedElderwood: MapTemplate = {
  id: 'haunted-elderwood',
  name: 'Haunted Elderwood',
  pathPoints: [
    [-13, 0], [-10, 4], [-6, -3], [-2, 2], [1, -4], [4, 3], [8, -2], [11, 4], [13, 1],
  ],
  pathWidth: 1.26,
  visualTheme: 'haunted',
  decorationSeed: 20260920,
  scatterSeed: 144,
  groundColor: '#0e1018',
  grassColor: '#3a4550',
  pathAuraColor: '#202830',
  groundPatches: [
    { x: -11, z: 2, r: 7, color: '#283040', opacity: 0.26 },
    { x: 10, z: -1, r: 6, color: '#303848', opacity: 0.24 },
  ],
  lightingConfig: mkLighting({
    background: '#060810', fog: '#101820', accent: '#c0d0e8', pathColor: '#e0f0ff', ambientColor: '#a0b0c8',
    fogNear: 11, fogFar: 30, ambient: 0.32,
  }),
  introText: 'Ghostly trees sway in pale fog. Spirits drift between dark vines — do not falter.',
  bossName: 'Elderwood Wraith King',
  bossColor: '#e0f0ff',
};

export const map7FrostpineSanctuary: MapTemplate = {
  id: 'frostpine-sanctuary',
  name: 'Frostpine Sanctuary',
  pathPoints: [
    [-12, -5], [-8, -1], [-4, -4], [0, 0], [4, -3], [8, 1], [12, 4],
  ],
  pathWidth: 1.24,
  visualTheme: 'frost',
  decorationSeed: 20261005,
  scatterSeed: 157,
  groundColor: '#101820',
  grassColor: '#507080',
  pathAuraColor: '#304050',
  groundPatches: [
    { x: -7, z: -2, r: 7, color: '#406070', opacity: 0.22 },
    { x: 6, z: 3, r: 6, color: '#508090', opacity: 0.2 },
  ],
  lightingConfig: mkLighting({
    background: '#0a1018', fog: '#182838', accent: '#a0d8ff', pathColor: '#d0f0ff', ambientColor: '#c8e8ff',
    fogNear: 14, fogFar: 36, ambient: 0.46,
  }),
  introText: 'Snow settles on frostpine needles. Ice crystals glitter along the frozen path.',
  bossName: 'Frostpine Titan',
  bossColor: '#a0d8ff',
};

export const map8VerdantSkygrove: MapTemplate = {
  id: 'verdant-skygrove',
  name: 'Verdant Skygrove',
  pathPoints: [
    [-13, -3], [-10, 2], [-6, -2], [-2, 4], [2, -1], [6, 3], [10, -3], [13, 4],
  ],
  pathWidth: 1.2,
  visualTheme: 'skygrove',
  decorationSeed: 20261020,
  scatterSeed: 168,
  groundColor: '#0c1814',
  grassColor: '#408060',
  pathAuraColor: '#286048',
  groundPatches: [
    { x: -5, z: 1, r: 8, color: '#308858', opacity: 0.2 },
    { x: 8, z: -2, r: 7, color: '#40a068', opacity: 0.18 },
  ],
  lightingConfig: mkLighting({
    background: '#081418', fog: '#102820', accent: '#80ffb0', pathColor: '#a0ffd0', ambientColor: '#c0ffe0',
    fogNear: 16, fogFar: 42, ambient: 0.5,
  }),
  introText: 'Floating platforms drift among clouds. Vines bridge the skygrove path below.',
  bossName: 'Skygrove Tempest',
  bossColor: '#80ffb0',
};

export const map9ShadowthornLabyrinth: MapTemplate = {
  id: 'shadowthorn-labyrinth',
  name: 'Shadowthorn Labyrinth',
  pathPoints: [
    [-13, -4], [-9, -4], [-9, 0], [-5, 0], [-5, 4], [-1, 4], [-1, -2], [3, -2], [3, 2], [7, 2], [7, -3], [11, -3], [11, 3], [13, 3],
  ],
  pathWidth: 1.18,
  visualTheme: 'shadowthorn',
  decorationSeed: 20261101,
  scatterSeed: 181,
  groundColor: '#0a0814',
  grassColor: '#304030',
  pathAuraColor: '#201830',
  groundPatches: [
    { x: -3, z: 0, r: 7, color: '#302050', opacity: 0.28 },
    { x: 9, z: 0, r: 6, color: '#402860', opacity: 0.26 },
  ],
  lightingConfig: mkLighting({
    background: '#060410', fog: '#180828', accent: '#b080ff', pathColor: '#d0a8ff', ambientColor: '#9070c0',
    fogNear: 10, fogFar: 28, ambient: 0.3, accentIntensity: 0.85,
  }),
  introText: 'Purple fog chokes a maze of thorn walls. The path twists — trust your wards.',
  bossName: 'Shadowthorn Matriarch',
  bossColor: '#b080ff',
};

export const map10HeartAncientForest: MapTemplate = {
  id: 'heart-ancient-forest',
  name: 'Heart of the Ancient Forest',
  pathPoints: [
    [-12, 5], [-8, 2], [-4, 4], [0, 0], [4, -3], [8, 1], [11, 4], [13, 6],
  ],
  pathWidth: 1.35,
  visualTheme: 'ancient-heart',
  decorationSeed: 20261115,
  scatterSeed: 200,
  groundColor: '#0a1408',
  grassColor: '#508040',
  pathAuraColor: '#286020',
  groundPatches: [
    { x: 0, z: 0, r: 9, color: '#408030', opacity: 0.3 },
    { x: -8, z: 3, r: 6, color: '#609040', opacity: 0.22 },
  ],
  lightingConfig: mkLighting({
    background: '#040808', fog: '#081808', accent: '#ffe080', pathColor: '#fff0a0', ambientColor: '#d0f0a0',
    fogNear: 12, fogFar: 34, ambient: 0.42, accentIntensity: 1.0,
    moonLight: { position: [0, 14, 0], color: '#ffd060', intensity: 0.55 },
  }),
  introText: 'The ancient heart of the forest awaits. Golden-green magic pulses around the final portal.',
  bossName: 'Heartwood Eternal',
  bossColor: '#ffe080',
};

export const ALL_MAPS: GameMapConfig[] = attachLevelRanges([
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
]);
