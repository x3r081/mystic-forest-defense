/**
 * Headless balance simulation.
 *
 * Mirrors the in-game combat loop (spawning, targeting, projectiles, splash,
 * slow, DoT, armor, leaks) using the REAL path geometry, build spots and data
 * files so we can tune numbers against faithful outcomes instead of guesswork.
 *
 * Run with:  npx tsx scripts/balanceSim.ts
 */
import * as THREE from 'three';
import { gameConfig, towers, enemyTypes, type EnemyKind, type TowerDef } from '../src/data/gameConfig';
import { getLevel, TOTAL_LEVELS } from '../src/data/levels';
import { getMapForLevel } from '../src/data/maps';
import { towerUpgradeConfig } from '../src/data/towerUpgradeConfig';

// Path geometry follows the active map for each simulated level.
function pathCurveForLevel(level: number): THREE.CatmullRomCurve3 {
  const points = getMapForLevel(level).pathPoints;
  return new THREE.CatmullRomCurve3(
    points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'catmullrom',
    0.5,
  );
}

const pathCurve = pathCurveForLevel(1);

interface BuildSpot {
  id: string;
  x: number;
  z: number;
}
function generateBuildSpots(): BuildSpot[] {
  const offsets = [towerUpgradeConfig.mergeDistance, towerUpgradeConfig.mergeDistance + 1.9];
  const minSpacing = 2.2;
  const minPathDist = 1.9;
  const samples = pathCurve.getSpacedPoints(80);
  const p = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const chosen: { x: number; z: number }[] = [];
  const STEPS = 28;
  for (let i = 0; i <= STEPS; i++) {
    const t = 0.03 + (i / STEPS) * 0.94;
    pathCurve.getPointAt(t, p);
    pathCurve.getTangentAt(t, tan);
    const nx = -tan.z;
    const nz = tan.x;
    const nlen = Math.hypot(nx, nz) || 1;
    for (const off of offsets) {
      for (const side of [1, -1]) {
        const x = p.x + (nx / nlen) * off * side;
        const z = p.z + (nz / nlen) * off * side;
        if (Math.abs(x) > 15 || Math.abs(z) > 8.5) continue;
        let nearPath = false;
        for (const s of samples) {
          if ((s.x - x) ** 2 + (s.z - z) ** 2 < minPathDist * minPathDist) {
            nearPath = true;
            break;
          }
        }
        if (nearPath) continue;
        if (chosen.some((c) => (c.x - x) ** 2 + (c.z - z) ** 2 < minSpacing * minSpacing)) continue;
        chosen.push({ x, z });
      }
    }
  }
  return chosen.map((c, i) => ({ id: `spot-${i}`, x: c.x, z: c.z }));
}
const BUILD_SPOTS = generateBuildSpots();

// Precompute uniform arc-length samples for coverage scoring.
const COV_SAMPLES = pathCurve.getSpacedPoints(240);
function coverageFraction(x: number, z: number, range: number): number {
  const r2 = range * range;
  let n = 0;
  for (const s of COV_SAMPLES) {
    if ((s.x - x) ** 2 + (s.z - z) ** 2 <= r2) n++;
  }
  return n / COV_SAMPLES.length;
}

// ----------------------------------------------------------------------------
// Seeded RNG (deterministic runs).
// ----------------------------------------------------------------------------
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ----------------------------------------------------------------------------
// Simulation types
// ----------------------------------------------------------------------------
interface SimEnemy {
  id: number;
  progress: number;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  baseSpeed: number;
  slowUntil: number;
  slowFactor: number;
  dots: { dps: number; until: number }[];
  armor: number;
  bounty: number;
  isBoss: boolean;
  radius: number;
  alive: boolean;
}
interface SimProjectile {
  x: number;
  z: number;
  targetId: number;
  damage: number;
  speed: number;
  splashRadius?: number;
  slow?: { factor: number; duration: number };
  dot?: { dps: number; duration: number };
  life: number;
  /** Last known target position, for area bursts after the target is gone. */
  lastX: number;
  lastZ: number;
}
interface PlacedTower {
  def: TowerDef;
  x: number;
  z: number;
  cd: number;
}

interface EnemySpec {
  kind: EnemyKind;
  maxHp: number;
  speed: number;
  bounty: number;
  armor: number;
  radius: number;
  isBoss: boolean;
}

function buildSpawnQueue(level: number): EnemySpec[] {
  const def = getLevel(level);
  const queue: EnemySpec[] = [];
  for (let i = 0; i < def.enemyCount; i++) {
    const kind = def.enemyKinds[i % def.enemyKinds.length];
    const t = enemyTypes[kind];
    queue.push({
      kind,
      maxHp: Math.round(def.enemyHealth * t.hpMul),
      speed: def.enemySpeed * t.speedMul,
      bounty: Math.max(1, Math.round(def.coinReward * t.bountyMul)),
      armor: t.armor,
      radius: t.radius,
      isBoss: false,
    });
  }
  if (def.boss) {
    const boss = def.boss;
    queue.splice(Math.floor(queue.length / 3), 0, {
      kind: 'corruptor',
      maxHp: boss.health,
      speed: boss.speed,
      bounty: boss.coinReward,
      armor: enemyTypes.corruptor.armor,
      radius: boss.radius,
      isBoss: true,
    });
  }
  return queue;
}

const DT = 1 / 30;

interface LevelResult {
  leaked: number;
  killed: number;
  coinsEarned: number;
  durationSec: number;
}

function simulateLevel(level: number, placed: PlacedTower[], rng: () => number): LevelResult {
  const queue = buildSpawnQueue(level);
  const def = getLevel(level);
  const spawnRate = def.spawnRate;
  const curve = pathCurveForLevel(level);

  const enemies: SimEnemy[] = [];
  const projectiles: SimProjectile[] = [];
  let spawnIndex = 0;
  let spawnTimer = spawnRate;
  let nextId = 1;
  let elapsed = 0;
  let leaked = 0;
  let killed = 0;
  let coinsEarned = 0;

  for (const t of placed) t.cd = rng() * t.def.cooldown;

  const tmp = new THREE.Vector3();
  const setPos = (e: SimEnemy) => {
    curve.getPointAt(Math.min(e.progress, 1), tmp);
    e.x = tmp.x;
    e.z = tmp.z;
  };

  const findTarget = (x: number, z: number, range: number): SimEnemy | null => {
    let best: SimEnemy | null = null;
    let bestProgress = -1;
    const r2 = range * range;
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.x - x;
      const dz = e.z - z;
      if (dx * dx + dz * dz <= r2 && e.progress > bestProgress) {
        best = e;
        bestProgress = e.progress;
      }
    }
    return best;
  };

  const applyHit = (proj: SimProjectile, impactX: number, impactZ: number) => {
    const target = enemies.find((e) => e.id === proj.targetId);
    if (target && target.alive) {
      target.hp -= proj.damage * (1 - target.armor);
      if (proj.slow) {
        target.slowUntil = elapsed + proj.slow.duration;
        target.slowFactor = proj.slow.factor;
      }
      if (proj.dot) target.dots.push({ dps: proj.dot.dps, until: elapsed + proj.dot.duration });
    }
    if (proj.splashRadius) {
      const r2 = proj.splashRadius * proj.splashRadius;
      for (const e of enemies) {
        if (!e.alive || e.id === proj.targetId) continue;
        const dx = e.x - impactX;
        const dz = e.z - impactZ;
        if (dx * dx + dz * dz <= r2) e.hp -= proj.damage * 0.6 * (1 - e.armor);
      }
    }
  };

  let guard = 0;
  while (guard++ < 100000) {
    // Spawn
    if (spawnIndex < queue.length) {
      spawnTimer += DT;
      if (spawnTimer >= spawnRate) {
        spawnTimer = 0;
        const spec = queue[spawnIndex++];
        const e: SimEnemy = {
          id: nextId++,
          progress: 0,
          x: 0,
          z: 0,
          hp: spec.maxHp,
          maxHp: spec.maxHp,
          baseSpeed: spec.speed,
          slowUntil: 0,
          slowFactor: 1,
          dots: [],
          armor: spec.armor,
          bounty: spec.bounty,
          isBoss: spec.isBoss,
          radius: spec.radius,
          alive: true,
        };
        setPos(e);
        enemies.push(e);
      }
    }

    // Enemy DoT, death, movement
    for (const e of enemies) {
      if (!e.alive) continue;
      if (e.dots.length) {
        e.dots = e.dots.filter((d) => d.until > elapsed);
        let dps = 0;
        for (const d of e.dots) dps += d.dps;
        if (dps) e.hp -= dps * (1 - e.armor) * DT;
      }
      if (e.hp <= 0) {
        e.alive = false;
        killed++;
        coinsEarned += e.bounty;
        continue;
      }
      const slow = e.slowUntil > elapsed ? e.slowFactor : 1;
      e.progress += e.baseSpeed * slow * DT;
      if (e.progress >= 1) {
        e.alive = false;
        leaked++;
        continue;
      }
      setPos(e);
    }

    // Towers fire
    for (const t of placed) {
      t.cd -= DT;
      if (t.cd > 0) continue;
      const target = findTarget(t.x, t.z, t.def.range);
      if (!target) continue;
      t.cd = t.def.cooldown;
      projectiles.push({
        x: t.x,
        z: t.z,
        targetId: target.id,
        damage: t.def.damage,
        speed: t.def.projectileSpeed,
        splashRadius: t.def.splashRadius,
        slow: t.def.slow,
        dot: t.def.dot,
        life: 0,
        lastX: target.x,
        lastZ: target.z,
      });
    }

    // Projectiles
    for (const proj of projectiles) {
      proj.life += DT;
      if (proj.life > 4) {
        proj.targetId = -1;
        continue;
      }
      const target = enemies.find((e) => e.id === proj.targetId);
      if (!target || !target.alive) {
        // Target gone: area shells still burst on the last seen spot.
        if (proj.splashRadius) applyHit(proj, proj.lastX, proj.lastZ);
        proj.targetId = -1;
        continue;
      }
      proj.lastX = target.x;
      proj.lastZ = target.z;
      const dx = target.x - proj.x;
      const dz = target.z - proj.z;
      const dist = Math.hypot(dx, dz);
      const step = proj.speed * DT;
      if (dist <= step + 0.3) {
        applyHit(proj, target.x, target.z);
        proj.targetId = -1;
        continue;
      }
      proj.x += (dx / dist) * step;
      proj.z += (dz / dist) * step;
    }

    // Cleanup
    for (let i = projectiles.length - 1; i >= 0; i--) if (projectiles[i].targetId === -1) projectiles.splice(i, 1);
    for (let i = enemies.length - 1; i >= 0; i--) if (!enemies[i].alive) enemies.splice(i, 1);

    elapsed += DT;
    if (spawnIndex >= queue.length && enemies.length === 0) break;
  }

  return { leaked, killed, coinsEarned, durationSec: elapsed };
}

// ----------------------------------------------------------------------------
// Player model: buy toward a sensible cumulative tower plan, persisting towers
// across levels and placing each at the best open spot (by path coverage).
// Represents a competent-but-not-perfect human, not an optimizer.
// ----------------------------------------------------------------------------
type Plan = Partial<Record<string, number>>;
const BUILD_PLAN: Plan[] = [
  { 'moon-archer': 3 },
  { 'moon-archer': 4, 'thorn-spire': 1 },
  { 'moon-archer': 4, 'thorn-spire': 1, 'crystal-cannon': 1 },
  { 'moon-archer': 5, 'thorn-spire': 1, 'crystal-cannon': 1, 'firefly-shrine': 1 },
  { 'moon-archer': 5, 'thorn-spire': 2, 'crystal-cannon': 2, 'firefly-shrine': 1 },
  { 'moon-archer': 5, 'thorn-spire': 2, 'crystal-cannon': 2, 'firefly-shrine': 1, 'oak-guardian': 1 },
  { 'moon-archer': 6, 'thorn-spire': 2, 'crystal-cannon': 3, 'firefly-shrine': 2, 'oak-guardian': 1 },
  { 'moon-archer': 6, 'thorn-spire': 3, 'crystal-cannon': 3, 'firefly-shrine': 2, 'oak-guardian': 2 },
  { 'moon-archer': 7, 'thorn-spire': 3, 'crystal-cannon': 3, 'firefly-shrine': 2, 'oak-guardian': 3 },
  { 'moon-archer': 7, 'thorn-spire': 3, 'crystal-cannon': 4, 'firefly-shrine': 2, 'oak-guardian': 3 },
];

function towerById(id: string): TowerDef {
  const t = towers.find((x) => x.id === id);
  if (!t) throw new Error(`no tower ${id}`);
  return t;
}

function bestOpenSpot(usedIds: Set<string>, range: number): BuildSpot | null {
  let best: BuildSpot | null = null;
  let bestCov = -1;
  for (const s of BUILD_SPOTS) {
    if (usedIds.has(s.id)) continue;
    const cov = coverageFraction(s.x, s.z, range);
    if (cov > bestCov) {
      bestCov = cov;
      best = s;
    }
  }
  return best;
}

/**
 * A casual player: glances at the field and picks an okay-but-not-optimal spot
 * for the tower's range (best of a few random candidates), rather than the
 * globally best spot a min-maxer would compute.
 */
function randomOpenSpot(usedIds: Set<string>, rng: () => number, range: number): BuildSpot | null {
  const open = BUILD_SPOTS.filter((s) => !usedIds.has(s.id));
  if (!open.length) return null;
  let best: BuildSpot | null = null;
  let bestCov = -1;
  for (let k = 0; k < 3; k++) {
    const cand = open[Math.floor(rng() * open.length)];
    const cov = coverageFraction(cand.x, cand.z, range);
    if (cov > bestCov) {
      bestCov = cov;
      best = cand;
    }
  }
  return best;
}

function runFullGame(opts: { reserveFrac?: number; verbose?: boolean; seed?: number; placement?: 'best' | 'random' } = {}) {
  const { reserveFrac = 0, verbose = true, seed = 12345, placement = 'best' } = opts;
  const rng = mulberry32(seed);
  let coins = gameConfig.startingCoins;
  let lives = gameConfig.startingLives;
  const placed: PlacedTower[] = [];
  const counts: Record<string, number> = {};
  const usedSpots = new Set<string>();

  const rows: string[] = [];
  rows.push(
    ['Lv', 'name', 'spent', 'coins0', 'earned', 'coins1', 'towers', 'leak', 'kill', 'lives', 'dur'].join('\t'),
  );

  let totalLeaked = 0;
  for (let level = 1; level <= TOTAL_LEVELS; level++) {
    const coinsAtStart = coins;
    const plan = BUILD_PLAN[level - 1];
    // Buy toward the plan (greedy: cheapest unmet first so early money is used well).
    let spent = 0;
    let progress = true;
    while (progress) {
      progress = false;
      const wishlist = Object.keys(plan)
        .filter((id) => (counts[id] ?? 0) < (plan[id] ?? 0))
        .map(towerById)
        .sort((a, b) => b.cost - a.cost);
      for (const def of wishlist) {
        const reserve = Math.floor(coins * reserveFrac);
        if (coins - def.cost < reserve) continue;
        const spot = placement === 'random' ? randomOpenSpot(usedSpots, rng, def.range) : bestOpenSpot(usedSpots, def.range);
        if (!spot) continue;
        usedSpots.add(spot.id);
        placed.push({ def, x: spot.x, z: spot.z, cd: 0 });
        counts[def.id] = (counts[def.id] ?? 0) + 1;
        coins -= def.cost;
        spent += def.cost;
        progress = true;
        break;
      }
    }

    const res = simulateLevel(level, placed, rng);
    coins += res.coinsEarned;
    lives -= res.leaked;
    totalLeaked += res.leaked;

    const towerSummary = towers
      .map((t) => `${t.icon}${counts[t.id] ?? 0}`)
      .join(' ');
    rows.push(
      [
        level,
        getLevel(level).name.slice(0, 16),
        spent,
        coinsAtStart,
        res.coinsEarned,
        coins,
        towerSummary,
        res.leaked,
        res.killed,
        lives,
        res.durationSec.toFixed(0),
      ].join('\t'),
    );

    if (lives <= 0) {
      rows.push(`>>> GAME OVER at level ${level} (lives ${lives})`);
      break;
    }
  }

  if (verbose) {
    console.log(rows.join('\n'));
    console.log(`\nFinal: lives=${lives}, totalLeaked=${totalLeaked}, towersPlaced=${placed.length}/${BUILD_SPOTS.length} spots`);
  }
  return { lives, totalLeaked, won: lives > 0 };
}

/**
 * Spam a single tower type: each level buy as many as affordable (best spots),
 * persist across levels, then fight. Used to check no single tower wins alone
 * (over-powered) and that premium towers still have reach.
 */
function runSingleType(towerId: string, seed = 999) {
  const rng = mulberry32(seed);
  const def = towerById(towerId);
  let coins = gameConfig.startingCoins;
  let lives = gameConfig.startingLives;
  const placed: PlacedTower[] = [];
  const usedSpots = new Set<string>();
  for (let level = 1; level <= TOTAL_LEVELS; level++) {
    while (coins >= def.cost) {
      const spot = bestOpenSpot(usedSpots, def.range);
      if (!spot) break;
      usedSpots.add(spot.id);
      placed.push({ def, x: spot.x, z: spot.z, cd: 0 });
      coins -= def.cost;
    }
    const res = simulateLevel(level, placed, rng);
    coins += res.coinsEarned;
    lives -= res.leaked;
    if (lives <= 0) return { towerId, won: false, lives, lastLevel: level, towers: placed.length };
  }
  return { towerId, won: true, lives, lastLevel: TOTAL_LEVELS, towers: placed.length };
}

/** Run the standard plan but with one tower type removed, to expose dead weight. */
function runLeaveOneOut(dropId: string) {
  const saved = BUILD_PLAN.map((p) => ({ ...p }));
  for (const p of BUILD_PLAN) delete p[dropId];
  const r = runFullGame({ reserveFrac: 0, placement: 'best', verbose: false });
  // restore
  for (let i = 0; i < BUILD_PLAN.length; i++) BUILD_PLAN[i] = saved[i];
  return r;
}

// ----------------------------------------------------------------------------
// Tower role metrics
// ----------------------------------------------------------------------------
function printTowerMetrics() {
  console.log('\n=== Tower metrics ===');
  console.log(['tower', 'cost', 'dps', 'dps/coin', 'range', 'cov%', 'dps/spot', 'special'].join('\t'));
  // Average coverage of the best ~6 spots for this range = typical mid-game placement quality.
  for (const t of towers) {
    const covs = BUILD_SPOTS.map((s) => coverageFraction(s.x, s.z, t.range)).sort((a, b) => b - a);
    const topCov = covs.slice(0, 6).reduce((a, b) => a + b, 0) / 6;
    const dps = t.damage / t.cooldown;
    let special = '';
    if (t.splashRadius) special = `splash r${t.splashRadius}`;
    else if (t.slow) special = `slow ${t.slow.factor}x/${t.slow.duration}s`;
    else if (t.dot) special = `dot ${t.dot.dps}/s x${t.dot.duration}s`;
    console.log(
      [
        t.name.slice(0, 14),
        t.cost,
        dps.toFixed(1),
        (dps / t.cost).toFixed(3),
        t.range,
        (topCov * 100).toFixed(0),
        dps.toFixed(1),
        special,
      ].join('\t'),
    );
  }
}

// ----------------------------------------------------------------------------
function main() {
  console.log(`Build spots available: ${BUILD_SPOTS.length}`);
  printTowerMetrics();
  console.log('\n=== Full run (competent play, best placement) ===');
  runFullGame({ reserveFrac: 0, placement: 'best' });
  console.log('\n=== Full run (cautious play, 25% reserve, best placement) ===');
  runFullGame({ reserveFrac: 0.25, placement: 'best' });
  console.log('\n=== Full run (casual play, imperfect placement) — should mostly win ===');
  let casualWins = 0;
  const winLives: number[] = [];
  const seeds = Array.from({ length: 24 }, (_, i) => i * 37 + 3);
  for (const seed of seeds) {
    const r = runFullGame({ reserveFrac: 0.1, placement: 'random', seed, verbose: false });
    if (r.won) {
      casualWins++;
      winLives.push(r.lives);
    }
  }
  winLives.sort((a, b) => a - b);
  const median = winLives.length ? winLives[Math.floor(winLives.length / 2)] : 0;
  console.log(`  casual win rate: ${casualWins}/${seeds.length}  (median winning lives ${median})`);

  console.log('\n=== Single-type spam (no type should solo the game = not OP) ===');
  for (const t of towers) {
    const r = runSingleType(t.id);
    console.log(
      `  ${t.icon} ${t.name.padEnd(20)} ${r.won ? 'WON ' : 'LOST'} lives=${String(r.lives).padStart(3)} reached L${r.lastLevel} (${r.towers} towers)`,
    );
  }

  console.log('\n=== Leave-one-out (each type should matter = none useless) ===');
  const full = runFullGame({ reserveFrac: 0, placement: 'best', verbose: false });
  console.log(`  full mix: lives=${full.lives}`);
  for (const t of towers) {
    const r = runLeaveOneOut(t.id);
    console.log(`  without ${t.icon} ${t.name.padEnd(20)} lives=${String(r.lives).padStart(3)} (${r.won ? 'won' : 'LOST'})  Δ=${r.lives - full.lives}`);
  }
}
main();
