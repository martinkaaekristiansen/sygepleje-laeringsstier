import { BASIC_QUESTION_POOLS } from './digestion-basic-questions.js';
import { ADDITIONAL_QUESTIONS } from './digestion-question-pools.js';
export const ABSORPTION_CHOICES = {
  stanley: {
    prompt: 'Glukosen er i enterocytten. Hvilken vej fører den videre?',
    options: [
      'Gennem tarmcellen → blodkapillær → portåre',
      'Chylomikron → centralt lymfekar',
      'Tilbage til colon som intakt stivelse',
    ],
    why: 'Glukose forlader enterocytten via GLUT2 og følger portalblodet. SGLT1 er den apikale Na⁺-koblede indgang.',
  },
  trine: {
    prompt: 'Langkædede lipidprodukter er optaget. Hvilken transportvej vælger du?',
    options: [
      'Reesterificering → chylomikron → centralt lymfekar',
      'SGLT1 → glukose → portalblod',
      'Hele micellen passerer direkte ind i blodet',
    ],
    why: 'Chylomikroner dannes i enterocytten efter reesterificering og går især til lymfen. Miceller afleverer lipidprodukter ved epitelet.',
  },
  poul: {
    prompt: 'Aminosyrer og små peptider er optaget. Hvad sker der nu?',
    options: [
      'Intracellulær peptidhydrolyse → aminosyrer → blod → portåre',
      'Alle peptider pakkes i chylomikroner',
      'PEPT1 fører intakte proteiner til lymfen',
    ],
    why: 'PEPT1 optager di-/tripeptider apikalt. Mange hydrolyseres i cellen; aminosyrer forlader den basolateralt og når portalblodet.',
  },
};
const q = (prompt, options, why) => ({ prompt, options, why });
const common = [
  q(
    'En patient mangler pankreasenzymer. Hvorfor kan tygning ikke erstatte deres virkning?',
    [
      'Tygning øger overfladen, men hydrolyserer ikke de relevante kemiske bindinger',
      'Tygning danner alle de samme produkter som enzymerne',
      'Tygning ændrer kun pH og ikke fødens størrelse',
    ],
    'Mekanisk findeling og kemisk hydrolyse er forskellige processer.',
  ),
  q(
    'En glukoseenhed er absorberet i jejunum. Hvad følger du bagefter gennem ileum og colon?',
    [
      'En ufordøjelig rest; glukosen er allerede inde i kroppen',
      'Den samme glukoseenhed hele vejen til anus',
      'Glukose, som normalt udskilles gennem appendix',
    ],
    'Perspektivet skifter. Absorberede næringsstoffer bliver ikke automatisk en del af fæces.',
  ),
];
export const FINAL_TESTS = {
  stanley: [
    ...common,
    q(
      'Hvorfor kan stivelse stadig nedbrydes kortvarigt efter synkning?',
      [
        'Syre trænger gradvist ind i bolus, hvor spytamylase endnu kan virke',
        'Pepsin overtager straks alle glykosidbindinger',
        'Mavesækken udskiller store mængder stivelsesamylase',
      ],
      'Amylaseaktivitet aftager med forsuringen; det er ikke en øjeblikkelig kontakt.',
    ),
    q(
      'Hvilket enzym spalter maltose ved børstesømmen?',
      ['Maltase', 'Pepsin', 'Bugspytlipase'],
      'Maltase danner to glukosemolekyler fra maltose.',
    ),
    q(
      'Hvor går glukosen hen efter absorption i jejunum?',
      [
        'Til blodkapillærerne og portåresystemet',
        'I chylomikroner til lymfen',
        'Som stivelse til anus',
      ],
      'Glukose optages ved koblet transport gennem enterocytterne og følger blodet.',
    ),
  ],
  trine: [
    ...common,
    q(
      'Galde tilføres, men pankreaslipase mangler. Hvad kan galden gøre?',
      [
        'Emulgere fedt og understøtte miceller, men ikke selv hydrolysere esterbindinger',
        'Erstatte lipase fuldstændigt',
        'Omdanne triglycerider til glukose',
      ],
      'Galde er ikke et enzym.',
    ),
    q(
      'Hvad bliver især tilbage på glycerol efter pankreaslipasens spaltning af position 1 og 3?',
      [
        'En fedtsyre i position 2: et 2-monoglycerid',
        'Tre uændrede fedtsyrer',
        'Et glukosemolekyle',
      ],
      'De to andre fedtsyrer frigives.',
    ),
    q(
      'Hvorfor når mange langkædede lipider ikke først leveren gennem portåren?',
      [
        'De pakkes i chylomikroner og går især gennem lymfen',
        'De er ufordøjelige og fortsætter normalt til anus',
        'Galdeblæren pumper dem direkte til hjernen',
      ],
      'Den viste lymfevej gælder især langkædede fedtsyrer; kortere fedtsyrer kan følge andre veje.',
    ),
  ],
  poul: [
    ...common,
    q(
      'Et protein denatureres i maven. Hvad betyder det?',
      [
        'Foldningen ændres; peptidbindinger kræver særskilt hydrolyse',
        'Alle aminosyrer er allerede frigivet',
        'Protein bliver til triglycerid',
      ],
      'Syreudfoldning og proteolytisk hydrolyse er forskellige processer.',
    ),
    q(
      'Hvor kommer trypsin fra?',
      ['Bugspytkirtlen, som udskiller trypsinogen', 'Spytkirtlerne', 'Leveren, som danner galde'],
      'Bugspytkirtlen udskiller trypsinogen. Det aktiveres til trypsin ved tyndtarmens børstesøm.',
    ),
    q(
      'Et dipeptid er transporteret ind via PEPT1. Hvad kan ske i enterocytten?',
      [
        'Intracellulære peptidaser hydrolyserer det til aminosyrer',
        'Det bliver nødvendigvis til en chylomikron',
        'Det passerer som et helt protein til colon',
      ],
      'Mange di-/tripeptider hydrolyseres intracellulært før videre transport.',
    ),
  ],
};
// FINAL_TESTS remains the frozen legacy five-question set, so old results and
// interrupted tests retain their original meaning. New sessions save stable IDs.
export const ARCHIVED_QUESTION_POOLS = Object.fromEntries(
  Object.entries(FINAL_TESTS).map(([id, legacy]) => [
    id,
    [
      ...legacy.map((q, i) => ({ ...q, id: id + '-legacy-' + i })),
      ...ADDITIONAL_QUESTIONS[id].map((q) => ({ ...q, id: id + '-v2-' + q.id })),
    ],
  ]),
);
export const QUESTION_POOLS = BASIC_QUESTION_POOLS;
export function assessmentQuestions(character, questionIds) {
  if (!Object.hasOwn(FINAL_TESTS, character)) throw Error('Ukendt næringsstof.');
  if (questionIds === undefined) return FINAL_TESTS[character];
  if (!Array.isArray(questionIds) || questionIds.length !== 5 || new Set(questionIds).size !== 5)
    throw Error('Ugyldig spørgsmålssamling.');
  return questionIds.map((id) => {
    const q = [...QUESTION_POOLS[character], ...ARCHIVED_QUESTION_POOLS[character]].find(
      (q) => q.id === id,
    );
    if (!q) throw Error('Ukendt testspørgsmål.');
    return q;
  });
}
export function scoreAssessment(character, answers, questionIds) {
  const qs = assessmentQuestions(character, questionIds);
  if (
    !qs ||
    !Array.isArray(answers) ||
    answers.length !== qs.length ||
    answers.some((a) => !Number.isInteger(a) || a < 0 || a > 2)
  )
    throw Error('Besvar alle testspørgsmål.');
  return {
    character,
    answers: [...answers],
    ...(questionIds ? { questionIds: [...questionIds] } : {}),
    correct: answers.filter((a) => a === 0).length,
    total: qs.length,
    date: new Date().toISOString(),
  };
}
