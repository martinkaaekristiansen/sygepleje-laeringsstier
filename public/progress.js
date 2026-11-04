// Progress is based on completed steps, not quiz scores or time spent.
export function getPathProgress(path, record) {
  const state = record && typeof record === 'object' ? record : {};
  const total = path.steps.length;
  const done = new Set((Array.isArray(state.done) ? state.done : [])
    .map(i => typeof i === 'string' ? path.steps.findIndex(s => s.id === i) : i)
    .filter(i => Number.isInteger(i) && i >= 0 && i < total));
  const last = typeof state.last === 'string' ? path.steps.findIndex(s => s.id === state.last) : state.last;
  const hasLast = Number.isInteger(last) && last >= 0;
  const hasNotes = state.notes && Object.values(state.notes)
    .some(note => typeof note === 'string' && note.trim().length > 0);
  const started = state.started === true || done.size > 0 || hasLast || Boolean(hasNotes);
  const complete = total > 0 && done.size === total;
  return {
    started,
    complete,
    completed: done.size,
    total,
    percent: complete ? 100 : total ? Math.min(99, Math.round(done.size / total * 100)) : 0,
    lastIndex: total ? Math.min(hasLast ? last : 0, total - 1) : 0,
    updatedAt: Number.isFinite(state.updatedAt) ? state.updatedAt : 0,
  };
}

export function getInProgressPaths(paths, progress) {
  return paths.map(path => ({ path, ...getPathProgress(path, progress[path.id]) }))
    .filter(item => item.total > 0 && item.started && !item.complete)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
