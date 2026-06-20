import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh } from 'three';
import type { TowerVisualKind } from '../data/hybridTowers';
import { randomPhase } from '../game/animation';

export interface TowerModelProps {
  position: [number, number, number];
  color: string;
  visualKind: TowerVisualKind;
  level?: number;
  emissiveMul?: number;
  selected?: boolean;
  mergeHighlight?: boolean;
}

function glowMat(color: string, emissiveMul: number, intensity = 1.2) {
  return (
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={intensity * emissiveMul}
      roughness={0.25}
      metalness={0.35}
      flatShading
    />
  );
}

function StoneBase({ height, scale, runes }: { height: number; scale: number; runes: boolean }) {
  return (
    <group>
      <mesh position={[0, height * 0.35, 0]} castShadow scale={[scale, 1, scale]}>
        <cylinderGeometry args={[0.52, 0.68, height * 0.7, 8]} />
        <meshStandardMaterial color="#2a2440" roughness={0.88} />
      </mesh>
      <mesh position={[0, height * 0.72, 0]} castShadow scale={[scale, 1, scale]}>
        <cylinderGeometry args={[0.58, 0.5, height * 0.22, 8]} />
        <meshStandardMaterial color="#3a3358" roughness={0.75} />
      </mesh>
      {runes &&
        [0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.42 * scale, height * 0.45, Math.sin(a) * 0.42 * scale]} rotation={[0, -a, 0]}>
              <boxGeometry args={[0.08, 0.28, 0.04]} />
              <meshStandardMaterial color="#7ef9c4" emissive="#7ef9c4" emissiveIntensity={0.8} />
            </mesh>
          );
        })}
    </group>
  );
}

function LevelOrnaments({ level, color, scale }: { level: number; color: string; scale: number }) {
  if (level < 2) return null;
  return (
    <group>
      {level >= 2 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
          <ringGeometry args={[0.48 * scale, 0.62 * scale, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.35 + level * 0.06} depthWrite={false} />
        </mesh>
      )}
      {level >= 4 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
          <ringGeometry args={[0.72 * scale, 0.88 * scale, 40]} />
          <meshBasicMaterial color={color} transparent opacity={0.22} depthWrite={false} />
        </mesh>
      )}
      {level >= 5 && (
        <group position={[0, 2.6 * scale, 0]}>
          <mesh>
            <torusGeometry args={[0.22, 0.05, 8, 24]} />
            <meshStandardMaterial color="#ffe080" emissive="#ffe080" emissiveIntensity={1.5} metalness={0.6} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[Math.cos(i * 2.1) * 0.35, 0.15, Math.sin(i * 2.1) * 0.35]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshBasicMaterial color="#fff8c0" toneMapped={false} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

function MoonArcherHead({ color, emissiveMul, level }: { color: string; emissiveMul: number; level: number }) {
  return (
    <group>
      <mesh position={[-0.35, 0.15, 0]} rotation={[0, 0, -0.5]} castShadow>
        <torusGeometry args={[0.28, 0.05, 8, 16, Math.PI]} />
        {glowMat(color, emissiveMul, 1.4)}
      </mesh>
      <mesh position={[0.1, 0.1, 0]} rotation={[0, 0, 0.3]} castShadow>
        <boxGeometry args={[0.55, 0.06, 0.06]} />
        <meshStandardMaterial color="#4a5070" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0.45, 0.22, 0]} rotation={[Math.PI / 2, 0, -Math.PI / 2]} castShadow>
        <coneGeometry args={[0.08, 0.5, 4]} />
        {glowMat('#eaf4ff', emissiveMul, 1.6)}
      </mesh>
      <mesh castShadow>
        <octahedronGeometry args={[0.22 + level * 0.03, 0]} />
        {glowMat(color, emissiveMul, 1.5)}
      </mesh>
      {level >= 3 && (
        <mesh position={[0, -0.35, 0.2]} rotation={[0.4, 0, 0]}>
          <planeGeometry args={[0.2, 0.2]} />
          <meshBasicMaterial color="#c0e0ff" transparent opacity={0.7} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

function CrystalCannonHead({ color, emissiveMul, level }: { color: string; emissiveMul: number; level: number }) {
  return (
    <group>
      <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.32, 0.9, 6]} />
        <meshStandardMaterial color="#3a3358" roughness={0.7} />
      </mesh>
      <mesh position={[0.45, 0, 0]} castShadow>
        <icosahedronGeometry args={[0.38 + level * 0.04, 0]} />
        {glowMat(color, emissiveMul, 1.3)}
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0.15, (i - 1) * 0.18, 0.28]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.12, 0.35, 0.06]} />
          {glowMat(color, emissiveMul * 0.8, 1)}
        </mesh>
      ))}
    </group>
  );
}

function ThornSpireHead({ color, emissiveMul, level }: { color: string; emissiveMul: number; level: number }) {
  return (
    <group>
      <mesh castShadow>
        <cylinderGeometry args={[0.12, 0.22, 0.55, 5]} />
        <meshStandardMaterial color="#2a4030" roughness={0.85} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.25, 0.35 + (i % 2) * 0.15, Math.sin(a) * 0.25]} rotation={[0.2, -a, 0.4]}>
            <coneGeometry args={[0.07, 0.45 + level * 0.05, 4]} />
            {glowMat(color, emissiveMul, 1.2)}
          </mesh>
        );
      })}
    </group>
  );
}

function FireflyShrineHead({ color, emissiveMul, level }: { color: string; emissiveMul: number; level: number }) {
  const motes = 3 + Math.min(level, 3);
  return (
    <group>
      <mesh position={[0, -0.15, 0]} castShadow>
        <boxGeometry args={[0.5, 0.35, 0.5]} />
        <meshStandardMaterial color="#4a3820" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.15, 0]} castShadow>
        <coneGeometry args={[0.35, 0.5, 4]} />
        {glowMat('#ffd080', emissiveMul, 0.9)}
      </mesh>
      <mesh castShadow>
        <sphereGeometry args={[0.24 + level * 0.03, 12, 12]} />
        {glowMat(color, emissiveMul, 1.7)}
      </mesh>
      {Array.from({ length: motes }).map((_, i) => {
        const a = (i / motes) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.55, Math.sin(a * 0.5) * 0.2, Math.sin(a) * 0.55]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}

function OakGuardianHead({ color, emissiveMul, level }: { color: string; emissiveMul: number; level: number }) {
  return (
    <group>
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.38, 0.7, 6]} />
        <meshStandardMaterial color="#3a2a18" roughness={0.9} />
      </mesh>
      <mesh position={[-0.45, 0.55, 0]} rotation={[0, 0, 0.8]} castShadow>
        <cylinderGeometry args={[0.06, 0.1, 0.75, 5]} />
        <meshStandardMaterial color="#5a4028" roughness={0.85} />
      </mesh>
      <mesh position={[0.45, 0.55, 0]} rotation={[0, 0, -0.8]} castShadow>
        <cylinderGeometry args={[0.06, 0.1, 0.75, 5]} />
        <meshStandardMaterial color="#5a4028" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.75, 0]} castShadow>
        <icosahedronGeometry args={[0.42 + level * 0.04, 0]} />
        {glowMat(color, emissiveMul, 1.2)}
      </mesh>
      <mesh position={[-0.12, 0.95, 0.32]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#ffe080" emissive="#ffe080" emissiveIntensity={2} />
      </mesh>
      <mesh position={[0.12, 0.95, 0.32]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#ffe080" emissive="#ffe080" emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

function HybridHead({ kind, color, emissiveMul, level }: { kind: TowerVisualKind; color: string; emissiveMul: number; level: number }) {
  switch (kind) {
    case 'lunar-ballista':
      return (
        <group>
          <MoonArcherHead color={color} emissiveMul={emissiveMul} level={level} />
          <mesh position={[0.5, 0, 0]} castShadow>
            <icosahedronGeometry args={[0.25, 0]} />
            {glowMat('#a9ffe9', emissiveMul, 1.4)}
          </mesh>
        </group>
      );
    case 'briar-ranger':
      return (
        <group>
          <MoonArcherHead color={color} emissiveMul={emissiveMul} level={level} />
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[(i - 1) * 0.2, -0.2, 0.35]} rotation={[0.5, 0, 0]}>
              <coneGeometry args={[0.06, 0.35, 4]} />
              {glowMat('#86e07a', emissiveMul, 1.3)}
            </mesh>
          ))}
        </group>
      );
    case 'starfire-grove':
      return (
        <group>
          <MoonArcherHead color={color} emissiveMul={emissiveMul} level={level} />
          <FireflyShrineHead color="#ffd27a" emissiveMul={emissiveMul} level={level} />
        </group>
      );
    case 'rootquake-obelisk':
      return (
        <group>
          <CrystalCannonHead color={color} emissiveMul={emissiveMul} level={level} />
          <mesh position={[0, -0.3, 0]}>
            <cylinderGeometry args={[0.15, 0.35, 0.5, 5]} />
            {glowMat('#86e07a', emissiveMul, 1.1)}
          </mesh>
        </group>
      );
    case 'titan-grove-cannon':
      return (
        <group scale={1.15}>
          <CrystalCannonHead color={color} emissiveMul={emissiveMul} level={level} />
          <OakGuardianHead color="#cbab6a" emissiveMul={emissiveMul * 0.9} level={level} />
        </group>
      );
    case 'ember-vine-spire':
      return (
        <group>
          <ThornSpireHead color={color} emissiveMul={emissiveMul} level={level} />
          <mesh position={[0, 0.5, 0]}>
            <sphereGeometry args={[0.2, 10, 10]} />
            {glowMat('#ffd27a', emissiveMul, 1.6)}
          </mesh>
        </group>
      );
    case 'solar-oak-shrine':
      return (
        <group>
          <OakGuardianHead color={color} emissiveMul={emissiveMul} level={level} />
          <FireflyShrineHead color="#ffd27a" emissiveMul={emissiveMul} level={level + 1} />
        </group>
      );
    case 'elderthorn-sentinel':
      return (
        <group scale={1.1}>
          <OakGuardianHead color={color} emissiveMul={emissiveMul} level={level} />
          <ThornSpireHead color="#86e07a" emissiveMul={emissiveMul} level={level + 1} />
        </group>
      );
    default:
      return <MoonArcherHead color={color} emissiveMul={emissiveMul} level={level} />;
  }
}

function TowerHead({
  visualKind,
  color,
  emissiveMul,
  level,
}: {
  visualKind: TowerVisualKind;
  color: string;
  emissiveMul: number;
  level: number;
}) {
  const baseShapes = ['archer', 'cannon', 'thorn', 'firefly', 'oak'] as const;
  if ((baseShapes as readonly string[]).includes(visualKind)) {
    switch (visualKind) {
      case 'archer':
        return <MoonArcherHead color={color} emissiveMul={emissiveMul} level={level} />;
      case 'cannon':
        return <CrystalCannonHead color={color} emissiveMul={emissiveMul} level={level} />;
      case 'thorn':
        return <ThornSpireHead color={color} emissiveMul={emissiveMul} level={level} />;
      case 'firefly':
        return <FireflyShrineHead color={color} emissiveMul={emissiveMul} level={level} />;
      case 'oak':
        return <OakGuardianHead color={color} emissiveMul={emissiveMul} level={level} />;
    }
  }
  return <HybridHead kind={visualKind} color={color} emissiveMul={emissiveMul} level={level} />;
}

export function TowerModel({
  position,
  color,
  visualKind,
  level = 1,
  emissiveMul = 1,
  selected = false,
  mergeHighlight = false,
}: TowerModelProps) {
  const emitter = useRef<Group>(null);
  const halo = useRef<Mesh>(null);
  const baseHeight = visualKind === 'oak' || visualKind === 'elderthorn-sentinel' || visualKind === 'titan-grove-cannon' ? 1.0 : 0.72;
  const scale = 1 + (level - 1) * 0.06;
  const float = useMemo(() => randomPhase(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime + float;
    if (emitter.current) {
      emitter.current.rotation.y = t * 0.75;
      emitter.current.position.y = baseHeight + 0.75 + Math.sin(t * 1.5) * 0.08;
    }
    if (halo.current) halo.current.rotation.z += 0.012;
  });

  const haloColor = mergeHighlight ? '#c080ff' : selected ? '#ffe080' : color;

  return (
    <group position={position}>
      <StoneBase height={baseHeight} scale={scale} runes={level >= 3} />
      <LevelOrnaments level={level} color={color} scale={scale} />

      <group ref={emitter} position={[0, baseHeight + 0.75, 0]} scale={[scale, scale, scale]}>
        <TowerHead visualKind={visualKind} color={color} emissiveMul={emissiveMul} level={level} />
      </group>

      <mesh ref={halo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.55 * scale, 0.74 * scale, 32]} />
        <meshBasicMaterial color={haloColor} transparent opacity={0.3 + level * 0.08} depthWrite={false} />
      </mesh>

      {(selected || mergeHighlight) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <ringGeometry args={[0.78 * scale, 0.92 * scale, 40]} />
          <meshBasicMaterial color={haloColor} transparent opacity={0.55} depthWrite={false} />
        </mesh>
      )}

      <pointLight
        position={[0, baseHeight + 0.85, 0]}
        color={color}
        intensity={1.3 * emissiveMul}
        distance={5 + level}
      />
    </group>
  );
}

/** @deprecated use visualKind */
export type { TowerVisualKind };
