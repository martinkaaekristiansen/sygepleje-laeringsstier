import { ROUTE } from './digestion-data.js';
import { bodySilhouette } from './journey-ui.js';
import { esc } from './ui.js';
export const ENTRY_OPTIONS = [
  { label: 'Mundhulen · Cavitas oris', target: 'mouth', correct: true },
  { label: 'Næsehulen · Cavitas nasi', target: 'nose', correct: false },
];
// Real structures outside the direct next connection; no valid alternate route.
const distractors = {
  mouth: [
    'trachea',
    'Luftrøret',
    'Trachea',
    'Føden går først gennem svælget. Trachea tilhører luftvejen.',
  ],
  pharynx: [
    'nasopharynx',
    'Næsesvælget',
    'Nasopharynx',
    'Under synkning lukkes adgangen mod næsesvælget. Se i stedet strubelågets beskyttelse af luftvejen.',
  ],
  epiglottis: [
    'trachea',
    'Luftrøret',
    'Trachea',
    'Du er på vej i luftrøret! Det her er fordøjelse, ikke en aspirationsøvelse. Føden føres bag luftvejen mod oesophagus.',
  ],
  oesophagus: [
    'duodenum',
    'Tolvfingertarmen',
    'Duodenum',
    'Duodenum kommer først efter mavesækken og pylorus. Spiserøret munder i mavesækken.',
  ],
  stomach: [
    'jejunum',
    'Tomtarmen',
    'Jejunum',
    'Pylorus fører først til duodenum. Maven har ingen direkte åbning til jejunum.',
  ],
  duodenum: [
    'descending',
    'Nedadstigende tyktarm',
    'Colon descendens',
    'Duodenum fortsætter i jejunum. Colon descendens ligger langt senere på ruten.',
  ],
  jejunum: [
    'descending',
    'Nedadstigende tyktarm',
    'Colon descendens',
    'Jejunum fortsætter i ileum. Der er ingen normal direkte lumenforbindelse til colon descendens.',
  ],
  ileum: [
    'sigmoid',
    'S-formet tyktarm',
    'Colon sigmoideum',
    'Ileum munder gennem ileocøkalklappen i caecum. Sigmoideum kommer efter det meste af colon.',
  ],
  caecum: [
    'appendix',
    'Blindtarmsvedhænget',
    'Appendix vermiformis',
    'Appendix? Det er en blindgyde. Bogstaveligt talt. Hovedruten fortsætter op gennem colon ascendens.',
  ],
  ascending: [
    'rectum',
    'Endetarmen',
    'Rectum',
    'Colon ascendens fortsætter i colon transversum. Rectum er efter colon sigmoideum.',
  ],
  transverse: [
    'ileum',
    'Krumtarmen',
    'Ileum',
    'Ileum ligger før caecum. Fra colon transversum fortsætter indholdet i colon descendens.',
  ],
  descending: [
    'caecum',
    'Blindtarmen',
    'Caecum',
    'Caecum er starten af tyktarmen på patientens højre side. Næste del her er colon sigmoideum.',
  ],
  sigmoid: [
    'jejunum',
    'Tomtarmen',
    'Jejunum',
    'Sigmoideum fortsætter i rectum; jejunum er en tidligere del af tyndtarmen.',
  ],
  rectum: [
    'ascending',
    'Opadstigende tyktarm',
    'Colon ascendens',
    'Indholdet forlader rectum gennem analkanalen og anus, ikke gennem colon ascendens.',
  ],
};
export function anatomicalOptions(index) {
  const s = ROUTE[index],
    next = ROUTE[index + 1],
    d = distractors[s?.id];
  return !next || !d
    ? []
    : [
        { label: next.danish + ' · ' + next.latin, target: next.id, correct: true },
        { label: d[1] + ' · ' + d[2], target: d[0], correct: false, why: d[3] },
      ];
}
export function anatomicalFeedback(target, index) {
  return target === 'nose'
    ? 'Forkert indgang! Du er aftensmad, ikke indåndingsluft.'
    : anatomicalOptions(index).find((o) => o.target === target && !o.correct)?.why ||
        'Følg den næste struktur i fordøjelseskanalen.';
}
// Front view: patient right is viewer left, exactly one point per stop.
export const DIGEST_MAP_POINTS = [
  [60, 25],
  [60, 32],
  [60, 35],
  [60, 49],
  [70, 67],
  [65, 77],
  [57, 88],
  [51, 96],
  [47, 101],
  [46, 85],
  [60, 78],
  [74, 96],
  [66, 105],
  [60, 110],
  [60, 115],
];

export function renderDigestMap(index) {
  const p = DIGEST_MAP_POINTS[index],
    s = ROUTE[index];
  return `<figure class="blood-minimap" aria-label="Kropskort: ${esc(s.danish)}"><figcaption>KROPSKORT</figcaption><svg viewBox="0 0 120 174" role="img" aria-label="Fordøjelseskanalen set forfra. Patientens højre er til venstre." data-map-location="${s.id}">${bodySilhouette}<text x="18" y="39" fill="#e1eceb" font-size="14">H</text><text x="97" y="39" fill="#e1eceb" font-size="14">V</text>${DIGEST_MAP_POINTS.slice(
    0,
    -1,
  )
    .map(
      (p, i) =>
        `<path data-map-segment="${ROUTE[i].id}" d="M${p.join(' ')} L${DIGEST_MAP_POINTS[i + 1].join(' ')}" stroke="${i < index ? '#ffe673' : '#91b2ac'}" stroke-width="${i >= 8 && i <= 11 ? 4 : 2.5}" fill="none" ${i >= index ? 'stroke-dasharray="2 2"' : ''}/>`,
    )
    .join(
      '',
    )}<path d="M47 101q-4 5-2 7" stroke="#91b2ac" fill="none"/><g class="blood-map-marker" data-map-x="${p[0]}" data-map-y="${p[1]}" transform="translate(${p.join(' ')})"><circle r="7" fill="#fff1d8" fill-opacity=".25"/><circle r="3.8" fill="#ff925e" stroke="#fff1d8" stroke-width="1.6"/></g></svg><span>${esc(s.danish)} · ${index + 1}/15</span></figure>`;
}
