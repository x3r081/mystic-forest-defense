import { theme } from '../data/theme';

/**
 * A large circular forest floor with a faint mist disc layered on top.
 */
export function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[20, 48]} />
        <meshStandardMaterial color={theme.colors.deepForest} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0, 8, 48]} />
        <meshStandardMaterial
          color={theme.colors.forest}
          emissive={theme.colors.moss}
          emissiveIntensity={0.08}
          roughness={0.9}
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  );
}
