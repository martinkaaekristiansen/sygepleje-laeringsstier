import { validAssessmentDraft, validAssessmentResult, validReviewDraft } from './digestion-exam.js';
import { ROUTE, CHARACTERS, BOSSES, PRODUCTS } from './digestion-data.js';
export function newDigestion(character) {
  if (!Object.hasOwn(CHARACTERS, character)) throw Error('Ukendt næringsstof');
  return {
    character,
    routeVersion: 3,
    completed: [],
    product: initialProduct(character),
    index: 0,
    task: 0,
    phase: 'entry',
    lives: 2,
    errors: 0,
    answered: [],
    anatomy: 0,
    enzyme: 0,
    timingVersion: 2,
    started: Date.now(),
    elapsed: 0,
  };
}
export function chooseDigestion(run, correct) {
  if (!['route', 'boss', 'absorb-choice', 'entry'].includes(run.phase)) return false;
  if (!correct) {
    run.errors++;
    run.lives--;
    if (!run.lives) {
      run.retryFrom = run.phase;
      run.phase = 'retry';
    }
    return false;
  }
  if (run.phase === 'entry') {
    run.phase = 'intro';
    return true;
  }
  if (run.phase === 'boss') {
    run.answered ??= [];
    const key = run.index + ':' + run.task;
    if (!run.answered.includes(key)) {
      run.answered.push(key);
      run.enzyme++;
    }
    run.task++;
    if (run.task === BOSSES[run.character][ROUTE[run.index].id].length) {
      run.completed ??= [];
      if (!run.completed.includes(ROUTE[run.index].id)) run.completed.push(ROUTE[run.index].id);
      run.task = 0;
      run.phase = 'reaction';
    }
  } else if (run.phase === 'absorb-choice') {
    run.absorptionPassed = true;
    run.phase = 'absorption';
  } else {
    run.anatomy++;
    run.index++;
    run.phase = 'arrival';
  }
  return true;
}
export function retryDigestion(run) {
  if (run.phase !== 'retry') return;
  run.lives = 2;
  run.task = 0;
  if (run.retryFrom === 'entry') {
    run.phase = 'entry';
    return;
  }
  if (run.retryFrom === 'absorb-choice') {
    run.phase = 'absorb-choice';
    return;
  }
  run.phase = run.retryFrom === 'boss' ? 'boss' : 'route';
}
export function validDigestion(data) {
  const finite = (n) => Number.isFinite(n) && n >= 0;
  const run = (r) =>
    r &&
    Object.hasOwn(CHARACTERS, r.character) &&
    Number.isInteger(r.index) &&
    r.index >= 0 &&
    r.index < (r.routeVersion === 3 ? ROUTE.length : 18) &&
    Number.isInteger(r.task) &&
    r.task >= 0 &&
    r.task <
      (r.routeVersion === 3
        ? Math.max(1, BOSSES[r.character][ROUTE[r.index]?.id]?.length || 1)
        : 3) &&
    [
      'entry',
      'swallow',
      'secretion',
      'intro',
      'arrival',
      'route',
      'boss',
      'reaction',
      'absorption',
      'absorb-choice',
      'finale',
      'won',
      'retry',
    ].includes(r.phase) &&
    Number.isInteger(r.lives) &&
    r.lives >= 0 &&
    r.lives <= 2 &&
    (r.answered === undefined ||
      (Array.isArray(r.answered) &&
        r.answered.length <= 12 &&
        r.answered.every((k) => typeof k === 'string' && /^\d+:[0-4]$/.test(k)))) &&
    (r.routeVersion === undefined || r.routeVersion === 3) &&
    (r.completed === undefined ||
      (Array.isArray(r.completed) && r.completed.every((id) => ROUTE.some((s) => s.id === id)))) &&
    (r.product === undefined || Object.hasOwn(PRODUCTS, r.product)) &&
    (r.absorbed === undefined || typeof r.absorbed === 'boolean') &&
    (r.animation === undefined ||
      (r.animation &&
        ROUTE.some((s) => s.id === r.animation.stage) &&
        [
          'intro',
          'face-intro',
          'travel',
          'boss',
          'residue',
          'reaction',
          'swallow',
          'absorb',
          'transport',
          'finale',
          'secretion',
          'brush-border',
          'bile',
        ].includes(r.animation.mode) &&
        Number.isFinite(r.animation.age) &&
        r.animation.age >= 0 &&
        r.animation.age <= 3600)) &&
    ['errors', 'anatomy', 'enzyme', 'started', 'elapsed'].every((k) => finite(r[k]));
  return (
    data &&
    typeof data === 'object' &&
    (!data.active || run(data.active)) &&
    (data.settings === undefined ||
      (data.settings &&
        typeof data.settings.sound === 'boolean' &&
        typeof data.settings.motion === 'boolean' &&
        Number.isFinite(data.settings.volume) &&
        data.settings.volume >= 0 &&
        data.settings.volume <= 1 &&
        ['auto', 'low'].includes(data.settings.quality) &&
        ['ambient', 'effects', 'map'].every(
          (k) => data.settings[k] === undefined || typeof data.settings[k] === 'boolean',
        ))) &&
    (data.learningLog === undefined ||
      (Array.isArray(data.learningLog) &&
        data.learningLog.length <= 200 &&
        data.learningLog.every(validLearningPoint))) &&
    (data.learningCurrent === undefined || validLearningPoint(data.learningCurrent)) &&
    data.results &&
    typeof data.results === 'object' &&
    !Array.isArray(data.results) &&
    (data.assessments === undefined ||
      (data.assessments &&
        typeof data.assessments === 'object' &&
        !Array.isArray(data.assessments) &&
        Object.entries(data.assessments).every(
          ([k, rs]) =>
            Object.hasOwn(CHARACTERS, k) &&
            Array.isArray(rs) &&
            rs.length <= 20 &&
            rs.every((r) => validAssessmentResult(r, k)),
        ))) &&
    (data.assessmentDraft === undefined || validAssessmentDraft(data.assessmentDraft)) &&
    (data.reviewDraft === undefined || validReviewDraft(data.reviewDraft)) &&
    Object.entries(data.results).every(
      ([k, r]) => Object.hasOwn(CHARACTERS, k) && run(r) && r.phase === 'won',
    )
  );
}

// Reject duplicates, omitted steps and unknown tokens; correctness does not depend on UI order.
export function correctReaction(order, count = 3) {
  return (
    Array.isArray(order) &&
    order.length === count &&
    new Set(order).size === count &&
    order.every((n, i) => Number.isInteger(n) && n === i)
  );
}
export function shuffled(values, random = Math.random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
// Monotonic, session-local clock: closed tabs and time away can never be added on resume.
export function activeClock(run, now = () => performance.now()) {
  let last = null;
  return {
    tick(active = true) {
      const t = now();
      if (last !== null && active) run.elapsed += Math.max(0, t - last);
      last = active ? t : null;
      return run.elapsed;
    },
    pause() {
      this.tick();
      last = null;
    },
    resume() {
      if (last === null) last = now();
    },
  };
}
export function reactionState(seconds, character, organ) {
  const chemical = !(
    (organ === 'mouth' && character !== 'stanley') ||
    (organ === 'stomach' && character === 'stanley')
  );
  if (!chemical)
    return {
      phase: organ === 'stomach' ? 'inhibition' : 'mechanical',
      progress: Math.min(1, seconds / 6),
      cut: false,
    };
  const lead =
    character === 'poul' && organ === 'stomach'
      ? 'denaturation'
      : character === 'trine' && organ === 'duodenum'
        ? 'emulsification'
        : 'approach';
  return {
    phase:
      seconds < 2
        ? lead
        : seconds < 3
          ? 'binding'
          : seconds < 4
            ? 'hydrolysis'
            : seconds < 6
              ? 'products'
              : 'release',
    progress: Math.min(1, Math.max(0, (seconds - 3) / 3)),
    cut: seconds >= 3,
  };
}
export function relativeActivity(ph, enzyme) {
  const [peak, width] =
    enzyme === 'pepsin'
      ? [2, 1.9]
      : enzyme === 'gastrisk lipase'
        ? [4, 1.8]
        : enzyme === 'amylase'
          ? [6.8, 1.8]
          : [7, 2.1];
  return Math.exp(-0.5 * ((ph - peak) / width) ** 2);
}

export function initialProduct(id) {
  return { stanley: 'polysaccharide', trine: 'triglyceride', poul: 'protein' }[id];
}
export function enzymeTotal(id) {
  return Object.values(BOSSES[id]).reduce((n, qs) => n + qs.length, 0);
}
// Old trophies remain byte-for-byte intact. An interrupted old run resumes at
// the corresponding anatomical checkpoint, with its current challenge restarted.
export function migrateDigestion(data) {
  const r = structuredClone(data.active);
  if (!r || r.routeVersion === 3) return data;
  data.active = r;
  const old = [
    'mouth',
    'pharynx',
    'oesophagus',
    'cardia',
    'stomach',
    'pylorus',
    'duodenum',
    'jejunum',
    'ileum',
    'ileocaecal',
    'caecum',
    'ascending',
    'transverse',
    'descending',
    'sigmoid',
    'rectum',
    'anal',
    'anus',
  ];
  const removed = { cardia: 'stomach', pylorus: 'duodenum', ileocaecal: 'caecum', anal: 'anus' };
  const id = removed[old[r.index]] || old[r.index];
  const index = ROUTE.findIndex((s) => s.id === id);
  if (index < 0) {
    delete data.active;
    return data;
  }
  r.routeVersion = 3;
  r.index = index;
  r.task = 0;
  if (index > ROUTE.findIndex((s) => s.id === 'jejunum')) {
    r.absorbed = true;
    r.absorptionPassed = true;
  }
  r.answered = [];
  r.enzyme = 0;
  r.completed = ROUTE.slice(0, index)
    .filter((s) => BOSSES[r.character][s.id])
    .map((s) => s.id);
  if (r.absorbed && id === 'jejunum' && BOSSES[r.character].jejunum) r.completed.push('jejunum');
  r.answered = ROUTE.filter((s) => r.completed.includes(s.id)).flatMap((s) =>
    BOSSES[r.character][s.id].map((_, i) => s.index + ':' + i),
  );
  r.enzyme = r.answered.length;
  r.product = initialProduct(r.character);
  for (const s of ROUTE.filter((s) => r.completed.includes(s.id)))
    r.product = BOSSES[r.character][s.id].at(-1).output;
  if (r.absorbed) r.product = 'residue';
  if (!['entry', 'intro', 'won'].includes(r.phase)) r.phase = 'arrival';
  r.lives = Math.max(1, r.lives);
  return data;
}

function validLearningPoint(p) {
  return (
    p &&
    Object.hasOwn(CHARACTERS, p.character) &&
    ROUTE.some((s) => s.id === p.stage) &&
    typeof p.key === 'string' &&
    p.key.length <= 160 &&
    typeof p.short === 'string' &&
    p.short.length <= 400 &&
    typeof p.detail === 'string' &&
    p.detail.length <= 4000 &&
    typeof p.title === 'string' &&
    p.title.length <= 160
  );
}
