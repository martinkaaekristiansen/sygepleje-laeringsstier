const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
const { seed, saved } = require('./digestion-fixtures.cjs');
const base = process.env.APP_URL || 'http://127.0.0.1:3030/',
  output =
    process.env.CONTINUOUS_OUTPUT || path.resolve('docs/codex-fordoejelse/sammenhaengende-verden');
(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const errors = [],
    checks = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(r.status() + ': ' + r.url());
  });
  page.on('dialog', (d) => d.accept());
  const { buildDigestiveTract } = await import('../public/digestion-tract.js'),
    tract = buildDigestiveTract();
  const from = tract.stations.stomach.distance,
    target = tract.stations.duodenum.distance,
    duration = Math.max(1.2, Math.min(8, (target - from) / 6)),
    age = 0.6,
    u = age / duration;
  await seed(page, base, {
    index: 5,
    phase: 'arrival',
    extra: {
      animation: {
        stage: 'duodenum',
        mode: 'journey',
        age,
        physicalRouteVersion: 1,
        worldTime: 120,
        yaw: 0.8,
        pitch: 0.1,
        cameraDistance: from + (target - from) * u * u * (3 - 2 * u),
        fromDistance: from,
        targetDistance: target,
        travelDuration: duration,
      },
    },
  });
  await page.waitForFunction(
    () => document.querySelector('canvas').dataset.digestMode === 'journey',
  );
  await page.locator('[data-digest=settings]').click();
  await page.locator('[data-digest=pause]').click();
  await page.locator('[data-digest=settings-close]').click();
  await page.waitForFunction(() => document.querySelector('.digest-save').textContent === 'Gemt');
  const frozen = await page.locator('canvas').getAttribute('data-camera');
  await page.waitForTimeout(500);
  assert.equal(await page.locator('canvas').getAttribute('data-camera'), frozen);
  const before = (await saved(page)).digestion.active;
  assert.equal(before.animation.physicalRouteVersion, 1);
  assert.equal(before.animation.fromDistance, from);
  assert.equal(before.animation.targetDistance, target);
  await page.reload();
  await page.locator('[data-digest=resume]').click();
  await page.waitForFunction(
    () => document.querySelector('canvas').dataset.digestMode === 'journey',
  );
  const resumed = await page.locator('canvas').evaluate((c) => ({
    route: JSON.parse(c.dataset.routeCamera),
    camera: JSON.parse(c.dataset.camera),
    look: JSON.parse(c.dataset.look),
  }));
  assert(resumed.route.cameraDistance >= before.animation.cameraDistance);
  assert(
    resumed.route.cameraDistance - before.animation.cameraDistance < 4.5,
    'resume does not snap to the next organ',
  );
  assert.equal(resumed.look.yaw, 0.8);
  assert.equal(resumed.look.pitch, 0.1);
  const expected = tract.route.getPointAt(resumed.route.cameraDistance / tract.route.length);
  assert(
    expected.distanceTo({
      x: resumed.camera.position[0],
      y: resumed.camera.position[1],
      z: resumed.camera.position[2],
    }) < 1e-5,
  );
  await page.waitForFunction(() => document.querySelector('canvas').dataset.digestMode === 'boss');
  const after = (await saved(page)).digestion.active;
  assert.equal(after.enzyme, before.enzyme);
  assert.equal(after.anatomy, before.anatomy);
  checks.push(
    'real IndexedDB journey resume, camera distance/look, pause and no duplicated points',
  );
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await seed(page, base, {
      character: 'trine',
      index: 6,
      phase: 'absorption',
      mode: 'absorb',
      age: 8.8,
      motion: true,
    });
    await page.waitForFunction(
      () =>
        document.querySelector('canvas').dataset.digestMode === 'travel' &&
        document.querySelectorAll('[data-choice]').length === 2,
    );
    const text =
      'Næringsstoffet er nu optaget gennem tarmvæggen. Du følger i stedet en ufordøjelig rest videre gennem fordøjelseskanalen.';
    assert.equal(await page.locator('.digest-explanation').textContent(), text);
    assert.equal(
      await page.locator('[data-absorb],.digest-perspective-shift,.digest-compartments').count(),
      0,
    );
    const layout = await page.locator('.digest-learning').evaluate((info) => {
      const b = info.getBoundingClientRect(),
        p = document.querySelector('.digest-panel').getBoundingClientRect();
      return {
        separated: b.bottom <= p.top,
        readable: info.scrollHeight <= info.clientHeight,
        viewport: document.documentElement.scrollWidth <= innerWidth,
      };
    });
    assert(
      layout.separated && layout.readable && layout.viewport,
      JSON.stringify({ viewport, layout }),
    );
    const record = (await saved(page)).digestion.active;
    assert(record.absorbed);
    assert.equal(record.product, 'residue');
    await page.screenshot({
      path: path.join(output, `perspektivskift-${viewport.width}x${viewport.height}.png`),
    });
    checks.push(
      `automatic residue / exact persistent text / no overlap ${viewport.width}x${viewport.height}`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page, base, {
    character: 'trine',
    index: 5,
    phase: 'secretion',
    mode: 'bile',
    age: 2,
  });
  await page.locator('[data-digest=settings]').click();
  await page.locator('[data-digest=pause]').click();
  await page.locator('[data-digest=settings-close]').click();
  const bile =
    'Galde emulgerer fedtet, så store fedtdråber bliver til mindre dråber. Det giver lipase en større overflade at arbejde på.';
  assert.equal(await page.locator('.digest-explanation').textContent(), bile);
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
    { width: 568, height: 320 },
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(100);
    const readable = await page
      .locator('.digest-learning')
      .evaluate((e) => e.scrollHeight <= e.clientHeight && e.scrollWidth <= e.clientWidth);
    assert(readable, `entire bile explanation fits ${viewport.width}x${viewport.height}`);
  }
  await page.setViewportSize({ width: 320, height: 568 });
  await page.screenshot({ path: path.join(output, 'galde-infoboks-mobil.png') });
  checks.push('exact bile explanation / readable in five desktop/mobile/landscape viewports');
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page, base, {
    character: 'trine',
    index: 5,
    phase: 'micelle',
    mode: 'micelle',
    age: 3,
    extra: { product: 'lipid-products' },
  });
  assert.match(await page.locator('.digest-point-title').textContent(), /overlapper i kroppen/);
  await page.screenshot({ path: path.join(output, 'miceller-infoboks-mobil.png') });
  checks.push('visible explanation that real fat digestion processes overlap');
  // Old advanced results retain scores, while a new review uses basic content.
  await page.evaluate(async () => {
    const url = new URL(
      'digestion-assessment.js',
      document.querySelector('script[type=module]').src,
    );
    const { scoreAssessment } = await import(url);
    const db = await new Promise((r) => {
      const q = indexedDB.open('laeringsstier-v2');
      q.onsuccess = () => r(q.result);
    });
    await new Promise((r, j) => {
      const tx = db.transaction('records', 'readwrite'),
        s = tx.objectStore('records'),
        q = s.get('progress');
      q.onsuccess = () => {
        const all = q.result,
          d = all['fordoejelsens-vilde-rejse'].digestion;
        d.assessments = { trine: [scoreAssessment('trine', [1, 0, 0, 0, 1])] };
        delete d.reviewDraft;
        s.put(all, 'progress');
      };
      tx.oncomplete = r;
      tx.onerror = j;
    });
    db.close();
  });
  await page.reload();
  await page.locator('[data-review-character=trine]').click();
  for (let i = 0; i < 2; i++) {
    assert.doesNotMatch(
      await page.locator('.digest-panel').textContent(),
      /SGLT1|GLUT2|PEPT1|chylom|intracellul|reesterific/i,
    );
    await page.locator('[data-exam-answer="0"]').click();
    await page.locator('[data-digest=exam-next]').click();
  }
  await page.getByRole('heading', { name: 'Repetition afsluttet' }).waitFor();
  assert.equal((await saved(page)).digestion.assessments.trine.at(-1).correct, 3);
  checks.push('old advanced review is basic; original 3/5 result remains unchanged');
  await seed(page, base, {
    character: 'trine',
    index: 6,
    phase: 'absorption',
    extra: {
      absorptionPassed: true,
      absorptionView: 'transport',
      animation: { stage: 'jejunum', mode: 'transport', age: 5 },
    },
  });
  await page.waitForFunction(
    () => document.querySelector('canvas').dataset.digestMode === 'travel',
  );
  assert.equal(
    await page.locator('.digest-explanation').textContent(),
    'Næringsstoffet er nu optaget gennem tarmvæggen. Du følger i stedet en ufordøjelig rest videre gennem fordøjelseskanalen.',
  );
  assert.equal(
    await page.locator('[data-absorb],.digest-compartments,.digest-perspective-shift').count(),
    0,
  );
  checks.push('legacy vascular checkpoint resumes as residue with the exact basic explanation');
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    path.join(output, 'state-checks.json'),
    JSON.stringify({ checks, errors }, null, 2),
  );
  console.log('PASS continuous state', checks);
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
