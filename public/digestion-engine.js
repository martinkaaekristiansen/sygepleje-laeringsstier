import { ROUTE, CHARACTERS, BOSSES } from './digestion-data.js';
export function newDigestion(character) {
  if (!Object.hasOwn(CHARACTERS, character)) throw Error('Ukendt næringsstof');
  return {
    character,
    index: 0,
    task: 0,
    phase: 'intro',
    lives: 2,
    errors: 0,
    answered: [],
    anatomy: 0,
    enzyme: 0,
    started: Date.now(),
    elapsed: 0,
  };
}
export function chooseDigestion(run, correct) {
  if (!['route', 'boss'].includes(run.phase)) return false;
  if (!correct) {
    run.errors++;
    run.lives--;
    if (!run.lives) run.phase = 'retry';
    return false;
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
      'intro',
      'arrival',
      'route',
      'boss',
      'reaction',
      'absorption',
      'finale',
      'won',
      'retry',
    ].includes(r.phase) &&
    Number.isInteger(r.lives) &&
    r.lives >= 0 &&
    r.lives <= 2 &&
    ['errors', 'anatomy', 'enzyme', 'started', 'elapsed'].every((k) => finite(r[k]));
  return (
    data &&
    typeof data === 'object' &&
    (!data.active || run(data.active)) &&
    data.results &&
    typeof data.results === 'object' &&
    !Array.isArray(data.results) &&
    Object.entries(data.results).every(
      ([k, r]) => Object.hasOwn(CHARACTERS, k) && run(r) && r.phase === 'won',
    )
  );
}
