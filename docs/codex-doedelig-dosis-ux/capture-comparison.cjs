const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..'),
  mode = process.env.UX_CAPTURE || 'before',
  out = path.join(__dirname, mode),
  key = 'doedelig-dosis:v1:sag-001';
const saves = JSON.parse(
  fs.readFileSync(path.join(root, 'test/fixtures/dose-ux/legacy-saves.json')),
);
(async () => {
  const { startStaticServer } = await import(path.join(root, 'scripts/static-server.js'));
  const server = await startStaticServer({
    root: path.join(
      mode === 'before'
        ? process.env.DOSE_BASELINE || path.resolve(root, '../doedelig-dosis')
        : root,
      'dist',
    ),
    prefix: '/sygepleje-laeringsstier/',
  });
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const metrics = [];
  fs.mkdirSync(out, { recursive: true });
  try {
    for (const [width, height] of [
      [1280, 800],
      [390, 844],
    ]) {
      const context = await browser.newContext({ viewport: { width, height } }),
        p = await context.newPage();
      const click = async (a, v) => {
        const selector = `[data-dose="${a}"]${v === undefined ? '' : `[data-value="${v}"]`}`;
        let b = p.locator(selector).filter({ visible: true }).first();
        if (
          (await p.locator('dialog[open]').count()) &&
          (!(await b.count()) || !(await b.evaluate((el) => !!el.closest('dialog'))))
        )
          await p.locator('[data-dose=close-panel]').click();
        b = p.locator(selector).filter({ visible: true }).first();
        if (!(await b.count())) await p.locator('[data-dose=menu]').click();
        await p.locator(selector).filter({ visible: true }).first().click();
      };
      async function open(saved) {
        await p.goto(server.url);
        await p.locator('.continue-section').waitFor();
        await p.evaluate(
          ({ key, s }) =>
            s ? localStorage.setItem(key, JSON.stringify(s)) : localStorage.removeItem(key),
          { key, s: saved },
        );
        await p.goto(server.url + '#/sti/doedelig-dosis/sagsmapper');
        await p.locator('.dose-folder').waitFor();
        await p.waitForFunction(() =>
          [...document.styleSheets].some((s) => s.href?.endsWith('/dose.css')),
        );
        if (saved) {
          await click('start', 'sag-001');
          await p.locator('.dose-documents,.dose-score').first().waitFor();
        }
      }
      async function shot(name) {
        await p.evaluate(() => scrollTo(0, 0));
        await p.waitForTimeout(40);
        await p.evaluate(() =>
          Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))),
        );
        await p.screenshot({ path: path.join(out, name + '-' + width + '.png'), fullPage: true });
      }
      await open(null);
      await shot('01-sagsmapper');
      await click('start', 'sag-001');
      await p.locator('.dose-documents').waitFor();
      await shot('02-indledning');
      metrics.push({
        viewport: [width, height],
        task: 'Primær navigation ved start',
        visiblePrimary: await p.locator('.dose-tools button:visible').count(),
        documentHeight: await p.evaluate(() => document.documentElement.scrollHeight),
      });
      await click('visit', 'wife');
      await shot('03-interview');
      await open(saves.rich);
      for (const [name, id] of [
        ['04-journal', 'nursing'],
        ['05-blodproever', 'labs'],
        ['06-administration', 'administration'],
      ]) {
        if (mode === 'before') {
          await click('archive');
          await click('visit', id);
        } else {
          await click('archive');
          await click('preview', id);
        }
        await shot(name);
      }
      await click('scene');
      await shot('07-naeste-handling');
      const beforeScroll = await p.evaluate(() => scrollY);
      if (mode === 'before')
        await p
          .getByRole('heading', { name: 'Hvad vil du undersøge nu?' })
          .scrollIntoViewIfNeeded();
      else await click('next');
      metrics.push({
        viewport: [width, height],
        task: 'Næste handling fra dokumentstart',
        requiredClicks: mode === 'before' ? 0 : 1,
        scrollPixels: Math.abs((await p.evaluate(() => scrollY)) - beforeScroll),
      });
      if (mode !== 'before') await click('close-panel');
      await click('notebook');
      await shot('08-notesbog');
      metrics.push({
        viewport: [width, height],
        task: 'Notesbog med tre noter',
        visibleEditors: await p
          .locator('.dose-notes textarea:visible,.dose-notes select:visible')
          .count(),
        requiredFields: await p.locator('form[data-form=note] :required:visible').count(),
        documentHeight: await p.evaluate(() => document.documentElement.scrollHeight),
      });
      await click('board');
      await shot('09-sporetavle');
      metrics.push({
        viewport: [width, height],
        task: 'Forbindelse mellem to noter',
        requiredFields: await p.locator('form[data-form=link] :required:visible').count(),
      });
      await click('archive');
      await shot('10-sagsarkiv');
      await click('hypothesis');
      await shot('11-hypotese');
      await click('hints');
      await click('hint', '1');
      await shot('12-hjaelp');
      await click('report');
      await shot('13-afslutning');
      metrics.push({
        viewport: [width, height],
        task: 'Start af afslutning',
        visibleFreeFields: await p.locator('form[data-form=free-report] textarea:visible').count(),
        documentHeight: await p.evaluate(() => document.documentElement.scrollHeight),
      });
      await open(saves.complete);
      if (mode !== 'before') await click('result-section', 'reconstruction');
      await shot('14-rekonstruktion');
      await click('uth');
      await shot('15-uth');
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
  fs.writeFileSync(
    path.join(__dirname, mode + '-metrics.json'),
    JSON.stringify(metrics, null, 2) + '\n',
  );
  console.log(mode + ': 30 real screenshots and measured controls/scroll/forms.');
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
