import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { theme } from '../data/theme';

interface TreeProps {
  position: [number, number, number];
  scale?: number;
  rotation?: number;
  /** Phase offset so trees don't all sway in unison. */
  swayOffset?: number;
  glow?: boolean;
  /** 0 = classic spire, 1 = round bushy, 2 = tall pine. */
  variant?: number;
}

/**
 * A low-poly stylized mystic tree. Three silhouette variants keep the grove
 * from looking repetitive: a classic stacked spire, a rounder bushy canopy and
 * a tall narrow pine. All gently sway to feel alive.
 */
export function Tree({
  position,
  scale = 1,
  rotation = 0,
  swayOffset = 0,
  glow = false,
  variant = 0,
}: TreeProps) {
  const group = useRef<Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime + swayOffset;
    group.current.rotation.z = Math.sin(t * 0.6) * 0.03;
  });

  const foliage = glow ? theme.colors.glow : theme.colors.moss;
  const emissive = glow ? 0.6 : 0.2;

  return (
    <group ref={group} position={position} scale={scale} rotation={[0, rotation, 0]}>
      <mesh castShadow position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.18, 0.34, 1.8, 6]} />
        <meshStandardMaterial color={'#3a2a1f'} roughness={0.9} />
      </mesh>

      {variant === 1 ? (
        // Round bushy canopy — two wide cones capped by a dome.
        <>
          <mesh castShadow position={[0, 2.0, 0]}>
            <coneGeometry args={[1.35, 1.5, 8]} />
            <meshStandardMaterial color={foliage} emissive={foliage} emissiveIntensity={emissive} roughness={0.6} flatShading />
          </mesh>
          <mesh castShadow position={[0, 2.9, 0]}>
            <coneGeometry args={[1.05, 1.2, 8]} />
            <meshStandardMaterial color={foliage} emissive={foliage} emissiveIntensity={emissive + 0.05} roughness={0.6} flatShading />
          </mesh>
          <mesh castShadow position={[0, 3.6, 0]}>
            <sphereGeometry args={[0.7, 10, 8]} />
            <meshStandardMaterial color={foliage} emissive={foliage} emissiveIntensity={emissive + 0.1} roughness={0.6} flatShading />
          </mesh>
        </>
      ) : variant === 2 ? (
        // Tall narrow pine — four slim cones.
        <>
          {[1.9, 2.7, 3.4, 4.0].map((y, i) => (
            <mesh key={y} castShadow position={[0, y, 0]}>
              <coneGeometry args={[0.85 - i * 0.16, 1.2 - i * 0.12, 7]} />
              <meshStandardMaterial color={foliage} emissive={foliage} emissiveIntensity={emissive + i * 0.04} roughness={0.6} flatShading />
            </mesh>
          ))}
        </>
      ) : (
        // Classic stacked spire.
        <>
          <mesh castShadow position={[0, 2.1, 0]}>
            <coneGeometry args={[1.1, 1.6, 7]} />
            <meshStandardMaterial color={foliage} emissive={foliage} emissiveIntensity={emissive} roughness={0.6} flatShading />
          </mesh>
          <mesh castShadow position={[0, 3.0, 0]}>
            <coneGeometry args={[0.85, 1.3, 7]} />
            <meshStandardMaterial color={foliage} emissive={foliage} emissiveIntensity={emissive + 0.05} roughness={0.6} flatShading />
          </mesh>
          <mesh castShadow position={[0, 3.8, 0]}>
            <coneGeometry args={[0.55, 1.0, 7]} />
            <meshStandardMaterial color={foliage} emissive={foliage} emissiveIntensity={emissive + 0.1} roughness={0.6} flatShading />
          </mesh>
        </>
      )}
    </group>
  );
}
