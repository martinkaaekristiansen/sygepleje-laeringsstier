import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { case001 as c } from '../public/dose-case-001.js';
import { caseRegistry, dosePath } from '../public/dose-catalog.js';
import {
  satisfies,
  freshState,
  availableScenes,
  visitScene,
  sceneBlocks,
  caseErrors,
  addNote,
  removeNote,
  connectNotes,
  recordHypothesis,
  evaluate,
  restoreState,
  currentHint,
} from '../public/dose-engine.js';
import { openCaseStore, saveKey } from '../public/dose-storage.js';
import { alternateCase } from './dose-fixture.js';
const copy = () => structuredClone(c);
const storage = () => {
  const values = new Map();
  return {
    getItem: (k) => values.get(k) || null,
    setItem: (k, v) => values.set(k, v),
    removeItem: (k) => values.delete(k),
  };
};
export const investigationRoutes = [
  [
    'wife',
    'daughter',
    'nursing',
    'vitals',
    'medicines',
    'lookup-digoxin',
    'administration',
    'dispensing',
    'labs',
    'targeted',
    'ecg',
  ],
  [
    'admission',
    'fluid',
    'labs',
    'medicines',
    'lookup-digoxin',
    'administration',
    'dispensing',
    'targeted',
    'nursing',
    'vitals',
    'wife',
    'ecg',
  ],
  [
    'room',
    'nursing',
    'vitals',
    'day-nurse',
    'medicines',
    'administration',
    'dispensing',
    'lookup-digoxin',
    'targeted',
    'labs',
    'wife',
    'ecg',
  ],
  [
    'room',
    'friend',
    'admission',
    'fluid',
    'heart-failure',
    'labs',
    'infection',
    'medicines',
    'bleeding',
    'wife',
    'wife-followup',
    'nursing',
    'vitals',
    'evening-nurse',
    'doctor',
    'lookup-digoxin',
    'administration',
    'dispensing',
    'targeted',
    'ecg',
  ],
];
test('case validates, has 30 scenes / 41 blocks, ten critical clues and one playable registration', () => {
  assert.deepEqual(caseErrors(c), []);
  assert.equal(c.scenes.length, 30);
  assert.equal(c.scenes.flatMap((s) => s.blocks).length, 41);
  assert.equal(c.critical.length, 10);
  assert.equal(caseRegistry.length, 1);
  assert.equal(dosePath.semester, 3);
  for (const img of Object.values(c.images)) assert(existsSync(fileURLToPath(img.src)));
});
test('every registered case and local illustration is validated automatically', async () => {
  for (const entry of caseRegistry) {
    const data = await entry.load();
    assert.equal(data.id, entry.id);
    assert.equal(data.version, entry.version);
    assert.deepEqual(caseErrors(data), []);
    for (const img of Object.values(data.images)) assert(existsSync(fileURLToPath(img.src)));
  }
});
test('opening offers exactly three spoiler-free choices and concentration is gated', () => {
  const s = freshState(c);
  visitScene(c, s, c.start);
  const initial = availableScenes(c, s);
  assert.deepEqual(
    initial.map((a) => a.id),
    ['wife', 'room', 'admission'],
  );
  assert.doesNotMatch(JSON.stringify([c.scenes[0], ...initial]), /digoxin/i);
  assert(!visitScene(c, s, 'targeted'));
  assert(!visitScene(c, s, 'administration'));
});
for (const [i, route] of investigationRoutes.entries())
  test(
    'complete meaningful investigation route ' +
      (i + 1) +
      (i === 3 ? ' after misleading clues' : ''),
    () => {
      const s = freshState(c);
      visitScene(c, s, c.start);
      for (const id of route) assert(visitScene(c, s, id), id);
      for (const id of c.critical) assert(s.found.includes(id), id);
      assert(s.visited.length < c.scenes.length);
      assert.equal(
        evaluate(c, Object.fromEntries(c.assessment.map((q) => [q.id, q.correct]))).total,
        100,
      );
    },
  );
test('all reachable combinations remain extendable without hints or hypotheses', () => {
  const states = new Map();
  const seed = freshState(c);
  visitScene(c, seed, c.start);
  const queue = [seed];
  // Explore all paths in the critical first seven steps (later rules are monotone).
  while (queue.length) {
    const s = queue.shift(),
      key = [...s.visited].sort().join('|');
    if (states.has(key)) continue;
    states.set(key, s);
    const choices = availableScenes(c, s);
    assert(choices.length || c.critical.every((id) => s.found.includes(id)));
    if (s.visited.length < 7)
      for (const next of choices) {
        const t = structuredClone(s);
        visitScene(c, t, next.id);
        queue.push(t);
      }
  }
  assert(states.size > 100);
});
test('AND, OR, nested rules, invalid rules and hypothesis suggestions behave predictably', () => {
  const s = freshState(c);
  assert(!satisfies({ any: [] }, s));
  assert(!satisfies({ seen: 'wife', found: 'x' }, s));
  assert(!satisfies({ not: 'x' }, s));
  visitScene(c, s, 'briefing');
  assert(
    satisfies(
      { all: [{ seen: 'briefing' }, { any: [{ seen: 'wife' }, { seen: 'briefing' }] }] },
      s,
    ),
  );
  assert(
    recordHypothesis(s, { checkpoint: 1, choice: 'infection', content: 'Måske', confidence: 30 }),
  );
  assert(availableScenes(c, s).some((s) => s.id === 'infection'));
  assert(availableScenes(c, s).some((s) => s.id === 'wife'));
});
test('follow-up interviews and conditional return text unlock after new evidence', () => {
  const s = freshState(c);
  visitScene(c, s, 'briefing');
  visitScene(c, s, 'wife');
  assert(!availableScenes(c, s).some((s) => s.id === 'wife-followup'));
  visitScene(c, s, 'medicines');
  assert(availableScenes(c, s).some((s) => s.id === 'wife-followup'));
  assert(
    sceneBlocks(
      c.scenes.find((s) => s.id === 'wife'),
      s,
    ).some((b) => b.id === 'wife-return'),
  );
});
test('notes, source comments, board links and deletions preserve user authorship', () => {
  const s = freshState(c);
  const a = addNote(s, { content: 'Observation A', source: 'wife', clue: 'yellow-vision' }),
    b = addNote(s, { content: 'Min hypotese', comment: 'Usikkert' });
  assert(a && b);
  assert.equal(s.links.length, 0);
  assert(connectNotes(s, a, b, 'Min egen forklaring'));
  assert(!connectNotes(s, a, a, 'cirkel'));
  assert(!connectNotes(s, a, b, 'Min egen forklaring'));
  assert(!addNote(s, { content: '', category: 'Fejl' }));
  removeNote(s, a);
  assert.equal(s.links.length, 0);
  assert.equal(s.notes.length, 1);
});
test('hypotheses can be revised without revealing correctness; hints match progression', () => {
  const s = freshState(c);
  for (let n = 1; n <= 3; n++) {
    assert(
      recordHypothesis(s, { checkpoint: n, choice: 'unknown', content: 'Afventer', confidence: 0 }),
    );
  }
  assert(
    recordHypothesis(s, {
      checkpoint: 3,
      choice: 'medication',
      content: 'Revideret',
      confidence: 80,
    }),
  );
  assert.equal(s.hypotheses.length, 4);
  assert(!recordHypothesis(s, { checkpoint: 3, choice: 'x', content: 'x', confidence: 101 }));
  assert.doesNotMatch(currentHint(c, s, 3), /digoxin/i);
});
test('scoring is objective, all wrong gives zero and category weights total 100', () => {
  assert.equal(evaluate(c, {}).total, 0);
  const correct = Object.fromEntries(c.assessment.map((q) => [q.id, q.correct]));
  assert.equal(evaluate(c, correct).total, 100);
  correct.administered = 500000;
  assert.equal(evaluate(c, correct).total, 95);
  correct.ordered = '62.5';
  assert.equal(evaluate(c, correct).total, 90);
  correct.mechanism = { pump: 'calcium', vagus: 'conduction' };
  assert.equal(evaluate(c, correct).total, 80);
  const totals = c.assessment.reduce(
    (o, q) => ((o[q.category] = (o[q.category] || 0) + q.points), o),
    {},
  );
  assert.deepEqual(Object.values(totals), [20, 10, 20, 20, 15, 15]);
});
test('save/resume, corrupt data preservation, version update and tab conflicts', () => {
  const disk = storage(),
    a = openCaseStore(c, disk);
  visitScene(c, a.state, 'briefing');
  assert(a.save());
  addNote(a.state, { content: 'Bevar mig' });
  assert(a.save());
  const b = openCaseStore(c, disk);
  assert.equal(b.state.notes[0].content, 'Bevar mig');
  assert(b.save());
  assert(!a.save());
  assert.match(a.warning, /anden fane/);
  const newer = copy();
  newer.version = 2;
  const updated = openCaseStore(newer, disk);
  assert.equal(updated.state.notes[0].content, 'Bevar mig');
  assert.match(updated.warning, /opdateret/);
  disk.setItem(saveKey(c.id), '{bad');
  const broken = openCaseStore(c, disk);
  assert.equal(broken.original, '{bad');
  assert(!broken.save());
  assert.equal(disk.getItem(saveKey(c.id)), '{bad');
  broken.reset();
  assert.equal(disk.getItem(saveKey(c.id)), null);
});
test('quota denied, blocked storage and malformed nested data are isolated from the platform', () => {
  const blocked = openCaseStore(c, {
    getItem() {
      throw Error('SecurityError');
    },
  });
  assert(!blocked.save());
  assert.match(blocked.warning, /utilgængeligt/);
  const quota = openCaseStore(c, {
    getItem: () => null,
    setItem() {
      throw Error('QuotaExceeded');
    },
  });
  assert(!quota.save());
  assert.match(quota.warning, /kunne ikke gemmes/);
  for (const mutation of [
    (s) => (s.notes = [{}]),
    (s) => (s.links = [{ from: 'x', to: 'y' }]),
    (s) => (s.hypotheses = [{ confidence: 999 }]),
    (s) => (s.drafts = { x: {} }),
    (s) => (s.report = { answers: [] }),
    (s) => (s.uth = { x: {} }),
  ]) {
    const s = freshState(c);
    mutation(s);
    assert.throws(() => restoreState(c, s));
  }
});
test('completed evaluation is recomputed on load and case updates invalidate obsolete scoring', () => {
  const s = freshState(c);
  s.status = 'complete';
  s.report = { free: { 0: 'Min tekst' }, answers: {}, evidence: [] };
  s.evaluation = { total: 999 };
  assert.equal(restoreState(c, s).evaluation.total, 0);
  const next = copy();
  next.version++;
  const r = restoreState(next, s);
  assert.equal(r.status, 'active');
  assert.equal(r.report, null);
});
test('generic engine works for a different medication situation not registered publicly', () => {
  assert.deepEqual(caseErrors(alternateCase), []);
  const s = freshState(alternateCase);
  for (const id of ['start', 'pump', 'bag', 'compare']) assert(visitScene(alternateCase, s, id));
  assert(s.found.includes('difference'));
  assert.equal(evaluate(alternateCase, { volume: 100 }).total, 100);
  assert(!caseRegistry.some((c) => c.id === alternateCase.id));
});
test('validator rejects bad references, duplicates, missing images, deadlocks, scores and answers', () => {
  for (const [mutation, pattern] of [
    [(d) => d.scenes.push(structuredClone(d.scenes[0])), /Dubleret/],
    [(d) => (d.scenes[1].when = { seen: 'absent' }), /Ukendt scene/],
    [(d) => (d.scenes[1].when = { all: [] }), /Tom betingelse/],
    [(d) => (d.scenes[1].when = { other: 'x' }), /Ukendt regel/],
    [(d) => (d.scenes[1].illustration = 'missing'), /billede/],
    [(d) => (d.scenes[1].when = { seen: 'wife' }), /cirkulær/],
    [
      (d) => (d.scenes.find((s) => s.id === 'targeted').when = { hypothesis: 'medication' }),
      /kræver bestemt hypotese/,
    ],
    [(d) => (d.scenes[1] = null), /scene-/],
    [(d) => (d.assessment[0].points = 99), /100/],
    [(d) => delete d.assessment[0].correct, /facit/],
    [(d) => (d.sources = []), /kilder/],
  ]) {
    const d = copy();
    mutation(d);
    assert.match(caseErrors(d).join(';'), pattern);
  }
});
test('timeline and dose calculations are clinically coherent and no live services are used', () => {
  assert.equal(250 + 250, 500);
  assert.equal(500 / 62.5, 8);
  assert.equal(500 - 62.5, 437.5);
  assert.equal(22 * 60 + 30 - 12 * 60, 630);
  const concentration = c.scenes.find((s) => s.id === 'targeted');
  assert.match(concentration.blocks[0].text, /10 timer og 30/);
  assert.match(concentration.time, /00.10/);
  assert.match(c.scenes.find((s) => s.id === 'lookup-digoxin').blocks[0].text, /hyperkaliæmi/);
  for (const name of ['dose-engine', 'dose-game', 'dose-storage'])
    assert.doesNotMatch(
      readFileSync('public/' + name + '.js', 'utf8'),
      /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket/,
    );
});
