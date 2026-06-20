/**
 * Tower upgrade balance — normal towers level 1–5, hybrids level 1–3.
 */

import { getTower } from './gameConfig';
import { HYBRID_MAX_LEVEL, getHybridTower, isHybridTowerId } from './hybridTowers';

export const NORMAL_MAX_LEVEL = 5;
export const MERGE_DISTANCE = 3.2;
export const SELL_REFUND_RATIO = 0.65;

export interface TowerLevelDef {
  level: number;
  label: string;
  damageMul: number;
  rangeMul: number;
  cooldownMul: number;
  projectileSpeedMul: number;
  scaleMul: number;
  emissiveMul: number;
  splashMul: number;
  slowDurationMul: number;
  dotDpsMul: number;
  dotDurationMul: number;
  /** upgradeCostFactor × base.cost × level for next upgrade; Infinity = max */
  upgradeCostFactor: number;
}

const normalLevels: TowerLevelDef[] = [
  { level: 1, label: 'I', damageMul: 1, rangeMul: 1, cooldownMul: 1, projectileSpeedMul: 1, scaleMul: 1, emissiveMul: 1, splashMul: 1, slowDurationMul: 1, dotDpsMul: 1, dotDurationMul: 1, upgradeCostFactor: 0.48 },
  { level: 2, label: 'II', damageMul: 1.2, rangeMul: 1.04, cooldownMul: 0.94, projectileSpeedMul: 1.04, scaleMul: 1.06, emissiveMul: 1.35, splashMul: 1.08, slowDurationMul: 1.08, dotDpsMul: 1.12, dotDurationMul: 1.06, upgradeCostFactor: 0.52 },
  { level: 3, label: 'III', damageMul: 1.42, rangeMul: 1.08, cooldownMul: 0.88, projectileSpeedMul: 1.08, scaleMul: 1.12, emissiveMul: 1.55, splashMul: 1.15, slowDurationMul: 1.15, dotDpsMul: 1.25, dotDurationMul: 1.12, upgradeCostFactor: 0.56 },
  { level: 4, label: 'IV', damageMul: 1.68, rangeMul: 1.14, cooldownMul: 0.8, projectileSpeedMul: 1.12, scaleMul: 1.2, emissiveMul: 1.85, splashMul: 1.25, slowDurationMul: 1.22, dotDpsMul: 1.38, dotDurationMul: 1.2, upgradeCostFactor: 0.62 },
  { level: 5, label: 'V', damageMul: 2.05, rangeMul: 1.22, cooldownMul: 0.72, projectileSpeedMul: 1.18, scaleMul: 1.3, emissiveMul: 2.2, splashMul: 1.38, slowDurationMul: 1.32, dotDpsMul: 1.55, dotDurationMul: 1.32, upgradeCostFactor: Infinity },
];

const hybridLevels: TowerLevelDef[] = [
  { level: 1, label: 'I', damageMul: 1, rangeMul: 1, cooldownMul: 1, projectileSpeedMul: 1, scaleMul: 1.08, emissiveMul: 1.4, splashMul: 1, slowDurationMul: 1, dotDpsMul: 1, dotDurationMul: 1, upgradeCostFactor: 0.65 },
  { level: 2, label: 'II', damageMul: 1.35, rangeMul: 1.08, cooldownMul: 0.88, projectileSpeedMul: 1.08, scaleMul: 1.16, emissiveMul: 1.75, splashMul: 1.15, slowDurationMul: 1.12, dotDpsMul: 1.2, dotDurationMul: 1.1, upgradeCostFactor: 0.72 },
  { level: 3, label: 'III', damageMul: 1.75, rangeMul: 1.16, cooldownMul: 0.78, projectileSpeedMul: 1.14, scaleMul: 1.26, emissiveMul: 2.1, splashMul: 1.28, slowDurationMul: 1.25, dotDpsMul: 1.4, dotDurationMul: 1.22, upgradeCostFactor: Infinity },
];

export function maxLevelForTower(towerId: string): number {
  return isHybridTowerId(towerId) ? HYBRID_MAX_LEVEL : NORMAL_MAX_LEVEL;
}

export function getLevelDef(towerId: string, level: number): TowerLevelDef {
  const max = maxLevelForTower(towerId);
  const table = isHybridTowerId(towerId) ? hybridLevels : normalLevels;
  const clamped = Math.min(Math.max(level, 1), max);
  return table[clamped - 1];
}

export function canUpgradeLevel(towerId: string, currentLevel: number): boolean {
  return currentLevel < maxLevelForTower(towerId);
}

/** Coin base for upgrade pricing — hybrids use parent tower costs, not their own `cost: 0`. */
export function upgradeBaseCost(towerId: string): number {
  const hybrid = getHybridTower(towerId);
  if (!hybrid) return getTower(towerId)?.cost ?? 50;
  const [a, b] = hybrid.parents;
  const ca = getTower(a)?.cost ?? 0;
  const cb = getTower(b)?.cost ?? 0;
  return Math.max(40, Math.round((ca + cb) * 0.45));
}

export function getUpgradeCost(towerId: string, currentLevel: number): number {
  const def = getLevelDef(towerId, currentLevel);
  if (def.upgradeCostFactor === Infinity || !canUpgradeLevel(towerId, currentLevel)) return Infinity;
  return Math.round(upgradeBaseCost(towerId) * def.upgradeCostFactor * currentLevel);
}

export function getSellRefund(investedCoins: number): number {
  return Math.round(investedCoins * SELL_REFUND_RATIO);
}

export function towersWithinMergeRange(ax: number, az: number, bx: number, bz: number): boolean {
  const dx = ax - bx;
  const dz = az - bz;
  const r = MERGE_DISTANCE;
  return dx * dx + dz * dz <= r * r;
}
