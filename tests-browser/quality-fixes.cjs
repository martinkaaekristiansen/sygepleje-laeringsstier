const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'),
  fs = require('node:fs');
const base = process.env.APP_URL || 'http://127.0.0.1:3001/sygepleje-laeringsstier/';
const read = (page) =>
  page.evaluate(async () => {
    const db = await new Promise((r) => {
      const q = indexedDB.open('laeringsstier-v2');
      q.onsuccess = () => r(q.result);
    });
    const tx = db.transaction('records', 'readonly'),
      s = tx.objectStore('records'),
      keys = ['meta', 'paths', 'progress', 'drafts', 'installed', 'dismissedUpdates'];
    const values = await Promise.all(
      keys.map(
        (k) =>
          new Promise((r) => {
            const q = s.get(k);
            q.onsuccess = () => r(q.result);
          }),
      ),
    );
    db.close();
    return { ...values[0], ...Object.fromEntries(keys.slice(1).map((k, i) => [k, values[i + 1]])) };
  });
const seed = (page, state) =>
  page.evaluate(async (state) => {
    const db = await new Promise((r) => {
      const q = indexedDB.open('laeringsstier-v2');
      q.onsuccess = () => r(q.result);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('records', 'readwrite'),
        s = tx.objectStore('records');
      for (const key of ['paths', 'progress', 'drafts', 'installed', 'dismissedUpdates'])
        s.put(state[key], key);
      s.put({ schemaVersion: state.schemaVersion, revision: state.revision }, 'meta');
      tx.oncomplete = resolve;
      tx.onabort = reject;
    });
    db.close();
  }, state);
(async () => {
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: [
      '--no-sandbox',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
    ],
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 320, height: 812 },
        reducedMotion: 'reduce',
      }),
      errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('dialog', (d) => d.accept());
    await page.goto(base);
    await page.locator('.continue-section').waitFor();
    await seed(page, JSON.parse(fs.readFileSync('test/fixtures/v091-state.json', 'utf8')));
    await page.reload();
    await page.locator('.continue-section').waitFor();
    const upgraded = await read(page),
      id = upgraded.paths[0].id;
    assert.equal(upgraded.paths.length, 4);
    assert.equal(upgraded.paths[0].contentVersion, 2);
    assert.equal(
      upgraded.progress[id].notes[upgraded.paths[0].steps[0].id],
      'Bevar gammel refleksion',
    );
    assert.ok(await page.locator('.continue-card .notice').isVisible());
    await page.locator('[data-semester="5"]').click();
    await page.locator('[data-subject="Farmakologi"]').click();
    assert.equal(await page.locator('.path-card').count(), 1);
    await page.reload();
    await page.locator('.continue-section').waitFor();
    assert.equal(await page.locator('[data-semester="5"]').getAttribute('aria-pressed'), 'true');
    assert.equal(
      await page.locator('[data-subject="Farmakologi"]').getAttribute('aria-pressed'),
      'true',
    );
    await page.goto(base + '#/sti/find-vej-kredsloeb/circulation-order');
    await page.locator('.route-card').first().waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const url = page.url();
    await page.locator('.skip-link').focus();
    await page.keyboard.press('Enter');
    assert.equal(page.url(), url);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'main-content');
    await page.screenshot({ path: '/tmp/blood-quality-order-320.png' });
    const exported = page.waitForEvent('download');
    await page.locator('[data-action=backup]').click();
    const file = await exported;
    await file.saveAs('/tmp/quality-roundtrip.json');
    const data = JSON.parse(fs.readFileSync('/tmp/quality-roundtrip.json'));
    assert.equal(data.format, 'laeringsstier-backup');
    assert.ok(data.state.progress[id]);
    await page.locator('#restore-file').setInputFiles('/tmp/quality-roundtrip.json');
    await page.waitForEvent('load');
    await page.locator('.route-card').first().waitFor();
    assert.deepEqual((await read(page)).progress[id], data.state.progress[id]);
    // Accepted legacy empty stats normalize in the game, without a recovery crash.
    const empty = await read(page);
    empty.progress['blodcellens-rejse'] = { done: [], notes: {}, answers: {}, bloodJourney: {} };
    await seed(page, empty);
    await page.goto(base + '#/sti/blodcellens-rejse/blood-easy');
    await page.reload();
    await page.locator('[data-blood=start]:enabled').waitFor({ timeout: 30000 });
    const workerCheck = await page.evaluate(async () => {
      const base = new URL('./', document.querySelector('script[type="module"]').src);
      const [{ createGeometryLoader }, { visualAnatomy }, { BLOOD_LEVELS }] = await Promise.all([
        import(new URL('journey-geometry-loader.js', base)),
        import(new URL('journey-3d-anatomy.js', base)),
        import(new URL('blood-routes.js', base)),
      ]);
      const loader = createGeometryLoader(),
        i = BLOOD_LEVELS.hard.steps.findIndex((s) => s.id === 'rv');
      let ticks = 0;
      const timer = setInterval(() => ticks++, 16),
        start = performance.now();
      try {
        const g = await loader.chamber(
          visualAnatomy(BLOOD_LEVELS.hard.steps[i], BLOOD_LEVELS.hard.steps[i + 1]),
          'low',
        );
        const result = {
          ticks,
          milliseconds: Math.round(performance.now() - start),
          triangles: g.index.count / 3,
        };
        g.dispose();
        return result;
      } finally {
        clearInterval(timer);
        loader.dispose();
      }
    });
    assert.ok(workerCheck.ticks > 2, 'UI timers keep running while a chamber is built');
    assert.ok(workerCheck.triangles > 1000 && workerCheck.triangles < 180000);
    console.log('Chamber worker:', workerCheck);
    assert.ok(await page.locator('canvas').evaluate((el) => el.inert));
    assert.ok(await page.locator('.blood3d-hud').evaluate((el) => el.inert));
    await page.locator('[data-blood=start]').click();
    await page.locator('[data-passage="0"]:enabled').waitFor({ timeout: 30000 });
    assert.equal(await page.locator('canvas').evaluate((el) => el.inert), false);
    // Imported/stored markup must be rejected, never inserted into a menu.
    const unsafe = await read(page);
    unsafe.progress['blodcellens-rejse'].bloodJourney = {
      stats: { easy: { attempts: '<img src=x onerror="window.__unsafe=true">' } },
    };
    await seed(page, unsafe);
    await page.reload();
    await page.locator('#raw-backup').waitFor();
    assert.equal(await page.evaluate(() => window.__unsafe), undefined);
    const rawEvent = page.waitForEvent('download');
    await page.locator('#raw-backup').click();
    await (await rawEvent).saveAs('/tmp/quality-invalid-raw.json');
    const raw = JSON.parse(fs.readFileSync('/tmp/quality-invalid-raw.json'));
    assert.ok(
      raw.raw.progress['blodcellens-rejse'].bloodJourney.stats.easy.attempts.includes('<img'),
    );
    assert.deepEqual(errors, []);
    await page.close();
    // A rendering error still exports actual valid IndexedDB data, not an empty wrapper.
    const broken = await browser.newPage();
    await broken.goto(base);
    await broken.locator('.continue-section').waitFor();
    await broken.route('**/app.js', async (route) => {
      const response = await route.fetch();
      const source = (await response.text()).replace(
        'await route();',
        'throw Error("Test af renderfejl");',
      );
      await route.fulfill({ response, body: source });
    });
    await broken.reload();
    await broken.locator('#raw-backup').waitFor();
    const rescueEvent = broken.waitForEvent('download');
    await broken.locator('#raw-backup').click();
    await (await rescueEvent).saveAs('/tmp/quality-render-backup.json');
    const rescue = JSON.parse(fs.readFileSync('/tmp/quality-render-backup.json'));
    assert.equal(rescue.format, 'laeringsstier-backup');
    assert.equal(rescue.state.paths.length, 4);
    console.log(
      'Quality regression browser checks passed: upgrade, backup, corruption, XSS, focus, navigation and 320px layout.',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
