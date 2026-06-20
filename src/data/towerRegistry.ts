/**
 * Unified lookup for base + hybrid tower definitions.
 */

import { towers, type TowerDef } from './gameConfig';
import { hybridTowers, type HybridTowerDef, type TowerVisualKind } from './hybridTowers';

export type AnyTowerDef = TowerDef | HybridTowerDef;

const baseById = new Map(towers.map((t) => [t.id, t]));
const hybridById = new Map(hybridTowers.map((h) => [h.id, h]));

export const shopTowers = towers;

export function getTowerDef(id: string | null | undefined): AnyTowerDef | undefined {
  if (id == null) return undefined;
  return hybridById.get(id) ?? baseById.get(id);
}

export function isHybridDef(def: AnyTowerDef): def is HybridTowerDef {
  return 'isHybrid' in def && def.isHybrid === true;
}

export function getVisualKind(def: AnyTowerDef): TowerVisualKind {
  if (isHybridDef(def)) return def.visualKind;
  return def.shape;
}

/** @deprecated Use getTowerDef */
export function getTower(id: string | null | undefined): TowerDef | undefined {
  const def = getTowerDef(id);
  if (!def || isHybridDef(def)) return def as TowerDef | undefined;
  return def;
}
