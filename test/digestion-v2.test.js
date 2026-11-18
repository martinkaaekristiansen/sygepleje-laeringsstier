import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/three.module.min.js';
import { createSequenceRunner } from '../public/digestion-sequence.js';
import { createCheckpointSaver, CHECKPOINT_INTERVAL } from '../public/digestion-save.js';
import {
  createAssessment,
  validAssessmentDraft,
  validAssessmentResult,
} from '../public/digestion-exam.js';
import {
  QUESTION_POOLS,
  FINAL_TESTS,
  assessmentQuestions,
  scoreAssessment,
} from '../public/digestion-assessment.js';
import { gastricFrame, buildGastricFolds } from '../public/digestion-gastric.js';
import { stomachPoint, buildOrganSurface } from '../public/digestion-anatomy.js';
import {
  createMotility,
  motionParameters,
  motionScale,
  motionWeights,
  MOTILITY,
} from '../public/digestion-motility.js';
import { ROUTE } from '../public/digestion-data.js';
import { activeClock, newDigestion, validDigestion } from '../public/digestion-engine.js';

test('automatic sequence waits for rendered completion, survives pause and cancels stale callbacks', () => {
  let now = 0,
    rendered = 0,
    finished = 0,
    serial = 0;
  const jobs = new Map();
  const runner = createSequenceRunner({
    now: () => now,
    schedule: (fn) => {
      jobs.set(++serial, fn);
      return serial;
    },
    unschedule: (id) => jobs.delete(id),
  });
  const flush = () => {
    const fn = jobs.values().next().value;
    jobs.clear();
    fn?.();
  };
  runner.start({ seconds: 7, initialAge: 3, age: () => rendered, next: () => finished++ });
  now = 4000;
  rendered = 6;
  flush();
  assert.equal(finished, 0, 'slow GPU has not shown final frame');
  const stale = jobs.values().next().value;
  runner.pause(true);
  now += 60000;
  runner.pause(false);
  stale();
  assert.equal(jobs.size, 1);
  rendered = 7;
  flush();
  assert.equal(finished, 1);
  assert.equal(jobs.size, 0);
  assert.equal(runner.active, false);
  runner.start({ seconds: 2, age: () => 100, next: () => finished++ });
  const cancelled = jobs.values().next().value;
  runner.cancel();
  cancelled();
  assert.equal(finished, 1);
});

test('reduced-motion sequences retain reading time, saved age and paused time without requiring repainting', () => {
  let now = 0,
    callback,
    finished = 0;
  const runner = createSequenceRunner({
    now: () => now,
    schedule: (fn) => ((callback = fn), 1),
    unschedule: () => {
      callback = null;
    },
  });
  runner.start({
    seconds: 7,
    initialAge: 4,
    age: () => 4,
    animated: () => false,
    next: () => finished++,
  });
  now = 1000;
  runner.pause(true);
  assert.equal(runner.age, 5);
  now = 100000;
  runner.pause(false);
  now += 1000;
  callback();
  assert.equal(finished, 0);
  assert.equal(runner.age, 6);
  now += 1000;
  callback();
  assert.equal(finished, 1);
});

test('checkpoint saver coalesces overlapping requests, serializes writes and keeps the latest state', async () => {
  let current = 0,
    active = 0,
    peak = 0;
  const writes = [],
    releases = [];
  const saver = createCheckpointSaver({
    capture: () => current++,
    save: () => {
      active++;
      peak = Math.max(peak, active);
      writes.push(current);
      return new Promise((r) =>
        releases.push((ok) => {
          active--;
          r(ok);
        }),
      );
    },
  });
  const first = saver.request(),
    second = saver.request(),
    third = saver.request();
  assert.deepEqual(writes, [1]);
  releases.shift()(true);
  await first;
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(writes, [1, 3]);
  releases.shift()(true);
  assert.deepEqual(await Promise.all([second, third]), [true, true]);
  assert.equal(peak, 1);
  assert.equal(saver.pending, false);
  assert.equal(CHECKPOINT_INTERVAL, 15000);
});

test('failed checkpoint writes remain retryable and do not mask a later successful save', async () => {
  let fail = true;
  const results = [];
  const saver = createCheckpointSaver({
    capture: () => {},
    save: async () => {
      if (fail) throw Error('full');
      return true;
    },
    onResult: (ok) => results.push(ok),
  });
  assert.equal(await saver.request(), false);
  fail = false;
  assert.equal(await saver.request(), true);
  assert.deepEqual(results, [false, true]);
});

test('assessment sessions select five unique stable identities from twelve questions and vary consecutive sets', () => {
  for (const character of ['stanley', 'trine', 'poul']) {
    assert.equal(QUESTION_POOLS[character].length, 12);
    assert.equal(new Set(QUESTION_POOLS[character].map((q) => q.id)).size, 12);
    const a = createAssessment(character, undefined, () => 0.4),
      b = createAssessment(character, a, () => 0.4);
    assert.equal(new Set(a.questionIds).size, 5);
    assert.notDeepEqual(new Set(a.questionIds), new Set(b.questionIds));
    assert.ok(validAssessmentDraft(a));
    assert.deepEqual(
      assessmentQuestions(character, a.questionIds).map((q) => q.id),
      a.questionIds,
    );
    const result = scoreAssessment(character, [0, 1, 0, 2, 0], a.questionIds);
    assert.equal(result.correct, 3);
    assert.ok(validAssessmentResult(result));
    const resumed = structuredClone({ ...a, answers: [0, 1] });
    assert.ok(validAssessmentDraft(resumed));
    assert.deepEqual(
      assessmentQuestions(character, resumed.questionIds).map((q) => q.prompt),
      assessmentQuestions(character, a.questionIds).map((q) => q.prompt),
    );
    for (const q of QUESTION_POOLS[character]) {
      assert.equal(q.options.length, 3);
      assert.equal(new Set(q.options).size, 3);
      assert.ok(q.why.length > 20);
    }
  }
});

test('old results and interrupted assessments keep their original five questions; corrupted identities are rejected', () => {
  assert.deepEqual(assessmentQuestions('poul'), FINAL_TESTS.poul);
  const old = { character: 'poul', answers: [0, 1, 2, 0, 0] };
  assert.ok(validAssessmentDraft({ ...old, answers: [0, 1] }));
  assert.ok(validAssessmentResult(scoreAssessment('poul', old.answers)));
  const draft = createAssessment('trine');
  draft.questionIds[0] = draft.questionIds[1];
  assert.equal(validAssessmentDraft(draft), false);
  assert.equal(validAssessmentDraft({ character: 'toString', answers: [] }), false);
  assert.equal(
    validAssessmentDraft({
      ...createAssessment('stanley'),
      questionIds: createAssessment('poul').questionIds,
    }),
    false,
  );
});

test('gastric motion reaches both depth faces and negative-x wall without losing regional physiology', () => {
  const points = [
    stomachPoint(0.25, 0.4),
    stomachPoint(0.5, 0.5),
    stomachPoint(0.75, 0.6),
    stomachPoint(0.5, 0.1),
  ];
  for (const p of points) {
    const front = gastricFrame(p),
      back = gastricFrame(new T.Vector3(p.x, p.y, -13.6 - p.z));
    assert.equal(front.u, back.u);
    assert.deepEqual(front.axis.toArray(), back.axis.toArray());
    const scales = Array.from({ length: 41 }, (_, i) =>
      motionScale(motionParameters('stomach', front.u), motionWeights('stomach', i / 2)),
    );
    assert.ok(Math.max(...scales) - Math.min(...scales) > 0.003, 'every wall region participates');
    assert.ok(scales.every((s) => s >= 0.8 && s <= 1.02));
  }
  const proximal = motionParameters('stomach', 0.1),
    distal = motionParameters('stomach', 0.85);
  assert.ok(proximal[3] < distal[3]);
  assert.ok(proximal[1] < 0, 'proximal accommodation');
  assert.ok(
    motionScale(distal, motionWeights('stomach', 17)) <
      motionScale(proximal, motionWeights('stomach', 2)),
  );
});

test('gastric wall/folds share a continuous field with finite gradients and preserve all sixteen rounded rugae', () => {
  const built = buildOrganSurface(ROUTE[4]),
    motion = createMotility('stomach', built),
    folds = buildGastricFolds();
  motion.geometry(folds);
  assert.equal(folds.userData.rugae, 16);
  assert.equal(folds.index.count, 16 * 40 * 6 * 6);
  for (const geometry of [built.geometry, folds]) {
    const p = geometry.attributes.position,
      params = geometry.attributes.digestParams;
    assert.equal(params.count, p.count);
    assert.equal(geometry.attributes.digestGradient.count, p.count);
    for (let i = 0; i < p.count; i += 43) {
      const v = new T.Vector3().fromBufferAttribute(p, i),
        f = gastricFrame(v, true);
      assert.ok(Math.abs(params.getX(i) - f.u) < 1e-6);
      assert.ok([...f.gradient.toArray(), ...f.derivative.toArray()].every(Number.isFinite));
      assert.ok(
        Math.abs(gastricFrame(v.clone().addScalar(1e-5)).u - f.u) < 1e-4,
        'no seam in projection',
      );
    }
  }
  folds.dispose();
  built.geometry.dispose();
});

test('new automatic sequence checkpoints validate and repeated resume calls do not lose active time', () => {
  const r = newDigestion('stanley');
  for (const mode of ['face-intro', 'intro', 'travel', 'residue']) {
    r.animation = { stage: 'mouth', mode, age: 1 };
    assert.ok(validDigestion({ active: r, results: {} }));
  }
  let now = 0;
  const clock = activeClock(r, () => now);
  clock.resume();
  now = 1000;
  clock.resume();
  now = 2000;
  clock.tick();
  assert.equal(r.elapsed, 2000);
});

test('review checkpoints preserve pending feedback and reject duplicated or impossible review state', async () => {
  const { createReview, validReviewDraft } = await import('../public/digestion-exam.js');
  const draft = createAssessment('stanley'),
    result = scoreAssessment('stanley', [1, 0, 2, 0, 0], draft.questionIds),
    review = createReview(result);
  assert.deepEqual(review.review.indices, [0, 2]);
  assert.ok(validReviewDraft(review));
  review.review.correct = 1;
  assert.equal(validReviewDraft(review), false);
  review.review.pending = true;
  review.review.lastAnswer = 0;
  assert.ok(validReviewDraft(review));
  assert.deepEqual(
    assessmentQuestions(review.character, review.questionIds),
    assessmentQuestions(result.character, result.questionIds),
  );
  assert.ok(validDigestion({ results: {}, reviewDraft: structuredClone(review) }));
  review.review.indices = [0, 0];
  assert.equal(validReviewDraft(review), false);
});

test('gastric deformation Jacobian stays positive around the entire wall throughout a contraction cycle', () => {
  const built = buildOrganSurface(ROUTE[4]);
  createMotility('stomach', built);
  const attrs = built.geometry.attributes,
    p = new T.Vector3(),
    a = new T.Vector3(),
    gradient = new T.Vector3(),
    derivative = new T.Vector3();
  for (let time = 0; time < 20; time += 0.5) {
    const weights = motionWeights('stomach', time);
    for (let i = 0; i < attrs.position.count; i += 11) {
      const u = attrs.digestParams.getX(i),
        scale = motionScale(motionParameters('stomach', u), weights, MOTILITY.stomach.width);
      const slope =
        (motionScale(motionParameters('stomach', u + 0.001), weights, MOTILITY.stomach.width) -
          motionScale(motionParameters('stomach', u - 0.001), weights, MOTILITY.stomach.width)) /
        0.002;
      p.fromBufferAttribute(attrs.position, i);
      a.fromBufferAttribute(attrs.digestAxis, i);
      gradient.fromBufferAttribute(attrs.digestGradient, i);
      derivative.fromBufferAttribute(attrs.digestDerivative, i);
      const deformation = derivative.multiplyScalar(1 - scale).add(p.sub(a).multiplyScalar(slope));
      assert.ok(
        scale + gradient.dot(deformation) > 0.2,
        'no inverted/folded wall or concealed normal singularity',
      );
    }
  }
  built.geometry.dispose();
});

test('gastric tracers approach the pylorus, retropulse and allow only intermittent outflow', async () => {
  const { gastricFlowPose } = await import('../public/digestion-gastric.js');
  assert.ok(gastricFlowPose(10, 0).u > gastricFlowPose(5, 0).u);
  assert.ok(gastricFlowPose(17, 0).u < gastricFlowPose(15, 0).u);
  assert.equal(gastricFlowPose(17, 0).retrograde, true);
  assert.equal(gastricFlowPose(19, 0).outflow, true);
  assert.equal(gastricFlowPose(10, 0).outflow, false);
});

test('disposed assessment controller does not render stale asynchronous feedback after navigation', async () => {
  const { createExamController } = await import('../public/digestion-exam-controller.js');
  const data = { results: {} },
    panel = {
      innerHTML: '',
      classList: { remove() {}, add() {} },
      querySelector: () => ({ focus() {} }),
    };
  let release,
    calls = 0;
  const controller = createExamController({
    data,
    panel,
    prepare() {},
    learn() {},
    information() {},
    stage: () => 'anus',
    focusQuestion() {},
    store: () => (++calls === 1 ? Promise.resolve(true) : new Promise((r) => (release = r))),
  });
  controller.start('stanley');
  const question = panel.innerHTML,
    pending = controller.answer(0);
  controller.dispose();
  release(true);
  await pending;
  assert.equal(panel.innerHTML, question);
  assert.deepEqual(data.assessmentDraft.answers, [0]);
  assert.equal(controller.busy, false);
});

test('rugae remain attached to the gastric wall on both sides throughout the contraction wave', () => {
  const built = buildOrganSurface(ROUTE[4]),
    motion = createMotility('stomach', built),
    folds = buildGastricFolds();
  motion.geometry(folds);
  const material = new T.MeshBasicMaterial({ side: T.DoubleSide }),
    deformed = folds.clone(),
    mesh = new T.Mesh(deformed, material);
  mesh.updateMatrixWorld();
  function point(u, v) {
    const p = stomachPoint(u, v),
      f = gastricFrame(p);
    return motion.point(p, f.u, f.axis);
  }
  for (const time of [0, 5, 10, 15]) {
    motion.update(time);
    for (let i = 0; i < folds.attributes.position.count; i++) {
      const p = new T.Vector3().fromBufferAttribute(folds.attributes.position, i),
        f = gastricFrame(p),
        q = motion.point(p, f.u, f.axis);
      deformed.attributes.position.setXYZ(i, q.x, q.y, q.z);
    }
    deformed.computeBoundingSphere();
    for (let i = 0; i < 16; i += 2)
      for (const u of [0.25, 0.4, 0.55, 0.7]) {
        const v = i / 16,
          p = point(u, v),
          normal = point(u + 0.0001, v)
            .sub(point(u - 0.0001, v))
            .cross(point(u, v + 0.0001).sub(point(u, v - 0.0001)))
            .normalize();
        if (normal.dot(p.clone().sub(gastricFrame(stomachPoint(u, v)).axis)) < 0) normal.negate();
        for (const sign of [-1, 1]) {
          const origin = p.clone().addScaledVector(normal, sign * 0.2),
            direction = normal.clone().multiplyScalar(-sign);
          const hit = new T.Raycaster(origin, direction, 0, 0.2).intersectObject(mesh)[0];
          assert.ok(
            hit,
            `fold ${i}, u ${u}, t ${time}: the ridge must intersect both sides of the wall surface`,
          );
        }
      }
  }
  deformed.dispose();
  folds.dispose();
  built.geometry.dispose();
  material.dispose();
});

test('gastric normal shaders cannot reuse a radial-organ program or leak deformation attributes across stations', () => {
  const keys = [];
  for (const index of [4, 3]) {
    const built = buildOrganSurface(ROUTE[index]),
      motion = createMotility(ROUTE[index].id, built),
      material = new T.MeshStandardMaterial();
    motion.material(material);
    keys.push(material.customProgramCacheKey());
    const shader = {
      uniforms: {},
      vertexShader:
        '#include <beginnormal_vertex>\n#include <begin_vertex>\n#include <project_vertex>',
    };
    material.onBeforeCompile(shader, {});
    assert.equal(shader.vertexShader.includes('attribute vec3 digestGradient'), index === 4);
    assert.ok(
      shader.vertexShader.includes('const float digestWidth = ' + (index === 4 ? '0.16' : '0.11')),
    );
    assert.ok(
      !('digestWidth' in shader.uniforms),
      'width stays compile-time constant, with no extra per-vertex division cost',
    );
    material.dispose();
    built.geometry.dispose();
  }
  assert.notEqual(keys[0], keys[1]);
});
