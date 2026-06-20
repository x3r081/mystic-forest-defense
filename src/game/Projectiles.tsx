import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Group, Line, Mesh } from 'three';
import { useGameStore, isSimRunning } from './store';
import { getProjectilePool, shouldUseProjectileTrails, getActiveProjectileCount } from './combatLoop';

const POOL_SIZE = 120;
const sharedSphereGeo = new THREE.SphereGeometry(0.14, 6, 6);
const sharedGlowGeo = new THREE.SphereGeometry(0.14, 6, 6);

interface TrailSlot {
  line: Line;
  positions: Float32Array;
}

/**
 * Pooled projectile renderer. Positions are updated imperatively each frame
 * from the combat simulation — no Zustand updates per shot.
 */
export function Projectiles() {
  const groups = useRef<(Group | null)[]>([]);
  const trails = useMemo<TrailSlot[]>(() => {
    const slots: TrailSlot[] = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const positions = new Float32Array(6);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setDrawRange(0, 2);
      const line = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      line.visible = false;
      line.frustumCulled = false;
      slots.push({ line, positions });
    }
    return slots;
  }, []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const gs = useGameStore.getState();
    const pool = getProjectilePool();
    const activeCount = getActiveProjectileCount();
    const showTrails = isSimRunning(gs) && shouldUseProjectileTrails(activeCount, gs.gameSpeed);

    for (let i = 0; i < POOL_SIZE; i++) {
      const group = groups.current[i];
      const trail = trails[i];
      if (!group || !trail) continue;

      const p = pool[i];
      if (!p?.active) {
        group.visible = false;
        trail.line.visible = false;
        continue;
      }

      group.visible = true;
      group.position.set(p.x, p.y, p.z);

      const isCannon = p.towerType === 'crystal-cannon';
      const isFirefly = p.towerType === 'firefly-shrine';
      const size = isCannon ? 0.28 : isFirefly ? 0.16 : 0.13;
      const mesh = group.children[0] as Mesh;
      const glow = group.children[1] as Mesh;
      mesh.scale.setScalar(size / 0.14);
      glow.scale.setScalar((isCannon ? 2.3 : 1.8) * (size / 0.14));
      tmpColor.set(p.color);
      (mesh.material as THREE.MeshBasicMaterial).color.copy(tmpColor);
      (glow.material as THREE.MeshBasicMaterial).color.copy(tmpColor);

      if (showTrails) {
        trail.positions[0] = p.x;
        trail.positions[1] = p.y;
        trail.positions[2] = p.z;
        trail.positions[3] = p.x;
        trail.positions[4] = p.y - 0.4;
        trail.positions[5] = p.z;
        trail.line.geometry.attributes.position.needsUpdate = true;
        trail.line.visible = true;
        const mat = trail.line.material as THREE.LineBasicMaterial;
        mat.color.copy(tmpColor);
        mat.opacity = isCannon ? 0.45 : 0.32;
      } else {
        trail.line.visible = false;
      }
    }
  });

  return (
    <>
      {Array.from({ length: POOL_SIZE }, (_, i) => (
        <group
          key={i}
          ref={(el) => {
            groups.current[i] = el;
          }}
          visible={false}
        >
          <mesh geometry={sharedSphereGeo}>
            <meshBasicMaterial toneMapped={false} />
          </mesh>
          <mesh geometry={sharedGlowGeo}>
            <meshBasicMaterial transparent opacity={0.3} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {trails.map((t, i) => (
        <primitive key={`trail-${i}`} object={t.line} />
      ))}
    </>
  );
}
