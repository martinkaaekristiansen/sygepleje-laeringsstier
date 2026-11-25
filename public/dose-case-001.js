// All clinical facts, narrative locks, answers and scoring belong to the case.
const seen = (id) => ({ seen: id }),
  found = (id) => ({ found: id });
const any = (...rules) => ({ any: rules }),
  all = (...rules) => ({ all: rules });
const block = (id, title, text, extra = {}) => ({ id, title, text, ...extra });
const scene = (id, title, phase, illustration, location, time, intro, blocks, extra = {}) => ({
  id,
  title,
  phase,
  illustration,
  location,
  time,
  intro,
  blocks,
  ...extra,
});
const opt = (id, label) => ({ id, label });
const question = (id, category, prompt, points, options, correct, explanation, extra = {}) => ({
  id,
  category,
  prompt,
  points,
  type: 'choice',
  options: options.map(([id, label]) => opt(id, label)),
  correct,
  explanation,
  ...extra,
});
export const case001 = {
  id: 'sag-001',
  version: 1,
  title: 'Sag 001 – Det sidste hjerteslag',
  semester: 3,
  start: 'briefing',
  intro:
    'Klokken er 07.12. Du møder på medicinsk afdeling. Genoplivningen på stue 14 er afsluttet, og Erik Jensen er erklæret død. Du skal undersøge forløbet som led i afdelingens læring.',
  learningGoals: [
    'Sammenholde ordination, dispensering og administration',
    'Forklare betydningen af nyrefunktion og elektrolytter',
    'Genkende klinisk forværring og handle på den',
    'Analysere systemets sikkerhedsbarrierer',
  ],
  phases: [
    'Gerningsstedet',
    'De første mistanker',
    'Sporene samles',
    'Målrettet efterforskning',
    'Det afgørende bevis',
  ],
  images: Object.fromEntries(
    [
      'cover',
      'facade',
      'room',
      'patient',
      'bedside',
      'wife',
      'daughter',
      'friend',
      'day-nurse',
      'evening-nurse',
      'doctor',
      'medicine-room',
      'cabinet',
      'tray',
      'lab',
      'workstation',
      'monitor',
      'family',
      'before',
    ].map((id) => [
      id,
      {
        src: new URL('./dose-' + id + '.webp', import.meta.url).href,
        alt:
          'Fiktiv fotoillustration: ' +
          ({
            cover: 'hospitalsgangen ved daggry',
            wife: 'Inger i pårørenderummet',
            daughter: 'Louise i pårørenderummet',
            friend: 'Poul i besøgsrummet',
            'day-nurse': 'dagvagt Sara',
            'evening-nurse': 'aftenvagt Mette',
            doctor: 'læge Jonas',
            patient: 'Erik i sengen, respektfuldt illustreret',
            bedside: 'natbord med vandglas og familiefoto',
            lab: 'klinisk laboratorium',
            tray: 'medicinbakke uden kliniske etiketter',
            cabinet: 'medicinskab',
            family: 'Erik og Inger i haven',
            before: 'Erik før forværringen',
            room: 'stue 14',
            monitor: 'seng med slukket monitor',
            workstation: 'journalstation',
            facade: 'hospitalets facade',
            'medicine-room': 'medicinrummet',
          }[id] || id),
      },
    ]),
  ),
  characters: [
    {
      id: 'erik',
      name: 'Erik Jensen',
      role: '78 år. Tidligere buschauffør, gift med Inger. Glad for havearbejde og sine børnebørn.',
      image: 'family',
    },
    {
      id: 'inger',
      name: 'Inger Jensen',
      role: 'Hustru gennem 51 år. Kender Eriks vaner, men ikke afdelingens medicinrutiner.',
      image: 'wife',
    },
    {
      id: 'louise',
      name: 'Louise Jensen',
      role: 'Datter, 49 år. Besøgte sin far aftenen før dødsfaldet.',
      image: 'daughter',
    },
    {
      id: 'poul',
      name: 'Poul Madsen',
      role: 'Nær ven og tidligere kollega. Talte med Erik i telefon.',
      image: 'friend',
    },
    {
      id: 'sara',
      name: 'Sara Holm',
      role: 'Sygeplejerske i dagvagten. Vil gerne forstå, hvad der skete.',
      image: 'day-nurse',
    },
    {
      id: 'mette',
      name: 'Mette Lund',
      role: 'Erfaren aftenvagt. Usikker på, om overleveringen var tilstrækkelig.',
      image: 'evening-nurse',
    },
    {
      id: 'jonas',
      name: 'Jonas Berg',
      role: 'Behandlingsansvarlig læge. Deltager i den tværfaglige gennemgang.',
      image: 'doctor',
    },
  ],
  scenes: [
    scene(
      'briefing',
      'Stue 14 · klokken 07.12',
      1,
      'cover',
      'Medicinsk afdeling',
      '13. marts 2026 · 07.12',
      'Et halvt glas vand. En opkastningspose. Et familiefoto. Ingen af tingene fortæller i sig selv, hvad der skete. Du har tre steder at begynde.',
      [
        block(
          'opening',
          'Din opgave',
          'Erik Jensen, 78 år, er død efter et genoplivningsforsøg. Der er ingen synlige tegn på fysisk skade. Hustruen bemærkede en ændring i hans tilstand aftenen før. Undersøg hændelsesforløbet og mulige svigtende sikkerhedsbarrierer.',
        ),
      ],
    ),
    scene(
      'wife',
      'Tal med Inger',
      2,
      'wife',
      'Pårørenderummet',
      '13. marts · 07.25',
      'Inger drejer vielsesringen mellem fingrene. Du giver hende tid og spørger, hvad hun lagde mærke til.',
      [
        block(
          'yellow-vision',
          '»Fjernsynet var blevet gult«',
          'Du: Hvad var anderledes i går?\nInger: Han sagde, at fjernsynet havde fået sådan et gulligt skær. Jeg troede først, det var lyset. Han var også kvalm. Erik plejede ellers aldrig at klage.',
          { speaker: 'Inger' },
        ),
        block(
          'wife-context',
          'En tidligere ændring',
          'Du: Var han bekymret over noget?\nInger: Medicinen var blevet ændret tidligere, men jeg kan ikke huske navnene. Måske kan jeg genkende dem, hvis jeg ser listen.',
          { speaker: 'Inger' },
        ),
        block(
          'wife-return',
          'Da du nævner listen',
          'Inger ser på dine papirer: Ja, det er den liste, jeg mente. Jeg vil gerne tale med dig igen om hans hjertemedicin.',
          { when: seen('medicines'), speaker: 'Inger' },
        ),
      ],
      {
        when: seen('briefing'),
        reason: 'Inger var hos Erik aftenen før og har sagt ja til at tale med dig.',
      },
    ),
    scene(
      'room',
      'Undersøg patienten og stuen',
      2,
      'patient',
      'Stue 14',
      '13. marts · 07.20',
      'Undersøgelsen sker respektfuldt efter dødsfaldet. Du ændrer ikke behandling og bruger kun de dokumenterede observationer.',
      [
        block(
          'room-findings',
          'Observationer',
          'Bleghed, ingen synlige ydre læsioner. Opkastningsposen er brugt. Ingen synlig blodig opkast eller melæna i plejenotatet. Fundene fastslår ikke dødsårsagen.',
        ),
        block(
          'bedside-items',
          'Natbordet',
          'Et halvt glas vand og et foto af Erik med børnebørnene. Der står et privat vitaminpræparat i en lukket taske. Fundet kan undersøges, men siger ikke i sig selv noget om hændelsen.',
        ),
      ],
      {
        when: seen('briefing'),
        reason: 'Stuen og de sidste observationer kan give udgangspunkt for journalgennemgangen.',
      },
    ),
    scene(
      'admission',
      'Læs indlæggelsesjournalen',
      2,
      'workstation',
      'Fiktivt journalsystem · KLINIK',
      '10. marts · 09.10',
      'Du åbner den oprindelige indlæggelse og holder den adskilt fra senere vurderinger.',
      [
        block(
          'history',
          'Baggrund',
          'Erik har atrieflimren, kronisk hjertesvigt, hypertension og type 2-diabetes. Indlagt 10. marts med tiltagende dyspnø, perifere ødemer og vægtstigning. Vægt ved indlæggelsen 82,0 kg.',
        ),
        block(
          'admission-treatment',
          'Behandlingsplan',
          'Intravenøs diuretisk behandling intensiveres. Daglig vægt, væskeregnskab og kontrol af nyrefunktion og elektrolytter planlægges. Erik har i forvejen fået vanddrivende medicin i længere tid.',
        ),
      ],
      {
        when: seen('briefing'),
        reason: 'Indlæggelsen giver en tidsmæssig baseline for hans sygdomme og behandling.',
      },
    ),
    scene(
      'daughter',
      'Spørg Louise om besøget',
      2,
      'daughter',
      'Pårørenderummet',
      'Besøg 12. marts · 18.30',
      'Louise er ankommet. Du spørger til, hvad hun konkret så, uden at foreslå en forklaring.',
      [
        block(
          'vomiting',
          '»Han kunne ikke spise«',
          'Du: Hvordan var din far under besøget?\nLouise: Bakken stod næsten urørt. Han kastede op og sagde, at hjertet hoppede. Vi troede, han var udmattet. Jeg sagde det til en af sygeplejerskerne.',
          { speaker: 'Louise' },
        ),
      ],
      {
        when: seen('wife'),
        reason:
          'Inger fortæller, at Louise også besøgte Erik og kan supplere hendes observationer.',
      },
    ),
    scene(
      'friend',
      'Ring til Poul',
      2,
      'friend',
      'Telefoninterview',
      'Samtale 12. marts · 14.00',
      'Poul har hørt om dødsfaldet og vil gerne fortælle om deres sidste samtale.',
      [
        block(
          'friend-fatigue',
          'En ændret samtale',
          'Poul: Han var træt og afsluttede samtalen hurtigt. Han ville hjem til haven. Han nævnte ikke brystsmerter. Jeg ved ikke, om det betyder noget.',
          { speaker: 'Poul' },
        ),
        block(
          'old-vitamins',
          'Vitaminerne',
          'Poul: Jeg gav ham almindelige vitaminer til jul. Inger siger, at den lukkede dåse har ligget i tasken siden. Jeg har aldrig givet ham anden medicin.',
          { speaker: 'Poul' },
        ),
      ],
      {
        when: any(seen('daughter'), seen('room')),
        reason: 'Familien foreslår Poul som en supplerende kilde til Eriks hverdag.',
      },
    ),
    scene(
      'nursing',
      'Åbn sygeplejejournalen',
      3,
      'workstation',
      'KLINIK · plejenotater',
      '12. marts · 08.00–22.15',
      'Notaterne vises i deres oprindelige rækkefølge. De er skrevet før dødsfaldet.',
      [
        block(
          'nursing-symptoms',
          '08.30 og 16.15',
          '08.30: Lille morgenmåltid, træt.\n16.15: Kvalme og svimmelhed. Puls 48/min. Patienten bliver liggende. Notat: »Observeres; muligvis relateret til væsketab«. Ingen dokumenteret lægelig vurdering på dette tidspunkt.',
        ),
        block(
          'missed-escalation',
          '22.15 · overlevering',
          'Puls 39/min, BT 88/54 mmHg og tiltagende utilpashed. Mette noterer telefonisk kontakt til forvagt kl. 22.20; der bestilles EKG og blodprøve. Det fremgår ikke, hvem der skal følge op. Der er ikke dokumenteret en samlet akut revurdering.',
        ),
      ],
      {
        when: any(seen('room'), seen('admission'), seen('daughter')),
        reason:
          'Stuefund, forløbet eller familiens observationer kan sammenholdes med personalets dokumentation.',
      },
    ),
    scene(
      'vitals',
      'Sammenlign vitalparametre',
      3,
      'monitor',
      'KLINIK · observationsark',
      '12. marts · 08.00 / 16.00 / 22.00',
      'Et enkelt tal er et øjebliksbillede. Undersøg udviklingen over dagen.',
      [
        block(
          'vital-trend',
          'Puls, blodtryk og respiration',
          'Puls 72 → 48 → 39/min. Blodtryk 118/72 → 104/65 → 88/54 mmHg. Respirationsfrekvens 18 → 19 → 23/min. Saturation 96 → 96 → 95 % uden ilt. Temperatur 36,8 → 36,7 → 36,6 °C. Vågen og orienteret om morgenen; kvalm og svimmel kl. 16, tiltagende utilpas kl. 22.',
          {
            table: {
              headers: ['Tid', 'Puls /min', 'BT mmHg', 'RF /min', 'SpO₂ %', '°C'],
              rows: [
                ['08.00', '72', '118/72', '18', '96', '36,8'],
                ['16.00', '48', '104/65', '19', '96', '36,7'],
                ['22.00', '39', '88/54', '23', '95', '36,6'],
              ],
            },
            chart: {
              label: 'Puls over tid, slag/min',
              values: [72, 48, 39],
              labels: ['08', '16', '22'],
            },
          },
        ),
      ],
      {
        when: any(seen('nursing'), seen('admission')),
        reason:
          'Journalen giver grund til at sammenligne observationerne. Der beregnes ikke en uverificeret TOKS-score.',
      },
    ),
    scene(
      'fluid',
      'Undersøg væskeregnskab og vægt',
      3,
      'before',
      'KLINIK · væske og vægt',
      '10.–12. marts',
      'Intensiveret diurese skal vurderes i forhold til den aktuelle kliniske tilstand.',
      [
        block(
          'fluid-loss',
          'Vægt og registreret balance',
          'Vægt 82,0 kg den 10. marts → 79,2 kg den 11. → 77,0 kg den 12. Væskeindtag ca. 900–1100 ml/døgn; registreret diurese 2600–3200 ml/døgn. Hertil opkast og usikre tab. Vægttab 5,0 kg. Tallene beskriver observeret balance og er ikke en beregning af præcis intravaskulær volumen.',
        ),
      ],
      {
        when: any(seen('admission'), seen('nursing')),
        reason: 'Den diuretiske behandling og symptomerne gør væskestatus relevant.',
      },
    ),
    scene(
      'labs',
      'Åbn de almindelige blodprøver',
      3,
      'lab',
      'KLINIK · klinisk biokemi',
      '10. og 12. marts · 06.00',
      'Referenceintervallerne er vejledende voksenintervaller i den fiktive afdeling; lokale laboratorier kan afvige.',
      [
        block(
          'creatinine',
          'Kreatinin',
          '10. marts: 102 µmol/L. 12. marts: 218 µmol/L. Vejledende interval for voksne mænd: 60–105 µmol/L.',
          {
            neutral:
              'Kreatinin er et nedbrydningsprodukt, som blandt andet anvendes ved vurdering af nyrernes filtration.',
          },
        ),
        block(
          'potassium',
          'Kalium',
          '10. marts: 3,6 mmol/L. 12. marts: 2,9 mmol/L. Vejledende interval: 3,5–4,4 mmol/L.',
          { neutral: 'Kalium er en elektrolyt, som er vigtig for cellers elektriske aktivitet.' },
        ),
        block(
          'magnesium',
          'Magnesium',
          '10. marts: 0,70 mmol/L. 12. marts: 0,59 mmol/L. Vejledende interval: 0,70–1,10 mmol/L.',
          {
            neutral:
              'Magnesium er en elektrolyt, som indgår i mange enzymreaktioner og i muskel- og nervefunktion.',
          },
        ),
        block(
          'other-labs',
          'Øvrige blodprøver',
          '12. marts: Natrium 137 mmol/L (137–145). CRP 12 mg/L (<8). Leukocytter 8,2 ×10⁹/L (3,5–10,0). Hæmoglobin 8,1 mmol/L, ved indlæggelsen 8,2 (mænd 8,3–10,5). Karbamid 16,2 mmol/L (3,5–8,1). Glukose 7,1 mmol/L; patienten har diabetes.',
          {
            table: {
              headers: ['Analyse', '12/3', 'Vejledende interval'],
              saveRows: true,
              rows: [
                ['Natrium', '137 mmol/L', '137–145 mmol/L'],
                ['CRP', '12 mg/L', '<8 mg/L'],
                ['Leukocytter', '8,2 ×10⁹/L', '3,5–10,0 ×10⁹/L'],
                ['Hæmoglobin', '8,1 mmol/L', '8,3–10,5 mmol/L (mænd)'],
                ['Karbamid', '16,2 mmol/L', '3,5–8,1 mmol/L'],
                ['Glukose', '7,1 mmol/L', 'Ikke fastende · vurderes efter klinik og diabetes'],
              ],
            },
            neutral:
              'CRP måler et akutfaseprotein; leukocytter er hvide blodceller; hæmoglobin transporterer ilt; karbamid dannes ved proteinomsætning. Natrium indgår i væske- og saltbalance; glukose måler blodsukker. Resultater vurderes sammen med klinikken.',
          },
        ),
      ],
      {
        when: any(seen('fluid'), seen('vitals'), seen('admission')),
        reason:
          'Nyrefunktion og elektrolytter indgår i den planlagte kontrol og kan nu sammenlignes over tid.',
      },
    ),
    scene(
      'medicines',
      'Hent medicinlisten',
      3,
      'medicine-room',
      'KLINIK · aktuel medicin',
      'Ordinationsudtræk 12. marts · 08.00',
      'Dette er en ordinationsliste. Den dokumenterer ikke, hvad der faktisk blev givet. Alle seks lægemidler har et lokalt fagligt opslag.',
      [
        block(
          'medication-list',
          'Ordinationer',
          'Digoxin 62,5 µg peroralt kl. 08 én gang dagligt. Furosemid 40 mg intravenøst kl. 08 og 14. Ramipril 2,5 mg peroralt dagligt, pauseret 12. marts kl. 08. Apixaban oprindeligt 5 mg peroralt to gange dagligt, reduceret til 2,5 mg to gange dagligt 12. marts efter lægelig revurdering af nyrefunktion. Atorvastatin 20 mg peroralt til natten. Metformin 500 mg peroralt to gange dagligt, pauseret 12. marts kl. 08.',
          {
            table: {
              headers: ['Lægemiddel', 'Ordination / status'],
              rows: [
                ['Digoxin', '62,5 µg × 1 PO kl. 08'],
                ['Furosemid', '40 mg × 2 IV kl. 08 / 14'],
                ['Ramipril', '2,5 mg × 1 PO · pauseret'],
                ['Apixaban', '2,5 mg × 2 PO fra 12/3'],
                ['Atorvastatin', '20 mg × 1 PO til natten'],
                ['Metformin', '500 mg × 2 PO · pauseret'],
              ],
            },
          },
        ),
      ],
      {
        when: any(seen('wife'), seen('labs'), seen('nursing'), seen('admission')),
        reason:
          'Sygdomme, observerede symptomer eller laboratoriefund gør en medicingennemgang relevant.',
      },
    ),
    scene(
      'wife-followup',
      'Vis Inger medicinlisten',
      4,
      'wife',
      'Pårørenderummet',
      '13. marts · opfølgende samtale',
      'Du viser hende de kendte præparatnavne. Det hjælper hende med at huske en konkret samtale.',
      [
        block(
          'prior-reduction',
          '»Den lille tablet blev sat ned«',
          'Inger: Digoxin, ja. Egen læge satte dosis ned til den lille tablet for nogle måneder siden, fordi nyrerne ikke havde det så godt. Han har taget den lille dosis hver morgen. Jeg vidste ikke, at man skulle holde øje med synet.',
          { speaker: 'Inger' },
        ),
      ],
      {
        when: all(seen('wife'), seen('medicines')),
        reason:
          'Inger kan genkende præparatet, når du viser listen. Hun kendte ikke navnet i den første samtale.',
      },
    ),
    scene(
      'day-nurse',
      'Tal med dagvagt Sara',
      4,
      'day-nurse',
      'Personalekontoret',
      'Om 12. marts · dagvagt',
      'Sara vil gennemgå sit arbejde trin for trin og skelner mellem det, hun husker, og det, der er registreret.',
      [
        block(
          'morning-dose',
          'Morgenens medicin',
          'Sara: Han var træt. Jeg gav medicinen fra den færdige bakke klokken otte. Vi havde travlt, og jeg sammenholdt ikke hver tabletstyrke med ordinationen. Administrationsjournalen viser, hvad jeg kvitterede for.',
          { speaker: 'Sara' },
        ),
      ],
      {
        when: any(seen('nursing'), seen('vitals')),
        reason: 'De tidsfæstede observationer kan sammenholdes med dagvagtens handlinger.',
      },
    ),
    scene(
      'evening-nurse',
      'Tal med aftenvagt Mette',
      4,
      'evening-nurse',
      'Personalekontoret',
      'Om 12. marts · aftenvagt',
      'Mette ser tilbage på overleveringen og den manglende bedring.',
      [
        block(
          'handover',
          'En opgave uden tydelig ejer',
          'Mette: Jeg ringede, da han fik det værre. Der blev bestilt prøver og EKG. Jeg troede, at svaret ville blive vurderet af lægen; lægen troede måske, at vi ville ringe med det. Det er min erindring. Notaterne må vise, hvad der faktisk blev aftalt.',
          { speaker: 'Mette' },
        ),
      ],
      {
        when: any(seen('day-nurse'), seen('vitals')),
        reason: 'Aftenvagten var til stede ved den sene forværring.',
      },
    ),
    scene(
      'doctor',
      'Drøft forløbet med Jonas',
      4,
      'doctor',
      'Møderummet',
      '13. marts · efterfølgende gennemgang',
      'Lægen åbner sine tidsstemplede notater frem for at konkludere ud fra hukommelsen.',
      [
        block(
          'renal-review',
          'Lægenotat 12. marts · 08.00',
          'Nyrefunktionen er forværret, beregnet kreatininclearance omkring 27 ml/min ved aktuel vægt. Ramipril og metformin pauseres; apixaban reduceres efter individuel vurdering. Plan for væske og elektrolytter skal revurderes. Digoxin står fortsat som 62,5 µg dagligt. Ingen dokumenteret opfølgning på elektrolytsubstitution før den sene forværring.',
        ),
        block(
          'test-request',
          'Bestilling 12. marts · 22.25',
          'Ved langsom puls, kvalme og medicinlisten bestilles EKG og en målrettet lægemiddelkoncentration. Prøven tages kl. 22.30; sidste registrerede administration var kl. 12.00. Svaret bliver elektronisk tilgængeligt 13. marts kl. 00.10, men er ikke kvitteret.',
        ),
      ],
      {
        when: all(seen('medicines'), any(seen('labs'), seen('evening-nurse'), seen('vitals'))),
        reason:
          'Du har et konkret grundlag for at spørge til revurdering, bestillinger og opfølgning.',
      },
    ),
    scene(
      'ecg',
      'Gennemgå EKG og monitorlog',
      4,
      'monitor',
      'KLINIK · lægelig rytmebeskrivelse',
      '12. marts · 22.35 / 13. marts · 06.54',
      'Der vises en faglig tekstbeskrivelse; ingen AI-genereret EKG-kurve anvendes diagnostisk.',
      [
        block(
          'rhythm',
          'Dokumenteret rytmeudvikling',
          '22.35: Atrieflimren med langsom ventrikelfrekvens omkring 38/min og ventrikulære ekstrasystoler. 06.50: Episoder med ventrikulær takykardi. 06.54: Ventrikelflimren og hjertestop. Genoplivning iværksat; afsluttet 07.08 uden varig cirkulation. Rytmebeskrivelsen dokumenterer hændelsen, ikke alene dens årsag.',
        ),
      ],
      {
        when: any(seen('vitals'), seen('doctor')),
        reason: 'Bradykardien gør det relevant at hente den dokumenterede hjerterytme.',
      },
    ),
    scene(
      'infection',
      'Undersøg infektion som forklaring',
      4,
      'lab',
      'KLINIK · differentialdiagnostik',
      '12. marts · samlet udtræk',
      'En let forhøjet CRP kræver kontekst. Spørg, hvilke fund der taler for og imod infektion.',
      [
        block(
          'infection-check',
          'Temperatur og infektionsmarkører',
          'Ingen feber, leukocytter 8,2 ×10⁹/L og kun let CRP-stigning til 12 mg/L. Ingen dokumenteret fokal infektion. Disse fund svækker infektion som hovedforklaring, men udelukker den ikke alene.',
        ),
      ],
      {
        when: any(seen('labs'), { hypothesis: 'infection' }),
        reason:
          'Journalens mistanke eller din hypotese kan undersøges mod de tilgængelige infektionsdata.',
      },
    ),
    scene(
      'bleeding',
      'Undersøg mulig blødning',
      4,
      'room',
      'KLINIK · differentialdiagnostik',
      '12. marts · dokumentation',
      'Antikoagulationsbehandling gør blødning til en plausibel alternativ forklaring.',
      [
        block(
          'bleeding-check',
          'Hæmoglobin og observationer',
          'Hæmoglobin 8,2 → 8,1 mmol/L uden større fald; ingen dokumenteret melæna, hæmatemese eller ydre blødning. Ingen billeddiagnostisk påvisning af indre blødning. Materialet støtter ikke en stor blødning som hovedforklaring; en blodprøve alene kan ikke udelukke en akut blødning.',
        ),
      ],
      {
        when: all(seen('medicines'), any(seen('labs'), { hypothesis: 'bleeding' })),
        reason: 'Antikoagulans på listen kan sammenholdes med hæmoglobin og observationer.',
      },
    ),
    scene(
      'heart-failure',
      'Vurder forværring af hjertesvigt',
      4,
      'before',
      'KLINIK · lægenotat',
      '12. marts · 08.10',
      'Den kendte grundsygdom er en mulig forklaring, der også skal undersøges.',
      [
        block(
          'heart-check',
          'Klinik efter diurese',
          'Mindre perifere ødemer og mindre dyspnø end ved indlæggelsen. Ingen dokumenteret ny lungeødemudvikling. Hjertesvigt gør Erik sårbar, men forklarer ikke i sig selv hele kombinationen af mavegener, synsændring, bradykardi og doseringsoplysninger.',
        ),
      ],
      {
        when: any(seen('fluid'), { hypothesis: 'heart' }),
        reason:
          'Den oprindelige indlæggelsesårsag kan sammenholdes med behandlingseffekt og nye symptomer.',
      },
    ),
    scene(
      'administration',
      'Sammenhold administration og ordination',
      5,
      'tray',
      'KLINIK · medicinadministrationsjournal',
      '10.–12. marts · signeret udtræk',
      'Du åbner en anden dokumenttype end ordinationslisten. Sammenlign styrke, antal og klokkeslæt.',
      [
        block(
          'given-doses',
          'Registrerede administrationer',
          '10/3 kl. 08.00: Digoxin 250 µg, 1 tablet. 11/3 kl. 08.00: Digoxin 250 µg, 1 tablet. 12/3 kl. 08.00: Digoxin 250 µg, 1 tablet, signeret Sara. 12/3 kl. 12.00: Digoxin 250 µg, 1 tablet, signeret af anden dagvagt. Ordinationslisten angiver 62,5 µg én gang dagligt.',
          {
            table: {
              headers: ['Dato / tid', 'Styrke', 'Antal', 'Givet'],
              rows: [
                ['10/3 08.00', '250 µg', '1', '250 µg'],
                ['11/3 08.00', '250 µg', '1', '250 µg'],
                ['12/3 08.00', '250 µg', '1', '250 µg'],
                ['12/3 12.00', '250 µg', '1', '250 µg'],
              ],
            },
          },
        ),
      ],
      {
        when: all(
          seen('medicines'),
          any(seen('lookup-digoxin'), seen('day-nurse'), all(seen('labs'), seen('vitals'))),
        ),
        reason:
          'Du har både en ordination og kliniske oplysninger eller en konkret erindring, som gør en kontrol af den faktiske administration relevant.',
      },
    ),
    scene(
      'dispensing',
      'Undersøg dispenseringen',
      5,
      'cabinet',
      'Medicinrum · fiktiv dispenseringslog',
      '10.–12. marts',
      'Du undersøger den dokumenterede håndtering og skelner den fra efterfølgende antagelser.',
      [
        block(
          'strength-error',
          'Styrkeskift og kontrol',
          'Dispenseringsloggen angiver 1 tablet fra beholderen mærket 250 µg, selv om ordinationen er 62,5 µg. Et lagernotat fra 10/3 beskriver restordre på den lave styrke og placering af den højere styrke på samme hylde. Ingen dokumenteret kontrol mod ordineret mikrogramdosis.',
        ),
        block(
          'repeat-dose',
          'To kvitteringer',
          'Auditloggen viser to reelle administrationer den 12/3, ikke kun en dublet i visningen. Kl. 12 var morgenkvitteringen ikke synlig i det åbne skærmbillede. Den anden medarbejder antog, at morgenmedicinen manglede. Der forelå ingen ny ekstra ordination.',
        ),
      ],
      {
        when: seen('administration'),
        reason:
          'Uoverensstemmelsen gør det relevant at undersøge præparatstyrke og kvitteringsspor.',
      },
    ),
    scene(
      'nurse-followup',
      'Spørg Sara om styrkerne',
      5,
      'day-nurse',
      'Personalekontoret',
      'Opfølgende interview',
      'Du viser Sara de to tidsstempler og dispenseringsloggen. Hun får mulighed for at korrigere sin erindring.',
      [
        block(
          'barriers',
          '»Vi talte i tabletter«',
          'Sara: Jeg kan nu se, at vi talte om én tablet, ikke mikrogram. Der var en anden styrke på hylden. Jeg blev afbrudt, men det beviser ikke i sig selv, at afbrydelsen skabte fejlen. Vi manglede en fælles kontrol af styrke og en sikker kvittering på tværs af vagter.',
          { speaker: 'Sara' },
        ),
      ],
      {
        when: all(seen('day-nurse'), seen('dispensing')),
        reason: 'De konkrete dokumenter gør det muligt at stille et nyt, præcist spørgsmål.',
      },
    ),
    scene(
      'targeted',
      'Hent den målrettede analyse',
      5,
      'lab',
      'KLINIK · svararkiv',
      'Prøve 12/3 22.30 · svar 13/3 00.10',
      'Du beder om det allerede udtagne svar før dødsfaldet. Der tages ikke en ny prøve af den afdøde.',
      [
        block(
          'concentration',
          'P-digoxin 4,1 nmol/L',
          'Prøven er taget 10 timer og 30 minutter efter sidste registrerede dosis kl. 12.00. Vejledende målniveau ved vedligeholdelse er ofte omkring 0,6–1,2 nmol/L; mål afhænger af indikation og patient. Laboratoriet fremhæver, at koncentration skal vurderes sammen med klinik og prøvetidspunkt. Svaret er ikke kvitteret før hjertestoppet.',
        ),
      ],
      {
        when: all(
          seen('lookup-digoxin'),
          any(seen('administration'), seen('doctor'), all(seen('labs'), seen('vitals'))),
        ),
        reason:
          'Du har undersøgt lægemidlets egenskaber og har nu en klinisk eller dokumenteret mistanke, som begrunder opslaget.',
      },
    ),
    scene(
      'evening-followup',
      'Afklar opfølgningen med Mette',
      5,
      'evening-nurse',
      'Personalekontoret',
      'Opfølgende interview',
      'Du viser hende bestillingen og tidspunktet for analysesvaret.',
      [
        block(
          'unread-result',
          'Et ubesvaret svar',
          'Mette: Jeg overleverede, at prøverne var taget. Der blev ikke aftalt en navngiven ansvarlig eller et tidspunkt for at ringe igen. Jeg ved nu, at svaret kom efter midnat. Vi kan se, at det ikke blev læst; vi kan ikke ud fra loggen alene vide, hvad nogen tænkte.',
          { speaker: 'Mette' },
        ),
      ],
      {
        when: all(seen('evening-nurse'), seen('targeted')),
        reason:
          'Et konkret, tidsstemplet analysesvar giver grund til at afklare opfølgningsansvaret.',
      },
    ),
    ...[
      [
        'digoxin',
        'Digoxin',
        'Hjerteglykosid. Bruges blandt andet til frekvenskontrol ved atrieflimren. Hæmmer Na⁺/K⁺-ATPase; øget intracellulært calcium giver positiv inotropi. Vagal påvirkning og langsommere AV-overledning kan sænke ventrikelfrekvensen. Udskilles især uomdannet renalt; halveringstid normalt ca. 1–2 døgn og forlænges ved nedsat nyrefunktion. Snævert terapeutisk indeks. Risiko: kvalme, opkast, appetitløshed, synsforstyrrelser, bradykardi og ventrikulære arytmier. Hypokaliæmi og hypomagnesiæmi øger følsomheden. Amiodaron, verapamil og andre interaktioner kræver kontrol. Visse ledningsforstyrrelser og ventrikelflimren er kontraindikationer. Kontrollér indikation, nyrefunktion, elektrolytter, puls og præparatstyrke. Ved mistanke om alvorlig forgiftning: akut lægelig vurdering, EKG/monitorering og vurdering af digoxinspecifikke antistoffragmenter. Akut svær forgiftning kan give hyperkaliæmi. En koncentration alene afgør ikke diagnosen.',
        'digoxin',
      ],
      [
        'furosemid',
        'Furosemid',
        'Loop-diuretikum mod væskeophobning. Hæmmer salttransport i Henles slynge og øger udskillelsen af salt og vand. Udskilles blandt andet renalt; effekt og dosis kræver individuel vurdering ved ændret nyrefunktion. Kan medføre hypovolæmi, hypotension og tab af kalium og magnesium; risikoen afhænger også af længerevarende behandling og ernæring. Elektrolytforstyrrelser kan øge følsomhed for hjerteglykosider. NSAID kan modvirke effekten og belaste nyrefunktionen. Anuri og svær ukorrigeret elektrolyt-/væskemangel kræver lægelig vurdering. Følg vægt, væske, blodtryk, nyretal og elektrolytter. IV-administration skal følge præparatets instruktion.',
        'furosemid',
      ],
      [
        'ramipril',
        'Ramipril',
        'ACE-hæmmer mod blandt andet hypertension og hjertesvigt. Mindsker dannelse af angiotensin II. Aktiv metabolit udskilles i væsentlig grad renalt; dosis og fortsat behandling vurderes ved nyrepåvirkning. Kan give hypotension, hyperkaliæmi, nyrepåvirkning, hoste og sjældent angioødem. Kaliumtilskud og kaliumbesparende diuretika kræver kontrol; NSAID og diuretika kan øge nyrebelastningen. Tidligere ACE-hæmmerudløst angioødem og graviditet er væsentlige kontraindikationer. Følg blodtryk, kreatinin og kalium. Pause er en individuel lægelig beslutning, ikke en universel regel ved et bestemt kreatinintal.',
        'ramipril',
      ],
      [
        'apixaban',
        'Apixaban',
        'Direkte faktor Xa-hæmmer til blandt andet forebyggelse af emboli ved ikke-valvulær atrieflimren. Elimineres ad flere veje, herunder delvist renalt. Vigtig risiko er blødning, som kan vise sig ved melæna, hæmatemese, hæmaturi, anæmi eller kredsløbspåvirkning. Aktiv klinisk betydende blødning er kontraindikation. Stærke CYP3A4/P-gp-hæmmere og -induktorer samt andre antitrombotika kræver vurdering. Dosis afhænger af indikation, nyrefunktion, alder og vægt. Ved NVAF og kreatininclearance 15–29 ml/min anbefales den lave dosis 2,5 mg to gange dagligt. Følg blødningstegn, hæmoglobin og nyrefunktion; INR bruges ikke til rutinemæssig effektstyring.',
        'apixaban',
      ],
      [
        'atorvastatin',
        'Atorvastatin',
        'Statin til lipidreduktion og kardiovaskulær forebyggelse. Hæmmer HMG-CoA-reduktase og omsættes især i leveren via CYP3A4; renal elimination er begrænset. Kan give muskelsmerter og leverpåvirkning; sjældent rabdomyolyse. Stærke CYP3A4-hæmmere kan øge eksponeringen. Aktiv leversygdom og graviditet er væsentlige kontraindikationer. Ved udtalte muskelsymptomer eller mørk urin kræves lægelig vurdering. Vurder interaktioner og relevante levertal; CK ved klinisk mistanke om muskelskade.',
        'atorvastatin',
      ],
      [
        'metformin',
        'Metformin',
        'Biguanid mod type 2-diabetes. Reducerer især leverens glukoseproduktion og forbedrer insulinfølsomheden. Udskilles uomdannet gennem nyrerne. Hyppigt mavegener; ved akkumulering og alvorlig akut sygdom kan laktatacidose forekomme. Kontraindiceret ved eGFR under 30 ml/min/1,73 m² og ved akut metabolisk acidose. Pauseres ved betydende akut sygdom, dehydrering eller akut nyresvigt efter klinisk vurdering. Alkoholoverforbrug og jodholdig kontrast kræver særlig opmærksomhed. Giver normalt ikke hypoglykæmi alene. Følg nyrefunktion, fødeindtag og almen tilstand.',
        'metformin',
      ],
    ].map(([id, name, text, source]) =>
      scene(
        'lookup-' + id,
        'Slå ' + name + ' op',
        4,
        'workstation',
        'Lokalt farmakologisk opslagsværk',
        'Fagligt redskab · ikke et facit',
        'Dette opslag beskriver lægemidlet generelt. Du skal selv sammenholde det med patientens oplysninger.',
        [block('drug-' + id, name, text)],
        {
          when: seen('medicines'),
          reason: 'Præparatet står på den fundne medicinliste.',
          sources: [source],
          kind: 'reference',
        },
      ),
    ),
  ],
  critical: [
    'yellow-vision',
    'vital-trend',
    'creatinine',
    'potassium',
    'magnesium',
    'medication-list',
    'given-doses',
    'strength-error',
    'repeat-dose',
    'concentration',
  ],
  hypothesisOptions: [
    opt('unknown', 'Der er endnu ikke tilstrækkelige oplysninger'),
    opt('infection', 'Infektion'),
    opt('heart', 'Forværring af hjertesvigt'),
    opt('bleeding', 'Blødning'),
    opt('medication', 'Lægemiddelrelateret påvirkning'),
    opt('fluid', 'Væske- eller elektrolytforstyrrelse'),
    opt('own', 'Min egen hypotese'),
  ],
  hypothesisThresholds: [3, 7, 12],
  hints: [
    {
      levels: [
        'Hvad ved du fra observationer, og hvad er endnu antagelser?',
        'Sammenhold pårørendes oplevelser med det dokumenterede forløb.',
        'En ændring over tid kan være mere oplysende end et enkelt fund. Start med de tilgængelige samtaler og journaler.',
      ],
    },
    {
      when: seen('labs'),
      levels: [
        'Hvilke forklaringer passer med udviklingen i organfunktion?',
        'Sammenlign nyrefunktion, elektrolytter og behandling, hvis du har hentet medicinlisten.',
        'Et lægemiddels elimination og patientens følsomhed er forskellige forhold. Brug de lokale opslag, når listen er fundet.',
      ],
    },
    {
      when: seen('medicines'),
      levels: [
        'Er en ordination det samme som en dokumenteret administration?',
        'Undersøg alle relevante præparater og sammenhold listen med de fundne symptomer.',
        'Sammenlign dosis i mikrogram, tabletstyrke, antal og tidspunkt. Kontroller den faktiske administrationsjournal, når den er tilgængelig.',
      ],
    },
    {
      when: seen('administration'),
      levels: [
        'Kan din forklaring forbinde medicinhåndtering og klinisk udvikling?',
        'Sammenhold samlet døgnmængde med ordination og undersøgelsernes tidspunkter.',
        'En målrettet koncentration skal fortolkes sammen med EKG, nyrefunktion og elektrolytter, ikke som et isoleret bevis.',
      ],
    },
  ],
  freeQuestions: [
    'Hvad var patientens primære dødsårsag?',
    'Hvilket risikosituationslægemiddel var involveret?',
    'Hvilken konkret medicineringsfejl blev begået?',
    'Hvilke farmakologiske mekanismer forklarer dødsfaldet?',
    'Hvilke fysiologiske og sygdomsrelaterede faktorer bidrog?',
    'Hvilke kliniske advarselstegn burde have medført handling?',
    'Hvornår kunne hændelsesforløbet være blevet afbrudt?',
    'Hvilke sikkerhedsbarrierer svigtede?',
    'Hvordan kunne dødsfaldet være forebygget?',
  ],
  assessment: [
    question(
      'cause',
      'Dødsårsag',
      'Hvilken samlet forklaring understøttes bedst?',
      20,
      [
        ['toxicity', 'Digoxinforgiftning med fatal ventrikulær arytmi'],
        ['sepsis', 'Septisk shock'],
        ['bleeding', 'Stor blødning som følge af apixaban'],
        ['heart', 'Hjertesvigt alene'],
      ],
      'toxicity',
      'Den fiktive rekonstruktion samler overeksponering, nyrepåvirkning, elektrolytforstyrrelser, symptomer og rytmeudvikling. Et koncentrationstal alene beviser ikke dødsårsagen.',
    ),
    question(
      'drug',
      'Risikosituationslægemiddel',
      'Hvilket risikosituationslægemiddel er centralt i sagen?',
      10,
      [
        ['digoxin', 'Digoxin'],
        ['apixaban', 'Apixaban'],
        ['metformin', 'Metformin'],
      ],
      'digoxin',
      'Alle tre kræver sikker håndtering, men doseringsloggen og det samlede kliniske billede peger her på digoxin.',
    ),
    question(
      'error',
      'Medicineringsfejl',
      'Hvilken fejl dokumenterer loggen?',
      5,
      [
        ['both', 'Forkert styrke og en ekstra administration uden ordination'],
        ['registration', 'Kun en teknisk dublet, ingen ekstra indgift'],
        ['order', 'En korrekt ordineret mætningsdosis'],
      ],
      'both',
      'Auditloggen dokumenterer både 250 µg i stedet for 62,5 µg og to indgifter den sidste dag. Der foreligger ingen mætningsordination.',
    ),
    question(
      'ordered',
      'Medicineringsfejl',
      'Hvor mange mikrogram var ordineret pr. døgn?',
      5,
      [],
      62.5,
      '62,5 µg én gang dagligt = 62,5 µg/døgn = 0,0625 mg/døgn.',
      { type: 'number', unit: 'µg/døgn' },
    ),
    question(
      'administered',
      'Medicineringsfejl',
      'Hvor mange mikrogram blev givet i alt den 12. marts?',
      5,
      [],
      500,
      '250 µg kl. 08 + 250 µg kl. 12 = 500 µg. Det er 437,5 µg mere end ordineret.',
      { type: 'number', unit: 'µg/døgn' },
    ),
    question(
      'ratio',
      'Medicineringsfejl',
      'Hvor mange gange den ordinerede døgnmængde blev givet den 12. marts?',
      5,
      [],
      8,
      '500 / 62,5 = 8 gange den ordinerede dosis. Én forkert tablet var allerede 4 gange den ordinerede dosis.',
      { type: 'number', unit: 'gange' },
    ),
    question(
      'mechanism',
      'Farmakologi',
      'Forbind de farmakologiske forhold med virkningen.',
      10,
      [
        ['calcium', 'Øget intracellulært calcium / positiv inotropi'],
        ['conduction', 'Langsommere AV-overledning'],
        ['accumulation', 'Større risiko for akkumulering'],
      ],
      { pump: 'calcium', vagus: 'conduction', kidney: 'accumulation' },
      'Digoxin hæmmer Na⁺/K⁺-ATPase; den ændrede ionbalance øger intracellulært calcium. Vagal effekt sænker AV-overledning. Nedsat renal elimination øger eksponeringen.',
      {
        type: 'match',
        pairs: [
          opt('pump', 'Hæmning af Na⁺/K⁺-ATPase'),
          opt('vagus', 'Vagal påvirkning af AV-knuden'),
          opt('kidney', 'Faldende renal elimination'),
        ],
      },
    ),
    question(
      'renal',
      'Farmakologi',
      'Hvorfor er kreatininudviklingen relevant?',
      5,
      [
        ['less', 'Nedsat nyrefunktion kan nedsætte eliminationen af digoxin'],
        ['more', 'Nedsat nyrefunktion øger altid eliminationen'],
        ['none', 'Digoxin elimineres kun via lungerne'],
      ],
      'less',
      'Digoxin elimineres hovedsageligt renalt. Akut ændring kræver samlet klinisk revurdering; steady-state-antagelser er usikre her.',
    ),
    question(
      'electrolytes',
      'Farmakologi',
      'Hvilket udsagn er mest præcist?',
      5,
      [
        ['sensitivity', 'Lavt kalium og magnesium kan øge følsomheden for digoxin'],
        ['exclusion', 'Lavt kalium udelukker digoxinforgiftning'],
        ['always', 'Digoxinforgiftning giver altid hypokaliæmi'],
      ],
      'sensitivity',
      'Casen beskriver overeksponering hos en allerede behandlet patient med diuretika, opkast og lave elektrolytter. Akut svær forgiftning kan i stedet give hyperkaliæmi.',
    ),
    question(
      'warnings',
      'Kliniske advarselstegn',
      'Vælg de oplysninger, der tilsammen krævede akut klinisk revurdering.',
      15,
      [
        ['circulation', 'Puls 39/min og BT 88/54 mmHg med symptomer'],
        ['symptoms', 'Kvalme, opkast og synsændringer hos patient på digoxin'],
        ['renal', 'Stigende kreatinin og lave elektrolytter'],
        ['photo', 'Et familiefoto på natbordet'],
      ],
      ['circulation', 'symptoms', 'renal'],
      'Kredsløbspåvirkning og mulig forgiftning kræver hurtig lægekontakt, monitorering, revurdering af medicin og håndtering af væske-/elektrolytforstyrrelser. Man må ikke afvente en koncentration ved livstruende påvirkning.',
      { type: 'multi' },
    ),
    question(
      'prevention',
      'Forebyggelse',
      'Sæt barriererne i en meningsfuld rækkefølge i medicinprocessen.',
      15,
      [
        ['follow', 'Følg klinisk effekt, bivirkninger og aftalte prøvesvar'],
        ['give', 'Kontrollér patient, aktuel ordination og tidligere kvitteringer før indgift'],
        ['prepare', 'Kontrollér præparatstyrke og beregn mængden ved dispensering'],
        ['order', 'Afstem medicinen og revurdér ordination ved ændret tilstand'],
      ],
      ['order', 'prepare', 'give', 'follow'],
      'Sikre barrierer skal virke i hele processen. Uafhængig kontrol efter lokal instruks, tydelig overlevering og navngivet ansvar for prøvesvar supplerer kontrollen. Det er et systemansvar, ikke kun én medarbejders fejl.',
      { type: 'order' },
    ),
  ],
  reconstruction: [
    {
      time: 'Før indlæggelsen',
      type: 'Fysiologisk risiko',
      text: 'Erik har kronisk hjertesygdom og længerevarende diuretikabehandling. Digoxindosis er tidligere reduceret. Der er begrænset reserve ved ændret nyrefunktion.',
    },
    {
      time: '10.–11. marts',
      type: 'Primær medicineringsfejl',
      text: 'Ordinationen er 62,5 µg dagligt. Der dispenseres og gives 250 µg dagligt fra en anden styrke. Lagerplacering og manglende kontrol af mikrogramdosis lader fejlen passere.',
    },
    {
      time: '10.–12. marts',
      type: 'Medvirkende faktorer',
      text: 'Diurese, begrænset indtag og opkast ledsages af vægttab og stigende kreatinin. Nedsat renal elimination øger risiko for akkumulering. Hypokaliæmi og hypomagnesiæmi øger følsomheden og arytmirisikoen.',
    },
    {
      time: '12. marts · 08.00 og 12.00',
      type: 'Dobbeltadministration',
      text: 'Der gives to doser à 250 µg: i alt 500 µg, 8 gange den ordinerede døgnmængde. Morgenkvitteringen ses ikke i det andet skærmbillede. Auditloggen bekræfter indgifterne.',
    },
    {
      time: '12. marts · 16.00–22.00',
      type: 'Kliniske advarselstegn',
      text: 'Kvalme, opkast, gulligt syn, svimmelhed og hjertebanken ledsages af faldende puls og blodtryk. Samlet revurdering, medicinkontrol og akut eskalation kunne have afbrudt forløbet.',
    },
    {
      time: '12. marts · 22.30 / 13. marts · 00.10',
      type: 'Svigtende opfølgning',
      text: 'Prøven tages 10½ time efter sidste indgift og viser P-digoxin 4,1 nmol/L. Ingen kvitterer for svaret. Navngivet ansvar og en klar tilbagemeldingsfrist mangler.',
    },
    {
      time: '13. marts · 06.54',
      type: 'Endelig dødsårsag i den fiktive sag',
      text: 'Efter langsom ventrikelfrekvens, ekstrasystoler og ventrikulær takykardi opstår ventrikelflimren. Den samlede fiktive årsagsrekonstruktion er digoxinforgiftning med fatal ventrikulær arytmi; ikke et generelt diagnostisk bevis ud fra et enkelt tal.',
    },
    {
      time: 'Muligheder for at afbryde forløbet',
      type: 'Schweizerostmodellen',
      text: 'Flere barrierer havde samtidige huller: medicinafstemning, styrkekontrol, sikker kvittering, monitorering, eskalation og opfølgning. Hver barriere kunne have standset forløbet. Læringen handler om sikre arbejdsgange og fælles ansvar. Ved alvorlig mistanke: akut lægelig vurdering, EKG/monitorering, medicinrevurdering, elektrolytkorrektion og specialistvurdering af digoxinspecifikke antistoffragmenter efter gældende instruks.',
    },
  ],
  reflection: [
    'Hvilken observation ændrede din hypotese mest?',
    'Hvordan ville du strukturere en akut overlevering med tydeligt ansvar?',
    'Hvilke barrierer kan din afdeling gøre mere robuste?',
  ],
  uthFields: [
    'Hændelsesbeskrivelse',
    'Hændelsestype',
    'Faktisk konsekvens for patienten',
    'Mulig konsekvens ved gentagelse',
    'Medvirkende faktorer',
    'Forslag til forebyggelse',
    'Forbedringer af sikkerhedsbarrierer',
  ],
  sources: [
    {
      id: 'risk',
      title: 'Styrelsen for Patientsikkerhed · De syv risikosituationslægemidler',
      url: 'https://stps.dk/sundhedsfaglig/ansvar-og-retningslinjer/sundhedsfaglig-vejledning/risikoomraader/risikosituationslaegemidler',
    },
    {
      id: 'digoxin',
      title: 'Medicin.dk · Digoxin DAK: styrker, dosering og farmakologi',
      url: 'https://pro.medicin.dk/medicin/praeparater/223',
    },
    {
      id: 'toxicity',
      title: 'Lægehåndbogen · Digitalisforgiftning',
      url: 'https://www.sundhed.dk/sundhedsfaglig/laegehaandbogen/akut-og-foerstehjaelp/tilstande-og-sygdomme/forgiftninger/digitalisforgiftning/',
    },
    {
      id: 'sampling',
      title: 'Giftinformasjonen / Helsebiblioteket · Digoksin, vurdering og prøvetidspunkt',
      url: 'https://www.helsebiblioteket.no/forgiftninger/legemidler/digoksin-behandlingsanbefaling-ved-forgiftning',
    },
    {
      id: 'furosemid',
      title: 'Medicin.dk · Furix',
      url: 'https://pro.medicin.dk/medicin/praeparater/288',
    },
    {
      id: 'ramipril',
      title: 'Medicin.dk · Ramipril Krka',
      url: 'https://pro.medicin.dk/Medicin/Praeparater/6214',
    },
    {
      id: 'apixaban',
      title: 'EMA · Eliquis, dansk produktinformation',
      url: 'https://www.ema.europa.eu/da/documents/product-information/eliquis-epar-product-information_da.pdf',
    },
    {
      id: 'atorvastatin',
      title: 'Medicin.dk · Atorvastatin Oresund Pharma',
      url: 'https://pro.medicin.dk/Medicin/Praeparater/11152',
    },
    {
      id: 'metformin',
      title: 'DSAM · Farmakologisk behandling ved type 2-diabetes',
      url: 'https://www.dsam.dk/vejledninger/fb-type2/farmakologisk-behandling-af-hyperglykaemi',
    },
    {
      id: 'uth',
      title: 'Sundhedsvæsenets Kvalitetsinstitut · Rapportering af UTH',
      url: 'https://www.sundk.dk/uth/rapporter-en-utilsigtet-haendelse/',
    },
  ],
  history: [
    {
      version: 1,
      date: '2026-11-25',
      note: 'Første komplette undervisningscase. Alle patientoplysninger og hændelser er fiktive.',
    },
  ],
};
