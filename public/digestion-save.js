export const CHECKPOINT_INTERVAL = 15000;

// capture() is synchronous so lifecycle events always capture the latest state.
// save() already snapshots/serializes in app.js; never replay an older snapshot.
export function createCheckpointSaver({ capture, save, onResult = () => {} }) {
  let requested = 0,
    completed = 0,
    running = false;
  const waiters = [];
  async function drain() {
    if (running) return;
    running = true;
    try {
      while (completed < requested) {
        const version = requested;
        let ok;
        try {
          ok = (await save()) !== false;
        } catch {
          ok = false;
        }
        completed = version;
        for (let i = waiters.length - 1; i >= 0; i--)
          if (waiters[i].version <= version) waiters.splice(i, 1)[0].resolve(ok);
        if (completed === requested) onResult(ok);
      }
    } finally {
      running = false;
    }
  }
  return {
    request() {
      capture();
      const version = ++requested;
      const promise = new Promise((resolve) => waiters.push({ version, resolve }));
      void drain();
      return promise;
    },
    get pending() {
      return completed < requested;
    },
  };
}
