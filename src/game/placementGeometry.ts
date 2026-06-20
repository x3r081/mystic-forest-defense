/**
 * Pure placement geometry — no imports from world/store to avoid circular deps.
 */

export interface Vec2 {
  x: number;
  z: number;
}

export interface Circle extends Vec2 {
  r: number;
}

export type Footprint = Circle;

export const FIELD = { halfX: 16.5, halfZ: 8.5 } as const;
export const TOWER_FOOTPRINT_SCALE = 0.6;
export const PATH_PADDING = 1.15;

export function circleIntersectsCircle(a: Circle, b: Circle): boolean {
  if (a.r <= 0 || b.r <= 0) return false;
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  const reach = a.r + b.r;
  return dx * dx + dz * dz < reach * reach;
}

export function doesFootprintOverlap(a: Footprint, b: Footprint): boolean {
  return circleIntersectsCircle(a, b);
}

export function isPointOnPath(x: number, z: number, radius: number, pathZones: Footprint[]): boolean {
  if (!pathZones.length) return false;
  const c: Footprint = { x, z, r: radius };
  for (const zone of pathZones) {
    if (zone.r <= 0) continue;
    if (doesFootprintOverlap(c, zone)) return true;
  }
  return false;
}
