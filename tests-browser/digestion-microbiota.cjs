const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
const { seed } = require('./digestion-fixtures.cjs');
const base = process.env.APP_URL || 'http://127.0.0.1:3001/sygepleje-laeringsstier/';
const output =
  process.env.ANATOMY_OUTPUT ||
  path.resolve('docs/codex-fordoejelse/anatomi-enzymer-hcl-mikrobiota');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const errors = [],
    results = [];
  try {
    for (const mobile of [false, true]) {
      const page = await browser.newPage({
        viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
        isMobile: mobile,
        hasTouch: mobile,
      });
      page.setDefaultTimeout(120000);
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      for (const [index, id] of [
        [8, 'caecum'],
        [9, 'ascending'],
        [10, 'transverse'],
        [11, 'descending'],
        [12, 'sigmoid'],
      ]) {
        await seed(page, base, {
          character: 'poul',
          index,
          phase: 'arrival',
          motion: true,
          extra: { product: 'residue' },
        });
        await page.waitForFunction(
          () =>
            JSON.parse(document.querySelector('canvas').dataset.microbiota || '{}').count === 96,
        );
        const before = JSON.parse(await page.locator('canvas').getAttribute('data-microbiota'));
        assert.deepEqual(before.shapes, ['rod', 'coccus', 'curved-rod']);
        assert.equal(before.drawCalls, 3);
        assert(before.normalMicrobiota);
        const text = await page.locator('.digest-explanation').textContent();
        if (index < 12) assert.match(text, /bakterier|mikrobiota|kortkædede/i);
        await page.waitForFunction(
          (time) =>
            JSON.parse(document.querySelector('canvas').dataset.microbiota || '{}').time > time,
          before.time,
        );
        const after = JSON.parse(await page.locator('canvas').getAttribute('data-microbiota'));
        assert(after.time > before.time);
        const size = mobile ? 'mobil' : 'desktop';
        await page.screenshot({ path: path.join(output, `mikrobiota-${id}-${size}.png`) });
        if (index === 8) {
          await page.locator('[data-choice]').filter({ hasText: 'Appendix' }).click();
          const feedback = await page.locator('.digest-explanation').textContent();
          await page.waitForTimeout(600);
          assert.equal(
            await page.locator('.digest-explanation').textContent(),
            feedback,
            'microbiota must not overwrite active anatomical feedback',
          );
        }
        assert.equal(await page.locator('[data-choice]').count(), 2);
        assert.equal(await page.locator('[data-digest=replay],[data-digest=skip]').count(), 0);
        results.push({
          id,
          size,
          ...after,
          information: text,
          automaticProgressionPreserved: true,
        });
        console.log('PASS normal microbiota', id, size);
      }
      await page.close();
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(output, 'microbiota-checks.json'),
      JSON.stringify({ results, errors }, null, 2) + '\n',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
