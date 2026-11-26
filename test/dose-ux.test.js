import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { case001 as data } from '../public/dose-case-001.js';
import {
  freshState,
  restoreState,
  visitScene,
  sceneBlocks,
  availableScenes,
  currentHint,
  evaluate,
} from '../public/dose-engine.js';
import {
  sceneGroup,
  investigationChoices,
  readUX,
  newNotePosition,
  reportSteps,
  PRIMARY_TOOLS,
} from '../public/dose-ux.js';
import { alternateCase } from './dose-fixture.js';
import { openCaseStore, saveKey } from '../public/dose-storage.js';
const baseline = JSON.parse(
  readFileSync(new URL('./fixtures/dose-ux/narrative-baseline.json', import.meta.url)),
);
const legacy = JSON.parse(
  readFileSync(new URL('./fixtures/dose-ux/legacy-saves.json', import.meta.url)),
);
const hash = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
test('UX blocking baseline: authored case, engine and all nineteen illustrations byte-identical', () => {
  assert.equal(hash('public/dose-case-001.js'), baseline.caseSHA256);
  assert.equal(hash('public/dose-engine.js'), baseline.engineSHA256);
  for (const [f, h] of Object.entries(baseline.images)) assert.equal(hash(f), h, f);
  const normalized = structuredClone(data);
  for (const i of Object.values(normalized.images)) i.src = i.src.split('/').at(-1);
  assert.deepEqual(normalized, baseline.data);
});
for (const [i, trace] of baseline.traces.entries())
  test(
    'UX blocking narrative trace ' +
      (i + 1) +
      ': availability, blocks and hints at every transition',
    () => {
      const s = freshState(data);
      const states = [data.start, ...trace.route].map((id) => {
        assert(visitScene(data, s, id));
        return {
          scene: s.scene,
          visited: [...s.visited],
          found: [...s.found],
          available: availableScenes(data, s).map((a) => a.id),
          blocks: sceneBlocks(
            data.scenes.find((a) => a.id === s.scene),
            s,
          ).map((b) => b.id),
          hints: [1, 2, 3].map((n) => currentHint(data, s, n)),
        };
      });
      assert.deepEqual(states, trace.states);
    },
  );
test('UX identical final evaluation, explanations, questions and points', () =>
  assert.deepEqual(evaluate(data, baseline.correctAnswers), baseline.evaluation));
for (const [name, s] of Object.entries(legacy))
  test('UX old v1 save compatibility: ' + name, () => {
    const restored = restoreState(data, structuredClone(s));
    for (const key of [
      'scene',
      'visited',
      'found',
      'notes',
      'links',
      'hypotheses',
      'hints',
      'drafts',
      'report',
      'uth',
      'status',
    ])
      assert.deepEqual(restored[key], s[key], key);
    if (s.status === 'complete') assert.deepEqual(restored.evaluation, s.evaluation);
  });
test('UX positions preserve existing board coordinates; forty new pins use empty slots', () => {
  const existing = [{ id: 'old', x: 10, y: 10, pinned: true }],
    snapshot = structuredClone(existing);
  newNotePosition(existing);
  assert.deepEqual(existing, snapshot);
  const notes = [];
  for (let i = 0; i < 40; i++)
    notes.push({ ...newNotePosition(notes), id: String(i), pinned: true });
  assert.equal(new Set(notes.map((n) => n.x + ':' + n.y)).size, 40);
});
test('UX presentation stays generic, ordered and independent of answers / critical clues', () => {
  for (const c of [data, alternateCase]) {
    const s = freshState(c);
    visitScene(c, s, c.start);
    const avail = availableScenes(c, s);
    assert.deepEqual(
      investigationChoices(c, s, avail),
      avail.filter((x) => x.kind !== 'reference'),
    );
    for (const scene of c.scenes) assert.equal(typeof sceneGroup(scene, c.characters), 'string');
    const changed = { ...c, critical: [], assessment: [] };
    assert.deepEqual(investigationChoices(c, s, avail), investigationChoices(changed, s, avail));
  }
  assert.equal(PRIMARY_TOOLS.length, 4);
});
test('UX report discloses all free questions before any structured choices, in original order', () => {
  const steps = reportSteps(data);
  assert.deepEqual(
    steps.filter((s) => s.kind === 'free').flatMap((s) => s.ids),
    data.freeQuestions.map((_, i) => i),
  );
  assert.deepEqual(
    steps.filter((s) => s.kind === 'assessment').flatMap((s) => s.ids),
    data.assessment.map((q) => q.id),
  );
  assert(
    steps.findIndex((s) => s.kind === 'evidence') < steps.findIndex((s) => s.kind === 'assessment'),
  );
});
test('UX draft metadata extends v1 without dropping old fields; invalid UI JSON is harmless', () => {
  const s = structuredClone(legacy.finishing);
  s.drafts['dose-ux'] = JSON.stringify({ finishStep: 5 });
  assert.equal(readUX(restoreState(data, s)).finishStep, 5);
  s.drafts['dose-ux'] = '{bad';
  assert.deepEqual(readUX(s), {});
});
test('UX version migration notice survives successful saves', () => {
  const old = structuredClone(legacy.rich);
  old.version = 0;
  const map = new Map([[saveKey(data.id), JSON.stringify(old)]]);
  const store = openCaseStore(data, {
    getItem: (k) => map.get(k),
    setItem: (k, v) => map.set(k, v),
  });
  assert.match(store.warning, /opdateret/);
  assert(store.save());
  assert.match(store.warning, /opdateret/);
  assert.equal(store.state.notes.length, old.notes.length);
});
