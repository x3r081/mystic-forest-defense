import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, PointLight } from 'three';
import { theme } from '../data/theme';

interface PortalProps {
  position: [number, number, number];
  /** Color of the swirling energy. */
  color?: string;
  /** Smaller, dimmer variant used for the enemy spawn rift. */
  variant?: 'base' | 'rift';
}

/**
 * A standing ring portal with a swirling energy disc. Used both as the
 * player's base (where enemies leak through) and the enemy spawn rift.
 */
export function Portal({ position, color = theme.colors.glow, variant = 'base' }: PortalProps) {
  const swirl = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  const light = useRef<PointLight>(null);
  const isBase = variant === 'base';
  const s = isBase ? 1 : 0.7;

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (swirl.current) swirl.current.rotation.z += delta * (isBase ? 1.2 : 2);
    if (ring.current) ring.current.rotation.z -= delta * 0.4;
    if (light.current) light.current.intensity = (isBase ? 8 : 4) + Math.sin(t * 3) * 2;
  });

  return (
    <group position={position}>
      <group position={[0, 1.6 * s, 0]} rotation={[0, Math.PI / 2, 0]}>
        {/* Outer stone ring */}
        <mesh ref={ring} castShadow>
          <torusGeometry args={[1.5 * s, 0.22 * s, 10, 32]} />
          <meshStandardMaterial
            color={'#2a2440'}
            emissive={color}
            emissiveIntensity={0.25}
            roughness={0.6}
            metalness={0.3}
          />
        </mesh>
        {/* Swirling energy disc */}
        <mesh ref={swirl} position={[0, 0, -0.05]}>
          <circleGeometry args={[1.4 * s, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.55} />
        </mesh>
        <mesh position={[0, 0, -0.08]}>
          <circleGeometry args={[1.4 * s, 32]} />
          <meshBasicMaterial color={theme.colors.night} transparent opacity={0.6} />
        </mesh>
      </group>

      {/* Floating shards around base portals */}
      {isBase && (
        <>
          <mesh position={[1.4, 0.5, 0]} rotation={[0.4, 0.2, 0.3]}>
            <octahedronGeometry args={[0.28, 0]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} flatShading />
          </mesh>
          <mesh position={[-1.4, 0.7, 0.3]} rotation={[0.1, 0.5, -0.4]}>
            <octahedronGeometry args={[0.22, 0]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} flatShading />
          </mesh>
        </>
      )}

      <pointLight ref={light} position={[0, 1.8 * s, 0]} color={color} distance={12} intensity={isBase ? 8 : 4} />

      {/* Base platform */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <cylinderGeometry args={[1.6 * s, 1.9 * s, 0.2, 8]} />
        <meshStandardMaterial color={'#221d33'} roughness={0.85} />
      </mesh>
    </group>
  );
}
