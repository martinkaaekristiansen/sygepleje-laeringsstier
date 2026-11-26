import { writeFileSync, readFileSync } from 'node:fs';
const contexts = [
  [
    '01-sagsmapper',
    'Sagsmapper',
    'Primær start/genoptag; nulstilling ligger under Administrér sagen.',
  ],
  [
    '02-indledning',
    'Indledning',
    'Fire hovedfaner, kompakt foto og næste handling under læsningen.',
  ],
  ['03-interview', 'Interview', 'Uændret dialog og kilde; billedet kan forstørres uden beskæring.'],
  [
    '04-journal',
    'Journal',
    'Uændrede notater i læserækkefølge. Efter-billedet viser en kildevisning, som ikke flytter efterforskningen.',
  ],
  [
    '05-blodproever',
    'Blodprøver',
    'Samme værdier, enheder, tidspunkter og referenceintervaller. Tabellens egen vandrette rulning og enkeltprøve-gemning bevares.',
  ],
  [
    '06-administration',
    'Administration',
    'Samme administrationer og kildetekst; ingen automatisk udpegning af afgørende data.',
  ],
  [
    '07-naeste-handling',
    'Næste handling',
    'Knap til mulighederne er tilgængelig midt i dokumentet. Første fire valg følger den oprindelige rækkefølge; resten kan foldes ud.',
  ],
  [
    '08-notesbog',
    'Notesbog',
    'Læsbare kort først. Kommentar, kategori og redigering åbnes ved behov. Søgningen opdateres under indtastning.',
  ],
  [
    '09-sporetavle',
    'Sporetavle',
    'Eksisterende placeringer er bevaret. Vælg to spor og forbind dem; forklaringen er valgfri og kan redigeres bagefter. Liste og rul/zoom giver adgang på mobil.',
  ],
  [
    '10-sagsarkiv',
    'Sagsarkiv',
    'Generiske kildegrupper og søgning. Kun allerede undersøgte kilder; nye betingede oplysninger kræver et eksplicit genbesøg.',
  ],
  [
    '11-hypotese',
    'Hypotese',
    'Samme hypoteser, tidspunkter og historik. Sikkerhed og evidens er foldet sammen, indtil de ønskes.',
  ],
  [
    '12-hjaelp',
    'Hjælp',
    'Konteksten bevares i en dialog. Samme hints åbnes et niveau ad gangen efter eget valg.',
  ],
  [
    '13-afslutning',
    'Egen afslutning',
    'Tre fritekstspørgsmål ad gangen. Egen konklusion før strukturerede svar. Kladden kan genoptages.',
  ],
  [
    '14-rekonstruktion',
    'Rekonstruktion',
    'Samme rekonstruktion efter aflevering. Hændelser kan foldes ud; faglige svar, egne svar og patientsikkerhed er tilgængelige i den afsluttende gennemgang.',
  ],
  [
    '15-uth',
    'Simuleret UTH',
    'Samme rapportfelter og valgfri opfølgning; intet sendes til et virkeligt system.',
  ],
];
const gallery = `<!doctype html><html lang="da"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dødelig dosis – UX før og efter</title><style>body{font:16px/1.6 system-ui;background:#0b1822;color:#e7edf1;margin:0 auto;padding:24px;max-width:1500px}a{color:#bfe1d5}nav{position:sticky;top:0;background:#142632;padding:12px;z-index:1}button{font:inherit;min-height:44px;padding:8px 16px;margin-right:8px;background:#bfe1d5;color:#10232b;border:0;border-radius:6px}section{margin:40px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0;min-width:0}img{display:block;width:100%;height:auto;border:1px solid #577082}figcaption{padding:8px}h1,h2{line-height:1.2} @media(max-width:700px){.pair{grid-template-columns:1fr}body{padding:14px}}</style><h1>Dødelig dosis – UX før og efter</h1><p>15 sammenlignelige tilstande på desktop (1280 × 800) og mobil (390 × 844), i alt 60 billeder. Samme gemte casegrundlag. Dette galleri indeholder caseoplysninger og udgives ikke som en del af spillet.</p><p>Læs <a href="rapport.md">rapporten</a> og <a href="opgavemaalinger.md">de 18 opgavemålinger</a>. Fotos og caseindhold er uændrede. Billederne er fulde sideoptagelser; fast navigation vises ved optagelsens viewport.</p><nav aria-label="Billedstørrelse"><button data-width="1280" aria-pressed="true">Desktop</button><button data-width="390" aria-pressed="false">Mobil</button></nav>${contexts
  .map(
    ([id, title, caption]) =>
      `<section id="${id}"><h2>${title}</h2><p>${caption}</p><div class="pair">${[
        ['before', 'Før'],
        ['after', 'Efter'],
      ]
        .map(
          ([dir, label]) =>
            `<figure><figcaption>${label}</figcaption><a data-dir="${dir}" data-id="${id}" href="${dir}/${id}-1280.png"><img loading="lazy" data-dir="${dir}" data-id="${id}" src="${dir}/${id}-1280.png" alt="${title} – ${label.toLowerCase()}"></a></figure>`,
        )
        .join('')}</div></section>`,
  )
  .join(
    '',
  )}<script>for(const button of document.querySelectorAll('[data-width]'))button.addEventListener('click',()=>{for(const b of document.querySelectorAll('[data-width]'))b.setAttribute('aria-pressed',String(b===button));for(const el of document.querySelectorAll('[data-dir]'))el[el.tagName==='IMG'?'src':'href']=el.dataset.dir+'/'+el.dataset.id+'-'+button.dataset.width+'.png';});</script></html>`;
writeFileSync(new URL('./galleri.html', import.meta.url), gallery);
const metrics = JSON.parse(readFileSync(new URL('./task-metrics.json', import.meta.url)));
let md =
  '# Opgavemålinger før og efter\n\n18 automatiserede opgaver ved to skærmstørrelser (72 registreringer). **Dette er en reproducerbar UI-måling, ikke en undersøgelse med studerende.** Maskinens køretid er ikke brugerens løsningstid. Klik tæller DOM-click; indtastning og valg i native select tæller ikke som pointerklik. Rulning inkluderer browserens automatiske rulning.\n\n';
for (const width of [1280, 390]) {
  md +=
    '## ' +
    width +
    ' pixels\n\n| Opgave | Klik før → efter | Rulning før → efter (px) | Synlige felter før → efter |\n|---|---:|---:|---:|\n';
  for (const before of metrics.results.filter((r) => r.mode === 'before' && r.width === width)) {
    const after = metrics.results.find(
      (r) => r.mode === 'after' && r.width === width && r.id === before.id,
    );
    md += `| ${before.id}. ${before.name} | ${before.clicks} → ${after.clicks} | ${before.scrollTravelPx} → ${after.scrollTravelPx} | ${before.visibleEditors} → ${after.visibleEditors} |\n`;
  }
  md += '\n';
}
md +=
  '## Fortolkning og afvejninger\n\n- Fire hovedfaner mod otte før. Hypotese, farmakologi og afslutning kræver nu ét ekstra menutryk.\n- Næste handling kræver ét tryk og ingen dokumentrulning; tidligere lå valgene nederst.\n- Kilder kan ses uden at ændre den aktive scene, og retur kræver ét tryk.\n- Notesøgning behøver ikke Anvend filter og bevarer tastaturfokus og markør.\n- Tavlens forklaring er valgfri. Den nye tretryksmetode giver et entydigt valg af to kort; alternativet med formular er bevaret.\n- Afslutningen bruger flere videre-tryk for at vise færre felter og adskille egen konklusion fra svarmuligheder. Alle spørgsmål og point er bevaret.\n- Ingen automatiske modalafbrydelser, automatiske hints eller tvungen tutorial. Dialoger åbnes kun efter brugerens handling.\n- Tab/fokus, søgning, kilde-retur og gemmehandlinger kontrolleres særskilt af browser-regressionen; målte tab af fokus og uventede rulninger dér: 0.\n\nDe fire komplette afleveringstests og den separate genoptagelsestest dokumenterer korrekt progression, herunder aflevering uden alle valgfrie spor. [Rådata](task-metrics.json), [kontrolmålinger](after-metrics.json), [browserresultater](ux-results.json).\n';
writeFileSync(new URL('./opgavemaalinger.md', import.meta.url), md);
console.log('Gallery: 15 paired contexts × desktop/mobile. Task report: 18 tasks × two viewports.');
