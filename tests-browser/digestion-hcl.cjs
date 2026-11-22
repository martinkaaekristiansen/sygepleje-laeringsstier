const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
const { seed, saved } = require('./digestion-fixtures.cjs');
const base = process.env.APP_URL || 'http://127.0.0.1:3001/sygepleje-laeringsstier/';
const output =
  process.env.ANATOMY_OUTPUT ||
  path.resolve('docs/codex-fordoejelse/anatomi-enzymer-hcl-mikrobiota');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const results = [],
    errors = [],
    layouts = [];
  try {
    for (const mobile of [false, true]) {
      const size = mobile ? 'mobil' : 'desktop',
        page = await browser.newPage({
          viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
          isMobile: mobile,
          hasTouch: mobile,
        });
      page.setDefaultTimeout(120000);
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      // Drive the real pause controls in one browser turn. Separate pointer
      // round-trips can overrun a short sequence on software-rendered runners.
      async function setPaused(value) {
        await page.evaluate((value) => {
          document.querySelector('[data-digest=settings]').click();
          const button = document.querySelector('[data-digest=pause]');
          if ((button.getAttribute('aria-pressed') === 'true') !== value) button.click();
          document.querySelector('[data-digest=settings-close]').click();
        }, value);
      }
      async function choosePaused(text) {
        await page.waitForFunction(
          (text) =>
            [...document.querySelectorAll('[data-choice]')].some(
              (button) => button.textContent.includes(text) && !button.disabled,
            ),
          text,
        );
        await page
          .locator('[data-choice]')
          .filter({ hasText: text })
          .evaluate((button) => {
            button.click();
            document.querySelector('[data-digest=settings]').click();
            document.querySelector('[data-digest=pause]').click();
            document.querySelector('[data-digest=settings-close]').click();
          });
      }
      async function pauseAt(mode, age) {
        await page.waitForFunction(
          ({ mode, age }) => {
            const canvas = document.querySelector('canvas');
            if (canvas.dataset.digestMode !== mode || +canvas.dataset.sceneAge < age) return false;
            // setScene publishes the new mode before the first rendered diagnostic.
            // Wait for the actual intermediate protein pose, not stale prior age.
            const protein = JSON.parse(canvas.dataset.proteinState || 'null');
            if (mode === 'denaturation' && !(protein?.denaturation > 0 && protein.denaturation < 1))
              return false;
            if (mode === 'reaction' && !(protein?.visibleLinks > 0 && protein.visibleLinks < 11))
              return false;
            document.querySelector('[data-digest=settings]').click();
            document.querySelector('[data-digest=pause]').click();
            document.querySelector('[data-digest=settings-close]').click();
            return true;
          },
          { mode, age },
          { polling: 20 },
        );
      }
      async function checkLayouts(question) {
        if (mobile) return;
        for (const [width, height] of [
          [1280, 800],
          [1024, 768],
          [768, 1024],
          [390, 844],
          [375, 667],
          [320, 568],
          [568, 320],
          [667, 375],
          [844, 390],
        ]) {
          await page.setViewportSize({ width, height });
          await page.waitForFunction(
            () =>
              Math.abs(
                document.querySelector('#digestion-root').getBoundingClientRect().height -
                  innerHeight,
              ) < 1,
          );
          await page.waitForTimeout(250);
          const layout = await page.evaluate(() => {
            const panel = document.querySelector('.digest-panel').getBoundingClientRect(),
              info = document.querySelector('.digest-learning').getBoundingClientRect(),
              buttons = [...document.querySelectorAll('[data-choice]')].map((b) =>
                b.getBoundingClientRect(),
              );
            return {
              separated: info.bottom <= panel.top,
              inside: panel.left >= 0 && panel.right <= innerWidth && panel.bottom <= innerHeight,
              noOverflow: document.documentElement.scrollWidth <= innerWidth,
              touch: buttons.every((b) => b.height >= 44),
            };
          });
          assert(
            layout.separated && layout.inside && layout.noOverflow && layout.touch,
            question + ' ' + width + 'x' + height + ' ' + JSON.stringify(layout),
          );
          layouts.push({ question, width, height, ...layout });
        }
        await page.setViewportSize({ width: 1280, height: 800 });
      }
      await seed(page, base, {
        character: 'poul',
        index: 4,
        phase: 'boss',
        mode: 'boss',
        extra: { product: 'protein' },
      });
      assert.match(await page.locator('.digest-panel h2').textContent(), /parietalcellerne/);
      await page.locator('[data-choice]').filter({ hasText: 'Galde' }).click();
      await choosePaused('Saltsyre (HCl)');
      await page.waitForFunction(
        () =>
          document.querySelector('canvas').dataset.digestMode === 'hcl' &&
          JSON.parse(document.querySelector('canvas').dataset.acidState || 'null'),
      );
      let acid;
      async function pauseResume(mode, inspect = async () => {}) {
        await setPaused(true);
        assert.equal(
          await page.locator('canvas').getAttribute('data-digest-mode'),
          mode,
          'pause before the sequence finishes',
        );
        await page.waitForFunction(
          () => document.querySelector('.digest-save').textContent === 'Gemt',
        );
        const checkpoint = (await saved(page)).digestion.active;
        console.log(
          'CHECKPOINT',
          size,
          mode,
          checkpoint.phase,
          checkpoint.secretionKind,
          checkpoint.animation?.age,
        );
        await inspect();
        const age = +(await page.locator('canvas').getAttribute('data-scene-age'));
        await page.waitForTimeout(350);
        assert(
          Math.abs(+(await page.locator('canvas').getAttribute('data-scene-age')) - age) < 0.05,
        );
        await page.reload();
        await page.locator('[data-digest=resume]').evaluate((button) => {
          button.click();
          document.querySelector('[data-digest=settings]').click();
          document.querySelector('[data-digest=pause]').click();
          document.querySelector('[data-digest=settings-close]').click();
        });
        await page.waitForFunction(
          (mode) => document.querySelector('canvas').dataset.digestMode === mode,
          mode,
        );
        assert.equal((await saved(page)).digestion.active.enzyme, checkpoint.enzyme);
        await setPaused(false);
        return checkpoint;
      }
      await pauseResume('hcl', async () => {
        acid = await page.locator('canvas').evaluate((c) => JSON.parse(c.dataset.acidState));
        assert.equal(acid.enzyme, false);
        assert.equal(
          await page.locator('canvas').getAttribute('data-secretion-enzyme-visible'),
          'false',
        );
        assert.deepEqual(acid.ions, ['H⁺', 'Cl⁻']);
        assert.equal(
          await page.locator('.digest-explanation').textContent(),
          'Parietalcellerne udskiller saltsyre (HCl), som bidrager til mavesækkens lave pH.',
        );
        await page.screenshot({ path: path.join(output, 'hcl-sekretion-' + size + '.png') });
      });
      await page.waitForFunction(
        () => document.querySelector('canvas').dataset.digestMode === 'boss',
      );
      assert.match(await page.locator('.digest-panel h2').textContent(), /saltsyre/);
      await checkLayouts('denaturation');
      const folded = await page
        .locator('canvas')
        .evaluate((c) => JSON.parse(c.dataset.proteinState));
      assert.equal(folded.visibleLinks, 11);
      await page.screenshot({
        path: path.join(output, 'protein-foer-denaturering-' + size + '.png'),
      });
      await page
        .locator('[data-choice]')
        .filter({ hasText: 'De mister en del af deres tredimensionelle struktur' })
        .click();
      await pauseAt('denaturation', 2);
      let during;
      await pauseResume('denaturation', async () => {
        during = await page.locator('canvas').evaluate((c) => JSON.parse(c.dataset.proteinState));
        assert.equal(during.visibleLinks, 11);
        assert.equal(
          await page.locator('canvas').getAttribute('data-secretion-enzyme-visible'),
          'false',
        );
        assert(during.denaturation > 0 && during.denaturation < 1);
        await page.screenshot({
          path: path.join(output, 'protein-under-denaturering-' + size + '.png'),
        });
      });
      await page.waitForFunction(
        () => document.querySelector('canvas').dataset.digestMode === 'boss',
      );
      const unfolded = await page
        .locator('canvas')
        .evaluate((c) => JSON.parse(c.dataset.proteinState));
      assert.equal(unfolded.visibleLinks, 11);
      assert.equal(unfolded.denaturation, 1);
      assert.notDeepEqual(unfolded.positions, folded.positions);
      assert.equal(
        await page.locator('.digest-explanation').textContent(),
        'Saltsyren får proteiner til at miste deres tredimensionelle struktur. Det kaldes denaturering og gør dem lettere tilgængelige for pepsin.',
      );
      await page.screenshot({
        path: path.join(output, 'protein-efter-denaturering-' + size + '.png'),
      });
      const progress = (await saved(page)).digestion.active;
      await checkLayouts('pepsin after denaturation');
      assert.equal(progress.enzyme, 2);
      assert(progress.acidSecreted && progress.proteinDenatured);
      await page.locator('[data-choice]').filter({ hasText: 'Pepsin' }).click();
      await page.waitForFunction(
        () =>
          JSON.parse(document.querySelector('canvas').dataset.selectedEnzyme || 'null')?.id ===
          'pepsin',
      );
      const pepsin = await page
        .locator('canvas')
        .evaluate((c) => JSON.parse(c.dataset.selectedEnzyme));
      await choosePaused('Mavesækken');
      await page.waitForFunction(
        () => document.querySelector('canvas').dataset.digestMode === 'secretion',
      );
      await setPaused(false);
      await page.waitForFunction(
        () => document.querySelector('canvas').dataset.digestMode === 'boss',
      );
      await choosePaused('Spalter peptidbindinger og danner kortere peptider');
      await page.waitForFunction(
        () => document.querySelector('canvas').dataset.digestMode === 'reaction',
      );
      assert.equal(await page.locator('canvas').getAttribute('data-digest-mode'), 'reaction');
      const start = await page
        .locator('canvas')
        .evaluate((c) => JSON.parse(c.dataset.proteinState));
      assert.equal(start.denaturation, 1);
      assert.equal(start.visibleLinks, 11);
      await page.screenshot({
        path: path.join(output, 'pepsin-paa-denatureret-protein-' + size + '.png'),
      });
      await setPaused(false);
      await pauseAt('reaction', 4);
      const end = await page.locator('canvas').evaluate((c) => ({
        protein: JSON.parse(c.dataset.proteinState),
        enzyme: JSON.parse(c.dataset.selectedEnzyme),
      }));
      assert(end.protein.visibleLinks < 11 && end.protein.visibleLinks > 0);
      assert.equal(end.enzyme.instance, pepsin.instance);
      assert(end.enzyme.intact);
      await page.screenshot({ path: path.join(output, 'pepsin-danner-peptider-' + size + '.png') });
      assert.equal(
        await page
          .locator('[data-digest=replay],[data-digest=skip],.digest-perspective-shift')
          .count(),
        0,
      );
      results.push({
        size,
        acid,
        folded,
        during,
        unfolded,
        pepsin,
        end,
        savedWithoutDuplicatePoints: true,
      });
      console.log('PASS HCl / primary chain / denaturation / pepsin / pause and reload', size);
      await page.close();
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(output, 'hcl-checks.json'),
      JSON.stringify({ results, layouts, errors }, null, 2) + '\n',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
