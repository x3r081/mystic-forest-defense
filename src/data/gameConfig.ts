/**
 * Static game configuration and balance data.
 * Kept separate from runtime state so designers can tweak values in one place.
 */

export const gameConfig = {
  title: 'Mystic Forest Defense',
  tagline: 'Channel the ancient grove. Hold back the creeping dark.',
  startingCoins: 120,
  startingLives: 20,
} as const;

export type EnemyKind = 'goblin' | 'brute' | 'wisp' | 'treant' | 'corruptor';

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  /** Multiplier applied to the level's base enemy health. */
  hpMul: number;
  /** Multiplier applied to the level's base enemy speed. */
  speedMul: number;
  /** Multiplier applied to the level's base coin reward. */
  bountyMul: number;
  /** Fractional damage resistance, 0 (none) .. 1 (immune). */
  armor: number;
  color: string;
  radius: number;
  /** Body opacity; < 1 for see-through foes like the Shadow Wisp. */
  opacity: number;
  /**
   * Lives lost when this enemy reaches the base. Tougher foes hurt more. The
   * final boss is special-cased to drain ALL remaining lives (see the store).
   */
  lifeDamage: number;
}

export const enemyTypes: Record<EnemyKind, EnemyDef> = {
  goblin: {
    kind: 'goblin',
    name: 'Goblin Scout',
    hpMul: 0.55,
    speedMul: 1.5,
    bountyMul: 0.9,
    armor: 0,
    color: '#9be07a',
    radius: 0.36,
    opacity: 1,
    lifeDamage: 1,
  },
  brute: {
    kind: 'brute',
    name: 'Moss Brute',
    hpMul: 1.9,
    speedMul: 0.62,
    bountyMul: 1.4,
    armor: 0.1,
    color: '#5f8a4a',
    radius: 0.78,
    opacity: 1,
    lifeDamage: 2,
  },
  wisp: {
    kind: 'wisp',
    name: 'Shadow Wisp',
    hpMul: 0.85,
    speedMul: 1.05,
    bountyMul: 1.1,
    armor: 0,
    color: '#b48bff',
    radius: 0.5,
    opacity: 0.45,
    lifeDamage: 1,
  },
  treant: {
    kind: 'treant',
    name: 'Armored Treant',
    hpMul: 1.5,
    speedMul: 0.7,
    bountyMul: 1.4,
    armor: 0.3,
    color: '#8a6a3f',
    radius: 0.64,
    opacity: 1,
    lifeDamage: 3,
  },
  corruptor: {
    kind: 'corruptor',
    name: 'Ancient Forest Corruptor',
    hpMul: 1,
    speedMul: 1,
    bountyMul: 1,
    armor: 0.2,
    color: '#ff3b5c',
    radius: 1.95,
    opacity: 1,
    // The final boss drains every remaining life on contact (special-cased).
    lifeDamage: 999,
  },
};

export interface TowerDef {
  id: string;
  name: string;
  description: string;
  /** Decorative glyph shown on the shop card. */
  icon: string;
  /** Short tag shown on the build card (e.g. "Rapid", "Splash"). */
  trait: string;
  cost: number;
  color: string;
  /** Color of fired projectiles. */
  projectileColor: string;
  /** Targeting radius in world units. */
  range: number;
  /** Damage dealt per hit. */
  damage: number;
  /** Seconds between shots (lower = faster fire rate). */
  cooldown: number;
  /** Projectile travel speed in world units / second. */
  projectileSpeed: number;
  /** Visual archetype for the tower model. */
  shape: 'archer' | 'cannon' | 'thorn' | 'firefly' | 'oak';
  /** Physical footprint radius (world units) for placement collision. */
  towerRadius: number;
  /** Area damage radius applied on impact. */
  splashRadius?: number;
  /** Movement-slow effect applied to the struck enemy. */
  slow?: { factor: number; duration: number };
  /** Damage-over-time effect applied to the struck enemy. */
  dot?: { dps: number; duration: number };
}

export const towers: TowerDef[] = [
  {
    id: 'moon-archer',
    name: 'Moon Archer',
    description: 'Rapid, low-damage moonlight arrows. Cheap and reliable.',
    icon: '☾',
    trait: 'Rapid',
    cost: 42,
    color: '#bcd6ff',
    projectileColor: '#eaf4ff',
    range: 5.2,
    damage: 10,
    cooldown: 0.42,
    projectileSpeed: 22,
    shape: 'archer',
    towerRadius: 0.55,
  },
  {
    id: 'crystal-cannon',
    name: 'Crystal Cannon',
    description: 'Slow, heavy shards that burst for splash damage.',
    icon: '◆',
    trait: 'Splash',
    cost: 100,
    color: '#5ff0d0',
    projectileColor: '#a9ffe9',
    range: 5.2,
    damage: 40,
    cooldown: 1.5,
    projectileSpeed: 14,
    shape: 'cannon',
    towerRadius: 0.7,
    splashRadius: 2.5,
  },
  {
    id: 'thorn-spire',
    name: 'Thorn Spire',
    description: 'Snaring thorns that sharply slow enemies they strike.',
    icon: '✦',
    trait: 'Slow',
    cost: 54,
    color: '#86e07a',
    projectileColor: '#c4ff9b',
    range: 5.0,
    damage: 11,
    cooldown: 0.8,
    projectileSpeed: 18,
    shape: 'thorn',
    towerRadius: 0.55,
    slow: { factor: 0.45, duration: 2.2 },
  },
  {
    id: 'firefly-shrine',
    name: 'Firefly Shrine',
    description: 'Magical motes that ignite foes with lingering burn.',
    icon: '✸',
    trait: 'Burn',
    cost: 82,
    color: '#ffd27a',
    projectileColor: '#ffe6a8',
    range: 5.5,
    damage: 6,
    cooldown: 1.1,
    projectileSpeed: 16,
    shape: 'firefly',
    towerRadius: 0.6,
    dot: { dps: 16, duration: 2.8 },
  },
  {
    id: 'oak-guardian',
    name: 'Ancient Oak Guardian',
    description: 'Long-range siege bolts with devastating single-target power.',
    icon: '❦',
    trait: 'Sniper',
    cost: 170,
    color: '#cbab6a',
    projectileColor: '#ffe9b0',
    range: 8.5,
    damage: 88,
    cooldown: 1.9,
    projectileSpeed: 20,
    shape: 'oak',
    towerRadius: 0.8,
  },
];

const towersById = new Map(towers.map((t) => [t.id, t]));

/** Look up a base shop tower by id. Hybrids use getTowerDef from towerRegistry. */
export function getTower(id: string | null | undefined): TowerDef | undefined {
  return id == null ? undefined : towersById.get(id);
}
