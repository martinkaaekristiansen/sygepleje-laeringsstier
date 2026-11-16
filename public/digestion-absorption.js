// Schematic routes within the existing jejunal lumen, never a camera zoom.
export const ABSORPTION_ANCHORS = {
  lumen: [-0.65, 0.7, -4.6],
  apical: [0.6, 0.7, -4.8],
  cell: [0.88, 0.35, -5.05],
  basal: [1.12, 0.1, -5.25],
  blood: [1.38, -0.75, -5.55],
  lymph: [1.75, -0.75, -5.4],
};
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
export function absorptionPoint(character, mode, age, index = 0) {
  const a = ABSORPTION_ANCHORS,
    seconds = Math.max(0, age),
    end = character === 'trine' ? a.lymph : a.blood;
  let p, compartment;
  if (mode === 'absorb') {
    const t = Math.min(1, seconds / 5),
      f = t < 0.6 ? t / 0.6 : (t - 0.6) / 0.4;
    p =
      character === 'trine'
        ? t < 0.6
          ? lerp(a.lumen, a.apical, f)
          : lerp(a.apical, a.cell, f)
        : lerp(a.apical, a.cell, t);
    compartment = (character === 'trine' ? t < 0.6 : t === 0) ? 'lumen' : 'epithelium';
  } else {
    const t =
      character === 'trine'
        ? Math.max(0, Math.min(1, (seconds - 2) / 3))
        : Math.min(1, seconds / 5);
    p = t < 0.35 ? lerp(a.cell, a.basal, t / 0.35) : lerp(a.basal, end, (t - 0.35) / 0.65);
    compartment = t < 0.35 ? 'epithelium' : character === 'trine' ? 'lymph' : 'blood';
  }
  return {
    position: [p[0], p[1] + ((index % 3) - 1) * 0.12, p[2] + Math.floor(index / 3) * 0.05],
    compartment,
  };
}
