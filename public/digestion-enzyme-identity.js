// Teaching symbols, not claims about the molecular shape of these proteins.
// Identity is independent of answer position and shared by SVG and Three.js.
export const ENZYME_IDENTITIES = {
  'salivary-amylase': { color: '#65d6ec', lobes: 3, depth: 0.18, aspect: 1.15 },
  'pancreatic-amylase': { color: '#4da9f5', lobes: 4, depth: 0.16, aspect: 1.12 },
  amylase: { color: '#65d6ec', lobes: 3, depth: 0.18, aspect: 1.15 },
  pepsin: { color: '#e975a9', lobes: 2, depth: 0.25, aspect: 0.8 },
  lipase: { color: '#f28a57', lobes: 5, depth: 0.18, aspect: 1.2 },
  trypsin: { color: '#93dc85', lobes: 3, depth: 0.3, aspect: 0.75 },
  maltase: { color: '#f4cd62', lobes: 6, depth: 0.13, aspect: 1 },
  peptidase: { color: '#b69cf0', lobes: 4, depth: 0.28, aspect: 0.8 },
  bile: { color: '#c7ce69', lobes: 0, depth: 0, aspect: 0.65 },
};
export function enzymeIdentity(label) {
  const s = label.toLowerCase();
  const id = s.includes('galde') ? 'bile'
    : s.includes('spytamylase') && !s.includes('bugspyt') ? 'salivary-amylase'
    : s.includes('bugspytamylase') ? 'pancreatic-amylase'
    : s.includes('amylase') ? 'amylase'
    : s.includes('pepsin') ? 'pepsin'
    : s.includes('lipase') ? 'lipase'
    : s.includes('trypsin') ? 'trypsin'
    : s.includes('maltase') ? 'maltase'
    : s.includes('peptidas') || s.includes('proteas') ? 'peptidase' : null;
  return id ? { id, ...ENZYME_IDENTITIES[id] } : null;
}
export function enzymeOutline(identity) {
  return Array.from({ length: 64 }, (_, i) => {
    const a = i / 64 * Math.PI * 2;
    if (identity.id === 'bile') return [Math.sin(a) * 0.44 * (1 - 0.4 * Math.cos(a)), Math.cos(a) * 0.7];
    const r = 0.63 * (1 + identity.depth * Math.cos(identity.lobes * a));
    return [Math.cos(a) * r * identity.aspect, Math.sin(a) * r];
  });
}
export function enzymeSymbol(label) {
  const identity = enzymeIdentity(label);
  if (!identity) return '';
  const d = enzymeOutline(identity).map(([x,y], i) => `${i ? 'L' : 'M'}${(25+x*19).toFixed(2)} ${(22+y*19).toFixed(2)}`).join('')+'Z';
  return `<svg viewBox="0 0 50 44" class="digest-molecule-icon" aria-hidden="true" data-enzyme-id="${identity.id}"><path d="${d}" fill="${identity.color}" stroke="${identity.color}" stroke-width="2"/></svg>`;
}
