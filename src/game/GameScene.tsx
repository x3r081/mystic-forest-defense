import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Fireflies } from '../components/Fireflies';
import { Path } from '../components/Path';
import { Portal } from '../components/Portal';
import { Enemies } from './Enemies';
import { Towers } from './Towers';
import { Projectiles } from './Projectiles';
import { Effects } from './FeedbackEffects';
import { PlacementSystem } from './Placement';
import { WorldDecorations } from './WorldDecorations';
import { PlacementDebug } from './PlacementDebug';
import { CombatSim } from './CombatSim';
import { Backdrop } from '../components/Backdrop';
import { FogParticles } from '../components/FogParticles';
import { Grass } from '../components/Grass';
import { PostFX } from '../components/PostFX';
import { getMap } from '../data/maps';
import { getWorldForMap, mapRevision } from './world';
import { useGameStore } from './store';
import { getLevel } from '../data/levels';
import { easeOutCubic } from './animation';
import { getQualityBudgets, scaledDecorCount } from './performance';

function GroundField({ mapId }: { mapId: ReturnType<typeof useGameStore.getState>['mapId'] }) {
  const world = getWorldForMap(mapId);
  const patches = world.config.groundPatches;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 36]} />
        <meshStandardMaterial color={world.groundColor} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[40, 18]} />
        <meshBasicMaterial color={world.pathAuraColor} transparent opacity={0.25} />
      </mesh>
      {patches.map((p, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[p.x, 0.012, p.z]} raycast={() => null}>
          <circleGeometry args={[p.r, 32]} />
          <meshBasicMaterial color={p.color} transparent opacity={p.opacity} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function CameraRig() {
  const { camera, pointer } = useThree();
  if (import.meta.env.DEV) {
    (window as unknown as { __cam?: THREE.Camera }).__cam = camera;
  }
  const base = useMemo(() => new THREE.Vector3(0, 17, 19), []);
  const target = useMemo(() => new THREE.Vector3(0, 1.5, 0), []);
  const intro = useRef(0);
  const lastLevel = useRef(-1);

  useFrame((state, delta) => {
    const level = useGameStore.getState().level;
    if (level !== lastLevel.current) {
      lastLevel.current = level;
      intro.current = 0;
    }
    intro.current = Math.min(1, intro.current + delta / 1.7);
    const e = easeOutCubic(intro.current);
    const lift = (1 - e) * 7;
    const pullBack = (1 - e) * 6;
    const breathe = Math.sin(state.clock.elapsedTime * 0.28) * 0.18;

    camera.position.x += (base.x + pointer.x * 2.5 - camera.position.x) * 0.05;
    camera.position.y += (base.y + lift + breathe + pointer.y * 1.5 - camera.position.y) * 0.06;
    camera.position.z += (base.z + pullBack - camera.position.z) * 0.06;
    camera.lookAt(target);
  });

  return null;
}

function SceneContents() {
  const level = useGameStore((s) => s.level);
  const mapId = useGameStore((s) => s.mapId);
  const mapConfig = getMap(mapId);
  const lighting = mapConfig.lightingConfig;
  const v = getLevel(level).visual;
  const world = getWorldForMap(mapId);
  const spawn = world.spawnPoint;
  const base = world.basePoint;
  const quality = getQualityBudgets();
  const sceneKey = `${mapId}-${mapRevision}`;

  const fireflyMain = scaledDecorCount(v.fireflyCount);
  const fireflySecondary = scaledDecorCount(28);
  const fogMain = scaledDecorCount(22);
  const fogSecondary = scaledDecorCount(16);
  const grassCount = scaledDecorCount(460);

  return (
    <>
      <color attach="background" args={[lighting.background]} />
      <fog attach="fog" args={[lighting.fog, lighting.fogNear * (quality.fogMul > 0.5 ? 1 : 1.15), lighting.fogFar]} />

      <Backdrop top={lighting.background} bottom={lighting.fog} accent={lighting.accent} />

      <ambientLight intensity={lighting.ambient} color={lighting.ambientColor} />
      <hemisphereLight intensity={0.5} color={lighting.accent} groundColor={world.groundColor} />
      <directionalLight
        position={[8, 18, 10]}
        intensity={0.55}
        color={lighting.directionalColor}
        castShadow={quality.shadowMap > 0}
        shadow-mapSize={[quality.shadowMap || 512, quality.shadowMap || 512]}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />
      <pointLight position={[0, 8, 6]} intensity={lighting.accentIntensity} color={lighting.accent} distance={42} />
      {lighting.moonLight && (
        <pointLight
          position={lighting.moonLight.position}
          intensity={lighting.moonLight.intensity}
          color={lighting.moonLight.color}
          distance={35}
        />
      )}

      <group key={sceneKey}>
        <GroundField mapId={mapId} />
        <Path mapId={mapId} color={lighting.pathColor} />

        <Portal position={[spawn.x, 0, spawn.z]} color={lighting.accent} variant="rift" />
        <Portal position={[base.x, 0, base.z]} color={lighting.pathColor} variant="base" />

        <WorldDecorations />

        <Grass count={grassCount} color={world.grassColor} seed={world.scatterSeed} mapId={mapId} />
        <Fireflies count={fireflyMain} radius={20} color={lighting.fireflyColor} />
        <Fireflies count={fireflySecondary} radius={26} color={lighting.fireflySecondary} />
        <FogParticles count={fogMain} color={lighting.accent} />
        <FogParticles count={fogSecondary} color={lighting.fogSecondary} />
      </group>

      <CombatSim />
      <Towers />
      <PlacementSystem />
      <Enemies />
      <Projectiles />
      <Effects />
      <PlacementDebug />

      <CameraRig />
      <PostFX intensity={quality.postFxIntensity} />
    </>
  );
}

export function GameScene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 17, 19], fov: 42 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <SceneContents />
    </Canvas>
  );
}
