// Run only on the unmodified release, before implementation.
import { writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { case001 as data } from '../../public/dose-case-001.js';
import {
  freshState,
  visitScene,
  availableScenes,
  sceneBlocks,
  satisfies,
  addNote,
  connectNotes,
  recordHypothesis,
  evaluate,
  currentHint,
} from '../../public/dose-engine.js';
const routes = [
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
const signature = (s) => ({
  scene: s.scene,
  visited: [...s.visited],
  found: [...s.found],
  available: availableScenes(data, s).map((a) => a.id),
  blocks: sceneBlocks(
    data.scenes.find((a) => a.id === s.scene),
    s,
  ).map((b) => b.id),
  hints: [1, 2, 3].map((n) => currentHint(data, s, n)),
});
const traces = routes.map((route) => {
  const state = freshState(data);
  return {
    route,
    states: [data.start, ...route].map((id) => {
      if (!visitScene(data, state, id)) throw Error(id);
      return signature(state);
    }),
  };
});
const normalized = structuredClone(data);
for (const img of Object.values(normalized.images)) img.src = img.src.split('/').at(-1);
const checksum = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const baseline = {
  commit: '6818b56e82d690d4efc209c010985f49ab8092e1',
  caseSHA256: checksum('public/dose-case-001.js'),
  engineSHA256: checksum('public/dose-engine.js'),
  images: Object.fromEntries(
    Object.values(data.images).map((i) => {
      const f = 'public/' + i.src.split('/').at(-1);
      return [f, checksum(f)];
    }),
  ),
  data: normalized,
  traces,
  correctAnswers: Object.fromEntries(data.assessment.map((q) => [q.id, q.correct])),
  evaluation: evaluate(data, Object.fromEntries(data.assessment.map((q) => [q.id, q.correct]))),
};
writeFileSync(
  'test/fixtures/dose-ux/narrative-baseline.json',
  JSON.stringify(baseline, null, 2) + '\n',
);
const seed = () => {
  const s = freshState(data);
  visitScene(data, s, data.start);
  return s;
};
const opening = seed(),
  wife = seed();
visitScene(data, wife, 'wife');
const rich = seed();
for (let n = 0; n < data.scenes.length; n++)
  for (const scene of data.scenes)
    if (satisfies(scene.when, rich)) visitScene(data, rich, scene.id);
visitScene(data, rich, 'vitals');
for (const [i, id] of ['creatinine', 'potassium', 'given-doses'].entries()) {
  const scene = data.scenes.find((s) => s.blocks.some((b) => b.id === id)),
    b = scene.blocks.find((b) => b.id === id);
  addNote(rich, {
    content: b.title + '\n' + b.text,
    source: scene.id,
    clue: id,
    category: ['Blodprøver', 'Blodprøver', 'Medicin'][i],
  });
  rich.notes.at(-1).pinned = true;
}
connectNotes(
  rich,
  rich.notes[0].id,
  rich.notes[2].id,
  'Min hypotese: undersøg om ændret organfunktion har betydning for medicinen.',
);
recordHypothesis(rich, {
  checkpoint: 1,
  choice: 'unknown',
  content: 'Jeg mangler endnu oplysninger.',
  confidence: 20,
  evidence: ['creatinine'],
});
rich.hints.push({ level: 1, text: currentHint(data, rich, 1) });
rich.uth = { 0: 'Fiktiv undervisningsrapport', 2: 'Dødsfald i den fiktive sag' };
rich.drafts['free-0'] = 'Min selvstændige foreløbige forklaring';
const finishing = structuredClone(rich);
finishing.report = { free: { 0: rich.drafts['free-0'] }, evidence: ['creatinine'], answers: {} };
finishing.drafts['answer-ordered'] = '62,5';
const complete = structuredClone(rich);
complete.status = 'complete';
complete.report = {
  free: Object.fromEntries(data.freeQuestions.map((q, i) => [i, 'Min forklaring ' + (i + 1)])),
  evidence: ['creatinine', 'given-doses'],
  answers: baseline.correctAnswers,
};
complete.evaluation = baseline.evaluation;
writeFileSync(
  'test/fixtures/dose-ux/legacy-saves.json',
  JSON.stringify({ opening, wife, rich, finishing, complete }, null, 2) + '\n',
);
console.log(
  'Baseline registered: entire case, engine and image hashes, four transition traces, five legacy save states.',
);
