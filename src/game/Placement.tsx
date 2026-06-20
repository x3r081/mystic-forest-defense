import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Group, MeshBasicMaterial } from 'three';
import { useGameStore } from './store';
import { getTower } from '../data/gameConfig';
import {
  evaluatePlacement,
  logPlacementFailure,
  towerFootprint,
} from './collision';
import { TowerModel } from '../components/TowerModel';

const VALID = new THREE.Color('#5effa6');
const INVALID = new THREE.Color('#ff5470');

/** Ground-plane placement — ignores decorative mesh raycasts. */
export function PlacementSystem() {
  const selectedTower = useGameStore((s) => s.selectedTower);
  const selectedPlacedId = useGameStore((s) => s.selectedPlacedId);
  const placeTower = useGameStore((s) => s.placeTower);
  const def = getTower(selectedTower);
  const canPlace = selectedTower != null && selectedPlacedId == null;

  const { raycaster, camera, pointer, gl } = useThree();
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);

  const ghost = useRef<Group>(null);
  const tinted = useRef<MeshBasicMaterial[]>([]);

  useFrame(() => {
    if (!def || !canPlace || !ghost.current) {
      if (ghost.current) ghost.current.visible = false;
      return;
    }

    raycaster.setFromCamera(pointer, camera);
    if (!raycaster.ray.intersectPlane(plane, hit)) {
      ghost.current.visible = false;
      return;
    }

    ghost.current.visible = true;
    ghost.current.position.set(hit.x, 0, hit.z);

    const state = useGameStore.getState();
    const result = evaluatePlacement(hit.x, hit.z, {
      screen: state.screen,
      selectedTower: state.selectedTower,
      mapId: state.mapId,
      coins: state.coins,
      placedTowers: state.placedTowers,
    });

    const color = result.ok ? VALID : INVALID;
    for (const m of tinted.current) {
      m.color.copy(color);
    }
  });

  useEffect(() => {
    if (!selectedTower || selectedPlacedId != null) return;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;

      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );

      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(plane, hit)) return;

      const state = useGameStore.getState();

      // Let tower onClick handle selection when clicking an existing footprint.
      for (const t of state.placedTowers) {
        const foot = towerFootprint(t.position[0], t.position[2], t.towerId);
        const dx = hit.x - foot.x;
        const dz = hit.z - foot.z;
        if (dx * dx + dz * dz <= foot.r * foot.r) return;
      }

      const result = evaluatePlacement(hit.x, hit.z, {
        screen: state.screen,
        selectedTower: state.selectedTower,
        mapId: state.mapId,
        coins: state.coins,
        placedTowers: state.placedTowers,
      });

      if (!result.ok) {
        logPlacementFailure(result.reason);
        return;
      }

      placeTower([hit.x, 0, hit.z]);
    };

    gl.domElement.addEventListener('pointerdown', onPointerDown);
    return () => gl.domElement.removeEventListener('pointerdown', onPointerDown);
  }, [selectedTower, selectedPlacedId, gl.domElement, raycaster, camera, plane, hit, placeTower]);

  if (!def || !canPlace) return null;

  const footR = towerFootprint(0, 0, def.id).r;

  const registerTint = (mat: MeshBasicMaterial | null) => {
    if (mat && !tinted.current.includes(mat)) tinted.current.push(mat);
  };

  return (
    <group ref={ghost} raycast={() => null}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} raycast={() => null}>
        <circleGeometry args={[footR, 32]} />
        <meshBasicMaterial ref={registerTint} color={VALID} transparent opacity={0.4} depthWrite={false} />
      </mesh>

      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <mesh raycast={() => null}>
          <circleGeometry args={[def.range, 48]} />
          <meshBasicMaterial ref={registerTint} color={VALID} transparent opacity={0.08} depthWrite={false} />
        </mesh>
        <mesh raycast={() => null}>
          <ringGeometry args={[def.range - 0.1, def.range, 48]} />
          <meshBasicMaterial ref={registerTint} color={VALID} transparent opacity={0.5} depthWrite={false} />
        </mesh>
      </group>

      <group raycast={() => null}>
        <TowerModel position={[0, 0, 0]} color={def.color} visualKind={def.shape} level={1} />
      </group>
    </group>
  );
}
