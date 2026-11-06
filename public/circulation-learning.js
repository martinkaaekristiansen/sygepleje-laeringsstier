import { ACTIVITIES, BLOOD_LEVELS, ROUTE_NOTE } from './circulation-data.js';
import { CIRCULATION_CONFIG as config } from './circulation-config.js';
import { newDraft, assess, saveResult, repetitionNeeds } from './circulation-engine.js';
import { orderView, moveCard } from './circulation-order.js';
import { contextView } from './circulation-context.js';
import { esc } from './ui.js';
const views = { order: orderView, context: contextView };
export function mountCirculation(root, { record, initialActivity = 'order', save, onActivity }) {
  const data = (record.circulation ??= { level: 'easy', drafts: {}, results: {}, errors: {} });
  let saveNumber = 0;
  let activity = Object.hasOwn(views, initialActivity) ? initialActivity : 'order',
    drag = null,
    disposed = false,
    saving = false;
  const key = () => `${data.level}:${activity}`,
    draft = () => (data.drafts[key()] ??= newDraft(data.level, activity)),
    store = () => {
      record.updatedAt = Date.now();
      return save();
    };
  function draw(focus) {
    const d = draft(),
      result = d.result,
      stats = data.results[key()],
      title = ACTIVITIES.find((a) => a[0] === activity)[1];
    root.innerHTML = `<section class="circulation-learning"><a href="#/">← Til læringsstier</a><div class="eyebrow">1. SEMESTER · ANATOMI OG FYSIOLOGI</div><h1 id="lesson-heading" tabindex="-1">Kan du finde vej gennem kredsløbet?</h1><p>Træn efter <a href="#/sti/blodcellens-rejse/blood-${data.level}">Blodcellens rejse</a>, og undersøg, hvad du kan huske uden hjælp.</p><p class="route-note">${ROUTE_NOTE}</p><div class="circulation-controls"><label>Sværhedsgrad <select data-level>${Object.values(
      BLOOD_LEVELS,
    )
      .map(
        (l) =>
          `<option value="${l.id}" ${data.level === l.id ? 'selected' : ''}>${l.name}</option>`,
      )
      .join(
        '',
      )}</select></label><span>Beståelse: ${config.trainingPass} %</span></div><nav class="activity-tabs" aria-label="Aktiviteter">${ACTIVITIES.map(
      ([id, label], i) => {
        const r = data.results[`${data.level}:${id}`];
        return `<button data-activity="${id}" aria-current="${activity === id ? 'step' : 'false'}">${i + 1}. ${label}<small>${r?.last?.passed ? '✓ Senest bestået' : r ? 'Afleveret – øv videre' : 'Ikke afleveret'}</small></button>`;
      },
    ).join(
      '',
    )}</nav><div class="activity-heading"><h2 tabindex="-1" id="activity-title">${title}</h2><p>${stats ? `${stats.attempts} forsøg · bedste resultat ${stats.best} % · senest ${new Date(stats.lastDate).toLocaleDateString('da-DK')}` : 'Intet resultat endnu'}</p></div><form class="activity-form">${views[activity](data.level, d)}${!d.submitted ? `<button class="primary" type="submit">Kontrollér besvarelsen</button>` : ''}</form>${result ? renderResult(result) : ''}<div class="activity-actions"><button class="secondary" data-new>Start et nyt forsøg</button>${result && !result.passed ? '<button class="secondary" data-edit>Ret besvarelsen</button>' : ''}${Object.values(repetitionNeeds(data, data.level)).some((n) => n > 0) ? '<button class="secondary" data-repeat>Træn mine fejl</button>' : ''}</div><details class="error-overview"><summary>Anatomiske områder til repetition</summary><p>Efter to korrekte besvarelser i træk på et område afsluttes den aktuelle repetition. Tidligere fejl bevares i historikken.</p><ul>${
      Object.entries(repetitionNeeds(data, data.level))
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([id, count]) => {
          const node = Object.values(BLOOD_LEVELS)
            .flatMap((l) => l.steps)
            .find((n) => n.id === id);
          return `<li>${esc(node?.name || id)} · fejl i ${count} forsøg</li>`;
        })
        .join('') || '<li>Ingen registrerede fejl endnu.</li>'
    }</ul></details><p class="circulation-save" role="status">Svar og resultater gemmes på denne enhed. Et afleveret trin er ikke nødvendigvis fagligt bestået.</p></section>`;
    if (focus) root.querySelector(focus)?.focus({ preventScroll: !focus.includes('title') });
  }
  function renderResult(r) {
    return `<section class="assessment-result ${r.passed ? 'passed' : ''}" aria-labelledby="result-title"><h2 id="result-title" tabindex="-1">${r.passed ? '✓ Bestået' : 'Øv videre'} · ${r.percent} %</h2><p>${r.correct} korrekte svar · ${r.errors} fejl · beståelsesgrænse ${r.threshold} %. Resultatet gælder ${BLOOD_LEVELS[r.level].name.toLowerCase()} niveau.</p><ol>${r.items.map((item) => `<li class="${item.correct ? 'correct' : 'incorrect'}"><strong>${item.correct ? '✓' : '↻'} ${esc(item.expected)}</strong><p>Dit svar: ${esc(item.answer)}</p>${!item.correct ? `<p>${esc(item.explanation)}</p>` : ''}</li>`).join('')}</ol></section>`;
  }
  async function persistFeedback() {
    const number = ++saveNumber;
    const pending = root.querySelector('.circulation-save');
    if (pending) pending.textContent = 'Gemmer…';
    const ok = await store();
    if (!disposed && number === saveNumber) {
      const status = root.querySelector('.circulation-save');
      if (status)
        status.textContent = ok
          ? 'Gemt på denne enhed. Aflevering og faglig beståelse registreres hver for sig.'
          : 'Ikke gemt endnu. Brug »Prøv at gemme igen« øverst på siden.';
    }
  }
  const click = async (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    const d = draft();
    if (b.dataset.activity) {
      activity = b.dataset.activity;
      onActivity(activity);
      draw('#activity-title');
      await persistFeedback();
    } else if (b.dataset.move) {
      const [from, delta] = b.dataset.move.split(':').map(Number);
      moveCard(d, from, from + delta);
      draw(`[data-move="${from + delta}:${delta}"]`);
      await persistFeedback();
    } else if (b.hasAttribute('data-new')) {
      if (
        !d.submitted &&
        Object.values(d.answers).some(Boolean) &&
        !confirm('Start et nyt forsøg? Den aktuelle kladde erstattes. Gemte resultater bevares.')
      )
        return;
      data.drafts[key()] = newDraft(data.level, activity);
      draw('#activity-title');
      await persistFeedback();
    } else if (b.hasAttribute('data-edit')) {
      const copy = structuredClone(d);
      copy.id = crypto.randomUUID();
      copy.submitted = false;
      delete copy.result;
      data.drafts[key()] = copy;
      draw('#activity-title');
      await persistFeedback();
    } else if (b.hasAttribute('data-repeat')) {
      activity = 'context';
      data.drafts[key()] = newDraft(data.level, activity, repetitionNeeds(data, data.level));
      onActivity(activity);
      draw('#activity-title');
      await persistFeedback();
    }
  };
  const change = async (e) => {
    const d = draft();
    if (e.target.hasAttribute('data-level')) {
      data.level = e.target.value;
      draw('#activity-title');
      await persistFeedback();
    } else if (e.target.dataset.moveTo !== undefined && !d.submitted) {
      const to = Number(e.target.value);
      moveCard(d, Number(e.target.dataset.moveTo), to);
      draw(`[data-move-to="${to}"]`);
      await persistFeedback();
    } else if (e.target.dataset.context && !d.submitted) {
      const [i, key] = e.target.dataset.context.split(':');
      (d.answers[i] ??= {})[key] = e.target.value;
      await persistFeedback();
    }
  };
  const submit = async (e) => {
    e.preventDefault();
    const d = draft();
    if (d.submitted || saving) return;
    saving = true;
    d.result = assess(data.level, activity, d);
    d.submitted = true;
    saveResult(record, d.result);
    draw('#result-title');
    await persistFeedback();
    saving = false;
  };
  const dragstart = (e) => {
    if (draft().submitted) return e.preventDefault();
    drag = Number(e.target.closest('[data-card]')?.dataset.card);
    e.dataTransfer?.setData('text/plain', String(drag));
  };
  const dragover = (e) => {
    if (e.target.closest('[data-card]') && !draft().submitted) e.preventDefault();
  };
  const drop = async (e) => {
    const target = e.target.closest('[data-card]');
    if (!target || drag === null) return;
    e.preventDefault();
    const to = Number(target.dataset.card);
    moveCard(draft(), drag, to);
    drag = null;
    draw(`[data-move="${to}:-1"]`);
    await persistFeedback();
  };
  for (const [event, fn] of Object.entries({ click, change, submit, dragstart, dragover, drop }))
    root.addEventListener(event, fn);
  draw();
  void store();
  return () => {
    disposed = true;
    for (const [event, fn] of Object.entries({ click, change, submit, dragstart, dragover, drop }))
      root.removeEventListener(event, fn);
  };
}
