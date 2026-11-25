const { devices } = require('./ci-shards.cjs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const base = process.env.APP_URL || 'http://127.0.0.1:3001/sygepleje-laeringsstier/';
(async () => {
  const { BOSSES, ROUTE, CHARACTERS } = await import('../public/digestion-data.js');
  const { QUESTION_POOLS } = await import('../public/digestion-assessment.js');
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const errors = [];
  try {
    for (const mobile of devices(process.env.DIGEST_SIZES)) {
      const page = await browser.newPage({
        viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
        hasTouch: mobile,
        reducedMotion: 'reduce',
      });
      page.setDefaultTimeout(120000);
      page.on('pageerror', (e) => {
        errors.push(e.message);
        console.error(e.stack);
      });
      page.on('dialog', (d) => d.accept());
      await page.goto(base + '#/sti/fordoejelsens-vilde-rejse/digestion-stanley');
      const state = () =>
        page.evaluate(() => ({
          stage: document.querySelector('canvas').dataset.digestStage,
          mode: document.querySelector('canvas').dataset.digestMode,
          form: document.querySelector('canvas').dataset.molecularForm,
          heading: document.querySelector('.digest-panel h2')?.textContent,
          entry: !!document.querySelector('[data-entry]'),
          sequence: document.querySelector('.digest-panel').hidden,
          absorb: !!document.querySelector('[data-absorb]'),
          choices: document.querySelectorAll('[data-choice]').length,
          retry: !!document.querySelector('[data-digest=retry]'),
        }));
      const changed = (before) =>
        page.waitForFunction(
          (before) => {
            const c = document.querySelector('canvas'),
              h = document.querySelector('.digest-panel h2');
            return (
              JSON.stringify([
                c.dataset.digestStage,
                c.dataset.digestMode,
                h?.textContent,
                document.querySelector('[data-digest=retry]')?.textContent,
              ]) !== before
            );
          },
          JSON.stringify([
            before.stage,
            before.mode,
            before.heading,
            before.retry ? 'Genstart aktuelle udfordring' : undefined,
          ]),
        );
      for (const id of Object.keys(CHARACTERS)) {
        console.log('Testing digestion', id, mobile ? 'mobile' : 'desktop');
        await page.locator(`[data-character="${id}"]`).click();
        await page.locator('[data-digest=start]').click();
        const visited = [],
          forms = new Set(),
          wrong = new Set();
        let jejunumCamera = null,
          absorptionEnvironment = null;
        let absorbed = false,
          complete = false;
        for (let n = 0; n < 130; n++) {
          const s = await state();
          if (s.heading?.includes('TILLYKKE')) {
            complete = true;
            break;
          }
          if (!['face-intro', 'entry', 'menu'].includes(s.mode) && visited.at(-1) !== s.stage)
            visited.push(s.stage);
          if (s.form) forms.add(s.form);
          if (s.stage === 'mouth' && ['face-intro', 'entry', 'intro'].includes(s.mode)) {
            const camera = JSON.parse(
              await page.locator('canvas').getAttribute('data-route-camera'),
            );
            assert(
              camera.cameraDistance < 10,
              'each new nutrient starts at the mouth, including after a completed journey',
            );
          }
          if (s.stage === 'jejunum' && s.mode === 'boss')
            jejunumCamera = JSON.parse(
              (await page.locator('canvas').getAttribute('data-camera')) || 'null',
            );
          if (s.mode === 'absorb') {
            absorbed = true;
            assert.equal(await page.locator('canvas').getAttribute('data-scale'), 'centimeter');
            assert.equal(
              await page.locator('canvas').getAttribute('data-absorption-space'),
              'intestinal-lumen',
            );
            const camera = JSON.parse(await page.locator('canvas').getAttribute('data-camera'));
            if (jejunumCamera)
              assert.deepEqual(
                camera.position,
                jejunumCamera.position,
                'absorption retains the lumen camera',
              );
            absorptionEnvironment = await page
              .locator('canvas')
              .getAttribute('data-environment-builds');
            assert.equal(s.stage, 'jejunum');
            assert.ok(
              forms.has(
                id === 'stanley' ? 'glucose' : id === 'poul' ? 'amino-acid' : 'lipid-products',
              ),
            );
            assert.equal(
              await page.locator('canvas').getAttribute('data-absorption-destination'),
              'intestinal-wall',
            );
            if (s.sequence)
              await page.screenshot({
                path: `/tmp/digest-v4-${id}-${mobile ? 'mobile' : 'desktop'}-absorption.png`,
              });
          }
          assert.equal(s.absorb, false, 'no interactive absorption question');
          assert.notEqual(s.mode, 'transport', 'no separate vascular scene');
          assert.notEqual(s.mode, 'residue', 'no separate perspective dialog');
          assert.equal(
            await page.locator('.digest-perspective-shift,.digest-compartments').count(),
            0,
          );
          if (s.form === 'residue' && s.stage === 'jejunum' && !s.sequence) {
            assert.ok(absorbed);
            assert.match(
              await page.locator('.digest-learning').textContent(),
              /Næringsstoffet er nu optaget gennem tarmvæggen/,
            );
          }
          if (s.mode === 'secretion' && id === 'stanley' && !mobile && !wrong.has('reading-pace')) {
            // Freeze the same browser turn that verifies the short sequence.
            const point = await page.evaluate(() => {
              if (document.querySelector('canvas').dataset.digestMode !== 'secretion') return null;
              const text = document.querySelector('.digest-point').textContent;
              document.querySelector('[data-digest=settings]').click();
              return text;
            });
            if (point !== null) {
              await page.waitForTimeout(4500);
              assert.equal(
                await page.locator('canvas').getAttribute('data-digest-mode'),
                'secretion',
              );
              assert.equal(await page.locator('.digest-point').textContent(), point);
              const fixed = await page.locator('canvas').getAttribute('data-camera');
              await page.waitForTimeout(700);
              assert.equal(await page.locator('canvas').getAttribute('data-camera'), fixed);
              await page.locator('[data-digest=settings-close]').click();
              wrong.add('reading-pace');
            }
          }
          if (s.sequence) {
            assert.equal(await page.locator('[data-digest=skip],[data-digest=replay]').count(), 0);
            await changed(s);
            continue;
          }
          if (s.retry) {
            await page.locator('[data-digest=retry]').click();
            continue;
          }
          if (s.entry) {
            assert.equal(await page.locator('[data-entry]').count(), 2);
            if (id === 'stanley' && !wrong.has('entry')) {
              await page.locator('[data-entry]').filter({ hasText: 'Cavitas nasi' }).click();
              await page.getByText('Forkert indgang!', { exact: false }).waitFor();
              wrong.add('entry');
            }
            await page.locator('[data-entry]').filter({ hasText: 'Cavitas oris' }).click();
            await changed(s);
            continue;
          }
          if (!s.choices) {
            await page.waitForTimeout(50);
            continue;
          }
          const stage = ROUTE.find((r) => r.id === s.stage),
            task = BOSSES[id][s.stage]?.find((q) => q.prompt === s.heading);
          assert.equal(s.choices, task ? 3 : 2);
          if (!task) assert.equal(s.heading, 'Hvad er næste anatomiske struktur?');
          assert.equal(
            await page.locator('.digest-map svg').getAttribute('data-map-location'),
            s.stage,
          );
          assert.equal(
            await page.locator('.blood-progress').getAttribute('aria-valuenow'),
            String(stage.index + 1),
          );
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          if (!task && ['epiglottis', 'caecum'].includes(s.stage) && !wrong.has(s.stage)) {
            const opts = await import('../public/digestion-navigation.js');
            const incorrect = opts.anatomicalOptions(stage.index).find((o) => !o.correct);
            await page.locator('[data-choice]').filter({ hasText: incorrect.label }).click();
            await page.waitForFunction(
              () =>
                document.querySelector('[data-digest=retry]') ||
                (document.querySelector('.digest-feedback') &&
                  document.querySelector('[data-choice]:enabled')),
            );
            if (await page.locator('[data-digest=retry]').count())
              await page.locator('[data-digest=retry]').click();
            wrong.add(s.stage);
            continue;
          }
          if (!task && s.stage === 'pharynx') {
            await page.waitForFunction(() =>
              JSON.parse(document.querySelector('canvas').dataset.targets || '[]').some(
                (t) => t.target === 'epiglottis' && t.visible,
              ),
            );
            const targets = JSON.parse(await page.locator('canvas').getAttribute('data-targets'));
            assert.equal(
              targets.filter((t) => t.target === 'epiglottis').length,
              1,
              'one solid epiglottis target, not a ring and lumen',
            );
          }
          if (!task && s.stage === 'epiglottis')
            await page.screenshot({
              path: `/tmp/digest-v4-epiglottis-${mobile ? 'mobile' : 'desktop'}.png`,
            });
          if (task && id === 'stanley' && s.stage === 'mouth' && !wrong.has('layout')) {
            const box = await page.locator('.digest-panel').boundingBox();
            assert.ok(mobile || box.height <= 160);
            assert.ok(box.y > 500);
            const point = await page.locator('.digest-point').textContent();
            assert.ok(point.split(/\s+/).length <= 20);
            await page.waitForTimeout(800);
            assert.equal(await page.locator('.digest-point').textContent(), point);
            assert.equal(
              await page
                .locator(
                  '[data-digest=learning-info],[data-digest=learning-log],[data-digest=clinical],.digest-reader,[data-setting=quality]',
                )
                .count(),
              0,
            );
            wrong.add('layout');
          }
          if (task && id === 'stanley' && s.stage === 'mouth' && !wrong.has('camera')) {
            await page.locator('[data-digest=settings]').click();
            await page.locator('[data-setting=motion]').check();
            assert.equal(await page.locator('canvas').evaluate((e) => e.inert), true);
            await page.locator('[data-digest=settings-close]').click();
            await page.waitForTimeout(1400);
            const before = await page.locator('canvas').getAttribute('data-camera');
            await page.waitForTimeout(1500);
            assert.equal(
              await page.locator('canvas').getAttribute('data-camera'),
              before,
              'waiting camera remains fixed with motion enabled',
            );
            await page.locator('[data-digest=settings]').click();
            await page.locator('[data-digest=pause]').click();
            await page.locator('[data-digest=settings-close]').click();
            assert.equal(await page.locator('.digest-panel').evaluate((e) => e.inert), true);
            await page.locator('[data-digest=settings]').click();
            await page.locator('[data-digest=pause]').click();
            await page.locator('[data-setting=motion]').uncheck();
            await page.locator('[data-digest=settings-close]').click();
            wrong.add('camera');
          }
          if (task && id === 'stanley' && s.stage === 'mouth' && !wrong.has('enzyme')) {
            await page.locator('[data-choice]').filter({ hasText: 'Pepsin' }).click();
            await page.waitForFunction(
              () =>
                document.querySelector('[data-digest=retry]') ||
                (document.querySelector('.digest-feedback') &&
                  document.querySelector('[data-choice]:enabled')),
            );
            wrong.add('enzyme');
            // Entry error may exhaust the second life: exercise retry as well.
            if (await page.locator('[data-digest=retry]').count())
              await page.locator('[data-digest=retry]').click();
            continue;
          }
          const correct =
            task?.options[0] ||
            ROUTE[stage.index + 1].danish + ' · ' + ROUTE[stage.index + 1].latin;
          const b = page.locator('[data-choice]').filter({ hasText: correct });
          await b.focus();
          await page.keyboard.press('Enter');
          await changed(s);
        }
        assert.ok(complete, 'journey completes');
        assert.deepEqual(
          visited,
          ROUTE.map((s) => s.id),
        );
        assert.ok(absorbed);
        const expected = {
          stanley: ['polysaccharide', 'short-chain', 'maltose', 'glucose', 'residue'],
          trine: ['triglyceride', 'lipid-products', 'residue'],
          poul: ['protein', 'peptide', 'small-peptide', 'amino-acid', 'residue'],
        }[id];
        for (const form of expected) assert.ok(forms.has(form), 'visible product ' + form);
        await page.locator('[data-digest=exam]').click();
        for (let i = 0; i < 5; i++) {
          const prompt = await page.locator('.digest-exam-question').textContent();
          const question = QUESTION_POOLS[id].find((q) => q.prompt === prompt);
          assert.ok(question);
          await page.locator('[data-exam-answer="0"]').click();
          await page.locator('[data-digest=exam-next]').waitFor();
          assert.equal(await page.locator('.digest-explanation').textContent(), question.why);
          await page.locator('[data-digest=exam-next]').click();
          await page.waitForFunction(
            (i) =>
              document
                .querySelector('.digest-panel h2')
                ?.textContent.includes(i === 4 ? 'Testresultat' : `${i + 2}/5`),
            i,
          );
        }
        assert.match(await page.locator('.digest-panel h2').textContent(), /5 af 5/);
        await page.locator('.digest-panel [data-digest=menu]').click();
        await page.locator('[data-character=stanley]').waitFor();
      }
      assert.match(await page.locator('.digest-panel').textContent(), /FORDØJELSESMESTER/);
      await page.locator('[data-exam-character=stanley]').click();
      for (const a of [1, 0, 2, 0, 0]) {
        await page.locator(`[data-exam-answer="${a}"]`).click();
        await page.locator('[data-digest=exam-next]').waitFor();
        await page.locator('[data-digest=exam-next]').click();
      }
      await page.getByRole('heading', { name: 'Testresultat: 3 af 5' }).waitFor();
      await page.locator('.digest-panel [data-review-character]').click();
      for (let i = 0; i < 2; i++) {
        await page.locator('[data-exam-answer="0"]').click();
        await page.locator('[data-digest=exam-next]').waitFor();
        await page.locator('[data-digest=exam-next]').click();
      }
      await page.getByRole('heading', { name: 'Repetition afsluttet' }).waitFor();
      await page.locator('.digest-panel [data-digest=menu]').click();
      await page.locator('[data-character=stanley]').waitFor();
      assert.match(await page.locator('.digest-panel').textContent(), /seneste test: 3\/5/);
      await page.reload();
      await page.locator('[data-character="stanley"] b').waitFor();

      await page.evaluate(
        () =>
          new Promise((resolve, reject) => {
            const q = indexedDB.open('laeringsstier-v2');
            q.onerror = () => reject(q.error);
            q.onsuccess = () => {
              const db = q.result,
                tx = db.transaction('records', 'readwrite'),
                store = tx.objectStore('records'),
                r = store.get('progress');
              r.onsuccess = () => {
                const all = r.result,
                  d = all['fordoejelsens-vilde-rejse'].digestion;
                d.active = {
                  ...d.results.stanley,
                  index: 7,
                  phase: 'route',
                  task: 0,
                  absorbed: false,
                };
                delete d.active.routeVersion;
                store.put(all, 'progress');
              };
              tx.oncomplete = () => {
                db.close();
                resolve();
              };
              tx.onerror = () => reject(tx.error);
            };
          }),
      );
      await page.reload();
      await page.locator('[data-digest=resume]').click();
      await page.waitForFunction(
        () =>
          document.querySelector('.digest-panel h2')?.textContent ===
          'Hvilket enzym spalter maltose?',
      );
      assert.equal(await page.locator('canvas').getAttribute('data-molecular-form'), 'maltose');
      assert.match(await page.locator('.digest-hud').textContent(), /Tomtarmen/);
      assert.match(await page.locator('.digest-point').textContent(), /glukose/);
      await page.waitForFunction(
        () => document.querySelector('.digest-save')?.textContent === 'Gemt',
      );
      await page.reload();
      await page.locator('[data-digest=resume]').click();
      await page.waitForFunction(
        () =>
          document.querySelector('.digest-panel h2')?.textContent ===
          'Hvilket enzym spalter maltose?',
      );
      for (const v of [
        { width: 320, height: 844 },
        { width: 768, height: 1024 },
      ]) {
        await page.setViewportSize(v);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      }
      await page.getByRole('link', { name: '← Tilbage til læringsstier' }).click();
      await page.locator('#digestion-root').waitFor({ state: 'detached' });
      assert.equal(await page.locator('#digestion-root').count(), 0);
      await page.close();
    }
    const fallback = await browser.newPage();
    await fallback.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return type === 'webgl2' ? null : original.call(this, type, ...args);
      };
    });
    await fallback.goto(base + '#/sti/fordoejelsens-vilde-rejse/digestion-stanley');
    await fallback.getByRole('heading', { name: '3D kunne ikke vises' }).waitFor();
    await fallback.close();
    assert.deepEqual(errors, []);
    console.log(
      'PASS digestion: all three nutrient journeys on each selected device, 15 stops, three biochemical answers/two anatomical answers, staged molecules, absorption in the unchanged lumen camera, persistent molecule-specific learning, compact UI, button-only choices, exam feedback/review, residue, stable camera on mobile/desktop, retries, settings, trophies, exams and WebGL fallback',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
