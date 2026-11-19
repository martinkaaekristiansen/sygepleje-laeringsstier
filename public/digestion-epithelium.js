// Frozen timing reference for legacy physiology regression tests.
// The game uses digestion-uptake.js; cutaway and vascular renderers are retired.
import * as T from './three.module.min.js';

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * T.MathUtils.clamp(t, 0, 1));
const A = {
  lumen: [-1.25, 0.65, 1.6],
  apical: [-0.7, 0.3, 0.8],
  cell: [0, 0.1, 0.03],
  basal: [0, -0.45, -0.72],
  blood: [-1.1, -1.1, -1.05],
  lymph: [1.1, -1.1, -1.05],
};
export function epithelialTimeline(character, mode, age) {
  const t = Math.max(0, age),
    fat = character === 'trine',
    protein = character === 'poul';
  if (mode === 'absorb') {
    const cross = fat ? Math.max(0, (t - 2.5) / 3) : t / 5;
    const delivery = [-0.7, 0.3, 1.1];
    // Cargo accompanies the micelle to the brush border, then leaves its coat.
    const apicalApproach = fat
      ? t < 2.5
        ? mix(A.lumen, delivery, t / 2.5)
        : mix(delivery, A.apical, (t - 2.5) / 1.5)
      : mix(A.lumen, A.apical, cross * 2);
    return {
      position: cross < 0.5 ? apicalApproach : mix(A.apical, A.cell, (cross - 0.5) * 2),
      compartment: cross < 0.5 ? 'lumen' : 'epithelium',
      phase: fat
        ? t < 2
          ? 'micelle-assembly'
          : t < 3
            ? 'micelle-delivery'
            : t < 5.5
              ? 'lipid-uptake'
              : 'intracellular-lipids'
        : protein
          ? t < 2.5
            ? 'aa-and-peptide-uptake'
            : t < 4
              ? 'pept1-uptake'
              : 'intracellular-peptide-hydrolysis'
          : 'glucose-sglt1-uptake',
      hydrolysed: protein && t >= 4,
      micelleCrosses: false,
      intactProteinCrosses: false,
      intactTriglycerideCrosses: false,
    };
  }
  const route = fat ? 'lymph' : 'blood',
    start = fat ? 4 : 0;
  const cellFraction = fat ? 0.25 : 0.4;
  const f = T.MathUtils.clamp((t - start) / 4, 0, 1);
  const end = A[route];
  const p =
    f < cellFraction
      ? mix(A.cell, A.basal, f / cellFraction)
      : mix(A.basal, end, (f - cellFraction) / (1 - cellFraction));
  // Continuations are explicitly schematic: portal blood -> liver; lymph ->
  // thoracic duct -> left venous angle -> systemic blood (never vena portae).
  const onward = T.MathUtils.clamp((t - (fat ? 8 : 4)) / 3.5, 0, 1);
  return {
    position: onward ? mix(end, [fat ? 1.8 : -1.8, -2.15, 0.1], onward) : p,
    compartment: f < cellFraction ? 'epithelium' : route,
    phase: fat
      ? t < 2.5
        ? 'reesterification'
        : t < 4
          ? 'chylomicron-assembly'
          : t < 8
            ? 'lacteal-transport'
            : 'lymph-to-systemic-blood'
      : t < 4
        ? 'basolateral-to-capillary'
        : 'portal-to-liver',
    destination: fat ? 'systemic-blood-via-lymph' : 'liver-via-portal-blood',
    hydrolysed: protein,
    micelleCrosses: false,
    intactProteinCrosses: false,
    intactTriglycerideCrosses: false,
  };
}

// A rasterized aperture avoids projecting a viewing ray for every wall/villus
// fragment. The same wall-anchored circle follows motility and free look.
