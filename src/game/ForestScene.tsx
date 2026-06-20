import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Ground } from '../components/Ground';
import { Tree } from '../components/Tree';
import { Fireflies } from '../components/Fireflies';
import { Relic } from '../components/Relic';
import { PostFX } from '../components/PostFX';
import { theme } from '../data/theme';

interface TreePlacement {
  position: [number, number, number];
  scale: number;
  swayOffset: number;
  glow: boolean;
}

/**
 * Procedurally scatters trees in a ring around the central relic,
 * leaving the middle clear so the crystal stays visible.
 */
function useForest(count: number): TreePlacement[] {
  return useMemo(() => {
    const trees: TreePlacement[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 5.5 + Math.random() * 9;
      trees.push({
        position: [Math.cos(angle) * dist, 0, Math.sin(angle) * dist],
        scale: 0.7 + Math.random() * 0.9,
        swayOffset: Math.random() * 10,
        glow: Math.random() > 0.7,
      });
    }
    return trees;
  }, [count]);
}

function SceneContents() {
  const trees = useForest(26);

  return (
    <>
      <color attach="background" args={[theme.colors.night]} />
      <fog attach="fog" args={[theme.colors.night, 14, 32]} />

      <ambientLight intensity={0.25} color={theme.colors.mist} />
      <hemisphereLight
        intensity={0.4}
        color={theme.colors.glow}
        groundColor={theme.colors.deepForest}
      />
      <directionalLight
        position={[6, 12, 4]}
        intensity={0.5}
        color={theme.colors.mist}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      <Ground />
      <Relic />
      {trees.map((t, i) => (
        <Tree key={i} {...t} />
      ))}
      <Fireflies count={90} radius={14} />

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={0.4}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 2.2}
      />

      <PostFX intensity={0.8} />
    </>
  );
}

/**
 * Full-screen R3F canvas rendering the ambient mystic forest backdrop.
 */
export function ForestScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 4.5, 13], fov: 50 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <SceneContents />
    </Canvas>
  );
}
