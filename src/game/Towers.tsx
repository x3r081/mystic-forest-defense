import { memo, useState } from 'react';
import { useGameStore, canEditTowers, type PlacedTower } from './store';
import { getTowerDef } from '../data/towerRegistry';
import { statsForPlaced, towerScaleForLevel } from '../data/towerStats';
import { getMergeCandidates } from '../data/mergeUtils';
import { TowerModel } from '../components/TowerModel';

const TowerUnit = memo(function TowerUnit({
  tower,
  selected,
  mergeHighlight,
}: {
  tower: PlacedTower;
  selected: boolean;
  mergeHighlight: boolean;
}) {
  const def = getTowerDef(tower.towerId);
  const screen = useGameStore((s) => s.screen);
  const phase = useGameStore((s) => s.phase);
  const selectPlacedTower = useGameStore((s) => s.selectPlacedTower);
  const [hovered, setHovered] = useState(false);

  const stats = statsForPlaced(tower.towerId, tower.level);
  const scale = towerScaleForLevel(tower.towerId, tower.level);
  const canInteract = canEditTowers({ screen, phase });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (!canInteract) return;
    selectPlacedTower(tower.id);
  };

  return (
    <group
      position={tower.position}
      scale={[scale, scale, scale]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={handleClick}
    >
      <TowerModel
        position={[0, 0, 0]}
        color={tower.color}
        visualKind={stats?.visualKind ?? def?.shape ?? 'archer'}
        level={tower.level}
        emissiveMul={stats?.emissiveMul ?? 1}
        selected={selected}
        mergeHighlight={mergeHighlight}
      />
      {(hovered || selected || mergeHighlight) && stats && def && (
        <RangeRing range={stats.range} color={def.projectileColor} />
      )}
    </group>
  );
});

export function Towers() {
  const placedTowers = useGameStore((s) => s.placedTowers);
  const selectedPlacedId = useGameStore((s) => s.selectedPlacedId);
  const screen = useGameStore((s) => s.screen);
  const phase = useGameStore((s) => s.phase);

  const selectedTower = placedTowers.find((t) => t.id === selectedPlacedId);
  const mergePartnerIds = new Set<number>();
  if (canEditTowers({ screen, phase }) && selectedTower) {
    for (const p of getMergeCandidates(selectedTower, placedTowers)) {
      mergePartnerIds.add(p.id);
    }
  }

  return (
    <>
      {placedTowers.map((t) => (
        <TowerUnit
          key={t.id}
          tower={t}
          selected={t.id === selectedPlacedId}
          mergeHighlight={mergePartnerIds.has(t.id)}
        />
      ))}
    </>
  );
}

export function RangeRing({
  range,
  color,
  valid = true,
}: {
  range: number;
  color: string;
  valid?: boolean;
}) {
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.09, 0]}>
      <mesh raycast={() => null}>
        <circleGeometry args={[range, 48]} />
        <meshBasicMaterial color={color} transparent opacity={valid ? 0.1 : 0.07} depthWrite={false} />
      </mesh>
      <mesh raycast={() => null}>
        <ringGeometry args={[range - 0.08, range, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} depthWrite={false} />
      </mesh>
    </group>
  );
}
