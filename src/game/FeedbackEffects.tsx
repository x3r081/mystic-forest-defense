import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Group, Mesh, MeshBasicMaterial } from 'three';
import {
  subscribeBurst,
  subscribeFloating,
  subscribeBaseHit,
  subscribeClear,
  notifyParticleRemoved,
  type Burst,
  type FloatingText,
  type BaseHit,
} from './effects';
import { getQualityBudgets } from './performance';
import { easeOutQuad } from './animation';
import './effects.css';

const BURST_LIFE = 0.6;
const BASE_HIT_LIFE = 0.9;
const SHARD_COUNT = 9;

function shardCountForQuality(): number {
  const q = getQualityBudgets();
  if (q.maxBursts <= 6) return 5;
  if (q.maxBursts <= 10) return 7;
  return SHARD_COUNT;
}

/** A single rising text label (damage number / coin gain), rendered as crisp DOM. */
function FloatingLabel({ f, onDone }: { f: FloatingText; onDone: (id: number) => void }) {
  return (
    <Html position={f.position} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div
        className={`fx-float fx-${f.variant}`}
        onAnimationEnd={() => {
          notifyParticleRemoved('float');
          onDone(f.id);
        }}
      >
        {f.text}
      </div>
    </Html>
  );
}

/** An expanding shower of glowing shards plus a quick flash, for enemy deaths. */
function DeathBurst({ b, onDone }: { b: Burst; onDone: (id: number) => void }) {
  const group = useRef<Group>(null);
  const flash = useRef<Mesh>(null);
  const t = useRef(0);
  const shardN = shardCountForQuality();

  const shards = useMemo(
    () =>
      Array.from({ length: shardN }, () => ({
        dir: new THREE.Vector3(
          Math.random() * 2 - 1,
          Math.random() * 1.3 + 0.2,
          Math.random() * 2 - 1,
        ).normalize(),
        speed: 1.8 + Math.random() * 2.6,
        spin: (Math.random() - 0.5) * 8,
      })),
    [shardN],
  );

  useFrame((_, delta) => {
    t.current += delta;
    const p = t.current / BURST_LIFE;
    if (p >= 1) {
      notifyParticleRemoved('burst');
      onDone(b.id);
      return;
    }
    const out = easeOutQuad(p);

    if (group.current) {
      group.current.children.forEach((child, i) => {
        const s = shards[i];
        if (!s) return;
        const d = s.speed * out;
        child.position.set(s.dir.x * d, s.dir.y * d, s.dir.z * d);
        const sc = (1 - p) * 0.9;
        child.scale.setScalar(Math.max(0.001, sc));
        child.rotation.x += s.spin * delta;
        child.rotation.y += s.spin * delta;
        const m = (child as Mesh).material as MeshBasicMaterial;
        m.opacity = 1 - p;
      });
    }

    if (flash.current) {
      flash.current.scale.setScalar(0.4 + out * 2.4);
      (flash.current.material as MeshBasicMaterial).opacity = (1 - p) * 0.55;
    }
  });

  return (
    <group position={b.position}>
      {/* Quick light flash */}
      <mesh ref={flash}>
        <sphereGeometry args={[0.4, 12, 12]} />
        <meshBasicMaterial color={b.color} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      {/* Scattering shards */}
      <group ref={group}>
        {shards.map((_, i) => (
          <mesh key={i}>
            <octahedronGeometry args={[0.13, 0]} />
            <meshBasicMaterial color={b.color} transparent depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** A red shockwave ring + flash at the base when an enemy breaks through. */
function BaseHitWave({ b, onDone }: { b: BaseHit; onDone: (id: number) => void }) {
  const ring = useRef<Mesh>(null);
  const flash = useRef<Mesh>(null);
  const t = useRef(0);
  const maxR = 2 + b.power * 5;

  useFrame((_, delta) => {
    t.current += delta;
    const p = t.current / BASE_HIT_LIFE;
    if (p >= 1) {
      notifyParticleRemoved('base');
      onDone(b.id);
      return;
    }
    const out = easeOutQuad(p);
    if (ring.current) {
      const r = 0.6 + out * maxR;
      ring.current.scale.set(r, r, r);
      (ring.current.material as MeshBasicMaterial).opacity = (1 - p) * 0.8;
    }
    if (flash.current) {
      flash.current.scale.setScalar(1 + out * 2 * b.power);
      (flash.current.material as MeshBasicMaterial).opacity = (1 - p) * 0.7 * b.power;
    }
  });

  return (
    <group position={b.position}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <ringGeometry args={[0.82, 1, 40]} />
        <meshBasicMaterial color={'#ff3b5c'} transparent opacity={0.8} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={flash} position={[0, 1, 0]}>
        <sphereGeometry args={[0.9, 14, 14]} />
        <meshBasicMaterial color={'#ff6a86'} transparent opacity={0.6} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Subscribes to the effects bus and renders all active floating text + bursts. */
export function Effects() {
  const [floats, setFloats] = useState<FloatingText[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [baseHits, setBaseHits] = useState<BaseHit[]>([]);

  useEffect(() => {
    const maxF = getQualityBudgets().maxFloating;
    const maxB = getQualityBudgets().maxBursts;
    const maxH = getQualityBudgets().maxBaseHits;
    const offF = subscribeFloating((f) =>
      setFloats((prev) => [...prev, f].slice(-maxF)),
    );
    const offB = subscribeBurst((b) =>
      setBursts((prev) => [...prev, b].slice(-maxB)),
    );
    const offH = subscribeBaseHit((h) =>
      setBaseHits((prev) => [...prev, h].slice(-maxH)),
    );
    const offC = subscribeClear(() => {
      setFloats([]);
      setBursts([]);
      setBaseHits([]);
    });
    return () => {
      offF();
      offB();
      offH();
      offC();
    };
  }, []);

  const removeFloat = (id: number) => setFloats((prev) => prev.filter((f) => f.id !== id));
  const removeBurst = (id: number) => setBursts((prev) => prev.filter((b) => b.id !== id));
  const removeBaseHit = (id: number) => setBaseHits((prev) => prev.filter((b) => b.id !== id));

  return (
    <>
      {floats.map((f) => (
        <FloatingLabel key={f.id} f={f} onDone={removeFloat} />
      ))}
      {bursts.map((b) => (
        <DeathBurst key={b.id} b={b} onDone={removeBurst} />
      ))}
      {baseHits.map((b) => (
        <BaseHitWave key={b.id} b={b} onDone={removeBaseHit} />
      ))}
    </>
  );
}
