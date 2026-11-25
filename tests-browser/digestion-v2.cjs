const { devices } = require('./ci-shards.cjs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { seed, saved } = require('./digestion-fixtures.cjs');
async function waitSaved(page, test) {
  for (let i = 0; i < 100; i++) {
    const r = await saved(page);
    if (test(r)) return r;
    await page.waitForTimeout(100);
  }
  throw Error('Latest checkpoint was not committed');
}
const base = process.env.APP_URL || 'http://127.0.0.1:3001/sygepleje-laeringsstier/';
const output = process.env.V2_OUTPUT || path.resolve('docs/codex-fordoejelse/forbedringer-v2');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const errors = [],
    results = [];
  try {
    async function makePage(mobile = false) {
      const p = await browser.newPage({
        viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
        reducedMotion: 'no-preference',
        isMobile: mobile,
        hasTouch: mobile,
      });
      p.setDefaultTimeout(120000);
      p.on('pageerror', (e) => errors.push(e.message));
      p.on('console', (m) => {
        if (m.type() === 'error' && !m.text().includes('Failed to load resource'))
          errors.push(m.text());
      });
      p.on('dialog', (d) => d.accept());
      return p;
    }
    let page = await makePage(),
      writes = null;
    if (process.env.CI_V2_SECTION && !['checkpoints', 'shared'].includes(process.env.CI_V2_SECTION))
      throw Error('Invalid V2 section');
    if (process.env.CI_V2_SECTION !== 'shared')
      for (const mobile of devices()) {
        if (mobile) {
          await page.close();
          page = await makePage(true);
        }
        await page.setViewportSize(
          mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
        );
        for (const [character, index, phase, mode, seconds] of [
          ['stanley', 0, 'entry', 'face-intro', 3],
          ['stanley', 0, 'intro', 'intro', 10],
          ['stanley', 2, 'swallow', 'swallow', 3],
          ['poul', 4, 'reaction', 'reaction', 7],
          ['poul', 4, 'secretion', 'secretion', 4],
          ['trine', 5, 'secretion', 'bile', 12],
          ['stanley', 6, 'secretion', 'brush-border', 4],
          ['poul', 6, 'absorption', 'absorb', 10],
          ['trine', 5, 'micelle', 'micelle', 8],
          ['stanley', 6, 'absorption', 'absorb', 10],
          ['stanley', 14, 'finale', 'finale', 5],
        ]) {
          await seed(page, base, { character, index, phase, mode, motion: true });
          await page.waitForFunction(
            () => Number(document.querySelector('canvas').dataset.sceneAge) >= 0.25,
          );
          assert.ok(await page.locator('.digest-learning').isVisible());
          assert.ok((await page.locator('.digest-point-title').textContent()).length > 0);
          assert.equal(
            await page
              .locator('[data-absorb],.digest-perspective-shift,.digest-compartments')
              .count(),
            0,
          );
          await page.locator('[data-digest=settings]').click();
          await page.locator('[data-digest=pause]').click();
          await page.locator('[data-digest=settings-close]').click();
          await page.waitForFunction(
            () => document.querySelector('.digest-save').textContent === 'Gemt',
          );
          const frozen = Number(await page.locator('canvas').getAttribute('data-scene-age'));
          const before = await waitSaved(
            page,
            (r) => r.digestion.active.animation?.age >= frozen - 0.1,
          );
          if (mode === 'absorb' && !mobile) {
            for (const viewport of [
              { width: 320, height: 568 },
              { width: 375, height: 667 },
              { width: 390, height: 844 },
              { width: 568, height: 320 },
              { width: 667, height: 375 },
              { width: 844, height: 390 },
              { width: 768, height: 1024 },
              { width: 1024, height: 768 },
              { width: 1280, height: 800 },
            ]) {
              await page.setViewportSize(viewport);
              await page.waitForFunction(
                () =>
                  Math.abs(document.querySelector('#digestion-root').clientHeight - innerHeight) <
                  2,
              );
              const layout = await page.locator('.digest-learning').evaluate((card) => {
                const b = card.getBoundingClientRect();
                return {
                  fits:
                    b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight,
                  readable:
                    card.scrollHeight <= card.clientHeight && card.scrollWidth <= card.clientWidth,
                };
              });
              assert.ok(layout.fits && layout.readable, JSON.stringify({ viewport, layout }));
            }
          }
          await page.waitForTimeout(300);
          assert.equal(
            Number(await page.locator('canvas').getAttribute('data-scene-age')),
            frozen,
            'pause freezes animation',
          );
          assert.ok(
            before.digestion.active.animation.age < seconds,
            'checkpoint taken before completion',
          );
          await page.reload();
          await page.locator('[data-digest=resume]').click();
          await page.waitForFunction(
            (mode) => document.querySelector('canvas')?.dataset.digestMode === mode,
            mode,
          );
          assert.ok(
            Number(await page.locator('canvas').getAttribute('data-scene-age')) >=
              before.digestion.active.animation.age - 0.05,
          );
          const readingStarted = performance.now();
          const remainingReading =
            seconds - Number(await page.locator('canvas').getAttribute('data-scene-age'));
          await page.waitForFunction(
            (mode) =>
              document.querySelector('canvas').dataset.digestMode !== mode ||
              !document.querySelector('.digest-panel').hidden,
            mode,
          );
          const after = await waitSaved(page, (r) => r.digestion.active.animation?.mode !== mode);
          assert.equal(
            after.digestion.active.enzyme,
            before.digestion.active.enzyme,
            'resume awards no extra biochemical points',
          );
          assert.equal(
            after.digestion.active.anatomy,
            before.digestion.active.anatomy + (mode === 'swallow' ? 1 : 0),
          );
          if (mode === 'absorb') {
            await page.waitForFunction(
              () => document.querySelector('canvas').dataset.digestMode === 'travel',
            );
            const r = await saved(page);
            assert.equal(r.digestion.active.absorbed, true);
            assert.equal(r.digestion.active.product, 'residue');
          }
          if (mode === 'finale') {
            assert.equal(after.done.filter((x) => x === 'digestion-stanley').length, 1);
            assert.equal(after.digestion.active.phase, 'won');
          }
          results.push({
            mobile,
            character,
            index,
            mode,
            savedAge: before.digestion.active.animation.age,
            resumed: true,
            automatic: true,
          });
          console.log('PASS automatic checkpoint', mobile ? 'mobile' : 'desktop', character, mode);
        }
      }
    if (process.env.CI_V2_SECTION !== 'checkpoints') {
      await page.setViewportSize({ width: 390, height: 844 });
      await seed(page, base, {
        character: 'trine',
        index: 4,
        phase: 'route',
        mode: 'travel',
        motion: true,
      });
      await page.evaluate(() => {
        window.__writes = 0;
        const transaction = IDBDatabase.prototype.transaction;
        IDBDatabase.prototype.transaction = function (stores, mode, ...rest) {
          if (mode === 'readwrite') __writes++;
          return transaction.call(this, stores, mode, ...rest);
        };
      });
      const prompt = await page.locator('.digest-panel h2').textContent();
      await page.waitForTimeout(31000);
      assert.equal(
        await page.locator('.digest-panel h2').textContent(),
        prompt,
        'questions still require an active answer',
      );
      writes = await page.evaluate(() => __writes);
      assert.ok(writes >= 2 && writes <= 3, 'two periodic checkpoints in 31 seconds: ' + writes);
      await page.locator('[data-digest=settings]').click();
      await page.locator('[data-digest=pause]').click();
      await page.locator('[data-digest=settings-close]').click();
      await page.waitForFunction(
        () => document.querySelector('.digest-save').textContent === 'Gemt',
      );
      const loop = await saved(page);
      assert.ok(loop.digestion.active.elapsed >= 30000);
      assert.ok(loop.digestion.active.animation.age >= 30);
      await page.reload();
      await page.locator('[data-digest=resume]').click();
      await page.waitForFunction(
        (age) => Number(document.querySelector('canvas').dataset.sceneAge) >= age,
        loop.digestion.active.animation.age,
      );
      await page.screenshot({ path: path.join(output, 'mave-infoboks-mobil.png') });
      await page.evaluate(() =>
        window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })),
      );
      await page.waitForTimeout(350);
      const hidden = await saved(page);
      await page.waitForTimeout(1000);
      await page.evaluate(() =>
        window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })),
      );
      await page.locator('[data-digest=settings]').click();
      await page.locator('[data-digest=pause]').click();
      const shown = await saved(page);
      assert.ok(
        shown.digestion.active.elapsed - hidden.digestion.active.elapsed < 900,
        'pagehide time is excluded',
      );
      console.log(
        'PASS 15-second checkpoints, immediate pause/pagehide save and resumed gastric phase',
      );
      // A new draft keeps its selected identities through reload, and review uses
      // the original five rather than selecting from the pool again.
      for (const character of ['stanley', 'trine', 'poul']) {
        await seed(page, base, { character, index: 14, phase: 'won', motion: false, exam: 'new' });
        const chosen = (await saved(page)).digestion.assessmentDraft.questionIds;
        await page.locator('[data-exam-answer="1"]').click();
        await page.locator('[data-digest=exam-next]').waitFor();
        const draft = (await saved(page)).digestion.assessmentDraft;
        assert.deepEqual(draft.questionIds, chosen);
        assert.deepEqual(draft.answers, [1]);
        await page.reload();
        await page.locator('[data-digest=exam]').click();
        assert.match(await page.locator('.digest-panel h2').textContent(), /2\/5/);
        for (let i = 1; i < 5; i++) {
          await page.locator('[data-exam-answer="0"]').click();
          await page.locator('[data-digest=exam-next]').click();
        }
        const result = (await saved(page)).digestion.assessments[character].at(-1);
        assert.equal(result.correct, 4);
        assert.deepEqual(result.questionIds, chosen);
        await page.locator('[data-review-character]').click();
        const first = await page.locator('.digest-exam-question').textContent();
        const { QUESTION_POOLS } = await import('../public/digestion-assessment.js');
        assert.equal(first, QUESTION_POOLS[character].find((q) => q.id === chosen[0]).prompt);
        await page.locator('[data-exam-answer="0"]').click();
        await page.locator('[data-digest=exam-next]').waitFor();
        await page.reload();
        await page.locator('[data-digest=review-resume]').click();
        assert.equal(
          (await saved(page)).digestion.reviewDraft.review.correct,
          1,
          'review resume does not award the answer twice',
        );
        await page.locator('[data-digest=exam-next]').click();
        assert.match(
          await page.locator('.digest-panel').textContent(),
          /oprindelige testresultat er bevaret/,
        );
        assert.equal((await saved(page)).digestion.assessments[character].at(-1).correct, 4);
        await page.locator('[data-digest=exam]').click();
        const next = (
          await waitSaved(page, (r) => r.digestion.assessmentDraft?.questionIds?.length === 5)
        ).digestion.assessmentDraft.questionIds;
        assert.notDeepEqual(new Set(next), new Set(chosen));
        console.log('PASS stable assessment draft, score, variation and review', character);
      }
      const { QUESTION_POOLS } = await import('../public/digestion-assessment.js');
      for (const character of ['stanley', 'trine', 'poul']) {
        const longest = [...QUESTION_POOLS[character]]
          .sort(
            (a, b) =>
              b.prompt.length +
              Math.max(...b.options.map((o) => o.length)) -
              (a.prompt.length + Math.max(...a.options.map((o) => o.length))),
          )
          .slice(0, 5);
        await seed(page, base, {
          character,
          index: 14,
          phase: 'won',
          motion: false,
          exam: { character, questionIds: longest.map((q) => q.id), answers: [] },
        });
        const viewports = [
          { width: 320, height: 568 },
          { width: 375, height: 667 },
          { width: 390, height: 844 },
          { width: 568, height: 320 },
          { width: 667, height: 375 },
          { width: 844, height: 390 },
          { width: 768, height: 1024 },
          { width: 1024, height: 768 },
          { width: 1280, height: 800 },
        ];
        for (const v of viewports) {
          await page.setViewportSize(v);
          await page.waitForTimeout(100);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          for (const button of await page.locator('[data-exam-answer]').all()) {
            await button.scrollIntoViewIfNeeded();
            assert.ok(
              await button.evaluate((b) => {
                const r = b.getBoundingClientRect(),
                  p = b.closest('.digest-panel').getBoundingClientRect();
                return Math.min(r.bottom, p.bottom) - Math.max(r.top, p.top) >= 44 && r.width >= 44;
              }),
            );
          }
        }
        await page.locator('[data-exam-answer="0"]').focus();
        await page.keyboard.press('Enter');
        await page.locator('[data-digest=exam-next]').waitFor();
        assert.equal(await page.locator('.digest-explanation').textContent(), longest[0].why);
        for (const v of viewports) {
          await page.setViewportSize(v);
          await page.waitForTimeout(100);
          assert.ok(
            await page.evaluate(
              () =>
                document.querySelector('.digest-learning').getBoundingClientRect().bottom <
                document.querySelector('.digest-panel').getBoundingClientRect().top,
            ),
          );
        }
        console.log('PASS long assessment and feedback layout at nine viewports', character);
      }
      await seed(page, base, {
        character: 'poul',
        index: 14,
        phase: 'won',
        motion: false,
        exam: 'legacy',
      });
      const { QUESTION_POOLS: BASIC_POOL } = await import('../public/digestion-assessment.js');
      assert.equal(
        await page.locator('.digest-exam-question').textContent(),
        BASIC_POOL.poul[0].prompt,
      );
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(output, 'browser-checkpoints.json'),
      JSON.stringify({ results, writesPer31Seconds: writes, errors }, null, 2) + '\n',
    );
    console.log(
      'PASS v2: selected checkpoint/shared coverage, natural animations, pause, lifecycle, gastric loop, varied/legacy assessments and no page/shader errors',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
