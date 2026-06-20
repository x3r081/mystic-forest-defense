/**
 * Runtime map registry. Each map owns its path curve, scenery, and placement
 * blockers. All path systems read from the active map's built world data.
 */

import * as THREE from 'three';
import { MAPS, getMap, getMapForLevel, type MapId } from '../data/maps';
import { PATH_PADDING, type Footprint } from './placementGeometry';
import { generateWorldForMap, type WorldProp } from './worldGen';

export interface MapWorld {
  mapId: MapId;
  config: ReturnType<typeof getMap>;
  pathCurve: THREE.CatmullRomCurve3;
  spawnPoint: THREE.Vector3;
  basePoint: THREE.Vector3;
  pathZones: Footprint[];
  worldProps: WorldProp[];
  placementBlockers: Footprint[];
  groundColor: string;
  grassColor: string;
  pathAuraColor: string;
  scatterSeed: number;
  pathWidth: number;
}

function buildPath(points: [number, number][]): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'catmullrom',
    0.5,
  );
}

function buildMapWorld(config: (typeof MAPS)[number]): MapWorld {
  const pathCurve = buildPath(config.pathPoints);
  const pathZones: Footprint[] = pathCurve
    .getSpacedPoints(64)
    .map((p) => ({ x: p.x, z: p.z, r: PATH_PADDING }));
  const { worldProps, placementBlockers } = generateWorldForMap(config, pathCurve);
  return {
    mapId: config.id,
    config,
    pathCurve,
    spawnPoint: pathCurve.getPointAt(0).clone(),
    basePoint: pathCurve.getPointAt(1).clone(),
    pathZones,
    worldProps,
    placementBlockers,
    groundColor: config.groundColor,
    grassColor: config.grassColor,
    pathAuraColor: config.pathAuraColor,
    scatterSeed: config.scatterSeed,
    pathWidth: config.pathWidth,
  };
}

const worlds: Record<MapId, MapWorld> = Object.fromEntries(
  MAPS.map((m) => [m.id, buildMapWorld(m)]),
) as Record<MapId, MapWorld>;

export { worlds };

export let activeMapId: MapId = MAPS[0].id;
export let mapRevision = 0;

export function getActiveWorld(): MapWorld {
  return worlds[activeMapId];
}

export function getWorldForMap(mapId: MapId): MapWorld {
  if (worlds[mapId]) return worlds[mapId];
  if (import.meta.env?.DEV) {
    console.warn('[placement] unknown mapId for world lookup — falling back to map 1');
  }
  return worlds[MAPS[0].id];
}

export function setActiveMap(mapId: MapId): void {
  if (activeMapId !== mapId) {
    activeMapId = mapId;
    mapRevision++;
  }
}

/** Ensure module-level active map matches the level's config. */
export function syncActiveMapForLevel(level: number): MapId {
  const config = getMapForLevel(level);
  setActiveMap(config.id);
  return config.id;
}

/** @deprecated Use syncActiveMapForLevel */
export function syncActiveMapForWave(wave: number): MapId {
  return syncActiveMapForLevel(wave);
}

/** @deprecated Use syncActiveMapForLevel */
export function syncActiveMapForRound(round: number): MapId {
  return syncActiveMapForLevel(round);
}

export function getSpawnPoint(mapId: MapId = activeMapId): THREE.Vector3 {
  return worlds[mapId].spawnPoint;
}

export function getBasePoint(mapId: MapId = activeMapId): THREE.Vector3 {
  return worlds[mapId].basePoint;
}

export function getPathZones(mapId: MapId = activeMapId): Footprint[] {
  return getWorldForMap(mapId).pathZones;
}

export function getWorldProps(mapId: MapId = activeMapId): WorldProp[] {
  return worlds[mapId].worldProps;
}

export function getPlacementBlockers(mapId: MapId = activeMapId): Footprint[] {
  return getWorldForMap(mapId).placementBlockers.filter((b) => b.r > 0);
}

export function getPathCurve(mapId: MapId = activeMapId): THREE.CatmullRomCurve3 {
  return worlds[mapId].pathCurve;
}

export function getPathCurveForMap(mapId: MapId): THREE.CatmullRomCurve3 {
  return worlds[mapId].pathCurve;
}

/** Sample a position along a specific map's path (used by enemy movement). */
export function pointOnMapPath(
  mapId: MapId,
  t: number,
  target = new THREE.Vector3(),
): THREE.Vector3 {
  const clamped = THREE.MathUtils.clamp(t, 0, 1);
  return target.copy(worlds[mapId].pathCurve.getPointAt(clamped));
}

/** Sample along the currently active map path. */
export function pointOnPath(t: number, target = new THREE.Vector3()): THREE.Vector3 {
  return pointOnMapPath(activeMapId, t, target);
}

if (import.meta.env?.DEV) {
  (window as unknown as { __world?: unknown }).__world = {
    worlds,
    getActiveWorld,
    getWorldForMap,
    setActiveMap,
    syncActiveMapForWave,
    activeMapId,
    mapRevision,
  };
}
