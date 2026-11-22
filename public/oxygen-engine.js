import {
  OXYGEN_LEVELS,
  OXYGEN_QUESTION_POOLS,
  oxygenRoute,
  oxygenQuestion,
} from './oxygen-data.js';
import { selectAssessmentIds, reviewFromResult } from './learning-assessment.js';
import { valveTransit } from './journey-physiology.js';
export const OXYGEN_VERSION = 1;
export function newOxygenRun(level = 'easy') {
  if (!Object.hasOwn(OXYGEN_LEVELS, level)) throw Error('Ukendt niveau.');
  return {
    version: OXYGEN_VERSION,
    level,
    index: 0,
    fromIndex: 0,
    entry: 'nose',
    exit: null,
    side: 'right',
    phase: 'question',
    mode: 'outside',
    age: 0,
    duration: 0,
    worldTime: 0,
    yaw: 0,
    pitch: 0,
    lives: 2,
    points: 0,
    errors: 0,
    answered: [],
    demonstrated: [],
    visited: ['outside'],
    gas: 'oxygen',
    carrier: 'free',
    oxygenUsed: false,
    carbonIdentity: null,
    hemoglobinSites: 0,
    started: new Date().toISOString(),
  };
}
function enter(run) {
  const s = oxygenRoute(run)[run.index];
  run.age = 0;
  run.enteredAt = run.worldTime;
  run.mode = s.id;
  if (!run.visited.includes(s.id)) run.visited.push(s.id);
  if (s.id === 'trachea' && run.mucusOrigin === undefined) run.mucusOrigin = run.worldTime;
  if (s.id === 'pcap-carbon') run.hemoglobinSites = 4;
  if (s.id === 'perspective') run.carbonIdentity = 'metabolic-carbon-1';
  if (s.id === 'out_trachea' && run.expirationMucusOrigin === undefined)
    run.expirationMucusOrigin = run.worldTime;
  if (s.demonstration && !run.demonstrated.includes(s.id)) {
    run.phase = 'animation';
    run.mode = s.demonstration;
    run.duration = s.seconds;
  } else if (s.automatic) {
    run.phase = 'animation';
    run.mode = s.automatic;
    run.duration = s.seconds;
  } else if (oxygenQuestion(run)) {
    run.phase = 'question';
    run.duration = 0;
  } else {
    run.phase = 'observe';
    run.duration = Math.max(3, Math.min(8, s.note.split(/\s+/).length / 3));
  }
}
function next(run) {
  const route = oxygenRoute(run);
  if (run.index === route.length - 1) {
    run.phase = 'exam';
    run.mode = 'complete';
    run.age = 0;
    run.duration = 0;
    return;
  }
  run.fromIndex = run.index;
  run.index++;
  run.phase = 'travel';
  run.mode = 'travel';
  run.age = 0;
  run.duration = 2.8;
  const id = route[run.fromIndex].id;
  if (['mitral', 'tricuspid', 'aorticValve', 'pulmonaryValve'].includes(id)) {
    const transit = valveTransit(
      { kind: ['mitral', 'tricuspid'].includes(id) ? 'av-two' : 'semilunar' },
      run.worldTime,
    );
    run.valveWait = transit.wait;
    run.valveDuration = transit.duration;
    run.duration = transit.wait + transit.duration + 2.2;
  } else {
    run.valveWait = 0;
    run.valveDuration = 0;
  }
}
export function answerOxygen(run, key) {
  if (run.phase !== 'question') return { accepted: false };
  const q = oxygenQuestion(run),
    option = q?.options.find((o) => o.key === String(key));
  if (!option) return { accepted: false };
  if (!option.correct) {
    run.errors++;
    run.lives--;
    if (run.lives === 0) run.phase = 'retry';
    return { accepted: true, correct: false, why: option.why || q.why };
  }
  const stage = oxygenRoute(run)[run.index];
  if (stage.id === 'outside') {
    run.entry = option.key;
    run.exit = null;
  }
  if (stage.id === 'mainbronchus') run.side = option.key;
  if (stage.id === 'out_pharynx') run.exit = option.key;
  if (!run.answered.includes(stage.id)) {
    run.answered.push(stage.id);
    run.points++;
  }
  if (q.animation) {
    run.phase = 'animation';
    run.mode = q.animation;
    run.duration = q.seconds;
    run.age = 0;
  } else next(run);
  return { accepted: true, correct: true, why: option.why || q.why || stage.note };
}
export function retryOxygen(run) {
  if (run.phase !== 'retry') return false;
  run.lives = 2;
  run.age = 0;
  run.phase = 'question';
  return true;
}
export function advanceOxygen(run, seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return false;
  run.worldTime += seconds;
  if (!['travel', 'animation', 'observe'].includes(run.phase)) return false;
  run.age = Math.min(run.duration, run.age + seconds);
  if (run.age + 1e-6 < run.duration) return false;
  const s = oxygenRoute(run)[run.index];
  if (run.phase === 'travel') {
    enter(run);
    return true;
  }
  if (run.phase === 'animation') {
    if (run.mode === 'mucociliary') {
      run.demonstrated.push(s.id);
      enter(run);
      return true;
    }
    if (run.mode === 'oxygen-diffusion') run.carrier = 'erythrocyte-free';
    if (run.mode === 'hb-binding') {
      run.carrier = 'hemoglobin';
      run.hemoglobinSites = 4;
    }
    if (run.mode === 'tissue-oxygen') {
      run.carrier = 'tissue';
      run.hemoglobinSites = 3;
    }
    if (run.mode === 'metabolism') run.oxygenUsed = true;
    if (run.mode === 'perspective') {
      run.gas = 'carbon-dioxide';
      run.carrier = 'tissue';
      run.carbonIdentity = 'metabolic-carbon-1';
    }
    if (run.mode === 'tissue-carbon') run.carrier = 'plasma';
    if (run.mode === 'bicarbonate') {
      run.gas = 'bicarbonate';
      run.carrier = 'plasma';
    }
    if (run.mode === 'bicarbonate-return') {
      run.gas = 'carbon-dioxide';
      run.carrier = 'plasma';
    }
    if (run.mode === 'co2-diffusion') run.carrier = 'alveolar-air';
    if (run.mode === 'exhalation') run.carrier = 'free';
  }
  next(run);
  return true;
}
export function oxygenAssessmentQuestions(level, ids) {
  const pool = OXYGEN_QUESTION_POOLS[level];
  if (!pool || !Array.isArray(ids) || ids.length !== 5 || new Set(ids).size !== 5)
    throw Error('Ugyldige testspørgsmål.');
  return ids.map((id) => {
    const q = pool.find((q) => q.id === id);
    if (!q) throw Error('Ukendt testspørgsmål.');
    return q;
  });
}
export function newOxygenAssessment(level, previous, random = Math.random) {
  return {
    character: level,
    questionIds: selectAssessmentIds(OXYGEN_QUESTION_POOLS[level] || [], previous, random),
    answers: [],
  };
}
export function scoreOxygenAssessment(level, answers, ids) {
  oxygenAssessmentQuestions(level, ids);
  if (answers.length !== 5 || answers.some((a) => !Number.isInteger(a) || a < 0 || a > 2))
    throw Error('Ugyldige testsvar.');
  return {
    character: level,
    questionIds: [...ids],
    answers: [...answers],
    correct: answers.filter((a) => a === 0).length,
    total: 5,
    date: new Date().toISOString(),
  };
}
export const OXYGEN_ASSESSMENT = {
  questions: oxygenAssessmentQuestions,
  create: newOxygenAssessment,
  score: scoreOxygenAssessment,
  review: reviewFromResult,
  archived: () => false,
};
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v),
  finite = (v, min, max) => Number.isFinite(v) && v >= min && v <= max;
export function validOxygenRun(run) {
  if (
    !object(run) ||
    run.version !== 1 ||
    !Object.hasOwn(OXYGEN_LEVELS, run.level) ||
    !['nose', 'mouth'].includes(run.entry) ||
    ![null, 'nose', 'mouth'].includes(run.exit) ||
    !['left', 'right'].includes(run.side)
  )
    return false;
  const route = oxygenRoute(run);
  if (
    !Number.isInteger(run.index) ||
    run.index < 0 ||
    run.index >= route.length ||
    !Number.isInteger(run.fromIndex) ||
    run.fromIndex < 0 ||
    run.fromIndex >= route.length
  )
    return false;
  if (
    !['question', 'travel', 'animation', 'observe', 'retry', 'exam', 'won'].includes(run.phase) ||
    typeof run.mode !== 'string' ||
    !finite(run.age, 0, 60) ||
    !finite(run.duration, 0, 60) ||
    (run.age > run.duration + 1e-6 && ['animation', 'travel', 'observe'].includes(run.phase)) ||
    !finite(run.worldTime, 0, 1e8) ||
    !finite(run.yaw, -1e5, 1e5) ||
    !finite(run.pitch, -1.25, 1.25)
  )
    return false;
  if (
    !Number.isInteger(run.lives) ||
    run.lives < 0 ||
    run.lives > 2 ||
    (run.phase === 'retry' && run.lives !== 0) ||
    !Number.isInteger(run.errors) ||
    run.errors < 0 ||
    !Number.isInteger(run.points) ||
    run.points < 0 ||
    !Array.isArray(run.answered) ||
    new Set(run.answered).size !== run.answered.length ||
    run.points !== run.answered.length
  )
    return false;
  const ids = new Set(route.map((s) => s.id));
  const modes = new Set([
    ...ids,
    'travel',
    'complete',
    'mucociliary',
    'mucus-highlight',
    'expiration',
    'exhalation',
  ]);
  if (!modes.has(run.mode) || (run.phase === 'question' && !oxygenQuestion(run))) return false;
  if (['exam', 'won'].includes(run.phase) && run.index !== route.length - 1) return false;
  for (const k of ['mucusOrigin', 'expirationMucusOrigin', 'enteredAt'])
    if (run[k] !== undefined && !finite(run[k], 0, run.worldTime)) return false;
  for (const k of ['valveWait', 'valveDuration'])
    if (run[k] !== undefined && !finite(run[k], 0, 2)) return false;
  if (run.motion !== undefined && typeof run.motion !== 'boolean') return false;
  if (
    ['answered', 'demonstrated', 'visited'].some(
      (k) => !Array.isArray(run[k]) || run[k].some((id) => typeof id !== 'string' || !ids.has(id)),
    ) ||
    !['oxygen', 'carbon-dioxide', 'bicarbonate'].includes(run.gas) ||
    !['free', 'plasma', 'erythrocyte-free', 'hemoglobin', 'tissue', 'alveolar-air'].includes(
      run.carrier,
    ) ||
    typeof run.oxygenUsed !== 'boolean' ||
    ![null, 'metabolic-carbon-1'].includes(run.carbonIdentity) ||
    !Number.isInteger(run.hemoglobinSites) ||
    run.hemoglobinSites < 0 ||
    run.hemoglobinSites > 4 ||
    typeof run.started !== 'string'
  )
    return false;
  if (run.gas !== 'oxygen' && (!run.oxygenUsed || run.carbonIdentity === null)) return false;
  return run.carrier !== 'hemoglobin' || run.gas === 'oxygen';
}
export function validOxygenProgress(data) {
  if (
    !object(data) ||
    data.version !== 1 ||
    !object(data.stats) ||
    (data.assessments !== undefined && !object(data.assessments)) ||
    (data.active !== null && !validOxygenRun(data.active)) ||
    !object(data.settings)
  )
    return false;
  if (
    !['auto', 'high', 'low'].includes(data.settings.quality) ||
    typeof data.settings.sound !== 'boolean' ||
    typeof data.settings.motion !== 'boolean' ||
    !finite(data.settings.volume, 0, 1)
  )
    return false;
  for (const [level, results] of Object.entries(data.assessments || {})) {
    if (!Object.hasOwn(OXYGEN_LEVELS, level) || !Array.isArray(results) || results.length > 20)
      return false;
    for (const r of results) {
      if (!object(r) || !Array.isArray(r.answers)) return false;
      try {
        oxygenAssessmentQuestions(level, r.questionIds);
      } catch {
        return false;
      }
      if (
        r.character !== level ||
        r.total !== 5 ||
        r.answers?.length !== 5 ||
        r.answers.some((a) => !Number.isInteger(a) || a < 0 || a > 2) ||
        r.correct !== r.answers.filter((a) => a === 0).length ||
        typeof r.date !== 'string'
      )
        return false;
    }
  }
  if (data.assessmentDraft) {
    const r = data.assessmentDraft;
    if (!object(r)) return false;
    try {
      oxygenAssessmentQuestions(r.character, r.questionIds);
    } catch {
      return false;
    }
    if (
      !Array.isArray(r.answers) ||
      r.answers.length >= 5 ||
      r.answers.some((a) => !Number.isInteger(a) || a < 0 || a > 2)
    )
      return false;
  }
  if (data.reviewDraft) {
    const r = data.reviewDraft;
    if (!object(r) || !Array.isArray(r.answers)) return false;
    try {
      oxygenAssessmentQuestions(r.character, r.questionIds);
    } catch {
      return false;
    }
    if (
      !object(r.review) ||
      !Array.isArray(r.review.indices) ||
      !r.review.indices.length ||
      new Set(r.review.indices).size !== r.review.indices.length ||
      r.review.indices.some((i) => !Number.isInteger(i) || i < 0 || i > 4) ||
      !Number.isInteger(r.review.cursor) ||
      r.review.cursor < 0 ||
      r.review.cursor >= r.review.indices.length ||
      typeof r.review.pending !== 'boolean' ||
      !Number.isInteger(r.review.correct) ||
      r.review.correct < 0 ||
      r.review.correct > r.review.cursor + (r.review.pending ? 1 : 0) ||
      (r.review.pending &&
        (!Number.isInteger(r.review.lastAnswer) ||
          r.review.lastAnswer < 0 ||
          r.review.lastAnswer > 2))
    )
      return false;
  }
  for (const [level, s] of Object.entries(data.stats)) {
    if (
      !Object.hasOwn(OXYGEN_LEVELS, level) ||
      !object(s) ||
      typeof s.completed !== 'boolean' ||
      !Number.isInteger(s.attempts) ||
      s.attempts < 0 ||
      !Number.isInteger(s.best) ||
      s.best < 0 ||
      s.best > 100
    )
      return false;
  }
  return true;
}
export function newOxygenProgress() {
  return {
    version: 1,
    active: null,
    stats: {},
    settings: { sound: false, volume: 0.3, motion: true, quality: 'auto' },
    assessments: {},
  };
}
