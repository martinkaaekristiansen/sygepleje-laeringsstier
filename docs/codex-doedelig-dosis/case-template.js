// Copy to public/dose-case-002.js, author and validate a complete case, then register it.
// This development template is not imported by the website.
export const case002 = {
  id: 'sag-002',
  version: 1,
  semester: 3,
  title: 'Sag 002 – En ny titel uden lægemiddelnavn',
  intro: 'En kort, spoilerfri introduktion.',
  start: 'start',
  phases: [
    'Gerningsstedet',
    'Første mistanker',
    'Sporene samles',
    'Målrettet efterforskning',
    'Rekonstruktion',
  ],
  learningGoals: ['Indsæt fagligt kvalitetssikrede læringsmål'],
  images: {
    desk: {
      src: new URL('./case-002-desk.webp', import.meta.url).href,
      alt: 'Fiktiv klinisk arbejdsstation',
    },
  },
  characters: [
    {
      id: 'person',
      name: 'Fiktivt navn',
      role: 'En relevant person med et begrænset perspektiv',
      image: 'desk',
    },
  ],
  scenes: [
    {
      id: 'start',
      title: 'Det første spor',
      phase: 1,
      illustration: 'desk',
      location: 'Fiktiv afdeling',
      time: 'En kontrolleret tidsangivelse',
      intro: 'Hvad vil du undersøge?',
      blocks: [{ id: 'intro', title: 'Udgangspunkt', text: 'Udbyg før registrering.' }],
    },
    {
      id: 'document',
      title: 'Undersøg dokumentet',
      phase: 2,
      illustration: 'desk',
      location: 'Journal',
      time: 'Tidspunkt',
      intro: 'En ny kilde.',
      when: { seen: 'start' },
      reason: 'En klinisk begrundet opfølgning.',
      blocks: [{ id: 'finding', title: 'Fund', text: 'Et fagligt kvalitetssikret fund.' }],
    },
  ],
  critical: ['finding'],
  hypothesisThresholds: [3, 7, 12],
  hypothesisOptions: [
    { id: 'unknown', label: 'Endnu ikke tilstrækkelige oplysninger' },
    { id: 'own', label: 'Min egen hypotese' },
  ],
  hints: [
    {
      levels: [
        'Et refleksionsspørgsmål',
        'En relevant datakilde',
        'En tydelig, men ikke afslørende ledetråd',
      ],
    },
  ],
  freeQuestions: ['Formulér din samlede forklaring'],
  assessment: [
    {
      id: 'example',
      category: 'Eksempel – erstat med den fulde 20/10/20/20/15/15-fordeling',
      type: 'choice',
      prompt: 'Et fagligt spørgsmål',
      options: [
        { id: 'a', label: 'Mulighed A' },
        { id: 'b', label: 'Mulighed B' },
      ],
      correct: 'a',
      points: 100,
      explanation: 'Erstat med verificeret forklaring.',
    },
  ],
  reconstruction: [
    {
      time: 'Tidspunkt',
      type: 'Barriere',
      text: 'En verificeret rekonstruktion med forebyggelse.',
    },
  ],
  reflection: ['Hvilken observation ændrede din hypotese?'],
  uthFields: [
    'Hændelsesbeskrivelse',
    'Hændelsestype',
    'Faktisk konsekvens',
    'Mulig konsekvens',
    'Medvirkende faktorer',
    'Forebyggelse',
    'Sikkerhedsbarrierer',
  ],
  sources: [], // Required: genuine authoritative references before registration.
  history: [{ version: 1, date: 'YYYY-MM-DD', note: 'Udkast – ikke spilbar eller offentlig.' }],
};
