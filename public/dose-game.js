import { caseRegistry } from './dose-catalog.js';
import {
  CATEGORIES,
  availableScenes,
  sceneBlocks,
  visitScene,
  addNote,
  removeNote,
  connectNotes,
  recordHypothesis,
  currentHint,
  evaluate,
  caseErrors,
} from './dose-engine.js';
import { openCaseStore, saveKey } from './dose-storage.js';
import { esc, download } from './ui.js';
import {
  PRIMARY_TOOLS,
  sceneGroup,
  investigationChoices,
  readUX,
  newNotePosition,
  reportSteps,
} from './dose-ux.js';

const cssURL = new URL('./dose.css', import.meta.url).href;
const e = esc;
const button = (label, action, value = '', extra = '') =>
  `<button type="button" data-dose="${action}" data-value="${e(value)}" ${extra}>${label}</button>`;
const options = (items, selected = '') =>
  items
    .map(
      (o) =>
        `<option value="${e(o.id)}" ${o.id === selected ? 'selected' : ''}>${e(o.label)}</option>`,
    )
    .join('');
const paragraphs = (text) =>
  String(text)
    .split('\n')
    .map((t) => `<p>${e(t)}</p>`)
    .join('');
export function mountDose(
  root,
  { onComplete = () => {}, onReset = () => {}, registry = caseRegistry } = {},
) {
  let data,
    store,
    state,
    view = 'catalog',
    message = '',
    page = 0,
    hintLevel = 0,
    search = '',
    category = '',
    sort = 'new',
    disposed = false,
    drag,
    preview = '',
    selected = [],
    finishStep = 0,
    resultSection = 'answers',
    panel = '',
    archiveSearch = '',
    zoom = 100;
  const scrolls = new Map(),
    legacyNotes = new Set();
  const shell = document.createElement('div'),
    dialog = document.createElement('dialog');
  dialog.className = 'dose-dialog';
  dialog.setAttribute('aria-label', 'Efterforskningsværktøj');
  root.replaceChildren(shell, dialog);
  let returnFocus;
  const contextKey = () => view + ':' + (view === 'scene' ? preview || state?.scene : '');
  const captureScroll = () => scrolls.set(contextKey(), scrollY);
  function remember() {
    if (state)
      state.drafts['dose-ux'] = JSON.stringify({
        finishStep,
        finishing: view === 'report' || view === 'assessment',
        search,
        category,
        sort,
      });
  }
  function go(next, source = '', history = true, reset = false) {
    if (!reset) captureScroll();
    closePanel();
    view = next;
    preview = source;
    remember();
    save();
    render();
    window.scrollTo(0, scrolls.get(contextKey()) || 0);
    if (history) window.history.pushState({ doseUX: { view, preview, caseId: data?.id } }, '');
  }
  function closePanel() {
    if (dialog.open) dialog.close();
    panel = '';
    returnFocus?.focus({ preventScroll: true });
  }
  function openPanel(kind) {
    if (!dialog.open) returnFocus = document.activeElement;
    panel = kind;
    const contents =
      kind === 'menu'
        ? secondaryMenu()
        : kind === 'next'
          ? choices()
          : kind === 'hints'
            ? hints()
            : image(kind.slice(6), 'dose-full-image');
    dialog.innerHTML = `<div class="dose-dialog-top">${button('Luk', 'close-panel')}</div>${contents}`;
    if (kind === 'menu') dialog.setAttribute('data-dose-menu', '');
    else dialog.removeAttribute('data-dose-menu');
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('button')?.focus({ preventScroll: true });
  }
  function secondaryMenu() {
    return `<h2>Flere værktøjer</h2><div class="dose-menu">${[
      ['hypothesis', 'Hypoteser'],
      ['reference', 'Farmakologiske opslag'],
      ['hints', 'Hjælp og hints'],
      [
        state?.status === 'complete' ? 'results' : 'report',
        state?.status === 'complete' ? 'Se afsluttet sag' : 'Afslut sagen',
      ],
      ['export', 'Eksportér sag'],
      ['copy', 'Kopiér notesbog'],
      ['print', 'Udskriv'],
      ['catalog', 'Sagsmapper'],
    ]
      .map(([a, l]) => button(l, a))
      .join(
        '',
      )}${store?.original && store.warning ? button('Eksportér oprindelige gemte data', 'original') : ''}</div>`;
  }
  function addUXNote(note) {
    const source = preview || state.scene;
    if (state.notes.some((n) => n.content === note.content && n.source === source && !note.clue))
      return null;
    const id = addNote(state, { source, ...note });
    if (id) state.notes.find((n) => n.id === id).uxPlaced = false;
    return id;
  }
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = cssURL;
  document.head.append(style);
  root.className = 'dose-game';
  const save = () => {
    remember();
    const ok = store?.save();
    status();
    return ok;
  };
  function status() {
    const el = root.querySelector('#dose-save');
    if (el) {
      el.textContent =
        store?.warning ||
        message ||
        (state ? 'Gemt på denne enhed' : 'Ingen konto · Ingen data sendes');
      el.classList.toggle('dose-warning', Boolean(store?.warning));
    }
  }
  const draft = (key, fallback = '') => state?.drafts[key] ?? fallback;
  const field = (label, key, value = '', extra = '') =>
    `<label>${e(label)}<textarea data-draft="${e(key)}" maxlength="20000" ${extra}>${e(draft(key, value))}</textarea></label>`;
  function image(id, className = '') {
    const img = data.images[id];
    return img
      ? `<figure class="dose-photo ${className}"><img src="${e(img.src)}" alt="${e(img.alt)}" width="1280" height="720" loading="lazy" decoding="async">${className === 'dose-full-image' ? '' : button('Forstør billedet', 'image', id, 'class="dose-image-open"')}<figcaption>Fiktiv AI-genereret illustration · kliniske oplysninger står i teksten</figcaption></figure>`
      : '';
  }
  function toolbar() {
    return `<header class="dose-top"><a href="#/">← Læringsstier</a><span>DØDELIG DOSIS</span>${state ? button('☰ Menu', 'menu') : ''}</header>${state && view !== 'catalog' ? `<nav class="dose-tools" aria-label="Primær navigation">${PRIMARY_TOOLS.map(([id, icon, label]) => button(`<span aria-hidden="true">${icon}</span><span>${label}</span>`, id, '', `aria-pressed="${view === id}"`)).join('')}</nav>` : ''}<p id="dose-save" class="dose-save" role="status"></p><p id="dose-message" class="dose-notice" role="status" ${message ? '' : 'hidden'}>${e(message)}</p>${state && view === 'scene' ? `<div class="dose-actionbar">${preview ? button('← Tilbage til efterforskningen', 'scene') : button('Næste handling →', 'next', '', 'class="dose-primary"')}${button('Hjælp', 'hints')}</div>` : ''}`;
  }
  function catalog() {
    return `<section class="dose-cover"><div class="dose-cover-copy"><p class="dose-kicker">3. SEMESTER · KLINISK RÆSONNERING</p><h1 id="dose-heading" tabindex="-1">Dødelig dosis</h1><p class="dose-subtitle">En klinisk mordgåde</p><p>Syv patienter. Syv dødsfald. Syv utilsigtede hændelser. Kan du finde ud af, hvad der gik galt?</p><p>Én sag er spilbar. Flere sagsmapper kommer senere.</p><p class="dose-disclaimer">Fiktive undervisningssager om utilsigtede hændelser og systemets sikkerhedsbarrierer. Du spiller sygeplejerske og klinisk efterforsker. Ingen forsætlige drab. Brug ikke virkelige patientoplysninger i dine noter.</p></div></section><div class="dose-folders">${registry
      .map((c) => {
        let saved,
          hasSaved = false;
        try {
          const raw = localStorage.getItem(saveKey(c.id));
          hasSaved = raw !== null;
          saved = JSON.parse(raw);
        } catch {}
        const status =
          saved?.status === 'complete'
            ? 'Afsluttet'
            : hasSaved && !saved
              ? 'Gemte data kræver gennemgang'
              : hasSaved
                ? 'Efterforskning i gang'
                : 'Ikke påbegyndt';
        return `<article class="dose-folder"><span class="dose-stamp">${e(status)}</span><p class="dose-kicker">FORTROLIG UNDERVISNINGSMAPPE · CA. 30–45 MIN.</p><h2>${e(c.title)}</h2><p>${e(c.intro)}</p>${button(saved?.status === 'complete' ? 'Se afsluttet sag →' : hasSaved ? 'Genoptag sagen →' : 'Start sagen →', 'start', c.id, 'class="dose-primary"')}${hasSaved ? `<details><summary>Administrér sagen</summary>${button('Nulstil denne sag', 'reset', c.id, 'class="dose-destructive"')}</details>` : ''}</article>`;
      })
      .join('')}</div>`;
  }
  function heading(title, sub = '') {
    return `<p class="dose-kicker">${e(data.title)}</p><h1 id="dose-heading" tabindex="-1">${e(title)}</h1>${sub ? `<p class="dose-lead">${e(sub)}</p>` : ''}`;
  }
  const sourceTitle = (id) =>
    data.scenes.find((s) => s.id === id)?.title || 'Egen note / tidligere caseversion';
  function evidencePicker(selected = [], name = 'evidence') {
    return `<fieldset class="dose-evidence"><legend>Knyt undersøgte spor til din begrundelse (valgfrit)</legend>${state.found
      .filter((id) => id !== 'opening')
      .map((id) => {
        const b = data.scenes.flatMap((s) => s.blocks).find((b) => b.id === id);
        return b
          ? `<label><input type="checkbox" name="${name}" value="${e(id)}" ${selected.includes(id) ? 'checked' : ''}>${e(b.title)}</label>`
          : '';
      })
      .join('')}</fieldset>`;
  }
  function tableFor(block) {
    const t = block.table;
    if (!t) return '';
    return `<div class="dose-table-scroll" tabindex="0" role="region" aria-label="${e(block.title)}"><table><thead><tr>${t.headers.map((h) => `<th scope="col">${e(h)}</th>`).join('')}${t.saveRows ? '<th scope="col">Gem enkeltprøve</th>' : ''}</tr></thead><tbody>${t.rows.map((row, index) => `<tr>${row.map((v, i) => `<${i ? 'td' : 'th scope="row"'}>${e(v)}</${i ? 'td' : 'th'}>`).join('')}${t.saveRows ? `<td>${button(state.notes.some((n) => n.clue === block.id + '-row-' + index) ? 'Gemt ✓' : 'Gem', 'save-row', block.id + '::' + index, 'aria-label="Gem ' + e(row[0]) + ' som enkeltprøve"')}</td>` : ''}</tr>`).join('')}</tbody></table></div>`;
  }
  function sceneView() {
    const s = data.scenes.find((s) => s.id === (preview || state.scene));
    const checkpoint = (data.hypothesisThresholds || []).findIndex(
      (n, i) => state.visited.length >= n && !state.hypotheses.some((h) => h.checkpoint === i + 1),
    );
    return `${preview ? `<p class="dose-preview">Kildevisning · efterforskningen er bevaret</p>` : ''}${heading(s.title)}${!preview && state.visited.length === 1 && !draft('ux-welcome') ? `<aside class="dose-welcome"><p>Læs kilderne, gem dine egne noter, og vælg selv, hvad du undersøger næste gang.</p>${button('Forstået', 'dismiss-help')}</aside>` : ''}<p class="dose-location">${e(s.location)} <span>· ${e(s.time)}</span></p><div class="dose-scene-grid"><div>${image(s.illustration)}${data.characters?.find((p) => p.image === s.illustration) ? `<p class="dose-profile"><strong>${e(data.characters.find((p) => p.image === s.illustration).name)}</strong><br>${e(data.characters.find((p) => p.image === s.illustration).role)}</p>` : ''}<p class="dose-phase">${e(sceneGroup(s, data.characters))}</p><p>${e(s.intro)}</p></div><div class="dose-documents" data-scene-text>${sceneBlocks(
      s,
      state,
    )
      .filter((b) => !preview || state.found.includes(b.id))
      .map(
        (b) =>
          `<article class="dose-block" data-clue="${e(b.id)}"><h2>${e(b.title)}</h2>${paragraphs(b.text)}${tableFor(b)}${b.chart ? `<figure class="dose-chart"><svg viewBox="0 0 300 125" role="img" aria-label="${e(b.chart.label)}. ${e(b.chart.values.join(', '))}"><path d="M25 10V100H285" fill="none" stroke="#758fa2"/><polyline points="${b.chart.values.map((v, i) => `${40 + i * 100},${100 - v}`).join(' ')}" fill="none" stroke="#a8d5c9" stroke-width="3"/>${b.chart.values.map((v, i) => `<circle cx="${40 + i * 100}" cy="${100 - v}" r="4" fill="#a8d5c9"/><text x="${40 + i * 100}" y="${90 - v}" text-anchor="middle">${v}</text><text x="${40 + i * 100}" y="120" text-anchor="middle">${e(b.chart.labels[i])}</text>`).join('')}</svg><figcaption>${e(b.chart.label)} · Samme oplysninger i tabellen</figcaption></figure>` : ''}${b.neutral ? `<details><summary>Hvad måler prøven?</summary><p>${e(b.neutral)}</p></details>` : ''}${button(state.notes.some((n) => n.clue === b.id) ? 'Gemt i notesbogen ✓' : '＋ Gem oplysninger', 'save-clue', b.id, 'class="dose-small"')}</article>`,
      )
      .join(
        '',
      )}${button('Gem markeret tekst som spor', 'selection', '', 'class="dose-small"')}<p class="dose-help">Markér tekst i dokumenterne, eller brug knappen ved hver blok på telefonen.</p></div></div>${preview ? `${button('Genbesøg i efterforskningen', 'visit', s.id)}<p class="dose-help">Et genbesøg kan åbne nye oplysninger. Kildevisningen viser kun det allerede undersøgte.</p>` : `<section class="dose-next"><details class="dose-reflection"><summary>Notér en refleksion (valgfrit)</summary>${field('Dine refleksioner om denne scene', 'scene-' + s.id)}${button('Gem note', 'scene-note')}</details>${checkpoint >= 0 ? `<aside class="dose-prompt"><p>Hvad tror du på nuværende tidspunkt kan forklare forværringen?</p>${button('Formulér en foreløbig hypotese', 'hypothesis')} ${button('Fortsæt efterforskningen', 'next')}</aside>` : ''}${choices()}</section>`}`;
  }
  function choices() {
    const avail = investigationChoices(data, state, availableScenes(data, state));
    const choice = (next) =>
      button(`<strong>${e(next.title)}</strong><span>${e(next.reason)}</span>`, 'visit', next.id);
    return `<h2>Hvad vil du undersøge nu?</h2><div class="dose-choices">${avail.slice(0, 4).map(choice).join('')}</div>${avail.length > 4 ? `<details class="dose-more"><summary>Se øvrige efterforskningsmuligheder</summary><div class="dose-choices">${avail.slice(4).map(choice).join('')}</div></details>` : ''}${!avail.length ? '<p>Genbesøg dine kilder i sagsarkivet, eller saml din konklusion via menuen.</p>' : ''}`;
  }

  function noteCards() {
    let notes = state.notes.filter(
      (n) =>
        (!category || n.category === category) &&
        (n.content + ' ' + n.comment + ' ' + sourceTitle(n.source))
          .toLocaleLowerCase('da')
          .includes(search.toLocaleLowerCase('da')),
    );
    notes =
      sort === 'category'
        ? notes.toSorted((a, b) => a.category.localeCompare(b.category, 'da'))
        : notes.toReversed();
    return (
      notes
        .map(
          (n) =>
            `<article class="dose-note" data-card="${e(n.id)}"><p class="dose-note-content">${e(n.content)}</p>${n.comment ? `<p class="dose-help">${e(n.comment)}</p>` : ''}<p class="dose-help">${e(n.category)} · Kilde: ${e(sourceTitle(n.source))}</p><div class="dose-row">${data.scenes.some((s) => s.id === n.source) ? button('Åbn kilden', 'preview', n.source) : ''}${button(n.pinned ? 'Fjern fra tavlen' : 'Sæt på tavlen', 'pin', n.id)}</div><details class="dose-note-editor"><summary>Redigér note</summary><label>Note<textarea data-note="${e(n.id)}" data-part="content" maxlength="20000">${e(n.content)}</textarea></label><label>Din kommentar<textarea data-note="${e(n.id)}" data-part="comment" maxlength="5000">${e(n.comment)}</textarea></label><label>Kategori (valgfrit)<select data-note="${e(n.id)}" data-part="category">${CATEGORIES.map((c) => `<option ${n.category === c ? 'selected' : ''}>${e(c)}</option>`).join('')}</select></label>${button('Slet note', 'delete-note', n.id, 'class="dose-destructive"')}</details></article>`,
        )
        .join('') || '<p>Ingen noter i dette udvalg.</p>'
    );
  }
  function notebook() {
    return `${heading('Efterforskningsnotesbog')}<form data-form="note">${field('Ny egen note', 'new-note')}<details><summary>Kategori (valgfrit)</summary><select name="category" aria-label="Kategori for ny note">${CATEGORIES.map((c) => `<option ${c === CATEGORIES.at(-1) ? 'selected' : ''}>${e(c)}</option>`).join('')}</select></details><button class="dose-primary">Gem note</button></form><label>Søg i noter<input id="dose-search" type="search" value="${e(search)}" autocomplete="off"></label><details><summary>Filtrér og sortér</summary><div class="dose-filters"><label>Kategori<select id="dose-category"><option value="">Alle kategorier</option>${CATEGORIES.map((c) => `<option ${c === category ? 'selected' : ''}>${e(c)}</option>`).join('')}</select></label><label>Sortér<select id="dose-sort"><option value="new">Nyeste først</option><option value="category" ${sort === 'category' ? 'selected' : ''}>Efter kategori</option></select></label></div></details><p id="dose-note-count" class="dose-help" role="status"></p><div class="dose-notes">${noteCards()}</div>`;
  }
  function board() {
    const pinned = state.notes.filter((n) => n.pinned);
    const lines = state.links.filter(
      (l) => pinned.some((n) => n.id === l.from) && pinned.some((n) => n.id === l.to),
    );
    return `${heading('Din efterforskningstavle', 'Du opretter selv alle forbindelser. Ingen faglige sammenhænge bliver tilføjet automatisk.')}<p>Fastgør spor fra notesbogen. Flyt kortene med mus eller touch. Med tastatur: fokusér et kort og brug piletasterne. Formularen og forbindelseslisten virker også på små skærme.</p><label>Tavlens størrelse<select id="dose-zoom">${[60, 80, 100, 120].map((n) => `<option value="${n}" ${zoom === n ? 'selected' : ''}>${n} %</option>`).join('')}</select></label><div class="dose-board-scroll" tabindex="0" aria-label="Flyt udsnittet af tavlen ved at rulle"><div class="dose-board" style="width:${zoom * 10}px;height:${zoom * 10}px" aria-label="Tavle med dine spor"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines
      .map((l) => {
        const a = pinned.find((n) => n.id === l.from),
          b = pinned.find((n) => n.id === l.to);
        return `<line data-from="${e(a.id)}" data-to="${e(b.id)}" x1="${a.x + 8}" y1="${a.y + 5}" x2="${b.x + 8}" y2="${b.y + 5}"/>`;
      })
      .join(
        '',
      )}</svg>${pinned.map((n) => `<button type="button" class="dose-pin" data-pin="${e(n.id)}" aria-pressed="${selected.includes(n.id)}" style="left:${n.x}%;top:${n.y}%" aria-label="Flyt spor: ${e(n.content.slice(0, 90))}">${e(n.content.slice(0, 100))}</button>`).join('')}</div></div><p class="dose-help">Vælg ét kort og derefter et andet. Flyt kort med træk eller piletaster; brug listen nedenfor på små skærme.</p><div class="dose-row">${button('Forbind valgte spor', 'connect-selected', '', selected.length === 2 ? 'class="dose-primary"' : 'disabled')}${button('Vælg flere noter', 'notebook')}</div><details><summary>Forbind via formular (alle noter)</summary><form data-form="link"><h2>Forbind to spor</h2><label>Fra<select name="from" required>${options(state.notes.map((n) => optNote(n)))}</select></label><label>Til<select name="to" required>${options(state.notes.map((n) => optNote(n)))}</select></label><label>Din forklaring (valgfrit)<input name="label" maxlength="2000"></label><button class="dose-primary" ${state.notes.length < 2 ? 'disabled' : ''}>Opret forbindelse</button></form></details><h2>Spor på tavlen · liste</h2><div class="dose-board-list">${pinned.map((n) => `<article><p>${e(n.content)}</p>${button(selected.includes(n.id) ? 'Valgt ✓' : 'Vælg spor', 'select-note', n.id)} ${button('Åbn kilden', 'preview', n.source)} ${button('Redigér i notesbogen', 'edit-note', n.id)}</article>`).join('')}</div><h2>Forbindelser · liste til alle skærme</h2><ul class="dose-link-list">${state.links.map((l, i) => `<li><p><strong>${e(state.notes.find((n) => n.id === l.from)?.content)}</strong> → <strong>${e(state.notes.find((n) => n.id === l.to)?.content)}</strong></p><label>Forklaring (valgfrit)<input data-link="${i}" value="${e(l.label)}" maxlength="2000"></label>${button('Slet forbindelse', 'delete-link', String(i))}</li>`).join('') || '<li>Ingen forbindelser endnu.</li>'}</ul>`;
  }
  function optNote(n) {
    return { id: n.id, label: n.content.slice(0, 110) };
  }
  function hypotheses() {
    const cp = Math.max(
      1,
      Math.min(
        3,
        (data.hypothesisThresholds || []).filter((n) => state.visited.length >= n).length,
      ),
    );
    return `${heading('Foreløbige hypoteser', 'Det er legitimt at mangle oplysninger. Dine hypoteser bedømmes først gennem din afsluttende forklaring.')}<form data-form="hypothesis"><label>Tidspunkt i din efterforskning<select name="checkpoint">${[1, 2, 3].map((n) => `<option value="${n}" ${n === cp ? 'selected' : ''}>${n === 1 ? 'Første mistanke' : n === 2 ? 'Sporene samles' : 'Målrettet efterforskning'}</option>`).join('')}</select></label><label>Foreløbig forklaring<select name="choice">${options(data.hypothesisOptions, draft('hyp-choice', 'unknown'))}</select></label>${field('Din egen forklaring / revision', 'hyp-content')}<details><summary>Sikkerhed og begrundende spor (valgfrit)</summary><label>Sikkerhed: <output id="dose-confidence">${e(draft('confidence', '50'))}</output> %<input name="confidence" data-draft="confidence" type="range" min="0" max="100" value="${e(draft('confidence', '50'))}"></label>${evidencePicker()}</details><button class="dose-primary">Gem hypotese / revision</button></form>${hypothesisHistory()}`;
  }
  function hypothesisHistory() {
    return `<h2>Sådan udviklede dine hypoteser sig</h2><ol class="dose-timeline">${state.hypotheses.map((h) => `<li><strong>${h.checkpoint === 1 ? 'Første mistanke' : h.checkpoint === 2 ? 'Sporene samles' : 'Målrettet efterforskning'} · ${e(data.hypothesisOptions.find((o) => o.id === h.choice)?.label || h.choice)} · ${h.confidence} %</strong>${paragraphs(h.content)}<small>Begrundet med ${h.evidence.length} valgte spor · efter ${h.at} besøgte scener</small></li>`).join('') || '<li>Du har endnu ikke gemt en hypotese.</li>'}</ol>`;
  }
  function archive(reference = false) {
    const list = reference
      ? data.scenes.filter((s) => s.kind === 'reference' && availableOrVisited(s))
      : data.scenes.filter((s) => state.visited.includes(s.id));
    const groups = [...new Set(list.map((s) => sceneGroup(s, data.characters)))];
    return `${heading(reference ? 'Farmakologisk opslagsværk' : 'Sagsarkiv', reference ? 'Opslag bliver tilgængelige, når lægemidlerne er identificeret.' : 'Kun undersøgte kilder. Din aktive efterforskning bliver på samme sted.')}<label>Søg i ${reference ? 'opslag' : 'arkivet'}<input id="dose-archive-search" type="search" value="${e(archiveSearch)}"></label><div class="dose-archive-list">${
      groups
        .map(
          (group) =>
            `<section><h2>${e(group)}</h2><div class="dose-choices">${list
              .filter((s) => sceneGroup(s, data.characters) === group)
              .map(
                (s) =>
                  `<div data-archive-title="${e(s.title.toLocaleLowerCase('da'))}">${button(`<strong>${e(s.title)}</strong><span>${e(s.location)} · ${e(s.time)}</span>`, reference && !state.visited.includes(s.id) ? 'visit' : 'preview', s.id)}</div>`,
              )
              .join('')}</div></section>`,
        )
        .join('') || '<p>Ingen kilder tilgængelige endnu.</p>'
    }</div>`;
  }
  function filterArchive() {
    root
      .querySelectorAll('[data-archive-title]')
      .forEach(
        (el) =>
          (el.hidden = !el.dataset.archiveTitle.includes(archiveSearch.toLocaleLowerCase('da'))),
      );
    root
      .querySelectorAll('.dose-archive-list section')
      .forEach(
        (el) =>
          (el.hidden = ![...el.querySelectorAll('[data-archive-title]')].some(
            (row) => !row.hidden,
          )),
      );
  }
  function availableOrVisited(s) {
    return state.visited.includes(s.id) || availableScenes(data, state).some((a) => a.id === s.id);
  }
  function hints() {
    return `<h2>Hjælp og frivillige hints</h2><p>Gem oplysninger med knappen ved kilden. Brug notesbogen og forbind selv dine spor på sporetavlen.</p><p>Hints registreres til din refleksion og koster ingen point. Åbn kun mere hjælp, hvis du ønsker det.</p>${hintLevel ? `<article class="dose-block"><h3>Niveau ${hintLevel}</h3><p>${e(currentHint(data, state, hintLevel))}</p></article>` : ''}${hintLevel < 3 ? button(hintLevel ? 'Vis et mere konkret hint' : 'Vis første hint', 'hint', String(hintLevel + 1)) : ''}<details><summary>Dine anvendte hints</summary><ol>${state.hints.map((h) => `<li>Niveau ${h.level}: ${e(h.text)}</li>`).join('') || '<li>Ingen hints brugt.</li>'}</ol></details>`;
  }
  function finishControls(last = false) {
    return `<div class="dose-row">${finishStep ? button('← Tilbage', 'finish-back') : ''}${button('Tilbage til efterforskningen', 'scene')}<button class="dose-primary">${last ? 'Aflevér og se faglig rekonstruktion' : 'Gem og gå videre →'}</button></div>`;
  }
  function freeReport() {
    if (state.status === 'complete') return results();
    const steps = reportSteps(data);
    finishStep = Math.max(0, Math.min(steps.length - 1, finishStep));
    const step = steps[finishStep];
    if (step.kind === 'assessment') return assessment();
    return `${heading('Din afsluttende efterforskningsrapport', 'Formulér din egen konklusion, før du åbner den strukturerede vurdering.')}<p class="dose-help">Din kladde gemmes løbende · trin ${finishStep + 1} af ${steps.length}</p><form data-form="free-report">${step.kind === 'free' ? step.ids.map((i) => field(data.freeQuestions[i], 'free-' + i, state.report?.free?.[i] || '')).join('') : `${evidencePicker(reportEvidence())}<p>Du kan afslutte uden alle valgfrie datakilder. Fritekst bedømmes ikke automatisk og sendes ikke til AI.</p>`}${finishControls()}</form>`;
  }
  function reportEvidence() {
    try {
      return JSON.parse(draft('ux-report-evidence', JSON.stringify(state.report?.evidence || [])));
    } catch {
      return [];
    }
  }
  function assessment() {
    const steps = reportSteps(data),
      step = steps[finishStep];
    return `${heading('Struktureret faglig vurdering', 'Maksimalt 100 point. Der gives ingen point for tempo eller for blot at åbne spor.')}<p class="dose-help">Din kladde gemmes løbende · trin ${finishStep + 1} af ${steps.length}</p><form data-form="assessment">${data.assessment
      .filter((q) => step?.ids?.includes(q.id))
      .map(
        (q) =>
          `<fieldset class="dose-question"><legend>${e(q.prompt)} <small>· ${q.points} point</small></legend>${
            q.type === 'number'
              ? `<label>Dit svar i ${e(q.unit)}<input inputmode="decimal" name="${q.id}" value="${e(draft('answer-' + q.id))}" data-draft="answer-${q.id}" required></label>`
              : q.type === 'order'
                ? q.options
                    .map(
                      (o, i) =>
                        `<label>Plads ${i + 1}<select name="${q.id}-${i}" required><option value="">Vælg …</option>${options(q.options, draft('answer-' + q.id + '-' + i))}</select></label>`,
                    )
                    .join('')
                : q.type === 'match'
                  ? q.pairs
                      .map(
                        (p) =>
                          `<label>${e(p.label)}<select name="${q.id}-${p.id}" required><option value="">Vælg sammenhæng …</option>${options(q.options, draft('answer-' + q.id + '-' + p.id))}</select></label>`,
                      )
                      .join('')
                  : q.options
                      .map(
                        (o) =>
                          `<label class="dose-answer"><input type="${q.type === 'multi' ? 'checkbox' : 'radio'}" name="${q.id}" value="${e(o.id)}" ${q.type === 'choice' ? 'required' : ''} ${
                            draft('answer-' + q.id)
                              .split('|')
                              .includes(o.id)
                              ? 'checked'
                              : ''
                          }>${e(o.label)}</label>`,
                      )
                      .join('')
          }</fieldset>`,
      )
      .join('')}${finishControls(finishStep === steps.length - 1)}</form>`;
  }
  function results() {
    if (state.status !== 'complete') return freeReport();
    return `${heading('Sagen er afsluttet', 'Din egen forklaring, den objektive vurdering og rekonstruktionen vises hver for sig.')}<p class="dose-score">${state.evaluation.total}<span> / 100 point · automatisk bedømt</span></p><div class="dose-row" aria-label="Afsluttende gennemgang">${[
      ['answers', 'Dine svar'],
      ['reconstruction', 'Rekonstruktion'],
      ['reflection', 'Patientsikkerhed'],
    ]
      .map(([id, l]) => button(l, 'result-section', id, `aria-pressed="${resultSection === id}"`))
      .join(
        '',
      )}${button('Simuleret UTH-rapport', 'uth')}</div><section ${resultSection === 'answers' ? '' : 'hidden'}><h2>Automatisk bedømte svar</h2>${state.evaluation.results
      .map((r) => {
        const q = data.assessment.find((q) => q.id === r.id);
        const a = state.report.answers[q.id];
        return `<details class="dose-block"><summary>${r.correct ? '✓' : '○'} ${e(q.prompt)} · ${r.points}/${r.max} point</summary><p>Dit svar: ${e(formatAnswer(q, a))}</p><p>Fagligt svar: ${e(formatAnswer(q, q.correct))}</p><p>${e(q.explanation)}</p></details>`;
      })
      .join(
        '',
      )}<h2>Dine egne konklusioner · selvvurdering</h2>${data.freeQuestions.map((q, i) => `<details><summary>${e(q)}</summary><p>${e(state.report.free[i] || 'Intet fritekstsvar')}</p><p>Sammenlign med rekonstruktionen nedenfor. Friteksten er ikke automatisk vurderet.</p></details>`).join('')}<h2>Kritiske spor: undersøgt eller overset</h2><ul>${data.critical.map((id) => `<li>${state.found.includes(id) ? 'Undersøgt' : 'Overset'}${state.report.evidence.includes(id) ? ' · knyttet til slutrapporten' : ''}: ${e(data.scenes.flatMap((s) => s.blocks).find((b) => b.id === id)?.title)}</li>`).join('')}</ul></section><section ${resultSection === 'reconstruction' ? '' : 'hidden'}><h2>Rekonstruktion af hændelsesforløbet</h2><ol class="dose-timeline">${data.reconstruction.map((r) => `<li><details><summary>${e(r.time)} · ${e(r.type)}</summary><p>${e(r.text)}</p></details></li>`).join('')}</ol>${hypothesisHistory()}</section><section ${resultSection === 'reflection' ? '' : 'hidden'}><h2>Hints og egne noter</h2><p>${state.hints.length} hints anvendt. Dine noter og forbindelser er bevaret.</p>${button('Se egne noter', 'notebook')}${button('Se hints', 'hints')}<h2>Videre refleksion</h2><ul>${data.reflection.map((r) => `<li>${e(r)}</li>`).join('')}</ul><details><summary>Faglige kilder · kontrolleret 25. november 2026</summary><ul>${data.sources.map((s) => `<li><a href="${e(s.url)}" target="_blank" rel="noopener noreferrer">${e(s.title)}</a></li>`).join('')}</ul></details></section>`;
  }
  function formatAnswer(q, a) {
    const label = (id) => q.options?.find((o) => o.id === id)?.label || id;
    return q.type === 'match'
      ? q.pairs.map((p) => p.label + ' → ' + label(a?.[p.id] || 'Intet svar')).join('; ')
      : Array.isArray(a)
        ? a.map(label).join(' → ')
        : q.type === 'number'
          ? String(a ?? 'Intet svar') + ' ' + q.unit
          : label(a ?? 'Intet svar');
  }
  function uth() {
    return `${heading('Simuleret UTH-rapport', 'Kun undervisning. Intet sendes til et virkeligt rapporteringssystem.')}<p>Beskriv hændelsen neutralt: hvad skete, hvad blev konsekvensen, og hvordan forebygges gentagelse? Skeln mellem dokumenterede forhold og antagelser. Rapportér virkelige UTH via gældende lokale arbejdsgange og SundK.</p><form data-form="uth">${data.uthFields.map((label, i) => `<label>${e(label)}<textarea data-uth="${i}" maxlength="20000">${e(state.uth[i] || '')}</textarea></label>`).join('')}<button class="dose-primary">Gem simuleret rapport</button></form><div class="dose-row">${button('Eksportér UTH-rapport', 'export-uth')}${button('Kopiér UTH-rapport', 'copy-uth')}${button('Udskriv', 'print')}</div>`;
  }
  function render(focus = true) {
    if (disposed) return;
    const views = {
      catalog,
      scene: sceneView,
      notebook,
      board,
      hypothesis: hypotheses,
      archive: () => archive(),
      reference: () => archive(true),
      hints,
      report: freeReport,
      assessment,
      results,
      uth,
    };
    const y = scrollY,
      active = document.activeElement,
      activeId = active?.id;
    const openDetails = focus
      ? []
      : [...root.querySelectorAll('.dose-note-editor[open]')].map(
          (el) => el.closest('[data-card]').dataset.card,
        );
    const activeSelector = active?.dataset.pin
      ? `[data-pin="${CSS.escape(active.dataset.pin)}"]`
      : active?.dataset.dose
        ? `[data-dose="${CSS.escape(active.dataset.dose)}"][data-value="${CSS.escape(active.dataset.value || '')}"]`
        : '';
    shell.innerHTML =
      toolbar() +
      `<div class="dose-content">${(views[view] || catalog)()}</div><p class="dose-disclaimer dose-bottom">Fiktiv undervisningssimulation · Kun lokal lagring · Brug ikke virkelige patientoplysninger</p>`;
    status();
    if (view === 'archive' || view === 'reference') filterArchive();
    if (focus) root.querySelector('#dose-heading')?.focus({ preventScroll: true });
    else {
      openDetails.forEach((id) => {
        const el = root.querySelector(`[data-card="${CSS.escape(id)}"] .dose-note-editor`);
        if (el) el.open = true;
      });
      if (activeId) root.querySelector('#' + CSS.escape(activeId))?.focus({ preventScroll: true });
      else if (activeSelector) root.querySelector(activeSelector)?.focus({ preventScroll: true });
      window.scrollTo(0, y);
    }
  }
  async function start(id) {
    const entry = registry.find((c) => c.id === id);
    if (!entry) return;
    message = 'Sagen indlæses …';
    render(false);
    try {
      const loaded = await entry.load();
      if (disposed) return;
      const errors = caseErrors(loaded);
      if (errors.length) throw Error(errors.join('; '));
      data = loaded;
      let storage;
      try {
        storage = localStorage;
      } catch {
        storage = {
          getItem() {
            throw Error('Lager utilgængeligt');
          },
        };
      }
      store = openCaseStore(data, storage);
      state = store.state;
      legacyNotes.clear();
      state.notes.filter((n) => n.uxPlaced === undefined).forEach((n) => legacyNotes.add(n.id));
      visitScene(data, state, state.scene);
      const ux = readUX(state);
      finishStep = Number.isInteger(ux.finishStep)
        ? ux.finishStep
        : state.report
          ? reportSteps(data).findIndex((s) => s.kind === 'assessment')
          : 0;
      search = typeof ux.search === 'string' ? ux.search : '';
      category = typeof ux.category === 'string' ? ux.category : '';
      sort = ux.sort === 'category' ? 'category' : 'new';
      view = state.status === 'complete' ? 'results' : ux.finishing ? 'report' : 'scene';
      preview = '';
      if (view === 'report' && reportSteps(data)[finishStep]?.kind === 'assessment')
        view = 'assessment';
      save();
      message = '';
      render();
    } catch (error) {
      message = 'Sagen kunne ikke åbnes: ' + error.message;
      view = 'catalog';
      render();
    }
  }
  async function copy(value) {
    try {
      await navigator.clipboard.writeText(value);
      message = 'Kopieret til udklipsholderen.';
    } catch {
      message = 'Kopiering er ikke tilgængelig. Brug lokal eksport eller udskrift.';
    }
    announce();
  }
  function announce() {
    const el = root.querySelector('#dose-message');
    if (el) {
      el.textContent = message;
      el.hidden = !message;
    }
    status();
  }
  const noteText = () =>
    state.notes
      .map(
        (n) =>
          n.category + '\n' + n.content + '\n' + n.comment + '\nKilde: ' + sourceTitle(n.source),
      )
      .join('\n\n');
  const uthText = () =>
    'SIMULERET UTH · KUN UNDERVISNING\n' +
    data.uthFields.map((s, i) => s + ':\n' + (state.uth[i] || '')).join('\n\n');
  async function click(event) {
    const b = event.target.closest('[data-dose]');
    if (!b || !root.contains(b)) return;
    const action = b.dataset.dose,
      value = b.dataset.value;
    message = '';
    if (action === 'dismiss-help') {
      state.drafts['ux-welcome'] = '1';
      b.closest('.dose-welcome').remove();
      save();
      return;
    }
    if (action === 'close-panel') {
      closePanel();
      return;
    }
    if (action === 'menu' || action === 'next' || action === 'hints') {
      openPanel(action);
      return;
    }
    if (action === 'image') {
      openPanel('image:' + value);
      return;
    }
    if (action === 'preview') {
      if (state.visited.includes(value)) go('scene', value);
      return;
    }
    if (action === 'result-section') {
      resultSection = value;
      render(false);
      return;
    }
    if (action === 'finish-back') {
      finishStep = Math.max(0, finishStep - 1);
      view = reportSteps(data)[finishStep].kind === 'assessment' ? 'assessment' : 'report';
      save();
      render();
      return;
    }
    if (action === 'select-note') {
      selectNote(value);
      return;
    }
    if (action === 'connect-selected') {
      if (selected.length === 2) {
        connectNotes(state, ...selected, '');
        selected = [];
        save();
        render(false);
      }
      return;
    }
    if (action === 'edit-note') {
      go('notebook');
      const card = root.querySelector(`[data-card="${CSS.escape(value)}"]`);
      if (card) {
        card.querySelector('details').open = true;
        card.scrollIntoView({ block: 'center' });
        card.querySelector('textarea').focus({ preventScroll: true });
      }
      return;
    }
    if (action === 'start') {
      await start(value);
      return;
    }
    if (action === 'reset') {
      if (
        confirm(
          'Nulstil kun denne sag? Noter, tavle og progression slettes. Eksportér først, hvis du vil bevare dem.',
        )
      ) {
        try {
          localStorage.removeItem(saveKey(value));
          if (data?.id === value) {
            state = null;
            store = null;
          }
          onReset(value);
          view = 'catalog';
          message = 'Sagen er nulstillet.';
        } catch {
          message = 'Browseren tillader ikke nulstilling af lageret.';
        }
      }
      render();
      return;
    }
    if (action === 'catalog') {
      go('catalog');
      return;
    }
    if (!state) return;
    if (action === 'visit') {
      captureScroll();
      if (visitScene(data, state, value)) {
        preview = '';
        hintLevel = 0;
        scrolls.set('scene:' + value, 0);
        go('scene', '', true, true);
        return;
      } else message = 'Sporet er ikke tilgængeligt endnu.';
    } else if (action === 'save-clue') {
      const source = data.scenes.find((s) => s.id === (preview || state.scene)),
        clue = sceneBlocks(source, state).find((b) => b.id === value);
      if (clue && !state.notes.some((n) => n.clue === value)) {
        addUXNote({ content: clue.title + '\n' + clue.text, clue: value });
        save();
        message = 'Oplysninger gemt i notesbogen.';
      }
    } else if (action === 'save-row') {
      const [id, index] = value.split('::');
      const b = sceneBlocks(
        data.scenes.find((s) => s.id === (preview || state.scene)),
        state,
      ).find((b) => b.id === id);
      const row = b?.table?.rows[Number(index)],
        clue = id + '-row-' + index;
      if (b?.table?.saveRows && row && !state.notes.some((n) => n.clue === clue)) {
        addUXNote({
          content: row.map((v, i) => b.table.headers[i] + ': ' + v).join('\n'),
          clue,
        });
        save();
        message = 'Enkeltprøven er gemt med kilde.';
      }
    } else if (action === 'selection') {
      const sel = window.getSelection(),
        box = root.querySelector('[data-scene-text]');
      if (sel?.toString().trim() && box?.contains(sel.anchorNode) && box.contains(sel.focusNode)) {
        addUXNote({ content: sel.toString() });
        save();
        message = 'Markeret tekst gemt med kilde.';
      } else message = 'Markér først tekst i scenens dokumenter, eller brug Gem oplysninger.';
    } else if (action === 'scene-note') {
      if (addUXNote({ content: draft('scene-' + state.scene) })) {
        state.drafts['scene-' + state.scene] = '';
        save();
        message = 'Refleksion gemt som note.';
      } else message = 'Skriv en note først. Der kan gemmes højst 300 noter.';
    } else if (action === 'pin') {
      const n = state.notes.find((n) => n.id === value);
      if (n) {
        if (!n.pinned && !n.uxPlaced && !legacyNotes.has(n.id)) {
          Object.assign(n, newNotePosition(state.notes));
          n.uxPlaced = true;
        }
        n.pinned = !n.pinned;
        save();
        b.textContent = n.pinned ? 'Fjern fra tavlen' : 'Sæt på tavlen';
        message = n.pinned ? 'Noten er sat på sporetavlen.' : 'Noten er fjernet fra sporetavlen.';
        announce();
        return;
      }
    } else if (action === 'delete-note') {
      if (confirm('Slet denne note og dens forbindelser?')) {
        removeNote(state, value);
        save();
      }
    } else if (action === 'delete-link') {
      state.links.splice(Number(value), 1);
      save();
    } else if (action === 'page') page = Math.max(0, Number(value));
    else if (action === 'hint') {
      if (Number(value) > hintLevel + 1 || Number(value) < 1 || Number(value) > 3) return;
      hintLevel = Number(value);
      const text = currentHint(data, state, hintLevel);
      if (!state.hints.some((h) => h.text === text) && state.hints.length < 300) {
        state.hints.push({ level: hintLevel, text });
        save();
      }
      openPanel('hints');
      return;
    } else if (action === 'export')
      download(
        { kind: 'doedelig-dosis', caseVersion: data.version, state },
        data.id + '-notesbog-og-sag.json',
      );
    else if (action === 'original')
      download({ original: store.original }, data.id + '-oprindelige-data.json');
    else if (action === 'copy') {
      await copy(noteText());
      return;
    } else if (action === 'copy-uth') {
      await copy(uthText());
      return;
    } else if (action === 'export-uth')
      download(
        {
          simulation: true,
          case: data.title,
          fields: Object.fromEntries(data.uthFields.map((s, i) => [s, state.uth[i] || ''])),
        },
        data.id + '-simuleret-uth.json',
      );
    else if (action === 'print') window.print();
    else if (action === 'filter') {
      search = root.querySelector('#dose-search').value;
      category = root.querySelector('#dose-category').value;
      sort = root.querySelector('#dose-sort').value;
    } else if (action === 'uth' && state.status === 'complete') {
      go('uth');
      return;
    } else if (
      [
        'scene',
        'notebook',
        'board',
        'archive',
        'reference',
        'hypothesis',
        'hints',
        'report',
        'results',
      ].includes(action)
    ) {
      if (action === 'report') actionFinish();
      else go(action);
      return;
    }
    if (['export', 'original', 'export-uth', 'print'].includes(action)) {
      announce();
      return;
    }
    if (['save-clue', 'save-row', 'selection', 'scene-note'].includes(action)) {
      if (action === 'save-clue' || action === 'save-row') {
        b.textContent = 'Gemt i notesbogen ✓';
        b.setAttribute('aria-pressed', 'true');
      }
      if (action === 'scene-note') {
        const field = root.querySelector(`[data-draft="scene-${CSS.escape(state.scene)}"]`);
        if (field) field.value = draft('scene-' + state.scene);
      }
      announce();
      return;
    }
    render(false);
  }
  function actionFinish() {
    go(reportSteps(data)[finishStep]?.kind === 'assessment' ? 'assessment' : 'report');
  }
  function selectNote(id) {
    selected = selected.includes(id)
      ? selected.filter((n) => n !== id)
      : [...selected.slice(-1), id];
    for (const el of root.querySelectorAll('[data-pin],[data-dose=select-note]')) {
      const chosen = selected.includes(el.dataset.pin || el.dataset.value);
      el.setAttribute('aria-pressed', String(chosen));
      if (el.dataset.dose === 'select-note') el.textContent = chosen ? 'Valgt ✓' : 'Vælg spor';
    }
    const connect = root.querySelector('[data-dose=connect-selected]');
    if (connect) {
      connect.disabled = selected.length !== 2;
      connect.classList.toggle('dose-primary', selected.length === 2);
    }
  }
  function input(event) {
    if (!state) return;
    const el = event.target;
    if (el.id === 'dose-search' || el.id === 'dose-category' || el.id === 'dose-sort') {
      if (el.id === 'dose-search') search = el.value;
      if (el.id === 'dose-category') category = el.value;
      if (el.id === 'dose-sort') sort = el.value;
      root.querySelector('.dose-notes').innerHTML = noteCards();
      root.querySelector('#dose-note-count').textContent =
        root.querySelectorAll('.dose-note').length + ' noter i udvalget';
      save();
      return;
    }
    if (el.id === 'dose-archive-search') {
      archiveSearch = el.value;
      filterArchive();
      return;
    }
    if (el.id === 'dose-zoom') {
      zoom = Number(el.value);
      const board = root.querySelector('.dose-board');
      board.style.width = zoom * 10 + 'px';
      board.style.height = zoom * 10 + 'px';
      return;
    }
    if (el.dataset.link !== undefined) {
      const link = state.links[Number(el.dataset.link)];
      if (link) {
        link.label = el.value;
        save();
      }
      return;
    }
    if (el.name === 'evidence' && el.closest('[data-form=free-report]')) {
      state.drafts['ux-report-evidence'] = JSON.stringify(
        [...root.querySelectorAll('[name=evidence]:checked')].map((el) => el.value),
      );
      save();
    }
    if (el.dataset.draft) {
      state.drafts[el.dataset.draft] = el.value;
      const out = root.querySelector('#dose-confidence');
      if (out && el.name === 'confidence') out.textContent = el.value;
      save();
    }
    if (el.dataset.note) {
      const n = state.notes.find((n) => n.id === el.dataset.note);
      if (n && ['content', 'category', 'comment'].includes(el.dataset.part)) {
        n[el.dataset.part] = el.value;
        const text = el.closest('[data-card]')?.querySelector('.dose-note-content');
        if (text && el.dataset.part === 'content') text.textContent = el.value;
        save();
      }
    }
    if (el.dataset.uth) {
      state.uth[el.dataset.uth] = el.value;
      save();
    }
    if (view === 'assessment' && el.name) {
      const q = data.assessment.find((q) => el.name === q.id || el.name.startsWith(q.id + '-'));
      if (q) {
        state.drafts['answer-' + el.name] =
          q.type === 'multi'
            ? [...root.querySelectorAll(`input[name="${q.id}"]:checked`)]
                .map((i) => i.value)
                .join('|')
            : el.value;
        save();
      }
    }
  }
  function submit(event) {
    const form = event.target.closest('[data-form]');
    if (!form) return;
    event.preventDefault();
    const f = new FormData(form),
      kind = form.dataset.form;
    message = '';
    if (kind === 'note') {
      if (addUXNote({ content: draft('new-note'), category: f.get('category') })) {
        state.drafts['new-note'] = '';
        message = 'Noten er gemt.';
      } else message = 'Skriv en note først. Der kan gemmes højst 300 noter.';
    }
    if (kind === 'link') {
      message = connectNotes(state, f.get('from'), f.get('to'), f.get('label'))
        ? 'Forbindelsen er gemt.'
        : 'Vælg to forskellige spor og en ny forklaring.';
    }
    if (kind === 'hypothesis') {
      recordHypothesis(state, {
        checkpoint: Number(f.get('checkpoint')),
        choice: f.get('choice'),
        content: draft('hyp-content'),
        confidence: Number(f.get('confidence')),
        evidence: f.getAll('evidence'),
      });
      state.drafts['hyp-choice'] = f.get('choice');
      message = 'Hypotesen er gemt uden faglig bedømmelse. Du kan revidere den senere.';
    }
    if (kind === 'free-report' || kind === 'assessment') {
      const steps = reportSteps(data);
      if (kind === 'assessment') {
        const q = data.assessment.find(
          (q) =>
            steps[finishStep].ids.includes(q.id) &&
            q.type === 'number' &&
            !/^-?\d+(?:[.,]\d+)?$/.test(draft('answer-' + q.id).trim()),
        );
        if (q && !/^-?\d+(?:[.,]\d+)?$/.test(draft('answer-' + q.id).trim())) {
          message = 'Skriv tal med komma eller punktum i beregningsopgaverne.';
          announce();
          return;
        }
      }
      state.report = {
        free: Object.fromEntries(
          data.freeQuestions.map((_, i) => [i, draft('free-' + i, state.report?.free?.[i] || '')]),
        ),
        evidence: reportEvidence(),
        answers: state.report?.answers || {},
      };
      if (finishStep < steps.length - 1) {
        finishStep++;
        view = steps[finishStep].kind === 'assessment' ? 'assessment' : 'report';
      } else {
        const answers = {};
        for (const q of data.assessment) {
          if (q.type === 'number')
            answers[q.id] = Number(draft('answer-' + q.id).replace(',', '.'));
          else if (q.type === 'order')
            answers[q.id] = q.options.map((_, i) => draft('answer-' + q.id + '-' + i));
          else if (q.type === 'match')
            answers[q.id] = Object.fromEntries(
              q.pairs.map((p) => [p.id, draft('answer-' + q.id + '-' + p.id)]),
            );
          else if (q.type === 'multi')
            answers[q.id] = draft('answer-' + q.id)
              .split('|')
              .filter(Boolean);
          else answers[q.id] = draft('answer-' + q.id);
        }
        state.report.answers = answers;
        state.evaluation = evaluate(data, answers);
        state.status = 'complete';
        view = 'results';
        onComplete();
      }
    }
    if (kind === 'uth') message = 'Den simulerede UTH-rapport er gemt lokalt. Intet er sendt.';
    save();
    render();
  }
  function pointerDown(event) {
    const pin = event.target.closest('[data-pin]');
    if (!pin || event.button !== 0) return;
    drag = { id: pin.dataset.pin, pin, x: event.clientX, y: event.clientY, moved: false };
    pin.setPointerCapture(event.pointerId);
  }
  function pointerMove(event) {
    if (!drag) return;
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 4 && !drag.moved) return;
    drag.moved = true;
    const box = root.querySelector('.dose-board').getBoundingClientRect(),
      n = state.notes.find((n) => n.id === drag.id);
    n.x = Math.max(0, Math.min(80, ((event.clientX - box.left) / box.width) * 100 - 8));
    n.y = Math.max(0, Math.min(82, ((event.clientY - box.top) / box.height) * 100 - 5));
    drag.pin.style.left = n.x + '%';
    drag.pin.style.top = n.y + '%';
    refreshBoardLines();
  }
  function pointerUp() {
    if (drag) {
      const done = drag;
      drag = null;
      if (!done.moved) {
        selectNote(done.id);
        return;
      }
      save();
      refreshBoardLines();
    }
  }
  function refreshBoardLines() {
    for (const line of root.querySelectorAll('.dose-board line')) {
      const a = state.notes.find((n) => n.id === line.dataset.from),
        b = state.notes.find((n) => n.id === line.dataset.to);
      if (a && b) {
        line.setAttribute('x1', a.x + 8);
        line.setAttribute('y1', a.y + 5);
        line.setAttribute('x2', b.x + 8);
        line.setAttribute('y2', b.y + 5);
      }
    }
  }
  function keydown(event) {
    const pin = event.target.closest('[data-pin]');
    if (pin && ['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      selectNote(pin.dataset.pin);
      return;
    }
    if (!pin || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const n = state.notes.find((n) => n.id === pin.dataset.pin);
    n.x = Math.max(
      0,
      Math.min(80, n.x + (event.key === 'ArrowRight' ? 2 : event.key === 'ArrowLeft' ? -2 : 0)),
    );
    n.y = Math.max(
      0,
      Math.min(82, n.y + (event.key === 'ArrowDown' ? 2 : event.key === 'ArrowUp' ? -2 : 0)),
    );
    save();
    render(false);
    root.querySelector(`[data-pin="${n.id}"]`)?.focus({ preventScroll: true });
  }
  function imageError(event) {
    if (event.target.tagName === 'IMG') {
      event.target.hidden = true;
      const fig = event.target.closest('figure');
      if (fig) fig.classList.add('dose-photo-missing');
    }
  }
  function storageChanged(event) {
    if (state && event.key === saveKey(data.id)) {
      message =
        'Sagen blev ændret i en anden fane. Genindlæs for at hente den nyeste gemte version.';
      render(false);
    }
  }
  const listeners = {
    click,
    input,
    change: input,
    submit,
    pointerdown: pointerDown,
    pointermove: pointerMove,
    pointerup: pointerUp,
    pointercancel: pointerUp,
    keydown,
  };
  Object.entries(listeners).forEach(([name, fn]) => root.addEventListener(name, fn));
  root.addEventListener('error', imageError, true);
  function popstate(event) {
    const target = event.state?.doseUX;
    if (target?.caseId === data?.id && state) {
      captureScroll();
      closePanel();
      view = target.view;
      preview = target.preview || '';
      render();
      window.scrollTo(0, scrolls.get(contextKey()) || 0);
    }
  }
  dialog.addEventListener('cancel', () => {
    panel = '';
  });
  window.addEventListener('popstate', popstate);
  window.addEventListener('storage', storageChanged);
  render();
  return () => {
    disposed = true;
    Object.entries(listeners).forEach(([name, fn]) => root.removeEventListener(name, fn));
    root.removeEventListener('error', imageError, true);
    window.removeEventListener('storage', storageChanged);
    window.removeEventListener('popstate', popstate);
    dialog.close();
    style.remove();
  };
}
