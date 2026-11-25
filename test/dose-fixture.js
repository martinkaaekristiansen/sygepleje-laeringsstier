// Deliberately unrelated content. Never imported by the production application.
export const alternateCase = {
  id: 'fixture-infusion',
  version: 1,
  start: 'start',
  title: 'Test af en infusion',
  images: { desk: { src: 'fixture.svg', alt: 'Test' } },
  scenes: [
    {
      id: 'start',
      title: 'Start',
      illustration: 'desk',
      blocks: [{ id: 'intro', text: 'En infusion undersøges.' }],
    },
    {
      id: 'bag',
      title: 'Posen',
      illustration: 'desk',
      when: { seen: 'start' },
      blocks: [{ id: 'label', text: 'Mærkning' }],
    },
    {
      id: 'pump',
      title: 'Pumpen',
      illustration: 'desk',
      when: { any: [{ seen: 'start' }, { hypothesis: 'flow' }] },
      blocks: [{ id: 'setting', text: 'Indstilling' }],
    },
    {
      id: 'compare',
      title: 'Sammenlign',
      illustration: 'desk',
      when: { all: [{ found: 'label' }, { found: 'setting' }] },
      blocks: [{ id: 'difference', text: 'Afvigelse' }],
    },
  ],
  critical: ['difference'],
  hypothesisOptions: [{ id: 'flow', label: 'Flowproblem' }],
  hints: [{ levels: ['Undersøg', 'Sammenlign', 'Kontrollér begge'] }],
  assessment: [
    {
      id: 'volume',
      prompt: 'Hvad var volumen?',
      type: 'number',
      correct: 100,
      points: 100,
      explanation: '100 ml.',
    },
  ],
  freeQuestions: ['Forklar forløbet'],
  reconstruction: [{ time: 'Nu', text: 'Infusionen blev sammenlignet.' }],
  sources: [{ id: 'test', title: 'Testreference', url: 'https://example.org/fixture' }],
};
