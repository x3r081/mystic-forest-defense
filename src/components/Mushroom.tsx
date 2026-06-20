import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, MeshStandardMaterial } from 'three';
import { theme } from '../data/theme';

interface MushroomProps {
  position: [number, number, number];
  scale?: number;
  rotation?: number;
  variant?: number;
}

const capColors = [theme.colors.arcane, theme.colors.glow, theme.colors.mist];

/**
 * A small glowing mushroom. The cap pulses gently so clusters shimmer.
 */
export function Mushroom({ position, scale = 1, rotation = 0, variant = 0 }: MushroomProps) {
  const cap = useRef<Mesh>(null);
  const capColor = capColors[variant % capColors.length];

  useFrame((state) => {
    if (!cap.current) return;
    const t = state.clock.elapsedTime + position[0];
    const mat = cap.current.material as MeshStandardMaterial;
    mat.emissiveIntensity = 0.7 + Math.sin(t * 1.5) * 0.3;
  });

  return (
    <group position={position} scale={scale} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 0.36, 6]} />
        <meshStandardMaterial color={'#e8e0d0'} roughness={0.8} />
      </mesh>
      <mesh ref={cap} position={[0, 0.4, 0]} castShadow>
        <sphereGeometry args={[0.26, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={capColor}
          emissive={capColor}
          emissiveIntensity={0.8}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}
