const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const base = process.env.APP_URL || 'http://127.0.0.1:3001/sygepleje-laeringsstier/';
(async () => {
  const { pharmacologyPath: path } = await import('../public/pharmacology.js');
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 812 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base);
    await page.locator('.continue-section').waitFor();
    await page.locator('[data-semester="3"]').click();
    await page.locator('.path-card [data-open]').click();
    await page.locator('#lesson-heading').waitFor();
    const q = path.steps[0].questions[0];
    await page.locator(`[data-answer="0:${(q.correct + 1) % q.a.length}"]`).click();
    await page.locator('#feedback-0').waitFor();
    await page.locator('.step-navigation summary').click();
    await page.locator('[data-step="1"]').click();
    await page.waitForFunction(
      (title) => document.querySelector('#lesson-heading')?.textContent === title,
      path.steps[1].title,
    );
    await page.locator('[data-action="home"]').click();
    await page.locator('.continue-card').waitFor();
    assert.match(await page.locator('.continue-step').textContent(), /trin 2/);
    await page.locator('[data-resume]').click();
    await page.locator('#lesson-heading').waitFor();
    assert.equal(await page.locator('#lesson-heading').textContent(), path.steps[1].title);
    await page.locator('[data-action="home"]').click();
    await page.locator('.review-list a').click();
    await page.locator('#lesson-heading').waitFor();
    assert.equal(await page.locator('#lesson-heading').textContent(), path.steps[0].title);
    await page.locator(`[data-answer="0:${q.correct}"]`).click();
    await page.locator('.answer-correct').waitFor();
    await page.locator('[data-action="home"]').click();
    await page.locator('.review-section').waitFor();
    assert.equal(await page.locator('.review-list').count(), 0);
    await page.locator('.semesters [data-semester="2"]').click();
    assert.equal(await page.locator('.available-semesters button').count(), 3);
    await page.locator('.available-semesters [data-semester="5"]').click();
    assert.equal(await page.locator('.path-card').count(), 1);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('.content-status summary').click();
    assert.match(
      await page.locator('.content-status').textContent(),
      /afventer manuel faglig godkendelse/,
    );
    await page.screenshot({ path: '/tmp/review-mobile.png', fullPage: true });
    await page.goto(base + '#/sti/find-vej-kredsloeb/circulation-context/hard');
    await page.locator('[data-level]').waitFor();
    assert.equal(await page.locator('[data-level]').inputValue(), 'hard');
    await page.reload();
    await page.locator('[data-level]').waitFor();
    assert.equal(await page.locator('[data-level]').inputValue(), 'hard');
    await page.locator('[data-level]').selectOption('easy');
    await page.reload();
    await page.locator('[data-level]').waitFor();
    assert.equal(await page.locator('[data-level]').inputValue(), 'easy');
    const fallback = await browser.newPage();
    await fallback.addInitScript(() => {
      const get = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return type === 'webgl2' ? null : get.call(this, type, ...args);
      };
    });
    await fallback.goto(base + '#/sti/blodcellens-rejse/blood-easy');
    await fallback.getByRole('link', { name: 'Øv kredsløbet uden 3D' }).click();
    await fallback.locator('[data-level]').waitFor();
    assert.equal(await fallback.locator('[data-level]').inputValue(), 'easy');
    assert.deepEqual(errors, []);
    console.log(
      'PASS: continue versus repetition, corrected answers, difficulty deep links, empty semesters, clinical status, 320px layout and no-WebGL alternative',
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
