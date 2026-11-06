import { routeFor } from './circulation-data.js';
import { esc } from './ui.js';
export function orderView(level, draft) {
  const route = routeFor(level);
  return `<p>Træk kortene på plads, eller brug pilene og feltet med kortets pladsnummer. Blodet skal tilbage til samme udgangspunkt. Kontrollér først, når hele ruten er klar.</p><ol class="route-cards">${draft.answers.map((token, i) => `<li draggable="${!draft.submitted}" data-card="${i}" class="route-card"><span class="route-number">${i + 1}</span><strong>${esc(route[token].name)}</strong><div><button type="button" data-move="${i}:-1" ${i === 0 || draft.submitted ? 'disabled' : ''} aria-label="Flyt ${esc(route[token].name)} op">↑</button><button type="button" data-move="${i}:1" ${i === route.length - 1 || draft.submitted ? 'disabled' : ''} aria-label="Flyt ${esc(route[token].name)} ned">↓</button><label class="move-position"><span>Plads</span><select data-move-to="${i}" aria-label="Flyt ${esc(route[token].name)} til plads" ${draft.submitted ? 'disabled' : ''}>${route.map((_, j) => `<option value="${j}" ${i === j ? 'selected' : ''}>${j + 1}</option>`).join('')}</select></label></div></li>`).join('')}</ol>`;
}
export function moveCard(draft, from, to) {
  if (
    draft.submitted ||
    from < 0 ||
    to < 0 ||
    from >= draft.answers.length ||
    to >= draft.answers.length
  )
    return;
  const [card] = draft.answers.splice(from, 1);
  draft.answers.splice(to, 0, card);
}
