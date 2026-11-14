import { CHARACTERS, ROUTE, BOSSES, ABSORPTION, PH_NOTE, REACTIONS } from './digestion-data.js';
import { newDigestion, chooseDigestion, retryDigestion } from './digestion-engine.js';
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
    chain = [];
  const unlock = lockGameViewport(root);
  root.innerHTML = `<section class="digestion-game"><canvas aria-label="Fordøjelseskanalen og næringsstoffer i 3D"></canvas><div class="digest-top"><a href="#/">← Læringsstier</a><button data-digest="menu">Karakterer</button><button data-digest="settings" aria-expanded="false">Indstillinger</button></div><aside class="digest-settings" hidden><label><input type="checkbox" data-setting="sound"> Lyd</label><label>Lydstyrke <input type="range" min="0" max="1" step=".05" value=".3" data-setting="volume"></label><label><input type="checkbox" data-setting="motion" ${motion ? 'checked' : ''}> Bevægelse</label><label><input type="checkbox" data-setting="latin" checked> Danske og latinske navne</label><label>Grafik <select data-setting="quality"><option value="auto">Automatisk</option><option value="low">Lav</option></select></label><p>Stiliseret undervisningsmodel. Molekyler, enzymer og organer vises i forskellige skalaer; formerne er ikke atommodeller eller kliniske målinger.</p></aside><div class="digest-hud"></div><div class="digest-panel"></div><p class="digest-save" role="status"></p></section>`;
  const $ = (s) => root.querySelector(s),
    panel = $('.digest-panel');
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
      run.elapsed = Date.now() - run.started;
      data.active = run;
    }
    record.updatedAt = Date.now();
    const ok = await save({ retry: true });
    if (!disposed)
      $('.digest-save').innerHTML = ok
        ? 'Gemt på denne enhed.'
        : 'Ikke gemt. <button data-digest="save">Prøv at gemme igen</button>';
    return ok;
  }
  function hud() {
    if (!run) {
      $('.digest-hud').innerHTML = '';
      return;
    }
    const s = ROUTE[run.index];
    $('.digest-hud').innerHTML =
      `<div><strong>${esc(CHARACTERS[run.character].name)}</strong><span>${run.lives ? '♥'.repeat(run.lives) : 'Ingen liv'} · ${run.index + 1}/${ROUTE.length}</span></div><h1 tabindex="-1">${esc(latin ? s.latin + ' · ' + s.danish : s.danish)}</h1><p>${run.absorbed ? 'Perspektiv: ufordøjelig rest' : 'Perspektiv: valgt næringsstof'}</p><details class="digest-ph"><summary>pH <span data-ph>${s.ph}</span> · vejledende</summary><div class="ph-scale"><i></i></div><p>${esc(PH_NOTE)}</p></details>`;
  }
  function showScene(mode) {
    world?.setScene(
      ROUTE[run?.index || 0],
      run?.character || selected,
      mode,
      Boolean(run?.absorbed),
    );
    hud();
  }
  function cancel() {
    clearTimeout(timer);
    sequenceToken++;
    sequenceEnd = null;
  }
  function sequence(title, text, mode, seconds, next) {
    cancel();
    showScene(mode);
    panel.innerHTML = `<h2 tabindex="-1">${esc(title)}</h2><p>${esc(text)}</p><button data-digest="skip">Spring animation over →</button>`;
    const token = sequenceToken;
    sequenceEnd = () => {
      if (token !== sequenceToken || disposed) return;
      cancel();
      next();
    };
    timer = setTimeout(sequenceEnd, seconds * 1000);
    panel.querySelector('h2').focus({ preventScroll: true });
  }
  function menu() {
    cancel();
    run = data.active;
    showScene('menu');
    $('.digest-hud').innerHTML = '';
    panel.classList.add('digest-menu');
    panel.innerHTML = `<h1>Fordøjelsens vilde rejse</h1><p>Fra første bid til sidste skyl · vælg dit næringsstof</p><div class="digest-characters">${Object.entries(
      CHARACTERS,
    )
      .map(
        ([id, c]) =>
          `<button data-character="${id}" aria-pressed="${selected === id}"><strong>${esc(c.name)}</strong><span>${esc(c.description)}</span>${data.results[id] ? '<b>🏆 Gennemført · Sidste stop: porcelæn</b>' : ''}</button>`,
      )
      .join(
        '',
      )}</div><p>Find den anatomiske vej og oplev nedbrydning og absorption. To liv – aktuelle udfordringer kan altid genstartes.</p><button data-digest="start">Start rejsen →</button>${data.active && data.active.phase !== 'won' ? '<button data-digest="resume">Fortsæt gemt rejse</button>' : ''}${Object.keys(CHARACTERS).length === 3 && Object.keys(data.results).length === 3 ? '<p>🏆 FORDØJELSESMESTER – Du har overlevet både syre, enzymer og tyktarmens bakterier.</p>' : ''}`;
  }
  function start() {
    panel.classList.remove('digest-menu');
    run = newDigestion(selected);
    data.active = run;
    onCharacter(selected);
    store();
    sequence(
      'Den første bid',
      'Du er på vej ind i menneskets fordøjelsessystem. ADVARSEL: mekanisk destruktion påbegyndt! Tænderne findeler, spyt blandes i føden, og tungen fører bolus mod svælget.',
      'intro',
      12,
      () => {
        run.phase = 'arrival';
        arrival();
      },
    );
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
    const next = ROUTE.slice(run.index + 1).find((s) => !s.automatic);
    const distractors = ROUTE.filter(
      (s) => !s.automatic && s.id !== next.id && s.id !== ROUTE[run.index].id,
    );
    return [
      { label: latin ? next.latin + ' · ' + next.danish : next.danish, correct: true },
      ...[
        distractors[(run.index + 4) % distractors.length],
        distractors[(run.index + 7) % distractors.length],
      ].map((s) => ({ label: latin ? s.latin + ' · ' + s.danish : s.danish, correct: false })),
    ];
  }
  function drawChoices() {
    chain = [];
    hud();
    panel.dataset.stage = ROUTE[run.index].id;
    const s = ROUTE[run.index],
      task = run.phase === 'boss' ? BOSSES[run.character][s.id][run.task] : null;
    options = task ? task.options.map((label, i) => ({ label, correct: i === 0 })) : routeChoices();
    // A stable permutation prevents the correct answer having a fixed screen position.
    const rotate = (run.index + run.task + run.character.length) % options.length;
    options = [...options.slice(rotate), ...options.slice(0, rotate)];
    world?.labelChoices(options.map((o) => o.label));
    panel.innerHTML = `<p class="digest-eyebrow">${task ? `ENZYM-UDFORDRING · ${run.task + 1}/3 · ${task.kind === 'source' ? 'FORBIND MED ORGAN' : task.kind === 'reaction' ? 'BYG REAKTIONEN' : 'FIND ENZYMET'}` : 'FIND DEN ANATOMISKE VEJ'}</p><h2 tabindex="-1">${esc(task?.prompt || s.title)}</h2><p>${esc(task ? s.text : s.text + ' Hvilket afsnit følger efter? Overgange som pylorus vises automatisk.')}</p>${feedback ? `<p role="status" class="digest-feedback">${esc(feedback)}</p>` : ''}<div class="digest-choices">${options.map((o, i) => `<button data-choice="${i}"><b>${i + 1}</b> ${esc(o.label)}</button>`).join('')}</div><small>${task ? 'Klik på en molekylefigur eller brug knapperne.' : 'Brug knapperne eller tasterne 1–3.'}</small>`;
    if (task?.kind === 'reaction') {
      const steps = REACTIONS[run.character][s.id];
      panel.querySelector('.digest-choices').innerHTML = [2, 0, 1]
        .map((i) => `<button data-chain="${i}">${esc(steps[i])}</button>`)
        .join('');
      panel.querySelector('small').textContent =
        'Byg processen ved at vælge de tre led i korrekt rækkefølge.';
      const output = document.createElement('p');
      output.className = 'digest-chain';
      output.setAttribute('role', 'status');
      panel.append(output);
    }
  }
  async function answer(i) {
    if (busy || !run || !['boss', 'route'].includes(run.phase) || !options[i]) return;
    busy = true;
    root.querySelectorAll('[data-choice]').forEach((b) => (b.disabled = true));
    const s = ROUTE[run.index],
      task = run.phase === 'boss' ? BOSSES[run.character][s.id][run.task] : null;
    const correct = options[i].correct;
    chooseDigestion(run, correct);
    feedback = correct
      ? ''
      : (task
          ? task.why
          : 'Den valgte struktur er ikke næste afsnit på fødens vej. Følg fordøjelseskanalens rækkefølge.') +
        ' Prøv igen – kroppen har ikke ændret rute.';
    try {
      await store();
      if (disposed) return;
      if (run.phase === 'retry') {
        panel.innerHTML = `<h2>To liv brugt – ny chance</h2><p>${esc(feedback)}</p><button data-digest="retry">Genstart aktuelle udfordring</button>`;
      } else if (!correct || run.phase === 'boss') {
        drawChoices();
      } else if (run.phase === 'reaction') {
        tone();
        sequence(
          'Enzymet arbejder – og overlever',
          task.why + ' Hydrolyse bruger vand; enzymet frigives intakt til en ny reaktion.',
          'reaction',
          6,
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
  function absorption(i) {
    const steps = ABSORPTION[run.character];
    if (i >= steps.length) {
      run.absorbed = true;
      run.phase = 'route';
      showScene('travel');
      drawChoices();
      store();
      return;
    }
    const [mode, title, text] = steps[i];
    if (mode === 'residue') run.absorbed = true;
    sequence(title, text, mode, 6, () => absorption(i + 1));
  }
  async function finish() {
    run.phase = 'won';
    run.elapsed = Date.now() - run.started;
    data.results[run.character] = structuredClone(run);
    if (!record.done.includes('digestion-' + run.character))
      record.done.push('digestion-' + run.character);
    record.last = 'digestion-' + run.character;
    await store();
    if (disposed) return;
    tone(true);
    panel.innerHTML = `<h2>TILLYKKE! Fra første bid til sidste skyl.</h2><p>${esc(CHARACTERS[run.character].name)} · 🏆 Syreoverleveren · Sidste stop: porcelæn</p><dl><dt>Korrekte anatomiske valg</dt><dd>${run.anatomy}</dd><dt>Korrekte enzymdelopgaver</dt><dd>${run.enzyme} / 9</dd><dt>Fejl · resterende liv</dt><dd>${run.errors} · ${run.lives}</dd><dt>Tid</dt><dd>${Math.round(run.elapsed / 1000)} sekunder</dd></dl><p>Enzymer: ${esc(CHARACTERS[run.character].enzymes)}</p><p>Absorption i tyndtarmen: ${esc(CHARACTERS[run.character].transport)}</p><p>Gennemført aktivitet er ikke dokumentation for klinisk kompetence.</p><button data-digest="menu">Skyl ud og prøv et nyt næringsstof!</button>`;
  }
  const click = async (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.chain !== undefined) {
      const i = Number(b.dataset.chain);
      chain.push(i);
      b.disabled = true;
      $('.digest-chain').textContent = chain
        .map((n) => REACTIONS[run.character][ROUTE[run.index].id][n])
        .join(' → ');
      if (chain.length === 3) {
        const correct = chain.every((n, j) => n === j);
        await answer(options.findIndex((o) => o.correct === correct));
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
    if (a === 'settings') {
      const el = $('.digest-settings');
      el.hidden = !el.hidden;
      b.setAttribute('aria-expanded', String(!el.hidden));
      world?.pause(!el.hidden);
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
      panel.classList.remove('digest-menu');
      selected = run.character;
      onCharacter(selected);
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
          6,
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
        showScene(run.phase === 'boss' ? 'boss' : 'travel');
        drawChoices();
      } else arrival();
    }
    if (a === 'skip') sequenceEnd?.();
    if (a === 'retry') {
      retryDigestion(run);
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
      e.preventDefault();
      if (
        run?.phase === 'boss' &&
        BOSSES[run.character][ROUTE[run.index].id][run.task].kind === 'reaction'
      )
        $(`[data-chain="${Number(e.key) - 1}"]`)?.click();
      else answer(Number(e.key) - 1);
    }
  };
  root.addEventListener('click', click);
  root.addEventListener('change', change);
  root.addEventListener('keydown', key);
  const phTick = setInterval(() => {
    const value = $('canvas').dataset.ph;
    const span = $('[data-ph]');
    if (span && value) {
      span.textContent = Number(value).toFixed(1);
      const bar = $('.ph-scale i');
      if (bar) bar.style.left = (Number(value) / 14) * 100 + '%';
    }
  }, 150);
  try {
    world = createDigestionWorld($('canvas'), (i) => {
      if (
        run?.phase === 'boss' &&
        BOSSES[run.character][ROUTE[run.index].id][run.task].kind === 'enzyme'
      )
        answer(i);
    });
    world.settings({ motion, quality });
    menu();
  } catch {
    panel.innerHTML =
      '<h1>3D kunne ikke vises</h1><p>Spillet kræver WebGL 2. Prøv en nyere browser med hardwareacceleration.</p><a href="#/sti/find-vej-kredsloeb/circulation-order">Åbn kredsløbsøvelser uden 3D</a>';
  }
  return () => {
    disposed = true;
    cancel();
    clearInterval(phTick);
    world?.dispose();
    audio?.close();
    unlock();
    root.removeEventListener('click', click);
    root.removeEventListener('change', change);
    root.removeEventListener('keydown', key);
  };
}
