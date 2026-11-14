import { ROUTE, CHARACTERS, BOSSES } from './digestion-data.js';
export function newDigestion(character) {
  if (!Object.hasOwn(CHARACTERS, character)) throw Error('Ukendt næringsstof');
  return {
    character,
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
  run.phase = BOSSES[run.character][ROUTE[run.index].id] ? 'boss' : 'route';
}
export function validDigestion(data) {
  const finite = (n) => Number.isFinite(n) && n >= 0;
  const run = (r) =>
    r &&
    Object.hasOwn(CHARACTERS, r.character) &&
    Number.isInteger(r.index) &&
    r.index >= 0 &&
    r.index < ROUTE.length &&
    Number.isInteger(r.task) &&
    r.task >= 0 &&
    r.task < 3 &&
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
        r.answered.length <= 9 &&
        r.answered.every((k) => typeof k === 'string' && /^\d+:[012]$/.test(k)))) &&
    (r.absorbed === undefined || typeof r.absorbed === 'boolean') &&
    ['errors', 'anatomy', 'enzyme', 'started', 'elapsed'].every((k) => finite(r[k]));
  return (
    data &&
    typeof data === 'object' &&
    (!data.active || run(data.active)) &&
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
            rs.every(
              (r) =>
                r.character === k &&
                Array.isArray(r.answers) &&
                r.answers.length === 5 &&
                r.answers.every((a) => Number.isInteger(a) && a >= 0 && a < 3) &&
                r.total === 5 &&
                r.correct === r.answers.filter((a) => a === 0).length &&
                typeof r.date === 'string',
            ),
        ))) &&
    (data.assessmentDraft === undefined ||
      (data.assessmentDraft &&
        Object.hasOwn(CHARACTERS, data.assessmentDraft.character) &&
        Array.isArray(data.assessmentDraft.answers) &&
        data.assessmentDraft.answers.length < 5 &&
        data.assessmentDraft.answers.every((a) => Number.isInteger(a) && a >= 0 && a < 3))) &&
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
      last = now();
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
