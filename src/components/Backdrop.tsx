import { useMemo } from 'react';
import * as THREE from 'three';
import { getSkyGradient } from './textures';

interface BackdropProps {
  top: string;
  bottom: string;
  accent: string;
}

interface Silhouette {
  x: number;
  z: number;
  w: number;
  h: number;
  shade: number;
}

/** Build a couple of parallax rows of distant tree silhouettes. */
function buildTreeline(): Silhouette[] {
  const rows = [
    { z: -21, count: 22, span: 80, base: 5, vary: 4, shade: 0.0 },
    { z: -17, count: 18, span: 72, base: 7, vary: 5, shade: 0.06 },
  ];
  const out: Silhouette[] = [];
  let seed = 7;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (const r of rows) {
    for (let i = 0; i < r.count; i++) {
      const x = -r.span / 2 + (i / (r.count - 1)) * r.span + (rand() - 0.5) * 2;
      out.push({
        x,
        z: r.z,
        w: 2.2 + rand() * 1.8,
        h: r.base + rand() * r.vary,
        shade: r.shade,
      });
    }
  }
  return out;
}

/**
 * Layered background: a vertical sky gradient with a horizon glow, fronted by
 * parallax rows of dark tree silhouettes for depth. Sits beyond the fog and is
 * intentionally low-detail so the playfield stays the focus.
 */
export function Backdrop({ top, bottom, accent }: BackdropProps) {
  const grad = useMemo(() => getSkyGradient(top, bottom, accent), [top, bottom, accent]);
  const trees = useMemo(() => buildTreeline(), []);
  const silhouette = useMemo(() => new THREE.Color(bottom).multiplyScalar(0.4), [bottom]);

  return (
    <group>
      {/* Sky gradient wall */}
      <mesh position={[0, 8, -25]}>
        <planeGeometry args={[110, 40]} />
        <meshBasicMaterial map={grad} fog={false} depthWrite={false} toneMapped={false} />
      </mesh>

      {/* Soft moonlit horizon glow */}
      <mesh position={[0, 1.2, -22]}>
        <planeGeometry args={[90, 7]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={0.1}
          fog={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Parallax treeline silhouettes */}
      {trees.map((t, i) => (
        <mesh key={i} position={[t.x, t.h / 2 - 0.5, t.z]}>
          <coneGeometry args={[t.w, t.h, 5]} />
          <meshBasicMaterial
            color={silhouette.clone().multiplyScalar(1 + t.shade)}
            fog={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
