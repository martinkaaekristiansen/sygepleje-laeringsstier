import { ROUTE } from './digestion-data.js';
import { esc } from './ui.js';
export const ENTRY_OPTIONS = [
  { label: 'Cavitas oris · mundhulen', target: 'mouth', correct: true },
  { label: 'Cavitas nasi · næsehulen', target: 'nose', correct: false },
];
export function anatomicalOptions(index, latin = true) {
  const s = ROUTE[index];
  if (s.id === 'pharynx')
    return [
      { label: 'Oesophagus · spiserøret', target: 'oesophagus', correct: true },
      { label: 'Trachea · luftrøret', target: 'trachea', correct: false },
    ];
  if (s.id === 'caecum')
    return [
      { label: 'Colon ascendens · opadstigende tyktarm', target: 'ascending', correct: true },
      { label: 'Appendix vermiformis · blindtarmsvedhænget', target: 'appendix', correct: false },
    ];
  const next = ROUTE.slice(index + 1).find((s) => !s.automatic);
  return next
    ? [
        {
          label: latin ? next.latin + ' · ' + next.danish : next.danish,
          target: 'forward',
          correct: true,
        },
        { label: 'Bliv her og undersøg', target: 'inspect', inspect: true, correct: false },
      ]
    : [];
}
export function anatomicalFeedback(target) {
  return target === 'nose'
    ? 'Forkert indgang! Du er aftensmad, ikke indåndingsluft.'
    : target === 'trachea'
      ? 'Du er på vej i luftrøret! Det her er fordøjelse, ikke en aspirationsøvelse.'
      : target === 'appendix'
        ? 'Appendix? Det er en blindgyde. Bogstaveligt talt.'
        : 'Prøv igen. Følg den synlige fordøjelsesvej.';
}
// Front view: patient right is viewer left, matching the blood-game map convention.
export const DIGEST_MAP_POINTS = [
  [55, 27],
  [55, 34],
  [55, 49],
  [58, 64],
  [67, 69],
  [66, 75],
  [58, 78],
  [52, 92],
  [48, 102],
  [35, 109],
  [30, 109],
  [28, 87],
  [53, 79],
  [78, 96],
  [63, 114],
  [55, 125],
  [55, 132],
  [55, 137],
];
export function renderDigestMap(index) {
  return `<h2>Din vej gennem kroppen</h2><svg viewBox="0 0 110 150" role="img" aria-label="Fordøjelseskanalen set forfra. Patientens højre er til venstre."><path d="M43 10Q55 0 67 10L68 24 75 32 90 44 94 100 83 103 79 63 80 146H64L60 116H50L46 146H30L31 63 27 103 16 100 20 44 35 32 42 24Z" fill="#183b44" stroke="#9bbfc2"/><text x="18" y="38" fill="#e9d9bc" font-size="8">H</text><text x="85" y="38" fill="#e9d9bc" font-size="8">V</text>${DIGEST_MAP_POINTS.slice(
    0,
    -1,
  )
    .map(
      (p, i) =>
        `<path d="M${p.join(' ')} L${DIGEST_MAP_POINTS[i + 1].join(' ')}" stroke="${i < index ? '#ffe673' : '#91b2ac'}" stroke-width="${i >= 6 && i <= 8 ? 7 : 4}" fill="none" ${i >= index ? 'stroke-dasharray="2 2"' : ''}/>`,
    )
    .join(
      '',
    )}<path d="M29 111q-8 8-3 10" fill="none" stroke="#91b2ac" stroke-width="2"/><circle cx="${DIGEST_MAP_POINTS[index][0]}" cy="${DIGEST_MAP_POINTS[index][1]}" r="4" fill="#ff925e" stroke="white"/></svg><p>${esc(ROUTE[index].danish)} · ${index + 1}/${ROUTE.length}</p><small>Gul: gennemført · stiplet: resterende. Skematisk, ikke målfast.</small>`;
}
