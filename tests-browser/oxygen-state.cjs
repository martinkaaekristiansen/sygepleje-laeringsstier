const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'),
  assert = require('node:assert/strict'),
  { launch, seed, state, saved, chooseCorrect, base } = require('./oxygen-fixtures.cjs');
(async () => {
  const b = await chromium.launch(launch);
  try {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.setDefaultTimeout(120000);
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    const old = { done: [], notes: { important: 'Bevar denne note' }, answers: {} },
      others = { 'blodcellens-rejse': old, 'fordoejelsens-vilde-rejse': old };
    await seed(p, { stage: 'pharynx', otherRecords: others });
    const before = await saved(p);
    for (let n = 0; n < 2; n++)
      await p.locator('[data-oxygen-choice]').filter({ hasText: 'Oesophagus' }).click();
    await p.locator('[data-oxygen=retry]').waitFor();
    assert.equal((await saved(p)).oxygenJourney.active.lives, 0);
    await p.locator('[data-oxygen=retry]').click();
    assert.equal((await saved(p)).oxygenJourney.active.lives, 2);
    assert.equal((await saved(p)).oxygenJourney.active.points, before.oxygenJourney.active.points);
    await chooseCorrect(p);
    await p.locator('[data-oxygen=menu]').click();
    await p.reload();
    await p.locator('[data-oxygen=start]:enabled').waitFor();
    await p.locator('[data-oxygen=resume]').click();
    await p.waitForFunction(() => document.querySelector('.oxygen-loading').hidden);
    assert((await saved(p)).oxygenJourney.active.index >= before.oxygenJourney.active.index);
    const preserved = await p.evaluate(async () => {
      const db = await new Promise((r) => {
        const q = indexedDB.open('laeringsstier-v2');
        q.onsuccess = () => r(q.result);
      });
      const all = await new Promise((r) => {
        const q = db.transaction('records').objectStore('records').get('progress');
        q.onsuccess = () => r(q.result);
      });
      db.close();
      return { blood: all['blodcellens-rejse'], digestion: all['fordoejelsens-vilde-rejse'] };
    });
    assert.deepEqual(preserved.blood, old);
    assert.deepEqual(preserved.digestion, old);
    const ids = ['entry', 'cilium', 'diffusion-in', 'hb-capacity', 'carbon-source'].map(
        (id) => 'hard:' + id,
      ),
      oldResult = {
        character: 'hard',
        questionIds: ids,
        answers: [0, 0, 0, 0, 0],
        total: 5,
        correct: 5,
        date: '2020-01-01T00:00:00.000Z',
      };
    await seed(p, {
      stage: 'exterior',
      age: 4.8,
      progress: { assessments: { hard: [oldResult] } },
    });
    await p.locator('.digest-exam-question').waitFor();
    assert.equal((await saved(p)).oxygenJourney.active.phase, 'exam');
    assert.equal(
      (await saved(p)).oxygenJourney.stats.hard.completed,
      false,
      'old result cannot prematurely complete this attempt',
    );
    await p.locator('[data-exam-answer="1"]').click();
    await p.locator('[data-digest=exam-next]').click();
    const first = await saved(p);
    assert.equal(first.oxygenJourney.assessmentDraft.answers.length, 1);
    const questionIds = first.oxygenJourney.assessmentDraft.questionIds;
    await p.reload();
    await p.locator('[data-oxygen=start]:enabled').waitFor();
    await p.locator('[data-oxygen=exam-resume]').click();
    await p.locator('.digest-exam-question').waitFor();
    assert.deepEqual((await saved(p)).oxygenJourney.assessmentDraft.questionIds, questionIds);
    for (let i = 1; i < 5; i++) {
      await p.locator('[data-exam-answer="0"]').click();
      await p.locator('[data-digest=exam-next]').click();
    }
    await p.getByText('Testresultat: 4 af 5', { exact: true }).waitFor();
    assert.equal((await saved(p)).oxygenJourney.active.phase, 'won');
    assert.equal((await saved(p)).oxygenJourney.assessments.hard.length, 2);
    await p.locator('[data-review-character=hard]').click();
    await p.locator('[data-exam-answer="0"]').click();
    await p.locator('[data-digest=exam-next]').click();
    assert.deepEqual(
      (await saved(p)).oxygenJourney.assessments.hard.at(-1).answers,
      [1, 0, 0, 0, 0],
      'review keeps original score',
    );
    await seed(p, { stage: 'la' });
    await p.locator('a.back').click();
    await p.locator('.continue-section').waitFor();
    assert.equal(
      await p.getByText('Dine lokale data kræver opmærksomhed', { exact: true }).count(),
      0,
      'disposing chamber textures must preserve normal navigation',
    );
    assert.deepEqual(errors, []);
    console.log(
      'PASS oxygen state: retry, points, reload, old games preserved, five-question draft, old exam guard and review',
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
