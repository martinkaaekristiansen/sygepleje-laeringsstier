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
      for (const [index, stage] of [
        [2, 'epiglottis'],
        [4, 'stomach'],
        [8, 'caecum'],
        [9, 'ascending'],
      ]) {
        await seed(page, base, {
          character: 'poul',
          index,
          phase: index === 4 ? 'boss' : 'route',
          mode: index === 4 ? 'boss' : 'travel',
          motion: false,
          extra: { product: index > 6 ? 'residue' : 'protein' },
        });
        await page.waitForFunction(() =>
          [...document.querySelectorAll('[data-anatomical-label]')].some(
            (el) => getComputedStyle(el).visibility === 'visible',
          ),
        );
        await page.waitForFunction(() => {
          const labels = [...document.querySelectorAll('[data-anatomical-label]')]
            .filter((e) => getComputedStyle(e).visibility === 'visible')
            .map((e) => e.getBoundingClientRect());
          const ui = [
            ...document.querySelectorAll(
              '.blood-game-bar,.digest-hud,.digest-learning,.digest-map,.digest-panel',
            ),
          ]
            .filter((e) => !e.hidden)
            .map((e) => e.getBoundingClientRect());
          return (
            labels.length &&
            labels.every((l) =>
              ui.every(
                (r) =>
                  !(l.left < r.right && l.right > r.left && l.top < r.bottom && l.bottom > r.top),
              ),
            )
          );
        });
        const labels = await page.evaluate(() => {
          const rect = (e) => {
            const r = e.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          };
          const labels = [...document.querySelectorAll('[data-anatomical-label]')]
            .filter((e) => getComputedStyle(e).visibility === 'visible')
            .map((e) => ({
              text: e.textContent,
              fontSize: parseFloat(getComputedStyle(e).fontSize),
              ...rect(e),
            }));
          const ui = [
            ...document.querySelectorAll(
              '.blood-game-bar,.digest-hud,.digest-learning,.digest-map,.digest-panel',
            ),
          ]
            .filter((e) => !e.hidden)
            .map(rect);
          return { labels, ui, width: innerWidth, height: innerHeight };
        });
        const overlap = (a, b) =>
          a.x < b.x + b.width &&
          a.x + a.width > b.x &&
          a.y < b.y + b.height &&
          a.y + a.height > b.y;
        for (let i = 0; i < labels.labels.length; i++) {
          const l = labels.labels[i];
          assert(l.fontSize >= 18 && l.fontSize <= 20);
          assert(
            l.x >= 0 &&
              l.y >= 0 &&
              l.x + l.width <= labels.width &&
              l.y + l.height <= labels.height,
          );
          assert(!labels.ui.some((r) => overlap(l, r)));
          assert(!labels.labels.slice(i + 1).some((r) => overlap(l, r)));
        }
        assert.equal(
          await page
            .locator('.digest-anatomy-labels')
            .evaluate((e) => getComputedStyle(e).pointerEvents),
          'none',
        );
        const size = mobile ? 'mobil' : 'desktop';
        await page.screenshot({ path: path.join(output, `labels-${stage}-${size}.png`) });
        const before = JSON.parse(await page.locator('canvas').getAttribute('data-look'));
        await page.mouse.move(mobile ? 220 : 950, mobile ? 480 : 450);
        await page.mouse.down();
        await page.mouse.move(mobile ? 300 : 1100, mobile ? 510 : 490, { steps: 5 });
        await page.mouse.up();
        await page.waitForFunction(
          (yaw) => JSON.parse(document.querySelector('canvas').dataset.look).yaw !== yaw,
          before.yaw,
        );
        const camera = JSON.parse(await page.locator('canvas').getAttribute('data-camera'));
        assert(Math.abs(camera.rollDegrees) < 1e-6);
        assert(camera.up[1] > 0);
        results.push({ stage, size, ...labels, manualLookUpright: true });
        console.log(
          'PASS anatomical labels',
          stage,
          size,
          labels.labels.map((l) => l.text).join(' / '),
        );
      }
      await page.close();
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(output, 'label-checks.json'),
      JSON.stringify({ results, errors }, null, 2) + '\n',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
