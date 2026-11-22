// Shared pool selection/review structure. Game adapters own their content and
// validation; the original digestion question identities and scores are kept.
export function selectAssessmentIds(pool, previous, random = Math.random, count = 5) {
  const ids = pool.map((q) => q.id);
  if (ids.length < count || new Set(ids).size !== ids.length)
    throw Error('Ugyldig spørgsmålspulje.');
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const selected = ids.slice(0, count);
  if (
    ids.length > count &&
    previous?.questionIds?.length === count &&
    previous.questionIds.every((id) => selected.includes(id))
  )
    selected[count - 1] = ids.find((id) => !previous.questionIds.includes(id));
  return selected;
}
export function reviewFromResult(result) {
  const indices = result.answers.map((answer, i) => (answer !== 0 ? i : -1)).filter((i) => i >= 0);
  return indices.length
    ? {
        character: result.character,
        questionIds: result.questionIds ? [...result.questionIds] : undefined,
        answers: [],
        review: { indices, cursor: 0, correct: 0, pending: false },
      }
    : null;
}
