import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Mesh, MeshBasicMaterial } from 'three';

interface PropProps {
  position: [number, number, number];
  scale?: number;
  rotation?: number;
  variant?: number;
}

/** A cluster of mossy boulders. Solid scenery — registers as a blocked zone. */
export function MossStone({ position, scale = 1, rotation = 0, variant = 0 }: PropProps) {
  const tall = variant === 1;
  return (
    <group position={position} scale={scale} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow position={[0, tall ? 0.45 : 0.28, 0]}>
        <dodecahedronGeometry args={[tall ? 0.6 : 0.55, 0]} />
        <meshStandardMaterial color={'#6b7079'} roughness={1} flatShading />
      </mesh>
      <mesh castShadow position={[0.5, 0.2, 0.25]}>
        <dodecahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color={'#5a6068'} roughness={1} flatShading />
      </mesh>
      {/* Moss cap */}
      <mesh position={[0, tall ? 0.85 : 0.66, 0]}>
        <sphereGeometry args={[tall ? 0.42 : 0.4, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={'#3f7a4a'} emissive={'#235c34'} emissiveIntensity={0.25} roughness={0.8} flatShading />
      </mesh>
    </group>
  );
}

/** A moss-covered fallen log. Solid scenery — registers as a blocked zone. */
export function FallenLog({ position, scale = 1, rotation = 0 }: PropProps) {
  return (
    <group position={position} scale={scale} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]} position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.34, 0.34, 2.2, 8]} />
        <meshStandardMaterial color={'#4a3526'} roughness={0.95} flatShading />
      </mesh>
      {/* Moss along the top */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0.58, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 2.0, 8]} />
        <meshStandardMaterial color={'#3f7a4a'} emissive={'#235c34'} emissiveIntensity={0.3} roughness={0.8} flatShading />
      </mesh>
      {/* Rings on the cut ends */}
      <mesh position={[1.1, 0.35, 0]}>
        <cylinderGeometry args={[0.34, 0.34, 0.04, 8]} />
        <meshStandardMaterial color={'#6b4a32'} roughness={0.9} />
      </mesh>
    </group>
  );
}

const flowerColors = ['#ff8fc7', '#ffd166', '#8fb7ff'];

/** A tiny glowing flower. Purely decorative (never blocks placement). */
export function Flower({ position, scale = 1, rotation = 0, variant = 0 }: PropProps) {
  const color = flowerColors[variant % flowerColors.length];
  return (
    <group position={position} scale={scale} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.015, 0.025, 0.32, 4]} />
        <meshStandardMaterial color={'#3f7a4a'} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.34, 0]}>
        <sphereGeometry args={[0.09, 8, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} roughness={0.5} />
      </mesh>
    </group>
  );
}

/** Gnarled roots fanning out from a tree base. Purely decorative. */
export function TreeRoots({ position, scale = 1, rotation = 0 }: PropProps) {
  return (
    <group position={[position[0], 0.06, position[2]]} scale={scale} rotation={[0, rotation, 0]}>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} rotation={[Math.PI / 2.3, 0, a]} position={[Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4]} castShadow>
            <cylinderGeometry args={[0.05, 0.12, 0.9, 5]} />
            <meshStandardMaterial color={'#3a2a1f'} roughness={0.95} flatShading />
          </mesh>
        );
      })}
    </group>
  );
}

const runeColors = ['#6ad7ff', '#b48bff', '#5effa6'];

/** A flat glowing rune etched into the ground near the path. Decorative. */
export function GroundRune({ position, scale = 1, rotation = 0, variant = 0 }: PropProps) {
  const ring = useRef<Mesh>(null);
  const glyph = useRef<Mesh>(null);
  const color = runeColors[variant % runeColors.length];

  useFrame((state) => {
    const t = state.clock.elapsedTime + position[0] * 0.7;
    const pulse = 0.5 + Math.sin(t * 1.6) * 0.5;
    if (ring.current) (ring.current.material as MeshBasicMaterial).opacity = 0.3 + pulse * 0.45;
    if (glyph.current) (glyph.current.material as MeshBasicMaterial).opacity = 0.25 + pulse * 0.4;
  });

  return (
    <group position={[position[0], 0.04, position[2]]} scale={scale} rotation={[-Math.PI / 2, 0, rotation]}>
      <mesh ref={ring}>
        <ringGeometry args={[0.5, 0.62, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh ref={glyph}>
        <ringGeometry args={[0.18, 0.26, 3 + variant]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Broken moonlit archway — decorative ruin fragment. */
export function RuinFragment({ position, scale = 1, rotation = 0, variant = 0 }: PropProps) {
  const tall = variant === 1;
  return (
    <group position={position} scale={scale} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow position={[0, tall ? 0.55 : 0.35, 0]}>
        <boxGeometry args={[tall ? 0.9 : 0.7, tall ? 1.1 : 0.7, 0.45]} />
        <meshStandardMaterial color={'#4a5068'} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0.3, 0.2, 0.15]}>
        <boxGeometry args={[0.35, 0.25, 0.3]} />
        <meshStandardMaterial color={'#3a4058'} roughness={1} flatShading />
      </mesh>
    </group>
  );
}

/** Tall broken arch — only the stone base blocks placement. */
export function RuinArch({ position, scale = 1, rotation = 0, variant = 0 }: PropProps) {
  const wide = variant === 1;
  return (
    <group position={position} scale={scale} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow position={[-0.55 * (wide ? 1.2 : 1), 1.1, 0]}>
        <boxGeometry args={[0.45, 2.2, 0.5]} />
        <meshStandardMaterial color={'#525a72'} roughness={0.95} flatShading />
      </mesh>
      <mesh castShadow receiveShadow position={[0.55 * (wide ? 1.2 : 1), 0.85, 0]}>
        <boxGeometry args={[0.45, 1.7, 0.5]} />
        <meshStandardMaterial color={'#525a72'} roughness={0.95} flatShading />
      </mesh>
      <mesh castShadow position={[0, 1.65, 0]}>
        <boxGeometry args={[wide ? 1.6 : 1.3, 0.35, 0.45]} />
        <meshStandardMaterial color={'#606880'} roughness={0.9} flatShading />
      </mesh>
      {/* Moonlit moss glow */}
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.55, 0.65, 0.08, 12]} />
        <meshStandardMaterial color={'#3a5880'} emissive={'#4488cc'} emissiveIntensity={0.35} roughness={0.8} />
      </mesh>
    </group>
  );
}

