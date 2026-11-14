import { esc } from './ui.js';
// Shared controls: route hypotheses do not imply invented anatomical openings.
export function routeButtons(options, attribute = 'data-passage') {
  return options
    .map(
      (p, i) =>
        `<button ${attribute}="${i}" aria-label="${i ? 'Højre' : 'Venstre'} rutehypotese: ${esc(p.label || p.name)}"><span aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="${i ? 'M6 18 18 6M8 6h10v10' : 'M18 18 6 6M6 16V6h10'}"/></svg></span><strong>${esc(p.label || p.name)}</strong></button>`,
    )
    .join('');
}
export const bodySilhouette = `<g fill="#244650" stroke="#a7c9c9" stroke-width="1.4"><circle cx="60" cy="18" r="12"/><path d="M53 30V36Q42 36 35 43L18 87Q16 94 22 95Q27 96 29 89L41 60L42 101L38 155Q37 164 44 164Q50 164 51 157L60 116L69 157Q70 164 77 164Q83 164 82 155L78 101L79 60L91 89Q93 96 99 95Q104 94 102 87L85 43Q78 36 67 36V30"/></g>`;
export function gameToolbar({ back, sound, settings, menu }) {
  return `<div class="blood-game-bar" aria-label="Spilbetjening">${back}${sound}${settings}<div class="blood-foot">${menu}</div></div>`;
}
export function settingsDrawer(id, contents) {
  return `<aside id="${id}" class="blood-drawer" aria-label="Spilindstillinger" hidden>${contents}</aside>`;
}
