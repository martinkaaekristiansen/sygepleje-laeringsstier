const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const base = process.env.APP_URL || 'http://127.0.0.1:3001/sygepleje-laeringsstier/';
(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const errors = [],
    missing = [];
  try {
    for (const mobile of [false, true])
      for (const game of ['blood', 'digestion', 'oxygen']) {
        const context = await browser.newContext({
          viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
          isMobile: mobile,
          hasTouch: mobile,
        });
        const p = await context.newPage();
        p.setDefaultTimeout(90000);
        p.on('pageerror', (e) => errors.push(e.message));
        p.on('console', (m) => {
          if (m.type() === 'error') errors.push(m.text());
        });
        p.on('response', (r) => {
          if (r.status() >= 400) missing.push({ url: r.url(), status: r.status() });
        });
        const route = {
          blood: 'blodcellens-rejse/blood-easy',
          digestion: 'fordoejelsens-vilde-rejse/digestion-stanley',
          oxygen: 'iltens-rejse/oxygen-easy',
        }[game];
        await p.goto(base + '#/sti/' + route);
        const script = await p.locator('script[type=module]').getAttribute('src');
        assert.match(script, /^\.\/assets\/[a-f\d]{12}\/app\.js$/);
        if (game === 'blood') {
          await p.locator('[data-blood=start]:enabled').click();
          await p.locator('[data-passage]:enabled').first().waitFor();
        } else if (game === 'digestion') {
          await p.locator('[data-digest=start]:enabled').click();
          await p.locator('[data-entry]').filter({ hasText: 'Cavitas oris' }).click();
          await p.locator('[data-choice]:enabled').first().waitFor();
        } else {
          await p.locator('[data-oxygen=start]:enabled').click();
          await p
            .locator('[data-oxygen-choice]')
            .filter({ hasText: /Næsehulen|Cavitas nasi/i })
            .click();
          await p.waitForFunction(
            () => document.querySelector('canvas').dataset.oxygenStage === 'nose',
          );
          await p.locator('[data-oxygen=menu]').click();
          await p.reload();
          await p.locator('[data-oxygen=resume]:enabled').click();
          await p.waitForFunction(() => document.querySelector('.oxygen-loading').hidden);
        }
        assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        assert(await p.locator('canvas').isVisible());
        assert.deepEqual(errors, []);
        assert.deepEqual(missing, []);
        console.log('PASS smoke games', game, mobile ? 'mobile' : 'desktop');
        await context.close();
      }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
