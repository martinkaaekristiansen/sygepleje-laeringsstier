const assert = require('node:assert/strict');
const base = process.env.APP_URL || 'http://127.0.0.1:3055/';
const launch = { args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };
async function saved(page) {
  return page.evaluate(async () => {
    const db = await new Promise((r) => {
      const q = indexedDB.open('laeringsstier-v2');
      q.onsuccess = () => r(q.result);
    });
    const all = await new Promise((r) => {
      const q = db.transaction('records').objectStore('records').get('progress');
      q.onsuccess = () => r(q.result);
    });
    db.close();
    return all['iltens-rejse'];
  });
}
async function seed(
  page,
  {
    level = 'hard',
    stage = 'outside',
    entry = 'nose',
    side = 'right',
    exit = 'mouth',
    animation = false,
    age = 0,
    extra = {},
    progress = {},
    otherRecords = {},
  } = {},
) {
  await page.goto('about:blank');
  await page.goto(base + '#/');
  await page.locator('h1').first().waitFor();
  await page.evaluate(
    async (args) => {
      const url = document.querySelector('script[type=module]').src,
        { newOxygenRun, newOxygenProgress, answerOxygen, advanceOxygen, validOxygenProgress } =
          await import(new URL('oxygen-engine.js', url)),
        { oxygenRoute, oxygenQuestion } = await import(new URL('oxygen-data.js', url));
      const run = newOxygenRun(args.level);
      let safety = 0;
      while (++safety < 600) {
        const id = oxygenRoute(run)[run.index].id;
        if (id === args.stage && run.phase !== 'travel') break;
        if (run.phase === 'question') {
          const q = oxygenQuestion(run),
            key =
              id === 'outside'
                ? args.entry
                : id === 'mainbronchus'
                  ? args.side
                  : id === 'out_pharynx'
                    ? args.exit
                    : q.options.find((o) => o.correct).key;
          answerOxygen(run, key);
        } else if (['travel', 'animation', 'observe'].includes(run.phase))
          advanceOxygen(run, run.duration - run.age);
        else throw Error('Checkpoint not found ' + args.stage);
      }
      if (args.animation && run.phase === 'question')
        answerOxygen(run, oxygenQuestion(run).options.find((o) => o.correct).key);
      if (run.phase === 'animation') {
        run.worldTime += args.age;
        run.age = args.age;
      }
      Object.assign(run, args.extra);
      const data = newOxygenProgress();
      data.active = run;
      data.settings.quality = 'low';
      data.stats[args.level] = { completed: false, attempts: 1, best: 0 };
      Object.assign(data, args.progress);
      if (!validOxygenProgress(data)) throw Error('Invalid fixture ' + JSON.stringify(data));
      const db = await new Promise((r) => {
        const q = indexedDB.open('laeringsstier-v2');
        q.onsuccess = () => r(q.result);
      });
      await new Promise((r, j) => {
        const tx = db.transaction('records', 'readwrite'),
          s = tx.objectStore('records'),
          q = s.get('progress');
        q.onsuccess = () => {
          const all = q.result || {};
          all['iltens-rejse'] = {
            notes: {},
            answers: {},
            ...all['iltens-rejse'],
            done: [],
            oxygenJourney: data,
          };
          Object.assign(all, args.otherRecords);
          s.put(all, 'progress');
        };
        tx.oncomplete = r;
        tx.onerror = () => j(tx.error);
      });
      db.close();
    },
    { level, stage, entry, side, exit, animation, age, extra, progress, otherRecords },
  );
  await page.goto('about:blank');
  await page.goto(base + '#/sti/iltens-rejse/oxygen-' + level);
  await page.locator('[data-oxygen=start]:enabled').waitFor();
  await page.locator('[data-oxygen=resume]:enabled').waitFor();
  await page.locator('[data-oxygen=resume]').click();
  await page.waitForFunction(() => document.querySelector('.oxygen-loading').hidden);
}
async function state(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas'),
      p = document.querySelector('.digest-panel');
    return {
      stage: c.dataset.oxygenStage,
      phase: c.dataset.oxygenPhase,
      mode: c.dataset.oxygenMode,
      hidden: p.hidden,
      inert: p.inert,
      choices: p.querySelectorAll('[data-oxygen-choice]').length,
      exam: !!p.querySelector('.digest-exam-question'),
      camera: JSON.parse(c.dataset.camera || 'null'),
      mucus: JSON.parse(c.dataset.mucus || 'null'),
      player: JSON.parse(c.dataset.player || 'null'),
      hb: JSON.parse(c.dataset.hemoglobin || 'null'),
    };
  });
}
async function chooseCorrect(page, choices = {}) {
  const q = await page.evaluate(async () => {
    const url = document.querySelector('script[type=module]').src,
      { oxygenQuestion } = await import(new URL('oxygen-data.js', url));
    const db = await new Promise((r) => {
        const q = indexedDB.open('laeringsstier-v2');
        q.onsuccess = () => r(q.result);
      }),
      all = await new Promise((r) => {
        const q = db.transaction('records').objectStore('records').get('progress');
        q.onsuccess = () => r(q.result);
      });
    db.close();
    const run = all['iltens-rejse'].oxygenJourney.active;
    return oxygenQuestion(run);
  });
  const id = (await state(page)).stage,
    o = q.options.find((o) => o.key === choices[id]) || q.options.find((o) => o.correct),
    bs = page.locator('[data-oxygen-choice]'),
    i = await bs.evaluateAll(
      (bs, label) => bs.findIndex((b) => b.textContent.trim() === label),
      o.label,
    );
  assert(i >= 0, o.label);
  await bs.nth(i).click();
}
module.exports = { base, launch, saved, seed, state, chooseCorrect };
