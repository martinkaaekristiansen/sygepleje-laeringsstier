// Small catalogue only; case documents and illustrations are loaded on entry.
export const DOSE_ID = 'doedelig-dosis';
export const dosePath = {
  id: DOSE_ID,
  title: 'Dødelig dosis – en klinisk mordgåde',
  semester: 3,
  subject: 'Farmakologi',
  subjects: ['Farmakologi', 'Sygepleje', 'Sygdomslære'],
  contentVersion: 1,
  durationMinutes: 40,
  description:
    'En klinisk efterforskning. Følg spor, interview pårørende og personale, og find de svigtende sikkerhedsbarrierer. Én sag er klar.',
  steps: [
    {
      id: 'sagsmapper',
      title: 'Sagsmapper',
      type: 'text',
      text: 'Åbn en sag i Dødelig dosis.',
      questions: [],
    },
  ],
};
export const caseRegistry = [
  {
    id: 'sag-001',
    title: 'Sag 001 – Det sidste hjerteslag',
    version: 1,
    intro:
      'En morgen på medicinsk afdeling. En patient er død, og aftenvagtens observationer efterlader spørgsmål. Hvad blev overset?',
    load: () => import('./dose-case-001.js').then((m) => m.case001),
  },
];
