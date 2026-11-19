// Regenerate after the browser capture, state and performance suites.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('docs/codex-fordoejelse/sammenhaengende-verden');
const escape = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const read = (name) =>
  fs.existsSync(path.join(root, name))
    ? JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'))
    : null;
const data = read('captures.json');
if (!data) throw Error('Run digestion-continuous.cjs first');
const sections = [
  ['Samlinger – samme position, frem og tilbage', (c) => /^\d\d-/.test(c.name)],
  ['Inde i organerne – samme station, frem og tilbage', (c) => c.name.startsWith('station-')],
  ['Mavesæk: cardia og pylorus', (c) => c.name.startsWith('ventrikel-')],
  ['Synkning set indefra', (c) => c.name.startsWith('synkning-')],
  ['Fedt: galde, lipase og micelledannelse', (c) => c.name.startsWith('fedt-')],
  ['Automatisk optagelse ved den solide tarmvæg', (c) => c.name.startsWith('optagelse-')],
  ['Mobil: synkning og miceller', (c) => c.name.startsWith('mobil-')],
];
const latin = {
  mouth: 'mundhule',
  pharynx: 'pharynx',
  oesophagus: 'oesophagus',
  stomach: 'mavesæk',
  duodenum: 'duodenum',
  jejunum: 'jejunum',
  ileum: 'ileum',
  caecum: 'caecum',
  ascending: 'colon ascendens',
  transverse: 'colon transversum',
  descending: 'colon descendens',
  sigmoid: 'colon sigmoideum',
  rectum: 'rectum',
  anal: 'analkanal',
  anus: 'anus',
};
const figure = (name, caption, details = '') =>
  `<figure><a href="${escape(name)}" target="_blank"><img loading="lazy" src="${escape(name)}" alt="${escape(caption)}"></a><figcaption>${escape(caption)}${details ? `<small>${escape(details)}</small>` : ''}</figcaption></figure>`;
let body = '';
for (const [heading, filter] of sections) {
  body += `<section><h2>${heading}</h2><div class="grid">`;
  for (const c of data.captures.filter(filter)) {
    const caption = c.caption.replace(
      /\b(mouth|pharynx|oesophagus|stomach|duodenum|jejunum|ileum|caecum|ascending|transverse|descending|sigmoid|rectum|anal|anus)\b/g,
      (m) => latin[m],
    );
    body += figure(
      c.name,
      caption,
      `${c.viewport.width} × ${c.viewport.height} · ${c.triangles.toLocaleString('da-DK')} trekanter · ${c.drawCalls} tegnekald. Fastlåst tidspunkt til visuel inspektion.`,
    );
  }
  body += '</div></section>';
}
body +=
  '<section><h2>Det faktiske spil: infoboks og automatisk perspektivskift</h2><div class="grid">';
for (const [name, caption] of [
  [
    'regression-v2/mave-infoboks-mobil.png',
    'Infoboksen under mavesækkens kontinuerlige bevægelse på mobil.',
  ],
  [
    'galde-infoboks-mobil.png',
    'Galde er emulgering, ikke et enzym. Den korte forklaring står i infoboksen.',
  ],
  [
    'miceller-infoboks-mobil.png',
    'Miceller indeholder nedbrydningsprodukter. Spillet præciserer, at processerne overlapper i kroppen.',
  ],
  ...['1280x800', '390x844', '320x568', '844x390'].map((s) => [
    `perspektivskift-${s}.png`,
    `Efter automatisk optagelse: restens perspektiv forklares i infoboksen uden dialog eller Fortsæt-knap (${s}).`,
  ]),
])
  if (fs.existsSync(path.join(root, name))) body += figure(name, caption);
body += '</div></section>';
if (fs.existsSync(path.join(root, 'afslutning'))) {
  body += '<section><h2>Afslutning og mobil-layout</h2><div class="grid">';
  for (const name of fs
    .readdirSync(path.join(root, 'afslutning'))
    .filter((n) => n.endsWith('.png')))
    body += figure(
      'afslutning/' + name,
      'Resten fortsætter automatisk gennem den samme analkanal til afslutningen. Kameraet bliver over vandet.',
    );
  body += '</div></section>';
}
const pixelChecks = read('occlusion/pixel-checks.json');
if (pixelChecks) {
  body +=
    '<section><h2>Culling uden tab af synlig anatomi</h2><p>Alle sammenlignede par fra den samme nye verden er byte-identiske PNG-billeder: samme modeller, klokkeslæt, kamera og renderfaktor. Kun skjulte villi udelades fra tegningen. Her ses et repræsentativt par midt i jejunum; 246.012 mod 209.052 tegnede trekanter.</p><div class="grid">';
  body += figure(
    'occlusion/coarse-desktop-jejunum-forward.png',
    'Grov afskærmning pr. organ: 246.012 trekanter.',
  );
  body += figure(
    'occlusion/fine-desktop-jejunum-forward.png',
    'Otte slimhindesektioner: 209.052 trekanter; præcis samme synlige billede.',
  );
  body +=
    '</div><p><a href="occlusion/pixel-checks.json">Alle pixelkontroller og geometrimålinger</a>. Den konservative margin kan også øge tegnemængden i enkelte vinkler.</p>';
  const timings = read('performance/occlusion/results.json');
  if (timings) {
    body +=
      '<table><thead><tr><th>Sted / viewport</th><th>Culling</th><th>FPS</th><th>Median ms</th><th>Trekanter</th><th>Tegnekald</th></tr></thead><tbody>';
    for (const r of timings.results)
      body += `<tr><td>${r.id} / ${r.size}</td><td>${r.variant === 'before' ? 'Pr. organ' : 'Sektioner'}</td><td>${r.medianFps.toFixed(2)}</td><td>${r.medianFrameMs.toFixed(1)}</td><td>${r.triangles.toLocaleString('da-DK')}</td><td>${r.drawCalls}</td></tr>`;
    body +=
      '</tbody></table><p>Disse målinger isolerer culling i den samme nye anatomi. Små tidsforskelle er usikre i software-rendering; mobilvinklen viste ingen hastighedsgevinst. <a href="performance/occlusion/results.json">Betingelser og alle tal</a>.</p>';
  }
  body += '</section>';
}
const perf = read('performance/results.json');
if (perf) {
  body +=
    '<section><h2>Før og efter – samme lokale kameravinkel og renderopløsning</h2><p>Før: main ved d7130f8. Efter: den godkendte sammenhængende verden. Chromium / SwiftShader, DPR 1, renderfaktor 0,8. Billedernes anatomi er ændret med vilje; kameraets lokale position og retning er ens. Tallene er softwaremålinger og forudsiger ikke iPhone-hastighed.</p><table><thead><tr><th>Viewport / sted</th><th>Version</th><th>FPS</th><th>Median ms</th><th>Trekanter</th><th>Tegnekald</th></tr></thead><tbody>';
  for (const r of perf.results)
    body += `<tr><td>${r.viewport.width} × ${r.viewport.height} / ${r.id}</td><td>${r.variant === 'before' ? 'Før' : 'Efter'}</td><td>${r.medianFps.toFixed(2)}</td><td>${r.medianFrameMs.toFixed(1)}</td><td>${r.triangles.toLocaleString('da-DK')}</td><td>${r.drawCalls}</td></tr>`;
  body += '</tbody></table><div class="grid">';
  for (const r of perf.results)
    body += figure(
      `performance/${r.variant}-${r.id}-${r.size}.png`,
      `${r.variant === 'before' ? 'Før' : 'Efter'}: ${r.id}, ${r.size}. ${r.medianFps.toFixed(2)} FPS / ${r.medianFrameMs.toFixed(1)} ms.`,
    );
  body +=
    '</div><p><a href="performance/results.json">Samtlige måleresultater og betingelser (JSON)</a></p></section>';
}
if (fs.existsSync(path.join(root, 'video'))) {
  body +=
    '<section><h2>Korte optagelser fra browseren</h2><p>Optaget i software-rendering med den ekstra belastning fra skærmoptagelse. Se billedsekvenserne ovenfor for synkning og fedtoptagelse; klippenes lave billedhastighed er ikke en benchmark.</p><div class="grid">';
  for (const name of fs.readdirSync(path.join(root, 'video')).filter((n) => n.endsWith('.mp4')))
    body += `<figure><video controls muted playsinline preload="metadata" src="video/${escape(name)}"></video><figcaption>${name.startsWith('peristaltik') ? 'Peristaltik i den sammenhængende oesophagus.' : 'Afslutning: resten passerer anus og falder mod toilettet.'}</figcaption></figure>`;
  body += '</div></section>';
}
fs.writeFileSync(
  path.join(root, 'galleri.html'),
  `<!doctype html><html lang="da"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sammenhængende fordøjelsesverden – visuel gennemgang</title><style>body{font:16px/1.5 system-ui,sans-serif;margin:0 auto;padding:24px;max-width:1500px;background:#101723;color:#eef2fa}a{color:#a8d6ff}h1,h2{line-height:1.2}section{margin:42px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,480px),1fr));gap:20px}figure{margin:0;padding:12px;background:#1e2a3b;border-radius:10px}img,video{width:100%;max-height:600px;object-fit:contain;background:#080c12}figcaption{padding-top:8px}small{display:block;color:#bac7da;margin-top:5px}table{border-collapse:collapse;font-size:14px;display:block;overflow:auto}td,th{padding:8px;text-align:left;border-bottom:1px solid #455269}</style><h1>Fordøjelsens vilde rejse – visuel gennemgang</h1><p>Godkendt version fra <code>fordoejelse-sammenhaengende-verden</code>. <a href="../sammenhaengende-verden-rapport.md">Læs rapporten</a>. Klik et billede for fuld størrelse. Geometrien er fælles og vedvarende; par viser samme kameraposition med modsat retning. Bøjninger kan naturligt afskærme næste organ.</p>${body}</html>`,
);
console.log(
  'Gallery rebuilt:',
  data.captures.length,
  'anatomy captures plus UI, performance and available video.',
);
