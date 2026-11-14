import { repetitionNeeds } from './circulation-engine.js';
import { ACTIVITIES, BLOOD_LEVELS, CIRCULATION_ID } from './circulation-data.js';

export function getReviewItems(paths, progress) {
  return paths.flatMap((path) => {
    const record = progress[path.id] || {};
    const items = path.steps.flatMap((step) => {
      const wrong = (step.questions || []).filter(
        (q) =>
          record.answers?.[step.id]?.[q.id] &&
          record.answers[step.id][q.id] !== q.optionIds[q.correct],
      );
      const base = { pathId: path.id, pathTitle: path.title, stepId: step.id };
      return [
        ...(record.reviewSteps?.includes(step.id)
          ? [{ ...base, title: step.title, reason: 'Opdateret indhold – gennemgå trinnet igen' }]
          : []),
        ...wrong.map((q) => ({
          ...base,
          title: q.q,
          reason: 'Forkert svar – øv spørgsmålet igen',
        })),
      ];
    });
    if (path.id === CIRCULATION_ID && record.circulation) {
      for (const [level, metadata] of Object.entries(BLOOD_LEVELS)) {
        const needs = Object.keys(repetitionNeeds(record.circulation, level));
        for (const [activity, title] of ACTIVITIES) {
          const result = record.circulation.results?.[`${level}:${activity}`];
          if ((result && !result.last?.passed) || (activity === 'context' && needs.length)) {
            items.push({
              pathId: path.id,
              pathTitle: path.title,
              stepId: `circulation-${activity}`,
              level,
              title: `${metadata.name}: ${title}`,
              reason:
                activity === 'context' && needs.length
                  ? 'Anatomiske områder til repetition: ' +
                    needs
                      .map((id) => metadata.steps.find((s) => s.id === id)?.name || id)
                      .join(', ')
                  : 'Seneste forsøg er ikke bestået',
            });
          }
        }
      }
    }
    return items;
  });
}
// Progress is based on completed steps, not quiz scores or time spent.
export function getPathProgress(path, record) {
  const state = record && typeof record === 'object' ? record : {};
  const total = path.steps.length;
  const done = new Set(
    (Array.isArray(state.done) ? state.done : [])
      .map((i) => (typeof i === 'string' ? path.steps.findIndex((s) => s.id === i) : i))
      .filter((i) => Number.isInteger(i) && i >= 0 && i < total),
  );
  const last =
    typeof state.last === 'string' ? path.steps.findIndex((s) => s.id === state.last) : state.last;
  const hasLast = Number.isInteger(last) && last >= 0;
  const hasNotes =
    state.notes &&
    Object.values(state.notes).some((note) => typeof note === 'string' && note.trim().length > 0);
  const started = state.started === true || done.size > 0 || hasLast || Boolean(hasNotes);
  const complete = total > 0 && done.size === total;
  const wrongSteps = path.steps
    .filter((step) =>
      step.questions?.some(
        (q) =>
          state.answers?.[step.id]?.[q.id] &&
          state.answers[step.id][q.id] !== q.optionIds?.[q.correct],
      ),
    )
    .map((s) => s.id);
  const assessmentNeeds = Object.entries(state.circulation?.results || {}).filter(
    ([key, r]) => /:(order|context)$/.test(key) && !r.last?.passed,
  );
  const reviewSteps = [...new Set([...(state.reviewSteps || []), ...wrongSteps])].filter((id) =>
    path.steps.some((s) => s.id === id),
  );
  const repetition =
    state.circulation &&
    Object.keys(BLOOD_LEVELS).some(
      (level) => Object.keys(repetitionNeeds(state.circulation, level)).length > 0,
    );
  const needsReview = reviewSteps.length > 0 || assessmentNeeds.length > 0 || Boolean(repetition);
  return {
    needsReview,
    reviewSteps,
    started,
    complete,
    completed: done.size,
    total,
    percent: complete ? 100 : total ? Math.min(99, Math.round((done.size / total) * 100)) : 0,
    lastIndex: total ? Math.min(hasLast ? last : 0, total - 1) : 0,
    updatedAt: Number.isFinite(state.updatedAt) ? state.updatedAt : 0,
  };
}

export function getInProgressPaths(paths, progress) {
  return paths
    .map((path) => ({ path, ...getPathProgress(path, progress[path.id]) }))
    .filter((item) => item.total > 0 && item.started && (!item.complete || item.needsReview))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

// Academic mastery is independent of the ordinary "done" step checklist.
export function getAssessmentProgress(record) {
  const activeKeys = Object.keys(BLOOD_LEVELS).flatMap((level) =>
    ACTIVITIES.map(([id]) => `${level}:${id}`),
  );
  const results = activeKeys.flatMap((key) =>
    record?.circulation?.results?.[key] ? [record.circulation.results[key]] : [],
  );
  return {
    submitted: results.length,
    passed: results.filter((r) => r.passed).length,
    total: activeKeys.length,
    attempts: results.reduce((n, r) => n + r.attempts, 0),
  };
}
