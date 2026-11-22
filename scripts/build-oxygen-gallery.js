import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(process.argv[2] || 'docs/codex-iltens-rejse'),
  metadata = JSON.parse(await readFile(path.join(root, 'visuelt/billedforklaringer.json'), 'utf8'));
const esc = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
let measurements = null;
try {
  measurements = JSON.parse(await readFile(path.join(root, 'performance/maalinger.json'), 'utf8'));
} catch {}
const groups = [
  ['Luftvejene og mucociliær transport', 0, 4],
  ['Alveole, diffusion og hæmoglobin', 4, 7],
  ['Kredsløb, væv og nyt CO₂', 7, 11],
  ['Tilbage til lungerne og udånding', 11, 14],
];
const cards = (items) =>
  items
    .map(
      (c) =>
        `<figure><a href="visuelt/${esc(c.image)}"><img loading="lazy" src="visuelt/${esc(c.image)}" alt="${esc(c.caption)}"></a><figcaption><h3>${esc(c.id.slice(3).replaceAll('-', ' '))}</h3><p>${esc(c.caption)}</p></figcaption><video controls playsinline preload="none" poster="visuelt/${esc(c.image)}"><source src="visuelt/${esc(c.video)}" type="video/mp4"><source src="visuelt/${esc(c.video.replace(/\.mp4$/, '.webm'))}" type="video/webm"></video><p class="links"><a href="visuelt/${esc(c.image)}">Åbn billedet</a> · <a href="visuelt/${esc(c.video)}">MP4</a> · <a href="visuelt/${esc(c.video.replace(/\.mp4$/, '.webm'))}">WebM</a></p></figure>`,
    )
    .join('');
const mobile = ['outside', 'trachea', 'hb-binding', 'tissue-oxygen', 'bicarbonate', 'exterior']
  .map(
    (s) =>
      `<figure class="mobile"><a href="visuelt/mobil-${s}.png"><img loading="lazy" src="visuelt/mobil-${s}.png" alt="Mobilvisning: ${s}"></a><figcaption>${esc(s)} · 390 × 844</figcaption></figure>`,
  )
  .join('');
const landscape = [
  [844, 390],
  [568, 320],
]
  .map(
    ([w, h]) =>
      `<figure><a href="visuelt/landskab-${w}-${h}.png"><img loading="lazy" src="visuelt/landskab-${w}-${h}.png" alt="Hæmoglobin og spørgsmål i landskab ${w} × ${h}"></a><figcaption>${w} × ${h}: infoboksen til venstre og 3D-fokus til højre. Anatomien er ikke flyttet.</figcaption></figure>`,
  )
  .join('');
const perf = ['trachea', 'hb-binding', 'lv', 'tissue-oxygen']
  .map((stage) => {
    const mean = (key, opt) => {
      const r = measurements?.results.filter((r) => r.stage === stage && r.optimized === opt);
      return r?.length
        ? (r.reduce((s, v) => s + v[key], 0) / r.length).toFixed(
            key === 'triangles' || key === 'drawCalls' ? 0 : 2,
          )
        : 'Afventer måling';
    };
    return `<article><h3>${stage}</h3><div class="grid"><figure><img loading="lazy" src="performance/${stage}-foer.png" alt="${stage}, LOD/culling fra"><figcaption>Før: alle forberedte afsnit og detaljer.</figcaption></figure><figure><img loading="lazy" src="performance/${stage}-efter.png" alt="${stage}, LOD/culling til"><figcaption>Efter: afsnitsculling og afstands-LOD.</figcaption></figure></div><table><tr><th></th><th>FPS</th><th>ms/billede</th><th>Trekanter</th><th>Tegnekald</th></tr>${[false, true].map((opt) => `<tr><th>${opt ? 'Efter' : 'Før'}</th>${['fps', 'frameMs', 'triangles', 'drawCalls'].map((k) => `<td>${mean(k, opt)}</td>`).join('')}</tr>`).join('')}</table></article>`;
  })
  .join('');
await writeFile(
  path.join(root, 'galleri.html'),
  `<!doctype html><html lang="da"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Iltens rejse · visuel gennemgang</title><style>*{box-sizing:border-box}body{margin:0;background:#21111b;color:#faeadb;font:16px/1.55 system-ui,sans-serif}main{max-width:1400px;margin:auto;padding:24px}h1{font:42px/1.15 Georgia,serif}h2{margin-top:48px}a{color:#f4d397}nav{display:flex;gap:16px;flex-wrap:wrap;padding:16px 0}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}figure{margin:0;background:#35202d;border:1px solid #70525f;border-radius:12px;overflow:hidden}img,video{display:block;width:100%;height:auto}figcaption,.links{padding:12px 16px}figcaption h3,figcaption p{margin:0 0 8px}video{background:#180e14}.mobile img{max-height:660px;object-fit:contain}article{margin-bottom:28px}table{border-collapse:collapse;width:100%;margin:12px 0}th,td{text-align:left;border-bottom:1px solid #70525f;padding:8px}.note{padding:16px;background:#35202d;border-left:4px solid #f4d397}.gallery-mobile{grid-template-columns:repeat(3,minmax(0,1fr))}@media(max-width:760px){main{padding:16px}h1{font-size:30px}.grid{grid-template-columns:1fr}.gallery-mobile{grid-template-columns:repeat(2,minmax(0,1fr))}table{font-size:12px}th,td{padding:5px}}</style><main><h1>Iltens rejse<br><small>Visuel gennemgang</small></h1><p class="note">Visuelt godkendt den 22. november 2026. Dokumentation fra <strong>iltens-rejse-3d</strong> til udgivelsen af Iltens rejse.</p><p>${esc(metadata.conditions)} Videoerne er faktiske skærmoptagelser og viser software-rendererens bevægelse. Klik på billederne for fuld størrelse; afspil videoen under hvert billede. Hvert klip findes som MP4 og WebM; browseren vælger et understøttet format.</p><nav>${groups.map((g, i) => `<a href="#del${i}">${esc(g[0])}</a>`).join('')}<a href="#mobil">Mobil</a><a href="#performance">Performance</a><a href="rapport.md">Rapport</a></nav><h2>Start uden for ansigtet</h2><figure><a href="visuelt/01-ansigt-udenfor.png"><img loading="lazy" src="visuelt/01-ansigt-udenfor.png" alt="Spillets start: O₂ uden for ansigtet"></a><figcaption>O₂ vises uden for det genbrugte ansigt. Næse og mund er begge rigtige indgange.</figcaption></figure>${groups.map((g, i) => `<section id="del${i}"><h2>${esc(g[0])}</h2><div class="grid">${cards(metadata.results.slice(g[1], g[2]))}</div></section>`).join('')}<h2>Tilbageblik på slimtransporten</h2><figure><a href="visuelt/04-bakterie-modsat-tilbageblik.png"><img loading="lazy" src="visuelt/04-bakterie-modsat-tilbageblik.png" alt="Tilbageblik mod larynx og svælget"></a><figcaption>Kameraet er drejet tilbage mod larynx. Samme slimtransport fortsætter proximalt. Selve passagen ses i klip 04.</figcaption></figure><section id="mobil"><h2>Mobil</h2><p>Emuleret mobil i Chromium. En fysisk iPhone/Safari er ikke testet i dette miljø.</p><div class="grid gallery-mobile">${mobile}</div><h3>Landskab</h3><div class="grid">${landscape}</div></section><section id="performance"><h2>Kontrolleret før/efter</h2><p>Samme komplette kode og verden, kamera, tid og opløsning. Før: LOD og afsnitsculling slået fra. Efter: slået til. Det er en kontrol af optimeringerne, ikke to historiske versioner. Målinger: ${esc(measurements?.environment.renderer || 'Afventer isoleret måling')}. Se <a href="performance/maalinger.json">rådata og betingelser</a>.</p>${perf}</section><p>Bevar denne HTML-fil sammen med mapperne <code>visuelt/</code> og <code>performance/</code>, når materialet flyttes.</p></main></html>`,
);
console.log('Oxygen gallery generated:', path.join(root, 'galleri.html'));
