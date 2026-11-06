import {
  routeFor,
  uniqueRoute,
  SYNONYMS,
  circuitFor,
  OXYGEN,
  CIRCUITS,
} from './circulation-data.js';
import { CIRCULATION_CONFIG as config } from './circulation-config.js';
export const normalizeAnswer = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
export function accepts(node, answer) {
  const names = [
    node.name,
    node.name.split(' (')[0],
    ...(node.name
      .match(/\(([^)]+)\)/)
      ?.slice(1)
      .filter((n) => !n.startsWith('omkring ')) || []),
    ...(SYNONYMS[node.id] || []),
  ];
  return names.some((n) => normalizeAnswer(n) === normalizeAnswer(answer));
}
export function shuffle(items, random = Math.random) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (a.length > 1 && a.every((v, i) => v === items[i])) [a[0], a[1]] = [a[1], a[0]];
  return a;
}
export function newDraft(level, activity, errors = {}) {
  const route = routeFor(level);
  return {
    id: crypto.randomUUID(),
    submitted: false,
    answers:
      activity === 'order'
        ? shuffle(route.map((n, i) => i))
        : activity === 'labels'
          ? {}
          : activity === 'exam'
            ? route.map(() => '')
            : {},
    bank: shuffle(uniqueRoute(level).map((n) => n.id)),
    markers: shuffle(uniqueRoute(level).map((n) => n.id)),
    locations: shuffle(route.slice(0, -1).map((n, i) => i))
      .sort((a, b) => (errors[route[b].id] || 0) - (errors[route[a].id] || 0))
      .slice(0, config.contextQuestions),
  };
}
export function assess(level, activity, draft) {
  const route = routeFor(level),
    items = [];
  const add = (node, answer, expected, correct, explanation, dimension = activity) =>
    items.push({
      id: node.id,
      name: node.name,
      answer: String(answer || 'Ikke besvaret'),
      expected,
      correct,
      explanation,
      dimension,
    });
  if (activity === 'order' || activity === 'exam')
    route.forEach((node, i) => {
      const answer = activity === 'order' ? route[draft.answers[i]]?.name : draft.answers[i];
      const correct =
        activity === 'order' ? route[draft.answers[i]]?.id === node.id : accepts(node, answer);
      add(
        node,
        answer,
        node.name,
        correct,
        `${i ? `Efter ${route[i - 1].name} følger ${node.name}. ` : 'Ruten starter og slutter ved aorta. '}${node.note}`,
      );
    });
  if (activity === 'labels')
    uniqueRoute(level).forEach((node) => {
      const answer = uniqueRoute(level).find((n) => n.id === draft.answers[node.id]);
      add(node, answer?.name, node.name, answer?.id === node.id, node.note);
    });
  if (activity === 'context')
    draft.locations.forEach((i) => {
      const node = route[i],
        answer = draft.answers[i] || {};
      for (const [key, expected, label] of [
        ['before', route[(i + route.length - 2) % (route.length - 1)].id, 'Kommer fra'],
        ['after', route[i + 1].id, 'Fortsætter til'],
        ['oxygen', node.oxygen, 'Iltning'],
        ['circuit', circuitFor(node), 'Kredsløb'],
      ]) {
        const display = (v) =>
          key === 'oxygen'
            ? OXYGEN[v]
            : key === 'circuit'
              ? CIRCUITS[v]
              : route.find((n) => n.id === v)?.name;
        add(
          node,
          display(answer[key]),
          `${label}: ${display(expected)}`,
          answer[key] === expected,
          `${route[(i + route.length - 2) % (route.length - 1)].name} → ${node.name} → ${route[i + 1].name}. ${node.note}`,
          key,
        );
      }
    });
  const correct = items.filter((i) => i.correct).length,
    total = items.length,
    percent = Math.round((correct / total) * 100),
    threshold = activity === 'exam' ? config.examPass : config.trainingPass;
  return {
    id: draft.id,
    level,
    activity,
    correct,
    errors: total - correct,
    total,
    percent,
    threshold,
    passed: (correct / total) * 100 >= threshold,
    date: new Date().toISOString(),
    items,
  };
}
export function saveResult(record, result) {
  const data = (record.circulation ??= {
      level: result.level,
      drafts: {},
      results: {},
      errors: {},
    }),
    key = `${result.level}:${result.activity}`,
    previous = data.results[key];
  if (previous?.history.some((r) => r.id === result.id)) return false;
  data.review ??= reviewHistory(data);
  const history = [...(previous?.history || []), result].slice(-config.historyLimit);
  data.results[key] = {
    attempts: (previous?.attempts || 0) + 1,
    best: Math.max(previous?.best || 0, result.percent),
    passed: Boolean(previous?.passed || result.passed),
    completed: true,
    lastDate: result.date,
    last: result,
    history,
  };
  for (const id of new Set(result.items.filter((i) => !i.correct).map((i) => i.id)))
    data.errors[id] = (data.errors[id] || 0) + 1;
  updateReview(data.review, result);
  record.done = [...new Set([...record.done, `circulation-${result.activity}`])];
  record.updatedAt = Date.now();
  return true;
}
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const validKey = (key) => /^(easy|medium|hard):(order|labels|context|exam)$/.test(key);
const validResult = (r) =>
  object(r) &&
  typeof r.id === 'string' &&
  validKey(`${r.level}:${r.activity}`) &&
  Number.isInteger(r.correct) &&
  Number.isInteger(r.errors) &&
  r.correct >= 0 &&
  r.errors >= 0 &&
  r.total === r.correct + r.errors &&
  r.total > 0 &&
  Number.isFinite(r.percent) &&
  r.percent >= 0 &&
  r.percent <= 100 &&
  typeof r.passed === 'boolean' &&
  Number.isFinite(Date.parse(r.date)) &&
  Array.isArray(r.items) &&
  r.items.length === r.total &&
  r.items.every(
    (i) =>
      object(i) &&
      ['id', 'name', 'answer', 'expected', 'explanation'].every((k) => typeof i[k] === 'string') &&
      typeof i.correct === 'boolean',
  );
function updateReview(review, result) {
  const grouped = new Map();
  for (const item of result.items) {
    const key = `${result.level}:${item.id}:${item.dimension || result.activity}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }
  const observe = (key, correct) => {
    const old = review[key] || { streak: 0, errors: 0 };
    review[key] = {
      streak: correct ? old.streak + 1 : 0,
      errors: old.errors + Number(!correct),
      lastDate: result.date,
    };
  };
  for (const [key, items] of grouped)
    observe(
      key,
      items.every((i) => i.correct),
    );
  if (result.activity === 'context')
    for (const id of new Set(result.items.map((i) => i.id))) {
      const items = result.items.filter((i) => i.id === id),
        adjacent = items.filter((i) => ['before', 'after'].includes(i.dimension));
      const orderKey = `${result.level}:${id}:order`,
        oldContext = `${result.level}:${id}:context`;
      // Identifying both neighbours is targeted practice for an earlier order error.
      if (review[orderKey] && adjacent.length === 2)
        observe(
          orderKey,
          adjacent.every((i) => i.correct),
        );
      // Older versions stored context errors without separate dimensions.
      if (review[oldContext] && !grouped.has(oldContext))
        observe(
          oldContext,
          items.every((i) => i.correct),
        );
    }
}
function reviewHistory(data) {
  const review = {},
    history = Object.values(data.results || {})
      .flatMap((r) => r.history || [])
      .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const seen = new Set();
  for (const result of history) {
    if (seen.has(result.id)) continue;
    seen.add(result.id);
    updateReview(review, result);
  }
  if (!history.length)
    for (const level of ['easy', 'medium', 'hard'])
      for (const [id, count] of Object.entries(data.errors || {}))
        if (count > 0)
          review[`${level}:${id}:context`] = {
            streak: 0,
            errors: count,
            lastDate: new Date(0).toISOString(),
          };
  return review;
}
export function repetitionNeeds(data, level) {
  const needs = {};
  for (const [key, value] of Object.entries(data.review || reviewHistory(data))) {
    const [l, id] = key.split(':');
    if (l === level && value.errors > 0 && value.streak < 2)
      needs[id] = (needs[id] || 0) + value.errors;
  }
  return needs;
}
export function validCirculation(data) {
  if (
    !object(data) ||
    !['easy', 'medium', 'hard'].includes(data.level) ||
    !object(data.drafts) ||
    !object(data.results) ||
    !object(data.errors)
  )
    return false;
  if (
    data.review !== undefined &&
    (!object(data.review) ||
      !Object.entries(data.review).every(
        ([key, r]) =>
          /^(easy|medium|hard):[a-zA-Z]+:(order|context|labels|exam|before|after|oxygen|circuit)$/.test(
            key,
          ) &&
          object(r) &&
          Number.isSafeInteger(r.streak) &&
          r.streak >= 0 &&
          Number.isSafeInteger(r.errors) &&
          r.errors >= 0 &&
          Number.isFinite(Date.parse(r.lastDate)),
      ))
  )
    return false;
  for (const [key, d] of Object.entries(data.drafts)) {
    if (
      !validKey(key) ||
      !object(d) ||
      typeof d.id !== 'string' ||
      typeof d.submitted !== 'boolean'
    )
      return false;
    const [level, activity] = key.split(':'),
      route = routeFor(level),
      ids = uniqueRoute(level).map((n) => n.id);
    if (
      !Array.isArray(d.markers) ||
      d.markers.length !== ids.length ||
      new Set(d.markers).size !== ids.length ||
      !d.markers.every((id) => ids.includes(id))
    )
      return false;
    if (
      !Array.isArray(d.bank) ||
      d.bank.length !== ids.length ||
      new Set(d.bank).size !== ids.length ||
      !d.bank.every((id) => ids.includes(id))
    )
      return false;
    if (
      !Array.isArray(d.locations) ||
      !d.locations.length ||
      new Set(d.locations).size !== d.locations.length ||
      !d.locations.every((i) => Number.isInteger(i) && i >= 0 && i < route.length - 1)
    )
      return false;
    if (
      activity === 'order' &&
      (!Array.isArray(d.answers) ||
        d.answers.length !== route.length ||
        new Set(d.answers).size !== route.length ||
        !d.answers.every((i) => Number.isInteger(i) && i >= 0 && i < route.length))
    )
      return false;
    if (
      activity === 'exam' &&
      (!Array.isArray(d.answers) ||
        d.answers.length !== route.length ||
        !d.answers.every((s) => typeof s === 'string' && s.length <= 150))
    )
      return false;
    if (
      activity === 'labels' &&
      (!object(d.answers) ||
        !Object.entries(d.answers).every(([id, value]) => ids.includes(id) && ids.includes(value)))
    )
      return false;
    if (
      activity === 'context' &&
      (!object(d.answers) ||
        !Object.entries(d.answers).every(
          ([i, answers]) =>
            d.locations.includes(Number(i)) &&
            object(answers) &&
            Object.entries(answers).every(
              ([k, v]) =>
                typeof v === 'string' &&
                (v === '' ||
                  (k === 'oxygen'
                    ? Object.hasOwn(OXYGEN, v)
                    : k === 'circuit'
                      ? Object.hasOwn(CIRCUITS, v)
                      : ['before', 'after'].includes(k) && ids.includes(v))),
            ),
        ))
    )
      return false;
    if (d.submitted && !validResult(d.result)) return false;
  }
  return (
    Object.entries(data.results).every(
      ([key, r]) =>
        validKey(key) &&
        object(r) &&
        Number.isInteger(r.attempts) &&
        r.attempts > 0 &&
        Number.isFinite(r.best) &&
        r.best >= 0 &&
        r.best <= 100 &&
        typeof r.passed === 'boolean' &&
        validResult(r.last) &&
        Array.isArray(r.history) &&
        r.history.every(validResult),
    ) && Object.values(data.errors).every((n) => Number.isInteger(n) && n >= 0)
  );
}
