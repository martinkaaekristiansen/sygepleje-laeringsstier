// One cancellable animation sequence. Pauses and saved age share the scene clock;
// slow rendering cannot advance before the final teaching pose has been shown.
export function createSequenceRunner({
  schedule = setTimeout,
  unschedule = clearTimeout,
  now = () => performance.now(),
} = {}) {
  let current = null,
    timer = null,
    paused = false,
    generation = 0;
  function cancel() {
    generation++;
    if (timer !== null) unschedule(timer);
    timer = null;
    current = null;
  }
  function tick() {
    if (!current || paused) return;
    const t = now();
    current.elapsed += Math.max(0, t - current.last) / 1000;
    current.last = t;
  }
  function arm() {
    if (!current || paused || timer !== null) return;
    const pending = current,
      token = generation;
    timer = schedule(() => {
      if (token !== generation) return;
      timer = null;
      if (paused || current !== pending) return;
      // The scene reports rendered age, including a restored checkpoint. Reduced
      // motion shows the completed pose, but retains the same reading duration.
      tick();
      if ((pending.animated() ? pending.age() : pending.elapsed) >= pending.seconds) {
        current = null;
        pending.next();
      } else arm();
    }, 100);
  }
  return {
    get active() {
      return current !== null;
    },
    get age() {
      tick();
      return current ? (current.animated() ? current.age() : current.elapsed) : 0;
    },
    start({ seconds, age, initialAge = 0, animated = () => true, next }) {
      cancel();
      current = { seconds, age, animated, next, elapsed: initialAge, last: now() };
      arm();
    },
    pause(value) {
      tick();
      if (paused !== value) generation++;
      paused = value;
      if (!paused && current) current.last = now();
      if (paused && timer !== null) {
        unschedule(timer);
        timer = null;
      }
      if (!paused) arm();
    },
    cancel,
  };
}
