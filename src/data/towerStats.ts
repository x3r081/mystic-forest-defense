/**
 * Effective combat stats from tower level + hybrid/base defs.
 */

import type { AnyTowerDef } from './towerRegistry';
import { getTowerDef, getVisualKind, isHybridDef } from './towerRegistry';
import {
  getLevelDef,
  getUpgradeCost,
  canUpgradeLevel,
  getSellRefund,
  towersWithinMergeRange,
  maxLevelForTower,
  NORMAL_MAX_LEVEL,
  MERGE_DISTANCE,
  SELL_REFUND_RATIO,
} from './towerUpgradeConfig';

export interface EffectiveTowerStats {
  damage: number;
  range: number;
  cooldown: number;
  projectileSpeed: number;
  splashRadius?: number;
  slow?: { factor: number; duration: number };
  dot?: { dps: number; duration: number };
  color: string;
  projectileColor: string;
  fromY: number;
  level: number;
  maxLevel: number;
  levelLabel: string;
  scaleMul: number;
  emissiveMul: number;
  visualKind: ReturnType<typeof getVisualKind>;
  isHybrid: boolean;
  isMax: boolean;
}

export {
  getUpgradeCost,
  canUpgradeLevel as canUpgrade,
  getSellRefund,
  towersWithinMergeRange as towersCanMerge,
  maxLevelForTower,
  NORMAL_MAX_LEVEL as MAX_TOWER_LEVEL,
  MERGE_DISTANCE,
  SELL_REFUND_RATIO,
};

export function getEffectiveTowerStats(def: AnyTowerDef, level: number): EffectiveTowerStats {
  const ld = getLevelDef(def.id, level);
  const visualKind = getVisualKind(def);
  const baseShape = isHybridDef(def) ? def.shape : def.shape;

  return {
    damage: Math.round(def.damage * ld.damageMul),
    range: def.range * ld.rangeMul,
    cooldown: def.cooldown * ld.cooldownMul,
    projectileSpeed: def.projectileSpeed * ld.projectileSpeedMul,
    splashRadius: def.splashRadius ? def.splashRadius * ld.splashMul : undefined,
    slow: def.slow
      ? { factor: def.slow.factor, duration: def.slow.duration * ld.slowDurationMul }
      : undefined,
    dot: def.dot
      ? { dps: Math.round(def.dot.dps * ld.dotDpsMul), duration: def.dot.duration * ld.dotDurationMul }
      : undefined,
    color: def.color,
    projectileColor: def.projectileColor,
    fromY: (baseShape === 'oak' ? 2.4 : 1.6) + (level - 1) * 0.12,
    level: ld.level,
    maxLevel: maxLevelForTower(def.id),
    levelLabel: ld.label,
    scaleMul: ld.scaleMul,
    emissiveMul: ld.emissiveMul,
    visualKind,
    isHybrid: isHybridDef(def),
    isMax: level >= maxLevelForTower(def.id),
  };
}

export function statsForPlaced(towerId: string, level: number): EffectiveTowerStats | null {
  const def = getTowerDef(towerId);
  if (!def) return null;
  return getEffectiveTowerStats(def, level);
}

export function towerScaleForLevel(towerId: string, level: number): number {
  return getLevelDef(towerId, level).scaleMul;
}
