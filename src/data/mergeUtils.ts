/**
 * Merge candidate helpers.
 */

import type { PlacedTower } from '../game/store';
import { getMergeRecipe, MERGE_MIN_LEVEL } from './hybridTowers';
import { getTowerDef } from './towerRegistry';
import { getHybridTower } from './hybridTowers';
import { towersWithinMergeRange } from './towerUpgradeConfig';

export function isNormalTower(t: PlacedTower): boolean {
  return !getHybridTower(t.towerId);
}

export function canTowerMerge(t: PlacedTower): boolean {
  return isNormalTower(t) && t.level >= MERGE_MIN_LEVEL;
}

export function getMergeCandidates(primary: PlacedTower, all: PlacedTower[]): PlacedTower[] {
  if (!canTowerMerge(primary)) return [];
  return all.filter((other) => {
    if (other.id === primary.id || !canTowerMerge(other)) return false;
    if (!getMergeRecipe(primary.towerId, other.towerId)) return false;
    return towersWithinMergeRange(
      primary.position[0],
      primary.position[2],
      other.position[0],
      other.position[2],
    );
  });
}

export function mergeCostFor(primary: PlacedTower, partner: PlacedTower): number | null {
  const recipe = getMergeRecipe(primary.towerId, partner.towerId);
  if (!recipe) return null;
  const defA = getTowerDef(primary.towerId);
  const defB = getTowerDef(partner.towerId);
  if (!defA || !defB) return null;
  return recipe.mergeCost + Math.round((defA.cost + defB.cost) * 0.08);
}

export function hybridIdForMerge(towerA: string, towerB: string): string | null {
  return getMergeRecipe(towerA, towerB)?.hybridId ?? null;
}
