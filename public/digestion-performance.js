// Adapt render resolution only: anatomy and learning animations stay complete.
export function renderBudget(deviceRatio = 1) {
  const maximum = Math.min(2, Math.max(1, deviceRatio));
  let ratio = maximum, elapsed = 0, frames = 0;
  return {
    get ratio() { return ratio; },
    sample(ms) {
      if (ms <= 0 || ms > 250) return false; // Ignore background tabs and long loading stalls.
      elapsed += ms; frames++;
      if (elapsed < 3000) return false;
      const average = elapsed / frames;
      const next = average > 32 ? Math.max(0.8, ratio - 0.2)
        : average < 19 ? Math.min(maximum, ratio + 0.1) : ratio;
      elapsed = 0; frames = 0;
      const changed = Math.abs(next - ratio) > 0.001;
      ratio = Math.round(next * 100) / 100;
      return changed;
    },
  };
}
