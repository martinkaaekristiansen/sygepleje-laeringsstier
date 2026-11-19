import { BASIC_TEXT } from './digestion-uptake.js';
import { ROUTE, BOSSES } from './digestion-data.js';
export const STATION_POINTS = {
  mouth: 'Tænderne findeler føden, mens spyt blander og fugter den.',
  pharynx: 'Svælget fører fødebolus mod spiserøret under koordineret synkning.',
  epiglottis: 'Epiglottis hjælper med at beskytte luftvejene, når føden synkes mod spiserøret.',
  oesophagus: 'Peristaltiske sammentrækninger fører føden gennem spiserøret mod mavesækken.',
  stomach:
    'Mavesækken blander føden; saltsyre denaturerer proteiner og giver pepsin et surt arbejdsmiljø.',
  duodenum:
    'Bugspyt og galde tilføres duodenum; bikarbonat neutraliserer gradvist det sure maveindhold.',
  jejunum: 'Tarmvæggen optager færdigfordøjede næringsstoffer til blod eller lymfe.',
  ileum: 'Det absorberede næringsstof er inde i kroppen; du følger nu en ufordøjelig rest.',
  caecum: 'Caecum er tyktarmens første afsnit. Appendix er et smalt, blindt endende vedhæng.',
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
      BASIC_TEXT.bile,
      'Leveren danner galde; galdeblæren kan lagre den. Galdesalte emulgerer uden at klippe esterbindinger.',
      BASIC_TEXT.lipase,
      'Bugspytkirtlen udskiller lipase; colipase hjælper lipasen ved fedtdråbernes overflade.',
      BASIC_TEXT.lipase,
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
      'Peptidaser virker blandt andet ved tarmcellernes børstesøm.',
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
const nutrientPoints = {
  stanley: {
    stomach:
      'Mavesyren hæmmer spytamylase. Stivelsesnedbrydningen fortsætter med bugspytamylase i duodenum.',
    duodenum:
      'Bikarbonat neutraliserer syren, og bugspytamylase fortsætter nedbrydningen af stivelse.',
    jejunum:
      'Maltase danner glukose, som optages gennem tarmepitelet og transporteres videre til blodet.',
  },
  trine: {
    stomach:
      'Mavesækken blander fedtet med resten af føden og doserer indholdet videre til duodenum.',
    duodenum:
      'Galde emulgerer fedt; bugspytlipase spalter triglycerider til 2-monoglycerid og frie fedtsyrer.',
    jejunum: BASIC_TEXT.trine,
  },
  poul: {
    jejunum:
      'Peptidaser danner aminosyrer, som optages gennem tarmepitelet og transporteres videre til blodet.',
  },
};
export function learningPoint(character, stage, taskIndex) {
  const s = ROUTE.find((s) => s.id === stage);
  const task = Number.isInteger(taskIndex) ? BOSSES[character]?.[stage]?.[taskIndex] : null;
  return {
    key: character + ':' + stage + ':' + (taskIndex ?? 'station'),
    character,
    stage,
    short: task
      ? points[character][stage][taskIndex]
      : nutrientPoints[character]?.[stage] || STATION_POINTS[stage],
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
