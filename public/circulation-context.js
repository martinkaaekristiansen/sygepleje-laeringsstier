import { routeFor, uniqueRoute, OXYGEN, CIRCUITS, CIRCUIT_NOTE } from './circulation-data.js';
import { esc } from './ui.js';
export function contextView(level, draft) {
  const route = routeFor(level);
  return `<p>Beskriv blodets vej og tilstand ved hver placering. I kapillærerne ændres iltindholdet under passagen.</p><details><summary>Sådan afgrænser vi kredsløbene</summary><p>${CIRCUIT_NOTE}</p></details><div class="location-cards">${draft.locations
    .map((i, j) => {
      const node = route[i],
        answer = draft.answers[i] || {},
        structures = Object.fromEntries(uniqueRoute(level).map((n) => [n.id, n.name]));
      return `<fieldset><legend>${j + 1}. ${esc(node.name)}</legend>${[
        ['before', 'Hvor kommer blodet fra?', structures],
        ['after', 'Hvad er næste struktur?', structures],
        ['oxygen', 'Hvordan er blodets iltningsstatus?', OXYGEN],
        ['circuit', 'Hvilket kredsløb?', CIRCUITS],
      ]
        .map(
          ([key, label, options]) =>
            `<label>${label}<select data-context="${i}:${key}" ${draft.submitted ? 'disabled' : ''}><option value="">Vælg svar</option>${Object.entries(
              options,
            )
              .map(
                ([v, text]) =>
                  `<option value="${v}" ${answer[key] === v ? 'selected' : ''}>${esc(text)}</option>`,
              )
              .join('')}</select></label>`,
        )
        .join('')}</fieldset>`;
    })
    .join('')}</div>`;
}
