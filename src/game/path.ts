import * as THREE from 'three';

/** Cheap seeded RNG so decoration layout is stable between renders. */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Decoration {
  position: [number, number, number];
  scale: number;
  rotation: number;
  variant: number;
}

/** Scatter grass tufts away from the given path curve. */
export function scatterDecorations(
  count: number,
  seed: number,
  pathCurve: THREE.CatmullRomCurve3,
  opts: { area?: number; depth?: number; minPathDist?: number; variants?: number } = {},
): Decoration[] {
  const { area = 18, depth = 7, minPathDist = 1.8, variants = 3 } = opts;
  const rng = mulberry32(seed);
  const samples = pathCurve.getSpacedPoints(60);
  const decorations: Decoration[] = [];

  let attempts = 0;
  while (decorations.length < count && attempts < count * 30) {
    attempts++;
    const x = (rng() * 2 - 1) * area;
    const z = (rng() * 2 - 1) * (depth + Math.abs(x) * 0.15);

    let tooClose = false;
    for (const p of samples) {
      const dx = p.x - x;
      const dz = p.z - z;
      if (dx * dx + dz * dz < minPathDist * minPathDist) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    decorations.push({
      position: [x, 0, z],
      scale: 0.6 + rng() * 0.9,
      rotation: rng() * Math.PI * 2,
      variant: Math.floor(rng() * variants),
    });
  }

  return decorations;
}
