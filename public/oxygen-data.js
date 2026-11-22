import { BLOOD_LEVELS } from './blood-routes.js';

export const OXYGEN_ID = 'iltens-rejse';
export const OXYGEN_TITLE = 'Iltens rejse – fra første åndedrag til sidste udånding';
export const OXYGEN_LEVELS = Object.fromEntries(
  Object.entries(BLOOD_LEVELS).map(([id, l]) => [
    id,
    {
      id,
      name: l.name,
      description:
        id === 'easy'
          ? 'Danske navne · samme komplette O₂- og CO₂-rejse.'
          : id === 'medium'
            ? 'Danske og latinske navne · samme fysiologiske rejse.'
            : 'Primært latinske navne og flere anatomiske vejvalg.',
    },
  ]),
);
const node = (id, da, la, region, note, extra = {}) => ({ id, da, la, region, note, ...extra });
export const AIRWAY_NODES = [
  node(
    'pharynx',
    'Svælget',
    'Pharynx',
    'head',
    'Mund og næse mødes i svælget. Indåndingsluften skal mod larynx, ikke oesophagus.',
  ),
  node(
    'larynx',
    'Strubehovedet',
    'Larynx',
    'neck',
    'Luften passerer den åbne glottis mellem stemmefolderne. Epiglottis er et beskyttende blad, ikke et hul, luften går igennem.',
  ),
  node(
    'trachea',
    'Luftrøret',
    'Trachea',
    'chest',
    'C-formede bruskringe holder trachea åben. Den bageste membranøse væg ligger foran oesophagus.',
    { demonstration: 'mucociliary', seconds: 13 },
  ),
  node(
    'mainbronchus',
    'Hovedbronchus',
    'Bronchus principalis',
    'lung',
    'Højre og venstre hovedbronchus er begge normale luftveje. Vælg den lunge, du vil følge.',
  ),
  node(
    'bronchus',
    'Bronchierne',
    'Bronchi',
    'lung',
    'Bronchiernes væg har bruskplader, glat muskulatur, slim og cilier.',
  ),
  node(
    'bronchiole',
    'Bronkiolerne',
    'Bronchioli',
    'lung',
    'Bronkiolerne har glat muskulatur, men ingen brusk. Der bliver færre cilier længere ude.',
  ),
  node(
    'terminal',
    'Terminale bronkioler',
    'Bronchioli terminales',
    'lung',
    'Den ledende del af luftvejene ender her. Alveoler findes endnu ikke i væggen.',
  ),
  node(
    'respiratory',
    'Respiratoriske bronkioler',
    'Bronchioli respiratorii',
    'lung',
    'De første alveoler åbner sig i væggen; den respiratoriske del er begyndt.',
  ),
  node(
    'duct',
    'Alveolegange',
    'Ductus alveolares',
    'lung',
    'Alveoler åbner sig langs alveolegangen. Her ses hverken brusk eller almindelige respiratoriske cilier.',
  ),
  node(
    'sac',
    'Alveolesækken',
    'Saccus alveolaris',
    'lung',
    'Flere alveoler deler åbningen fra alveolesækken.',
  ),
  node(
    'alveolus',
    'Alveolen',
    'Alveolus pulmonis',
    'lung',
    'Type I-pneumocytter danner den tynde flade. Type II-pneumocytter udskiller surfaktant, som sænker overfladespændingen.',
  ),
];
const blood = Object.fromEntries(
  Object.values(BLOOD_LEVELS)
    .flatMap((l) => l.steps)
    .map((s) => [s.id, s]),
);
const names = {
  pcapillaries: ['Lungekapillærer', 'Vasa capillaria pulmonis'],
  pvenules: ['Lungevenoler', 'Venulae pulmonales'],
  pv: ['Lungevener', 'Venae pulmonales'],
  la: ['Venstre forkammer', 'Atrium sinistrum'],
  mitral: ['Mitralklappen', 'Valva mitralis'],
  lv: ['Venstre hjertekammer', 'Ventriculus sinister'],
  aorticValve: ['Aortaklappen', 'Valva aortae'],
  aorta: ['Hovedpulsåren', 'Aorta'],
  arteries: ['Arterier', 'Arteriae'],
  arterioles: ['Arterioler', 'Arteriolae'],
  capillaries: ['Vævskapillærer', 'Vasa capillaria systemica'],
  venules: ['Venoler', 'Venulae'],
  veins: ['Vener', 'Venae'],
  svc: ['Øvre hulvene', 'Vena cava superior'],
  ra: ['Højre forkammer', 'Atrium dextrum'],
  tricuspid: ['Trikuspidalklappen', 'Valva tricuspidalis'],
  rv: ['Højre hjertekammer', 'Ventriculus dexter'],
  pulmonaryValve: ['Pulmonalklappen', 'Valva trunci pulmonalis'],
  trunk: ['Lungearteriestammen', 'Truncus pulmonalis'],
  pa: ['Lungearterier', 'Arteriae pulmonales'],
  parterioles: ['Lungearterioler', 'Arteriolae pulmonales'],
};
export function bloodStructure(id) {
  return { ...blood[id], id, name: names[id]?.[0] || blood[id]?.name };
}
const vessel = (key, id = key, oxygen = 'high') =>
  node(
    id,
    ...names[key],
    ['la', 'lv', 'ra', 'rv', 'mitral', 'aorticValve', 'tricuspid', 'pulmonaryValve'].includes(key)
      ? 'heart'
      : ['capillaries', 'venules', 'veins', 'arteries', 'arterioles'].includes(key)
        ? 'arm'
        : ['aorta', 'svc', 'trunk'].includes(key)
          ? 'chest'
          : 'lung',
    blood[key].note,
    { blood: key, oxygen },
  );
export const OUTBOUND_BLOOD = [
  'pvenules',
  'pv',
  'la',
  'mitral',
  'lv',
  'aorticValve',
  'aorta',
  'arteries',
  'arterioles',
  'capillaries',
].map((k) => vessel(k));
export const RETURN_BLOOD = [
  'venules',
  'veins',
  'svc',
  'ra',
  'tricuspid',
  'rv',
  'pulmonaryValve',
  'trunk',
  'pa',
  'parterioles',
].map((k) => vessel(k, k, 'low'));
export const LEARNING = {
  nose: 'Næsehulen opvarmer, fugter og renser indåndingsluften. Slim og cilier hjælper med at fjerne partikler.',
  mucociliary:
    'Cilierne i luftvejene bevæger slim med fangede bakterier og støvpartikler op mod svælget. Det kaldes mucociliær transport.',
  opposite: 'Læg mærke til, at slimen bevæger sig modsat den luft, du følger ned mod lungerne.',
  expirationMucus:
    'Cilierne transporterer hele tiden slim mod svælget – både under indånding og udånding.',
  oxygenDiffusion:
    'Ilt diffunderer fra alveolerne til blodet, fordi iltens partialtryk er højere i alveolerne.',
  hemoglobin:
    'Hæmoglobin i de røde blodlegemer binder ilt. Ét hæmoglobinmolekyle kan binde op til fire O₂-molekyler.',
  tissue: 'Ilt diffunderer fra blodet til vævet, fordi iltens partialtryk er lavere i vævet.',
  switch:
    'Ilten er afleveret og bruges i cellens energiomsætning. Du følger nu et nyt CO₂-molekyle, som dannes ved nedbrydning af næringsstoffer. O₂ bliver ikke direkte til CO₂.',
  carbon:
    'Cellerne danner CO₂ under energiomsætningen. CO₂ skal transporteres tilbage til lungerne og udåndes.',
  bicarbonate:
    'Det meste CO₂ transporteres som hydrogencarbonat i blodet. Mindre mængder transporteres opløst eller bundet til hæmoglobin.',
  carbonDiffusion:
    "CO₂ diffunderer fra blodet til alveolerne, fordi CO₂'s partialtryk er højere i blodet.",
};
const task = (id, prompt, correct, wrong, why, animation, seconds) => ({
  id,
  prompt,
  options: [correct, ...wrong],
  why,
  animation,
  seconds,
});
export const TASKS = {
  mucus: task(
    'mucus',
    'Hvilken vej transporterer cilierne slim med fangede bakterier?',
    'Op mod svælget',
    ['Ned mod alveolerne', 'Ind gennem kapillærerne'],
    LEARNING.mucociliary,
    'mucus-highlight',
    5,
  ),
  'oxygen-diffusion': task(
    'oxygen-diffusion',
    'Hvordan kommer ilt fra alveolen til blodet?',
    'Diffusion',
    ['Osmose', 'Aktiv transport'],
    LEARNING.oxygenDiffusion,
    'oxygen-diffusion',
    10,
  ),
  'hb-binding': task(
    'hb-binding',
    'Hvor binder iltmolekylet sig i hæmoglobin?',
    'Til jern i en hæmgruppe',
    ['Til erytrocyttens cellemembran', 'Til enzymer i plasma'],
    LEARNING.hemoglobin,
    'hb-binding',
    8,
  ),
  'tissue-oxygen': task(
    'tissue-oxygen',
    'Hvordan kommer ilt fra blodet ind i kroppens væv?',
    'Diffusion',
    ['Osmose', 'Aktiv transport'],
    LEARNING.tissue,
    'tissue-oxygen',
    10,
  ),
  'tissue-carbon': task(
    'tissue-carbon',
    'Hvordan kommer CO₂ fra vævet til blodet?',
    'Diffusion',
    ['Osmose', 'Aktiv transport'],
    LEARNING.carbon,
    'tissue-carbon',
    8,
  ),
  'co2-diffusion': task(
    'co2-diffusion',
    'Hvordan kommer CO₂ fra blodet ind i alveolen?',
    'Diffusion',
    ['Osmose', 'Aktiv transport'],
    LEARNING.carbonDiffusion,
    'co2-diffusion',
    10,
  ),
};
const physiology = (id, da, note, extra = {}) =>
  node(id, da, da, 'lung', note, { physiology: true, ...extra });
export function oxygenRoute(run = { entry: 'nose', exit: 'nose', side: 'right' }) {
  const entrance = node(
    run.entry === 'mouth' ? 'mouth' : 'nose',
    run.entry === 'mouth' ? 'Mundhulen' : 'Næsehulen',
    run.entry === 'mouth' ? 'Cavitas oris' : 'Cavitas nasi',
    'head',
    run.entry === 'mouth'
      ? 'Luften passerer mellem gane og tunge mod svælget. Mundånding giver ikke samme rensning og opvarmning som næsen.'
      : LEARNING.nose,
  );
  const airway = AIRWAY_NODES.flatMap((s) =>
    s.id === 'trachea'
      ? [
          s,
          physiology('mucus', 'Luftvejenes rensning', LEARNING.mucociliary, {
            task: 'mucus',
            region: 'chest',
          }),
        ]
      : [s],
  );
  const out = AIRWAY_NODES.slice()
    .reverse()
    .map((s) => ({
      ...s,
      id: 'out_' + s.id,
      anatomy: s.id,
      expiration: true,
      demonstration: undefined,
      automatic: s.id === 'alveolus' ? 'expiration' : undefined,
      seconds: s.id === 'alveolus' ? 6 : undefined,
      note: s.id === 'trachea' ? LEARNING.expirationMucus : s.note,
    }));
  const exit = run.exit || run.entry;
  return [
    node(
      'outside',
      'Uden for ansigtet',
      'O₂ i omgivelserne',
      'head',
      'Du er et iltmolekyle. Både næsen og munden er en korrekt indgang.',
    ),
    entrance,
    ...airway,
    physiology('oxygen-diffusion', 'Fra alveole til blod', LEARNING.oxygenDiffusion, {
      task: 'oxygen-diffusion',
    }),
    physiology('hb-binding', 'Hæmoglobin binder ilt', LEARNING.hemoglobin, { task: 'hb-binding' }),
    vessel('pcapillaries', 'pcap-oxygen'),
    ...OUTBOUND_BLOOD,
    physiology('tissue-oxygen', 'Ilt til vævet', LEARNING.tissue, {
      task: 'tissue-oxygen',
      region: 'arm',
    }),
    physiology(
      'metabolism',
      'Cellen danner ATP',
      'Mitokondrier bruger ilt og energi fra næringsstoffer til at danne ATP. CO₂ dannes ved nedbrydningen af næringsstoffernes carbon.',
      { automatic: 'metabolism', seconds: 7, region: 'arm' },
    ),
    physiology('perspective', 'Fra O₂ til et nyt CO₂-molekyle', LEARNING.switch, {
      automatic: 'perspective',
      seconds: 11,
      region: 'arm',
    }),
    physiology('tissue-carbon', 'CO₂ fra væv til blod', LEARNING.carbon, {
      task: 'tissue-carbon',
      region: 'arm',
    }),
    physiology('bicarbonate', 'CO₂ som hydrogencarbonat', LEARNING.bicarbonate, {
      automatic: 'bicarbonate',
      seconds: 8,
      region: 'arm',
    }),
    ...RETURN_BLOOD,
    vessel('pcapillaries', 'pcap-carbon', 'exchange-in'),
    physiology(
      'bicarbonate-return',
      'Fra hydrogencarbonat til CO₂',
      'I lungerne omdannes hydrogencarbonat tilbage til CO₂, som kan diffundere til alveolerne.',
      { automatic: 'bicarbonate-return', seconds: 7 },
    ),
    physiology('co2-diffusion', 'Fra blod til alveole', LEARNING.carbonDiffusion, {
      task: 'co2-diffusion',
    }),
    ...out,
    node(
      'out_entry',
      exit === 'mouth' ? 'Mundhulen' : 'Næsehulen',
      exit === 'mouth' ? 'Cavitas oris' : 'Cavitas nasi',
      'head',
      'Luften forlader kroppen. Mund og næse er begge normale udgange.',
      { anatomy: exit, expiration: true },
    ),
    node(
      'exterior',
      'Tilbage i omgivelserne',
      'CO₂ udåndes',
      'head',
      'Du har fulgt ilt ind, gasudvekslingen i lunger og væv og CO₂ tilbage til udåndingen.',
      { automatic: 'exhalation', seconds: 5, expiration: true },
    ),
  ];
}
export function anatomicalName(stage, level = 'medium') {
  return level === 'easy'
    ? stage.da
    : level === 'hard'
      ? stage.la
      : stage.da === stage.la
        ? stage.da
        : stage.da + ' · ' + stage.la;
}
const options = (items) =>
  items.map(([key, label, correct, why]) => ({ key, label, correct: !!correct, why }));
function reusedBloodDistractor(run, next) {
  const key = next.blood === 'aorta' ? 'ascending' : next.blood === 'pa' ? 'rpa' : next.blood;
  const levels = [BLOOD_LEVELS[run.level], BLOOD_LEVELS.hard, BLOOD_LEVELS.medium];
  const choice =
    levels.flatMap((l) => l.choices).find((q) => q.correct === key) ||
    levels.flatMap((l) => l.choices).find((q) => q.correct === next.blood);
  if (!choice) return null;
  const known = Object.entries(blood).find(
    ([, s]) =>
      s.name === choice.wrong.name || s.name.split(' (')[0] === choice.wrong.name.split(' (')[0],
  );
  const pair = known && names[known[0]];
  return {
    da: pair?.[0] || choice.wrong.name,
    la: pair?.[1] || choice.wrong.name,
    why: choice.wrong.explanation,
  };
}
export function oxygenQuestion(run) {
  const route = oxygenRoute(run),
    s = route[run.index];
  if (!s || s.id==='out_entry') return null;
  if (s.task)
    return {
      id: s.id,
      prompt: TASKS[s.task].prompt,
      why: TASKS[s.task].why,
      animation: TASKS[s.task].animation,
      seconds: TASKS[s.task].seconds,
      options: TASKS[s.task].options.map((label, i) => ({
        key: String(i),
        label,
        correct: i === 0,
        why: TASKS[s.task].why,
      })),
    };
  if (s.automatic) return null;
  if (s.id === 'outside')
    return {
      id: s.id,
      prompt: 'Hvor skal iltmolekylet ind?',
      options: options([
        [
          'nose',
          anatomicalName({ da: 'Næsehulen', la: 'Cavitas nasi' }, run.level),
          true,
          LEARNING.nose,
        ],
        [
          'mouth',
          anatomicalName({ da: 'Mundhulen', la: 'Cavitas oris' }, run.level),
          true,
          'Begge indgange fører til pharynx.',
        ],
      ]),
    };
  if (s.id === 'mainbronchus')
    return {
      id: s.id,
      prompt: 'Hvilken lunge vil du følge?',
      options: options([
        [
          'right',
          anatomicalName(
            { da: 'Højre hovedbronchus', la: 'Bronchus principalis dexter' },
            run.level,
          ),
          true,
          'Højre hovedbronchus fører til højre lunge.',
        ],
        [
          'left',
          anatomicalName(
            { da: 'Venstre hovedbronchus', la: 'Bronchus principalis sinister' },
            run.level,
          ),
          true,
          'Venstre hovedbronchus fører til venstre lunge.',
        ],
      ]),
    };
  if (s.id === 'out_pharynx')
    return {
      id: s.id,
      prompt: 'Hvilken vej vil du ånde ud?',
      options: options([
        [
          'nose',
          anatomicalName({ da: 'Næsehulen', la: 'Cavitas nasi' }, run.level),
          true,
          'Næsen er en normal udgang.',
        ],
        [
          'mouth',
          anatomicalName({ da: 'Mundhulen', la: 'Cavitas oris' }, run.level),
          true,
          'Munden er en normal udgang.',
        ],
      ]),
    };
  const next = route[run.index + 1];
  if (!next || next.physiology) return null;
  if (
    run.level !== 'hard' &&
    ([
      'mitral',
      'aorticValve',
      'tricuspid',
      'pulmonaryValve',
      'terminal',
      'respiratory',
      'sac',
    ].includes(s.id) ||
      (s.expiration && run.level === 'easy' && !['out_trachea', 'out_larynx'].includes(s.id)))
  )
    return null;
  const reused = s.blood && next.blood ? reusedBloodDistractor(run, next) : null;
  const wrong =
    reused ||
    (s.id === 'pharynx'
      ? { da: 'Spiserøret', la: 'Oesophagus' }
      : s.expiration
        ? route[run.index-1]
        : s.blood
          ? {
              da:
                s.oxygen === 'low'
                  ? 'Aorta (genvej uden om lungerne)'
                  : 'Øvre hulvene (genvej uden om vævet)',
              la: s.oxygen === 'low' ? 'Aorta' : 'Vena cava superior',
            }
          : { da: 'Spiserøret', la: 'Oesophagus' });
  const why =
    s.id === 'pharynx'
      ? 'Indåndingsluften går gennem larynx til trachea. Oesophagus leder føde mod mavesækken.'
      : s.expiration
        ? 'Ved udånding følger vi luftvejen tilbage mod omgivelserne.'
        : s.blood
          ? 'Følg blodstrømmens normale rækkefølge. Der er ingen normal direkte genvej mellem de to kredsløb.'
          : next.note;
  return {
    id: s.id,
    prompt: 'Hvad er næste anatomiske struktur?',
    why,
    options: options([
      ['next', anatomicalName(next, run.level), true, why],
      ['wrong', anatomicalName(wrong, run.level), false, reused?.why || why],
    ]),
  };
}
const exam = (id, prompt, correct, a, b, why) => ({ id, prompt, options: [correct, a, b], why });
const basePool = [
  exam(
    'entry',
    'Hvilke indgange kan indåndingsluft bruge?',
    'Både næsen og munden',
    'Kun næsen',
    'Kun munden',
    'Både cavitas nasi og cavitas oris fører til pharynx.',
  ),
  exam(
    'cilium',
    TASKS.mucus.prompt,
    TASKS.mucus.options[0],
    TASKS.mucus.options[1],
    TASKS.mucus.options[2],
    LEARNING.mucociliary,
  ),
  exam(
    'cilium-direction',
    'Hvad sker der med slimtransporten ved udånding?',
    'Den fortsætter mod svælget',
    'Den vender mod alveolerne',
    'Den stopper helt',
    LEARNING.expirationMucus,
  ),
  exam(
    'alveoli-cilia',
    'Hvilken beskrivelse passer på alveoler?',
    'Tynde vægge uden almindelige respiratoriske cilier',
    'C-formede bruskringe og tætte cilier',
    'Tykke muskelvægge med hjerteklapper',
    'Alveoler er specialiseret til diffusion. De har type I- og type II-pneumocytter, ikke et almindeligt ciliebeklædt luftvejsepitel.',
  ),
  exam(
    'diffusion-in',
    TASKS['oxygen-diffusion'].prompt,
    'Diffusion',
    'Osmose',
    'Aktiv transport',
    LEARNING.oxygenDiffusion,
  ),
  exam(
    'hb-capacity',
    'Hvor mange O₂-molekyler kan ét hæmoglobinmolekyle binde?',
    'Op til fire',
    'Præcis ét',
    'Op til otte',
    LEARNING.hemoglobin,
  ),
  exam(
    'hb-release',
    'Hvordan frigives ilt fra hæmoglobin i vævet?',
    'Reversibel binding og diffusion ved lavere iltpartialtryk',
    'Hæmoglobin skal nedbrydes',
    'Erytrocytten skal forlade kapillæren',
    LEARNING.tissue,
  ),
  exam(
    'surfactant',
    'Hvad gør surfaktant i alveolerne?',
    'Sænker overfladespændingen',
    'Transporterer slim til svælget',
    'Binder fire iltmolekyler',
    'Type II-pneumocytter udskiller surfaktant, som hjælper med at holde alveolerne åbne.',
  ),
  exam(
    'pulmonary-vein',
    'Hvor går iltrigt blod fra lungerne hen?',
    'Gennem lungevener til venstre forkammer',
    'Gennem hulvener til højre forkammer',
    'Direkte til vævet uden om hjertet',
    'Lungevenerne munder i atrium sinistrum.',
  ),
  exam(
    'systemic',
    'Hvilket hjertekammer sender blod mod kroppen?',
    'Venstre hjertekammer',
    'Højre forkammer',
    'Højre hjertekammer',
    'Venstre ventrikel pumper gennem aortaklappen til aorta.',
  ),
  exam(
    'pulmonary-artery',
    'Hvad fører lungearterierne?',
    'Blod fra højre hjertehalvdel mod lungerne',
    'Blod fra lungerne til venstre forkammer',
    'Luft fra trachea til alveoler',
    'Arterier fører blod væk fra hjertet; lungearterier fører relativt iltfattigt blod.',
  ),
  exam(
    'carbon-source',
    'Hvilken forklaring på CO₂ er korrekt?',
    'CO₂ dannes ved nedbrydning af næringsstoffer',
    'Det indåndede O₂ ændres direkte til CO₂',
    'CO₂ dannes kun i alveolerne',
    LEARNING.switch,
  ),
  exam(
    'carbon-carrier',
    'Hvordan transporteres det meste CO₂ i blodet?',
    'Som hydrogencarbonat',
    'Bundet til hæmgruppernes jern',
    'Som store gasbobler',
    LEARNING.bicarbonate,
  ),
  exam(
    'carbon-out',
    TASKS['co2-diffusion'].prompt,
    'Diffusion',
    'Osmose',
    'Aktiv transport',
    LEARNING.carbonDiffusion,
  ),
  exam(
    'inspiration',
    'Hvad sker der med diaphragma ved normal inspiration?',
    'Den kontraheres og bevæger sig nedad',
    'Den afslappes og bevæger sig opad',
    'Den lukker glottis',
    'Thoraxvolumen øges ved kontraktion af diaphragma; alveolerne udvides.',
  ),
  exam(
    'expiration',
    'Hvad sker der ved almindelig rolig eksspiration?',
    'Diaphragma afslappes, og thoraxvolumen mindskes',
    'Diaphragma trækker sig længere ned',
    'Cilierne vender bevægelsesretning',
    'Rolig udånding drives især af elastisk tilbagespring.',
  ),
  exam(
    'bronchiole',
    'Hvilken struktur mangler normalt brusk?',
    'Bronkiolen',
    'Trachea',
    'Den store bronchus',
    'Bronkioler har glat muskulatur, men ingen bruskplader.',
  ),
  exam(
    'glottis',
    'Hvilken passage bruger luften ved larynx?',
    'Glottis mellem stemmefolderne',
    'Et hul gennem epiglottis',
    'Oesophagus',
    'Larynxindgangen og glottis er åbne under normal rolig vejrtrækning.',
  ),
];
export const OXYGEN_QUESTION_POOLS = Object.fromEntries(
  Object.keys(OXYGEN_LEVELS).map((level) => [
    level,
    basePool.map((q) => ({
      ...q,
      id: level + ':' + q.id,
      prompt:
        level === 'hard'
          ? q.prompt
              .replace('venstre forkammer', 'atrium sinistrum')
              .replace('Venstre hjertekammer', 'Ventriculus sinister')
              .replace('Højre hjertekammer', 'Ventriculus dexter')
          : q.prompt,
    })),
  ]),
);
export const oxygenPath = {
  id: OXYGEN_ID,
  title: OXYGEN_TITLE,
  semester: 1,
  subject: 'Anatomi og fysiologi',
  subjects: ['Anatomi og fysiologi'],
  durationMinutes: 25,
  description:
    'Følg O₂ fra ansigtet gennem luftveje, alveoler, hæmoglobin og kredsløb. Aflever ilt i vævet, og følg et nyt CO₂-molekyle tilbage til udåndingen.',
  contentVersion: 1,
  steps: Object.values(OXYGEN_LEVELS).map((l) => ({
    id: 'oxygen-' + l.id,
    title: l.name + ' · Iltens rejse',
    type: 'game',
    text: l.description,
    questions: [],
  })),
};
