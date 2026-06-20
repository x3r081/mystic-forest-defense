import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, PointLight } from 'three';
import { theme } from '../data/theme';

/**
 * The grove's arcane heart: a floating, slowly spinning crystal that
 * pulses with light. Acts as the visual focal point of the start screen.
 */
export function Relic() {
  const crystal = useRef<Mesh>(null);
  const light = useRef<PointLight>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (crystal.current) {
      crystal.current.rotation.y = t * 0.5;
      crystal.current.position.y = 2.2 + Math.sin(t * 1.2) * 0.15;
    }
    if (light.current) {
      light.current.intensity = 6 + Math.sin(t * 2) * 2;
    }
  });

  return (
    <group>
      <mesh ref={crystal} position={[0, 2.2, 0]} castShadow>
        <octahedronGeometry args={[0.9, 0]} />
        <meshStandardMaterial
          color={theme.colors.arcane}
          emissive={theme.colors.arcane}
          emissiveIntensity={1.2}
          roughness={0.2}
          metalness={0.3}
          flatShading
        />
      </mesh>

      <pointLight
        ref={light}
        position={[0, 2.4, 0]}
        color={theme.colors.arcane}
        intensity={6}
        distance={18}
      />

      {/* Stone base ring */}
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[1.4, 1.6, 0.3, 8]} />
        <meshStandardMaterial color={'#2a2440'} roughness={0.8} />
      </mesh>
    </group>
  );
}
