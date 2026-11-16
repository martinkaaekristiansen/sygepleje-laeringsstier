import { synthesizeLayer } from './journey-audio.js';
export const CHEW_RATE = 2.7;
export const ORGAN_SOUND = {
  mouth: 'mouth',
  pharynx: 'throat',
  epiglottis: 'throat',
  oesophagus: 'oesophagus',
  stomach: 'stomach',
  duodenum: 'duodenum',
  jejunum: 'small-intestine',
  ileum: 'small-intestine',
  caecum: 'colon',
  ascending: 'colon',
  transverse: 'colon',
  descending: 'colon',
  sigmoid: 'colon',
  rectum: 'colon',
  anus: 'finale',
};
export function chewingPose(t) {
  return Math.max(0, Math.sin(t * CHEW_RATE));
}
export function chewBeat(t) {
  return Math.floor((t * CHEW_RATE - Math.PI / 2) / (Math.PI * 2));
}
const sounds = {
  chew: [0.3, 650, 0.25],
  wet: [0.4, 250, 0.12],
  swallow: [0.6, 180, 0.2],
  cough: [0.42, 1150, 0.28],
  peristalsis: [0.75, 105, 0.13],
  rumble: [1.3, 75, 0.16],
  bubble: [0.6, 170, 0.14],
  secretion: [1.1, 420, 0.16],
  binding: [0.14, 550, 0.09],
  cleave: [0.22, 850, 0.11],
  absorption: [0.45, 280, 0.12],
  splash: [0.9, 1100, 0.22],
  finish: [0.5, 160, 0.14],
};
// Original, deterministic organic transients: filtered noise, soft envelopes and
// low resonances. No recordings, downloads, speech, or external audio services.
export function synthesizeDigestSound(kind, sampleRate) {
  const [duration, cutoff, amplitude] = sounds[kind] || sounds.wet,
    n = Math.round(sampleRate * duration),
    data = new Float32Array(n);
  let seed = 4117 + kind.length * 397,
    low = 0,
    deep = 0;
  for (let i = 0; i < n; i++) {
    seed = (1664525 * seed + 1013904223) >>> 0;
    const noise = seed / 2147483648 - 1,
      t = i / sampleRate,
      u = i / Math.max(1, n - 1);
    low += (1 - Math.exp((-2 * Math.PI * cutoff) / sampleRate)) * (noise - low);
    deep += 0.012 * (noise - deep);
    const envelope = Math.sin(Math.PI * u) ** 2;
    const pulses =
      kind === 'cough'
        ? Math.max(0, Math.sin(u * Math.PI * 3))
        : kind === 'chew'
          ? 0.5 + 0.5 * Math.sin(u * Math.PI * 9) ** 2
          : 1;
    const resonance =
      Math.sin(
        2 * Math.PI * (kind === 'splash' ? 100 - 65 * u : 48 + 17 * Math.sin(u * Math.PI)) * t,
      ) * 0.12;
    data[i] = Math.max(
      -0.7,
      Math.min(0.7, (low * 1.7 + deep * 2 + resonance) * envelope * pulses * amplitude),
    );
  }
  return data;
}
export function createDigestAudio({
  contextFactory = () => new (globalThis.AudioContext || globalThis.webkitAudioContext)(),
  onChange = () => {},
} = {}) {
  let ctx = null,
    master = null,
    environmentBus = null,
    effectBus = null,
    ambientSource = null,
    settings = { enabled: false, volume: 0.3, ambient: true, effects: true },
    paused = false,
    profile = null,
    disposed = false,
    blocked = false,
    lastEvent = '',
    eventCount = 0;
  const voices = new Set(),
    cache = new Map();
  const notify = () => onChange(snapshot());
  function snapshot() {
    return {
      unlocked: !!ctx,
      blocked,
      enabled: settings.enabled,
      volume: settings.volume,
      ambient: settings.ambient,
      effects: settings.effects,
      profile,
      paused,
      voices: voices.size + (ambientSource ? 1 : 0),
      lastEvent,
      eventCount,
      state: ctx?.state || 'locked',
    };
  }
  function buffer(kind) {
    const key = kind + ':' + ctx.sampleRate;
    if (cache.has(key)) return cache.get(key);
    const samples =
        kind === 'environment'
          ? synthesizeLayer('flow', ctx.sampleRate)
          : synthesizeDigestSound(kind, ctx.sampleRate),
      b = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    b.copyToChannel(samples, 0);
    cache.set(key, b);
    return b;
  }
  function stopVoices() {
    for (const v of [...voices]) {
      try {
        v.source.stop();
      } catch {}
      v.source.disconnect();
      v.gain.disconnect();
      voices.delete(v);
    }
  }
  function stopAmbient() {
    if (ambientSource) {
      try {
        ambientSource.source.stop();
      } catch {}
      ambientSource.source.disconnect();
      ambientSource.filter.disconnect();
      ambientSource = null;
    }
  }
  function update() {
    if (!ctx) return;
    const t = ctx.currentTime,
      active = settings.enabled && !paused && !disposed;
    master.gain.setTargetAtTime(active ? settings.volume : 0, t, 0.025);
    environmentBus.gain.setTargetAtTime(active && settings.ambient ? 0.16 : 0, t, 0.08);
    effectBus.gain.setTargetAtTime(active && settings.effects ? 1 : 0, t, 0.025);
    if (!active || !settings.effects) stopVoices();
    if (!active || !settings.ambient || !profile || profile === 'finale') {
      stopAmbient();
      notify();
      return;
    }
    const cutoff =
      {
        mouth: 420,
        throat: 170,
        oesophagus: 130,
        stomach: 85,
        duodenum: 570,
        'small-intestine': 230,
        colon: 95,
      }[profile] || 160;
    if (ambientSource) {
      ambientSource.filter.frequency.setTargetAtTime(cutoff, t, 0.25);
    } else {
      const source = ctx.createBufferSource(),
        filter = ctx.createBiquadFilter();
      source.buffer = buffer('environment');
      source.loop = true;
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;
      source.connect(filter).connect(environmentBus);
      source.start();
      ambientSource = { source, filter };
    }
    notify();
  }
  async function unlock() {
    if (disposed || !settings.enabled) return false;
    try {
      if (!ctx) {
        ctx = contextFactory();
        master = ctx.createGain();
        environmentBus = ctx.createGain();
        effectBus = ctx.createGain();
        master.gain.value = 0;
        environmentBus.gain.value = 0;
        effectBus.gain.value = 0;
        environmentBus.connect(master);
        effectBus.connect(master);
        master.connect(ctx.destination);
      }
      await ctx.resume();
      blocked = ctx.state !== 'running';
      update();
      notify();
      return !blocked;
    } catch {
      blocked = true;
      notify();
      return false;
    }
  }
  function effect(kind) {
    if (
      !ctx ||
      ctx.state !== 'running' ||
      !settings.enabled ||
      !settings.effects ||
      paused ||
      disposed ||
      voices.size >= 3
    )
      return false;
    const source = ctx.createBufferSource(),
      gain = ctx.createGain(),
      t = ctx.currentTime;
    source.buffer = buffer(kind);
    source.playbackRate.value = 1 + Math.sin(eventCount * 2.399) * 0.07;
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.7, t + 0.015);
    gain.gain.setTargetAtTime(0, t + source.buffer.duration * 0.65, 0.035);
    source.connect(gain).connect(effectBus);
    const voice = { source, gain };
    voices.add(voice);
    source.onended = () => {
      voices.delete(voice);
      source.disconnect();
      gain.disconnect();
      notify();
    };
    source.start();
    lastEvent = kind;
    eventCount++;
    notify();
    return true;
  }
  return {
    unlock,
    effect,
    snapshot,
    configure(value) {
      settings = { ...settings, ...value };
      settings.volume = Math.max(
        0,
        Math.min(1, Number.isFinite(settings.volume) ? settings.volume : 0.3),
      );
      update();
      notify();
    },
    locate(stage, mode, active = true) {
      profile = active ? ORGAN_SOUND[stage] || null : null;
      update();
      if (mode === 'swallow') effect('swallow');
      if (['secretion', 'brush-border', 'bile'].includes(mode)) effect('secretion');
    },
    pause(value) {
      paused = value;
      update();
      notify();
    },
    dispose() {
      disposed = true;
      stopVoices();
      stopAmbient();
      cache.clear();
      if (ctx) {
        master.disconnect();
        environmentBus.disconnect();
        effectBus.disconnect();
        void ctx.close();
      }
      notify();
    },
  };
}
