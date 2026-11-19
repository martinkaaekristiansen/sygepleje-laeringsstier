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
  const errors = [],
    results = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.setDefaultTimeout(120000);
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.goto(base);
    const cases = await page.evaluate(async () => {
      const moduleURL = document.querySelector('script[type=module]').src;
      const { BOSSES, ROUTE } = await import(new URL('digestion-data.js', moduleURL));
      const { enzymeIdentity } = await import(new URL('digestion-enzyme-identity.js', moduleURL));
      return Object.entries(BOSSES).flatMap(([character, stages]) =>
        Object.entries(stages).flatMap(([stage, tasks]) =>
          tasks.flatMap((q, task) =>
            q.kind === 'enzyme' && enzymeIdentity(q.options[0]).id !== 'bile'
              ? [
                  {
                    character,
                    stage,
                    index: ROUTE.findIndex((s) => s.id === stage),
                    task,
                    label: q.options[0],
                    id: enzymeIdentity(q.options[0]).id,
                    tasks,
                  },
                ]
              : [],
          ),
        ),
      );
    });
    for (const c of cases) {
      const product = {
        stanley: { mouth: 'polysaccharide', duodenum: 'short-chain', jejunum: 'maltose' },
        poul: { stomach: 'protein', duodenum: 'peptide', jejunum: 'small-peptide' },
        trine: { duodenum: 'triglyceride' },
      }[c.character][c.stage];
      await seed(page, base, {
        character: c.character,
        index: c.index,
        phase: 'boss',
        mode: 'boss',
        motion: true,
        extra: { task: c.task, product },
      });
      await page.locator('[data-choice]').filter({ hasText: c.label }).click();
      await page.waitForFunction(
        (id) =>
          JSON.parse(document.querySelector('canvas').dataset.selectedEnzyme || 'null')?.id === id,
        c.id,
      );
      const first = await page
        .locator('canvas')
        .evaluate((c) => JSON.parse(c.dataset.selectedEnzyme));
      async function same() {
        const s = await page
          .locator('canvas')
          .evaluate((c) => ({
            selected: JSON.parse(c.dataset.selectedEnzyme),
            models: JSON.parse(c.dataset.enzymeModels || '[]'),
          }));
        assert.equal(s.selected.instance, first.instance);
        assert.equal(s.selected.mesh, first.mesh);
        assert.equal(s.selected.geometry, first.geometry);
        assert.equal(s.selected.color, first.color);
        assert(s.selected.intact && s.selected.visible);
        assert.equal(s.models.filter((m) => m.id === c.id).length, 1);
      }
      await same();
      const source = c.tasks[c.task + 1];
      assert.equal(source.kind, 'source');
      await page.locator('[data-choice]').filter({ hasText: source.options[0] }).click();
      await page.waitForFunction(() =>
        ['secretion', 'brush-border'].includes(document.querySelector('canvas').dataset.digestMode),
      );
      await same();
      if (c.id === 'pepsin')
        await page.screenshot({ path: path.join(output, 'pepsin-synlig-under-sekretion.png') });
      await page.waitForFunction(
        () =>
          document.querySelector('canvas').dataset.digestMode === 'boss' &&
          document.querySelectorAll('[data-choice]').length === 3,
      );
      await same();
      const reaction = c.tasks[c.task + 2];
      assert.equal(reaction.kind, 'reaction');
      await page.locator('[data-choice]').filter({ hasText: reaction.options[1] }).click();
      await same();
      const run = (await saved(page)).digestion.active;
      assert.equal(run.lives, 1);
      if (c.id === 'pepsin')
        await page.screenshot({
          path: path.join(output, 'pepsin-funktionsspoergsmaal-samme-model.png'),
        });
      await page.locator('[data-choice]').filter({ hasText: reaction.options[0] }).click();
      await page.waitForFunction(
        () => document.querySelector('canvas').dataset.digestMode === 'reaction',
      );
      await same();
      await page.waitForFunction(() => +document.querySelector('canvas').dataset.sceneAge >= 5);
      await same();
      assert.equal(await page.locator('canvas').getAttribute('data-enzyme-intact'), 'true');
      assert(+(await page.locator('canvas').getAttribute('data-cleaved-bonds')) > 0);
      if (c.id === 'pepsin')
        await page.screenshot({ path: path.join(output, 'pepsin-spaltning-intakt-enzym.png') });
      await page.waitForFunction(
        () => document.querySelector('canvas').dataset.digestMode !== 'reaction',
      );
      await page.waitForFunction(
        () =>
          JSON.parse(document.querySelector('canvas').dataset.selectedEnzyme || 'null') === null,
      );
      results.push({
        ...c,
        tasks: undefined,
        instance: first.instance,
        mesh: first.mesh,
        oneVisibleModel: true,
        wrongAnswerRetainsEnzyme: true,
        intactAfterHydrolysis: true,
      });
      console.log('PASS enzyme continuity', c.character, c.stage, c.id);
    }
    assert.equal(results.length, 7);
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(output, 'enzyme-continuity.json'),
      JSON.stringify({ results, errors }, null, 2) + '\n',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
