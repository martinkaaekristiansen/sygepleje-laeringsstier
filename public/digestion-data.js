export const DIGESTION_ID = 'fordoejelsens-vilde-rejse';
export const CHARACTERS = {
  stanley: {
    name: 'Stivelsen Stanley',
    color: 0xf4c35d,
    description:
      'En lang kæde af glukose med store ambitioner. Desværre er fordøjelsessystemet ved at skille dig ad.',
    enzymes: 'Spytamylase · bugspytamylase · maltase og isomaltase',
    transport:
      'Glukose + Na⁺ via SGLT1 ind i enterocytten; GLUT2 ud til interstitset, blodkapillærer og portåresystemet mod leveren.',
  },
};
export const ROUTE = [
  [
    'mouth',
    'Cavitas oris',
    'Mundhulen',
    6.8,
    'Tændernes terror',
    'Velkommen til den mekaniske afdeling. 32 tænder – men kun bestemte bindinger på menuen.',
  ],
  [
    'pharynx',
    'Pharynx',
    'Svælget',
    6.8,
    'Synkning',
    'Synkning koordinerer larynxløft, lukning af stemmelæber og larynxindgang samt epiglottisbevægelse. Fødebolus føres mod spiserøret.',
  ],
  [
    'oesophagus',
    'Oesophagus',
    'Spiserøret',
    6.5,
    'Peristaltisk ekspres',
    'Bølger af kontraktion fører bolus frem – også uden tyngdekraftens hjælp.',
  ],
  [
    'cardia',
    'Cardia',
    'Overgang til mavesækken',
    5,
    'Automatisk passage',
    'Den nedre øsofageale lukkefunktion åbner ved synkning og begrænser refluks.',
  ],
  [
    'stomach',
    'Ventriculus / gaster',
    'Mavesækken',
    2.5,
    'Syrebad fra helvede',
    'Kroppens kemiske vaskemaskine. Temperaturen er behagelig. pH er det ikke.',
  ],
  [
    'pylorus',
    'Pylorus',
    'Maveporten',
    3,
    'Automatisk passage',
    'Små portioner chymus doseres gennem pylorus til duodenum.',
  ],
  [
    'duodenum',
    'Duodenum',
    'Tolvfingertarmen',
    6.2,
    'Enzymernes endelige opgør',
    'Bugspytkirtlen har sendt forstærkninger. Bikarbonat neutraliserer gradvist syren.',
  ],
  [
    'jejunum',
    'Jejunum',
    'Tomtarmen',
    7,
    'Den store absorption',
    'Folder, villi og mikrovilli giver en enorm overflade til optagelse.',
  ],
  [
    'ileum',
    'Ileum',
    'Krumtarmen',
    7.4,
    'Sidste stræk af tyndtarmen',
    'Nu følger du en ufordøjelig rest. Det absorberede næringsstof er allerede på vej ind i kroppen.',
  ],
  [
    'ileocaecal',
    'Valva ileocaecalis',
    'Ileocøkalklappen',
    6.6,
    'Automatisk passage',
    'Overgangen forbinder ileum med caecum og begrænser tilbageløb.',
  ],
  [
    'caecum',
    'Caecum',
    'Blindtarmen',
    6,
    'Bakteriernes hovedkvarter',
    'Appendix vermiformis er en blind sidegren – ikke hovedruten.',
  ],
  [
    'ascending',
    'Colon ascendens',
    'Opadstigende tyktarm',
    6.2,
    'Vand til genbrug',
    'Vand og elektrolytter optages. Mikrobiota fermenterer blandt andet kostfibre.',
  ],
  [
    'transverse',
    'Colon transversum',
    'Tværgående tyktarm',
    6.4,
    'På tværs',
    'Haustra opdeler lumen. Tarmindholdet bliver gradvist fastere.',
  ],
  [
    'descending',
    'Colon descendens',
    'Nedadstigende tyktarm',
    6.6,
    'På vej ned',
    'Transporten fortsætter gennem venstre side af kroppen.',
  ],
  [
    'sigmoid',
    'Colon sigmoideum',
    'S-formet tyktarm',
    6.7,
    'Sidste sving',
    'Colon sigmoideum forbinder colon descendens med rectum.',
  ],
  [
    'rectum',
    'Rectum',
    'Endetarmen',
    6.8,
    'Venteværelset',
    'Udspiling kan udløse defækationstrang. Den ydre sfinkter kan styres viljemæssigt.',
  ],
  [
    'anal',
    'Canalis analis',
    'Analkanalen',
    6.8,
    'Automatisk passage',
    'Koordineret afslapning af sfinkterne tillader passage.',
  ],
  [
    'anus',
    'Anus',
    'Anus',
    6.8,
    'Sidste stop: porcelæn',
    'En ufordøjelig rest forlader kroppen. Det absorberede næringsstof gør ikke.',
  ],
].map(([id, latin, danish, ph, title, text], index) => ({
  id,
  latin,
  danish,
  ph,
  title,
  text,
  index,
  automatic: ['cardia', 'pylorus', 'ileocaecal', 'anal'].includes(id),
}));
export const PH_NOTE =
  'Vejledende: mund 6,2–7,6; fastende mave ofte 1–3, højere efter måltider; duodenum ca. 5,5–7,5; tyndtarm nær neutralt/let basisk. Colon varierer med bl.a. fermentering. Ikke en måling eller en skarp enzymgrænse.';
const task = (prompt, options, why, kind = 'enzyme') => ({ prompt, options, why, kind });
export const BOSSES = {
  stanley: {
    mouth: [
      task(
        'Find kædeklipperen i spyttet',
        ['Spytamylase', 'Pepsin', 'Pankreaslipase'],
        'Spytamylase starter hydrolyse af interne α-1,4-glykosidbindinger i stivelse.',
      ),
      task(
        'Forbind spytamylase med produktionsstedet',
        ['Spytkirtler', 'Mavesækkens hovedceller', 'Lever'],
        'Spytkirtler producerer og udskiller amylase til mundhulen.',
        'source',
      ),
      task(
        'Byg reaktionen: Stivelse + H₂O + amylase → …',
        ['Maltose, maltotriose og α-limit-dextriner', 'Kun fri glukose', 'Aminosyrer'],
        'Amylase spalter ikke α-1,6-forgreninger. Enzymet forbruges ikke.',
        'reaction',
      ),
    ],
    stomach: [
      task(
        'Hvem kan fortsætte kortvarigt inde i bolus?',
        ['Spytamylase fra munden', 'En ny gastrisk amylase', 'Pepsin spalter stivelse'],
        'Spytamylase kan virke, indtil syren trænger ind; aktiviteten aftager gradvist ved lav pH.',
      ),
      task(
        'Hvilket organ leverede denne amylase?',
        ['Spytkirtlerne før synkning', 'Mavesækkens parietalceller', 'Galdeblæren'],
        'Mavesækken udskiller ikke et væsentligt stivelsesspaltende enzym.',
        'source',
      ),
      task(
        'Vælg den rigtige proces i det sure miljø',
        [
          'Amylase hæmmes gradvist; maven blander føden',
          'Syre omdanner al stivelse til glukose',
          'Pepsin spalter glykosidbindinger',
        ],
        'Blanding er mekanisk. Syrehæmning er ikke en enkelt tænd/sluk-grænse.',
        'reaction',
      ),
    ],
    duodenum: [
      task(
        'Vælg enzymet, der overtager stivelsen',
        ['Bugspytamylase', 'Pepsin', 'Trypsin'],
        'Bugspytamylase fortsætter hydrolysen i det mindre sure tarmlumen.',
      ),
      task(
        'Forbind enzymet med organ → udskillelsessted',
        ['Pankreas → duodenum', 'Lever → mavesæk', 'Tarmvillus → spiserør'],
        'Acinære celler i pankreas producerer amylase; sekretet tilføres duodenum.',
        'source',
      ),
      task(
        'Fuldfør reaktionskæden',
        [
          'Amylase → mindre kulhydrater → børstesømsenzymer → glukose',
          'Amylase → aminosyrer → lymfe',
          'Galde → glukose',
        ],
        'Maltase-glukoamylase og sukrase-isomaltase ved børstesømmen færdiggør nedbrydningen; isomaltase håndterer α-1,6-bindinger.',
        'reaction',
      ),
    ],
  },
};
export const ABSORPTION = {
  stanley: [
    [
      'lumen',
      'Lumen · millimeter',
      'Plicae circulares bærer villi. Stivelsen er blevet til absorberbar glukose.',
    ],
    [
      'villus',
      'Villus · ca. 0,5–1 mm',
      'Enterocytter og bægerceller dækker villus. Indeni ses blodkapillærer og et centralt lymfekar.',
    ],
    [
      'cell',
      'Enterocyt · mikrometer',
      'Børstesømmen består af mikrovilli. Glukose nærmer sig den apikale membran.',
    ],
    [
      'membrane',
      'Membran · nanometer',
      'SGLT1 optager glukose sammen med Na⁺ apikalt. Na⁺-gradienten vedligeholdes af den basolaterale Na⁺/K⁺-ATPase.',
    ],
    [
      'transport',
      'GLUT2 → blod → portåre',
      'Glukose forlader enterocytten via basolateral GLUT2, passerer interstitset og når blodkapillærerne.',
    ],
    [
      'residue',
      'Perspektivskift',
      'Mission fuldført! Glukosen er optaget. Du følger nu en ufordøjelig rest gennem ileum og tyktarmen.',
    ],
  ],
};
export const digestionPath = {
  id: DIGESTION_ID,
  title: 'Fordøjelsens vilde rejse – fra første bid til sidste skyl',
  semester: 1,
  subject: 'Anatomi og fysiologi',
  subjects: ['Anatomi og fysiologi'],
  durationMinutes: 20,
  description:
    'Bliv et næringsstof. Overlev tænder, syre og enzymer i en interaktiv 3D-rejse fra mund til absorption og sidste skyl.',
  steps: ['stanley', 'trine', 'poul'].map((id) => ({
    id: `digestion-${id}`,
    title: { stanley: 'Stivelsen Stanley', trine: 'Triglyceridet Trine', poul: 'Proteinet Poul' }[
      id
    ],
    type: 'game',
    text: 'Anatomi, enzymreaktioner og absorption i 3D.',
    questions: [],
  })),
};
CHARACTERS.trine = {
  name: 'Triglyceridet Trine',
  color: 0x7bd5bb,
  description:
    'Tre fedtsyrer og ét glycerol. Et stærkt forhold – indtil lipaserne begynder at blande sig.',
  enzymes: 'Lingual lipase · gastrisk lipase · pankreaslipase med colipase',
  transport:
    'Især langkædede fedtsyrer og 2-monoglycerider: optagelse, reesterificering til triglycerider, chylomikroner og centralt lymfekar. Kortere fedtsyrer kan gå mere direkte til portalblodet.',
};
CHARACTERS.poul = {
  name: 'Proteinet Poul',
  color: 0xb69cf0,
  description: 'Du har brugt hele dit liv på at folde dig perfekt. Nu kommer mavesyren.',
  enzymes: 'Pepsin · enteropeptidase · trypsin · chymotrypsin · peptidaser',
  transport:
    'Aminosyrer via bl.a. Na⁺-koblede transportere; di-/tripeptider via H⁺-koblede PEPT1. Intracellulære peptidaser hydrolyserer mange små peptider. Aminosyrer videre til blodkapillærer og portåresystem.',
};
BOSSES.trine = {
  mouth: [
    task(
      'Begynder den væsentligste fedthydrolyse i munden?',
      [
        'Nej – tygning dominerer; lingual lipase får især betydning senere',
        'Ja – galde spalter esterbindinger',
        'Ja – amylase spalter alle triglycerider',
      ],
      'Lingual lipase udskilles ved tungen og virker især efter synkning i det sure mavemiljø. Hos voksne foregår hovedparten af fedthydrolysen i tyndtarmen.',
    ),
    task(
      'Forbind lingual lipase med kilden',
      ['Kirtler ved tungen → spyt og fødebolus', 'Pankreas → mundhulen', 'Lever → tunge'],
      'Linguale kirtler leverer lingual lipase. Mekanisk findeling er ikke det samme som hydrolyse.',
      'source',
    ),
    task(
      'Hvad gør tænderne ved Trines esterbindinger?',
      [
        'Findeling af føden – triglyceridet er overvejende kemisk intakt',
        'Alle esterbindinger spaltes ved tygning',
        'Emulgering danner glukose',
      ],
      'Tygning findeler føden, men spalter ikke i sig selv triglyceridets esterbindinger.',
      'reaction',
    ),
  ],
  stomach: [
    task(
      'Vælg den præcise beskrivelse af mavefasen',
      [
        'Gastrisk og lingual lipase bidrager; tyndtarmen står for hovedparten',
        'Ingen fedthydrolyse kan ske i mavesækken',
        'Pepsin er det vigtigste fedtspaltende enzym',
      ],
      'Præduodenal lipolyse er reel, men relativt begrænset hos voksne. Den er mere betydningsfuld hos spædbørn.',
    ),
    task(
      'Hvor dannes gastrisk lipase?',
      ['Mavesækkens hovedceller', 'Mavesækkens parietalceller', 'Galdeblærens muskelceller'],
      'Hovedceller udskiller gastrisk lipase. Parietalceller udskiller blandt andet saltsyre.',
      'source',
    ),
    task(
      'Hvilken binding kan lipaser hydrolysere?',
      [
        'Esterbinding → delvise glycerider og frie fedtsyrer',
        'Peptidbinding → aminosyrer',
        'Glykosidbinding → maltose',
      ],
      'Æltning er mekanisk; lipasernes hydrolyse er kemisk. Ikke hele fedtmængden spaltes i maven.',
      'reaction',
    ),
  ],
  duodenum: [
    task(
      'Vælg det enzymatiske team',
      ['Pankreaslipase + colipase', 'Galde alene som enzym', 'Pepsin + amylase'],
      'Galdesalte emulgerer fedt og bidrager til blandede miceller; galde er ikke et enzym. Colipase hjælper lipasen ved fedt-vand-grænsefladen.',
    ),
    task(
      'Forbind sekreter med de rigtige organer',
      [
        'Lipase fra pankreas; galde dannes i leveren',
        'Lipase fra leveren; galde dannes i pankreas',
        'Begge dannes i galdeblæren',
      ],
      'Galde kan lagres og koncentreres i galdeblæren; den dannes i leveren. Pankreas leverer lipase og procolipase.',
      'source',
    ),
    task(
      'Byg fedtets vej mod epitelet',
      [
        'Emulgering → lipasehydrolyse → 2-monoglycerider og fedtsyrer → miceller',
        'Galde → hydrolyse → glukose',
        'Miceller → direkte ind i lymfen uden enterocytter',
      ],
      'Pankreaslipase spalter især position 1 og 3. Blandede miceller afleverer produkter ved epitelet; hele micellen optages ikke som en chylomikron.',
      'reaction',
    ),
  ],
};
BOSSES.poul = {
  mouth: [
    task(
      'Hvilket proteolytisk angreb møder Poul her?',
      [
        'Ingen væsentlig enzymatisk proteinnedbrydning',
        'Spytamylase spalter peptidbindinger',
        'Pepsin virker i spyttet',
      ],
      'Tygning findeler proteinholdig føde, men væsentlig proteolyse starter først i mavesækken.',
    ),
    task(
      'Hvor starter den væsentlige proteolyse?',
      ['Mavesækken – pepsin fra pepsinogen', 'Mundhulen – amylase', 'Leveren – galde'],
      'Spytkirtlerne leverer ikke pepsin. Pepsinogen kommer fra mavesækkens hovedceller.',
      'source',
    ),
    task(
      'Hvad ændrer tygningen først?',
      [
        'Madstykkets størrelse – peptidkæden er endnu overvejende intakt',
        'Alle proteiner bliver straks aminosyrer',
        'Alle peptidbindinger bliver esterbindinger',
      ],
      'Mekanisk findeling og enzymatisk hydrolyse er forskellige processer.',
      'reaction',
    ),
  ],
  stomach: [
    task(
      'Vælg syremiljøets protease',
      ['Pepsin', 'Amylase', 'Pankreaslipase'],
      'Lav pH fremmer denaturering og aktivering af pepsinogen. Pepsin hydrolyserer peptidbindinger.',
    ),
    task(
      'Forbind cellerne med deres produkter',
      [
        'Hovedceller: pepsinogen; parietalceller: HCl',
        'Hovedceller: galde; parietalceller: trypsin',
        'Enterocytter: pepsinogen; lever: HCl',
      ],
      'Syre starter aktiveringen; pepsin kan aktivere mere pepsinogen. Denaturering udfolder protein, men spalter ikke i sig selv peptidkæden.',
      'source',
    ),
    task(
      'Byg den rigtige rækkefølge',
      [
        'Syre og denaturering → pepsinaktivering → peptidhydrolyse → mindre peptider',
        'Denaturering → alle peptidbindinger forsvinder',
        'Pepsin → glukose og fedtsyrer',
      ],
      'Pepsin klipper kæden til mindre peptider. Det er ikke det samme som blot at udfolde den.',
      'reaction',
    ),
  ],
  duodenum: [
    task(
      'Find proteasen, der vækker kollegerne',
      ['Trypsin', 'Spytamylase', 'Gastrisk lipase'],
      'Trypsin hydrolyserer peptidbindinger og aktiverer flere andre pankreatiske proteaseforstadier.',
    ),
    task(
      'Forbind produktion og første aktivering',
      [
        'Pankreas: trypsinogen; børstesøm: enteropeptidase',
        'Lever: aktivt trypsin; galdeblære: enteropeptidase',
        'Mavesæk: aktivt trypsin; spyt: chymotrypsin',
      ],
      'Enteropeptidase aktiverer trypsinogen til trypsin. Trypsin aktiverer bl.a. chymotrypsinogen; forstadier begrænser selvfordøjelse i pankreas.',
      'source',
    ),
    task(
      'Byg aktiverings- og nedbrydningskæden',
      [
        'Enteropeptidase → trypsin → flere proteaser → aminosyrer og små peptider',
        'Trypsinogen → galde → triglycerider',
        'Pepsin → amylase → glukose',
      ],
      'Pankreatiske og intestinale peptidaser samarbejder. Di-/tripeptider kan også optages og hydrolyseres inde i enterocytten.',
      'reaction',
    ),
  ],
};
ABSORPTION.trine = [
  [
    'lumen',
    'Tyndtarmens lumen · millimeter',
    'Galdesaltene danner blandede miceller med lipidnedbrydningsprodukter.',
  ],
  [
    'villus',
    'Villus · ca. 0,5–1 mm',
    'Blodkapillærer omgiver et centralt lymfekar. Chylomikronernes vej er især lymfen.',
  ],
  [
    'cell',
    'Enterocyt · mikrometer',
    'Miceller afleverer langkædede fedtsyrer og 2-monoglycerider ved børstesømmen. Hele micellen optages ikke.',
  ],
  [
    'membrane',
    'Optagelse og reesterificering',
    'Lipidprodukterne optages i enterocytten og reesterificeres til triglycerider. Transporten vises skematisk – ikke som SGLT1-transport.',
  ],
  [
    'transport',
    'Chylomikron → lymfe',
    'Triglycerider pakkes med andre lipider og apoB-48 i chylomikroner. De forlader cellen og når det centrale lymfekar. Denne vej gælder især langkædede fedtsyrer.',
  ],
  [
    'residue',
    'Perspektivskift',
    'Trine er optaget og pakket til lymfetransport. Du følger nu en ufordøjelig rest videre gennem ileum.',
  ],
];
ABSORPTION.poul = [
  [
    'lumen',
    'Tyndtarmens lumen · millimeter',
    'Proteaser og peptidaser danner aminosyrer og små peptider.',
  ],
  [
    'villus',
    'Villus · ca. 0,5–1 mm',
    'Enterocytter over blodkapillærer og et centralt lymfekar. Aminosyrer følger især blodvejen.',
  ],
  [
    'cell',
    'Enterocyt · mikrometer',
    'Børstesømmens mikrovilli bærer enzymer og transportproteiner.',
  ],
  [
    'membrane',
    'Aminosyrer og PEPT1',
    'Aminosyrer optages bl.a. med Na⁺-koblede transportere. H⁺-koblede PEPT1 optager di-/tripeptider.',
  ],
  [
    'transport',
    'Intracellulær hydrolyse → portalblod',
    'Mange små peptider hydrolyseres i enterocytten. Aminosyrer transporteres basolateralt til interstitset, blodkapillærerne og portåresystemet.',
  ],
  [
    'residue',
    'Perspektivskift',
    'Poul er blevet optaget som nedbrydningsprodukter. Nu følger du en ufordøjelig rest gennem resten af tarmen.',
  ],
];
// Ordered process interactions replace the third multiple-choice question.
export const REACTIONS = {
  stanley: {
    mouth: ['Stivelse', 'Amylase + vand', 'Kortere kulhydrater'],
    stomach: ['Spytamylase inde i bolus', 'Syre trænger gradvist ind', 'Amylaseaktivitet aftager'],
    duodenum: ['Bugspytamylase', 'Børstesømsenzymer', 'Glukose'],
  },
  trine: {
    mouth: [
      'Føde med triglycerid',
      'Tygning og spyt',
      'Findelt føde – overvejende intakte triglycerider',
    ],
    stomach: ['Triglycerid', 'Lingual/gastrisk lipase + vand', 'Delvise glycerider og fedtsyrer'],
    duodenum: [
      'Galde emulgerer',
      'Lipase + colipase hydrolyserer',
      '2-monoglycerider og fedtsyrer i miceller',
    ],
  },
  poul: {
    mouth: ['Proteinholdig føde', 'Tygning', 'Mindre madstykker – peptidkæden bevares'],
    stomach: ['Syre udfolder; pepsinogen aktiveres', 'Pepsin + vand', 'Mindre peptider'],
    duodenum: [
      'Enteropeptidase aktiverer trypsinogen',
      'Trypsin aktiverer flere proteaser',
      'Aminosyrer og små peptider',
    ],
  },
};

// Three visible secret/enzyme hypotheses at the special duodenal stop.
BOSSES.stanley.duodenum[0].options = ['Bugspytamylase', 'Galdesalte', 'Trypsin'];
BOSSES.trine.duodenum[0].options = ['Bugspytlipase med colipase', 'Bugspytamylase', 'Trypsin'];
BOSSES.poul.duodenum[0].options = ['Aktiverede pankreasproteaser', 'Bugspytamylase', 'Galdesalte'];
