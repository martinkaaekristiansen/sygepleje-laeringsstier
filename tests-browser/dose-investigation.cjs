const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const base = process.env.APP_URL || 'http://127.0.0.1:3001/sygepleje-laeringsstier/';
const route = '#/sti/doedelig-dosis/sagsmapper',
  key = 'doedelig-dosis:v1:sag-001';
const output = process.env.DOSE_OUTPUT || path.resolve('artifacts/dose');
const journeys = [
  [
    'wife',
    'daughter',
    'nursing',
    'vitals',
    'medicines',
    'lookup-digoxin',
    'administration',
    'dispensing',
    'labs',
    'targeted',
    'ecg',
  ],
  [
    'admission',
    'fluid',
    'labs',
    'medicines',
    'lookup-digoxin',
    'administration',
    'dispensing',
    'targeted',
    'nursing',
    'vitals',
    'wife',
    'ecg',
  ],
  [
    'room',
    'nursing',
    'vitals',
    'day-nurse',
    'medicines',
    'administration',
    'dispensing',
    'lookup-digoxin',
    'targeted',
    'labs',
    'wife',
    'ecg',
  ],
  [
    'room',
    'friend',
    'admission',
    'fluid',
    'heart-failure',
    'labs',
    'infection',
    'medicines',
    'bleeding',
    'wife',
    'wife-followup',
    'nursing',
    'vitals',
    'evening-nurse',
    'doctor',
    'lookup-digoxin',
    'administration',
    'dispensing',
    'targeted',
    'ecg',
  ],
];
const state = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
async function action(page, name, value) {
  await page.waitForFunction(() =>
    [...document.styleSheets].some((s) => s.href?.endsWith('/dose.css')),
  );
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))),
  );
  const selector = `[data-dose="${name}"]${value === undefined ? '' : `[data-value="${value}"]`}`;
  if (page.doseTouch) await page.locator(selector).first().tap();
  else await page.locator(selector).first().click();
  if (name === 'start') {
    try {
      await page.locator('.dose-documents,.dose-score').first().waitFor({ timeout: 10000 });
    } catch (error) {
      await page.screenshot({ path: path.join(output, 'failure-start.png'), fullPage: true });
      throw Error(
        error.message +
          '; ' +
          JSON.stringify(
            await page.evaluate(() => ({
              events: window.doseTestEvents,
              scrollY,
              viewport: { scale: visualViewport.scale, offset: visualViewport.offsetTop },
            })),
          ) +
          '; ' +
          (await page.locator('.dose-game').innerText()),
      );
    }
  }
}
async function visit(page, id) {
  if (id.startsWith('lookup-')) await action(page, 'reference');
  let target = page.locator(`[data-dose=visit][data-value="${id}"]`).first();
  for (let p = 0; !(await target.count()) && p < 12; p++) {
    const next = page.locator('[data-dose=page]').filter({ hasText: 'Flere muligheder' });
    if (!(await next.count()) || (await next.isDisabled())) break;
    await next.click();
    target = page.locator(`[data-dose=visit][data-value="${id}"]`).first();
  }
  if (!(await target.count())) {
    await action(page, 'archive');
    target = page.locator(`[data-dose=visit][data-value="${id}"]`).first();
  }
  assert(
    await target.count(),
    'Scene unavailable in UI: ' + id + '; ' + (await page.locator('.dose-content').innerText()),
  );
  await target.click();
  assert.equal((await state(page)).scene, id);
}
async function screenshot(page, name) {
  if (process.env.DOSE_SCREENSHOTS === '1') {
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {})));
    });
    await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true });
  }
}
async function complete(page, data) {
  await action(page, 'report');
  assert.equal(
    await page
      .getByText('Digoxinforgiftning med fatal ventrikulær arytmi', { exact: true })
      .count(),
    0,
  );
  for (let i = 0; i < data.freeQuestions.length; i++)
    await page.locator(`[data-draft=free-${i}]`).fill('Min selvstændige begrundelse ' + i);
  await page.locator('form[data-form=free-report] button:not([type=button])').click();
  for (const q of data.assessment) {
    if (q.type === 'number')
      await page.locator(`[name="${q.id}"]`).fill(String(q.correct).replace('.', ','));
    else if (q.type === 'order')
      for (let i = 0; i < q.correct.length; i++)
        await page.locator(`[name="${q.id}-${i}"]`).selectOption(q.correct[i]);
    else if (q.type === 'match')
      for (const [k, v] of Object.entries(q.correct))
        await page.locator(`[name="${q.id}-${k}"]`).selectOption(v);
    else if (q.type === 'multi')
      for (const id of q.correct) await page.locator(`[name="${q.id}"][value="${id}"]`).check();
    else await page.locator(`[name="${q.id}"][value="${q.correct}"]`).check();
  }
  await page.locator('form[data-form=assessment] button:not([type=button])').click();
  await page.locator('.dose-score').waitFor();
  const s = await state(page);
  assert.equal(s.evaluation.total, 100);
  assert.equal(s.status, 'complete');
  await screenshot(page, 'result-' + page.viewportSize().width);
  await action(page, 'uth');
  await page
    .locator('[data-uth="0"]')
    .fill('SIMULATION: styrkeforveksling og manglende barrierer.');
  await page.locator('[data-uth="2"]').fill('Dødsfald i den fiktive sag.');
  await page.locator('form[data-form=uth] button:not([type=button])').click();
  assert.match((await state(page)).uth[0], /SIMULATION/);
  const exportPromise = page.waitForEvent('download');
  await action(page, 'export-uth');
  const file = await exportPromise;
  const content = JSON.parse(fs.readFileSync(await file.path(), 'utf8'));
  assert.equal(content.simulation, true);
  await page.reload();
  await action(page, 'start', 'sag-001');
  await page.locator('.dose-score').waitFor();
  assert.equal((await state(page)).evaluation.total, 100);
}
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const data = (await import(pathToFileURL(path.resolve('public/dose-case-001.js')))).case001;
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const measurements = [];
  try {
    for (let run = 0; run < journeys.length; run++) {
      const mobile = run % 2 === 1;
      const context = await browser.newContext({
        viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
        isMobile: mobile,
        hasTouch: mobile,
      });
      const page = await context.newPage(),
        errors = [],
        external = [],
        failed = [];
      page.doseTouch = mobile;
      await page.addInitScript(() => {
        window.doseTestEvents = [];
        for (const n of ['pointerdown', 'pointerup', 'click', 'touchstart', 'touchend'])
          document.addEventListener(
            n,
            (e) => {
              const t = e.target.closest('button');
              window.doseTestEvents.push({
                n,
                tag: e.target.tagName,
                action: t?.dataset.dose,
                pin: t?.dataset.pin,
                x: e.clientX,
                y: e.clientY,
              });
              if (window.doseTestEvents.length > 30) window.doseTestEvents.shift();
            },
            true,
          );
      });
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('response', (r) => {
        if (r.status() >= 400) failed.push(r.url() + ':' + r.status());
      });
      page.on('request', (r) => {
        if (!r.url().startsWith(new URL(base).origin)) external.push(r.url());
      });
      page.on('dialog', (d) => d.accept());
      const started = Date.now();
      await page.goto(base);
      await page.locator('.continue-section').waitFor();
      assert.equal(await page.locator('img[src*="dose-"]').count(), 0);
      assert.equal(await page.locator('link[href*="dose.css"]').count(), 0);
      await page.locator('[data-semester="3"]').click();
      await page.locator('[data-open="doedelig-dosis"]').click();
      await page.locator('.dose-folder').waitFor();
      assert(!/digoxin/i.test(await page.locator('.dose-game').textContent()));
      await screenshot(page, 'catalog-' + page.viewportSize().width);
      await action(page, 'start', 'sag-001');
      await page.locator('[data-clue=opening]').waitFor();
      assert.equal(await page.locator('.dose-choices button').count(), 3);
      assert.equal(await page.getByText('P-digoxin 4,1 nmol/L', { exact: true }).count(), 0);
      await screenshot(page, 'opening-' + page.viewportSize().width);
      for (const [index, id] of journeys[run].entries()) {
        await visit(page, id);
        if (id === 'labs') {
          await action(page, 'save-row', 'other-labs::1');
          assert(
            (await state(page)).notes.some(
              (n) => n.clue === 'other-labs-row-1' && n.content.includes('CRP'),
            ),
          );
        }
        assert(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          'horizontal overflow ' + id,
        );
        if (['wife', 'administration', 'targeted', 'vitals'].includes(id))
          await screenshot(page, id + '-' + page.viewportSize().width);
        if (index === 0) {
          await action(page, 'save-clue', data.scenes.find((s) => s.id === id).blocks[0].id);
          if (!mobile) {
            await page.evaluate(() => {
              const el = document.querySelector('[data-scene-text] p'),
                range = document.createRange();
              range.selectNodeContents(el);
              const s = getSelection();
              s.removeAllRanges();
              s.addRange(range);
            });
            await action(page, 'selection');
            assert.equal((await state(page)).notes.length, 2);
          }
          await page.locator('.dose-reflection summary').click();
          await page.locator('[data-draft="scene-' + id + '"]').fill('Min refleksion fra ' + id);
          await action(page, 'scene-note');
          await action(page, 'notebook');
          await page
            .locator('[data-draft=new-note]')
            .fill('<img src=x onerror="window.injected=1"> Min egen note');
          await page.locator('form[data-form=note] button:not([type=button])').click();
          assert.equal(await page.evaluate(() => window.injected), undefined);
          const note = page.locator('[data-note][data-part=comment]').first();
          await note.fill('Min kommentar gemmes straks');
          await action(page, 'pin', (await state(page)).notes[0].id);
          await action(page, 'pin', (await state(page)).notes[1].id);
          await action(page, 'board');
          const notes = (await state(page)).notes;
          await page.locator('[name=from]').selectOption(notes[0].id);
          await page.locator('[name=to]').selectOption(notes[1].id);
          await page.locator('[name=label]').fill('Min egen mulige sammenhæng');
          await page.locator('form[data-form=link] button:not([type=button])').click();
          assert.equal((await state(page)).links.length, 1);
          const pin = page.locator('[data-pin]').first();
          const oldX = (await state(page)).notes[0].x;
          await pin.focus();
          await page.keyboard.press('ArrowRight');
          assert((await state(page)).notes[0].x > oldX);
          await pin.scrollIntoViewIfNeeded();
          const box = await pin.boundingBox();
          const x = box.x + box.width / 2,
            y = box.y + 20;
          const beforeDrag = (await state(page)).notes[0].x;
          if (mobile) {
            // Give Chromium's compositor a frame between physical gesture phases.
            const cdp = await context.newCDPSession(page);

            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchStart',
              touchPoints: [{ x, y }],
            });
            await page.waitForTimeout(80);
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchMove',
              touchPoints: [{ x: x + 24, y: y + 8 }],
            });
            await page.waitForTimeout(80);
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            await page.waitForTimeout(80);
          } else {
            await page.mouse.move(x, y);
            await page.mouse.down();
            await page.mouse.move(x + 24, y + 8, { steps: 4 });
            await page.mouse.up();
          }
          assert((await state(page)).notes[0].x > beforeDrag, 'mouse / touch drag saved');
          await screenshot(page, 'board-' + page.viewportSize().width);
          await page.reload();
          await action(page, 'start', 'sag-001');
          assert.equal((await state(page)).links.length, 1);
          assert(
            (await state(page)).notes.some((n) => n.comment === 'Min kommentar gemmes straks'),
          );
        }
        if (index === 2 || index === 6 || index === 10) {
          await action(page, 'hypothesis');
          await page
            .locator('[data-draft=hyp-content]')
            .fill('Foreløbig hypotese ved trin ' + index);
          await page.locator('form[data-form=hypothesis] button:not([type=button])').click();
          assert.equal(await page.locator('.dose-score').count(), 0);
          await action(page, 'scene');
        }
      }
      const collected = await state(page);
      for (const id of data.critical) assert(collected.found.includes(id), id);
      await action(page, 'hints');
      for (const n of [1, 2, 3]) await action(page, 'hint', String(n));
      assert.equal((await state(page)).hints.length, 3);
      if (run === 0) {
        await action(page, 'reference');
        assert.equal(await page.locator('.dose-choices button').count(), 6);
        for (const id of [
          'digoxin',
          'furosemid',
          'ramipril',
          'apixaban',
          'atorvastatin',
          'metformin',
        ]) {
          await action(page, 'reference');
          await action(page, 'visit', 'lookup-' + id);
        }
        for (const id of [
          'wife-followup',
          'day-nurse',
          'nurse-followup',
          'evening-nurse',
          'evening-followup',
        ]) {
          await action(page, 'scene');
          await visit(page, id);
        }
      }
      await complete(page, data);
      assert.deepEqual(errors, []);
      assert.deepEqual(external, []);
      assert.deepEqual(failed, []);
      measurements.push({
        run: run + 1,
        mobile,
        seconds: (Date.now() - started) / 1000,
        storageBytes: await page.evaluate((k) => localStorage.getItem(k).length, key),
        requests: await page.evaluate(() => performance.getEntriesByType('resource').length),
      });
      console.log(
        'PASS Dødelig dosis complete investigation ' +
          (run + 1) +
          (run === 3 ? ' with misleading clues' : ''),
      );
      await context.close();
    }
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on('dialog', (d) => d.accept());
    await page.goto(base + route);
    await page.locator('.dose-folder').waitFor();
    await action(page, 'start', 'sag-001');
    for (const size of [
      [320, 568],
      [375, 667],
      [390, 844],
      [768, 1024],
      [844, 390],
      [1024, 768],
      [1280, 800],
      [568, 320],
    ]) {
      await page.setViewportSize({ width: size[0], height: size[1] });
      for (const v of ['scene', 'notebook', 'board', 'hypothesis', 'archive', 'hints', 'report']) {
        await action(page, v);
        assert(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          'layout ' + size + ' ' + v,
        );
      }
      await screenshot(page, 'layout-' + size.join('x'));
    }
    // Corrupt data is preserved; the rest of the website remains usable.
    await page.evaluate((k) => localStorage.setItem(k, '{bad'), key);
    await page.reload();
    await action(page, 'start', 'sag-001');
    await page.locator('.dose-warning').waitFor();
    assert.equal(await page.evaluate((k) => localStorage.getItem(k), key), '{bad');
    await action(page, 'catalog');
    await action(page, 'reset', 'sag-001');
    assert.equal(await page.evaluate((k) => localStorage.getItem(k), key), null);
    await action(page, 'start', 'sag-001');
    await action(page, 'notebook');
    await page.locator('[data-draft=new-note]').fill('Må ikke påvirke andre spil');
    await page.locator('form[data-form=note] button:not([type=button])').click();
    const before = await state(page);
    await page.evaluate((k) => {
      const s = JSON.parse(localStorage.getItem(k));
      s.version = 0;
      localStorage.setItem(k, JSON.stringify(s));
    }, key);
    await page.reload();
    await action(page, 'start', 'sag-001');
    assert.equal((await state(page)).notes.length, before.notes.length);
    // Image failure falls back to a neutral placeholder and never prevents progress.
    await page.route('**/dose-wife.webp', (r) => r.abort());
    await action(page, 'visit', 'wife');
    await page.locator('.dose-photo-missing').waitFor();
    assert(await page.locator('[data-clue=yellow-vision]').isVisible());
    await context.close();
    fs.writeFileSync(
      path.join(output, 'browser-results.json'),
      JSON.stringify({ passed: true, journeys: measurements, viewports: 8 }, null, 2),
    );
    console.log(
      'PASS notebook, selection, hypotheses, manual board, persistence, export, UTH, XSS, corruption, version, images and eight viewports',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
