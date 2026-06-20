/**
 * Procedural scenery generation per map. All props default to non-blocking;
 * only large tree trunks (map 1) or ruin pillar bases (map 2) opt into
 * `placementBlocker`.
 */

import type { CatmullRomCurve3 } from 'three';
import type { GameMapConfig, VisualTheme } from '../data/maps';
import { isPointOnPath, type Footprint, FIELD, PATH_PADDING } from './placementGeometry';
import { mulberry32 } from './path';

export type PropKind =
  | 'tree'
  | 'stone'
  | 'log'
  | 'crystal'
  | 'mushroom'
  | 'flower'
  | 'roots'
  | 'rune'
  | 'ruin'
  | 'arch';

export interface WorldProp {
  id: string;
  kind: PropKind;
  position: [number, number, number];
  scale: number;
  rotation: number;
  variant: number;
  placementBlocker: boolean;
  footprintRadius: number;
}

export function getFootprintCircle(prop: WorldProp): Footprint {
  return { x: prop.position[0], z: prop.position[2], r: prop.footprintRadius };
}

interface PropSpec {
  kind: PropKind;
  count: number;
  visualBase: number;
  footprintBase: number;
  scaleMin: number;
  scaleMax: number;
  variants: number;
  edgeBias?: boolean;
  blocks?: boolean;
}

const SPACING = 0.7;

function inField(x: number, z: number, pad: number): boolean {
  return Math.abs(x) + pad <= FIELD.halfX && Math.abs(z) + pad <= FIELD.halfZ;
}

function forestSpecs(): PropSpec[] {
  return [
    { kind: 'tree', count: 5, visualBase: 1.2, footprintBase: 0.17, scaleMin: 1.1, scaleMax: 1.9, variants: 3, edgeBias: true, blocks: true },
    { kind: 'stone', count: 8, visualBase: 0.62, footprintBase: 0, scaleMin: 0.7, scaleMax: 1.4, variants: 2, edgeBias: true },
    { kind: 'log', count: 4, visualBase: 1.1, footprintBase: 0, scaleMin: 0.85, scaleMax: 1.2, variants: 2, edgeBias: true },
    { kind: 'crystal', count: 8, visualBase: 0.7, footprintBase: 0, scaleMin: 0.7, scaleMax: 1.25, variants: 3 },
    { kind: 'mushroom', count: 12, visualBase: 0.5, footprintBase: 0, scaleMin: 0.9, scaleMax: 1.5, variants: 2 },
  ];
}

function getSpecsForTheme(theme: VisualTheme): PropSpec[] {
  switch (theme) {
    case 'ruins':
      return [
        { kind: 'tree', count: 2, visualBase: 1.0, footprintBase: 0.15, scaleMin: 1.0, scaleMax: 1.5, variants: 3, edgeBias: true, blocks: true },
        { kind: 'arch', count: 4, visualBase: 1.4, footprintBase: 0.2, scaleMin: 0.9, scaleMax: 1.35, variants: 2, edgeBias: true, blocks: true },
        { kind: 'ruin', count: 8, visualBase: 0.8, footprintBase: 0, scaleMin: 0.8, scaleMax: 1.4, variants: 3, edgeBias: true },
        { kind: 'crystal', count: 16, visualBase: 0.75, footprintBase: 0, scaleMin: 0.8, scaleMax: 1.5, variants: 3 },
        { kind: 'stone', count: 5, visualBase: 0.55, footprintBase: 0, scaleMin: 0.6, scaleMax: 1.2, variants: 2 },
      ];
    case 'marsh':
      return [
        { kind: 'tree', count: 3, visualBase: 1.0, footprintBase: 0.16, scaleMin: 0.9, scaleMax: 1.4, variants: 3, edgeBias: true, blocks: true },
        { kind: 'mushroom', count: 14, visualBase: 0.55, footprintBase: 0, scaleMin: 0.9, scaleMax: 1.5, variants: 2 },
        { kind: 'crystal', count: 10, visualBase: 0.6, footprintBase: 0, scaleMin: 0.7, scaleMax: 1.2, variants: 3 },
        { kind: 'flower', count: 8, visualBase: 0.4, footprintBase: 0, scaleMin: 0.8, scaleMax: 1.3, variants: 2 },
        { kind: 'stone', count: 6, visualBase: 0.5, footprintBase: 0, scaleMin: 0.6, scaleMax: 1.1, variants: 2 },
      ];
    case 'ember':
      return [
        { kind: 'tree', count: 3, visualBase: 1.1, footprintBase: 0.17, scaleMin: 1.0, scaleMax: 1.6, variants: 3, edgeBias: true, blocks: true },
        { kind: 'log', count: 6, visualBase: 1.0, footprintBase: 0, scaleMin: 0.85, scaleMax: 1.3, variants: 2, edgeBias: true },
        { kind: 'crystal', count: 8, visualBase: 0.7, footprintBase: 0, scaleMin: 0.8, scaleMax: 1.3, variants: 3 },
        { kind: 'stone', count: 10, visualBase: 0.55, footprintBase: 0, scaleMin: 0.6, scaleMax: 1.2, variants: 2 },
        { kind: 'roots', count: 4, visualBase: 0.9, footprintBase: 0, scaleMin: 0.9, scaleMax: 1.2, variants: 1 },
      ];
    case 'crystal':
      return [
        { kind: 'tree', count: 2, visualBase: 1.0, footprintBase: 0.15, scaleMin: 0.9, scaleMax: 1.4, variants: 3, edgeBias: true, blocks: true },
        { kind: 'crystal', count: 20, visualBase: 0.8, footprintBase: 0, scaleMin: 0.9, scaleMax: 1.6, variants: 3 },
        { kind: 'stone', count: 6, visualBase: 0.6, footprintBase: 0, scaleMin: 0.7, scaleMax: 1.3, variants: 2 },
        { kind: 'mushroom', count: 6, visualBase: 0.45, footprintBase: 0, scaleMin: 0.8, scaleMax: 1.2, variants: 2 },
      ];
    case 'haunted':
      return [
        { kind: 'tree', count: 4, visualBase: 1.2, footprintBase: 0.17, scaleMin: 1.0, scaleMax: 1.7, variants: 3, edgeBias: true, blocks: true },
        { kind: 'ruin', count: 5, visualBase: 0.75, footprintBase: 0, scaleMin: 0.8, scaleMax: 1.3, variants: 3, edgeBias: true },
        { kind: 'mushroom', count: 8, visualBase: 0.5, footprintBase: 0, scaleMin: 0.8, scaleMax: 1.3, variants: 2 },
        { kind: 'stone', count: 7, visualBase: 0.55, footprintBase: 0, scaleMin: 0.6, scaleMax: 1.1, variants: 2 },
      ];
    case 'frost':
      return [
        { kind: 'tree', count: 4, visualBase: 1.1, footprintBase: 0.16, scaleMin: 1.0, scaleMax: 1.5, variants: 3, edgeBias: true, blocks: true },
        { kind: 'crystal', count: 14, visualBase: 0.7, footprintBase: 0, scaleMin: 0.8, scaleMax: 1.4, variants: 3 },
        { kind: 'stone', count: 8, visualBase: 0.6, footprintBase: 0, scaleMin: 0.7, scaleMax: 1.2, variants: 2 },
        { kind: 'mushroom', count: 5, visualBase: 0.45, footprintBase: 0, scaleMin: 0.8, scaleMax: 1.2, variants: 2 },
      ];
    case 'skygrove':
      return [
        { kind: 'tree', count: 3, visualBase: 1.0, footprintBase: 0.15, scaleMin: 0.9, scaleMax: 1.4, variants: 3, edgeBias: true, blocks: true },
        { kind: 'crystal', count: 10, visualBase: 0.65, footprintBase: 0, scaleMin: 0.7, scaleMax: 1.2, variants: 3 },
        { kind: 'flower', count: 12, visualBase: 0.45, footprintBase: 0, scaleMin: 0.8, scaleMax: 1.3, variants: 2 },
        { kind: 'mushroom', count: 8, visualBase: 0.5, footprintBase: 0, scaleMin: 0.8, scaleMax: 1.2, variants: 2 },
      ];
    case 'shadowthorn':
      return [
        { kind: 'tree', count: 3, visualBase: 1.1, footprintBase: 0.16, scaleMin: 1.0, scaleMax: 1.5, variants: 3, edgeBias: true, blocks: true },
        { kind: 'arch', count: 2, visualBase: 1.2, footprintBase: 0.18, scaleMin: 0.9, scaleMax: 1.2, variants: 2, blocks: true },
        { kind: 'ruin', count: 6, visualBase: 0.7, footprintBase: 0, scaleMin: 0.8, scaleMax: 1.3, variants: 3 },
        { kind: 'stone', count: 8, visualBase: 0.55, footprintBase: 0, scaleMin: 0.6, scaleMax: 1.1, variants: 2 },
        { kind: 'mushroom', count: 6, visualBase: 0.45, footprintBase: 0, scaleMin: 0.8, scaleMax: 1.2, variants: 2 },
      ];
    case 'ancient-heart':
      return [
        { kind: 'tree', count: 2, visualBase: 1.3, footprintBase: 0.18, scaleMin: 1.1, scaleMax: 1.8, variants: 3, edgeBias: true, blocks: true },
        { kind: 'crystal', count: 14, visualBase: 0.85, footprintBase: 0, scaleMin: 1.0, scaleMax: 1.7, variants: 3 },
        { kind: 'ruin', count: 4, visualBase: 0.9, footprintBase: 0, scaleMin: 0.9, scaleMax: 1.4, variants: 3 },
        { kind: 'rune', count: 6, visualBase: 0.7, footprintBase: 0, scaleMin: 0.8, scaleMax: 1.2, variants: 3 },
        { kind: 'flower', count: 10, visualBase: 0.5, footprintBase: 0, scaleMin: 0.9, scaleMax: 1.4, variants: 2 },
      ];
    case 'forest':
    default:
      return forestSpecs();
  }
}

function bgTreeCountForTheme(theme: VisualTheme): { bg: number; side: number } {
  if (theme === 'ruins' || theme === 'ancient-heart') return { bg: 8, side: 4 };
  if (theme === 'marsh' || theme === 'skygrove') return { bg: 12, side: 6 };
  return { bg: 24, side: 10 };
}

function pathZonesFromCurve(pathCurve: CatmullRomCurve3): Footprint[] {
  return pathCurve.getSpacedPoints(64).map((p) => ({ x: p.x, z: p.z, r: PATH_PADDING }));
}

export function generateWorldForMap(
  mapDef: GameMapConfig,
  pathCurve: CatmullRomCurve3,
): { worldProps: WorldProp[]; placementBlockers: Footprint[] } {
  const rng = mulberry32(mapDef.decorationSeed);
  const specs = getSpecsForTheme(mapDef.visualTheme);
  const pathZones = pathZonesFromCurve(pathCurve);
  const props: WorldProp[] = [];
  const placedVisual: { x: number; z: number; r: number }[] = [];
  let id = 0;

  const fits = (x: number, z: number, visualR: number, pathClear: number): boolean => {
    if (!inField(x, z, 0.2)) return false;
    if (isPointOnPath(x, z, pathClear, pathZones)) return false;
    for (const c of placedVisual) {
      const dx = c.x - x;
      const dz = c.z - z;
      const gap = c.r + visualR + SPACING;
      if (dx * dx + dz * dz < gap * gap) return false;
    }
    return true;
  };

  for (const spec of specs) {
    let made = 0;
    let attempts = 0;
    while (made < spec.count && attempts < spec.count * 140) {
      attempts++;
      const x = (rng() * 2 - 1) * (FIELD.halfX - 0.5);
      const z = spec.edgeBias
        ? (rng() < 0.5 ? -1 : 1) * (FIELD.halfZ - 0.5) * (0.45 + 0.55 * rng())
        : (rng() * 2 - 1) * (FIELD.halfZ - 0.5);
      const scale = spec.scaleMin + rng() * (spec.scaleMax - spec.scaleMin);
      const visualR = spec.visualBase * scale;
      const pathClear = spec.blocks && spec.kind === 'tree' ? visualR * 0.55 : 0.5;
      if (!fits(x, z, visualR, pathClear)) continue;

      placedVisual.push({ x, z, r: visualR });
      const blocks = spec.blocks === true;
      props.push({
        id: `${spec.kind}-${id++}`,
        kind: spec.kind,
        position: [x, 0, z],
        scale,
        rotation: rng() * Math.PI * 2,
        variant: Math.floor(rng() * spec.variants),
        placementBlocker: blocks,
        footprintRadius: blocks ? spec.footprintBase * scale : 0,
      });
      made++;
    }
  }

  // Background trees — sparse on ruins map
  const pushBgTree = (x: number, z: number) => {
    props.push({
      id: `bgtree-${id++}`,
      kind: 'tree',
      position: [x, 0, z],
      scale: 1.7 + rng() * 1.3,
      rotation: rng() * Math.PI * 2,
      variant: Math.floor(rng() * 3),
      placementBlocker: false,
      footprintRadius: 0,
    });
  };
  const { bg: bgTreeCount, side: sideTreeCount } = bgTreeCountForTheme(mapDef.visualTheme);
  for (let i = 0; i < bgTreeCount; i++) {
    pushBgTree((rng() * 2 - 1) * 27, -FIELD.halfZ - 1.5 - rng() * 8);
  }
  for (let i = 0; i < sideTreeCount; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    pushBgTree(side * (FIELD.halfX + 1.5 + rng() * 5), (rng() * 2 - 1) * (FIELD.halfZ + 2));
  }

  // Decorative crystals
  let gems = 0;
  let gemAttempts = 0;
  while (gems < 14 && gemAttempts < 600) {
    gemAttempts++;
    const distant = rng() < 0.45;
    let x: number;
    let z: number;
    if (distant) {
      x = (rng() * 2 - 1) * 24;
      z = -FIELD.halfZ - 1 - rng() * 7;
    } else {
      x = (rng() * 2 - 1) * (FIELD.halfX - 0.4);
      z = (rng() < 0.5 ? -1 : 1) * (FIELD.halfZ - 0.4) * (0.55 + 0.45 * rng());
      if (isPointOnPath(x, z, 0.8, pathZones)) continue;
    }
    props.push({
      id: `gem-${id++}`,
      kind: 'crystal',
      position: [x, 0, z],
      scale: (distant ? 0.7 : 0.45) + rng() * 0.6,
      rotation: rng() * Math.PI * 2,
      variant: Math.floor(rng() * 3),
      placementBlocker: false,
      footprintRadius: 0,
    });
    gems++;
  }

  // Roots at large trees
  for (const tree of props.filter((p) => p.kind === 'tree' && p.placementBlocker && p.scale > 1.2)) {
    props.push({
      id: `roots-${id++}`,
      kind: 'roots',
      position: [tree.position[0], 0, tree.position[2]],
      scale: tree.scale,
      rotation: rng() * Math.PI * 2,
      variant: 0,
      placementBlocker: false,
      footprintRadius: 0,
    });
  }

  // Flowers
  let flowers = 0;
  let attempts = 0;
  while (flowers < 96 && attempts < 96 * 20) {
    attempts++;
    const x = (rng() * 2 - 1) * (FIELD.halfX - 0.3);
    const z = (rng() * 2 - 1) * (FIELD.halfZ - 0.3);
    if (isPointOnPath(x, z, 0.4, pathZones)) continue;
    props.push({
      id: `flower-${id++}`,
      kind: 'flower',
      position: [x, 0, z],
      scale: 0.7 + rng() * 0.8,
      rotation: rng() * Math.PI * 2,
      variant: Math.floor(rng() * 3),
      placementBlocker: false,
      footprintRadius: 0,
    });
    flowers++;
  }

  // Runes beside path
  const STEPS = 9;
  for (let i = 1; i < STEPS; i++) {
    const t = i / STEPS;
    const p = pathCurve.getPointAt(t);
    const tan = pathCurve.getTangentAt(t);
    const nx = -tan.z;
    const nz = tan.x;
    const nlen = Math.hypot(nx, nz) || 1;
    const side = i % 2 === 0 ? 1 : -1;
    const off = 2.1;
    const x = p.x + (nx / nlen) * off * side;
    const z = p.z + (nz / nlen) * off * side;
    if (!inField(x, z, 0.6)) continue;
    props.push({
      id: `rune-${id++}`,
      kind: 'rune',
      position: [x, 0, z],
      scale: 0.8 + rng() * 0.5,
      rotation: Math.atan2(tan.x, tan.z),
      variant: i % 3,
      placementBlocker: false,
      footprintRadius: 0,
    });
  }

  // Map-specific scenery anchors from config (e.g. central ruin arch)
  for (const anchor of mapDef.mapAnchors ?? []) {
    if (anchor.kind === 'arch') {
      props.push({
        id: `arch-${anchor.position.join('-')}`,
        kind: 'arch',
        position: anchor.position,
        scale: anchor.scale,
        rotation: anchor.rotation,
        variant: 0,
        placementBlocker: anchor.placementBlocker ?? false,
        footprintRadius: anchor.footprintRadius ?? 0,
      });
    }
  }

  const placementBlockers = props.filter((p) => p.placementBlocker).map(getFootprintCircle);
  return { worldProps: props, placementBlockers };
}
