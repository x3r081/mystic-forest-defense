import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import type { EnemyKind } from '../data/gameConfig';
import { randomPhase } from '../game/animation';

interface ModelProps {
  color: string;
  radius: number;
  opacity: number;
}

/** Goblin Scout — small, twitchy, scurrying creature. */
function GoblinScout({ color, radius }: ModelProps) {
  const root = useRef<Group>(null);
  const phase = useMemo(() => randomPhase(), []);

  useFrame((state) => {
    if (!root.current) return;
    const t = state.clock.elapsedTime * 9 + phase; // fast, jittery
    root.current.position.y = Math.abs(Math.sin(t)) * 0.18;
    root.current.rotation.z = Math.sin(t * 0.5) * 0.12;
  });

  return (
    <group ref={root}>
      {/* Hooded body */}
      <mesh castShadow>
        <coneGeometry args={[radius, radius * 2.1, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} roughness={0.5} flatShading />
      </mesh>
      {/* Head */}
      <mesh position={[0, radius * 0.9, 0]} castShadow>
        <icosahedronGeometry args={[radius * 0.55, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} roughness={0.4} flatShading />
      </mesh>
      {/* Pointed ears */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * radius * 0.5, radius * 1.0, 0]} rotation={[0, 0, s * -0.9]}>
          <coneGeometry args={[radius * 0.16, radius * 0.7, 4]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} flatShading />
        </mesh>
      ))}
      {/* Eyes */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * radius * 0.22, radius * 0.95, radius * 0.42]}>
          <sphereGeometry args={[radius * 0.1, 6, 6]} />
          <meshBasicMaterial color={'#fff3b0'} />
        </mesh>
      ))}
    </group>
  );
}

/** Moss Brute — big, lumbering, heavy mossy boulder-beast. */
function MossBrute({ color, radius }: ModelProps) {
  const root = useRef<Group>(null);
  const phase = useMemo(() => randomPhase(), []);
  const bumps = useMemo(
    () =>
      Array.from({ length: 5 }, () => ({
        p: [
          (Math.random() - 0.5) * radius * 1.3,
          (Math.random() - 0.2) * radius,
          (Math.random() - 0.5) * radius * 1.3,
        ] as [number, number, number],
        s: 0.18 + Math.random() * 0.22,
      })),
    [radius],
  );

  useFrame((state) => {
    if (!root.current) return;
    const t = state.clock.elapsedTime * 1.6 + phase; // slow, heavy
    // Lumbering squash & sway
    const squash = 1 + Math.sin(t) * 0.06;
    root.current.scale.set(1 / squash, squash, 1 / squash);
    root.current.rotation.z = Math.sin(t * 0.5) * 0.06;
  });

  return (
    <group ref={root}>
      <mesh castShadow>
        <dodecahedronGeometry args={[radius, 0]} />
        <meshStandardMaterial color={color} emissive={'#1f3d18'} emissiveIntensity={0.4} roughness={0.95} flatShading />
      </mesh>
      {/* Mossy rock bumps */}
      {bumps.map((b, i) => (
        <mesh key={i} position={b.p} castShadow>
          <dodecahedronGeometry args={[radius * b.s, 0]} />
          <meshStandardMaterial color={'#3f5f30'} emissive={'#7ef9c4'} emissiveIntensity={0.25} roughness={0.9} flatShading />
        </mesh>
      ))}
      {/* Glowing eyes */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * radius * 0.32, radius * 0.2, radius * 0.78]}>
          <sphereGeometry args={[radius * 0.13, 6, 6]} />
          <meshBasicMaterial color={'#c4ff9b'} />
        </mesh>
      ))}
    </group>
  );
}

/** Shadow Wisp — partially transparent drifting phantom. */
function ShadowWisp({ color, radius, opacity }: ModelProps) {
  const root = useRef<Group>(null);
  const core = useRef<Mesh>(null);
  const phase = useMemo(() => randomPhase(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime * 2 + phase;
    if (root.current) {
      root.current.position.y = Math.sin(t) * 0.18;
      root.current.rotation.y = state.clock.elapsedTime * 0.8;
    }
    if (core.current) {
      // Phase in and out of visibility
      const m = core.current.material as MeshStandardMaterial;
      m.opacity = opacity * (0.7 + Math.sin(t * 1.3) * 0.3);
    }
  });

  return (
    <group ref={root}>
      {/* Ghostly body */}
      <mesh ref={core}>
        <sphereGeometry args={[radius, 14, 14]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.4}
          roughness={0.3}
          transparent
          opacity={opacity}
          depthWrite={false}
        />
      </mesh>
      {/* Wispy tail */}
      <mesh position={[0, -radius * 1.1, 0]}>
        <coneGeometry args={[radius * 0.7, radius * 1.6, 10, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.5} depthWrite={false} />
      </mesh>
      {/* Hollow eyes */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * radius * 0.3, radius * 0.15, radius * 0.7]}>
          <sphereGeometry args={[radius * 0.12, 6, 6]} />
          <meshBasicMaterial color={'#1a0b2e'} />
        </mesh>
      ))}
    </group>
  );
}

/** Armored Treant — tall, bark-clad, plated walking tree. */
function ArmoredTreant({ color, radius }: ModelProps) {
  const root = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const phase = useMemo(() => randomPhase(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime * 1.4 + phase;
    if (root.current) root.current.rotation.z = Math.sin(t) * 0.05; // stiff sway
    if (ring.current) ring.current.rotation.z += 0.02; // spinning armor band
  });

  const plate = '#b9b2a0';

  return (
    <group ref={root}>
      {/* Trunk */}
      <mesh castShadow position={[0, radius * 0.2, 0]}>
        <cylinderGeometry args={[radius * 0.7, radius * 0.85, radius * 2.4, 7]} />
        <meshStandardMaterial color={color} emissive={'#2a1c0c'} emissiveIntensity={0.3} roughness={0.95} flatShading />
      </mesh>
      {/* Stub arms */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * radius * 0.85, radius * 0.5, 0]} rotation={[0, 0, s * 0.7]} castShadow>
          <cylinderGeometry args={[radius * 0.18, radius * 0.22, radius * 1.1, 5]} />
          <meshStandardMaterial color={color} roughness={0.95} flatShading />
        </mesh>
      ))}
      {/* Armor plates (front/back) */}
      {[radius * 0.55, -radius * 0.55].map((z, i) => (
        <mesh key={i} position={[0, radius * 0.2, z]} castShadow>
          <boxGeometry args={[radius * 1.1, radius * 1.3, radius * 0.18]} />
          <meshStandardMaterial color={plate} metalness={0.6} roughness={0.35} flatShading />
        </mesh>
      ))}
      {/* Spinning armored band */}
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]} position={[0, radius * 0.4, 0]}>
        <torusGeometry args={[radius * 0.95, radius * 0.12, 6, 16]} />
        <meshStandardMaterial color={plate} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Glowing eyes */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * radius * 0.28, radius * 1.0, radius * 0.62]}>
          <sphereGeometry args={[radius * 0.12, 6, 6]} />
          <meshBasicMaterial color={'#ffd27a'} />
        </mesh>
      ))}
    </group>
  );
}

/** Ancient Forest Corruptor — act 1 boss (level 50). */
function Corruptor({ color, radius }: ModelProps) {
  const crown = useRef<Group>(null);
  const shards = useRef<Group>(null);
  const core = useRef<Mesh>(null);
  const spikes = useMemo(() => Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2), []);
  const orbiters = useMemo(() => Array.from({ length: 4 }, (_, i) => (i / 4) * Math.PI * 2), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (crown.current) crown.current.rotation.y = t * 0.5;
    if (shards.current) shards.current.rotation.y = -t * 0.8;
    if (core.current) {
      const m = core.current.material as MeshStandardMaterial;
      m.emissiveIntensity = 1.2 + Math.sin(t * 2.5) * 0.5;
    }
  });

  return (
    <group>
      {/* Dark aura */}
      <mesh scale={1.6}>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshBasicMaterial color={'#2a0512'} transparent opacity={0.35} depthWrite={false} />
      </mesh>
      {/* Jagged core */}
      <mesh ref={core} castShadow>
        <icosahedronGeometry args={[radius, 1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.3} roughness={0.25} metalness={0.3} flatShading />
      </mesh>
      {/* Crown of corrupted spikes */}
      <group ref={crown}>
        {spikes.map((a, i) => (
          <mesh key={i} position={[Math.cos(a) * radius * 0.95, radius * 0.2, Math.sin(a) * radius * 0.95]} rotation={[0, -a, Math.PI]}>
            <coneGeometry args={[radius * 0.16, radius * 0.8, 5]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} flatShading />
          </mesh>
        ))}
      </group>
      {/* Orbiting corrupted shards */}
      <group ref={shards}>
        {orbiters.map((a, i) => (
          <mesh key={i} position={[Math.cos(a) * radius * 1.7, Math.sin(a * 2) * radius * 0.4, Math.sin(a) * radius * 1.7]}>
            <octahedronGeometry args={[radius * 0.32, 0]} />
            <meshStandardMaterial color={'#a78bfa'} emissive={'#a78bfa'} emissiveIntensity={1.2} flatShading />
          </mesh>
        ))}
      </group>
      {/* Burning eyes */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * radius * 0.3, radius * 0.1, radius * 0.85]}>
          <sphereGeometry args={[radius * 0.14, 8, 8]} />
          <meshBasicMaterial color={'#fff2a0'} />
        </mesh>
      ))}
      <pointLight color={color} intensity={7} distance={16} />
    </group>
  );
}

/** Selects and renders the visual model for an enemy kind. */
export function EnemyModel({ kind, color, radius, opacity }: ModelProps & { kind: EnemyKind }) {
  switch (kind) {
    case 'goblin':
      return <GoblinScout color={color} radius={radius} opacity={opacity} />;
    case 'brute':
      return <MossBrute color={color} radius={radius} opacity={opacity} />;
    case 'wisp':
      return <ShadowWisp color={color} radius={radius} opacity={opacity} />;
    case 'treant':
      return <ArmoredTreant color={color} radius={radius} opacity={opacity} />;
    case 'corruptor':
      return <Corruptor color={color} radius={radius} opacity={opacity} />;
  }
}
