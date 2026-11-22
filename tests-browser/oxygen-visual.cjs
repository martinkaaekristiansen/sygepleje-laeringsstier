const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'),
  fs = require('node:fs'),
  path = require('node:path'),
  { execFileSync } = require('node:child_process');
const { launch, seed, chooseCorrect, state, base } = require('./oxygen-fixtures.cjs');
const output = process.env.OXYGEN_OUTPUT || path.resolve('docs/codex-iltens-rejse/visuelt');
const cases = [
  {
    id: '01-ansigt-naese',
    stage: 'outside',
    seconds: 8,
    choice: true,
    caption:
      'O₂ starter uden for det genbrugte ansigt. Begge indgange er korrekte; her vælges næsen med septum og conchae.',
  },
  {
    id: '02-larynx',
    stage: 'pharynx',
    seconds: 7,
    choice: true,
    caption:
      'Epiglottis er et blad ved indgangen, og luften fortsætter rundt om det gennem den åbne glottis. Oesophagus vælges ikke.',
  },
  {
    id: '03-cilier-slim',
    stage: 'trachea',
    seconds: 6,
    caption:
      'Cilierne slår i bølger under et særskilt væske- og slimlag. Bruskringene er C-formede og åbne bagtil.',
  },
  {
    id: '04-bakterie-modsat',
    stage: 'trachea',
    seconds: 13,
    lookBack: true,
    caption:
      'Spilleren bevæger sig nedad, mens den markerede bakterie bliver i slimlaget og passerer op mod svælget. Kameraet drejes tilbage efter passagen.',
  },
  {
    id: '05-alveole',
    stage: 'alveolus',
    seconds: 5,
    caption:
      'Den tynde alveole vises som undervisningssnit med type I/II-celler, surfaktant, kapillærnet og erytrocytter. Ingen almindelige cilier.',
  },
  {
    id: '06-ilt-diffusion',
    stage: 'oxygen-diffusion',
    animation: true,
    seconds: 10,
    caption:
      'Det samme O₂ passerer alveoleepitel, basalregion, endotel, plasma og erytrocyt. Små CO₂-molekyler diffunderer modsat.',
  },
  {
    id: '07-haemoglobin',
    stage: 'hb-binding',
    animation: true,
    seconds: 8,
    caption:
      'Hæmoglobin har fire underenheder, fire hæmgrupper og fire Fe²⁺-centre. Det primære O₂ bevares som samme model og binder reversibelt.',
  },
  {
    id: '08-hjerte',
    stage: 'mitral',
    seconds: 8,
    choice: true,
    caption:
      'Genbrugte kamre, klapsejl, chordae og papillærmuskler. Passagen afventer en åben klap ved den fælles hjerterytme.',
  },
  {
    id: '09-vaev-ilt-atp',
    stage: 'tissue-oxygen',
    animation: true,
    age: 0,
    seconds: 20,
    caption:
      'O₂ frigives fra intakt hæmoglobin, forlader kapillæren og når vævets mitokondrie. Den genbrugte glukosemodel og ATP illustrerer energiomsætningen.',
  },
  {
    id: '10-nyt-co2',
    stage: 'perspective',
    seconds: 11,
    caption:
      'Et tydeligt perspektivskift til et NYT metabolisk CO₂. Carbon kommer fra næringsstoffer; O₂ omdannes ikke direkte til CO₂.',
  },
  {
    id: '11-co2-transport',
    stage: 'tissue-carbon',
    animation: true,
    age: 0,
    seconds: 20,
    caption:
      'CO₂ diffunderer til blodet og omdannes især i erytrocytten. Hovedparten følges som HCO₃⁻ i plasma; mindre mængder vises opløst eller bundet til globin, aldrig hæmjern.',
  },
  {
    id: '12-co2-alveole',
    stage: 'co2-diffusion',
    animation: true,
    seconds: 10,
    caption:
      'Samme metaboliske carbon er blevet CO₂ igen og passerer barrieren til alveolen. O₂ diffunderer samtidig mod blodet.',
  },
  {
    id: '13-udaanding',
    stage: 'exterior',
    seconds: 5,
    caption:
      'CO₂ forlader kroppen. Thorax og lunger bliver mindre, og diaphragma går op. De samme luftveje er fulgt tilbage.',
  },
  {
    id: '14-slim-udaanding',
    stage: 'out_trachea',
    seconds: 7,
    caption:
      'Under udånding følger CO₂ luftvejen opad; ciliernes transport er stadig rettet mod svælget.',
  },
];
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch(launch),
    results = [],
    errors = [];
  try {
    const selected = process.env.OXYGEN_CASE?.split(',');
    for (const c of cases.filter((c) => !selected || selected.includes(c.id))) {
      const raw = '/tmp/oxygen-videos-' + c.id,
        context = await browser.newContext({
          viewport: { width: 1280, height: 800 },
          recordVideo: { dir: raw, size: { width: 1280, height: 800 } },
        }),
        p = await context.newPage();
      p.setDefaultTimeout(120000);
      p.on('pageerror', (e) => errors.push(e.message));
      await seed(p, {
        stage: c.stage,
        animation: !!c.animation,
        age: c.age || 0,
        side: 'left',
        entry: 'nose',
      });
      if (c.stage === 'outside')
        await p.screenshot({ path: path.join(output, '01-ansigt-udenfor.png') });
      if (c.choice) await chooseCorrect(p, { outside: 'nose' });
      const start = Date.now();
      await p.waitForTimeout(Math.min(2000, c.seconds * 500));
      await p.screenshot({ path: path.join(output, c.id + '.png') });
      if (c.lookBack) {
        await p.waitForTimeout(5000);
        const box = await p.locator('canvas').boundingBox();
        await p.mouse.move(box.width * 0.85, box.height * 0.56);
        await p.mouse.down();
        await p.mouse.move(box.width * 0.85 - 525, box.height * 0.56, { steps: 1 });
        await p.mouse.up();
        await p.screenshot({ path: path.join(output, c.id + '-tilbageblik.png') });
      }
      const rest = c.seconds * 1000 - (Date.now() - start);
      if (rest > 0) await p.waitForTimeout(rest);
      const end = await state(p),
        video = p.video();
      await p.close();
      const webm = await video.path();
      await context.close();
      execFileSync('ffmpeg', [
        '-y',
        '-loglevel',
        'error',
        '-sseof',
        '-' + c.seconds,
        '-i',
        webm,
        '-an',
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-crf',
        '21',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        path.join(output, c.id + '.mp4'),
      ]);
      // The managed Chromium build lacks H.264. Retain MP4 for Safari and
      // provide the identical trimmed clip as VP8 for portable local review.
      execFileSync('ffmpeg', [
        '-y',
        '-loglevel',
        'error',
        '-i',
        path.join(output, c.id + '.mp4'),
        '-an',
        '-c:v',
        'libvpx',
        '-deadline',
        'realtime',
        '-cpu-used',
        '8',
        '-b:v',
        '1200k',
        '-crf',
        '12',
        '-threads',
        '2',
        path.join(output, c.id + '.webm'),
      ]);
      results.push({ ...c, endStage: end.stage, video: c.id + '.mp4', image: c.id + '.png' });
      console.log('PASS visual', c.id);
    }
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      }),
      p = await context.newPage();
    p.setDefaultTimeout(120000);
    for (const stage of [
      'outside',
      'trachea',
      'hb-binding',
      'tissue-oxygen',
      'bicarbonate',
      'exterior',
    ]) {
      if (
        selected &&
        !selected.includes(
          {
            outside: '01-ansigt-naese',
            trachea: '03-cilier-slim',
            'hb-binding': '07-haemoglobin',
            'tissue-oxygen': '09-vaev-ilt-atp',
            bicarbonate: '11-co2-transport',
            exterior: '13-udaanding',
          }[stage],
        )
      )
        continue;
      await seed(p, {
        stage,
        animation: ['hb-binding', 'tissue-oxygen'].includes(stage),
        age: stage === 'hb-binding' ? 5 : stage === 'tissue-oxygen' ? 7 : 0,
      });
      await p.screenshot({ path: path.join(output, 'mobil-' + stage + '.png') });
    }
    if (!selected || selected.includes('07-haemoglobin')) {
      for (const [width, height] of [
        [844, 390],
        [568, 320],
      ]) {
        await p.setViewportSize({ width, height });
        await seed(p, { stage: 'hb-binding' });
        await p.waitForTimeout(1500);
        await p.screenshot({ path: path.join(output, `landskab-${width}-${height}.png`) });
      }
    }
    await context.close();
    let allResults = results;
    if (selected) {
      const old = JSON.parse(fs.readFileSync(path.join(output, 'billedforklaringer.json'), 'utf8'));
      allResults = [...old.results.filter((r) => !selected.includes(r.id)), ...results].sort(
        (a, b) => a.id.localeCompare(b.id),
      );
    }
    fs.writeFileSync(
      path.join(output, 'billedforklaringer.json'),
      JSON.stringify(
        {
          conditions:
            'Faktiske skærmoptagelser i Chromium/SwiftShader, 1280×800. Ingen ændring af simulationshastighed. Mobil emuleret 390×844.',
          results: allResults,
          errors,
        },
        null,
        2,
      ),
    );
    if (errors.length) throw Error(errors.join('\n'));
    console.log('PASS requested visual captures; full collection: 14 clips, 24 screenshots');
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
