import { createExamController } from './digestion-exam-controller.js';
import { createSequenceRunner } from './digestion-sequence.js';
import { createCheckpointSaver, CHECKPOINT_INTERVAL } from './digestion-save.js';
import { NUTRIENT_ENDINGS } from './digestion-finale.js';
import { createDigestAudio } from './digestion-audio.js';
import { moleculeIcon, answerIcon } from './digestion-presentation.js';
import { learningPoint, rememberLearning } from './digestion-learning.js';
import { routeButtons, gameToolbar, settingsDrawer } from './journey-ui.js';
import {
  ENTRY_OPTIONS,
  anatomicalOptions,
  anatomicalFeedback,
  renderDigestMap,
} from './digestion-navigation.js';
import { CHARACTERS, ROUTE, BOSSES, PRODUCTS } from './digestion-data.js';
import { ABSORPTION_CHOICES } from './digestion-assessment.js';
import {
  newDigestion,
  chooseDigestion,
  retryDigestion,
  migrateDigestion,
  enzymeTotal,
  shuffled,
  activeClock,
  initialProduct,
} from './digestion-engine.js';
import { createDigestionWorld } from './digestion-world.js';
import { lockGameViewport } from './blood-viewport.js';
import { esc } from './ui.js';
export function mountDigestion(root, { record, initialCharacter = 'stanley', save, onCharacter }) {
  const data = migrateDigestion((record.digestion ??= { results: {} }));
  let run = data.active,
    world,
    disposed = false,
    restoringAnimation = false,
    busy = false,
    selected = CHARACTERS[initialCharacter] ? initialCharacter : 'stanley',
    ambientSounds = true,
    effectSounds = true,
    mapVisible = true,
    volume = 0.3,
    sound = false,
    motion = !matchMedia('(prefers-reduced-motion: reduce)').matches,
    latin = true,
    options = [],
    feedback = '',
    clock = run ? activeClock(run) : null,
    playing = false,
    userPaused = false,
    lifecycleSuspended = false;
  const sequenceRunner = createSequenceRunner();
  const unlock = lockGameViewport(root);
  const preferences = data.settings || {};
  sound = preferences.sound ?? false;
  volume = preferences.volume ?? 0.3;
  motion = preferences.motion ?? motion;
  ambientSounds = preferences.ambient ?? true;
  effectSounds = preferences.effects ?? true;
  mapVisible = preferences.map ?? true;
  root.innerHTML = `<section class="digestion-game blood3d"><canvas tabindex="0" aria-label="Fordøjelseskanalen og næringsstoffer i 3D. Træk for at kigge; brug piletaster, Tab og Enter til svar."></canvas>${gameToolbar(
    {
      back: '<a class="back" href="#/">← Tilbage til læringsstier</a>',
      sound: `<button data-digest="sound" aria-pressed="${sound}">${sound ? 'Slå lyd fra' : 'Slå lyd til'}</button>`,
      settings:
        '<button data-digest="settings" aria-controls="digestion-settings" aria-expanded="false" aria-label="Spilindstillinger">⚙</button>',
      menu: '<button data-digest="menu" aria-label="Vælg karakter">☰</button>',
    },
  )}${settingsDrawer('digestion-settings', `<button data-digest="settings-close" class="secondary">Luk indstillinger</button><button data-digest="pause" aria-pressed="false">Pause</button><section class="blood-audio" aria-label="Lydindstillinger"><label><input type="checkbox" data-setting="sound" ${sound ? 'checked' : ''}>Lyd</label><label class="blood-volume">Lydstyrke <output data-volume>${Math.round(volume * 100)}%</output><input type="range" min="0" max="1" step=".05" value="${volume}" data-setting="volume"></label><p>Originale, dæmpede miljø- og effektlyde. Ingen lydfiler hentes under spillet.</p><label><input type="checkbox" data-setting="ambient" ${ambientSounds ? 'checked' : ''}>Miljølyde</label><label><input type="checkbox" data-setting="effects" ${effectSounds ? 'checked' : ''}>Effektlyde</label><p data-digest-audio-status>Lyd starter efter dit klik.</p></section><label><input type="checkbox" data-setting="motion" ${motion ? 'checked' : ''}>Bevægelse</label><button data-digest="map" aria-expanded="${mapVisible}">Vis / skjul kropskort</button><button data-digest="center">◎ Centrér kamera</button><p>Træk eller swipe for at kigge rundt. Venstre/højre pil flytter fokus mellem svar; Enter vælger. Tasterne 1–3 kan også bruges.</p><p>Stiliseret undervisningsmodel. Molekyler og organer vises i forskellige skalaer.</p>`)}<div class="digest-hud blood3d-hud"></div><div class="digest-learning" hidden></div><div class="digest-compartments" hidden></div><aside class="digest-map" data-body-map ${mapVisible ? '' : 'hidden'}></aside><div class="blood3d-bottom"><p class="digest-product"></p><div class="blood-progress" role="progressbar" aria-label="Fremdrift gennem fordøjelseskanalen" aria-valuemin="1" aria-valuemax="15" aria-valuenow="1"><span></span></div><span data-progress-copy></span></div><div class="digest-panel"></div><p class="digest-save" role="status"></p></section>`;
  root.querySelector('#digestion-settings').classList.add('digest-settings');
  const $ = (s) => root.querySelector(s),
    panel = $('.digest-panel');
  const toolbarObserver = new ResizeObserver(() => {
    root.style.setProperty('--digest-toolbar-height', $('.blood-game-bar').offsetHeight + 'px');
    root.style.setProperty('--toolbar-end', $('.blood-game-bar').offsetHeight + 8 + 'px');
    root.style.setProperty(
      '--hud-end',
      $('.digest-hud').offsetTop + $('.digest-hud').offsetHeight + 12 + 'px',
    );
    root.style.setProperty(
      '--digest-info-bottom',
      $('.digest-learning').offsetTop + $('.digest-learning').offsetHeight + 8 + 'px',
    );
  });
  toolbarObserver.observe($('.blood-game-bar'));
  toolbarObserver.observe($('.digest-hud'));
  toolbarObserver.observe($('.digest-learning'));
  const controlsObserver = new ResizeObserver(() =>
    root.style.setProperty(
      '--digest-controls-height',
      Math.max(panel.offsetHeight + 16, ($('.digest-route-labels')?.offsetHeight || 0) + 30) + 'px',
    ),
  );
  controlsObserver.observe(panel);
  function measureMap() {
    const height =
      playing && mapVisible ? $('.blood-minimap')?.getBoundingClientRect().height || 0 : 0;
    root.style.setProperty('--digest-map-height', Math.ceil(height) + 'px');
  }
  const mapObserver = new ResizeObserver(measureMap);
  function readingOpen() {
    return !$('.digest-settings').hidden;
  }
  function currentMoleculeLabel() {
    return run?.absorbed
      ? PRODUCTS.residue
      : run?.absorptionView === 'transport' && run.character === 'trine'
        ? 'Chylomikron → lymfe'
        : run?.emulsified && run.product === 'triglyceride'
          ? 'Emulgerede fedtdråber'
          : PRODUCTS[run?.product] || '';
  }
  function renderLearning() {
    const card = $('.digest-learning'),
      p = data.learningCurrent;
    card.hidden = !playing || !p;
    if (!p) return;
    const iconForm = assessment?.character
      ? initialProduct(assessment.character)
      : run?.absorptionView === 'transport' && !run.absorbed
        ? run.character === 'trine'
          ? 'chylomicron'
          : run.product
        : run?.emulsified && run.product === 'triglyceride'
          ? 'emulsified-fat'
          : run?.product || 'polysaccharide';
    card.innerHTML =
      `${moleculeIcon(iconForm, assessment?.character ? CHARACTERS[assessment.character].name : currentMoleculeLabel() || 'Næringsstof')}` +
      `<span class="digest-point ${p.error ? 'digest-feedback' : ''}" role="status"><strong class="digest-point-title">${esc(p.title)}</strong><span class="digest-explanation">${esc(p.short)}</span></span>`;
  }
  function learn(point) {
    rememberLearning(data, point);
    renderLearning();
  }
  const soundscape = createDigestAudio({
    onChange(state) {
      $('.digestion-game').dataset.audio = JSON.stringify(state);
      const status = $('[data-digest-audio-status]');
      if (status)
        status.textContent = state.blocked
          ? 'Lyd kunne ikke startes. Prøv lydknappen igen.'
          : !state.enabled
            ? 'Lyd er slået fra.'
            : state.unlocked
              ? 'Lyd er klar.'
              : 'Lyd starter efter dit første klik.';
    },
  });
  soundscape.configure({ enabled: sound, volume, ambient: ambientSounds, effects: effectSounds });
  const unlockAudio = () => {
    if (sound) void soundscape.unlock();
  };
  root.addEventListener('pointerdown', unlockAudio, true);
  root.addEventListener('keydown', unlockAudio, true);
  function captureCheckpoint() {
    if (run) {
      clock?.tick(
        playing && !userPaused && !document.hidden && !lifecycleSuspended && !readingOpen(),
      );
      const timeline = world?.timeline();
      if (
        timeline?.stage === ROUTE[run.index]?.id &&
        (sequenceRunner.active || ['travel', 'boss'].includes(timeline.mode))
      )
        run.animation = {
          ...timeline,
          age: Math.min(3600, sequenceRunner.active ? sequenceRunner.age : timeline.age),
        };
      data.active = run;
    }
    record.updatedAt = Date.now();
  }
  const checkpoints = createCheckpointSaver({
    capture: captureCheckpoint,
    save: () => save({ retry: true }),
    onResult(ok) {
      if (!disposed)
        $('.digest-save').innerHTML = ok
          ? 'Gemt'
          : 'Ikke gemt. <button data-digest="save">Prøv at gemme igen</button>';
    },
  });
  function store() {
    return checkpoints.request();
  }
  const assessment = createExamController({
    data,
    panel,
    learn,
    store,
    focusQuestion,
    stage: () => ROUTE[run?.index || 0].id,
    information: (visible) => {
      $('.digest-learning').hidden = !visible;
    },
    prepare() {
      playing = false;
      clock?.pause();
      cancel();
      soundscape.pause(true);
      world?.pause(true);
    },
  });
  function syncPause() {
    const hold = userPaused || document.hidden || lifecycleSuspended || readingOpen();
    if (hold) {
      clock?.pause();
    } else if (playing) clock?.resume();
    sequenceRunner.pause(hold);
    world?.pause(hold);
    soundscape.pause(hold || !playing);
    panel.inert = hold;
    $('canvas').inert = hold;
    $('.digest-game-paused')?.remove();
    $('[data-digest=pause]').textContent = userPaused ? 'Fortsæt' : 'Pause';
    $('[data-digest=pause]').setAttribute('aria-pressed', String(userPaused));
  }
  const visibility = () => {
    syncPause();
    if (document.hidden) void store();
  };
  document.addEventListener('visibilitychange', visibility);
  const pagehide = () => {
    lifecycleSuspended = true;
    syncPause();
    void store();
  };
  const pageshow = () => {
    lifecycleSuspended = false;
    syncPause();
  };
  window.addEventListener('pagehide', pagehide);
  window.addEventListener('pageshow', pageshow);
  const checkpoint = setInterval(() => {
    if (playing && !userPaused && !document.hidden && !lifecycleSuspended && !readingOpen())
      void store();
  }, CHECKPOINT_INTERVAL);
  function hud() {
    if (!run) {
      $('.digest-hud').innerHTML = '';
      return;
    }
    const s = ROUTE[run.index];
    $('.digest-map').innerHTML = renderDigestMap(run.index);
    $('.digest-map').style.visibility = playing ? 'visible' : 'hidden';
    mapObserver.disconnect();
    mapObserver.observe($('.blood-minimap'));
    measureMap();
    $('.digest-hud').innerHTML =
      `<div class="blood-location"><strong class="blood3d-eyebrow">${esc(CHARACTERS[run.character].name)}</strong><h1>${esc(run.phase === 'entry' ? 'Uden for ansigtet' : s.danish + ' · ' + s.latin)}</h1><p class="blood-world-caption">${run.absorbed ? 'Du følger nu en ufordøjelig rest.' : s.id === 'epiglottis' ? 'Observationspunkt: føden passerer ikke gennem strubelåget.' : currentMoleculeLabel()}</p></div><div class="blood3d-top-controls"><span class="blood-lives" role="img" aria-label="${run.lives} af 2 liv tilbage">${'♥'.repeat(run.lives)}${'♡'.repeat(2 - run.lives)}</span></div>`;
    $('.digest-product').textContent = PRODUCTS[run.absorbed ? 'residue' : run.product] || '';
    $('.blood-progress').setAttribute('aria-valuenow', String(run.index + 1));
    $('.blood-progress>span').style.width = ((run.index + 1) / ROUTE.length) * 100 + '%';
    $('[data-progress-copy]').textContent = `${run.index + 1} / ${ROUTE.length}`;
  }

  function showScene(mode) {
    $('.digestion-game').classList.toggle('digest-finale', mode === 'finale');
    if (mode !== 'finale') panel.classList.remove('digest-result');
    $('.digestion-game').classList.toggle(
      'digest-absorption',
      ['absorb', 'transport'].includes(mode),
    );
    const micro = false;
    $('.digestion-game').classList.toggle('digest-micro', micro);
    $('.digest-compartments').hidden = !['absorb', 'transport'].includes(mode);
    $('.digest-compartments').innerHTML =
      '<span>Tarmlumen</span><span>Tarmepitel</span><span class=\"blood-compartment\">Blodkapillær' +
      (run?.character !== 'trine' ? ' ← herhen' : '') +
      '</span><span class=\"lymph-compartment\">Lymfekar' +
      (run?.character === 'trine' ? ' ← herhen' : '') +
      '</span>';

    const checkpoint =
      restoringAnimation &&
      run?.animation?.stage === ROUTE[run?.index || 0].id &&
      run.animation.mode === mode
        ? run.animation.age
        : 0;
    restoringAnimation = false;
    world?.setScene(
      ROUTE[run?.index || 0],
      mode === 'menu' ? selected : run?.character || selected,
      mode,
      Boolean(run?.absorbed),
      run?.product,
      checkpoint,
    );
    world?.learningState(run);
    soundscape.locate(ROUTE[run?.index || 0].id, mode, playing && mode !== 'menu');
    hud();
    renderLearning();
  }
  function cancel() {
    $('.digest-route-labels')?.remove();
    sequenceRunner.cancel();
    panel.hidden = false;
  }
  function sequence(title, text, mode, seconds, next) {
    cancel();
    showScene(mode);
    panel.classList.remove('digest-nav', 'digest-active');
    panel.classList.add('digest-compact');
    const stage = ROUTE[run?.index || 0].id;
    const taskIndex =
      mode === 'reaction'
        ? BOSSES[run.character][stage]?.length - 1
        : ['secretion', 'brush-border', 'bile'].includes(mode)
          ? run.task - 1
          : undefined;
    if (taskIndex !== undefined) learn(learningPoint(run.character, stage, taskIndex));
    else if (['absorb', 'transport'].includes(mode))
      learn({
        key: run.character + ':' + mode,
        character: run.character,
        stage: 'jejunum',
        title: 'Absorption i tarmmiljøet',
        short:
          mode === 'transport'
            ? run.character === 'trine'
              ? 'Triglycerider gendannes og pakkes i chylomikroner i enterocytten. De følger lymfen via venstre venevinkel til systemisk blod.'
              : run.character === 'stanley'
                ? 'Glukose føres med kapillærblod via vena portae til leveren.'
                : 'Aminosyrer forlader enterocytterne til kapillærer og føres via vena portae til leveren.'
            : run.character === 'trine'
              ? 'Miceller afleverer lipidprodukter ved tarmvæggen; micellen bliver i lumen.'
              : run.character === 'poul'
                ? 'Aminosyrer og di-/tripeptider optages; små peptider hydrolyseres overvejende inde i enterocytterne.'
                : 'Glukose optages via SGLT1 ved børstesømmen og føres videre gennem enterocytten.',
        detail:
          ABSORPTION_CHOICES[run.character].why +
          ' Tarmvæggen vises som en gennemsigtig gennemskæring, så transporten kan ses fra lumen.',
      });
    else if (mode === 'finale')
      learn({
        key: run.character + ':finale',
        character: run.character,
        stage: 'anus',
        title: 'Afslutning',
        short: 'Sfinkterne afslappes. Kun den ufordøjelige rest skylles ud.',
        detail: NUTRIENT_ENDINGS[run.character],
      });
    else if (mode === 'residue')
      learn({
        key: run.character + ':residue',
        character: run.character,
        stage: 'jejunum',
        title: 'Perspektivskift',
        short: 'Næringsstoffet er optaget. Du følger nu en ufordøjelig rest.',
        detail: text,
      });
    else {
      const short =
        mode === 'swallow' ? 'Luftvejen lukkes. Bolus føres bag larynx til oesophagus.' : text;
      learn({
        key: run.character + ':' + stage + ':' + mode,
        character: run.character,
        stage,
        title: mode === 'swallow' ? 'Synkning' : title,
        short,
        detail: text,
      });
    }
    // Keep the complete explanation in the existing learning history.
    if (data.learningCurrent && text && !data.learningCurrent.detail.includes(text)) {
      data.learningCurrent.detail += ' ' + text;
      if (data.learningLog?.at(-1)?.key === data.learningCurrent.key)
        data.learningLog.at(-1).detail = data.learningCurrent.detail;
    }
    panel.replaceChildren();
    panel.hidden = true;
    sequenceRunner.start({
      seconds,
      initialAge: world?.timeline().age || 0,
      age: () => world?.timeline().age || 0,
      animated: () => motion,
      next: () => {
        if (disposed) return;
        cancel();
        delete run.animation;
        next();
      },
    });
    syncPause();
    void store();
  }
  function menu() {
    clock?.pause();
    playing = false;
    userPaused = false;
    panel.inert = false;
    world?.pause(document.hidden);
    soundscape.pause(true);
    assessment.cancel();
    cancel();
    run = data.active;
    showScene('menu');
    $('.digest-hud').innerHTML = '';
    $('.digest-map').style.visibility = 'hidden';
    $('.blood3d-bottom').hidden = true;
    panel.classList.remove('digest-active', 'digest-nav');
    panel.classList.remove('digest-compact');
    panel.classList.add('digest-menu');
    renderLearning();
    panel.innerHTML = `<h1>Fordøjelsens vilde rejse 4.0</h1><p>Fra første bid til sidste skyl · vælg dit næringsstof</p><div class="digest-characters">${Object.entries(
      CHARACTERS,
    )
      .map(
        ([id, c]) =>
          `<button data-character="${id}" aria-pressed="${selected === id}"><strong>${esc(c.name)}</strong><span>${esc(c.description)}</span>${data.results[id] ? '<b>🏆 Gennemført · Sidste stop: porcelæn</b>' : ''}</button>`,
      )
      .join('')}</div>${Object.keys(data.results)
      .map(
        (id) =>
          `<button data-exam-character="${id}">Tag sluttest: ${esc(CHARACTERS[id].name)}</button>`,
      )
      .join(
        '',
      )}${data.reviewDraft ? '<button data-digest="review-resume">Fortsæt gemt fejlrepetition</button>' : ''}${data.assessmentDraft ? '<button data-digest="exam">Fortsæt gemt sluttest uden hjælp</button>' : ''}${Object.entries(
      data.assessments || {},
    )
      .map(
        ([id, rs]) =>
          `<p>${esc(CHARACTERS[id].name)} · seneste test: ${rs.at(-1).correct}/5 · ${rs.length} forsøg</p>${rs.at(-1).answers.some((a) => a !== 0) ? `<button data-review-character="${id}">Repetér fejl · ${esc(CHARACTERS[id].name)}</button>` : ''}`,
      )
      .join(
        '',
      )}<p>Find den anatomiske vej og oplev nedbrydning og absorption. To liv – aktuelle udfordringer kan altid genstartes.</p><button data-digest="start">Start rejsen →</button>${data.active && data.active.phase !== 'won' ? '<button data-digest="resume">Fortsæt gemt rejse</button>' : ''}${Object.keys(CHARACTERS).length === 3 && Object.keys(data.results).length === 3 ? '<p>🏆 FORDØJELSESMESTER – Du har overlevet både syre, enzymer og tyktarmens bakterier.</p>' : ''}`;
  }
  function start() {
    panel.classList.remove('digest-menu');
    run = newDigestion(selected);
    data.active = run;
    clock = activeClock(run);
    clock.resume();
    playing = true;
    soundscape.pause(false);
    learn(learningPoint(selected, 'mouth'));
    $('.blood3d-bottom').hidden = false;
    onCharacter(selected);
    store();
    sequence(
      'Maden er på vej',
      'Vælg den rigtige indgang til fordøjelsen.',
      'face-intro',
      3,
      entryChoice,
    );
  }
  function entryChoice() {
    run.phase = 'entry';
    showScene('entry');
    options = shuffled(ENTRY_OPTIONS);
    world?.configureChoices(options);
    panel.dataset.stage = 'entry';
    panel.innerHTML = '<h2>Hvor skal maden ind?</h2>';
    const feedbackNode = document.createElement('p');
    feedbackNode.textContent = feedback;
    feedbackNode.setAttribute('role', 'status');
    panel.append(feedbackNode);
    panel.insertAdjacentHTML(
      'beforeend',
      `<div class="digest-route-labels blood3d-labels">${routeButtons(options, 'data-entry')}</div>`,
    );
    panel.classList.add('digest-nav');
    void store();
    bindChoiceFocus('[data-entry]');
    focusQuestion();
  }
  async function entryAnswer(i) {
    if (busy || userPaused || readingOpen() || run?.phase !== 'entry' || !options[i]) return;
    busy = true;
    const correct = options[i].correct;
    chooseDigestion(run, correct);
    feedback = correct ? '' : anatomicalFeedback('nose');
    if (!correct) {
      world?.feedback();
      learn({
        key: run.character + ':entry:wrong',
        character: run.character,
        stage: 'mouth',
        title: 'Vælg mundhulen',
        short: 'Maden skal ind i mundhulen; næsehulen er en del af luftvejen.',
        detail: feedback,
        error: true,
      });
    }
    await store();
    busy = false;
    if (correct)
      sequence(
        'Den første bid',
        'Tænderne findeler. Spyttet blander. Tungen fører bolus bagud.',
        'intro',
        10,
        () => {
          run.phase = 'arrival';
          arrival();
        },
      );
    else if (run.phase === 'retry') {
      $('.digest-route-labels')?.remove();
      panel.classList.remove('digest-nav');
      panel.innerHTML = '<h2>Ny chance ved indgangen</h2>';
      const retry = document.createElement('button');
      retry.dataset.digest = 'retry';
      retry.textContent = 'Prøv igen';
      panel.append(retry);
    } else entryChoice();
  }
  function focusQuestion() {
    const heading = panel.querySelector('h2');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }
  function bindChoiceFocus(selector = '[data-choice]') {
    root.querySelectorAll(selector).forEach((b) => {
      const i = Number(b.dataset.choice ?? b.dataset.entry);
      b.addEventListener('pointerenter', () => world?.highlightChoice(i));
      b.addEventListener('focus', () => world?.highlightChoice(i));
      b.addEventListener('pointerleave', () => world?.highlightChoice(-1));
    });
  }
  function arrival() {
    cancel();
    panel.classList.remove('digest-menu');
    const s = ROUTE[run.index];
    learn(learningPoint(run.character, s.id));
    if (s.automatic) {
      sequence(s.latin + ' · ' + s.danish, s.text, 'travel', 3, () => {
        run.index++;
        arrival();
      });
      return;
    }
    if (s.id === 'anus') {
      run.phase = 'finale';
      store();
      sequence(
        'Lyset for enden af tunnelen',
        s.text + ' Sfinkterne slapper af. Næste stop er en ren, stiliseret toiletkumme.',
        'finale',
        5,
        finish,
      );
      return;
    }
    if (
      s.id === 'jejunum' &&
      !run.absorbed &&
      (!BOSSES[run.character].jejunum || (run.completed || []).includes('jejunum'))
    ) {
      run.phase = 'absorption';
      absorption();
      return;
    }
    if (BOSSES[run.character][s.id] && !(run.completed || []).includes(s.id)) {
      run.phase = 'boss';
      showScene('boss');
      drawChoices();
    } else {
      run.phase = 'route';
      showScene('travel');
      drawChoices();
    }
    store();
  }
  function routeChoices() {
    return anatomicalOptions(run.index, latin);
  }
  function drawChoices() {
    hud();
    panel.classList.add('digest-active', 'digest-compact');
    panel.classList.toggle('digest-nav', run.phase === 'route');
    const s = ROUTE[run.index],
      task = run.phase === 'boss' ? BOSSES[run.character][s.id][run.task] : null;
    panel.dataset.stage = s.id;
    options = shuffled(
      task ? task.options.map((label, i) => ({ label, correct: i === 0 })) : routeChoices(),
    );
    world?.labelChoices(options.map((o) => o.label));
    world?.configureChoices(options, task?.kind || 'anatomy');
    world?.learningState(run);
    panel.innerHTML = `<p class="digest-eyebrow">${task ? `MOLEKYLEUDFORDRING · ${run.task + 1}/${BOSSES[run.character][s.id].length}` : 'FIND DEN ANATOMISKE VEJ'}</p><h2 tabindex="-1">${esc(task?.prompt || 'Hvad er næste anatomiske struktur?')}</h2>${task ? `<div class="digest-choices">${options.map((o, i) => `<button data-choice="${i}" class="digest-answer-${task.kind}" data-answer-kind="${task.kind}">${answerIcon(task, o.label)}<span><b>${i + 1}</b> ${esc(o.label)}</span></button>`).join('')}</div>` : `<div class="digest-route-labels blood3d-labels">${routeButtons(options, 'data-choice')}</div>`}`;
    bindChoiceFocus();
    focusQuestion();
  }
  function continueAfterReaction() {
    const s = ROUTE[run.index];
    run.product = BOSSES[run.character][s.id].at(-1).output;
    if (s.id === 'jejunum') {
      absorption();
      return;
    }
    run.phase = 'route';
    feedback = '';
    showScene('travel');
    drawChoices();
    void store();
  }
  async function answer(i) {
    if (
      busy ||
      !run ||
      userPaused ||
      readingOpen() ||
      !['boss', 'route'].includes(run.phase) ||
      !options[i]
    )
      return;
    busy = true;
    root.querySelectorAll('[data-choice]').forEach((b) => (b.disabled = true));
    const s = ROUTE[run.index],
      task = run.phase === 'boss' ? BOSSES[run.character][s.id][run.task] : null;
    const correct = options[i].correct;
    if (correct && !task && s.id === 'epiglottis') {
      run.phase = 'swallow';
      sequence(
        'Synkning – beskyt luftvejen',
        'Larynx løftes; stemmelæber og larynxindgang lukkes koordineret. Føden går bag luftvejen til oesophagus.',
        'swallow',
        3,
        () => {
          run.phase = 'route';
          chooseDigestion(run, true);
          arrival();
        },
      );
      busy = false;
      void store();
      return;
    }
    chooseDigestion(run, correct);
    feedback = correct ? '' : task ? task.why : anatomicalFeedback(options[i].target, s.index);
    if (!correct) {
      const point = learningPoint(run.character, s.id, task ? run.task : undefined);
      learn({
        ...point,
        key: point.key + ':wrong',
        error: true,
        short: task
          ? point.short
          : feedback
              .split(/[.!?] /)[0]
              .split(/\s+/)
              .slice(0, 20)
              .join(' '),
        detail: feedback,
      });
    }
    if (correct && task)
      learn(
        learningPoint(
          run.character,
          s.id,
          run.phase === 'reaction' ? BOSSES[run.character][s.id].length - 1 : run.task - 1,
        ),
      );
    try {
      await store();
      if (disposed) return;
      if (run.phase === 'retry') {
        $('.digest-route-labels')?.remove();
        panel.innerHTML = `<h2>To liv brugt – ny chance</h2><p>${esc(feedback)}</p><button data-digest="retry">Genstart aktuelle udfordring</button>`;
        panel.classList.remove('digest-nav');
      } else if (correct && task?.visual) {
        run.phase = 'secretion';
        run.secretionKind = task.visual;
        sequence(
          task.visual === 'bile'
            ? 'Galde emulgerer – bindingerne bevares'
            : task.visual === 'brush-border'
              ? 'Enzymer ved børstesømmen'
              : 'Sekretet ankommer',
          task.why,
          task.visual,
          4,
          () => {
            if (task.visual === 'bile') run.emulsified = true;
            run.phase = 'boss';
            showScene('boss');
            drawChoices();
            void store();
          },
        );
      } else if (!correct || run.phase === 'boss') {
        if (!correct) {
          world?.feedback();
          if (options[i].target === 'trachea') soundscape.effect('cough');
        }
        drawChoices();
      } else if (run.phase === 'reaction') {
        sequence(
          'Følg det nye nedbrydningsprodukt',
          task.why,
          'reaction',
          7,
          continueAfterReaction,
        );
      } else {
        feedback = '';
        arrival();
      }
    } finally {
      busy = false;
      root.querySelectorAll('[data-choice]').forEach((b) => (b.disabled = false));
    }
  }
  function absorption() {
    if (run.absorbed && run.absorptionView === 'residue') {
      sequence(
        'Nu skifter perspektivet',
        'Næringsstoffet er optaget. Du følger nu en ufordøjelig rest.',
        'residue',
        2,
        () => {
          run.phase = 'route';
          showScene('travel');
          drawChoices();
          void store();
        },
      );
      return;
    }
    run.phase = 'absorption';
    panel.classList.remove('digest-active', 'digest-nav');
    if (run.absorptionPassed) {
      run.absorptionView = 'transport';
      void store();
      sequence(
        'Følg transporten',
        run.character === 'trine'
          ? 'Triglycerider gendannes → chylomikron → lymfe. Micellen bliver i lumen.'
          : run.character === 'stanley'
            ? 'Glukose → enterocyt → blod.'
            : 'Aminosyrer → enterocyt → blod.',
        'transport',
        11,
        () => {
          run.absorbed = true;
          run.product = 'residue';
          run.absorptionView = 'residue';
          void store();
          sequence(
            'Nu skifter perspektivet',
            'Næringsstoffet er optaget. Du følger en ufordøjelig rest gennem ileum.',
            'residue',
            2,
            () => {
              run.phase = 'route';
              showScene('travel');
              drawChoices();
              void store();
            },
          );
        },
      );
      return;
    }
    run.absorptionView = 'absorb';
    void store();
    sequence(
      'Absorption gennem tarmvæggen',
      run.character === 'stanley'
        ? 'Glukose optages ved koblet transport gennem enterocytten – videre til blodet.'
        : run.character === 'trine'
          ? 'Miceller afleverer fedtsyrer og monoglycerider ved enterocytten.'
          : 'Aminosyrer og små peptider optages i enterocytten.',
      'absorb',
      7,
      absorptionChoice,
    );
  }
  function absorptionChoice() {
    panel.classList.remove('digest-active', 'digest-nav');
    run.phase = 'absorb-choice';
    showScene('absorb');
    const q = ABSORPTION_CHOICES[run.character];
    options = shuffled(q.options.map((label, i) => ({ label, correct: i === 0 })));
    panel.classList.add('digest-compact');
    if (!feedback)
      learn({
        key: run.character + ':uptake',
        character: run.character,
        stage: 'jejunum',
        title: 'Absorption i jejunum',
        short:
          run.character === 'trine'
            ? 'Langkædede lipidprodukter optages gennem tarmvæggen; chylomikroner transporterer fedtet videre til lymfen.'
            : run.character === 'stanley'
              ? 'SGLT1 optager glukose apikalt; GLUT2 fører den videre mod kapillærer og portalblod.'
              : 'PEPT1 optager di-/tripeptider. Intracellulære peptidaser danner aminosyrer, som følger blodet.',
        detail: q.why,
      });
    panel.innerHTML = `<h2>${esc(q.prompt)}</h2><div class="digest-choices">${options.map((o, i) => `<button data-absorb="${i}">${esc(o.label)}</button>`).join('')}</div>`;
    focusQuestion();
    void store();
  }
  async function finish() {
    panel.classList.remove('digest-active', 'digest-nav', 'digest-compact');
    panel.classList.add('digest-result');
    $('.digestion-game').classList.add('digest-finale');
    run.phase = 'won';
    if (world?.timeline().mode !== 'finale')
      world?.setScene(ROUTE[14], run.character, 'finale', true, 'residue', 8.2);
    world?.complete();
    clock?.pause();
    playing = false;
    renderLearning();
    measureMap();
    $('.digest-compartments').hidden = true;
    $('.digest-map').style.visibility = 'hidden';
    data.results[run.character] = structuredClone(run);
    if (!record.done.includes('digestion-' + run.character))
      record.done.push('digestion-' + run.character);
    record.last = 'digestion-' + run.character;
    await store();
    if (disposed) return;
    soundscape.locate('anus', 'won', true);
    soundscape.effect('finish');
    panel.innerHTML = `<h2>TILLYKKE! Fra første bid til sidste skyl.</h2><p>${esc(CHARACTERS[run.character].name)} · 🏆 Syreoverleveren · Sidste stop: porcelæn</p><p class="digest-nutrient-ending">${esc(NUTRIENT_ENDINGS[run.character])} Kun den ufordøjelige rest skylles ud.</p><dl><dt>Korrekte anatomiske valg</dt><dd>${run.anatomy}</dd><dt>Korrekte enzymdelopgaver</dt><dd>${run.enzyme} / ${enzymeTotal(run.character)}</dd><dt>Fejl · resterende liv</dt><dd>${run.errors} · ${run.lives}</dd><dt>Tid</dt><dd>${Math.round(run.elapsed / 1000)} aktive sekunder${run.timingVersion === 2 ? '' : ' (historisk tid fra før v2)'}</dd></dl><details><summary>Enzymer og transportvej</summary><p>Enzymer: ${esc(CHARACTERS[run.character].enzymes)}</p><p>Absorption i tyndtarmen: ${esc(CHARACTERS[run.character].transport)}</p><h3>Læringsoversigt</h3><ol>${[...new Map((data.learningLog || []).filter((p) => p.character === run.character).map((p) => [p.key, p])).values()].map((p) => `<li><strong>${esc(p.title)}</strong><p>${esc(p.short)}</p><p>${esc(p.detail)}</p></li>`).join('')}</ol></details><p>Gennemført aktivitet er ikke dokumentation for klinisk kompetence.</p><p>Porcelænet fik resten – kroppen beholdt næringen. Fra første bid til sidste skyl!</p><button data-digest="exam">Afsluttende test · 5 spørgsmål uden hjælp</button><button data-digest="menu">Skyl ud og prøv et nyt næringsstof!</button>`;
  }
  const click = async (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled || busy || assessment.busy) return;
    if (b.dataset.entry !== undefined) {
      await entryAnswer(Number(b.dataset.entry));
      return;
    }
    if (b.dataset.examCharacter) {
      if (
        data.assessmentDraft &&
        !confirm(
          'Start en ny sluttest? Den ufærdige test erstattes, mens tidligere resultater bevares.',
        )
      )
        return;
      assessment.start(b.dataset.examCharacter, true);
      return;
    }
    if (b.dataset.reviewCharacter) {
      assessment.review(b.dataset.reviewCharacter);
      return;
    }
    if (b.dataset.examAnswer !== undefined) {
      await assessment.answer(Number(b.dataset.examAnswer));
      return;
    }
    if (b.dataset.absorb !== undefined) {
      if (busy || userPaused || readingOpen()) return;
      busy = true;
      const correct = options[Number(b.dataset.absorb)]?.correct === true;
      chooseDigestion(run, correct);
      feedback = correct ? '' : ABSORPTION_CHOICES[run.character].why.split('. ')[0] + '.';
      if (!correct)
        learn({
          key: run.character + ':uptake:wrong',
          character: run.character,
          stage: 'jejunum',
          title: 'Vælg transportvejen',
          short:
            run.character === 'trine'
              ? 'Chylomikroner med langkædet fedt følger lymfen; hele micellen optages ikke.'
              : run.character === 'stanley'
                ? 'Glukose følger blodet, ikke chylomikronernes lymfevej.'
                : 'Aminosyrer følger blodet, ikke chylomikronernes lymfevej.',
          detail: ABSORPTION_CHOICES[run.character].why,
          error: true,
        });
      await store();
      if (run.phase === 'retry')
        panel.innerHTML = `<h2>Ny chance ved absorptionen</h2><p>${esc(feedback)}</p><button data-digest="retry">Prøv absorptionen igen</button>`;
      else if (correct) {
        absorption();
      } else absorptionChoice();
      busy = false;
      return;
    }
    if (b.dataset.character) {
      selected = b.dataset.character;
      onCharacter(selected);
      menu();
      return;
    }
    if (b.dataset.choice !== undefined) {
      await answer(Number(b.dataset.choice));
      return;
    }
    const a = b.dataset.digest;
    if (a === 'review-resume' && data.reviewDraft) {
      assessment.resumeReview();
      return;
    }
    if (a === 'exam-next') {
      assessment.next();
      return;
    }
    if (a === 'center') {
      world?.center();
      return;
    }
    if (a === 'map') {
      const map = $('.digest-map');
      map.hidden = !map.hidden;
      mapVisible = !map.hidden;
      persistSettings();
      map.innerHTML = renderDigestMap(run?.index || 0);
      mapObserver.disconnect();
      mapObserver.observe($('.blood-minimap'));
      measureMap();
      b.setAttribute('aria-expanded', String(!map.hidden));
      return;
    }
    if (a === 'pause') {
      userPaused = !userPaused;
      syncPause();
      void store();
      return;
    }
    if (a === 'hint') {
      feedback =
        BOSSES[run.character][ROUTE[run.index].id]?.[run.task]?.why || ROUTE[run.index].text;
      drawChoices();
      return;
    }
    if (a === 'exam') {
      assessment.start(run?.character || selected);
      return;
    }
    if (a === 'sound') {
      sound = !sound;
      $('[data-setting=sound]').checked = sound;
      persistSettings();
      if (sound) void soundscape.unlock();
      return;
    }
    if (a === 'settings' || a === 'settings-close') {
      const el = $('.digest-settings');
      el.hidden = a === 'settings-close' || !el.hidden;
      $('[data-digest=settings]').setAttribute('aria-expanded', String(!el.hidden));
      syncPause();
      (el.hidden ? $('[data-digest=settings]') : $('[data-digest=settings-close]')).focus();
    }
    if (a === 'start') {
      if (
        data.active &&
        data.active.phase !== 'won' &&
        !confirm(
          'Start en ny rejse? Den gemte igangværende rejse erstattes. Gennemførelser bevares.',
        )
      )
        return;
      start();
    }
    if (a === 'menu') {
      if (run) await store();
      menu();
    }
    if (a === 'resume') {
      run = data.active;
      clock = activeClock(run);
      clock.resume();
      playing = true;
      soundscape.pause(false);
      $('.blood3d-bottom').hidden = false;
      panel.classList.remove('digest-menu');
      selected = run.character;
      restoringAnimation = true;
      if (
        !data.learningCurrent ||
        data.learningCurrent.character !== run.character ||
        data.learningCurrent.stage !== ROUTE[run.index].id ||
        data.learningCurrent.key.includes(':exam:')
      )
        learn(learningPoint(run.character, ROUTE[run.index].id));
      onCharacter(selected);
      if (run.phase === 'entry' && run.animation?.mode === 'face-intro') {
        sequence(
          'Maden er på vej',
          'Vælg den rigtige indgang til fordøjelsen.',
          'face-intro',
          3,
          entryChoice,
        );
        return;
      }
      if (run.phase === 'entry') {
        entryChoice();
        return;
      }
      if (run.phase === 'won') finish();
      else if (run.phase === 'intro')
        sequence(
          'Den første bid',
          'Tænderne findeler. Spyttet blander. Tungen fører bolus bagud.',
          'intro',
          10,
          () => {
            run.phase = 'arrival';
            arrival();
          },
        );
      else if (run.phase === 'finale') arrival();
      else if (run.phase === 'swallow')
        sequence('Synkning – beskyt luftvejen', ROUTE[2].text, 'swallow', 3, () => {
          run.phase = 'route';
          chooseDigestion(run, true);
          arrival();
        });
      else if (run.phase === 'reaction')
        sequence(
          'Enzymreaktion',
          BOSSES[run.character][ROUTE[run.index].id].at(-1).why,
          'reaction',
          7,
          continueAfterReaction,
        );
      else if (run.phase === 'route' || run.phase === 'boss') {
        showScene(run.phase === 'boss' ? 'boss' : 'travel');
        drawChoices();
      } else if (run.phase === 'retry') {
        retryDigestion(run);
        if (run.phase === 'absorb-choice') {
          absorptionChoice();
          return;
        }
        showScene(run.phase === 'boss' ? 'boss' : 'travel');
        drawChoices();
      } else if (run.phase === 'absorb-choice') {
        absorptionChoice();
      } else if (run.phase === 'absorption') {
        absorption();
      } else if (run.phase === 'secretion') {
        const kind = run.secretionKind || 'secretion';
        const task = BOSSES[run.character][ROUTE[run.index].id][Math.max(0, run.task - 1)];
        sequence(
          kind === 'bile'
            ? 'Galde emulgerer – bindingerne bevares'
            : kind === 'brush-border'
              ? 'Enzymer ved børstesømmen'
              : 'Sekretet ankommer',
          task.why,
          kind,
          4,
          () => {
            if (kind === 'bile') run.emulsified = true;
            run.phase = 'boss';
            showScene('boss');
            drawChoices();
            void store();
          },
        );
      } else arrival();
    }
    if (a === 'retry') {
      retryDigestion(run);
      if (run.phase === 'absorb-choice') {
        absorptionChoice();
        return;
      }
      if (run.phase === 'entry') {
        entryChoice();
        return;
      }
      feedback = '';
      showScene(run.phase === 'boss' ? 'boss' : 'travel');
      drawChoices();
      store();
    }
    if (a === 'save') store();
  };
  const change = (e) => {
    const k = e.target.dataset.setting;
    if (k === 'sound') {
      sound = e.target.checked;
      soundscape.configure({ enabled: sound });
      if (sound) void soundscape.unlock();
    }
    if (k === 'volume') volume = Number(e.target.value);
    if (k === 'ambient') ambientSounds = e.target.checked;
    if (k === 'effects') effectSounds = e.target.checked;
    if (k === 'motion') motion = e.target.checked;
    if (k === 'latin') {
      latin = e.target.checked;
      if (run && ['route', 'boss'].includes(run.phase)) drawChoices();
    }
    world?.settings({ motion });
    persistSettings();
  };
  function persistSettings() {
    data.settings = {
      sound,
      volume,
      motion,
      quality: 'auto', // Legacy save format; no user quality setting.
      ambient: ambientSounds,
      effects: effectSounds,
      map: mapVisible,
    };
    soundscape.configure({ enabled: sound, volume, ambient: ambientSounds, effects: effectSounds });
    $('[data-digest=sound]').textContent = sound ? 'Slå lyd fra' : 'Slå lyd til';
    $('[data-digest=sound]').setAttribute('aria-pressed', String(sound));
    $('[data-volume]').textContent = Math.round(volume * 100) + '%';
    void store();
  }
  const key = (e) => {
    if (e.key === 'Escape' && readingOpen()) {
      $('[data-digest=settings-close]').click();
      return;
    }
    if (e.target.matches('input,select') || readingOpen() || userPaused) return;
    const buttons = [
      ...root.querySelectorAll('[data-choice],[data-entry],[data-absorb],[data-exam-answer]'),
    ].filter((b) => !b.disabled);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const i = buttons.indexOf(document.activeElement),
        n = e.key === 'ArrowRight' ? 1 : -1;
      buttons[(i + n + buttons.length) % buttons.length]?.focus();
    }
    if (['1', '2', '3'].includes(e.key)) {
      e.preventDefault();
      buttons[Number(e.key) - 1]?.click();
    }
  };
  root.addEventListener('click', click);
  const input = (e) => {
    if (e.target.dataset.setting === 'volume') {
      volume = Number(e.target.value);
      soundscape.configure({ volume });
      $('[data-volume]').textContent = Math.round(volume * 100) + '%';
    }
  };
  root.addEventListener('input', input);
  root.addEventListener('change', change);
  root.addEventListener('keydown', key);
  try {
    world = createDigestionWorld($('canvas'), (event) => soundscape.effect(event));
    world.settings({ motion });
    menu();
  } catch {
    root.querySelectorAll('.blood-game-bar button').forEach((b) => (b.disabled = true));
    panel.innerHTML =
      '<h1>3D kunne ikke vises</h1><p>Spillet kræver WebGL 2. Prøv en nyere browser med hardwareacceleration.</p><a href="#/sti/find-vej-kredsloeb/circulation-order">Åbn kredsløbsøvelser uden 3D</a>';
  }
  return () => {
    void store();
    disposed = true;
    assessment.dispose();
    cancel();
    clock?.pause();
    playing = false;
    toolbarObserver.disconnect();
    controlsObserver.disconnect();
    mapObserver.disconnect();

    clearInterval(checkpoint);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('pagehide', pagehide);
    window.removeEventListener('pageshow', pageshow);
    world?.dispose();
    soundscape.dispose();
    root.removeEventListener('pointerdown', unlockAudio, true);
    root.removeEventListener('keydown', unlockAudio, true);
    unlock();
    root.removeEventListener('click', click);
    root.removeEventListener('change', change);
    root.removeEventListener('input', input);
    root.removeEventListener('keydown', key);
  };
}
