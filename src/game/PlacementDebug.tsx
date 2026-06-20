import { useEffect, useMemo, useState } from 'react';
import {
  getPlacementGeometry,
  towerFootprint,
  type Footprint,
} from './collision';
import { useGameStore } from './store';

function FootprintDiscs({ zones, color, opacity = 0.35 }: { zones: Footprint[]; color: string; opacity?: number }) {
  return (
    <>
      {zones.map((z, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[z.x, 0.14, z.z]} raycast={() => null}>
          <circleGeometry args={[Math.max(z.r, 0.05), 24]} />
          <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

/**
 * Dev overlay (P key): selected tower footprint, path zones, tower bases, major blockers.
 */
export function PlacementDebug() {
  const mapId = useGameStore((s) => s.mapId);
  const placedTowers = useGameStore((s) => s.placedTowers);
  const [show, setShow] = useState(import.meta.env.DEV);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') setShow((s) => !s);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { pathZones, blockers } = useMemo(() => getPlacementGeometry(mapId), [mapId]);

  const towerFootprints = useMemo(
    () => placedTowers.map((t) => towerFootprint(t.position[0], t.position[2], t.towerId)),
    [placedTowers],
  );

  if (!import.meta.env.DEV || !show) return null;

  return (
    <group key={mapId}>
      <FootprintDiscs zones={pathZones} color="#ff5470" opacity={0.22} />
      <FootprintDiscs zones={blockers} color="#ff8844" opacity={0.45} />
      <FootprintDiscs zones={towerFootprints} color="#8899ff" opacity={0.4} />
    </group>
  );
}
