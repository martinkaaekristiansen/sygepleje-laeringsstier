import {HEART_PERIOD, BREATH_PERIOD, S2_TIME, anatomyProfile} from './journey-physiology.js';
export const AUDIO_KEY = 'laeringsstier-blood-audio-v1';
export const DEFAULT_AUDIO = Object.freeze({enabled: false, volume: .45, heart: true, lungs: true, flow: true});
export function normalizeAudio(value) {
 const s = {...DEFAULT_AUDIO};
 for (const key of ['enabled', 'heart', 'lungs', 'flow']) if (typeof value?.[key] === 'boolean') s[key] = value[key];
 if (typeof value?.volume === 'number' && Number.isFinite(value.volume)) s.volume = Math.max(0, Math.min(1, value.volume));
 return s;
}
export function loadAudioSettings() {
 try {return normalizeAudio(JSON.parse(localStorage.getItem(AUDIO_KEY)));} catch {return {...DEFAULT_AUDIO};}
}
export function saveAudioSettings(s) {
 try {localStorage.setItem(AUDIO_KEY, JSON.stringify(normalizeAudio(s))); return true;} catch {return false;}
}
// Original deterministic synthesis. Smooth envelopes start/end at zero; there are
// no downloaded recordings, runtime requests, or licensed third-party samples.
export function synthesizeLayer(layer, sampleRate) {
 if (layer === 'flow') {
  // Circular, twice-low-passed noise: warm up from the end of the same buffer.
  // This produces a seamless steady stream, without a heartbeat-shaped dip at
  // the seam. Pulsatility is added separately only where anatomy calls for it.
  const count = Math.round(sampleRate * 4), noise = new Float32Array(count), output = new Float32Array(count);
  let seed = 5391, low = 0, smooth = 0, peak = 0;
  for (let i = 0; i < count; i++) {seed = (1664525 * seed + 1013904223) >>> 0; noise[i] = seed / 2147483648 - 1;}
  const alpha = 1 - Math.exp(-2 * Math.PI * 180 / sampleRate);
  for (let i = -Math.round(sampleRate * .2); i < count; i++) {
   low += alpha * (noise[(i + count) % count] - low); smooth += alpha * (low - smooth);
   if (i >= 0) {output[i] = smooth; peak = Math.max(peak, Math.abs(smooth));}
  }
  for (let i = 0; i < count; i++) output[i] *= .65 / peak;
  return output;
 }
 const duration = layer === 'breath' ? BREATH_PERIOD : HEART_PERIOD;
 const samples = new Float32Array(Math.round(sampleRate * duration));
 let seed = 7629, low = 0, previous = 0;
 for (let i = 0; i < samples.length; i++) {
  const t = i / sampleRate;
  seed = (1664525 * seed + 1013904223) >>> 0;
  const white = seed / 2147483648 - 1;
  low += (1 - Math.exp(-2 * Math.PI * (layer === 'heart' ? 170 : 900) / sampleRate)) * (white - low);
  const smooth = low;
  previous += (1 - Math.exp(-2 * Math.PI * 180 / sampleRate)) * (smooth - previous);
  if (layer === 'heart') {
   for (const [offset, length, pitch, amplitude] of [[.012, .15, 53, 1], [S2_TIME, .105, 78, .72]]) {
    const u = t - offset;
    if (u >= 0 && u < length) {
     const envelope = Math.sin(Math.PI * u / length) ** 2 * Math.exp(-u * 15);
     samples[i] += amplitude * envelope * (.55 * Math.sin(2 * Math.PI * pitch * u) + .22 * Math.sin(2 * Math.PI * pitch * 1.62 * u) + .45 * smooth);
    }
   }
  } else if (layer === 'breath') {
   // Soft inspiration ~1.7 s; shorter, quieter expiration; quiet end-expiratory pause.
   const envelope = t < 1.7 ? Math.sin(Math.PI * t / 1.7) ** 1.7 : t < 3.5 ? .48 * Math.sin(Math.PI * (t - 1.7) / 1.8) ** 2 : 0;
   samples[i] = (smooth - previous) * envelope;
  } else if (layer === 'pulse') samples[i] = Math.sin(Math.PI * Math.min(1, t / .34)) ** 2;
  else {
   // The short fade removes an audible loop seam; very low level in the mix.
   const edge = Math.min(1, t / .025, (duration - t) / .025);
   samples[i] = previous * edge;
  }
 }
 if (layer !== 'pulse') {
  let peak = 0; for (const v of samples) peak = Math.max(peak, Math.abs(v));
  if (peak) for (let i = 0; i < samples.length; i++) samples[i] *= .65 / peak;
 }
 return samples;
}
function ramp(param, value, time, tau = .45) {
 // cancelAndHold avoids jumping to the end of a previous target on fast changes.
 if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(time);
 else param.cancelScheduledValues(time);
 param.setTargetAtTime(value, time, tau);
}
export function createJourneyAudio({settings = loadAudioSettings(), onStatus = () => {}} = {}) {
 let ctx, master, layers, pulseDepth, flowEnvelope, origin = 0, timer = 0;
 let structure = null, playing = false, disposed = false, error = '', unlocked = false;
 const born = performance.now();
 let clockBase = 0;
 const sources = [];
 const now = () => ctx?.state === 'running' ? clockBase + ctx.currentTime - origin : (performance.now() - born) / 1000;
 function apply() {
  if (!ctx || disposed) return;
  const t = ctx.currentTime, p = structure ? anatomyProfile(structure).sound : {heart: 0, lungs: 0, flow: 0, pulse: 0};
  ramp(master.gain, settings.enabled && playing && !document.hidden ? settings.volume : 0, t, .12);
  for (const [key, max] of [['heart', .65], ['lungs', .23], ['flow', .16]]) ramp(layers[key].gain, settings[key] ? p[key] * max : 0, t);
  ramp(pulseDepth.gain, p.pulse, t); ramp(flowEnvelope.gain, 1 - p.pulse * .7, t);
 }
 function makeSource(layer, destination) {
  const values = synthesizeLayer(layer, ctx.sampleRate), buffer = ctx.createBuffer(1, values.length, ctx.sampleRate);
  buffer.copyToChannel(values, 0);
  const source = ctx.createBufferSource(); source.buffer = buffer; source.loop = true;
  source.connect(destination); sources.push(source);
 }
 function construct() {
  const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Audio) throw new Error('Denne browser understøtter ikke spillets lyd. Du kan fortsat spille uden lyd.');
  ctx = new Audio(); origin = ctx.currentTime; clockBase = (performance.now() - born) / 1000;
  master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  layers = {};
  for (const key of ['heart', 'lungs', 'flow']) {layers[key] = ctx.createGain(); layers[key].gain.value = 0; layers[key].connect(master);}
  flowEnvelope = ctx.createGain(); flowEnvelope.gain.value = 1; flowEnvelope.connect(layers.flow);
  pulseDepth = ctx.createGain(); pulseDepth.gain.value = 0; pulseDepth.connect(flowEnvelope.gain);
  makeSource('heart', layers.heart);
  makeSource('breath', layers.lungs);
  makeSource('flow', flowEnvelope);
  makeSource('pulse', pulseDepth);
  // All sources and the visual cycle share one start timestamp, after buffers
  // are ready. Synthesis time must not shift one layer relative to another.
  origin = ctx.currentTime + .03; clockBase = (performance.now() - born) / 1000 + .03;
  for (const source of sources) source.start(origin, clockBase % source.buffer.duration);
  ctx.onstatechange = () => {if (!disposed) onStatus();};
 }
 async function activate() {
  if (!settings.enabled || disposed || document.hidden) return;
  clearTimeout(timer);
  try {
   // Called synchronously from click/input, before any IndexedDB await.
   if (!ctx) construct();
   await ctx.resume();
   if (disposed) return;
   unlocked = true; error = ''; apply(); onStatus();
  } catch {error = 'Lyden kunne ikke startes. Tryk på “Prøv lyd igen”, eller spil videre uden lyd.'; onStatus();}
 }
 // During play, mute silences the master but keeps the common clock running.
 // Background/menu suspension saves resources; leaving the game closes it.
 function quiet() {
  if (!ctx) return;
  apply(); clearTimeout(timer);
  timer = setTimeout(() => {if (!disposed && (!playing || document.hidden)) ctx.suspend().catch(() => {});}, 800);
 }
 const visibility = () => {
  if (document.hidden) quiet();
  else if (unlocked && playing && settings.enabled) void activate();
 };
 document.addEventListener('visibilitychange', visibility);
 return {
  settings, now,
  status: () => error || (!settings.enabled ? 'Lyd slået fra' : ctx?.state === 'running' && playing ? 'Lyd aktiv · 70 slag/min · 14 åndedrag/min' : 'Lyd klar – aktiveres, når du starter eller fortsætter'),
  activate,
  update(next) {Object.assign(settings, normalizeAudio({...settings, ...next})); const saved = saveAudioSettings(settings); apply(); if (!settings.enabled) quiet(); return saved;},
  locate(s, active) {structure = s; playing = active; apply(); if (!active) quiet(); else if (unlocked && settings.enabled) void activate();},
  dispose() {disposed = true; clearTimeout(timer); document.removeEventListener('visibilitychange', visibility); if (ctx) {ctx.onstatechange = null; master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0, ctx.currentTime, .015); setTimeout(() => {sources.forEach(s => s.stop()); void ctx.close().catch(() => {});}, 100);}},
 };
}
