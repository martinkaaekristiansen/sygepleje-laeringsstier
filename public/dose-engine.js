// Deterministic, DOM-free engine. No drug names, case-specific branches or network.
export const CATEGORIES = [
  'Symptomer',
  'Objektive observationer',
  'Blodprøver',
  'Medicin',
  'Sygdomshistorie',
  'Medicineringsfejl',
  'Risikofaktorer',
  'Hypoteser',
  'Patientsikkerhed',
  'Øvrige oplysninger',
];
const plain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v, n = 20000) => typeof v === 'string' && v.length <= n;
const idOK = (v) => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(v);
export function satisfies(rule, state) {
  if (rule === undefined) return true;
  if (!plain(rule) || Object.keys(rule).length !== 1) return false;
  if (rule.all)
    return (
      Array.isArray(rule.all) && rule.all.length > 0 && rule.all.every((r) => satisfies(r, state))
    );
  if (rule.any)
    return (
      Array.isArray(rule.any) && rule.any.length > 0 && rule.any.some((r) => satisfies(r, state))
    );
  if (rule.seen) return state.visited.includes(rule.seen);
  if (rule.found) return state.found.includes(rule.found);
  if (rule.hypothesis) return state.hypotheses.some((h) => h.choice === rule.hypothesis);
  return false;
}
export function freshState(data) {
  return {
    schema: 1,
    version: data.version,
    caseId: data.id,
    revision: 0,
    status: 'active',
    scene: data.start,
    visited: [],
    found: [],
    notes: [],
    links: [],
    hypotheses: [],
    hints: [],
    drafts: {},
    report: null,
    evaluation: null,
    uth: {},
    updatedAt: 0,
  };
}
export const sceneBlocks = (scene, state) => scene.blocks.filter((b) => satisfies(b.when, state));
export const availableScenes = (data, state) =>
  data.scenes.filter(
    (s) => s.id !== data.start && !state.visited.includes(s.id) && satisfies(s.when, state),
  );
export function visitScene(data, state, id) {
  const scene = data.scenes.find((s) => s.id === id);
  if (!scene || !satisfies(scene.when, state)) return false;
  state.scene = id;
  if (!state.visited.includes(id)) state.visited.push(id);
  for (const b of sceneBlocks(scene, state))
    if (!state.found.includes(b.id)) state.found.push(b.id);
  return true;
}
export function addNote(
  state,
  { content, source = state.scene, clue = '', category = CATEGORIES.at(-1), comment = '' },
) {
  if (
    !text(content) ||
    !content.trim() ||
    state.notes.length >= 300 ||
    !CATEGORIES.includes(category)
  )
    return false;
  const id = 'n-' + ((state.noteSequence || 0) + 1);
  state.noteSequence = (state.noteSequence || 0) + 1;
  state.notes.push({
    id,
    content: content.trim(),
    source,
    clue,
    category,
    comment: comment.slice(0, 5000),
    x: 10 + (state.notes.length % 3) * 29,
    y: 10 + (Math.floor(state.notes.length / 3) % 6) * 14,
    pinned: false,
  });
  return id;
}
export function removeNote(state, id) {
  state.notes = state.notes.filter((n) => n.id !== id);
  state.links = state.links.filter((l) => l.from !== id && l.to !== id);
}
export function connectNotes(state, from, to, label) {
  if (
    from === to ||
    ![from, to].every((id) => state.notes.some((n) => n.id === id)) ||
    state.links.length >= 300 ||
    !text(label, 2000)
  )
    return false;
  if (state.links.some((l) => l.from === from && l.to === to && l.label === label.trim()))
    return false;
  state.links.push({ from, to, label: label.trim() });
  return true;
}
export function recordHypothesis(
  state,
  { checkpoint, choice, content, confidence, evidence = [] },
) {
  if (
    !Number.isInteger(checkpoint) ||
    checkpoint < 1 ||
    checkpoint > 3 ||
    !text(choice, 300) ||
    !text(content, 5000) ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 100 ||
    !Array.isArray(evidence) ||
    evidence.some((id) => !state.found.includes(id))
  )
    return false;
  state.hypotheses.push({
    checkpoint,
    choice,
    content,
    confidence,
    evidence: [...new Set(evidence)],
    at: state.visited.length,
  });
  return true;
}
export function currentHint(data, state, level) {
  const group = [...data.hints].reverse().find((h) => satisfies(h.when, state));
  return group?.levels[Math.max(0, Math.min(2, level - 1))] || '';
}
export function evaluate(data, answers) {
  const results = data.assessment.map((q) => {
    const answer = answers[q.id];
    let correct = false;
    if (q.type === 'number')
      correct =
        typeof answer === 'number' &&
        Number.isFinite(answer) &&
        Math.abs(answer - q.correct) <= (q.tolerance || 0);
    else if (q.type === 'order')
      correct = Array.isArray(answer) && answer.join('|') === q.correct.join('|');
    else if (q.type === 'multi')
      correct =
        Array.isArray(answer) &&
        [...new Set(answer)].sort().join('|') === [...q.correct].sort().join('|');
    else if (q.type === 'match')
      correct = plain(answer) && Object.keys(q.correct).every((k) => answer[k] === q.correct[k]);
    else correct = answer === q.correct;
    return { id: q.id, correct, points: correct ? q.points : 0, max: q.points };
  });
  return {
    total: results.reduce((n, q) => n + q.points, 0),
    max: results.reduce((n, q) => n + q.max, 0),
    results,
  };
}
export function restoreState(data, raw) {
  if (
    !plain(raw) ||
    raw.schema !== 1 ||
    raw.caseId !== data.id ||
    !Number.isInteger(raw.version) ||
    !Number.isInteger(raw.revision) ||
    raw.revision < 0
  )
    throw Error('Ukendt gemmeformat');
  if (raw.version > data.version) throw Error('Sagen er gemt med en nyere caseversion');
  const stringArray = (a, max = 500) => Array.isArray(a) && a.length <= max && a.every(idOK);
  if (
    !['active', 'complete'].includes(raw.status) ||
    !idOK(raw.scene) ||
    !stringArray(raw.visited) ||
    !stringArray(raw.found) ||
    !Array.isArray(raw.notes) ||
    raw.notes.length > 300 ||
    !Array.isArray(raw.links) ||
    raw.links.length > 300 ||
    !Array.isArray(raw.hypotheses) ||
    raw.hypotheses.length > 300 ||
    !Array.isArray(raw.hints) ||
    raw.hints.length > 300 ||
    !plain(raw.drafts) ||
    !plain(raw.uth)
  )
    throw Error('Beskadigede sagsdata');
  if (
    raw.notes.some(
      (n) =>
        !plain(n) ||
        !idOK(n.id) ||
        !text(n.content) ||
        !text(n.comment, 5000) ||
        !text(n.source, 100) ||
        !text(n.clue, 100) ||
        !CATEGORIES.includes(n.category) ||
        !Number.isFinite(n.x) ||
        !Number.isFinite(n.y) ||
        typeof n.pinned !== 'boolean',
    ) ||
    new Set(raw.notes.map((n) => n.id)).size !== raw.notes.length
  )
    throw Error('Beskadigede noter');
  if (
    raw.links.some(
      (l) =>
        !plain(l) ||
        !raw.notes.some((n) => n.id === l.from) ||
        !raw.notes.some((n) => n.id === l.to) ||
        !text(l.label, 2000),
    )
  )
    throw Error('Beskadiget tavle');
  if (
    raw.hypotheses.some(
      (h) =>
        !plain(h) ||
        ![1, 2, 3].includes(h.checkpoint) ||
        !text(h.choice, 300) ||
        !text(h.content, 5000) ||
        !Number.isFinite(h.confidence) ||
        h.confidence < 0 ||
        h.confidence > 100 ||
        !stringArray(h.evidence),
    )
  )
    throw Error('Beskadigede hypoteser');
  if (
    Object.values(raw.drafts).some((v) => !text(v)) ||
    Object.values(raw.uth).some((v) => !text(v)) ||
    raw.hints.some((h) => !plain(h) || !text(h.text, 3000) || ![1, 2, 3].includes(h.level))
  )
    throw Error('Beskadigede fritekstfelter');
  if (
    raw.report !== null &&
    (!plain(raw.report) ||
      !Array.isArray(raw.report.evidence) ||
      !raw.report.evidence.every(idOK) ||
      !plain(raw.report.free) ||
      Object.values(raw.report.free).some((v) => !text(v)) ||
      !plain(raw.report.answers))
  )
    throw Error('Beskadiget slutrapport');
  const next = structuredClone(raw),
    ids = data.scenes.map((s) => s.id),
    clues = data.scenes.flatMap((s) => s.blocks.map((b) => b.id));
  next.visited = [...new Set(next.visited.filter((id) => ids.includes(id)))];
  next.found = [...new Set(next.found.filter((id) => clues.includes(id)))];
  next.scene = ids.includes(next.scene) ? next.scene : data.start;
  next.noteSequence = Math.max(0, ...next.notes.map((n) => Number(n.id.replace('n-', '')) || 0));
  next.notes.forEach((n) => {
    n.x = Math.max(0, Math.min(80, n.x));
    n.y = Math.max(0, Math.min(82, n.y));
  });
  next.evaluation =
    next.status === 'complete' && next.report ? evaluate(data, next.report.answers) : null;
  if (!next.evaluation) next.status = 'active';
  if (next.version !== data.version) {
    next.version = data.version;
    next.report = null;
    next.evaluation = null;
    next.status = 'active';
  }
  return next;
}
export function caseErrors(data) {
  const errors = [],
    fail = (s) => errors.push(s);
  if (
    !plain(data) ||
    !idOK(data.id) ||
    !Number.isInteger(data.version) ||
    data.version < 1 ||
    !Array.isArray(data.scenes) ||
    !Array.isArray(data.assessment)
  )
    return ['Ugyldig case'];
  if (
    data.scenes.some(
      (s) => !plain(s) || !Array.isArray(s.blocks) || s.blocks.some((b) => !plain(b)),
    ) ||
    data.assessment.some((q) => !plain(q))
  )
    return ['Ugyldigt scene- eller spørgsmålsformat'];
  const scenes = new Set(),
    clues = new Set(),
    questions = new Set();
  for (const s of data.scenes) {
    if (!idOK(s.id) || scenes.has(s.id)) fail('Dubleret/ugyldigt scene-ID: ' + s.id);
    scenes.add(s.id);
    if (
      !s.title ||
      !s.illustration ||
      !data.images?.[s.illustration]?.src ||
      !data.images?.[s.illustration]?.alt ||
      !s.blocks.length
    )
      fail('Manglende sceneindhold/billede: ' + s.id);
    for (const b of s.blocks || []) {
      if (!idOK(b.id) || clues.has(b.id) || !b.text) fail('Dubleret/ugyldigt spor: ' + b.id);
      clues.add(b.id);
    }
  }
  const ruleOK = (r, path, depth = 0) => {
    if (r === undefined) return;
    if (depth > 30 || !plain(r) || Object.keys(r).length !== 1)
      return fail('Ugyldig betingelse: ' + path);
    const [k, v] = Object.entries(r)[0];
    if (['all', 'any'].includes(k)) {
      if (!Array.isArray(v) || !v.length) fail('Tom betingelse: ' + path);
      else v.forEach((t) => ruleOK(t, path, depth + 1));
    } else if (k === 'seen') {
      if (!scenes.has(v)) fail('Ukendt scene: ' + v);
    } else if (k === 'found') {
      if (!clues.has(v)) fail('Ukendt spor: ' + v);
    } else if (k === 'hypothesis') {
      if (!data.hypothesisOptions?.some((o) => o.id === v)) fail('Ukendt hypotese: ' + v);
    } else fail('Ukendt regel: ' + k);
  };
  for (const s of data.scenes) {
    ruleOK(s.when, s.id);
    for (const b of s.blocks || []) ruleOK(b.when, b.id);
  }
  for (const h of data.hints || []) {
    ruleOK(h.when, 'hint');
    if (h.levels?.length !== 3) fail('Hint kræver tre niveauer');
  }
  if (!scenes.has(data.start) || data.scenes.find((s) => s.id === data.start)?.when !== undefined)
    fail('Ugyldig startscene');
  // Monotone AND/OR closure catches circular locks and unreachable critical clues.
  const reached = freshState(data);
  reached.hypotheses = (data.hypothesisOptions || []).map((o) => ({ choice: o.id }));
  for (let i = 0; i <= data.scenes.length; i++)
    for (const s of data.scenes) if (satisfies(s.when, reached)) visitScene(data, reached, s.id);
  for (const s of data.scenes)
    if (!reached.visited.includes(s.id)) fail('Uopnåelig scene/cirkulær afhængighed: ' + s.id);
  for (const id of data.critical || [])
    if (!reached.found.includes(id)) fail('Uopnåeligt kritisk spor: ' + id);
  const withoutHypotheses = freshState(data);
  for (let i = 0; i <= data.scenes.length; i++)
    for (const s of data.scenes)
      if (satisfies(s.when, withoutHypotheses)) visitScene(data, withoutHypotheses, s.id);
  for (const id of data.critical || [])
    if (!withoutHypotheses.found.includes(id)) fail('Kritisk spor kræver bestemt hypotese: ' + id);
  for (const q of data.assessment) {
    if (
      !idOK(q.id) ||
      questions.has(q.id) ||
      !q.prompt ||
      !q.explanation ||
      q.correct === undefined ||
      !Number.isInteger(q.points) ||
      q.points <= 0
    )
      fail('Ugyldigt spørgsmål/point/facit: ' + q.id);
    questions.add(q.id);
    const opts = q.options?.map((o) => o.id) || [];
    if (
      new Set(opts).size !== opts.length ||
      !['choice', 'multi', 'number', 'order', 'match'].includes(q.type)
    )
      fail('Ugyldige svar: ' + q.id);
    if (q.type === 'choice' && !opts.includes(q.correct)) fail('Manglende facitmulighed: ' + q.id);
    if (
      ['multi', 'order'].includes(q.type) &&
      (!Array.isArray(q.correct) ||
        q.correct.some((id) => !opts.includes(id)) ||
        (q.type === 'order' && q.correct.length !== opts.length))
    )
      fail('Ugyldigt facit: ' + q.id);
    if (q.type === 'number' && !Number.isFinite(q.correct)) fail('Ugyldigt talfacit: ' + q.id);
    if (
      q.type === 'match' &&
      (!plain(q.correct) ||
        !q.pairs?.length ||
        q.pairs.some((p) => !opts.includes(q.correct[p.id])))
    )
      fail('Ugyldige forbindelser: ' + q.id);
  }
  if (data.assessment.reduce((n, q) => n + q.points, 0) !== 100) fail('Point skal summere til 100');
  if (
    !data.sources?.length ||
    data.sources.some((s) => !s.id || !s.title || !/^https:\/\//.test(s.url))
  )
    fail('Manglende kilder');
  for (const s of data.scenes)
    for (const id of s.sources || [])
      if (!data.sources.some((r) => r.id === id)) fail('Ukendt kildereference: ' + id);
  if (!data.reconstruction?.length || !data.freeQuestions?.length) fail('Manglende afslutning');
  return errors;
}
