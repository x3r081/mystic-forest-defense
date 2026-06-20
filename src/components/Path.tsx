import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MeshStandardMaterial } from 'three';
import type { MapId } from '../data/maps';
import { getPathCurveForMap, getWorldForMap } from '../game/world';
import { getQualityBudgets } from '../game/performance';
import { theme } from '../data/theme';

interface PathProps {
  mapId: MapId;
  color?: string;
}

export function Path({ mapId, color = theme.colors.glow }: PathProps) {
  const core = useRef<MeshStandardMaterial>(null);
  const world = getWorldForMap(mapId);
  const pathCurve = useMemo(() => getPathCurveForMap(mapId), [mapId]);
  const pathGlow = getQualityBudgets().pathGlow;

  const baseGeo = useMemo(
    () => new THREE.TubeGeometry(pathCurve, 140, world.pathWidth, 8, false),
    [pathCurve, world.pathWidth],
  );
  const coreGeo = useMemo(
    () => new THREE.TubeGeometry(pathCurve, 140, world.pathWidth * 0.68, 8, false),
    [pathCurve, world.pathWidth],
  );

  useFrame((state) => {
    if (core.current && pathGlow) {
      core.current.emissiveIntensity = 1.2 + Math.sin(state.clock.elapsedTime * 1.5) * 0.35;
    }
  });

  return (
    <group>
      <mesh geometry={baseGeo} position={[0, 0.02, 0]} scale={[1, 0.07, 1]} receiveShadow>
        <meshStandardMaterial color={'#1c1630'} roughness={0.95} />
      </mesh>
      <mesh geometry={coreGeo} position={[0, 0.12, 0]} scale={[1, 0.07, 1]}>
        <meshStandardMaterial
          ref={core}
          color={color}
          emissive={color}
          emissiveIntensity={pathGlow ? 1.2 : 0.6}
          roughness={0.4}
          transparent
          opacity={0.95}
        />
      </mesh>
    </group>
  );
}
