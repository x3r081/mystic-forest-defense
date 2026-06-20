import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

interface PostFXProps {
  /** Overall bloom strength; raised slightly on boss/finale levels. */
  intensity?: number;
}

/**
 * Screen-space polish: a soft mip-blurred bloom that makes only the brightest
 * emissive elements (path core, crystals, fireflies, projectiles) glow, plus a
 * gentle vignette that frames the action and keeps the readable center bright.
 *
 * NOTE: `multisampling` must stay 0 here — enabling MSAA on the composer's
 * render target produces a black frame with this three/postprocessing combo.
 */
export function PostFX({ intensity = 0.6 }: PostFXProps) {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom
        intensity={intensity}
        luminanceThreshold={0.62}
        luminanceSmoothing={0.4}
        radius={0.7}
        mipmapBlur
      />
      <Vignette offset={0.3} darkness={0.55} eskil={false} />
    </EffectComposer>
  );
}
