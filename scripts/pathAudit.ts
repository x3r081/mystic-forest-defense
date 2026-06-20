/**
 * Path + map audit for scalable multi-map campaign.
 */
import * as THREE from 'three';
import {
  MAPS,
  getMapForLevel,
  isMapTransition,
  LEVELS_PER_MAP,
} from '../src/data/maps';
import { getFinalBossName } from '../src/data/campaignConfig';
import { generateLevelConfig } from '../src/data/levelGenerator';
import { TOTAL_LEVELS as TL } from '../src/data/levels';
import {
  worlds,
  setActiveMap,
  syncActiveMapForLevel,
  pointOnMapPath,
} from '../src/game/world';

let failures = 0;
const check = (name: string, cond: boolean, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? `  — ${extra}` : ''}`);
  if (!cond) failures++;
};

const expectedLevels = MAPS[MAPS.length - 1].levelEnd;
check('total levels match last map', TL === expectedLevels);
check('map count matches config', MAPS.length >= 2);
check('levels per map derived', LEVELS_PER_MAP === MAPS[0].levelEnd - MAPS[0].levelStart + 1);

for (const map of MAPS) {
  check(`level ${map.levelEnd} is boss (${map.name})`, !!generateLevelConfig(map.levelEnd).boss);
  check(`level ${map.levelEnd} uses map ${map.id}`, getMapForLevel(map.levelEnd).id === map.id);
}

check('level 1 is not boss', !generateLevelConfig(1).boss);
check(`level ${TL} is final boss`, generateLevelConfig(TL).boss?.name === getFinalBossName());

for (const map of MAPS.slice(0, -1)) {
  check(`level ${map.levelEnd} triggers transition`, isMapTransition(map.levelEnd));
}
check(`level ${TL - 1} no transition`, !isMapTransition(TL - 1));

const m1 = worlds[MAPS[0].id].spawnPoint;
const mLast = worlds[MAPS[MAPS.length - 1].id].spawnPoint;
check('first and last map spawns differ', m1.distanceTo(mLast) > 2);

const midMap = MAPS[Math.floor(MAPS.length / 2)];
syncActiveMapForLevel(midMap.levelStart + 4);
check(`level ${midMap.levelStart + 4} syncs ${midMap.id}`, getMapForLevel(midMap.levelStart + 4).id === midMap.id);

let pathMismatch = 0;
for (let t = 0.1; t <= 0.9; t += 0.1) {
  const a = pointOnMapPath(MAPS[0].id, t, new THREE.Vector3());
  const b = pointOnMapPath(MAPS[MAPS.length - 1].id, t, new THREE.Vector3());
  if (a.distanceTo(b) > 1.5) pathMismatch++;
}
check('first vs last map paths diverge', pathMismatch >= 6, `${pathMismatch}/9`);

setActiveMap(MAPS[0].id);
console.log(`\n${failures === 0 ? 'ALL PATH AUDITS PASSED' : `${failures} AUDIT(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
