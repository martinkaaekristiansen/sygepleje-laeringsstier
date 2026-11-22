import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OXYGEN_LEVELS,
  oxygenRoute,
  oxygenQuestion,
  TASKS,
  OXYGEN_QUESTION_POOLS,
} from '../public/oxygen-data.js';
import {
  newOxygenRun,
  answerOxygen,
  retryOxygen,
  advanceOxygen,
  validOxygenRun,
  newOxygenProgress,
  validOxygenProgress,
  newOxygenAssessment,
  scoreOxygenAssessment,
} from '../public/oxygen-engine.js';
for (const level of Object.keys(OXYGEN_LEVELS))
  test(`complete O₂ → new CO₂ journey, both entrances/lungs/exits: ${level}`, () => {
    for (const entry of ['nose', 'mouth'])
      for (const side of ['left', 'right'])
        for (const exit of ['nose', 'mouth']) {
          const run = newOxygenRun(level);
          let count = 0,
            carbon = null;
          while (run.phase !== 'exam' && count++ < 300) {
            assert(validOxygenRun(run), JSON.stringify(run));
            const s = oxygenRoute(run)[run.index];
            if (run.phase === 'question') {
              const q = oxygenQuestion(run),
                o =
                  q.options.find(
                    (o) =>
                      o.key ===
                      (s.id === 'outside'
                        ? entry
                        : s.id === 'mainbronchus'
                          ? side
                          : s.id === 'out_pharynx'
                            ? exit
                            : '0'),
                  ) || q.options.find((o) => o.correct);
              assert(answerOxygen(run, o.key).correct);
            } else advanceOxygen(run, run.duration + 1);
            if (run.gas !== 'oxygen') {
              assert(run.oxygenUsed);
              assert.equal(run.carbonIdentity, 'metabolic-carbon-1');
              carbon ??= run.carbonIdentity;
              assert.equal(run.carbonIdentity, carbon);
            }
          }
          assert.equal(run.phase, 'exam');
          assert.equal(run.gas, 'carbon-dioxide');
          assert.equal(run.carrier, 'free');
          assert.equal(run.entry, entry);
          assert.equal(run.exit, exit);
          assert.equal(run.side, side);
          assert.equal(run.lives, 2);
          assert.equal(run.errors, 0);
          assert.deepEqual(
            run.visited,
            oxygenRoute(run).map((s) => s.id),
          );
          assert(validOxygenRun(run));
        }
  });
test('airway route is anatomically ordered; expiration reverses the selected airway rather than the mucus', () => {
  const r = oxygenRoute({ entry: 'nose', exit: 'mouth', side: 'left' }),
    ids = r.map((s) => s.id);
  assert.deepEqual(ids.slice(1, 14), [
    'nose',
    'pharynx',
    'larynx',
    'trachea',
    'mucus',
    'mainbronchus',
    'bronchus',
    'bronchiole',
    'terminal',
    'respiratory',
    'duct',
    'sac',
    'alveolus',
  ]);
  assert(ids.indexOf('oxygen-diffusion') < ids.indexOf('hb-binding'));
  assert(ids.indexOf('hb-binding') < ids.indexOf('pv'));
  assert(ids.indexOf('capillaries') < ids.indexOf('tissue-oxygen'));
  assert(ids.indexOf('metabolism') < ids.indexOf('perspective'));
  assert(ids.indexOf('perspective') < ids.indexOf('tissue-carbon'));
  for (const order of [
    ['pv', 'la', 'mitral', 'lv', 'aorticValve', 'aorta'],
    [
      'veins',
      'svc',
      'ra',
      'tricuspid',
      'rv',
      'pulmonaryValve',
      'trunk',
      'pa',
      'parterioles',
      'pcap-carbon',
      'bicarbonate-return',
      'co2-diffusion',
    ],
  ])
    for (let i = 1; i < order.length; i++)
      assert(ids.indexOf(order[i - 1]) < ids.indexOf(order[i]));
  assert.deepEqual(
    r.filter((s) => s.expiration && s.anatomy).map((s) => s.anatomy),
    [
      'alveolus',
      'sac',
      'duct',
      'respiratory',
      'terminal',
      'bronchiole',
      'bronchus',
      'mainbronchus',
      'trachea',
      'larynx',
      'pharynx',
      'mouth',
    ],
  );
  assert(
    !ids.includes('epiglottis'),
    'epiglottis is a structure beside the airway, not a traversable organ',
  );
});
test('wrong answers consume two lives; retry preserves earned points; duplicate input cannot score twice', () => {
  const run = newOxygenRun('hard');
  answerOxygen(run, 'mouth');
  assert(!answerOxygen(run, 'mouth').accepted);
  advanceOxygen(run, 4);
  answerOxygen(run, 'next');
  advanceOxygen(run, 4);
  assert.equal(oxygenRoute(run)[run.index].id, 'pharynx');
  const wrong = oxygenQuestion(run).options.find((o) => !o.correct);
  answerOxygen(run, wrong.key);
  assert.equal(run.lives, 1);
  answerOxygen(run, wrong.key);
  assert.equal(run.phase, 'retry');
  const points = run.points;
  assert(retryOxygen(run));
  assert.equal(run.points, points);
  assert.equal(run.lives, 2);
  assert.equal(run.errors, 2);
  assert(answerOxygen(run, 'next').correct);
  assert.equal(run.points, points + 1);
});
test('pause/resume checkpoints are JSON-serializable in every phase and do not replay completed effects', () => {
  const run = newOxygenRun('medium');
  for (let i = 0; i < 200 && run.phase !== 'exam'; i++) {
    if (run.phase === 'question')
      answerOxygen(run, oxygenQuestion(run).options.find((o) => o.correct).key);
    else {
      advanceOxygen(run, 0.71);
      const copy = JSON.parse(JSON.stringify(run));
      assert(validOxygenRun(copy));
      const before = structuredClone(run);
      assert.deepEqual(copy, before);
      advanceOxygen(run, 20);
      advanceOxygen(copy, 20);
      assert.deepEqual(copy, run);
    }
  }
  assert.equal(run.phase, 'exam');
});
test('saved records validate molecular identity, bounds, scores and every level-specific exam', () => {
  const p = newOxygenProgress();
  assert(validOxygenProgress(p));
  p.active = newOxygenRun('easy');
  assert(validOxygenProgress(p));
  for (const field of ['index', 'lives', 'worldTime', 'pitch']) {
    const q = structuredClone(p);
    q.active[field] = Infinity;
    assert(!validOxygenProgress(q));
  }
  const bad = structuredClone(p);
  bad.active.gas = 'carbon-dioxide';
  assert(!validOxygenProgress(bad));
  for (const level of Object.keys(OXYGEN_LEVELS)) {
    const exam = newOxygenAssessment(level, null, () => 0.4);
    assert.equal(new Set(exam.questionIds).size, 5);
    const next = newOxygenAssessment(level, exam, () => 0.4);
    assert(next.questionIds.some((id) => !exam.questionIds.includes(id)));
    p.assessmentDraft = exam;
    assert(validOxygenProgress(p));
    delete p.assessmentDraft;
    p.assessments[level] = [scoreOxygenAssessment(level, [0, 1, 0, 2, 0], exam.questionIds)];
    assert.equal(p.assessments[level][0].correct, 3);
    assert(validOxygenProgress(p));
    assert(OXYGEN_QUESTION_POOLS[level].length >= 15);
  }
});
test('the mucociliary and diffusion choices teach first-semester mechanisms, not active pumping or osmosis', () => {
  for (const id of ['oxygen-diffusion', 'tissue-oxygen', 'tissue-carbon', 'co2-diffusion'])
    assert.deepEqual(TASKS[id].options, ['Diffusion', 'Osmose', 'Aktiv transport']);
  assert.equal(TASKS.mucus.options[0], 'Op mod svælget');
});
test('the body map distinguishes the upper thorax, selected lung, heart and arm', () => {
  const r = oxygenRoute(newOxygenRun());
  const region = (id) => r.find((s) => s.id === id).region;
  for (const id of ['trachea', 'aorta', 'svc', 'trunk']) assert.equal(region(id), 'chest');
  assert.equal(region('pv'), 'lung');
  assert.equal(region('la'), 'heart');
  assert.equal(region('capillaries'), 'arm');
});
