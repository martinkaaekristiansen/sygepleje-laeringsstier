const assert = require('node:assert/strict');
async function saved(page) {
  return page.evaluate(async () => {
    const db = await new Promise((r, j) => {
      const q = indexedDB.open('laeringsstier-v2');
      q.onsuccess = () => r(q.result);
      q.onerror = () => j(q.error);
    });
    const value = await new Promise((r, j) => {
      const q = db.transaction('records').objectStore('records').get('progress');
      q.onsuccess = () => r(q.result);
      q.onerror = () => j(q.error);
    });
    db.close();
    return value['fordoejelsens-vilde-rejse'];
  });
}
async function seed(
  page,
  base,
  {
    character = 'stanley',
    index = 0,
    phase = 'route',
    mode,
    age = 0,
    motion = true,
    exam,
    extra = {},
  } = {},
) {
  await page.goto('about:blank');
  await page.goto(base + '#/');
  await page.locator('h1').first().waitFor();
  await page.evaluate(
    async ({ character, index, phase, mode, age, motion, exam, extra }) => {
      const moduleURL = document.querySelector('script[type=module]').src;
      const { newDigestion, validDigestion } = await import(
        new URL('digestion-engine.js', moduleURL)
      );
      const { ROUTE, BOSSES } = await import(new URL('digestion-data.js', moduleURL));
      const createAssessment =
        exam && exam !== 'legacy'
          ? (await import(new URL('digestion-exam.js', moduleURL))).createAssessment
          : null;
      const completed = ROUTE.filter(
        (s) =>
          (s.index < index || (phase === 'reaction' && s.index === index)) &&
          BOSSES[character][s.id],
      ).map((s) => s.id);
      const answered = ROUTE.filter((s) => completed.includes(s.id)).flatMap((s) =>
        BOSSES[character][s.id].map((_, i) => s.index + ':' + i),
      );
      let product =
        character === 'stanley'
          ? index >= 6
            ? 'glucose'
            : index >= 5
              ? 'short-chain'
              : 'polysaccharide'
          : character === 'poul'
            ? index >= 6
              ? 'amino-acid'
              : index >= 5
                ? 'peptide'
                : 'protein'
            : 'triglyceride';
      if (['absorb', 'transport'].includes(mode))
        product = { stanley: 'glucose', trine: 'lipid-products', poul: 'amino-acid' }[character];
      if (index > 6 || mode === 'residue') product = 'residue';
      const run = {
        ...newDigestion(character),
        index,
        phase,
        completed,
        answered,
        enzyme: answered.length,
        anatomy: index,
        product,
        absorbed: index > 6 || mode === 'residue',
        absorptionPassed: ['transport', 'residue'].includes(mode),
        absorptionView: ['transport', 'residue'].includes(mode) ? mode : 'absorb',
        ...extra,
      };
      if (phase === 'secretion') {
        run.secretionKind = mode;
        run.task = BOSSES[character][ROUTE[index].id].findIndex((q) => q.visual === mode) + 1;
        if (run.task < 1) throw Error('Unknown secretion fixture');
      }
      if (mode) run.animation = { stage: ROUTE[index].id, mode, age };
      const digestion = {
        results: {},
        active: run,
        settings: { sound: false, motion, quality: 'auto', volume: 0.3 },
      };
      if (exam)
        digestion.assessmentDraft =
          exam === 'legacy'
            ? { character, answers: [0, 1] }
            : typeof exam === 'object'
              ? exam
              : createAssessment(character);
      if (!validDigestion(digestion)) throw Error('Invalid fixture ' + JSON.stringify(digestion));
      const db = await new Promise((r, j) => {
        const q = indexedDB.open('laeringsstier-v2');
        q.onsuccess = () => r(q.result);
        q.onerror = () => j(q.error);
      });
      await new Promise((r, j) => {
        const tx = db.transaction('records', 'readwrite'),
          st = tx.objectStore('records'),
          q = st.get('progress');
        q.onsuccess = () => {
          const all = q.result || {};
          all['fordoejelsens-vilde-rejse'] = { done: [], notes: {}, answers: {}, digestion };
          st.put(all, 'progress');
        };
        tx.oncomplete = r;
        tx.onerror = () => j(tx.error);
      });
      db.close();
    },
    { character, index, phase, mode, age, motion, exam, extra },
  );
  await page.goto(
    base + '?v2-fixture=' + Date.now() + '#/sti/fordoejelsens-vilde-rejse/digestion-' + character,
  );
  await page.locator(exam ? '[data-digest=exam]' : '[data-digest=resume]').click();
  if (mode && !exam)
    await page.waitForFunction(
      (mode) => document.querySelector('canvas')?.dataset.digestMode === mode,
      mode,
    );
  assert.equal(await page.locator('[data-digest=skip],[data-digest=replay]').count(), 0);
}
module.exports = { seed, saved };
