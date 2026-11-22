import {
  OXYGEN_ID,
  OXYGEN_TITLE,
  OXYGEN_LEVELS,
  LEARNING,
  oxygenRoute,
  oxygenQuestion,
  anatomicalName,
} from './oxygen-data.js';
import {
  newOxygenRun,
  newOxygenProgress,
  answerOxygen,
  advanceOxygen,
  retryOxygen,
  OXYGEN_ASSESSMENT,
} from './oxygen-engine.js';
import { gameToolbar, settingsDrawer, routeButtons, bodySilhouette } from './journey-ui.js';
import { lockGameViewport } from './blood-viewport.js';
import { createCheckpointSaver, CHECKPOINT_INTERVAL } from './digestion-save.js';
import { createExamController } from './digestion-exam-controller.js';
import { createOxygenAudio } from './oxygen-audio.js';
import { shuffled } from './digestion-engine.js';
import { esc } from './ui.js';
export function mountOxygen(
  root,
  { record, initialLevel = 'easy', save = async () => true, onLevel = () => {} },
) {
  const data = (record.oxygenJourney ??= newOxygenProgress());
  let run = data.active,
    selected = Object.hasOwn(OXYGEN_LEVELS, initialLevel) ? initialLevel : 'easy',
    world = null,
    disposed = false,
    playing = false,
    userPaused = false,
    drawer = false,
    loading = false,
    suspended = false,
    examActive = false,
    feedback = '',
    options = [],
    lastUI = '',
    viewSaveTimer,
    preparing = 0;
  const unlock = lockGameViewport(root),
    $ = (selector) => root.querySelector(selector);
  root.innerHTML = `<section class="oxygen-game blood3d"><canvas tabindex="0" aria-label="Iltens rejse i 3D. Træk eller swipe for at kigge. Brug svarenes knapper til at vælge."></canvas>${gameToolbar({ back: '<a class="back" href="#/">← Tilbage til læringsstier</a>', sound: '<button data-oxygen="sound">Slå lyd til</button>', settings: '<button data-oxygen="settings" aria-label="Spilindstillinger" aria-controls="oxygen-settings" aria-expanded="false">⚙</button>', menu: '<button data-oxygen="menu" aria-label="Vælg niveau">☰</button>' })}<div class="digest-hud"></div><div class="digest-learning" hidden></div><aside class="digest-map" data-oxygen-map></aside><div class="digest-panel"></div><p class="digest-save" role="status"></p><div class="oxygen-announcement" hidden aria-live="polite"></div>${settingsDrawer('oxygen-settings', `<button data-oxygen="settings-close" class="secondary">Luk indstillinger</button><button data-oxygen="pause" aria-pressed="false">Pause</button><label><input type="checkbox" data-oxygen-setting="sound"> Lyd</label><label>Lydstyrke<input type="range" min="0" max="1" step=".05" data-oxygen-setting="volume"></label><p data-oxygen-audio-status>Lyd starter efter dit klik.</p><label>Grafik<select data-oxygen-setting="quality"><option value="auto">Automatisk</option><option value="high">Høj</option><option value="low">Lav belastning</option></select></label><label><input type="checkbox" data-oxygen-setting="motion"> Rolig baggrundsbevægelse</label><button data-oxygen="center">◎ Centrér kamera</button><p>Træk eller swipe for at kigge frem og tilbage. På lærredet kan piletasterne dreje blikket. På svarene flytter venstre/højre fokus; Enter vælger.</p><p>Forstørret undervisningsmodel. Luftvej, celle og molekyler vises ikke i én fælles biologisk målestok.</p>`)}<p class="oxygen-loading" role="status" hidden>Klargør næste afsnit…</p></section>`;
  $('#oxygen-settings').classList.add('digest-settings');
  const panel = $('.digest-panel'),
    info = $('.digest-learning'),
    hud = $('.digest-hud'),
    canvas = $('canvas'),
    map = $('.digest-map');
  const audio = createOxygenAudio({
    time: () => run?.worldTime || 0,
    onStatus: (s) => {
      $('[data-oxygen-audio-status]').textContent = s;
      canvas.dataset.oxygenAudio = JSON.stringify(audio.snapshot());
    },
  });
  function settingsUI() {
    for (const [key, value] of Object.entries(data.settings)) {
      const el = $('[data-oxygen-setting=' + key + ']');
      if (!el) continue;
      if (el.type === 'checkbox') el.checked = key === 'motion' ? !value : value;
      else el.value = value;
    }
    $('[data-oxygen=sound]').textContent = data.settings.sound ? 'Slå lyd fra' : 'Slå lyd til';
    $('[data-oxygen=sound]').setAttribute('aria-pressed', String(data.settings.sound));
    audio.configure(data.settings);
    world?.settings(data.settings);
  }
  function measure() {
    if (disposed) return;
    const bar = $('.blood-game-bar'),
      toolbar = bar.offsetHeight;
    root.style.setProperty('--oxygen-toolbar', toolbar + 'px');
    root.style.setProperty('--oxygen-hud-end', hud.offsetTop + hud.offsetHeight + 8 + 'px');
    root.style.setProperty(
      '--oxygen-info-end',
      (info.hidden
        ? hud.offsetTop + hud.offsetHeight + 8
        : info.offsetTop + info.offsetHeight + 8) + 'px',
    );
    root.style.setProperty(
      '--oxygen-controls-height',
      panel.hidden ? '0px' : panel.offsetHeight + 'px',
    );
    const available =
      (panel.hidden ? root.clientHeight - 16 : panel.offsetTop) -
      Math.max(
        info.hidden ? 0 : info.offsetTop + info.offsetHeight,
        hud.offsetTop + hud.offsetHeight,
      ) -
      20;
    const landscape = root.clientHeight <= 500 && root.clientWidth >= 500;
    map.style.maxHeight =
      Math.max(0, Math.min(150, landscape ? root.clientHeight - toolbar - 24 : available)) + 'px';
    map.style.height = map.style.maxHeight;
    map.classList.toggle('oxygen-map-compact', !landscape && available < 110);
    map.hidden = !playing || examActive || (!landscape && available < 65);
  }
  const observer = new ResizeObserver(measure);
  for (const el of [$('.blood-game-bar'), hud, info, panel, root]) observer.observe(el);
  const checkpoint = createCheckpointSaver({
    capture() {
      if (run && playing) data.active = run;
    },
    save: () => save(),
    onResult: (ok) => {
      if (!disposed)
        $('.digest-save').textContent = ok ? 'Gemt' : 'Kunne ikke gemme – prøv igen før du lukker.';
    },
  });
  function store() {
    return checkpoint.request();
  }
  function held() {
    return (
      !playing || userPaused || drawer || document.hidden || loading || suspended || examActive
    );
  }
  function sync() {
    const hold = held();
    world?.pause(hold);
    audio.pause(hold);
    panel.inert = playing && (userPaused || drawer || document.hidden || loading || suspended);
    canvas.inert = hold;
    $('[data-oxygen=pause]').textContent = userPaused ? 'Genoptag' : 'Pause';
    $('[data-oxygen=pause]').setAttribute('aria-pressed', String(userPaused));
  }
  function setDrawer(open) {
    drawer = open;
    $('#oxygen-settings').hidden = !open;
    $('[data-oxygen=settings]').setAttribute('aria-expanded', String(open));
    sync();
    measure();
  }
  function focusQuestion() {
    panel.scrollTop = 0;
    const heading = panel.querySelector('h2');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }
  function learning(stage) {
    if (feedback) return { title: 'Prøv igen', text: feedback, error: true };
    let text = stage.note;
    if (stage.id === 'trachea' && run.mode === 'mucociliary' && run.phase === 'animation')
      text = run.age / run.duration > 0.53 ? LEARNING.opposite : LEARNING.mucociliary;
    if (['bicarbonate', 'bicarbonate-return'].includes(stage.id))
      text +=
        ' CO₂ + H₂O ⇌ H⁺ + HCO₃⁻. Omdannelsen sker især i erytrocytterne; hydrogencarbonat transporteres hovedsageligt i plasma.';
    if (stage.id === 'out_trachea') text = LEARNING.expirationMucus;
    if (run.phase === 'animation' && stage.task)
      text = oxygenQuestion({ ...run, phase: 'question' })?.why || stage.note;
    return { title: anatomicalName(stage, run.level), text };
  }
  function renderInfo(stage) {
    if (examActive) return;
    if (run.phase === 'travel') return;
    const point = learning(stage);
    data.learningCurrent = {
      key: stage.id,
      title: point.title,
      short: point.text,
      detail: point.text,
    };
    info.hidden = false;
    info.innerHTML = `<span class="oxygen-gas-icon" aria-hidden="true">${run.gas === 'oxygen' ? (run.oxygenUsed ? 'Nyt CO₂' : 'O₂') : run.gas === 'bicarbonate' ? 'HCO₃⁻' : 'CO₂'}</span><div><strong class="digest-point-title">${esc(point.title)}</strong><span class="digest-explanation">${esc(point.text)}</span></div>`;
    info.classList.toggle('oxygen-feedback', !!point.error);
  }
  function renderHUD(stage) {
    hud.hidden = !playing;
    const route = oxygenRoute(run),
      n = run.visited.length;
    hud.innerHTML = `<div><strong>${run.gas === 'oxygen' ? (run.oxygenUsed ? 'Ilten er brugt · nyt perspektiv' : 'Du følger O₂') : run.gas === 'bicarbonate' ? 'CO₂ transporteres som HCO₃⁻' : 'Du følger et nyt CO₂-molekyle'}</strong><h1>${run.phase === 'travel' ? 'På vej til ' : ''}${esc(anatomicalName(stage, run.level))}</h1><span>${esc(OXYGEN_LEVELS[run.level].name)} · ${run.points} point</span></div><div class="oxygen-progress"><span class="oxygen-lives" aria-label="${run.lives} af 2 liv">${'♥'.repeat(run.lives)}${'♡'.repeat(2 - run.lives)}</span><div class="blood-progress" role="progressbar" aria-label="Rejsens fremdrift" aria-valuemin="0" aria-valuemax="${route.length}" aria-valuenow="${n}"><span style="width:${(n / route.length) * 100}%"></span></div><small>${n}/${route.length}</small></div>`;
    const region = stage.region,
      x =
        region === 'arm'
          ? 24
          : region === 'heart'
            ? 59
            : region === 'lung'
              ? run.side === 'right'
                ? 44
                : 76
              : 60,
      y =
        region === 'arm'
          ? 78
          : region === 'heart'
            ? 63
            : region === 'lung'
              ? 53
              : region === 'neck'
                ? 34
                : region === 'chest'
                  ? 45
                  : 18;
    map.innerHTML = `<strong>KROPSKORT</strong><svg viewBox="0 0 120 170" aria-label="${esc(stage.da)}">${bodySilhouette}<circle cx="${x}" cy="${y}" r="6" fill="#f8d992" stroke="#fff5d9" stroke-width="2"/></svg><small>${esc(stage.region === 'heart' ? 'Hjertet' : stage.region === 'lung' ? (run.side === 'right' ? 'Højre lunge' : 'Venstre lunge') : stage.region === 'arm' ? 'Højre overarm' : stage.da)}</small>`;
  }
  function draw() {
    if (!run || !playing || examActive) return;
    const stage = oxygenRoute(run)[run.index];
    renderHUD(stage);
    renderInfo(stage);
    const announcement = $('.oxygen-announcement');
    announcement.hidden = !(run.phase === 'animation' && run.mode === 'perspective');
    if (!announcement.hidden)
      announcement.innerHTML = `<h2>Nu skifter rejsen til CO₂</h2><p>${esc(LEARNING.switch)}</p>`;
    panel.className = 'digest-panel digest-compact';
    panel.dataset.stage = stage.id;
    panel.hidden = !['question', 'retry'].includes(run.phase);
    if (run.phase === 'question') {
      const q = oxygenQuestion(run);
      options = shuffled(q.options);
      panel.innerHTML = `<p class="oxygen-eyebrow">${q.options.length === 3 ? 'Fysiologi' : 'Anatomisk vejvalg'}</p><h2>${esc(q.prompt)}</h2><div class="digest-choices">${options.length === 2 ? routeButtons(options, 'data-oxygen-choice') : options.map((o, i) => `<button data-oxygen-choice="${i}">${esc(o.label)}</button>`).join('')}</div>`;
      focusQuestion();
    }
    if (run.phase === 'retry')
      panel.innerHTML =
        '<h2>To liv brugt – prøv vejvalget igen</h2><p>Din gennemførte rejse og dine point bevares.</p><button data-oxygen="retry">Prøv denne udfordring igen</button>';
    canvas.dataset.oxygenPhase = run.phase;
    audio.locate(stage);
    sync();
    measure();
  }
  const exam = createExamController({
    data,
    panel,
    assessment: OXYGEN_ASSESSMENT,
    menuLabel: 'Til niveauer og resultater',
    prepare() {
      examActive = true;
      feedback = '';
      panel.hidden = false;
      $('.oxygen-announcement').hidden = true;
      sync();
    },
    learn(point) {
      data.learningCurrent = point;
      info.innerHTML = `<div><strong class="digest-point-title">${esc(point.title)}</strong><span class="digest-explanation">${esc(point.short)}</span></div>`;
    },
    information(show) {
      info.hidden = !show;
      measure();
    },
    stage: () => oxygenRoute(run || newOxygenRun(selected))[run?.index || 0].id,
    store: async () => {
      if (
        run?.phase === 'exam' &&
        !data.assessmentDraft &&
        data.assessments?.[run.level]?.length &&
        data.assessments[run.level].at(-1).date !== run.examBaselineDate
      ) {
        run.phase = 'won';
        const stats = data.stats[run.level];
        stats.completed = true;
        stats.best = Math.max(
          stats.best,
          Math.round((100 * run.points) / (run.points + run.errors || 1)),
        );
        stats.last = {
          date: new Date().toISOString(),
          points: run.points,
          errors: run.errors,
          examCorrect: data.assessments[run.level].at(-1).correct,
        };
        record.done ??= [];
        const id = 'oxygen-' + run.level;
        if (!record.done.includes(id)) record.done.push(id);
      }
      return store();
    },
    focusQuestion,
  });
  async function changePhase() {
    const token = ++preparing;
    loading = true;
    sync();
    $('.oxygen-loading').hidden = false;
    try {
      await world?.prepare(run);
      if (disposed || token !== preparing) return;
      world?.settings(data.settings);
      if (run.phase === 'exam') {
        run.examBaselineDate ??= data.assessments?.[run.level]?.at(-1)?.date || null;
        examActive = true;
        exam.start(run.level);
        renderHUD(oxygenRoute(run).at(-1));
      } else draw();
      await store();
    } catch (e) {
      showError(e);
    } finally {
      if (token === preparing && !disposed) {
        loading = false;
        $('.oxygen-loading').hidden = true;
        sync();
      }
    }
  }
  function step(dt) {
    if (held() || !run) return;
    const before = [run.index, run.phase, run.mode].join(':');
    advanceOxygen(run, dt);
    if (before !== [run.index, run.phase, run.mode].join(':')) {
      feedback = '';
      void changePhase();
      return;
    }
    const key =
      run.index +
      ':' +
      run.phase +
      ':' +
      (run.mode === 'mucociliary' && run.age / run.duration > 0.53);
    if (key !== lastUI) {
      lastUI = key;
      if (run.phase === 'animation' && run.mode === 'mucociliary')
        renderInfo(oxygenRoute(run)[run.index]);
    }
  }
  function showError(error) {
    if (disposed) return;
    loading = false;
    playing = false;
    sync();
    panel.hidden = false;
    panel.inert = false;
    panel.className = 'digest-panel oxygen-menu';
    panel.innerHTML = `<h2>3D kunne ikke vises</h2><p>${esc(error.message || String(error))}</p><p>Din gemte rejse bevares. Prøv at genindlæse eller åbne i en browser med WebGL 2.</p><button data-oxygen="reload">Genindlæs</button><a href="#/">Tilbage til læringsstier</a>`;
  }
  function menu() {
    playing = false;
    examActive = false;
    userPaused = false;
    feedback = '';
    setDrawer(false);
    hud.hidden = true;
    info.hidden = true;
    map.hidden = true;
    $('.oxygen-announcement').hidden = true;
    panel.hidden = false;
    panel.inert = false;
    panel.className = 'digest-panel oxygen-menu';
    panel.innerHTML = `<p class="oxygen-eyebrow">ET SAMMENHÆNGENDE 3D-LÆRINGSSPIL</p><h1>${esc(OXYGEN_TITLE)}</h1><p>Bliv et O₂-molekyle. Oplev luftvejenes rensning, alveolerne og hæmoglobin. Aflever ilt i vævet, og følg et nyt CO₂-molekyle hele vejen ud.</p><div class="oxygen-levels">${Object.values(
      OXYGEN_LEVELS,
    )
      .map(
        (l) =>
          `<button data-oxygen-level="${l.id}" aria-pressed="${selected === l.id}"><strong>${esc(l.name)}${data.stats[l.id]?.completed ? ' · ✓' : ''}</strong><span>${esc(l.description)}</span></button>`,
      )
      .join(
        '',
      )}</div><button data-oxygen="start">Start rejsen →</button>${data.active && !['won'].includes(data.active.phase) ? '<button data-oxygen="resume">Fortsæt gemt rejse</button>' : ''}${data.assessmentDraft ? '<button data-oxygen="exam-resume">Fortsæt gemt sluttest</button>' : ''}${Object.entries(
      data.assessments || {},
    )
      .filter(([, a]) => a.length)
      .map(
        ([id, a]) =>
          `<p>${esc(OXYGEN_LEVELS[id].name)} · Seneste sluttest ${a.at(-1).correct}/5</p><button data-oxygen-exam="${id}">Tag en ny sluttest · ${esc(OXYGEN_LEVELS[id].name)}</button>${a.at(-1).answers.some((i) => i !== 0) ? `<button data-review-character="${id}">Repetér fejl · ${esc(OXYGEN_LEVELS[id].name)}</button>` : ''}`,
      )
      .join('')}`;
    if (world) {
      const preview = newOxygenRun(selected);
      preview.motion = data.settings.motion;
      world.setRun(preview);
      void world.prepare(preview);
    }
    for (const b of panel.querySelectorAll('[data-oxygen=start],[data-oxygen=resume]'))
      b.disabled = loading || !world;
    sync();
    measure();
  }
  async function start(resume = false) {
    if (!world || loading) return;
    if (!resume && data.active && data.active.phase !== 'won') {
      panel.innerHTML =
        '<h2>Start et nyt forsøg?</h2><p>Din igangværende rejse erstattes. Gennemførte niveauer og sluttests bevares.</p><button data-oxygen="confirm-start">Start forfra</button><button data-oxygen="cancel-start">Behold min gemte rejse</button>';
      return;
    }
    if (!resume) {
      run = newOxygenRun(selected);
      data.active = run;
      const stats = (data.stats[selected] ??= { completed: false, attempts: 0, best: 0 });
      stats.attempts++;
    } else {
      run = data.active;
      selected = run.level;
    }
    run.motion = data.settings.motion;
    playing = true;
    userPaused = false;
    examActive = false;
    feedback = '';
    onLevel(run.level);
    world.setRun(run);
    if (data.settings.sound) void audio.unlock();
    await changePhase();
  }
  const click = async (e) => {
    const b = e.target.closest('button');
    if (!b || disposed) return;
    if (b.dataset.oxygenLevel) {
      selected = b.dataset.oxygenLevel;
      onLevel(selected);
      menu();
      return;
    }
    if (b.dataset.oxygenChoice !== undefined) {
      if (held() || run.phase !== 'question') return;
      const selectedOption = options[Number(b.dataset.oxygenChoice)];
      if (!selectedOption) return;
      const priorStage = oxygenRoute(run)[run.index],
        result = answerOxygen(run, selectedOption.key);
      if (!result.accepted) return;
      if (result.correct) {
        feedback = '';
        info.hidden = false;
        info.innerHTML = `<div><strong class="digest-point-title">${esc(anatomicalName(priorStage, run.level))}</strong><span class="digest-explanation">${esc(result.why)}</span></div>`;
        audio.effect();
        await changePhase();
      } else {
        feedback = result.why;
        draw();
        await store();
      }
      return;
    }
    if (b.dataset.examAnswer !== undefined) {
      await exam.answer(Number(b.dataset.examAnswer));
      measure();
      return;
    }
    if (b.dataset.reviewCharacter) {
      examActive = true;
      playing = true;
      exam.review(b.dataset.reviewCharacter);
      measure();
      return;
    }
    if (b.dataset.oxygenExam) {
      selected = b.dataset.oxygenExam;
      playing = true;
      examActive = true;
      exam.start(selected, true);
      measure();
      return;
    }
    if (b.dataset.digest) {
      if (b.dataset.digest === 'exam-next') exam.next();
      if (b.dataset.digest === 'exam') exam.start(selected, true);
      if (b.dataset.digest === 'menu') menu();
      measure();
      return;
    }
    switch (b.dataset.oxygen) {
      case 'start':
        await start();
        break;
      case 'confirm-start':
        data.active = null;
        await start();
        break;
      case 'cancel-start':
        menu();
        break;
      case 'resume':
        await start(true);
        break;
      case 'retry':
        if (retryOxygen(run)) {
          feedback = '';
          draw();
          await store();
        }
        break;
      case 'menu':
        await store();
        menu();
        break;
      case 'settings':
        setDrawer(true);
        break;
      case 'settings-close':
        setDrawer(false);
        break;
      case 'pause':
        userPaused = !userPaused;
        sync();
        await store();
        break;
      case 'center':
        world?.center();
        break;
      case 'sound':
        data.settings.sound = !data.settings.sound;
        settingsUI();
        if (data.settings.sound) void audio.unlock();
        await store();
        break;
      case 'exam-resume':
        playing = true;
        examActive = true;
        exam.start(data.assessmentDraft.character);
        measure();
        break;
      case 'reload':
        location.reload();
        break;
    }
  };
  const change = (e) => {
    const key = e.target.dataset.oxygenSetting;
    if (!key) return;
    data.settings[key] =
      e.target.type === 'checkbox'
        ? key === 'motion'
          ? !e.target.checked
          : e.target.checked
        : key === 'volume'
          ? Number(e.target.value)
          : e.target.value;
    settingsUI();
    if (key === 'sound' && data.settings.sound) void audio.unlock();
    void store();
  };
  const keydown = (e) => {
    if (e.target.matches('input,select,textarea') || drawer || userPaused || !playing) return;
    if (
      e.target === canvas &&
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)
    ) {
      e.preventDefault();
      if (e.key === 'ArrowLeft') run.yaw += 0.15;
      if (e.key === 'ArrowRight') run.yaw -= 0.15;
      if (e.key === 'ArrowUp') run.pitch = Math.min(1.25, run.pitch + 0.12);
      if (e.key === 'ArrowDown') run.pitch = Math.max(-1.25, run.pitch - 0.12);
      world?.lookChanged();
      return;
    }
    const buttons = [...panel.querySelectorAll('[data-oxygen-choice]')];
    if (!buttons.length) return;
    if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const i = Math.max(0, buttons.indexOf(document.activeElement));
      buttons[(i + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length].focus();
    }
  };
  const visibility = () => {
      sync();
      if (document.hidden) void store();
    },
    pagehide = () => {
      suspended = true;
      sync();
      void store();
    },
    pageshow = () => {
      suspended = false;
      sync();
    };
  root.addEventListener('click', click);
  root.addEventListener('change', change);
  root.addEventListener('input', (e) => {
    if (e.target.matches('[data-oxygen-setting=volume]')) change(e);
  });
  root.addEventListener('keydown', keydown);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', pagehide);
  window.addEventListener('pageshow', pageshow);
  const timer = setInterval(() => {
    if (playing && !held()) void store();
  }, CHECKPOINT_INTERVAL);
  settingsUI();
  menu();
  void import('./oxygen-world.js')
    .then(async ({ createOxygenWorld }) => {
      if (disposed) return;
      loading = true;
      $('.oxygen-loading').hidden = false;
      world = createOxygenWorld(canvas, {
        onStep: step,
        onError: showError,
        onLook: () => {
          clearTimeout(viewSaveTimer);
          viewSaveTimer = setTimeout(() => {
            if (playing) void store();
          }, 500);
        },
      });
      await world.ready;
      if (disposed) return;
      loading = false;
      $('.oxygen-loading').hidden = true;
      settingsUI();
      menu();
    })
    .catch(showError);
  return () => {
    void store();
    disposed = true;
    preparing++;
    clearInterval(timer);
    clearTimeout(viewSaveTimer);
    observer.disconnect();
    exam.dispose();
    world?.dispose();
    audio.dispose();
    root.removeEventListener('click', click);
    root.removeEventListener('change', change);
    root.removeEventListener('keydown', keydown);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('pagehide', pagehide);
    window.removeEventListener('pageshow', pageshow);
    unlock();
  };
}
