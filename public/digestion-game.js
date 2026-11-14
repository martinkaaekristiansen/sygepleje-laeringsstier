import {
  ENTRY_OPTIONS,
  anatomicalOptions,
  anatomicalFeedback,
  renderDigestMap,
} from './digestion-navigation.js';
import { ORGAN_LABELS } from './digestion-anatomy.js';
import { CHARACTERS, ROUTE, BOSSES, ABSORPTION, PH_NOTE, REACTIONS } from './digestion-data.js';
import { ABSORPTION_CHOICES, FINAL_TESTS, scoreAssessment } from './digestion-assessment.js';
import {
  newDigestion,
  chooseDigestion,
  retryDigestion,
  correctReaction,
  shuffled,
  activeClock,
  relativeActivity,
} from './digestion-engine.js';
import { createDigestionWorld } from './digestion-world.js';
import { lockGameViewport } from './blood-viewport.js';
import { synthesizeLayer } from './journey-audio.js';
import { esc } from './ui.js';
export function mountDigestion(root, { record, initialCharacter = 'stanley', save, onCharacter }) {
  const data = (record.digestion ??= { results: {} });
  let run = data.active,
    world,
    timer,
    sequenceToken = 0,
    disposed = false,
    busy = false,
    selected = CHARACTERS[initialCharacter] ? initialCharacter : 'stanley',
    audio,
    volume = 0.3,
    sound = false,
    motion = !matchMedia('(prefers-reduced-motion: reduce)').matches,
    quality = 'auto',
    latin = true,
    options = [],
    feedback = '',
    sequenceEnd,
    chain = [],
    clock = run ? activeClock(run) : null,
    playing = false,
    userPaused = false,
    timerPaused = false,
    remaining = 0,
    deadline = 0,
    exam = null;
  const unlock = lockGameViewport(root);
  root.innerHTML = `<section class="digestion-game"><canvas aria-label="Fordøjelseskanalen og næringsstoffer i 3D"></canvas><div class="digest-top"><a href="#/">← Læringsstier</a><button data-digest="pause" aria-pressed="false">Pause</button><button data-digest="map" aria-expanded="false">Kort</button><button data-digest="info" aria-expanded="false">Info</button><button data-digest="center" aria-label="Centrér kamera">◎</button><button data-digest="menu">Karakterer</button><button data-digest="settings" aria-expanded="false">Indstillinger</button></div><aside class="digest-map" hidden></aside><aside class="digest-info" hidden></aside><aside class="digest-settings" hidden><label><input type="checkbox" data-setting="sound"> Lyd</label><label>Lydstyrke <input type="range" min="0" max="1" step=".05" value=".3" data-setting="volume"></label><label><input type="checkbox" data-setting="motion" ${motion ? 'checked' : ''}> Bevægelse</label><label><input type="checkbox" data-setting="latin" checked> Danske og latinske navne</label><label>Grafik <select data-setting="quality"><option value="auto">Automatisk</option><option value="low">Lav</option></select></label><p>Stiliseret undervisningsmodel. Molekyler, enzymer og organer vises i forskellige skalaer; formerne er ikke atommodeller eller kliniske målinger.</p></aside><div class="digest-hud"></div><div class="digest-panel"></div><p class="digest-save" role="status"></p></section>`;
  const $ = (s) => root.querySelector(s),
    panel = $('.digest-panel');
  const toolbarObserver = new ResizeObserver(() =>
    root.style.setProperty('--digest-toolbar-height', $('.digest-top').offsetHeight + 'px'),
  );
  toolbarObserver.observe($('.digest-top'));
  function tone(final = false) {
    if (!sound) return;
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume();
      const t = audio.currentTime;
      for (let i = 0; i < (final ? 4 : 1); i++) {
        const o = audio.createOscillator(),
          g = audio.createGain();
        o.type = 'sine';
        o.frequency.value = final ? [261, 330, 392, 523][i] : 196;
        g.gain.setValueAtTime(0, t + i * 0.13);
        g.gain.linearRampToValueAtTime(volume * 0.16, t + i * 0.13 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.13 + 0.25);
        o.connect(g).connect(audio.destination);
        o.start(t + i * 0.13);
        o.stop(t + i * 0.13 + 0.27);
      }
      if (final) {
        const samples = synthesizeLayer('flow', audio.sampleRate),
          buffer = audio.createBuffer(
            1,
            Math.min(samples.length, audio.sampleRate * 0.5),
            audio.sampleRate,
          );
        buffer.copyToChannel(samples.slice(0, buffer.length), 0);
        const s = audio.createBufferSource(),
          g = audio.createGain();
        s.buffer = buffer;
        g.gain.setValueAtTime(volume * 0.5, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        s.connect(g).connect(audio.destination);
        s.start(t);
      }
    } catch {
      sound = false;
      $('.digest-save').textContent =
        'Lyd understøttes ikke her. Alle forklaringer vises som tekst.';
    }
  }
  async function store() {
    if (run) {
      clock?.tick(playing && !userPaused && !document.hidden && $('.digest-settings').hidden);
      data.active = run;
    }
    record.updatedAt = Date.now();
    const ok = await save({ retry: true });
    if (!disposed)
      $('.digest-save').innerHTML = ok
        ? 'Gemt'
        : 'Ikke gemt. <button data-digest="save">Prøv at gemme igen</button>';
    return ok;
  }
  function syncPause() {
    const hold = userPaused || document.hidden || !$('.digest-settings').hidden;
    if (hold) {
      clock?.pause();
      if (sequenceEnd && !timerPaused) {
        remaining = Math.max(0, deadline - performance.now());
        clearTimeout(timer);
        timerPaused = true;
      }
    } else {
      if (playing) clock?.resume();
      if (sequenceEnd && timerPaused) {
        deadline = performance.now() + remaining;
        timer = setTimeout(sequenceEnd, remaining);
        timerPaused = false;
      }
    }
    world?.pause(hold);
    panel.inert = hold;
    $('.digest-game-paused')?.remove();
    $('[data-digest=pause]').textContent = userPaused ? 'Fortsæt' : 'Pause';
    $('[data-digest=pause]').setAttribute('aria-pressed', String(userPaused));
  }
  const visibility = () => {
    syncPause();
    if (document.hidden) void store();
  };
  document.addEventListener('visibilitychange', visibility);
  const checkpoint = setInterval(() => {
    if (playing && !userPaused && !document.hidden && $('.digest-settings').hidden) void store();
  }, 5000);
  function hud() {
    if (!run) {
      $('.digest-hud').innerHTML = '';
      return;
    }
    const s = ROUTE[run.index];
    if (!$('.digest-map').hidden) $('.digest-map').innerHTML = renderDigestMap(run.index);
    const hud = $('.digest-hud');
    hud.innerHTML = '<div><strong></strong><span></span></div><h1></h1><p></p>';
    hud.querySelector('strong').textContent = CHARACTERS[run.character].name;
    hud.querySelector('span').textContent =
      (run.lives ? '♥'.repeat(run.lives) : 'Ingen liv') +
      ' · ' +
      (run.index + 1) +
      '/' +
      ROUTE.length;
    hud.querySelector('h1').textContent =
      run.phase === 'entry' ? 'Uden for ansigtet' : latin ? s.latin + ' · ' + s.danish : s.danish;
    hud.querySelector('p').textContent = run.absorbed
      ? 'Du følger nu en ufordøjelig rest.'
      : 'Træk / swipe for at kigge rundt.';
  }
  function showScene(mode) {
    world?.setScene(
      ROUTE[run?.index || 0],
      mode === 'menu' ? selected : run?.character || selected,
      mode,
      Boolean(run?.absorbed),
    );
    hud();
  }
  function cancel() {
    clearTimeout(timer);
    sequenceToken++;
    sequenceEnd = null;
    timerPaused = false;
    remaining = 0;
  }
  function sequence(title, text, mode, seconds, next) {
    cancel();
    showScene(mode);
    panel.classList.remove('digest-nav');
    panel.innerHTML = `<h2 tabindex="-1">${esc(title)}</h2><p>${esc(text)}</p><button data-digest="skip">Spring animation over →</button>`;
    const token = sequenceToken;
    sequenceEnd = () => {
      if (token !== sequenceToken || disposed) return;
      cancel();
      next();
    };
    remaining = seconds * 1000;
    deadline = performance.now() + remaining;
    timer = setTimeout(sequenceEnd, remaining);
    panel.querySelector('h2').focus({ preventScroll: true });
  }
  function menu() {
    clock?.pause();
    playing = false;
    userPaused = false;
    panel.inert = false;
    world?.pause(document.hidden);
    exam = null;
    cancel();
    run = data.active;
    showScene('menu');
    $('.digest-hud').innerHTML = '';
    panel.classList.remove('digest-active', 'digest-nav');
    panel.classList.add('digest-menu');
    panel.innerHTML = `<h1>Fordøjelsens vilde rejse 3.0</h1><p>Fra første bid til sidste skyl · vælg dit næringsstof</p><div class="digest-characters">${Object.entries(
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
      )}${data.assessmentDraft ? '<button data-digest="exam">Fortsæt gemt sluttest uden hjælp</button>' : ''}${Object.entries(
      data.assessments || {},
    )
      .map(
        ([id, rs]) =>
          `<p>${esc(CHARACTERS[id].name)} · seneste test: ${rs.at(-1).correct}/5 · ${rs.length} forsøg</p>`,
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
    const choices = document.createElement('div');
    choices.className = 'digest-choices';
    options.forEach((o, i) => {
      const b = document.createElement('button');
      b.dataset.entry = i;
      b.textContent = o.label;
      choices.append(b);
    });
    panel.append(choices);
    void store();
    bindChoiceFocus('[data-entry]');
  }
  async function entryAnswer(i) {
    if (busy || run?.phase !== 'entry' || !options[i]) return;
    busy = true;
    const correct = options[i].correct;
    chooseDigestion(run, correct);
    feedback = correct ? '' : anatomicalFeedback('nose');
    if (!correct) world?.feedback();
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
      panel.innerHTML = '<h2>Ny chance ved indgangen</h2>';
      const retry = document.createElement('button');
      retry.dataset.digest = 'retry';
      retry.textContent = 'Prøv igen';
      panel.append(retry);
    } else entryChoice();
  }
  function bindChoiceFocus(selector = '[data-choice]') {
    panel.querySelectorAll(selector).forEach((b) => {
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
    if (s.id === 'jejunum' && !run.absorbed) {
      run.phase = 'absorption';
      absorption(0);
      return;
    }
    if (BOSSES[run.character][s.id]) {
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
    chain = [];
    hud();
    panel.classList.add('digest-active');
    panel.classList.toggle('digest-nav', run.phase === 'route');
    panel.dataset.stage = ROUTE[run.index].id;
    const s = ROUTE[run.index],
      task = run.phase === 'boss' ? BOSSES[run.character][s.id][run.task] : null;
    options = task ? task.options.map((label, i) => ({ label, correct: i === 0 })) : routeChoices();
    if (task && !(s.id === 'duodenum' && task.kind === 'enzyme'))
      options = [options[0], shuffled(options.slice(1))[0]];
    options = shuffled(options);
    world?.labelChoices(options.map((o) => o.label));
    world?.configureChoices(options, task?.kind || 'anatomy');
    panel.innerHTML = `<p class="digest-eyebrow">${task ? `ENZYM-UDFORDRING · ${run.task + 1}/3 · ${task.kind === 'source' ? 'FORBIND MED ORGAN' : task.kind === 'reaction' ? 'BYG REAKTIONEN' : 'FIND ENZYMET'}` : 'FIND DEN ANATOMISKE VEJ'}</p><h2 tabindex="-1">${esc(task?.prompt || s.title)}</h2><p class="digest-instruction">${task ? 'Se på molekylerne og vælg.' : 'Klik på åbningen for at fortsætte — eller undersøg området.'}</p>${feedback ? `<p role="status" class="digest-feedback">${esc(feedback)}</p>` : ''}<div class="digest-choices">${options.map((o, i) => `<button data-choice="${i}"><b>${i + 1}</b> ${esc(o.label)}</button>`).join('')}</div><small>${task ? 'Klik på en molekylefigur eller brug knapperne.' : 'Brug knapperne eller tasterne 1–3.'}</small>`;
    bindChoiceFocus();
    if (task?.kind === 'source') {
      const token = document.createElement('p');
      token.className = 'digest-organ-token';
      token.draggable = true;
      token.textContent = 'Forbind med produktionsstedet.';
      token.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', 'enzyme'));
      panel.prepend(token);
      panel.querySelectorAll('[data-choice]').forEach((b) => {
        b.addEventListener('dragover', (e) => e.preventDefault());
        b.addEventListener('drop', (e) => {
          e.preventDefault();
          if (e.dataTransfer.getData('text/plain') === 'enzyme') answer(Number(b.dataset.choice));
        });
      });
    }
    if (run.errors >= 2) {
      const hint = document.createElement('button');
      hint.dataset.digest = 'hint';
      hint.textContent = 'Vis et fagligt hint';
      panel.append(hint);
    }
    if (task?.kind === 'reaction') {
      const steps = REACTIONS[run.character][s.id];
      panel.querySelector('.digest-choices').innerHTML = shuffled([0, 1, 2])
        .map((i, j) => `<button data-chain="${i}"><b>${j + 1}</b> ${esc(steps[i])}</button>`)
        .join('');
      panel.querySelector('small').textContent =
        'Byg processen ved at vælge de tre led i korrekt rækkefølge.';
      const output = document.createElement('p');
      output.className = 'digest-chain';
      output.setAttribute('role', 'status');
      panel.append(output);
    }
  }
  async function answer(i, reactionOrder) {
    if (busy || !run || !['boss', 'route'].includes(run.phase) || !options[i]) return;
    busy = true;
    root.querySelectorAll('[data-choice]').forEach((b) => (b.disabled = true));
    const s = ROUTE[run.index],
      task = run.phase === 'boss' ? BOSSES[run.character][s.id][run.task] : null;
    if (options[i].inspect) {
      world?.center();
      busy = false;
      panel.querySelectorAll('[data-choice]').forEach((b) => (b.disabled = false));
      return;
    }
    const correct = task?.kind === 'reaction' ? correctReaction(reactionOrder) : options[i].correct;
    if (correct && !task && s.id === 'pharynx') {
      busy = false;
      run.phase = 'swallow';
      sequence('Synkning', 'Larynx løftes; luftvejen lukkes koordineret.', 'swallow', 2, () => {
        run.phase = 'route';
        chooseDigestion(run, true);
        arrival();
      });
      void store();
      return;
    }
    chooseDigestion(run, correct);
    feedback = correct ? '' : (task ? task.why : anatomicalFeedback(options[i].target)) + '';
    if (feedback && task) feedback = task.why.match(/.*?[.!?](?:\s|$)/)?.[0].trim() || task.why;
    try {
      await store();
      if (disposed) return;
      if (run.phase === 'retry') {
        panel.innerHTML = `<h2>To liv brugt – ny chance</h2><p>${esc(feedback)}</p><button data-digest="retry">Genstart aktuelle udfordring</button>`;
      } else if (correct && run.phase === 'boss' && s.id === 'duodenum' && run.task === 1) {
        run.phase = 'secretion';
        sequence(
          'Bugspyttet ankommer',
          run.character === 'trine'
            ? 'Galdesalte emulgerer. Bugspytlipase spalter.'
            : 'Enzymet kommer med bugspyttet og møder sit substrat.',
          'secretion',
          4,
          () => {
            run.phase = 'boss';
            showScene('boss');
            drawChoices();
            void store();
          },
        );
      } else if (!correct || run.phase === 'boss') {
        if (!correct) world?.feedback();
        drawChoices();
      } else if (run.phase === 'reaction') {
        tone();
        sequence(
          s.id === 'mouth' && run.character !== 'stanley'
            ? 'Mekanisk findeling – kæden bevares'
            : s.id === 'stomach' && run.character === 'stanley'
              ? 'Syren dæmper amylasens aktivitet'
              : 'Enzymet arbejder – og overlever',
          s.id === 'mouth' && run.character !== 'stanley'
            ? 'Føden findeles; molekylet bevares.'
            : s.id === 'stomach' && run.character === 'stanley'
              ? 'Forsuring dæmper amylasen gradvist.'
              : 'Bind → hydrolysér → frigiv. Enzymet kan bruges igen.',
          'reaction',
          8,
          () => {
            run.phase = 'route';
            feedback = '';
            showScene('travel');
            drawChoices();
            store();
          },
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
  function absorption(i = 0) {
    run.phase = 'absorption';
    if (run.absorptionPassed) {
      run.absorptionView = 'transport';
      void store();
      sequence(
        'Følg transporten',
        run.character === 'trine'
          ? 'Lipidprodukter → enterocyt → chylomikron → lymfe.'
          : 'Nedbrydningsprodukter → enterocyt → blodkapillær → portåre.',
        'transport',
        7,
        () => {
          run.absorbed = true;
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
      'Absorption · enterocytten er forstørret',
      run.character === 'stanley'
        ? 'Glukose optages sammen med Na⁺ via SGLT1.'
        : run.character === 'trine'
          ? 'Miceller afleverer fedtsyrer og monoglycerider ved enterocytten.'
          : 'Aminosyrer og små peptider optages i enterocytten.',
      'absorb',
      7,
      absorptionChoice,
    );
  }
  function absorptionChoice() {
    run.phase = 'absorb-choice';
    showScene('absorb');
    const q = ABSORPTION_CHOICES[run.character];
    options = shuffled(q.options.map((label, i) => ({ label, correct: i === 0 })));
    panel.innerHTML = `<h2>${esc(q.prompt)}</h2><p>${feedback ? esc(feedback) : 'Vælg transportvejen – følg derefter molekylet ind i kroppen.'}</p><div class="digest-choices">${options.map((o, i) => `<button data-absorb="${i}">${esc(o.label)}</button>`).join('')}</div>`;
    void store();
  }
  function drawExam() {
    panel.classList.remove('digest-active', 'digest-nav');
    const q = FINAL_TESTS[exam.character][exam.answers.length];
    if (!q) return;
    const choices = shuffled(q.options.map((text, i) => ({ text, i })));
    panel.innerHTML = `<h2>Afsluttende test · ${exam.answers.length + 1}/5</h2><p>Uden hjælp. Facit og forklaringer vises først, når alle svar er afleveret.</p><h3>${esc(q.prompt)}</h3><div class="digest-choices">${choices.map((o) => `<button data-exam-answer="${o.i}" ${busy ? 'disabled' : ''}>${esc(o.text)}</button>`).join('')}</div>`;
  }
  async function examAnswer(i) {
    if (!exam || busy) return;
    busy = true;
    exam.answers.push(i);
    data.assessmentDraft = structuredClone(exam);
    if (exam.answers.length === 5) {
      delete data.assessmentDraft;
      const result = scoreAssessment(exam.character, exam.answers);
      data.assessments ??= {};
      data.assessments[exam.character] = [
        ...(data.assessments[exam.character] || []),
        result,
      ].slice(-20);
      await store();
      panel.innerHTML = `<h2>Testresultat: ${result.correct} af 5</h2><p>Testresultatet gemmes særskilt fra spillets trofæer og gennemførelse.</p><ol>${FINAL_TESTS[exam.character].map((q, n) => `<li><strong>${result.answers[n] === 0 ? 'Korrekt' : 'Repetér'}: ${esc(q.prompt)}</strong><p>${esc(q.why)}</p></li>`).join('')}</ol><button data-digest="menu">Til karakterer og resultater</button>`;
      exam = null;
    } else {
      drawExam();
      await store();
    }
    busy = false;
    panel.querySelectorAll('[data-exam-answer]').forEach((b) => (b.disabled = false));
  }
  async function finish() {
    panel.classList.remove('digest-active', 'digest-nav');
    run.phase = 'won';
    clock?.pause();
    playing = false;
    data.results[run.character] = structuredClone(run);
    if (!record.done.includes('digestion-' + run.character))
      record.done.push('digestion-' + run.character);
    record.last = 'digestion-' + run.character;
    await store();
    if (disposed) return;
    tone(true);
    panel.innerHTML = `<h2>TILLYKKE! Fra første bid til sidste skyl.</h2><p>${esc(CHARACTERS[run.character].name)} · 🏆 Syreoverleveren · Sidste stop: porcelæn</p><dl><dt>Korrekte anatomiske valg</dt><dd>${run.anatomy}</dd><dt>Korrekte enzymdelopgaver</dt><dd>${run.enzyme} / 9</dd><dt>Fejl · resterende liv</dt><dd>${run.errors} · ${run.lives}</dd><dt>Tid</dt><dd>${Math.round(run.elapsed / 1000)} aktive sekunder${run.timingVersion === 2 ? '' : ' (historisk tid fra før v2)'}</dd></dl><p>Enzymer: ${esc(CHARACTERS[run.character].enzymes)}</p><p>Absorption i tyndtarmen: ${esc(CHARACTERS[run.character].transport)}</p><p>Gennemført aktivitet er ikke dokumentation for klinisk kompetence.</p><p>Fra første bid til sidste skyl. Du overlevede fordøjelsen – men porcelænet fik det sidste ord.</p><button data-digest="exam">Afsluttende test · 5 spørgsmål uden hjælp</button><button data-digest="menu">Skyl ud og prøv et nyt næringsstof!</button>`;
  }
  const click = async (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled || busy) return;
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
      playing = false;
      clock?.pause();
      cancel();
      exam = { character: b.dataset.examCharacter, answers: [] };
      data.assessmentDraft = structuredClone(exam);
      drawExam();
      void store();
      return;
    }
    if (b.dataset.examAnswer !== undefined) {
      await examAnswer(Number(b.dataset.examAnswer));
      return;
    }
    if (b.dataset.absorb !== undefined) {
      if (busy) return;
      busy = true;
      const correct = options[Number(b.dataset.absorb)]?.correct === true;
      chooseDigestion(run, correct);
      feedback = correct ? '' : ABSORPTION_CHOICES[run.character].why.split('. ')[0] + '.';
      await store();
      if (run.phase === 'retry')
        panel.innerHTML = `<h2>Ny chance ved absorptionen</h2><p>${esc(feedback)}</p><button data-digest="retry">Prøv absorptionen igen</button>`;
      else if (correct) {
        absorption(4);
      } else absorptionChoice();
      busy = false;
      return;
    }
    if (b.dataset.chain !== undefined) {
      const i = Number(b.dataset.chain);
      if (!Number.isInteger(i) || i < 0 || i > 2 || chain.includes(i)) return;
      chain.push(i);
      b.disabled = true;
      $('.digest-chain').textContent = chain
        .map((n) => REACTIONS[run.character][ROUTE[run.index].id][n])
        .join(' → ');
      if (chain.length === 3) {
        await answer(0, chain);
      }
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
    if (a === 'center') {
      world?.center();
      return;
    }
    if (a === 'map') {
      const map = $('.digest-map');
      map.hidden = !map.hidden;
      map.innerHTML = renderDigestMap(run?.index || 0);
      b.setAttribute('aria-expanded', String(!map.hidden));
      return;
    }
    if (a === 'info') {
      const info = $('.digest-info');
      info.hidden = !info.hidden;
      info.innerHTML = '<h2>Undersøg og forstå</h2>';
      for (const text of [
        ROUTE[run?.index || 0].text,
        BOSSES[run?.character]?.[ROUTE[run?.index || 0].id]?.[run?.task || 0]?.why || PH_NOTE,
        'Træk eller swipe for at kigge. ◎ centrerer igen.',
      ]) {
        const p = document.createElement('p');
        p.textContent = text;
        info.append(p);
      }
      for (const [action, text] of [
        ['substrate', 'Fremhæv næringsstof / substrat'],
        ['enzyme', 'Fremhæv enzym'],
        ['glands', 'Vis / skjul kirtler som gennemskæring'],
      ]) {
        const button = document.createElement('button');
        button.dataset.digest = action;
        button.textContent = text;
        info.append(button);
      }
      const extra = document.createElement('p');
      extra.textContent =
        {
          mouth:
            'Glandula parotis: udførselsgang ved kinden ud for de øvre kindtænder. Glandula submandibularis og sublingualis: udførselsgange i mundbunden. Kirtlerne vises skematisk ved gennemskæring.',
          stomach:
            'Parietalceller udskiller saltsyre; hovedceller udskiller pepsinogen og gastrisk lipase. Syre aktiverer pepsinogen til pepsin. HCl er ikke et enzym.',
          duodenum:
            'Galde og bugspyt tilføres via galdegang og pankreasgang ved papilla duodeni major. Bikarbonat dæmper surheden; galdesalte emulgerer, mens enzymer hydrolyserer.',
        }[ROUTE[run?.index || 0].id] || '';
      if (extra.textContent) info.append(extra);
      b.setAttribute('aria-expanded', String(!info.hidden));
      return;
    }
    if (['substrate', 'enzyme', 'glands'].includes(a)) {
      world?.highlightEntity(a);
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
      playing = false;
      clock?.pause();
      cancel();
      exam = data.assessmentDraft
        ? structuredClone(data.assessmentDraft)
        : { character: run?.character || selected, answers: [] };
      data.assessmentDraft = structuredClone(exam);
      void store();
      drawExam();
      return;
    }
    if (a === 'settings') {
      const el = $('.digest-settings');
      el.hidden = !el.hidden;
      b.setAttribute('aria-expanded', String(!el.hidden));
      syncPause();
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
      panel.classList.remove('digest-menu');
      selected = run.character;
      onCharacter(selected);
      if (run.phase === 'entry') {
        entryChoice();
        return;
      }
      if (run.phase === 'won') finish();
      else if (run.phase === 'intro')
        sequence('Den første bid', ROUTE[0].text, 'intro', 12, () => {
          run.phase = 'arrival';
          arrival();
        });
      else if (run.phase === 'reaction')
        sequence(
          'Enzymreaktion',
          BOSSES[run.character][ROUTE[run.index].id][2].why,
          'reaction',
          8,
          () => {
            run.phase = 'route';
            showScene('travel');
            drawChoices();
          },
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
        absorption(run.absorptionIndex || 0);
      } else arrival();
    }
    if (a === 'skip') sequenceEnd?.();
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
      tone();
    }
    if (k === 'volume') volume = Number(e.target.value);
    if (k === 'motion') motion = e.target.checked;
    if (k === 'quality') quality = e.target.value;
    if (k === 'latin') {
      latin = e.target.checked;
      if (run && ['route', 'boss'].includes(run.phase)) drawChoices();
    }
    world?.settings({ motion, quality });
  };
  const key = (e) => {
    if (e.target.matches('input,select') || !$('.digest-settings').hidden) return;
    if (['1', '2', '3'].includes(e.key)) {
      if (run?.phase === 'entry') {
        panel.querySelectorAll('[data-entry]')[Number(e.key) - 1]?.click();
        return;
      }
      if (exam) {
        panel.querySelectorAll('[data-exam-answer]')[Number(e.key) - 1]?.click();
        return;
      }
      if (run?.phase === 'absorb-choice') {
        panel.querySelectorAll('[data-absorb]')[Number(e.key) - 1]?.click();
        return;
      }
      e.preventDefault();
      if (
        run?.phase === 'boss' &&
        BOSSES[run.character][ROUTE[run.index].id][run.task].kind === 'reaction'
      )
        panel.querySelectorAll('[data-chain]')[Number(e.key) - 1]?.click();
      else answer(Number(e.key) - 1);
    }
  };
  root.addEventListener('click', click);
  root.addEventListener('change', change);
  root.addEventListener('keydown', key);
  try {
    world = createDigestionWorld($('canvas'), (i) => {
      if (run?.phase === 'entry') {
        entryAnswer(i);
        return;
      }
      if (run?.phase === 'route') {
        answer(i);
        return;
      }
      if (
        run?.phase === 'boss' &&
        BOSSES[run.character][ROUTE[run.index].id][run.task].kind === 'enzyme'
      )
        answer(i);
    });
    world.settings({ motion, quality });
    menu();
  } catch {
    root.querySelectorAll('.digest-top button').forEach((b) => (b.disabled = true));
    panel.innerHTML =
      '<h1>3D kunne ikke vises</h1><p>Spillet kræver WebGL 2. Prøv en nyere browser med hardwareacceleration.</p><a href="#/sti/find-vej-kredsloeb/circulation-order">Åbn kredsløbsøvelser uden 3D</a>';
  }
  return () => {
    disposed = true;
    cancel();
    clock?.pause();
    playing = false;
    void save();
    toolbarObserver.disconnect();

    clearInterval(checkpoint);
    document.removeEventListener('visibilitychange', visibility);
    world?.dispose();
    audio?.close();
    unlock();
    root.removeEventListener('click', click);
    root.removeEventListener('change', change);
    root.removeEventListener('keydown', key);
  };
}
