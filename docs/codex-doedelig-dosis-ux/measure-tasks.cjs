// Reproducible scripted tasks, not a study with students. Each task has its own seed.
const { chromium } = require('playwright'),
  fs = require('fs'),
  path = require('path');
const root = path.resolve(__dirname, '../..'),
  legacy = JSON.parse(fs.readFileSync(path.join(root, 'test/fixtures/dose-ux/legacy-saves.json'))),
  key = 'doedelig-dosis:v1:sag-001';
(async () => {
  const { startStaticServer } = await import(path.join(root, 'scripts/static-server.js'));
  const data = (
    await import(require('node:url').pathToFileURL(path.join(root, 'public/dose-case-001.js')))
  ).case001;
  const submitted = structuredClone(legacy.complete);
  submitted.status = 'active';
  submitted.evaluation = null;
  for (const q of data.assessment) {
    if (q.type === 'order')
      q.correct.forEach((v, i) => (submitted.drafts['answer-' + q.id + '-' + i] = v));
    else if (q.type === 'match')
      Object.entries(q.correct).forEach(
        ([k, v]) => (submitted.drafts['answer-' + q.id + '-' + k] = v),
      );
    else
      submitted.drafts['answer-' + q.id] = Array.isArray(q.correct)
        ? q.correct.join('|')
        : String(q.correct);
  }
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const results = [];
  try {
    for (const mode of ['before', 'after']) {
      const server = await startStaticServer({
        root: path.join(
          mode === 'before'
            ? process.env.DOSE_BASELINE || path.resolve(root, '../doedelig-dosis')
            : root,
          'dist',
        ),
        prefix: '/sygepleje-laeringsstier/',
      });
      try {
        for (const width of [1280, 390]) {
          const c = await b.newContext({ viewport: { width, height: width === 390 ? 844 : 800 } }),
            p = await c.newPage();
          const click = async (a, v) => {
            let selector = `[data-dose="${a}"]${v === undefined ? '' : `[data-value="${v}"]`}`;
            if (
              (await p.locator('dialog[open]').count()) &&
              !(await p.locator('dialog[open] ' + selector).count())
            )
              await p.locator('[data-dose=close-panel]').click();
            let el = p.locator(selector).first();
            if (await el.count())
              await el.evaluate((e) => {
                for (let a = e.parentElement; a; a = a.parentElement)
                  if (a.tagName === 'DETAILS') a.open = true;
              });
            if (!(await el.isVisible())) await p.locator('[data-dose=menu]').click();
            await p.locator(selector).filter({ visible: true }).first().click();
          };
          async function open(seed) {
            await p.goto(server.url);
            await p.locator('.continue-section').waitFor();
            await p.evaluate(
              ({ key, s }) =>
                s ? localStorage.setItem(key, JSON.stringify(s)) : localStorage.removeItem(key),
              { key, s: seed },
            );
            await p.goto(server.url + '#/sti/doedelig-dosis/sagsmapper');
            await p.locator('.dose-folder').waitFor();
            await p.waitForFunction(() =>
              [...document.styleSheets].some((s) => s.href?.endsWith('/dose.css')),
            );
            if (seed) {
              await click('start', 'sag-001');
              await p
                .locator('[data-clue],.dose-score,[data-form=free-report],[data-form=assessment]')
                .first()
                .waitFor();
            }
          }
          async function measure(id, name, seed, setup, run) {
            await open(seed);
            if (setup) await setup();
            await p.evaluate(() => scrollTo(0, 0));
            await p.waitForTimeout(40);
            await p.evaluate(() => {
              window.uxClicks = 0;
              window.uxScroll = 0;
              window.uxLast = scrollY;
              window.uxModals = 0;
              window.uxScreenChanges = 0;
              window.uxHeading = document.querySelector('#dose-heading')?.textContent;
              window.uxDocuments = document.querySelector('.dose-documents');
              window.uxDialogWasOpen = !!document.querySelector('dialog[open]');
              document.addEventListener('click', () => uxClicks++, true);
              window.addEventListener('scroll', () => {
                uxScroll += Math.abs(scrollY - uxLast);
                uxLast = scrollY;
              });
              const mo = new MutationObserver(() => {
                const current = document.querySelector('#dose-heading')?.textContent;
                if (current !== uxHeading) {
                  uxScreenChanges++;
                  uxHeading = current;
                }
                const isOpen = !!document.querySelector('dialog[open]');
                if (isOpen && !uxDialogWasOpen) uxModals++;
                uxDialogWasOpen = isOpen;
              });
              mo.observe(document.querySelector('#dose-root'), {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['open'],
              });
            });
            const started = performance.now();
            await run();
            await p.waitForTimeout(40);
            const m = await p.evaluate(() => ({
              clicks: uxClicks,
              screenChanges: uxScreenChanges,
              userOpenedDialogs: uxModals,
              documentReplaced:
                !!uxDocuments && uxDocuments !== document.querySelector('.dose-documents'),
              finalFocus:
                document.activeElement?.id ||
                document.activeElement?.dataset.dose ||
                document.activeElement?.tagName,
              scrollTravelPx: Math.round(uxScroll),
              visibleActions: [...document.querySelectorAll('.dose-game button')].filter((e) =>
                e.checkVisibility(),
              ).length,
              visibleEditors: [
                ...document.querySelectorAll(
                  '.dose-game input,.dose-game textarea,.dose-game select',
                ),
              ].filter((e) => e.checkVisibility()).length,
              visibleRequired: [...document.querySelectorAll('.dose-game :required')].filter((e) =>
                e.checkVisibility(),
              ).length,
              dialogOpen: !!document.querySelector('dialog[open]'),
            }));
            results.push({
              mode,
              width,
              id,
              name,
              ...m,
              automationMs: Math.round(performance.now() - started),
            });
          }
          await measure(1, 'Start sag', null, null, async () => {
            await click('start', 'sag-001');
            await p.locator('[data-clue=opening]').waitFor();
          });
          await measure(
            2,
            'Genoptag fra sagsmapper',
            legacy.wife,
            async () => click('catalog'),
            async () => {
              await click('start', 'sag-001');
              await p.locator('[data-clue=yellow-vision]').waitFor();
            },
          );
          await measure(3, 'Åbn interview', legacy.opening, null, async () =>
            click('visit', 'wife'),
          );
          await measure(4, 'Gem oplysninger i scenen', legacy.wife, null, async () =>
            click('save-clue', 'yellow-vision'),
          );
          await measure(5, 'Skriv hurtig scenenote', legacy.wife, null, async () => {
            await p.locator('.dose-reflection summary').click();
            await p.locator('[data-draft=scene-wife]').fill('Min foreløbige fortolkning');
            await click('scene-note');
          });
          await measure(6, 'Find næste handling fra dokumentstart', legacy.wife, null, async () => {
            if (mode === 'before')
              await p
                .getByRole('heading', { name: 'Hvad vil du undersøge nu?' })
                .scrollIntoViewIfNeeded();
            else await click('next');
          });
          await measure(
            7,
            'Åbn notes kilde',
            legacy.rich,
            async () => click('notebook'),
            async () => click(mode === 'before' ? 'visit' : 'preview', legacy.rich.notes[0].source),
          );
          await measure(
            8,
            'Vend tilbage til aktiv efterforskning fra kilde',
            legacy.rich,
            async () => {
              await click('notebook');
              await click(mode === 'before' ? 'visit' : 'preview', legacy.rich.notes[0].source);
            },
            async () => {
              if (mode === 'before') {
                await click('archive');
                await click('visit', legacy.rich.scene);
              } else await click('scene');
            },
          );
          await measure(
            9,
            'Søg i notesbog',
            legacy.rich,
            async () => click('notebook'),
            async () => {
              await p.locator('#dose-search').fill('Kreatinin');
              if (mode === 'before') await click('filter');
            },
          );
          await measure(
            10,
            'Fastgør note',
            legacy.wife,
            async () => {
              await click('save-clue', 'yellow-vision');
              await click('notebook');
            },
            async () => click('pin', 'n-1'),
          );
          await measure(
            11,
            'Forbind to spor uden obligatorisk forklaring',
            legacy.rich,
            async () => click('board'),
            async () => {
              if (mode === 'before') {
                await p.locator('[name=from]').selectOption('n-1');
                await p.locator('[name=to]').selectOption('n-2');
                await p.locator('[name=label]').fill('Min forbindelse');
                await p.locator('[data-form=link] button').click();
              } else {
                await click('select-note', 'n-1');
                await click('select-note', 'n-2');
                await click('connect-selected');
              }
            },
          );
          await measure(12, 'Gem foreløbig hypotese', legacy.rich, null, async () => {
            await click('hypothesis');
            await p.locator('[data-draft=hyp-content]').fill('Jeg mangler endnu viden');
            await p.locator('[data-form=hypothesis] button').click();
          });
          await measure(13, 'Hent mindst afslørende hint', legacy.wife, null, async () => {
            await click('hints');
            await click('hint', '1');
          });
          await measure(
            14,
            'Sammenhold journal og administration via arkiv',
            legacy.rich,
            null,
            async () => {
              await click('archive');
              await click(mode === 'before' ? 'visit' : 'preview', 'nursing');
              await click('archive');
              await click(mode === 'before' ? 'visit' : 'preview', 'administration');
            },
          );
          await measure(15, 'Start egen afsluttende konklusion', legacy.rich, null, async () =>
            click('report'),
          );
          // Completing the whole report is verified by four browser journeys, not timed as human work.
          await measure(16, 'Aflevér færdig kladde', submitted, null, async () => {
            await click('report');
            for (let n = 0; n < 30 && !(await p.locator('.dose-score').count()); n++) {
              await p
                .locator(
                  'form[data-form=free-report] button:not([type=button]),form[data-form=assessment] button:not([type=button])',
                )
                .click();
            }
            await p.locator('.dose-score').waitFor();
          });

          await measure(
            17,
            'Åbn rekonstruktion efter afslutning',
            legacy.complete,
            null,
            async () => {
              if (mode === 'before')
                await p
                  .getByRole('heading', { name: 'Rekonstruktion af hændelsesforløbet' })
                  .scrollIntoViewIfNeeded();
              else await click('result-section', 'reconstruction');
            },
          );
          await measure(
            18,
            'Genoptag gammelt v1-spil og se bevarede noter',
            legacy.rich,
            null,
            async () => click('notebook'),
          );
          await c.close();
        }
      } finally {
        await new Promise((r) => server.close(r));
      }
    }
  } finally {
    await b.close();
  }
  fs.writeFileSync(
    path.join(__dirname, 'task-metrics.json'),
    JSON.stringify(
      {
        method:
          '18 scripted tasks at 1280x800 and 390x844; identical v1 seeds; automation time is not student completion time; scroll includes automatic scrolling; native select/fill actions are not pointer clicks. Full submission and reconstruction semantics covered by browser journeys.',
        results,
      },
      null,
      2,
    ) + '\n',
  );
  console.log('Measured 18 tasks before and after at two viewports (72 records).');
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
