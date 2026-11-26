// Presentation only: never reads critical clues, answers or scoring.
export const PRIMARY_TOOLS = [
  ['scene', '⌕', 'Efterforskning'],
  ['notebook', '▤', 'Notesbog'],
  ['board', '⌘', 'Sporetavle'],
  ['archive', '▣', 'Sagsarkiv'],
];
export function sceneGroup(scene, characters = []) {
  if (scene.kind === 'reference') return 'Opslag';
  if (characters.some((p) => p.image === scene.illustration)) return 'Samtaler';
  if (scene.blocks.some((b) => b.table || b.chart)) return 'Målinger og skemaer';
  if (/journal|notat|indlæggelse/i.test(scene.title)) return 'Journaler';
  return 'Steder og observationer';
}
export function investigationChoices(data, state, available) {
  // The engine supplies availability; keep its original authored order.
  return available.filter((s) => s.kind !== 'reference');
}
export function readUX(state) {
  try {
    const v = JSON.parse(state.drafts['dose-ux'] || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}
export function newNotePosition(notes) {
  const occupied = notes.filter((n) => n.pinned);
  for (let row = 0; row < 8; row++)
    for (let col = 0; col < 5; col++) {
      const x = 1 + col * 19,
        y = 1 + row * 11;
      if (!occupied.some((n) => Math.abs(n.x - x) < 18 && Math.abs(n.y - y) < 10)) return { x, y };
    }
  return { x: 1, y: 1 }; // The full list remains available when the canvas is crowded.
}
export function reportSteps(data) {
  const steps = [];
  for (let i = 0; i < data.freeQuestions.length; i += 3)
    steps.push({ kind: 'free', ids: data.freeQuestions.slice(i, i + 3).map((_, j) => i + j) });
  steps.push({ kind: 'evidence' });
  for (const q of data.assessment) {
    const last = steps.at(-1);
    if (last?.kind === 'assessment' && last.category === q.category) last.ids.push(q.id);
    else steps.push({ kind: 'assessment', category: q.category, ids: [q.id] });
  }
  return steps;
}
