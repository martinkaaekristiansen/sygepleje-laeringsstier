const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'),
  assert = require('node:assert/strict');
const { base, launch, seed, state, saved } = require('./oxygen-fixtures.cjs');
(async () => {
  const browser = await chromium.launch(launch),
    errors = [],
    checks = [];
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(120000);
    page.on('pageerror', (e) => errors.push(e.message));
    for (const [width, height] of [
      [320, 568],
      [375, 667],
      [390, 844],
      [768, 1024],
      [844, 390],
      [1024, 768],
      [1280, 800],
      [568, 320],
      [667, 375],
    ]) {
      await page.setViewportSize({ width, height });
      for (const stage of ['pharynx', 'hb-binding', 'co2-diffusion']) {
        await seed(page, { stage });
        await page.waitForTimeout(300);
        const r = await page.evaluate(() => {
          const q = (s) => {
            const e = document.querySelector(s),
              r = e.getBoundingClientRect();
            return {
              hidden: e.hidden,
              x: r.x,
              y: r.y,
              right: r.right,
              bottom: r.bottom,
              width: r.width,
              height: r.height,
              scroll: e.scrollHeight > e.clientHeight + 1,
            };
          };
          return {
            info: q('.digest-learning'),
            panel: q('.digest-panel'),
            heading: q('.digest-panel h2'),
            panelScrollTop: document.querySelector('.digest-panel').scrollTop,
            toolbar: q('.blood-game-bar'),
            bodyWidth: document.documentElement.scrollWidth,
            buttons: [...document.querySelectorAll('[data-oxygen-choice]')].map((b) => {
              const r = b.getBoundingClientRect();
              return { height: r.height, width: r.width, y: r.y, bottom: r.bottom };
            }),
          };
        });
        assert(
          r.info.bottom + 5 <= r.panel.y || r.panel.right <= r.info.x || r.info.right <= r.panel.x,
          JSON.stringify({ width, height, stage, r }),
        );
        assert(r.panel.y >= r.toolbar.bottom);
        assert.equal(r.panelScrollTop, 0, 'new question starts at the top');
        assert(
          r.heading.y >= r.panel.y && r.heading.bottom <= r.panel.bottom,
          'question visible initially',
        );
        if (height <= 500 && width >= 500)
          assert(
            r.buttons.every((b) => Math.abs(b.y - r.buttons[0].y) < 1),
            'landscape choices share a row',
          );
        if (height <= 500 && width >= 500)
          assert(
            r.buttons.every((b) => b.y >= r.panel.y && b.bottom <= r.panel.bottom),
            'whole landscape answer buttons visible: ' +
              JSON.stringify({ width, height, stage, r }),
          );
        assert(r.panel.bottom <= height);
        assert(r.bodyWidth <= width);
        assert(r.buttons.every((b) => b.height >= 43.9 && b.width >= 44));
        if (stage === 'pharynx') {
          const before = await saved(page);
          await page.mouse.click(width / 2, (r.info.bottom + r.panel.y) / 2);
          assert.equal(
            (await saved(page)).oxygenJourney.active.points,
            before.oxygenJourney.active.points,
            'canvas never answers',
          );
        }
        checks.push({ width, height, stage, scroll: r.panel.scroll });
      }
      await page.locator('[data-oxygen=settings]').click();
      assert(await page.locator('#oxygen-settings').isVisible());
      const drawer = await page.locator('#oxygen-settings').boundingBox();
      assert(
        drawer.x >= 0 &&
          drawer.y >= 0 &&
          drawer.x + drawer.width <= width &&
          drawer.y + drawer.height <= height,
      );
      await page.locator('[data-oxygen=settings-close]').click();
      console.log('PASS oxygen layout', width, height);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await seed(page, { stage: 'perspective', age: 2 });
    assert(await page.locator('.oxygen-announcement').isVisible());
    await page.waitForTimeout(3000);
    assert(
      await page.locator('.oxygen-announcement').isVisible(),
      'explicit change readable for 11 logical seconds',
    );
    assert.equal(
      await page.getByRole('button', { name: /Se animationen igen|Fortsæt animation/ }).count(),
      0,
    );
    assert.deepEqual(errors, []);
    require('node:fs').writeFileSync(
      '/tmp/oxygen-layout.json',
      JSON.stringify({ checks, errors }, null, 2),
    );
    console.log('PASS oxygen layouts: 27 questions, 9 viewports, settings and perspective');
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
