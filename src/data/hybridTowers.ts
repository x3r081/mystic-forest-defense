/**
 * Hybrid tower definitions and merge recipes.
 */

import type { TowerDef } from './gameConfig';

export interface MergeRecipe {
  idA: string;
  idB: string;
  hybridId: string;
  /** Coin cost on top of consuming both towers. */
  mergeCost: number;
}

export const HYBRID_MAX_LEVEL = 3;
export const MERGE_MIN_LEVEL = 3;

export const mergeRecipes: MergeRecipe[] = [
  { idA: 'moon-archer', idB: 'crystal-cannon', hybridId: 'lunar-ballista', mergeCost: 85 },
  { idA: 'moon-archer', idB: 'thorn-spire', hybridId: 'briar-ranger', mergeCost: 70 },
  { idA: 'moon-archer', idB: 'firefly-shrine', hybridId: 'starfire-grove', mergeCost: 95 },
  { idA: 'crystal-cannon', idB: 'thorn-spire', hybridId: 'rootquake-obelisk', mergeCost: 110 },
  { idA: 'crystal-cannon', idB: 'oak-guardian', hybridId: 'titan-grove-cannon', mergeCost: 140 },
  { idA: 'thorn-spire', idB: 'firefly-shrine', hybridId: 'ember-vine-spire', mergeCost: 90 },
  { idA: 'firefly-shrine', idB: 'oak-guardian', hybridId: 'solar-oak-shrine', mergeCost: 130 },
  { idA: 'oak-guardian', idB: 'thorn-spire', hybridId: 'elderthorn-sentinel', mergeCost: 120 },
];

const recipeKey = (a: string, b: string) => [a, b].sort().join('|');

const recipesByKey = new Map(mergeRecipes.map((r) => [recipeKey(r.idA, r.idB), r]));

export function getMergeRecipe(towerA: string, towerB: string): MergeRecipe | null {
  if (towerA === towerB) return null;
  return recipesByKey.get(recipeKey(towerA, towerB)) ?? null;
}

export type TowerVisualKind =
  | TowerDef['shape']
  | 'lunar-ballista'
  | 'briar-ranger'
  | 'starfire-grove'
  | 'rootquake-obelisk'
  | 'titan-grove-cannon'
  | 'ember-vine-spire'
  | 'solar-oak-shrine'
  | 'elderthorn-sentinel';

export interface HybridTowerDef extends TowerDef {
  isHybrid: true;
  visualKind: TowerVisualKind;
  parents: [string, string];
  /** Short description of the hybrid power. */
  power: string;
}

export const hybridTowers: HybridTowerDef[] = [
  {
    id: 'lunar-ballista',
    name: 'Lunar Ballista',
    description: 'Moon-forged bolts that shatter into crystal splinters.',
    icon: '☽◆',
    trait: 'Pierce Splash',
    cost: 0,
    color: '#b8e8ff',
    projectileColor: '#e8ffff',
    range: 6.2,
    damage: 28,
    cooldown: 0.55,
    projectileSpeed: 24,
    shape: 'archer',
    visualKind: 'lunar-ballista',
    towerRadius: 0.62,
    splashRadius: 1.8,
    isHybrid: true,
    parents: ['moon-archer', 'crystal-cannon'],
    power: 'Splash on every shot',
  },
  {
    id: 'briar-ranger',
    name: 'Briar Ranger',
    description: 'Thorn-tipped moon arrows that entangle whole packs.',
    icon: '☾✦',
    trait: 'Snare Volley',
    cost: 0,
    color: '#a8f0b0',
    projectileColor: '#d4ffd8',
    range: 5.8,
    damage: 16,
    cooldown: 0.38,
    projectileSpeed: 23,
    shape: 'archer',
    visualKind: 'briar-ranger',
    towerRadius: 0.58,
    slow: { factor: 0.35, duration: 2.8 },
    isHybrid: true,
    parents: ['moon-archer', 'thorn-spire'],
    power: 'Fast shots with strong slow',
  },
  {
    id: 'starfire-grove',
    name: 'Starfire Grove',
    description: 'A constellation of fireflies raining starlit embers.',
    icon: '☾✸',
    trait: 'Star Burn',
    cost: 0,
    color: '#ffe8a8',
    projectileColor: '#fff4cc',
    range: 6.0,
    damage: 12,
    cooldown: 0.48,
    projectileSpeed: 20,
    shape: 'firefly',
    visualKind: 'starfire-grove',
    towerRadius: 0.62,
    dot: { dps: 22, duration: 3.2 },
    isHybrid: true,
    parents: ['moon-archer', 'firefly-shrine'],
    power: 'Rapid burn stacks',
  },
  {
    id: 'rootquake-obelisk',
    name: 'Rootquake Obelisk',
    description: 'Crystal roots erupt, slowing and shattering foes.',
    icon: '◆✦',
    trait: 'Quake Burst',
    cost: 0,
    color: '#88ffb0',
    projectileColor: '#c0ffe0',
    range: 5.4,
    damage: 52,
    cooldown: 1.2,
    projectileSpeed: 12,
    shape: 'cannon',
    visualKind: 'rootquake-obelisk',
    towerRadius: 0.75,
    splashRadius: 2.8,
    slow: { factor: 0.5, duration: 2.0 },
    isHybrid: true,
    parents: ['crystal-cannon', 'thorn-spire'],
    power: 'Splash + slow shockwave',
  },
  {
    id: 'titan-grove-cannon',
    name: 'Titan Grove Cannon',
    description: 'Ancient oak mass drives a colossal crystal shell.',
    icon: '◆❦',
    trait: 'Siege Burst',
    cost: 0,
    color: '#d4c080',
    projectileColor: '#fff0c0',
    range: 7.5,
    damage: 110,
    cooldown: 1.35,
    projectileSpeed: 16,
    shape: 'cannon',
    visualKind: 'titan-grove-cannon',
    towerRadius: 0.85,
    splashRadius: 3.2,
    isHybrid: true,
    parents: ['crystal-cannon', 'oak-guardian'],
    power: 'Long-range mega splash',
  },
  {
    id: 'ember-vine-spire',
    name: 'Embervine Spire',
    description: 'Burning thorns crawl outward from each strike.',
    icon: '✦✸',
    trait: 'Creeping Burn',
    cost: 0,
    color: '#ffb870',
    projectileColor: '#ffe0a0',
    range: 5.2,
    damage: 18,
    cooldown: 0.7,
    projectileSpeed: 17,
    shape: 'thorn',
    visualKind: 'ember-vine-spire',
    towerRadius: 0.6,
    slow: { factor: 0.4, duration: 2.4 },
    dot: { dps: 18, duration: 3.0 },
    isHybrid: true,
    parents: ['thorn-spire', 'firefly-shrine'],
    power: 'Slow + burn together',
  },
  {
    id: 'solar-oak-shrine',
    name: 'Solar Oak Shrine',
    description: 'Golden fireflies orbit a living oak idol.',
    icon: '✸❦',
    trait: 'Solar Ward',
    cost: 0,
    color: '#ffd890',
    projectileColor: '#fff8c0',
    range: 7.0,
    damage: 45,
    cooldown: 1.0,
    projectileSpeed: 18,
    shape: 'oak',
    visualKind: 'solar-oak-shrine',
    towerRadius: 0.82,
    dot: { dps: 28, duration: 3.5 },
    isHybrid: true,
    parents: ['firefly-shrine', 'oak-guardian'],
    power: 'Heavy burn at long range',
  },
  {
    id: 'elderthorn-sentinel',
    name: 'Elderthorn Sentinel',
    description: 'A rooted guardian whose thorn-lash reaches far.',
    icon: '❦✦',
    trait: 'Root Snare',
    cost: 0,
    color: '#a8c878',
    projectileColor: '#d8f0a8',
    range: 8.0,
    damage: 72,
    cooldown: 1.1,
    projectileSpeed: 19,
    shape: 'oak',
    visualKind: 'elderthorn-sentinel',
    towerRadius: 0.85,
    slow: { factor: 0.3, duration: 3.5 },
    isHybrid: true,
    parents: ['oak-guardian', 'thorn-spire'],
    power: 'Sniper slow bolts',
  },
];

const hybridsById = new Map(hybridTowers.map((h) => [h.id, h]));

export function getHybridTower(id: string): HybridTowerDef | undefined {
  return hybridsById.get(id);
}

export function isHybridTowerId(id: string): boolean {
  return hybridsById.has(id);
}
