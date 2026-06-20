/**
 * Headless placement + progression checks.
 */
import { setActiveMap, getPlacementBlockers, getPathZones } from '../src/game/world';
import { worlds } from '../src/game/world';
import {
  getPlacementBlockReason,
  isTowerPlacementValid,
  towerFootprint,
  isPointOnPath,
  FIELD,
} from '../src/game/collision';
import { getEffectiveLevel } from '../src/data/levelUtils';
import { getDifficulty } from '../src/data/difficulties';
import { TOTAL_LEVELS, getLevel } from '../src/data/levels';
import { getMapForLevel, isMapTransition, MAPS, MAP_COUNT } from '../src/data/maps';
import { generateLevelConfig } from '../src/data/levelGenerator';
import type { PlacedTower } from '../src/game/store';

let failures = 0;
const check = (name: string, cond: boolean, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? `  — ${extra}` : ''}`);
  if (!cond) failures++;
};

const noTowers: PlacedTower[] = [];

for (const map of MAPS) {
  const mapId = map.id;
  setActiveMap(mapId);
  const blockers = getPlacementBlockers();
  const pathZones = getPathZones();
  const props = worlds[mapId].worldProps;

  check(`${mapId}: placement mostly open`, (() => {
    let open = 0;
    let offPath = 0;
    for (let x = -FIELD.halfX + 0.8; x <= FIELD.halfX - 0.8; x += 0.75) {
      for (let z = -FIELD.halfZ + 0.8; z <= FIELD.halfZ - 0.8; z += 0.75) {
        if (isPointOnPath(x, z, towerFootprint(0, 0, 'moon-archer').r, pathZones)) continue;
        offPath++;
        if (isTowerPlacementValid(x, z, 'moon-archer', noTowers, pathZones, blockers)) open++;
      }
    }
    return offPath > 0 && open / offPath >= 0.7;
  })());

  const decor = props.filter((p) => ['flower', 'mushroom', 'crystal', 'ruin'].includes(p.kind));
  const buildable = decor.filter((p) =>
    isTowerPlacementValid(p.position[0], p.position[2], 'moon-archer', noTowers, pathZones, blockers),
  ).length;
  check(`${mapId}: decorative props mostly buildable`, buildable >= Math.ceil(decor.length * 0.6), `${buildable}/${decor.length}`);
}

check('100 total levels', TOTAL_LEVELS === 100);
check('10 maps', MAP_COUNT === 10);
check('level 10 has boss', !!getLevel(10).boss);
check('level 100 has final boss', !!getLevel(100).boss);
check('level 50 generated', generateLevelConfig(50).enemyCount > 0);

for (const d of ['easy', 'medium', 'hard'] as const) {
  const diff = getDifficulty(d);
  const eff = getEffectiveLevel(5, diff);
  check(`${d} difficulty scales level 5 HP`, eff.enemyHealth !== getLevel(5).enemyHealth || d === 'medium');
}

check('map switches at level 11', getMapForLevel(10).id === 'mystic-forest' && getMapForLevel(11).id === 'moonlit-ruins');
check('level 10 triggers map transition', isMapTransition(10));

setActiveMap('mystic-forest');
const pz = getPathZones()[10];
check('path blocks placement', getPlacementBlockReason(pz.x, pz.z, 'moon-archer', noTowers, getPathZones(), getPlacementBlockers()) === 'blocked by path');

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
