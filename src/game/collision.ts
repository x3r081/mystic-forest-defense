/**
 * Tower placement validation — geometry checks and game-state gates.
 */

import { getTower } from '../data/gameConfig';
import { getTowerDef } from '../data/towerRegistry';
import type { PlacedTower } from './store';
import type { GameScreen } from './store';
import type { MapId } from '../data/maps';
import { MAPS } from '../data/maps';
import { getPathZones, getPlacementBlockers } from './world';
import {
  type Footprint,
  TOWER_FOOTPRINT_SCALE,
  doesFootprintOverlap,
  isPointOnPath,
} from './placementGeometry';

export type { Vec2, Circle, Footprint } from './placementGeometry';
export {
  FIELD,
  TOWER_FOOTPRINT_SCALE,
  PATH_PADDING,
  circleIntersectsCircle,
  doesFootprintOverlap,
  isPointOnPath,
} from './placementGeometry';

export type PlacementFailReason =
  | 'blocked by path'
  | 'blocked by tower'
  | 'blocked by major blocker'
  | 'not enough coins'
  | 'invalid game state'
  | 'no tower selected';

export function towerFootprint(x: number, z: number, towerType: string): Footprint {
  const base = getTowerDef(towerType)?.towerRadius ?? getTower(towerType)?.towerRadius ?? 0.6;
  return { x, z, r: base * TOWER_FOOTPRINT_SCALE };
}

export function resolveMapId(mapId: MapId | undefined | null): MapId {
  if (mapId && MAPS.some((m) => m.id === mapId)) return mapId;
  if (import.meta.env?.DEV) {
    console.warn('[placement] active map missing — falling back to map 1');
  }
  return MAPS[0].id;
}

export function getPlacementGeometry(mapId: MapId | undefined | null): {
  mapId: MapId;
  pathZones: Footprint[];
  blockers: Footprint[];
} {
  const resolved = resolveMapId(mapId);
  return {
    mapId: resolved,
    pathZones: getPathZones(resolved),
    blockers: getPlacementBlockers(resolved).filter((b) => b.r > 0),
  };
}

export interface PlacementContext {
  screen: GameScreen;
  selectedTower: string | null;
  mapId: MapId;
  coins: number;
  placedTowers: PlacedTower[];
}

export function getGeometryBlockReason(
  x: number,
  z: number,
  towerType: string,
  towers: PlacedTower[],
  pathZones: Footprint[],
  blockers: Footprint[],
  coins?: number,
  cost?: number,
): PlacementFailReason | null {
  if (coins !== undefined && cost !== undefined && coins < cost) {
    return 'not enough coins';
  }

  const foot = towerFootprint(x, z, towerType);

  if (pathZones.length > 0 && isPointOnPath(x, z, foot.r, pathZones)) {
    return 'blocked by path';
  }

  for (const t of towers) {
    if (doesFootprintOverlap(foot, towerFootprint(t.position[0], t.position[2], t.towerId))) {
      return 'blocked by tower';
    }
  }

  for (const blocker of blockers) {
    if (doesFootprintOverlap(foot, blocker)) return 'blocked by major blocker';
  }

  return null;
}

export function evaluatePlacement(
  x: number,
  z: number,
  ctx: PlacementContext,
): { ok: true } | { ok: false; reason: PlacementFailReason } {
  if (ctx.screen !== 'playing') {
    return { ok: false, reason: 'invalid game state' };
  }
  if (!ctx.selectedTower) {
    return { ok: false, reason: 'no tower selected' };
  }

  const def = getTower(ctx.selectedTower);
  if (!def) {
    return { ok: false, reason: 'no tower selected' };
  }

  const { pathZones, blockers } = getPlacementGeometry(ctx.mapId);
  const reason = getGeometryBlockReason(
    x,
    z,
    def.id,
    ctx.placedTowers,
    pathZones,
    blockers,
    ctx.coins,
    def.cost,
  );

  if (reason) return { ok: false, reason };
  return { ok: true };
}

/** @deprecated */
export function getPlacementBlockReason(
  x: number,
  z: number,
  towerType: string,
  towers: PlacedTower[],
  pathZones: Footprint[],
  blockers: Footprint[],
  coins?: number,
  cost?: number,
): PlacementFailReason | null {
  return getGeometryBlockReason(x, z, towerType, towers, pathZones, blockers, coins, cost);
}

export function isTowerPlacementValid(
  x: number,
  z: number,
  towerType: string,
  towers: PlacedTower[],
  pathZones: Footprint[],
  blockers: Footprint[],
): boolean {
  return getGeometryBlockReason(x, z, towerType, towers, pathZones, blockers) === null;
}

export function logPlacementFailure(reason: PlacementFailReason): void {
  console.info(`[placement] ${reason}`);
}
