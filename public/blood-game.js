import { lockGameViewport } from './blood-viewport.js';
import { BLOOD_LEVELS, levelStepId } from './blood-routes.js';
import {
  newJourney,
  passages,
  choosePassage,
  continueJourney,
  emptyStats,
  startAttempt,
  recordResult,
  scoreJourney,
  validJourney,
} from './journey-engine.js';
import { esc } from './ui.js';
import { createJourneyAudio } from './journey-audio.js';
import { renderBodyMap, renderFunFact } from './journey-guide.js';
const oxygenLabel = (s) =>
  ({
    high: 'Iltrigt blod',
    low: 'Iltfattigt blod',
    'exchange-out': 'O₂ afgives til muskelvævet',
    'exchange-in': 'Hæmoglobin optager O₂',
  })[s.oxygen];

// One controller and one persistent WebGL renderer for all three original routes.
// Progress is still stored through the app's existing IndexedDB transaction queue.
export function mountBloodGame(
  root,
  { record, save, exit, initialLevel = 'easy', onLevel = () => {} },
) {
  record.bloodJourney ??= { stats: {}, active: null };
  const data = record.bloodJourney;
  data.stats ??= {};
  let selected = Object.hasOwn(BLOOD_LEVELS, initialLevel) ? initialLevel : 'easy',
    run = data.active;
  if (
    !run ||
    !Object.hasOwn(BLOOD_LEVELS, run.level) ||
    !validJourney(BLOOD_LEVELS[run.level], run)
  )
    run = null;
  if (run?.phase === 'arrival') run = continueJourney(run);
  let mode = 'menu',
    world = null,
    ready = false,
    busy = false,
    disposed = false,
    ambient = true,
    error = '',
    audioSaved = true,
    noticeTimer = 0,
    pendingLevel = null,
    panelOpen = false;
  const unlockViewport = lockGameViewport(root);
  const audio = createJourneyAudio({ onStatus: updateAudioPanel });
  const $ = (s) => root.querySelector(s),
    stats = (l) => ({ ...emptyStats(), ...data.stats[l] });
  function updateAudioPanel() {
    if (disposed) return;
    const status = $('[data-audio-status]');
    if (status) status.textContent = audio.status();
    const toggle = $('[data-audio-toggle]');
    if (toggle) {
      toggle.textContent = audio.settings.enabled ? 'Slå lyd fra' : 'Slå lyd til';
      toggle.setAttribute('aria-pressed', String(audio.settings.enabled));
    }
    const value = $('[data-audio-value]');
    if (value) value.textContent = Math.round(audio.settings.volume * 100) + '%';
    const notice = $('[data-audio-save]');
    if (notice) notice.hidden = audioSaved;
  }
  function audioPanel() {
    const s = audio.settings;
    return `<section class="blood-audio" aria-label="Lydindstillinger"><div class="blood-audio-controls"><label class="blood-volume" for="blood-volume">Lydstyrke <output data-audio-value>${Math.round(s.volume * 100)}%</output><input id="blood-volume" type="range" min="0" max="100" value="${Math.round(s.volume * 100)}" data-audio="volume"></label><fieldset><legend>Lydlag</legend>${[
      ['heart', 'Hjerte'],
      ['lungs', 'Lunger'],
      ['flow', 'Blodstrøm'],
    ]
      .map(
        ([key, label]) =>
          `<label><input type="checkbox" data-audio="${key}" ${s[key] ? 'checked' : ''}>${label}</label>`,
      )
      .join(
        '',
      )}</fieldset></div><div class="blood-audio-caption"><span data-audio-status role="status">${esc(audio.status())}</span><button class="text-button" data-audio-retry>Prøv lyd igen</button><details><summary>Om lydmodellen</summary><p>Original syntese med S1–S2-hjertelyde ved 70 slag/min og blød respiration ved 14 åndedrag/min. Lydstyrken illustrerer nærhed til hjertet og lungerne. Blodstrømmen er stiliseret. Det er en pædagogisk simulation, ikke sådan en erytrocyt fysisk ville høre inde i kroppen; normalt laminart blodflow er ikke nødvendigvis hørbart.</p></details></div><p data-audio-save role="status" ${audioSaved ? 'hidden' : ''}>Lydindstillingen virker nu, men kunne ikke gemmes på enheden.</p></section>`;
  }
  root.innerHTML = `<section class="blood-game"><div class="blood-game-bar" aria-label="Spilbetjening"><button class="back" data-blood="exit">← Tilbage til læringsstier</button><button data-audio-toggle aria-pressed="${audio.settings.enabled}">${audio.settings.enabled ? 'Slå lyd fra' : 'Slå lyd til'}</button><button data-panel-toggle aria-controls="blood-settings" aria-expanded="false" aria-label="Lyd, viden og grafik">⚙</button><div class="blood-foot"><button data-footer-menu data-blood="menu" aria-label="Vælg sværhedsgrad">☰</button></div></div><div class="blood-save-error" role="alert" hidden></div><aside id="blood-settings" class="blood-drawer" aria-label="Lyd, viden og grafik" hidden><button data-panel-close class="secondary">Luk indstillinger</button>${audioPanel()}</aside><div class="blood3d blood-play">
 <div class="blood-world blood3d-viewport"><canvas class="blood3d-canvas" tabindex="0" aria-label="Blodbanen i 3D. Brug piletaster og Enter, eller vælg en rute med mus eller touch."></canvas><div class="blood3d-shade" aria-hidden="true"></div>
 <div class="blood3d-hud"><div class="blood-location"><span class="blood3d-eyebrow" data-level-name></span><h1 data-location></h1><p class="blood-world-caption"></p></div><div class="blood3d-top-controls"><span class="blood-lives" role="img"></span><button data-blood="motion" aria-pressed="false">Pause bevægelse</button></div></div>
 <div class="blood3d-milestone" role="status" aria-live="polite"></div>
 <div class="blood3d-labels" aria-label="To rutehypoteser"></div><div class="blood3d-feedback blood-message" role="status" aria-live="polite" hidden></div>
 <div data-body-map></div><div class="blood3d-bottom"><span data-hint></span><div class="blood3d-gas" hidden></div><p class="blood-oxygen"></p><div class="blood-progress" role="progressbar" aria-label="Fremdrift gennem kredsløbet" aria-valuemin="0" aria-valuenow="0" aria-valuemax="10"><span></span></div><span data-progress-copy></span></div>
 <div class="blood3d-overlay" data-overlay></div></div>
 <div class="blood3d-information"><div><span class="blood3d-eyebrow">INDE I KREDSLØBET</span><p data-note></p></div><div data-funfact></div><div class="blood3d-quality"><label><input type="checkbox" data-anatomy-focus><span>Se kammerets indløb og muskulatur</span></label><label>Grafik <select data-quality3d><option value="auto">Automatisk</option><option value="high">Høj</option><option value="low">Let</option></select></label><small data-quality-label></small></div></div>

 <details class="blood3d-model"><summary>Om modellen og betjeningen</summary><p>De to anatomiske navne er rutehypoteser fra det valgte niveau. Markørerne er navigationshjælp, ikke ekstra åbninger i kar eller hjertevægge. Ved lungearteriestammen følger vi højre lungearterie. Venstre lungearterie er også normal, men bruges ikke som et forkert svar.</p><p>Hjertekamre, klapper og kapillærer er forenklede 3D-modeller. Lyset, de synlige gaspartikler og transparensen er undervisningshjælpemidler. Modellen er ikke målfast. »Se kammerets indløb og muskulatur« drejer blikket mod klapapparatet eller atriets venøse indløb. Når du vælger næste struktur, følger kameraet igen blodstrømmen. Iltfattigt blod forbliver rødt og indeholder stadig ilt.</p><p>Vælg med mus, touch eller Tab og Enter. Venstre og højre pil flytter fokus mellem navnene. Reduceret bevægelse viser samme 3D-anatomi med stillestående kamera og direkte overgange.</p></details></div></section>`;
  const canvas = $('canvas');
  $('#blood-settings').append($('.blood3d-information'), $('.blood3d-model'));
  function setPanel(open) {
    panelOpen = open;
    $('#blood-settings').hidden = !open;
    $('[data-panel-toggle]').setAttribute('aria-expanded', String(open));
    $('.blood3d-viewport').inert = open;
    // Let an already chosen passage settle before pausing. Pausing between
    // saving the answer and starting travel would otherwise strand the attempt.
    world?.pause((open && !busy) || mode !== 'play' || !ambient);
    root.querySelectorAll('[data-passage]').forEach((b) => (b.disabled = open || !ambient));
    if (open) $('[data-panel-close]').focus();
    else $('[data-panel-toggle]').focus();
  }

  function milestone(text) {
    const el = $('.blood3d-milestone');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => el.classList.remove('show'), 3600);
  }
  function showError() {
    const e = $('.blood-save-error');
    e.hidden = !error;
    e.innerHTML = error
      ? `${esc(error)} <button data-blood="save">Prøv at gemme igen</button>`
      : '';
  }
  async function store(retry = false) {
    data.active = run;
    record.updatedAt = Date.now();
    const ok = await save({ retry });
    error = ok ? '' : 'Resultatet er ikke gemt endnu. Hold siden åben, og prøv igen.';
    if (!disposed) showError();
    return ok;
  }
  function summary(level) {
    const s = stats(level);
    return `<span class="blood-medal">${s.completed ? '✓ Gennemført' : 'Ikke gennemført'}</span><small>${esc(s.attempts)} forsøg · Bedste rute: ${esc(s.best)}%${s.perfect ? ' · ✦ Fejlfrit gennemført' : ''}</small>${s.lastCompleted ? `<small>Senest ${esc(new Date(s.lastCompleted).toLocaleDateString('da-DK'))}</small>` : ''}`;
  }
  function overlayFocus(active) {
    for (const child of $('.blood3d-viewport').children)
      if (!child.matches('[data-overlay]')) child.inert = active;
    if (active) queueMicrotask(() => $('#blood-title')?.focus({ preventScroll: true }));
  }
  function menu() {
    pendingLevel = null;
    overlayFocus(true);
    mode = 'menu';
    ready = false;
    world?.pause(true);
    audio.locate(null, false);
    $('.blood3d-labels').innerHTML = '';
    $('.blood-message').hidden = true;
    const overlay = $('[data-overlay]');
    overlay.hidden = false;
    overlay.className = 'blood3d-overlay blood-menu';
    overlay.innerHTML = `<div class="blood-menu-scroll"><span class="blood3d-eyebrow">1. SEMESTER · ANATOMI OG FYSIOLOGI · 3D</span><h2 id="blood-title" tabindex="-1">Blodcellens rejse</h2><p>Følg blodet gennem karrene, hjertet og lungerne. Vælg den næste anatomiske struktur. Du har to liv.</p><fieldset class="blood-levels"><legend>Vælg din sværhedsgrad</legend>${Object.values(
      BLOOD_LEVELS,
    )
      .map(
        (l) =>
          `<label class="blood-level"><input type="radio" name="blood-level" value="${l.id}" ${l.id === selected ? 'checked' : ''}><span><strong>${l.name}</strong><span>${l.description}</span>${summary(l.id)}</span></label>`,
      )
      .join(
        '',
      )}</fieldset></div><div class="toolbar"><button class="blood3d-primary" data-blood="start" ${world ? '' : 'disabled'}>${world ? 'Start rejsen →' : 'Klargør 3D…'}</button>${run && !['won', 'lost'].includes(run.phase) ? `<button class="secondary" data-blood="resume" ${world ? '' : 'disabled'}>Fortsæt ${BLOOD_LEVELS[run.level].name.toLowerCase()} · ${run.correct}/${BLOOD_LEVELS[run.level].choices.length}</button>` : ''}</div><small>Mus, touch eller tastatur · Progression gemmes på din enhed</small>`;
    $('.blood-foot').hidden = true;
    updateAudioPanel();
  }
  function updateStage() {
    const route = BLOOD_LEVELS[run?.level || selected],
      s = route.steps[run?.index || 0];
    $('[data-location]').textContent = s.name;
    $('[data-level-name]').textContent = route.name.toUpperCase() + ' · BLODCELLENS REJSE';
    $('.blood-world-caption').textContent = sceneDescription(s);
    $('.blood-lives').textContent =
      !run || run.lives === 2 ? '♥ ♥' : run.lives === 1 ? '♥ ♡' : '♡ ♡';
    $('.blood-lives').setAttribute('aria-label', `${run?.lives ?? 2} af 2 liv tilbage`);
    $('[data-body-map]').innerHTML = renderBodyMap(s);
    $('[data-note]').textContent = s.note;
    $('[data-funfact]').innerHTML = renderFunFact(s);
    $('.blood-oxygen').textContent = oxygenLabel(s);
    $('.blood-progress').setAttribute('aria-valuenow', String(run?.correct || 0));
    $('.blood-progress').setAttribute('aria-valuemax', String(route.choices.length));
    $('.blood-progress>span').style.width = (run ? scoreJourney(route, run) : 0) + '%';
    $('[data-progress-copy]').textContent =
      `${run?.correct || 0} / ${route.choices.length} overgange`;
    $('[data-anatomy-focus]').closest('label').hidden = ![
      'atrium',
      'right-ventricle',
      'left-ventricle',
    ].includes(s.kind);
    const gas = $('.blood3d-gas');
    gas.hidden = !s.kind.includes('capillary');
    gas.innerHTML =
      s.oxygen === 'exchange-in'
        ? '<span>● O₂: alveole → blod</span><span>● CO₂: blod → alveole</span>'
        : '<span>● O₂: blod → væv</span><span>● CO₂: væv → blod</span>';
  }
  function showFeedback() {
    const box = $('.blood-message');
    box.hidden = run?.phase !== 'feedback';
    if (!box.hidden) {
      const p = passages(BLOOD_LEVELS[run.level], run)[run.lastSide];
      box.innerHTML = `<h2 id="blood-feedback" tabindex="-1">${p.category === 'other-route' ? 'En mulig vej – men et andet mål' : 'Tilbage til skillevejen'} · 1 liv tilbage</h2><p>${esc(p.explanation)}</p>`;
    }
  }
  function showChoices() {
    if (disposed || busy || mode !== 'play' || !run || ['won', 'lost'].includes(run.phase)) return;
    ready = true;
    const parent = $('.blood3d-labels');
    if (!parent.children.length)
      parent.innerHTML = passages(BLOOD_LEVELS[run.level], run)
        .map(
          (p, i) =>
            `<button data-passage="${i}" aria-label="${i ? 'Højre' : 'Venstre'} rutehypotese: ${esc(p.name)}"><span aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="${i ? 'M6 18 18 6M8 6h10v10' : 'M18 18 6 6M6 16V6h10'}"/></svg></span><strong>${esc(p.name)}</strong></button>`,
        )
        .join('');
    parent.querySelectorAll('button').forEach((b) => (b.disabled = !ambient || panelOpen));
    $('[data-hint]').textContent = 'Vælg næste struktur · to rutehypoteser';
    showFeedback();
  }
  async function enterStage() {
    ready = false;
    clearTimeout(noticeTimer);
    $('.blood3d-milestone').classList.remove('show');
    $('.blood3d-labels').innerHTML = '';
    $('.blood-message').hidden = true;
    updateStage();
    $('[data-hint]').textContent = 'Følg blodstrømmen…';
    const route = BLOOD_LEVELS[run.level],
      s = route.steps[run.index];
    await world.enter(s, route.steps[run.index + 1], { reset: run.index === 0 });
    if (disposed) return;
    world.pause(!ambient || panelOpen);
    audio.locate(s, true);
    updateAudioPanel();
    canvas.focus({ preventScroll: true });
    if (s.kind.includes('capillary'))
      milestone(
        s.oxygen === 'exchange-in' ? 'Dit hæmoglobin optager ilt!' : 'Du har nået kapillærerne!',
      );
    else if (['ra', 'right', 'cava', 'svc'].includes(s.id)) milestone('Du er på vej mod hjertet!');
    else if (['trunk', 'pa'].includes(s.id)) milestone('Du har nået lungekredsløbet!');
  }
  function result() {
    overlayFocus(true);
    $('.blood-foot').hidden = true;
    $('[data-footer-menu]').removeAttribute('data-blood');
    ready = false;
    world.pause(true);
    audio.locate(null, false);
    $('.blood3d-labels').innerHTML = '';
    $('.blood-message').hidden = true;
    updateStage();
    const route = BLOOD_LEVELS[run.level],
      won = run.phase === 'won',
      next = Object.keys(BLOOD_LEVELS)[Object.keys(BLOOD_LEVELS).indexOf(run.level) + 1],
      bad = won ? null : passages(route, run)[run.lastSide];
    const overlay = $('[data-overlay]');
    overlay.hidden = false;
    overlay.className = 'blood3d-overlay blood-result';
    overlay.innerHTML = `<span class="blood3d-medal" aria-hidden="true">${won ? '✦' : '♡'}</span><span class="blood3d-eyebrow">${route.name.toUpperCase()} · ${won ? 'KREDSLØBET ER FULDFØRT' : 'TO LIV BRUGT'}</span><h2 id="blood-title" tabindex="-1">${won ? 'Tillykke! Du har gennemført kredsløbet!' : 'Game Over'}</h2><p>${won ? `Du er tilbage i ${esc(route.steps.at(-1).name)}.${run.errors === 0 ? ' ✦ Fejlfri rejse!' : ''}` : 'Begge liv er brugt. Start sværhedsgraden forfra.'}</p>${bad ? `<p class="blood-result-explanation">${esc(bad.explanation)}</p>` : ''}<dl><div><dt>Korrekte valg</dt><dd>${run.correct}/${route.choices.length}</dd></div><div><dt>Fejl</dt><dd>${run.errors}</dd></div><div><dt>Sværhedsgrad</dt><dd>${route.name}</dd></div></dl><div class="toolbar">${won && next ? `<button class="blood3d-primary" data-blood="next" data-level="${next}">Prøv ${BLOOD_LEVELS[next].name.toLowerCase()} →</button>` : ''}<button class="secondary" data-blood="restart">Prøv ${route.name.toLowerCase()} igen</button><button class="secondary" data-blood="menu">Tilbage til læringsstien</button></div>`;
    if (won) milestone('Du er tilbage i aorta!');
    $('#blood-title').focus({ preventScroll: true });
  }
  function failure(message) {
    if (disposed) return;
    overlayFocus(true);
    ready = false;
    busy = false;
    mode = 'error';
    world?.pause(true);
    audio.locate(null, false);
    $('.blood3d-labels').innerHTML = '';
    const el = $('[data-overlay]');
    el.hidden = false;
    el.className = 'blood3d-overlay';
    el.innerHTML = `<h2 id="blood-title" tabindex="-1">3D kunne ikke vises</h2><p>${esc(message)}</p><p>Der bruges kun 3D til spillet. Din progression er bevaret.</p><button data-blood="reload">Genindlæs spillet</button><button data-blood="exit">Tilbage til læringsstierne</button>`;
  }
  function onFrame(f) {
    if (disposed) return;
    canvas.dataset.fps = String(Math.round(f.fps));
    canvas.dataset.triangles = String(f.triangles);
    canvas.dataset.drawCalls = String(f.drawCalls);
    $('[data-quality-label]').textContent = f.quality + ' kvalitet';
    if (f.ready && !busy && !ready && mode === 'play') showChoices();
    f.anchors.forEach((p, i) => {
      const b = $(`[data-passage="${i}"]`);
      if (b) {
        const half = b.offsetWidth / 2 + 8,
          width = canvas.clientWidth;
        b.style.left = `${Math.max(half, Math.min(width - half, (p.x * width) / 100))}px`;
        b.style.top = `${p.y}%`;
      }
    });
  }
  async function boot() {
    try {
      const { createBloodWorld } = await import('./journey-3d-world.js');
      if (disposed) return;
      world = await createBloodWorld(canvas, {
        clock: audio.now,
        onReady: showChoices,
        onFrame,
        onError: failure,
      });
      if (disposed) {
        world.dispose();
        return;
      }
      const route = BLOOD_LEVELS[selected];
      await world.enter(route.steps[0], route.steps[1]);
      if (disposed) return;
      world.pause(true);
      menu();
    } catch (e) {
      failure(e.message);
    }
  }
  async function start(level, confirmed = false) {
    if (run && !['won', 'lost'].includes(run.phase) && !confirmed) {
      pendingLevel = level;
      const overlay = $('[data-overlay]');
      overlay.hidden = false;
      overlay.className = 'blood3d-overlay blood-confirm';
      overlay.innerHTML = `<h2 id="blood-title" tabindex="-1">Start et nyt forsøg?</h2><p>Du er i gang med ${esc(BLOOD_LEVELS[run.level].name.toLowerCase())}, ${run.correct} af ${BLOOD_LEVELS[run.level].choices.length} overgange. Et nyt forsøg på ${esc(BLOOD_LEVELS[level].name.toLowerCase())} starter fra begyndelsen med to liv.</p><p>Gennemførte niveauer og bedste resultater bevares.</p><div class="toolbar"><button class="blood3d-primary" data-blood="confirm-start">Start nyt forsøg</button><button class="secondary" data-blood="cancel-start">Behold mit forsøg</button></div>`;
      overlayFocus(true);
      return;
    }
    pendingLevel = null;
    selected = level;
    run = newJourney(BLOOD_LEVELS[level]);
    data.stats[level] = startAttempt(data.stats[level]);
    record.last = levelStepId(level);
    record.started = true;
    onLevel(level);
    mode = 'play';
    overlayFocus(false);
    ambient = true;
    $('.blood-foot').hidden = false;
    $('[data-footer-menu]').dataset.blood = 'menu';
    $('[data-overlay]').hidden = true;
    $('[data-overlay]').className = 'blood3d-overlay';
    $('[data-overlay]').innerHTML = '';
    $('[data-blood=motion]').textContent = 'Pause bevægelse';
    $('[data-blood=motion]').setAttribute('aria-pressed', 'false');
    await store();
    if (!disposed) {
      await enterStage();
    }
  }
  async function choose(side) {
    if (!ready || busy || panelOpen || !ambient || mode !== 'play') return;
    const route = BLOOD_LEVELS[run.level],
      current = run.phase === 'feedback' ? continueJourney(run) : run,
      next = choosePassage(route, current, side);
    if (next === current) return;
    busy = true;
    ready = false;
    $('.blood-message').hidden = true;
    root.querySelectorAll('[data-passage]').forEach((b) => (b.disabled = true));
    const ok = next.correct > run.correct;
    $('.blood-world').classList.toggle('blood3d-mistake', !ok);
    run = next;
    data.stats[run.level] = recordResult(data.stats[run.level], route, run);
    if (run.phase === 'won' && !record.done.includes(levelStepId(run.level)))
      record.done.push(levelStepId(run.level));
    await store();
    if (disposed) return;
    world.travel(side, ok, async () => {
      try {
        if (disposed) return;
        $('.blood-world').classList.remove('blood3d-mistake');
        if (run.phase === 'won' || run.phase === 'lost') {
          if (run.phase === 'won') await world.enter(route.steps[run.index]);
          if (disposed) return;
          busy = false;
          result();
          return;
        }
        if (run.phase === 'arrival') {
          run = continueJourney(run);
          await store();
          if (disposed) return;
          await enterStage();
          busy = false;
        } else {
          busy = false;
          updateStage();
          world.resumeChoice();
          world.pause(panelOpen || !ambient);
          showChoices();
          canvas.focus({ preventScroll: true });
        }
      } catch (e) {
        failure(e.message);
      }
    });
  }
  async function click(e) {
    const b = e.target.closest('button');
    if (b?.disabled) return;
    if (b?.hasAttribute('data-audio-toggle') || b?.hasAttribute('data-audio-retry')) {
      audioSaved = audio.update({
        enabled: b.hasAttribute('data-audio-retry') ? true : !audio.settings.enabled,
      });
      void audio.activate();
      updateAudioPanel();
      return;
    }
    if (e.target === canvas && mode === 'play') {
      const side = world?.pick(e.clientX, e.clientY);
      if (side >= 0) {
        void audio.activate();
        await choose(side);
      }
      return;
    }
    if (b?.hasAttribute('data-panel-toggle')) {
      setPanel(!panelOpen);
      return;
    }
    if (b?.hasAttribute('data-panel-close')) {
      setPanel(false);
      return;
    }
    if (b?.dataset.blood === 'exit') {
      await store();
      if (!disposed) exit();
      return;
    }
    if (!b || busy) return;
    if (b.dataset.passage !== undefined) {
      void audio.activate();
      await choose(Number(b.dataset.passage));
      return;
    }
    const action = b.dataset.blood;
    if (!action) return;
    if (['start', 'confirm-start', 'restart', 'next', 'resume'].includes(action))
      void audio.activate();
    busy = true;
    try {
      if (action === 'start') await start(selected);
      if (action === 'confirm-start' && pendingLevel) await start(pendingLevel, true);
      if (action === 'cancel-start') menu();
      if (action === 'restart') await start(run.level);
      if (action === 'next') await start(b.dataset.level);
      if (action === 'resume') {
        onLevel(run.level);
        mode = 'play';
        overlayFocus(false);
        $('[data-overlay]').hidden = true;
        $('[data-overlay]').className = 'blood3d-overlay';
        $('[data-overlay]').innerHTML = '';
        $('.blood-foot').hidden = false;
        $('[data-footer-menu]').dataset.blood = 'menu';
        await enterStage();
      }
      if (action === 'menu') {
        await store();
        menu();
      }
      if (action === 'save') await store(true);
      if (action === 'reload') location.reload();
      if (action === 'motion') {
        ambient = !ambient;
        world?.pause(!ambient || panelOpen);
        b.textContent = ambient ? 'Pause bevægelse' : 'Start bevægelse';
        b.setAttribute('aria-pressed', String(!ambient));
        root.querySelectorAll('[data-passage]').forEach((p) => (p.disabled = !ambient));
      }
    } catch (e) {
      failure(e.message);
    } finally {
      busy = false;
    }
  }
  function input(e) {
    if (e.target.hasAttribute('data-anatomy-focus')) world?.focusAnatomy(e.target.checked);
    const key = e.target.dataset.audio;
    if (key) {
      audioSaved = audio.update({
        [key]: key === 'volume' ? Number(e.target.value) / 100 : e.target.checked,
      });
      void audio.activate();
      updateAudioPanel();
    }
    if (e.target.matches('[data-quality3d]')) world?.setQuality(e.target.value);
    if (e.target.name === 'blood-level') selected = e.target.value;
  }
  function keyboard(e) {
    if (e.key === 'Escape' && panelOpen) {
      e.preventDefault();
      setPanel(false);
      return;
    }
    if (e.key === 'Escape' && pendingLevel) {
      e.preventDefault();
      menu();
      return;
    }
    if (panelOpen) return;
    if (e.target.closest('.blood-audio') || e.target.matches('select')) return;
    if (['ArrowLeft', 'ArrowRight'].includes(e.key) && ready) {
      e.preventDefault();
      const side = e.key === 'ArrowLeft' ? 0 : 1;
      $(`[data-passage="${side}"]`)?.focus();
      world.highlight(side);
    }
  }
  function hover(e) {
    if (!ready || !world) return;
    const button = e.target.closest('[data-passage]'),
      side = button
        ? Number(button.dataset.passage)
        : e.target === canvas
          ? world.pick(e.clientX, e.clientY)
          : -1;
    world.highlight(side);
    canvas.style.cursor = side < 0 ? 'default' : 'pointer';
    root
      .querySelectorAll('[data-passage]')
      .forEach((b, i) => b.classList.toggle('highlight', i === side));
  }
  root.addEventListener('click', click);
  root.addEventListener('input', input);
  root.addEventListener('keydown', keyboard);
  root.addEventListener('pointermove', hover);
  updateStage();
  menu();
  void boot();
  return () => {
    disposed = true;
    unlockViewport();
    clearTimeout(noticeTimer);
    world?.dispose();
    audio.dispose();
    root.removeEventListener('click', click);
    root.removeEventListener('input', input);
    root.removeEventListener('keydown', keyboard);
    root.removeEventListener('pointermove', hover);
  };
}
function sceneDescription(s) {
  if (s.kind === 'av-two')
    return 'To klapsejl: anterior og posterior · to papillærmuskelgrupper · åbner i diastolen';
  if (s.kind === 'av-three')
    return 'Tre klapsejl: anterior, posterior og septal · chordae til højre ventrikel · åbner i diastolen';
  if (s.kind === 'semilunar')
    return s.id === 'aorticValve'
      ? 'Tre koronar-/non-koronarflige · Valsalvas sinus · åbner i systolen · ingen chordae'
      : 'Tre halvmåneformede lommer · højre ventrikels udløb → lungearteriestammen · åbner i systolen';
  if (s.kind === 'atrium') return 'Forkammer · tynd muskelvæg';
  if (s.kind === 'left-ventricle') return 'Venstre hjertekammer · tyk muskelvæg · finere trabekler';
  if (s.kind === 'right-ventricle')
    return 'Højre hjertekammer · grovere trabekler som en del af muskelvæggen';
  if (s.kind === 'lung-capillary') return 'Kapillærnet tæt omkring alveoler';
  if (s.kind === 'systemic-capillary') return 'Udveksling gennem den tynde kapillærvæg';
  if (s.kind === 'arteriole') return 'Snævert lumen · glat muskulatur regulerer diameteren';
  if (['venules', 'pvenules'].includes(s.id)) return 'Venole · tynd væg · langsom, jævn strøm';
  if (s.kind === 'vein')
    return s.id === 'veins'
      ? 'Perifer armvene · tynd væg og veneklapper'
      : 'Stor vene · eftergivelig væg · ingen klapper her';
  return 'Arterie · elastisk muskelvæg · glat endotel · ingen veneklapper';
}
