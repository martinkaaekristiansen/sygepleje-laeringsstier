const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const base = process.env.APP_URL || 'http://127.0.0.1:3001/sygepleje-laeringsstier/';
async function stored(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve) => {
      const q = indexedDB.open('laeringsstier-v2');
      q.onsuccess = () => resolve(q.result);
    });
    const record = await new Promise((resolve) => {
      const q = db.transaction('records').objectStore('records').get('progress');
      q.onsuccess = () => resolve(q.result);
    });
    db.close();
    return record['blodcellens-rejse'].bloodJourney;
  });
}
async function visibleControl(page, selector) {
  const control = page.locator(selector);
  const box = await control.boundingBox();
  assert.ok(
    box &&
      box.x >= 0 &&
      box.x + box.width <= page.viewportSize().width + 1 &&
      box.y >= 0 &&
      box.y + box.height <= page.viewportSize().height + 1,
    selector + ' inside viewport',
  );
  assert.ok(
    await control.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    }),
    selector + ' receives pointer',
  );
}
(async () => {
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
  });
  try {
    for (const mobile of [true, false]) {
      const context = await browser.newContext({
        viewport: mobile ? { width: 320, height: 568 } : { width: 1440, height: 900 },
        isMobile: mobile,
        hasTouch: mobile,
        reducedMotion: 'reduce',
      });
      await context.addInitScript(() => {
        window.confirmCalls = 0;
        window.confirm = () => {
          window.confirmCalls++;
          return false;
        };
      });
      const page = await context.newPage(),
        errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const press = async (selector) =>
        mobile ? page.locator(selector).tap() : page.locator(selector).click();
      await page.goto(base + '#/sti/blodcellens-rejse/blood-easy');
      await page.waitForFunction(
        () => document.querySelector('[data-blood=start]')?.disabled === false,
      );
      await visibleControl(page, '[data-blood=start]');
      await page.screenshot({ path: `/tmp/game-viewport-menu-${mobile}.png` });
      await press('[data-blood=start]');
      await page.locator('[data-passage]').first().waitFor();
      await page.locator('[data-passage]').filter({ hasText: 'Arterier' }).click();
      await page.waitForFunction(
        () => document.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow') === '1',
      );
      await page.reload();
      await page.locator('[data-blood=resume]').waitFor();
      const before = await stored(page);
      await press('[data-blood=start]');
      await page.getByRole('heading', { name: 'Start et nyt forsøg?' }).waitFor();
      await press('[data-blood=cancel-start]');
      assert.deepEqual(await stored(page), before, 'cancel preserves saved attempt');
      await press('[data-blood=resume]');
      await page.locator('[data-passage]').first().waitFor();
      assert.equal(await page.locator('[role=progressbar]').getAttribute('aria-valuenow'), '1');
      await press('[data-blood=menu]');
      await page.locator('[value=hard]').check();
      await press('[data-blood=start]');
      await press('[data-blood=confirm-start]');
      await page.locator('[data-passage]').first().waitFor();
      const after = await stored(page);
      assert.equal(after.active.level, 'hard');
      assert.equal(after.active.correct, 0);
      assert.equal(after.stats.hard.attempts, 1);
      assert.deepEqual(after.stats.easy, before.stats.easy);
      assert.match(await page.locator('.blood-lives').getAttribute('aria-label'), /^2 /);
      const { BLOOD_LEVELS } = await import('../public/blood-routes.js');
      await page
        .locator('[data-passage]')
        .filter({ hasText: BLOOD_LEVELS.hard.choices[0].wrong.name })
        .click();
      await page.locator('#blood-feedback').waitFor();
      assert.equal(await page.evaluate(() => confirmCalls), 0, 'no dependency on native confirm');
      for (const size of mobile
        ? [
            { width: 320, height: 568 },
            { width: 844, height: 390 },
            { width: 390, height: 844 },
          ]
        : [{ width: 1440, height: 900 }]) {
        await page.setViewportSize(size);
        await page.waitForTimeout(450);
        for (const selector of ['[data-blood=exit]', '[data-audio-toggle]', '[data-panel-toggle]'])
          await visibleControl(page, selector);
        const root = await page.locator('#blood-root').boundingBox();
        assert.ok(Math.abs(root.height - size.height) < 2);
        assert.ok(Math.abs(root.width - size.width) < 2);
        await page.evaluate(() => scrollTo(0, 500));
        await page.mouse.wheel(0, 400);
        assert.equal(await page.evaluate(() => scrollY), 0);
        assert.equal(await page.locator('canvas').getAttribute('data-mesh-quality'), 'high');
        assert.equal(
          await page.locator('[data-quality3d], [data-funfact], [data-note], [data-hint]').count(),
          0,
        );
        assert.equal(await page.locator('.blood-minimap figcaption').textContent(), 'KROPSKORT');
        for (const selector of ['[data-passage]', '[data-audio-toggle]', '.blood3d-feedback p']) {
          assert.ok(
            await page
              .locator(selector)
              .first()
              .evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 16),
            selector + ' readable type',
          );
        }
        const labels = await page.locator('[data-passage]').all();
        const boxes = await Promise.all(labels.map((b) => b.boundingBox()));
        assert.ok(boxes[0].x + boxes[0].width <= boxes[1].x, 'large labels do not overlap');
        await press('[data-panel-toggle]');
        assert.equal(await page.locator('#blood-settings [data-blood=motion]').count(), 1);
        await press('[data-blood=motion]');
        await press('[data-panel-close]');
        assert.equal(
          await page.locator('[data-passage]:enabled').count(),
          0,
          'pause remains active after closing settings',
        );
        await press('[data-panel-toggle]');
        await press('[data-blood=motion]');
        await page.locator('[data-audio=volume]').fill('61');
        if (size.width === 390) await page.screenshot({ path: '/tmp/game-viewport-settings.png' });
        await press('[data-panel-close]');
        await page.screenshot({ path: `/tmp/game-viewport-${size.width}x${size.height}.png` });
        for (const side of ['0', '1']) await visibleControl(page, `[data-passage="${side}"]`);
      }
      // Open settings in the same event turn as choosing a passage, before the
      // asynchronous save completes. The transition must still settle.
      await page.evaluate(() => {
        [...document.querySelectorAll('[data-passage]')]
          .find((b) => b.textContent.includes('Arcus aortae'))
          .click();
        document.querySelector('[data-panel-toggle]').click();
      });
      await page.waitForFunction(
        () => document.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow') === '1',
      );
      await press('[data-panel-close]');
      await page.locator('[data-passage]:enabled').first().waitFor();
      if (mobile) {
        // Resume a valid saved valve stage to exercise the longest labels at 320px.
        await page.evaluate(async () => {
          const db = await new Promise((resolve) => {
            const q = indexedDB.open('laeringsstier-v2');
            q.onsuccess = () => resolve(q.result);
          });
          await new Promise((resolve, reject) => {
            const tx = db.transaction('records', 'readwrite'),
              store = tx.objectStore('records'),
              q = store.get('progress');
            q.onsuccess = () => {
              const data = q.result;
              Object.assign(data['blodcellens-rejse'].bloodJourney.active, {
                index: 9,
                correct: 9,
                lives: 2,
                errors: 0,
                phase: 'choice',
                lastSide: null,
              });
              store.put(data, 'progress');
            };
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
          });
          db.close();
        });
        await page.setViewportSize({ width: 320, height: 568 });
        await page.reload();
        await press('[data-blood=resume]');
        await page.locator('[data-passage]:enabled').first().waitFor();
        await page
          .locator('[data-passage]')
          .filter({ hasText: BLOOD_LEVELS.hard.choices[9].wrong.name })
          .tap();
        await page.locator('#blood-feedback').waitFor();
        await page.screenshot({ path: '/tmp/game-readable-valve-320.png' });
        const map = await page.locator('.blood-minimap').boundingBox();
        for (const side of ['0', '1']) {
          await visibleControl(page, `[data-passage="${side}"]`);
          const box = await page.locator(`[data-passage="${side}"]`).boundingBox();
          assert.ok(
            box.x >= map.x + map.width || box.y + box.height <= map.y,
            'long anatomical labels clear the map',
          );
        }
      }
      await press('[data-audio-toggle]');
      assert.equal(await page.locator('[data-audio-toggle]').getAttribute('aria-pressed'), 'true');
      await press('[data-panel-toggle]');
      await press('[data-blood=exit]');
      await page.locator('.continue-section').waitFor();
      assert.equal(
        await page.evaluate(() =>
          document.documentElement.classList.contains('blood-viewport-active'),
        ),
        false,
      );
      assert.equal(await page.evaluate(() => document.body.style.top), '');
      assert.equal(
        await page.evaluate(() => !!document.querySelector('#app > header')?.inert),
        false,
      );
      await page.evaluate(() => scrollTo(0, 500));
      assert.ok(await page.evaluate(() => scrollY > 0), 'normal page scroll restored');
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log(
      'PASS: mobile/desktop start with suppressed native dialogs, cancellation, new attempts, resume, viewport rotation, controls, settings, scroll lock and cleanup',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
