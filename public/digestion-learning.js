import { ROUTE, BOSSES } from './digestion-data.js';
export const STATION_POINTS = {
  mouth: 'Tænderne findeler føden, mens spyt blander og fugter den.',
  pharynx: 'Svælget fører fødebolus mod spiserøret under koordineret synkning.',
  epiglottis: 'Strubelåget beskytter luftvejen; føden passerer bag larynx mod spiserøret.',
  oesophagus: 'Peristaltiske sammentrækninger fører føden gennem spiserøret mod mavesækken.',
  stomach:
    'Mavesækken blander føden; saltsyre denaturerer proteiner og giver pepsin et surt arbejdsmiljø.',
  duodenum:
    'Bugspyt og galde tilføres duodenum; bikarbonat neutraliserer gradvist det sure maveindhold.',
  jejunum: 'Tarmvæggen optager færdigfordøjede næringsstoffer til blod eller lymfe.',
  ileum: 'Det absorberede næringsstof er inde i kroppen; du følger nu en ufordøjelig rest.',
  caecum:
    'Caecum er starten af tyktarmen; hovedruten fortsætter opad, mens appendix er en blind sidegren.',
  ascending:
    'Vand og elektrolytter absorberes, mens bakterier omsætter dele af det resterende indhold.',
  transverse: 'Tarmindholdet bliver fastere, efterhånden som vand og elektrolytter optages.',
  descending: 'Tarmindholdet føres ned gennem patientens venstre side af tyktarmen.',
  sigmoid: 'Det S-formede colon sigmoideum fører tarmindholdet videre mod rectum.',
  rectum: 'Rectum opbevarer fæces; udspiling kan udløse defækationstrang.',
  anus: 'Sfinkterne afslappes koordineret, så en ufordøjelig rest kan forlade kroppen.',
};
const points = {
  stanley: {
    mouth: [
      'Spytamylase starter nedbrydningen af stivelse.',
      'Spytkirtlerne udskiller spyt med spytamylase gennem udførselsgangene.',
      'Spytamylase spalter stivelsens bindinger og danner kortere kulhydratkæder.',
    ],
    duodenum: [
      'Bugspytamylase fortsætter nedbrydningen af stivelse.',
      'Bugspytkirtlen leverer amylase med bugspyttet til duodenum.',
      'Vi følger maltose; bugspytamylase danner også andre korte kulhydratprodukter.',
    ],
    jejunum: [
      'Maltase spalter maltose ved tarmcellernes børstesøm.',
      'Maltase sidder på tarmcellernes overflade og tilføres ikke med bugspyttet.',
      'Maltase spalter maltose til to glukosemolekyler, som kan optages.',
    ],
  },
  trine: {
    duodenum: [
      'Galde findeler fedtdråber; galde er ikke et enzym.',
      'Leveren danner galde; galdeblæren kan lagre den. Galdesalte emulgerer uden at klippe esterbindinger.',
      'Bugspytlipase spalter triglyceridets esterbindinger ved fedtdråbens overflade.',
      'Bugspytkirtlen udskiller lipase; colipase hjælper lipasen ved fedtdråbernes overflade.',
      'Lipase danner et 2-monoglycerid og to frie fedtsyrer fra triglyceridet.',
    ],
  },
  poul: {
    stomach: [
      'Pepsin starter den væsentlige enzymatiske proteinnedbrydning i mavesækken.',
      'Hovedceller udskiller pepsinogen; saltsyre fra parietalceller fremmer aktiveringen til pepsin.',
      'Pepsin spalter peptidbindinger i det denaturerede protein og danner kortere peptider.',
    ],
    duodenum: [
      'Trypsin fortsætter nedbrydningen af peptider i duodenum.',
      'Bugspytkirtlen udskiller trypsinogen; enteropeptidase i børstesømmen aktiverer det til trypsin.',
      'Trypsin spalter peptider til mindre peptider.',
    ],
    jejunum: [
      'Peptidaser færdiggør nedbrydningen af små peptider.',
      'Peptidaser findes ved børstesømmen og inde i tarmcellerne.',
      'Peptidaser danner aminosyrer, som kan optages gennem tarmvæggen.',
    ],
  },
};
export const CLINICAL_PERSPECTIVES = {
  stomach: {
    title: 'Syrehæmmende medicin',
    text: 'Protonpumpehæmmere reducerer saltsyresekretionen. Højere pH kan mindske pepsinaktivering og pepsinaktivitet. Proteinnedbrydning fortsætter også med enzymer i tyndtarmen.',
  },
  duodenum: {
    title: 'Bugspytkirtelinsufficiens',
    text: 'Mangel på bugspytlipase kan nedsætte fedtfordøjelsen og give fedtrig afføring. Galde kan emulgere fedt, men erstatter ikke lipasens hydrolyse.',
  },
  colon: {
    title: 'Diarré og dehydrering',
    text: 'Ved diarré kan hurtig passage og øget væskesekretion mindske nettooptagelsen af vand og elektrolytter. Store tab kan give dehydrering. Observer væskeindtag, diurese og almentilstand.',
  },
};
export function clinicalFor(stage) {
  return (
    CLINICAL_PERSPECTIVES[stage] ||
    (['caecum', 'ascending', 'transverse', 'descending', 'sigmoid'].includes(stage)
      ? CLINICAL_PERSPECTIVES.colon
      : null)
  );
}
export function learningPoint(character, stage, taskIndex) {
  const s = ROUTE.find((s) => s.id === stage);
  const task = Number.isInteger(taskIndex) ? BOSSES[character]?.[stage]?.[taskIndex] : null;
  return {
    key: character + ':' + stage + ':' + (taskIndex ?? 'station'),
    character,
    stage,
    short: task ? points[character][stage][taskIndex] : STATION_POINTS[stage],
    detail: task?.why || s?.text || '',
    title: s?.danish || stage,
  };
}
export function rememberLearning(data, point) {
  if (!point.short) return;
  data.learningCurrent = { ...point };
  data.learningLog ??= [];
  if (data.learningLog.at(-1)?.key !== point.key) data.learningLog.push({ ...point });
  data.learningLog = data.learningLog.slice(-200);
}
