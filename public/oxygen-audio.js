import { synthesizeLayer } from './journey-audio.js';
import { anatomyProfile } from './journey-physiology.js';
import { bloodStructure } from './oxygen-data.js';
// The existing DSP/breath/heart periods are reused. Each game's settings and
// logical pause clock remain independent; no blood-game preference is written.
export function createOxygenAudio({ time = () => 0, onStatus = () => {} } = {}) {
  let ctx = null,
    master = null,
    unlocked = false,
    paused = true,
    disposed = false,
    error = '',
    profile = { heart: 0, lungs: 0, flow: 0 },
    settings = { sound: false, volume: 0.3 },
    sources = [],
    gains = {},
    buffers = {};
  const status = () =>
    error ||
    (!settings.sound
      ? 'Lyd slået fra'
      : unlocked && !paused
        ? 'Lyd aktiv · 70 slag/min · 14 åndedrag/min'
        : 'Lyd klar – start eller fortsæt rejsen');
  const notify = () => onStatus(status());
  function stop() {
    for (const source of sources)
      try {
        source.stop();
        source.disconnect();
      } catch {}
    sources = [];
  }
  function levels() {
    if (!ctx || !master) return;
    master.gain.setTargetAtTime(
      settings.sound && !paused ? settings.volume : 0,
      ctx.currentTime,
      0.05,
    );
    for (const key of ['heart', 'lungs', 'flow'])
      gains[key]?.gain.setTargetAtTime(
        (profile[key] || 0) * { heart: 0.55, lungs: 0.19, flow: 0.13 }[key],
        ctx.currentTime,
        0.18,
      );
  }
  function start() {
    if (!ctx || paused || !settings.sound || sources.length || disposed) return;
    for (const key of ['heart', 'lungs', 'flow']) {
      if (!buffers[key]) {
        const samples = synthesizeLayer(key, ctx.sampleRate),
          buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
        buffer.copyToChannel(samples, 0);
        buffers[key] = buffer;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffers[key];
      source.loop = true;
      source.connect(gains[key]);
      source.start(
        ctx.currentTime,
        ((time() % source.buffer.duration) + source.buffer.duration) % source.buffer.duration,
      );
      sources.push(source);
    }
    levels();
  }
  async function unlock() {
    if (disposed || !settings.sound) return false;
    try {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Context) throw Error('Lyd understøttes ikke i denne browser.');
      if (!ctx) {
        ctx = new Context();
        master = ctx.createGain();
        master.gain.value = 0;
        master.connect(ctx.destination);
        for (const key of ['heart', 'lungs', 'flow']) {
          gains[key] = ctx.createGain();
          gains[key].gain.value = 0;
          gains[key].connect(master);
        }
      }
      await ctx.resume();
      unlocked = ctx.state === 'running';
      error = unlocked ? '' : 'Lyd afventer et klik.';
      start();
      notify();
      return unlocked;
    } catch (e) {
      error = e.message;
      notify();
      return false;
    }
  }
  return {
    unlock,
    status,
    snapshot: () => ({
      unlocked,
      paused,
      sources: sources.length,
      enabled: settings.sound,
      clock: time(),
      unsupported: !!error,
    }),
    configure(next) {
      settings = { ...settings, ...next };
      settings.volume = Math.max(0, Math.min(1, settings.volume));
      if (!settings.sound) stop();
      else if (unlocked) start();
      levels();
      notify();
    },
    locate(stage) {
      profile = stage.blood
        ? anatomyProfile(bloodStructure(stage.blood)).sound
        : {
            heart: stage.region === 'lung' ? 0.04 : 0,
            lungs: stage.region === 'arm' ? 0.03 : 1,
            flow: 0,
          };
      levels();
    },
    pause(value) {
      if (paused === value) return;
      paused = value;
      if (value) {
        if (master && ctx) master.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
        stop();
      } else if (unlocked) start();
      notify();
    },
    effect() {
      if (!ctx || !unlocked || !settings.sound || paused) return;
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(380, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(240, ctx.currentTime + 0.12);
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.025 * settings.volume, ctx.currentTime + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
      o.connect(g);
      g.connect(master);
      o.start();
      o.stop(ctx.currentTime + 0.15);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
      };
    },
    dispose() {
      disposed = true;
      stop();
      if (ctx) void ctx.close().catch(() => {});
    },
  };
}
