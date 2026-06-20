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
import { generateLevelConfig } from '../src/data/levelGenerator';
import { TOTAL_LEVELS } from '../src/data/levels';
import {
  LEVELS_PER_MAP,
  MAP_COUNT,
  getMapForLevel,
  isMapTransition,
} from '../src/data/maps';
import type { PlacedTower } from '../src/game/store';

let failures = 0;
const check = (name: string, cond: boolean, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? `  — ${extra}` : ''}`);
  if (!cond) failures++;
};

const noTowers: PlacedTower[] = [];

for (const map of Object.values(worlds)) {
  const mapId = map.mapId;
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

check('500 total levels', TOTAL_LEVELS === 500);
check('50 levels per map', LEVELS_PER_MAP === 50);
check('10 maps', MAP_COUNT === 10);
check('level 10 has mini boss', !!generateLevelConfig(10).miniBoss);
check('level 50 has map boss only', !!generateLevelConfig(50).boss && !generateLevelConfig(50).miniBoss);
check('level 50 has boss', !!generateLevelConfig(50).boss);
check('level 500 has final boss', !!generateLevelConfig(500).boss);
check('level 250 generated', generateLevelConfig(250).enemyCount > 0);

for (const d of ['easy', 'medium', 'hard'] as const) {
  const diff = getDifficulty(d);
  const eff = getEffectiveLevel(25, diff);
  check(`${d} difficulty scales level 25 HP`, eff.enemyHealth !== generateLevelConfig(25).enemyHealth || d === 'medium');
}

check(
  'map switches at level 51',
  getMapForLevel(50).id === 'mystic-forest' && getMapForLevel(51).id === 'moonlit-ruins',
);
check('level 50 triggers map transition', isMapTransition(50));

setActiveMap('mystic-forest');
const pz = getPathZones()[10];
check('path blocks placement', getPlacementBlockReason(pz.x, pz.z, 'moon-archer', noTowers, getPathZones(), getPlacementBlockers()) === 'blocked by path');

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
