import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { InstancedMesh } from 'three';
import { scatterDecorations } from '../game/path';
import { getPathCurveForMap } from '../game/world';
import type { MapId } from '../data/maps';
import { MAPS } from '../data/maps';

interface GrassProps {
  count?: number;
  color?: string;
  seed?: number;
  mapId?: MapId;
}

const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();

/**
 * A field of instanced grass blades that bend in a shared wind. Sway is done in
 * the vertex shader (per-instance phase from world position, weighted by blade
 * height) so hundreds of blades animate for almost no CPU cost.
 */
export function Grass({ count = 300, color = '#3fae6b', seed = 909, mapId = MAPS[0].id }: GrassProps) {
  const ref = useRef<InstancedMesh>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.09, 0.6, 1, 4);
    g.translate(0, 0.3, 0); // pivot at the base
    return g;
  }, []);

  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color,
      emissive: new THREE.Color(color).multiplyScalar(0.18),
      roughness: 0.85,
      side: THREE.DoubleSide,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
            float bladeH = uv.y;
            vec3 iPos = instanceMatrix[3].xyz;
            float wind = sin(uTime * 1.6 + iPos.x * 0.5 + iPos.z * 0.45)
                       + 0.4 * sin(uTime * 3.1 + iPos.z * 0.8);
            float sway = wind * bladeH * bladeH * 0.18;
            transformed.x += sway;
            transformed.z += sway * 0.35;
          `,
        );
    };
    return m;
  }, [color, uniforms]);

  const blades = useMemo(
    () => scatterDecorations(count, seed, getPathCurveForMap(mapId), { area: 22, depth: 9, minPathDist: 1.4, variants: 1 }),
    [count, seed, mapId],
  );

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const base = new THREE.Color(color);
    blades.forEach((b, i) => {
      dummy.position.set(b.position[0], 0, b.position[2]);
      dummy.rotation.set(0, b.rotation, 0);
      const h = 0.7 + (b.scale % 1) * 0.9;
      dummy.scale.set(0.9 + (b.scale % 0.5), h, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      // Subtle per-blade tint variation.
      const shade = 0.75 + ((i * 37) % 50) / 100;
      tmpColor.copy(base).multiplyScalar(shade);
      mesh.setColorAt(i, tmpColor);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [blades, color]);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  return <instancedMesh ref={ref} args={[geometry, material, blades.length]} castShadow={false} />;
}
