const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
const base = process.env.APP_URL || 'http://127.0.0.1:3030/';
const output =
  process.env.CONTINUOUS_OUTPUT || path.resolve('docs/codex-fordoejelse/sammenhaengende-verden');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }),
    errors = [],
    captures = [];
  page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(base);
  const moduleURL = await page.locator('script[type=module]').evaluate((e) => e.src);
  await page.route('**/?world-inspection', (r) =>
    r.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html lang="da"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;overflow:hidden}canvas{display:block;width:100vw;height:100vh}</style><canvas></canvas></html>',
    }),
  );
  await page.goto(base + '?world-inspection');
  await page.evaluate(async (moduleURL) => {
    const { createDigestionWorld } = await import(new URL('digestion-world.js', moduleURL));
    const { buildDigestiveTract } = await import(new URL('digestion-tract.js', moduleURL));
    const { ROUTE } = await import(new URL('digestion-data.js', moduleURL));
    window.tract = buildDigestiveTract();
    window.ROUTE = ROUTE;
    window.world = createDigestionWorld(document.querySelector('canvas'));
    window.world.settings({ motion: true });
  }, moduleURL);
  async function capture(
    name,
    caption,
    {
      id = 'jejunum',
      distance,
      yaw = 0,
      pitch = 0,
      mode = 'journey',
      age = 2,
      character = 'stanley',
      worldTime = 5,
    } = {},
  ) {
    await page.evaluate(
      ({ id, distance, yaw, pitch, mode, age, character, worldTime }) => {
        const stage = window.ROUTE.find((s) => s.id === id) || window.ROUTE.at(-1);
        const stop = distance ?? window.tract.stations[id].distance;
        window.world.setScene(
          stage,
          character,
          mode,
          id === 'anus' || window.ROUTE.findIndex((s) => s.id === id) > 6,
          character === 'trine'
            ? ['bile', 'reaction'].includes(mode)
              ? 'triglyceride'
              : 'lipid-products'
            : 'glucose',
          {
            age,
            physicalRouteVersion: 1,
            cameraDistance: stop,
            fromDistance: stop,
            targetDistance: stop,
            travelDuration: 0,
            worldTime,
            yaw,
            pitch,
          },
        );
        window.world.learningState({
          completed: ['reaction', 'micelle', 'absorb'].includes(mode)
            ? ['mouth', 'stomach', 'duodenum', 'jejunum']
            : [],
          task: ['reaction', 'micelle', 'absorb'].includes(mode) ? 5 : 0,
        });
        window.world.pause(true);
      },
      { id, distance, yaw, pitch, mode, age, character, worldTime },
    );
    await page.waitForFunction(
      ({ id, mode, age }) => {
        const c = document.querySelector('canvas');
        return (
          c.dataset.digestStage === id &&
          c.dataset.digestMode === mode &&
          Math.abs(Number(c.dataset.sceneAge) - age) < 0.05
        );
      },
      { id, mode, age },
    );
    await page.screenshot({ path: path.join(output, name) });
    const state = await page.locator('canvas').evaluate((c) => ({
      camera: JSON.parse(c.dataset.camera),
      route: JSON.parse(c.dataset.routeCamera),
      visibleCells: JSON.parse(c.dataset.visibleCells),
      triangles: Number(c.dataset.triangles),
      drawCalls: Number(c.dataset.drawCalls),
      epithelium: JSON.parse(c.dataset.epithelialState || '{}'),
      villi: Number(c.dataset.villusCount),
      uptakeTargets: JSON.parse(c.dataset.uptakeTargets || '[]'),
      swallow: JSON.parse(c.dataset.swallowPose || '{}'),
    }));
    captures.push({ name, caption, viewport: page.viewportSize(), ...state });
    console.log('CAPTURE', name, state.triangles, state.drawCalls);
    return state;
  }
  const joins = await page.evaluate(() =>
    window.tract.connections.map((c) => ({
      id: c.id,
      from: c.from,
      to: c.to,
      distance: window.tract.parts.find((p) => p.id === c.id).start + c.path.getLength() * 0.5,
    })),
  );
  for (let i = 0; i < joins.length; i++) {
    const c = joins[i],
      id = c.from === 'anal' ? 'anus' : c.from,
      prefix = String(i + 1).padStart(2, '0');
    for (const back of [false, true]) {
      const state = await capture(
        `${prefix}-${c.id}-${back ? 'tilbage' : 'frem'}.png`,
        `${c.from} → ${c.to}: ${back ? 'tilbageblik' : 'fremadblik'} fra samme punkt midt i den faktiske samling. En bøjning kan naturligt skjule den fjernere struktur.`,
        { id, distance: c.distance, yaw: back ? Math.PI : 0 },
      );
      assert(state.visibleCells.includes(c.id));
    }
  }
  for (const id of [
    'oesophagus',
    'stomach',
    'duodenum',
    'jejunum',
    'ileum',
    'caecum',
    'rectum',
    'anus',
  ])
    for (const back of [false, true])
      await capture(
        `station-${id}-${back ? 'tilbage' : 'frem'}.png`,
        `${id}, ${back ? 'tilbage' : 'frem'} fra samme station; væggene skjuler anatomien, hvor sigtelinjen brydes.`,
        { id, yaw: back ? Math.PI : 0 },
      );
  for (const which of ['inlet', 'outlet']) {
    const angles = await page.evaluate(
      async ({ which, moduleURL }) => {
        const T = await import(new URL('three.module.min.js', moduleURL)),
          { createRouteCamera } = await import(new URL('digestion-route-camera.js', moduleURL));
        const rig = createRouteCamera(window.tract);
        rig.begin('stomach', 'travel');
        const pose = rig.pose('stomach'),
          base = new T.PerspectiveCamera(74, 1, 0.03, 180);
        base.position.copy(pose.position);
        base.up.copy(pose.up);
        base.lookAt(pose.look);
        const target = base.clone();
        target.lookAt(window.tract.byId.stomach[which].center);
        const e = new T.Euler().setFromQuaternion(
          base.quaternion.clone().invert().multiply(target.quaternion),
          'YXZ',
        );
        return { yaw: e.y, pitch: T.MathUtils.clamp(e.x, -1.25, 1.25) };
      },
      { which, moduleURL },
    );
    await capture(
      `ventrikel-${which === 'inlet' ? 'cardia' : 'pylorus'}.png`,
      `${which === 'inlet' ? 'Cardia og indgangen fra oesophagus' : 'Pylorus og fortsættelsen mod duodenum'}. Samme kamerasted i mavesækken; kun blikket drejes. Væggen er solid.`,
      { id: 'stomach', ...angles },
    );
  }
  await capture(
    'synkning-hvile.png',
    'Førsteperson fra bolus: epiglottis ved siden af den genkendelige larynxindgang.',
    { id: 'epiglottis' },
  );
  for (const age of [0.5, 1.2, 2.2]) {
    const distances = await page.evaluate((age) => {
      const start = window.tract.stations.epiglottis.distance,
        end = window.tract.stations.oesophagus.distance,
        u = age / 3;
      return start + (end - start) * u * u * (3 - 2 * u);
    }, age);
    const state = await capture(
      `synkning-${age}.png`,
      'Indvendig synkning: larynxløft, epiglottis og stemmelæber koordineres, mens kameraet føres bag luftvejen.',
      { id: 'epiglottis', distance: distances, mode: 'swallow', age },
    );
    if (age === 1.2) assert(state.swallow.closure > 0.8);
  }
  for (const [mode, ages] of [
    ['bile', [0, 3.6]],
    ['reaction', [2.5, 5.5]],
    ['micelle', [0, 5]],
  ])
    for (const age of ages)
      await capture(
        `fedt-${mode}-${age}.png`,
        mode === 'bile'
          ? 'Emulgering: én stor dråbe bliver til mange mindre. Triglyceridernes bindinger bevares.'
          : mode === 'reaction'
            ? 'Lipase møder fedt-vand-grænsefladen og spalter triglyceridet til to frie fedtsyrer og et monoglycerid.'
            : 'Galdesalte samles omkring fedtsyrer og monoglycerider. Der er ingen intakte triglycerider i micellen.',
        { id: 'duodenum', mode, age, character: 'trine' },
      );
  for (const character of ['stanley', 'poul', 'trine'])
    for (const age of [1.5, 4.5, 8.8]) {
      const state = await capture(
        `optagelse-${character}-${age}.png`,
        `${character}: optagelse ved den faktiske, solide tarmvæg. ${character === 'trine' ? 'Galdesaltene bliver på lumensiden, mens fedtsyrer og monoglycerider optages.' : 'Produkterne bevæger sig til væggen og forsvinder, når de er optaget.'}`,
        { id: 'jejunum', mode: 'absorb', age, character },
      );
      assert.equal(state.epithelium.wallOpaque, true);
      assert.equal(state.epithelium.bloodOrLymphScene, false);
      assert(state.uptakeTargets.filter((p) => p.visible).length >= 3);
    }
  await page.setViewportSize({ width: 390, height: 844 });
  await capture('mobil-synkning-hvile.png', 'Samme indvendige synkeoplevelse på emuleret mobil.', {
    id: 'epiglottis',
  });
  const mobileUptake = await capture(
    'mobil-micelle-ved-vaeg.png',
    'Miceller afleverer deres indhold ved den solide tarmvæg på mobil.',
    { id: 'jejunum', mode: 'absorb', age: 4.5, character: 'trine' },
  );
  assert(mobileUptake.uptakeTargets.filter((p) => p.visible).length >= 3);
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    path.join(output, 'captures.json'),
    JSON.stringify({ renderer: 'Chromium / SwiftShader (software)', captures, errors }, null, 2),
  );
  const html = `<!doctype html><html lang="da"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sammenhængende fordøjelsesverden – gennemgang</title><style>body{font:16px/1.5 system-ui;background:#19131c;color:#f8e7d4;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:24px}figure{margin:0}img{width:100%;height:auto}figcaption{padding:8px 0}a{color:#ffd68f}</style><h1>Sammenhængende fordøjelsesverden</h1><p>Lokale optagelser fra arbejdsbranchen. SwiftShader-software-rendering. Intet er udgivet.</p><main>${captures.map((c) => `<figure><a href="${c.name}"><img loading="lazy" src="${c.name}" alt="${c.caption}"></a><figcaption><strong>${c.name}</strong><br>${c.caption}</figcaption></figure>`).join('')}</main></html>`;
  fs.writeFileSync(path.join(output, 'galleri.html'), html);
  console.log(
    'PASS',
    captures.length,
    'captures, all joins both directions; first-person swallow and actual wall uptake without page/shader errors',
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
