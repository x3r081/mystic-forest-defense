import { getWorldProps } from './world';
import { Tree } from '../components/Tree';
import { Mushroom } from '../components/Mushroom';
import { Crystal } from '../components/Crystal';
import { MossStone, FallenLog, Flower, TreeRoots, GroundRune, RuinArch, RuinFragment } from '../components/Scenery';
import { useGameStore } from './store';

/** Renders scenery for the active map (re-reads when mapId changes). */
export function WorldDecorations() {
  const mapId = useGameStore((s) => s.mapId);
  const props = getWorldProps(mapId);

  return (
    <>
      {props.map((p) => {
        switch (p.kind) {
          case 'tree':
            return (
              <Tree
                key={`${mapId}-${p.id}`}
                position={p.position}
                scale={p.scale}
                rotation={p.rotation}
                variant={p.variant}
                glow={p.placementBlocker && p.variant === 0}
                swayOffset={p.position[0]}
              />
            );
          case 'mushroom':
            return <Mushroom key={`${mapId}-${p.id}`} position={p.position} scale={p.scale} rotation={p.rotation} variant={p.variant} />;
          case 'crystal':
            return <Crystal key={`${mapId}-${p.id}`} position={p.position} scale={p.scale} rotation={p.rotation} variant={p.variant} />;
          case 'stone':
            return <MossStone key={`${mapId}-${p.id}`} position={p.position} scale={p.scale} rotation={p.rotation} variant={p.variant} />;
          case 'log':
            return <FallenLog key={`${mapId}-${p.id}`} position={p.position} scale={p.scale} rotation={p.rotation} variant={p.variant} />;
          case 'flower':
            return <Flower key={`${mapId}-${p.id}`} position={p.position} scale={p.scale} rotation={p.rotation} variant={p.variant} />;
          case 'roots':
            return <TreeRoots key={`${mapId}-${p.id}`} position={p.position} scale={p.scale} rotation={p.rotation} />;
          case 'rune':
            return <GroundRune key={`${mapId}-${p.id}`} position={p.position} scale={p.scale} rotation={p.rotation} variant={p.variant} />;
          case 'arch':
            return <RuinArch key={`${mapId}-${p.id}`} position={p.position} scale={p.scale} rotation={p.rotation} variant={p.variant} />;
          case 'ruin':
            return <RuinFragment key={`${mapId}-${p.id}`} position={p.position} scale={p.scale} rotation={p.rotation} variant={p.variant} />;
          default:
            return null;
        }
      })}
    </>
  );
}
