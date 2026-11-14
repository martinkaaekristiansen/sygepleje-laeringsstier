const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const base = process.env.APP_URL || 'http://127.0.0.1:3001/sygepleje-laeringsstier/';
(async () => {
  const { ABSORPTION_CHOICES, FINAL_TESTS } = await import('../public/digestion-assessment.js');
  const { BOSSES, ROUTE, CHARACTERS } = await import('../public/digestion-data.js');
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
        reducedMotion: 'reduce',
      }),
      errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('dialog', (d) => d.accept());
    await page.goto(base + '#/sti/fordoejelsens-vilde-rejse/digestion-stanley');
    await page.locator('[data-digest=start]').waitFor();
    for (const id of Object.keys(CHARACTERS)) {
      console.log('Testing digestion:', id);
      await page.locator(`[data-character="${id}"]`).click();
      await page.locator('[data-digest=start]').click();
      let testedWrongOrder = false;
      let changedPerspective = false,
        seen = new Set();
      for (let step = 0; step < 100; step++) {
        if (await page.locator('h2').filter({ hasText: 'TILLYKKE' }).count()) break;
        const mode = await page.evaluate(() => {
          const b = document.querySelector('[data-digest=skip]');
          if (!b) return null;
          const mode = document.querySelector('canvas').dataset.digestMode;
          b.click();
          return mode;
        });
        if (mode) {
          seen.add(mode);
          if (mode === 'residue') {
            assert.match(await page.locator('.digest-hud').textContent(), /ufordøjelig rest/);
            changedPerspective = true;
          }
          continue;
        }
        if (await page.locator('[data-absorb]').count()) {
          await page
            .locator('[data-absorb]')
            .filter({ hasText: ABSORPTION_CHOICES[id].options[0] })
            .click();
          await page.locator('[data-absorb]').first().waitFor({ state: 'detached' });
          continue;
        }
        if (await page.locator('[data-chain]').count()) {
          if (!testedWrongOrder) {
            for (const n of [1, 0, 2]) await page.locator(`[data-chain="${n}"]`).click();
            await page.waitForFunction(() => document.querySelector('.digest-feedback'));
            assert.equal(await page.locator('canvas').getAttribute('data-digest-mode'), 'boss');
            testedWrongOrder = true;
          }
          for (const n of [0, 1, 2]) await page.locator(`[data-chain="${n}"]`).click();
          await page.locator('[data-chain]').first().waitFor({ state: 'detached' });
          continue;
        }
        await page.waitForFunction(
          () =>
            document.querySelector('[data-absorb]') ||
            document.querySelector('[data-choice]:enabled') ||
            document.querySelector('[data-chain]:not(:disabled)') ||
            document.querySelector('[data-digest=skip]') ||
            document.querySelector('.digest-panel h2')?.textContent.includes('TILLYKKE'),
        );
        if (!(await page.locator('[data-choice]:enabled').count())) continue;
        const stage = await page.locator('.digest-panel').getAttribute('data-stage'),
          s = ROUTE.find((s) => s.id === stage);
        const title = await page.locator('.digest-panel h2').textContent();
        const task = BOSSES[id][stage]?.find((t) => t.prompt === title);
        const target =
          task?.options[0] || ROUTE.slice(s.index + 1).find((s) => !s.automatic)?.latin;
        const before = await page.locator('.digest-panel').textContent();
        await page.locator('[data-choice]').filter({ hasText: target }).click();
        await page.waitForFunction(
          (t) => document.querySelector('.digest-panel').textContent !== t,
          before,
        );
      }
      await page.locator('h2').filter({ hasText: 'TILLYKKE' }).waitFor();
      assert.ok(changedPerspective);
      for (const mode of [
        'intro',
        'reaction',
        'lumen',
        'villus',
        'cell',
        'membrane',
        'transport',
        'residue',
        'finale',
      ])
        assert.ok(seen.has(mode), mode);
      assert.match(await page.locator('.digest-panel').textContent(), /9 \/ 9/);
      assert.ok(Number(await page.locator('canvas').getAttribute('data-triangles')) < 150000);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.locator('.digest-panel').screenshot({ path: `/tmp/digest-${id}-result.png` });
      await page.locator('[data-digest=exam]').click();
      for (const q of FINAL_TESTS[id]) {
        await page.locator('[data-exam-answer]').filter({ hasText: q.options[0] }).click();
      }
      await page.getByRole('heading', { name: 'Testresultat: 5 af 5' }).waitFor();
      await page.locator('[data-digest=menu]').last().click();
      await page.locator('[data-digest=start]').waitFor();
    }
    assert.match(await page.locator('.digest-panel').textContent(), /FORDØJELSESMESTER/);
    await page.reload();
    await page.locator('[data-digest=start]').waitFor();
    assert.match(await page.locator('.digest-panel').textContent(), /FORDØJELSESMESTER/);
    // Failed challenge recovers in place; old trophies survive a new attempt.
    await page.locator('[data-digest=start]').click();
    await page.locator('[data-digest=skip]').evaluate((b) => b.click());
    const selected = await page.locator('.digest-hud strong').textContent(),
      id = Object.keys(CHARACTERS).find((k) => CHARACTERS[k].name === selected);
    for (let i = 0; i < 2; i++)
      await page
        .locator('[data-choice]')
        .filter({ hasText: BOSSES[id].mouth[0].options[1] })
        .click();
    await page.locator('[data-digest=retry]').click();
    assert.match(await page.locator('.digest-hud').textContent(), /♥♥/);
    await page.locator('[data-digest=settings]').click();
    await page.locator('[data-setting=motion]').check();
    await page.locator('[data-setting=motion]').uncheck();
    await page.locator('[data-setting=quality]').selectOption('low');
    await page.locator('[data-digest=settings]').click();
    await page.reload();
    await page.locator('[data-digest=resume]').click();
    await page.locator('[data-choice]').first().waitFor();
    assert.equal(await page.locator('.digest-panel').getAttribute('data-stage'), 'mouth');
    const correctLabel = BOSSES[id].mouth[0].options[0];
    const index = await page
      .locator('[data-choice]')
      .filter({ hasText: correctLabel })
      .getAttribute('data-choice');
    const builds = await page.locator('canvas').getAttribute('data-environment-builds');
    await page.locator('[data-choice]').first().focus();
    await page.keyboard.press(String(Number(index) + 1));
    await page.waitForFunction(
      (prompt) => document.querySelector('.digest-panel h2')?.textContent === prompt,
      BOSSES[id].mouth[1].prompt,
    );
    assert.equal(await page.locator('canvas').getAttribute('data-environment-builds'), builds);
    await page.locator('.digest-ph summary').click();
    await page.waitForFunction(() =>
      Number.isFinite(Number(document.querySelector('canvas').dataset.ph)),
    );
    assert.ok(Number(await page.locator('canvas').getAttribute('data-ph')) > 0);
    await page.locator('.digest-ph summary').click();
    for (const viewport of [
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await page.locator('[data-digest=pause]').click();
    assert.equal(await page.locator('.digest-panel').evaluate((e) => e.inert), true);
    await page.locator('[data-digest=pause]').click();
    await page.locator('.digestion-game').screenshot({ path: '/tmp/digest-mobile.png' });
    await page.getByRole('link', { name: '← Læringsstier' }).click();
    await page.locator('.continue-section').waitFor();
    assert.equal(await page.locator('#digestion-root').count(), 0);
    assert.equal(
      await page.locator('html').evaluate((e) => e.classList.contains('blood-viewport-active')),
      false,
    );
    const fallback = await browser.newPage();
    await fallback.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return type === 'webgl2' ? null : original.call(this, type, ...args);
      };
    });
    await fallback.goto(base + '#/sti/fordoejelsens-vilde-rejse/digestion-stanley');
    await fallback.getByRole('heading', { name: '3D kunne ikke vises' }).waitFor();
    assert.ok(await fallback.locator('[data-digest=menu]').isDisabled());
    await fallback.getByRole('link', { name: 'Åbn kredsløbsøvelser uden 3D' }).click();
    await fallback.locator('.circulation-learning').waitFor();
    await fallback.close();
    assert.deepEqual(errors, []);
    console.log(
      'PASS digestion: all three journeys, three bosses each, ordered processes, all scale transitions, residue perspective, finale, trophies, reload, retries, settings, mobile, performance budget and cleanup',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
