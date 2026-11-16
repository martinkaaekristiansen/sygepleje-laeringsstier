import { esc } from './ui.js';
const colours = { stanley: '#f4c35d', trine: '#7bd5bb', poul: '#b69cf0', enzyme: '#65d6ec' };
export function moleculeIcon(form, label = '') {
  let parts = '',
    colour =
      form.includes('peptide') || form === 'protein' || form === 'amino-acid'
        ? colours.poul
        : form.includes('fat') || ['triglyceride', 'lipid-products', 'chylomicron'].includes(form)
          ? colours.trine
          : colours.stanley;
  const ring = (x, y) => `<path d="M${x - 6} ${y}l3-5h6l3 5-3 5h-6Z"/>`;
  const dot = (x, y) => `<circle cx="${x}" cy="${y}" r="4"/>`;
  if (form === 'enzyme') {
    colour = colours.enzyme;
    parts = '<path d="M14 22C8 5 31 2 37 10L28 19l9 6c-9 13-28 9-23-3Z"/>';
  } else if (['triglyceride', 'lipid-products'].includes(form)) {
    parts = '<path d="M14 9v24M14 12h10l5-3 6 3 6-3M14 21h10l5-3 6 3 6-3M14 30h10l5-3 6 3 6-3"/>';
    if (form === 'lipid-products')
      parts = '<path d="M10 10v24M10 22h14l5-3 6 3 6-3M25 7l5-3 6 3 6-3M25 35l5-3 6 3 6-3"/>';
  } else if (form === 'emulsified-fat')
    parts =
      '<circle cx="15" cy="17" r="8"/><circle cx="35" cy="12" r="5"/><circle cx="34" cy="30" r="7"/><circle cx="17" cy="34" r="4"/>';
  else if (form === 'chylomicron')
    parts = '<circle cx="25" cy="22" r="15"/><path d="M14 15h20M14 22h20M14 29h20"/>';
  else if (form === 'residue') {
    colour = '#c9b58c';
    parts = '<path d="M8 25l8-9 8 12 8-13 9 11M10 17l7 15 9-17 10 17"/>';
  } else {
    const n =
      {
        polysaccharide: 5,
        'short-chain': 4,
        maltose: 2,
        glucose: 1,
        'glucose-pair': 2,
        protein: 6,
        peptide: 4,
        'small-peptide': 2,
        'amino-acid': 1,
      }[form] || 1;
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? 25 : 8 + (i * 34) / (n - 1),
        y = form === 'protein' ? 22 + Math.sin(i * 1.8) * 9 : 22;
      if (i)
        parts += `<path d="M${n === 1 ? 25 : 8 + ((i - 1) * 34) / (n - 1)} ${form === 'protein' ? 22 + Math.sin((i - 1) * 1.8) * 9 : 22}L${x} ${y}"/>`;
      parts += ['protein', 'peptide', 'small-peptide', 'amino-acid'].includes(form)
        ? dot(x, y)
        : ring(x, y);
    }
  }
  return `<svg viewBox="0 0 50 44" class="digest-molecule-icon" role="img" aria-label="${esc(label || form)}"><g stroke="${colour}" fill="${form === 'amino-acid' ? colour : 'none'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${parts}</g></svg>`;
}
export function productForm(text) {
  const s = text.toLowerCase();
  if (s.includes('to glukose')) return 'glucose-pair';
  if (s.includes('aminosyr')) return 'amino-acid';
  if (s.includes('fedtsyr') || s.includes('monoglycer')) return 'lipid-products';
  if (s.includes('glukose')) return 'glucose';
  if (s.includes('maltose')) return 'maltose';
  if (s.includes('mindre peptid')) return 'small-peptide';
  if (s.includes('peptid')) return 'peptide';
  return 'short-chain';
}
export function originIcon(text) {
  const s = text.toLowerCase();
  let path;
  if (s.includes('spyt'))
    path =
      '<ellipse cx="14" cy="17" rx="7" ry="11"/><ellipse cx="36" cy="17" rx="7" ry="11"/><path d="M20 18l5 14 5-14"/>';
  else if (s.includes('bugspyt'))
    path = '<path d="M5 26Q6 12 20 17Q30 10 44 17L38 26 23 28 11 33Z"/><path d="M12 25l24-5"/>';
  else if (s.includes('lever')) path = '<path d="M5 13Q22 5 43 17L34 32 8 30Z"/>';
  else if (s.includes('børstesøm') || s.includes('tarmcelle'))
    path = '<path d="M7 31V16h36v15M10 16V8m6 8V8m6 8V8m6 8V8m6 8V8m6 8V8"/>';
  else path = '<path d="M18 5v12Q9 27 20 34Q35 42 40 24Q43 12 30 13Q24 17 24 6"/>';
  return `<svg viewBox="0 0 50 44" class="digest-origin-icon" role="img" aria-label="${esc(text)}"><g fill="#d19b9b33" stroke="#dfa6b3" stroke-width="2">${path}</g></svg>`;
}
export function answerIcon(task, label) {
  return task.kind === 'reaction'
    ? moleculeIcon(productForm(label), label)
    : task.kind === 'source'
      ? originIcon(label)
      : moleculeIcon('enzyme', label);
}
