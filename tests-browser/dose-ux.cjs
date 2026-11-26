const { chromium } = require('playwright');
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
const { pathToFileURL } = require('node:url');
const base = process.env.APP_URL || 'http://127.0.0.1:3001/sygepleje-laeringsstier/',
  route = '#/sti/doedelig-dosis/sagsmapper',
  key = 'doedelig-dosis:v1:sag-001';
const saves = JSON.parse(fs.readFileSync('test/fixtures/dose-ux/legacy-saves.json'));
const read = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
async function click(p, a, v) {
  let s = `[data-dose="${a}"]${v === undefined ? '' : `[data-value="${v}"]`}`;
  let t = p.locator(s).filter({ visible: true }).first();
  if (
    (await p.locator('dialog[open]').count()) &&
    (!(await t.count()) || !(await t.evaluate((el) => !!el.closest('dialog'))))
  )
    await p.locator('[data-dose=close-panel]').click();
  t = p.locator(s).filter({ visible: true }).first();
  if (!(await t.count())) await p.locator('[data-dose=menu]').click();
  await p.locator(s).filter({ visible: true }).first().click();
}
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const metrics = [];
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      reducedMotion: 'reduce',
    });
    const p = await context.newPage();
    p.setDefaultTimeout(12000);
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    async function open(s) {
      await p.goto(base);
      await p.locator('.continue-section').waitFor();
      await p.evaluate(({ k, s }) => localStorage.setItem(k, JSON.stringify(s)), { k: key, s });
      await p.goto(base + route);
      await p.locator('.dose-folder').waitFor();
      await click(p, 'start', 'sag-001');
      await p
        .locator('[data-clue],.dose-score,[data-form=free-report],[data-form=assessment]')
        .first()
        .waitFor();
      await p.waitForFunction(() =>
        [...document.styleSheets].some((s) => s.href?.endsWith('/dose.css')),
      );
    }
    await open(saves.rich);
    const original = await read(p);
    for (const tab of ['archive', 'notebook', 'board', 'scene']) {
      await click(p, tab);
      const s = await read(p);
      assert.equal(s.scene, original.scene);
      assert.deepEqual(s.found, original.found);
      assert.deepEqual(s.visited, original.visited);
    }
    await p.evaluate(() => scrollTo(0, 350));
    const y = await p.evaluate(() => scrollY);
    await click(p, 'archive');
    await p.locator('#dose-archive-search').fill('Tal med Inger');
    assert.equal(await p.locator('[data-dose=preview]:visible').count(), 1);
    await p.locator('#dose-archive-search').fill('');
    await click(p, 'preview', 'wife');
    assert.match(await p.locator('.dose-preview').textContent(), /Kildevisning/);
    await click(p, 'scene');
    assert(Math.abs((await p.evaluate(() => scrollY)) - y) < 5, 'source returns to active scroll');
    assert.equal((await read(p)).scene, original.scene);
    // Archives do not reveal newly unlocked blocks until an explicit revisit.
    const conditional = structuredClone(saves.rich);
    conditional.found = conditional.found.filter((id) => id !== 'wife-detail');
    await open(conditional);
    await click(p, 'archive');
    await click(p, 'preview', 'wife');
    const displayed = await p
      .locator('[data-clue]')
      .evaluateAll((els) => els.map((el) => el.dataset.clue));
    assert(displayed.every((id) => conditional.found.includes(id)));
    await open(saves.rich);
    await click(p, 'archive');
    await click(p, 'preview', 'labs');
    await click(p, 'visit', 'labs');
    await p.locator('[data-dose=save-row]').first().scrollIntoViewIfNeeded();
    const oldY = await p.evaluate(() => scrollY),
      dom = await p.locator('.dose-documents').evaluate((el) => {
        el.testMarker = 23;
        return 23;
      });
    await click(p, 'save-row', 'other-labs::0');
    assert.equal(await p.locator('.dose-documents').evaluate((el) => el.testMarker), dom);
    assert(Math.abs((await p.evaluate(() => scrollY)) - oldY) < 5, 'saving a source does not jump');
    await click(p, 'save-row', 'other-labs::0');
    assert.equal((await read(p)).notes.filter((n) => n.clue === 'other-labs-row-0').length, 1);
    await click(p, 'next');
    assert(await p.locator('dialog[open]').isVisible());
    await p.keyboard.press('Escape');
    assert.equal(await p.locator('dialog[open]').count(), 0);
    assert.equal(await p.evaluate(() => document.activeElement?.dataset.dose), 'next');
    await click(p, 'notebook');
    assert.equal(await p.locator('.dose-notes textarea:visible').count(), 0);
    const search = p.locator('#dose-search');
    await search.fill('k');
    await search.pressSequentially('reat');
    assert.equal(await search.inputValue(), 'kreat');
    assert(await search.evaluate((el) => el === document.activeElement));
    assert.equal(await search.evaluate((el) => el.selectionStart), 5);
    await search.fill('');
    await p.locator('.dose-note-editor summary').first().click();
    const comment = p.locator('[data-part=comment]:visible').first();
    await comment.fill('Kommentar bevares med fokus');
    assert(await comment.evaluate((el) => el === document.activeElement));
    await click(p, 'board');
    const coords = (await read(p)).notes.map((n) => [n.id, n.x, n.y]);
    const ids = (await read(p)).notes.slice(0, 2).map((n) => n.id);
    await click(p, 'select-note', ids[0]);
    await click(p, 'select-note', ids[1]);
    await click(p, 'connect-selected');
    assert(
      (await read(p)).links.some((l) => l.from === ids[0] && l.to === ids[1] && l.label === ''),
    );
    await p.locator('[data-link]').last().fill('Valgfri efterfølgende forklaring');
    assert.deepEqual(
      (await read(p)).notes.map((n) => [n.id, n.x, n.y]),
      coords,
    );
    // Browser Back restores the previous tool, without advancing the investigation.
    await click(p, 'archive');
    await click(p, 'notebook');
    await p.goBack();
    await p.getByRole('heading', { name: 'Sagsarkiv', exact: true }).waitFor();
    // Finish: own account, evidence, structured questions; reload/back preserve drafts.
    await open(saves.opening);
    await click(p, 'report');
    assert.equal(await p.locator('.dose-answer').count(), 0);
    await p.locator('[data-draft=free-0]').fill('Min oprindelige konklusion');
    await p.locator('form[data-form=free-report] button:not([type=button])').click();
    assert.equal(await p.locator('[data-draft=free-3]').count(), 1);
    await p.locator('[data-draft=free-3]').fill('Min næste begrundelse');
    await p.reload();
    await p.locator('.dose-folder').waitFor();
    await click(p, 'start', 'sag-001');
    await p.locator('[data-draft=free-3]').waitFor();
    assert.equal(await p.locator('[data-draft=free-3]').inputValue(), 'Min næste begrundelse');
    await click(p, 'finish-back');
    assert.equal(await p.locator('[data-draft=free-0]').inputValue(), 'Min oprindelige konklusion');
    await click(p, 'scene');
    await click(p, 'report');
    assert.equal(await p.locator('[data-draft=free-0]').inputValue(), 'Min oprindelige konklusion');
    for (const [name, s] of Object.entries(saves)) {
      await open(s);
      const r = await read(p);
      for (const k of [
        'scene',
        'visited',
        'found',
        'links',
        'hypotheses',
        'hints',
        'report',
        'uth',
        'status',
      ])
        assert.deepEqual(r[k], s[k], name + ':' + k);
      assert.deepEqual(
        r.notes.map(({ uxPlaced, ...n }) => n),
        s.notes,
      );
      if (name === 'complete') assert.equal(r.evaluation.total, 100);
    }
    // 30 pinned notes, existing saved locations retained; canvas scrolls internally.
    const many = structuredClone(saves.rich);
    many.notes = Array.from({ length: 30 }, (_, i) => ({
      id: 'n-' + (i + 1),
      content: 'Spor ' + i,
      source: 'wife',
      clue: '',
      category: 'Øvrige oplysninger',
      comment: '',
      x: 1 + (i % 5) * 19,
      y: 1 + Math.floor(i / 5) * 11,
      pinned: true,
    }));
    many.noteSequence = 30;
    many.links = [];
    await open(many);
    await click(p, 'board');
    assert.equal(await p.locator('[data-pin]').count(), 30);
    assert.equal(await p.locator('.dose-board-list article').count(), 30);
    for (const [width, height] of [
      [320, 568],
      [375, 667],
      [390, 844],
      [430, 932],
      [568, 320],
      [844, 390],
      [768, 1024],
      [1024, 768],
      [1280, 800],
      [1920, 1080],
    ]) {
      await p.setViewportSize({ width, height });
      for (const v of ['scene', 'notebook', 'board', 'archive']) {
        await click(p, v);
        assert(
          await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          'overflow ' + v + width,
        );
        assert.equal(await p.locator('.dose-tools button:visible').count(), 4);
        const nav = await p.locator('.dose-tools').boundingBox();
        if (width <= 800) assert(nav.y + nav.height <= height + 1);
      }
      await click(p, 'scene');
      await p.evaluate(() =>
        scrollTo(0, Math.min(400, document.documentElement.scrollHeight - innerHeight)),
      );
      const next = await p.locator('[data-dose=next]').first().boundingBox();
      assert(next.y >= 0 && next.y + next.height <= height, 'next visible ' + width);
      await click(p, 'next');
      assert(await p.locator('dialog[open]').isVisible());
      await click(p, 'close-panel');
      metrics.push({ width, height, primaryTabs: 4, nextClicks: 1, overflow: false });
    }
    await p.setViewportSize({ width: 390, height: 844 });
    await click(p, 'notebook');
    await p.locator('.dose-content').evaluate((el) => (el.style.fontSize = '200%'));
    assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '200% text');
    // Same generic UI can load an unrelated infusion case; no production fixture is shipped.
    const fixture = (await import(pathToFileURL(path.resolve('test/dose-fixture.js'))))
      .alternateCase;
    await p.evaluate(async (fixture) => {
      const script = document.querySelector('script[type=module][src]');
      const moduleURL = new URL('dose-game.js', script.src);
      const { mountDose } = await import(moduleURL);
      const root = document.querySelector('#dose-root');
      root.replaceChildren();
      fixture.images.desk.src = new URL('dose-cover.webp', script.src).href;
      window.disposeFixture = mountDose(root, {
        registry: [
          { id: fixture.id, title: fixture.title, intro: 'Test', load: async () => fixture },
        ],
      });
    }, fixture);
    await click(p, 'start', fixture.id);
    await p.locator('[data-clue=intro]').waitFor();
    await click(p, 'visit', 'bag');
    await p.locator('[data-clue=label]').waitFor();
    await click(p, 'save-clue', 'label');
    await click(p, 'notebook');
    assert.match(await p.locator('.dose-notes').innerText(), /Mærkning/);
    assert.deepEqual(errors, []);
    await context.close();
    fs.mkdirSync('artifacts/dose-ux', { recursive: true });
    fs.writeFileSync(
      'artifacts/dose-ux/ux-results.json',
      JSON.stringify(
        {
          passed: true,
          legacySaves: 5,
          viewports: metrics,
          fixture: 'infusion',
          focusAndScrollLosses: 0,
        },
        null,
        2,
      ),
    );
    console.log(
      'PASS UX: four tabs, context/scroll, source previews, no hidden clues, dedup, live search/caret, optional board link, browser Back, staged report resume, 5 legacy saves, 30 pins, 10 viewports, 200% text, infusion fixture',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
