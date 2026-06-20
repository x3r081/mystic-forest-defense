import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { getFogTexture } from './textures';

interface FogParticlesProps {
  count?: number;
  color?: string;
}

interface Mote {
  x: number;
  y: number;
  z: number;
  scale: number;
  speed: number;
  phase: number;
  opacity: number;
}

const SPAN = 28;

/**
 * A slow drift of large soft sprites hugging the ground, giving the grove a
 * layered, misty atmosphere. Billboarded to the camera and kept faint so the
 * path and units stay clearly readable through it.
 */
export function FogParticles({ count = 16, color = '#cfeee0' }: FogParticlesProps) {
  const tex = useMemo(() => getFogTexture(), []);
  const group = useRef<Group>(null);

  const motes = useMemo<Mote[]>(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() * 2 - 1) * SPAN,
      y: 0.6 + Math.random() * 2.2,
      z: -6 + Math.random() * 15,
      scale: 7 + Math.random() * 7,
      speed: (0.15 + Math.random() * 0.3) * (Math.random() < 0.5 ? 1 : -1),
      phase: Math.random() * Math.PI * 2,
      opacity: 0.06 + Math.random() * 0.1,
    }));
  }, [count]);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      const m = motes[i];
      let x = m.x + t * m.speed;
      x = ((((x + SPAN) % (SPAN * 2)) + SPAN * 2) % (SPAN * 2)) - SPAN;
      child.position.x = x;
      child.position.y = m.y + Math.sin(t * 0.25 + m.phase) * 0.35;
      child.quaternion.copy(state.camera.quaternion);
    });
  });

  return (
    <group ref={group}>
      {motes.map((m, i) => (
        <mesh key={i} position={[m.x, m.y, m.z]} scale={m.scale}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={tex}
            color={color}
            transparent
            opacity={m.opacity}
            depthWrite={false}
            fog={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
