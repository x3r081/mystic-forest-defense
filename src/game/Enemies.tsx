import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Group, Mesh } from 'three';
import { useGameStore, isSimRunning, simDelta, type Enemy } from './store';
import { pointOnMapPath } from './world';
import { enemyRegistry, simClock } from './registry';
import { EnemyModel } from '../components/EnemyModel';
import { easeOutBack, randomPhase } from './animation';

/**
 * Drives spawning for the active level. Emits queued enemies on the level's
 * spawn-rate timer; level completion is handled in the store as enemies clear.
 */
function LevelManager() {
  const spawnNext = useGameStore((s) => s.spawnNext);
  const spawnTimer = useRef(0);
  const prevPhase = useRef<'preparing' | 'running'>('preparing');

  useFrame((_, delta) => {
    const state = useGameStore.getState();

    // Arm the timer exactly on the prepare -> run edge (each "Start Run"), so the
    // first foe appears promptly. Tracking the phase edge — rather than level
    // number or `isSimRunning` — keeps this correct on restarts/replays and
    // avoids a spurious spawn when merely resuming from pause.
    if (state.phase === 'running' && prevPhase.current === 'preparing') {
      spawnTimer.current = state.spawnRate;
    }
    prevPhase.current = state.phase;

    if (!isSimRunning(state)) return;
    const { spawnIndex, spawnQueue, spawnRate } = state;
    // Scale by game speed so 2x also spawns the wave twice as fast.
    const dt = simDelta(delta, state);

    if (spawnIndex < spawnQueue.length) {
      spawnTimer.current += dt;
      if (spawnTimer.current >= spawnRate) {
        spawnTimer.current = 0;
        spawnNext();
      }
    }
  });

  return null;
}

/** A single enemy that walks the path under simulation control. */
function EnemyMesh({ enemy }: { enemy: Enemy }) {
  const group = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const shock = useRef<Mesh>(null);
  const hpRoot = useRef<Group>(null);
  const hpFill = useRef<Group>(null);
  const removeEnemy = useGameStore((s) => s.removeEnemy);

  const done = useRef(false);
  const spawnStart = useRef<number | null>(null);
  const seed = useMemo(() => randomPhase(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const barWidth = enemy.radius * 2;

  useFrame((state, delta) => {
    if (done.current || !group.current) return;
    // Freeze enemies until the wave is started, while paused, etc.
    const gs = useGameStore.getState();
    if (!isSimRunning(gs)) return;
    const rt = enemyRegistry.get(enemy.id);
    if (!rt) {
      done.current = true;
      return;
    }
    const elapsed = state.clock.elapsedTime;
    // Speed-scaled simulation step (movement, DoT, slow timers all use this).
    const dt = simDelta(delta, gs);
    // Status-effect timers run on the simulation clock, not the wall clock.
    const now = simClock.now;

    // Damage-over-time (mitigated by armor)
    if (rt.dots.length) {
      let dps = 0;
      rt.dots = rt.dots.filter((d) => d.until > now);
      for (const d of rt.dots) dps += d.dps;
      if (dps) rt.hp -= dps * (1 - rt.armor) * dt;
    }

    // Death by damage
    if (rt.hp <= 0) {
      done.current = true;
      rt.alive = false;
      removeEnemy(enemy.id, false);
      return;
    }

    // Movement (slowed if a snare is active)
    const slow = rt.slowUntil > now ? rt.slowFactor : 1;
    rt.progress += rt.baseSpeed * slow * dt;
    if (rt.progress >= 1) {
      done.current = true;
      rt.alive = false;
      removeEnemy(enemy.id, true);
      return;
    }

    pointOnMapPath(rt.mapId, rt.progress, tmp);
    const bob = Math.sin(elapsed * 3 + seed) * 0.12;
    rt.x = tmp.x;
    rt.z = tmp.z;
    rt.y = enemy.radius + 0.5 + bob;
    group.current.position.set(rt.x, rt.y, rt.z);

    // Boss entrance: scale up with an overshoot and emit a ground shockwave.
    if (enemy.isBoss) {
      if (spawnStart.current === null) spawnStart.current = elapsed;
      const age = elapsed - spawnStart.current;
      if (inner.current) {
        const k = Math.min(age / 1.4, 1);
        inner.current.scale.setScalar(Math.max(0.001, easeOutBack(k)));
      }
      if (shock.current) {
        const sk = Math.min(age / 1.1, 1);
        const r = 0.5 + sk * 6;
        shock.current.scale.set(r, r, r);
        (shock.current.material as THREE.MeshBasicMaterial).opacity = (1 - sk) * 0.6;
        shock.current.visible = sk < 1;
      }
    }

    // Health bar: billboard toward the camera, show only once damaged.
    if (hpRoot.current && hpFill.current) {
      const frac = Math.max(0, rt.hp / rt.maxHp);
      hpRoot.current.visible = frac < 0.999;
      hpRoot.current.quaternion.copy(state.camera.quaternion);
      hpFill.current.scale.x = frac;
    }
  });

  const hpColor = enemy.isBoss ? '#ff4d6d' : '#7ef9c4';

  return (
    <group ref={group}>
      <group ref={inner}>
        <EnemyModel
          kind={enemy.kind}
          color={enemy.color}
          radius={enemy.radius}
          opacity={enemy.opacity}
        />

        {/* Health bar */}
        <group ref={hpRoot} position={[0, enemy.radius + 0.9, 0]} visible={false}>
          <mesh>
            <planeGeometry args={[barWidth + 0.08, 0.18]} />
            <meshBasicMaterial color={'#0a0f1a'} transparent opacity={0.85} depthTest={false} />
          </mesh>
          <group ref={hpFill} position={[-barWidth / 2, 0, 0.001]}>
            <mesh position={[barWidth / 2, 0, 0]}>
              <planeGeometry args={[barWidth, 0.1]} />
              <meshBasicMaterial color={hpColor} depthTest={false} />
            </mesh>
          </group>
        </group>
      </group>

      {/* Boss arrival shockwave */}
      {enemy.isBoss && (
        <mesh ref={shock} rotation={[-Math.PI / 2, 0, 0]} position={[0, -enemy.radius - 0.3, 0]} visible={false}>
          <ringGeometry args={[0.85, 1, 48]} />
          <meshBasicMaterial
            color={enemy.color}
            transparent
            opacity={0.6}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
}

/** Renders all active enemies plus the level spawner. */
export function Enemies() {
  const enemies = useGameStore((s) => s.enemies);
  return (
    <>
      <LevelManager />
      {enemies.map((e) => (
        <EnemyMesh key={e.id} enemy={e} />
      ))}
    </>
  );
}
