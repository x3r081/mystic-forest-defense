import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { theme } from '../data/theme';
import { getGlowTexture } from './textures';

interface CrystalProps {
  position: [number, number, number];
  scale?: number;
  rotation?: number;
  variant?: number;
}

const crystalColors = [theme.colors.mist, theme.colors.arcane, theme.colors.glow];

/**
 * A cluster of glowing crystal shards jutting from the ground. Slowly hovers
 * and pulses to add mystical, parallax-friendly depth to the field.
 */
export function Crystal({ position, scale = 1, rotation = 0, variant = 0 }: CrystalProps) {
  const group = useRef<Group>(null);
  const main = useRef<Mesh>(null);
  const halo = useRef<Mesh>(null);
  const color = crystalColors[variant % crystalColors.length];
  const glow = useMemo(() => getGlowTexture(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime + position[2];
    const pulse = Math.sin(t * 2);
    if (group.current) group.current.rotation.y = rotation + t * 0.2;
    if (main.current) {
      const mat = main.current.material as MeshStandardMaterial;
      mat.emissiveIntensity = 0.9 + pulse * 0.4;
    }
    if (halo.current) {
      halo.current.quaternion.copy(state.camera.quaternion);
      const s = 1 + pulse * 0.12;
      halo.current.scale.set(s, s, s);
      (halo.current.material as MeshBasicMaterial).opacity = 0.4 + pulse * 0.15;
    }
  });

  return (
    <group ref={group} position={position} scale={scale} rotation={[0, rotation, 0]}>
      {/* Soft additive aura */}
      <mesh ref={halo} position={[0, 0.6, 0]}>
        <planeGeometry args={[2.4, 2.4]} />
        <meshBasicMaterial
          map={glow}
          color={color}
          transparent
          opacity={0.45}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={main} position={[0, 0.55, 0]} castShadow>
        <octahedronGeometry args={[0.45, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1}
          roughness={0.15}
          metalness={0.2}
          flatShading
        />
      </mesh>
      <mesh position={[0.32, 0.32, 0.1]} rotation={[0.3, 0, 0.5]} castShadow>
        <octahedronGeometry args={[0.24, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          roughness={0.15}
          flatShading
        />
      </mesh>
      <mesh position={[-0.28, 0.26, -0.05]} rotation={[-0.2, 0, -0.6]} castShadow>
        <octahedronGeometry args={[0.18, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          roughness={0.15}
          flatShading
        />
      </mesh>
    </group>
  );
}
