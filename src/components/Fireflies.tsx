import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { ShaderMaterial } from 'three';
import { theme } from '../data/theme';
import { getGlowTexture } from './textures';

interface FirefliesProps {
  count?: number;
  radius?: number;
  color?: string;
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  attribute float aSeed;
  varying float vTw;
  void main() {
    vec3 p = position;
    p.y += sin(uTime * 0.8 + aSeed) * 0.4;
    p.x += cos(uTime * 0.5 + aSeed * 1.3) * 0.35;
    p.z += sin(uTime * 0.4 + aSeed * 0.7) * 0.35;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vTw = 0.5 + 0.5 * sin(uTime * 2.5 + aSeed * 5.0);
    gl_PointSize = uSize * uPixelRatio * (0.55 + vTw) * (1.0 / -mv.z);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec3 uColor;
  varying float vTw;
  void main() {
    vec4 t = texture2D(uTex, gl_PointCoord);
    float a = t.a * (0.2 + 0.8 * vTw);
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

/**
 * A drifting cloud of glowing motes. Position drift and per-mote twinkle are
 * computed in a tiny shader from a stable seed, so they shimmer smoothly
 * without CPU work or wandering off over time.
 */
export function Fireflies({ count = 80, radius = 12, color = theme.colors.glow }: FirefliesProps) {
  const mat = useRef<ShaderMaterial>(null);
  const dpr = useThree((s) => s.gl.getPixelRatio());

  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * radius;
      positions[i * 3] = Math.cos(angle) * dist;
      positions[i * 3 + 1] = 0.5 + Math.random() * 5;
      positions[i * 3 + 2] = Math.sin(angle) * dist;
      seeds[i] = Math.random() * Math.PI * 2;
    }
    return { positions, seeds };
  }, [count, radius]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 26 },
      uPixelRatio: { value: dpr },
      uColor: { value: new THREE.Color(color) },
      uTex: { value: getGlowTexture() },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uColor.value.set(color);
    uniforms.uPixelRatio.value = dpr;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
