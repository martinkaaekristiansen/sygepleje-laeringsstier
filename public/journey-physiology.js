// Pedagogical proximity zones, not measurements of sounds inside blood vessels.
export const HEART_RATE = 70;
export const BREATH_RATE = 14;
export const HEART_PERIOD = 60 / HEART_RATE;
export const BREATH_PERIOD = 60 / BREATH_RATE;
export const S2_TIME = .31;
export const isValve = s => s.kind.startsWith('av-') || s.kind === 'semilunar';
export const isChamber = s => ['atrium', 'right-ventricle', 'left-ventricle'].includes(s.kind);

const zones = {
 heart: {heart: 1, lungs: 0, flow: .7, pulse: .75},
 great: {heart: .76, lungs: 0, flow: .65, pulse: .7},
 artery: {heart: .22, lungs: 0, flow: .34, pulse: .35},
 arteriole: {heart: .035, lungs: 0, flow: .12, pulse: .07},
 capillary: {heart: .012, lungs: 0, flow: .035, pulse: 0},
 venule: {heart: .035, lungs: 0, flow: .08, pulse: 0},
 vein: {heart: .18, lungs: 0, flow: .16, pulse: 0},
 cava: {heart: .64, lungs: 0, flow: .22, pulse: .06},
};
export function anatomyProfile(s) {
 const capillary = s.kind.includes('capillary'), chamber = isChamber(s), valve = isValve(s);
 let zone = valve || chamber ? 'heart' : capillary ? 'capillary' : s.kind === 'arteriole' ? 'arteriole' : s.kind === 'vein' ? 'vein' : 'artery';
 if (['aorta', 'ascending', 'arch', 'trunk'].includes(s.id)) zone = 'great';
 if (['cava', 'svc'].includes(s.id)) zone = 'cava';
 if (['venules', 'pvenules'].includes(s.id)) zone = 'venule';
 const sound = {...zones[zone]};
 if (s.id === 'pulmonaryValve') sound.lungs = .07;
 if (s.id === 'trunk') sound.lungs = .15;
 if (['pa', 'rpa'].includes(s.id)) {sound.heart = .5; sound.lungs = .3;}
 if (['parterioles', 'pvenules'].includes(s.id)) sound.lungs = .85;
 if (['pcapillaries', 'lungs'].includes(s.id)) sound.lungs = 1;
 if (s.id === 'pv') {sound.heart = .52; sound.lungs = .22;}
 return {
  zone, sound, capillary, chamber, valve,
  pulmonary: ['pulmonaryValve', 'trunk', 'pa', 'rpa', 'parterioles', 'pcapillaries', 'pvenules', 'pv', 'lungs'].includes(s.id),
  // Wall thickness and lumen are illustrative relative units, not a uniform scale.
  wall: capillary ? .008 : zone === 'venule' ? .015 : s.kind === 'left-ventricle' ? .17 : s.kind === 'right-ventricle' ? .075 : s.kind === 'atrium' ? .035 : s.kind === 'vein' ? .025 : s.kind === 'arteriole' ? .11 : .09,
  lumen: capillary ? .48 : zone === 'venule' ? .8 : s.kind === 'arteriole' ? .7 : chamber ? 1.12 : s.kind === 'vein' ? 1.08 : .95,
  speed: capillary ? .025 : s.kind === 'arteriole' ? .055 : s.kind === 'vein' ? .065 : .11,
  // Only the peripheral arm vein model has venous valves, never cava/lung veins.
  venousValve: s.id === 'veins',
 };
}
export function cardiacCycle(seconds) {
 const t = ((seconds % HEART_PERIOD) + HEART_PERIOD) % HEART_PERIOD;
 const systole = t < S2_TIME;
 return {t, systole, contraction: systole ? Math.sin(Math.PI * t / S2_TIME) : 0,
  atrialContraction: t > .7 ? Math.sin(Math.PI * (t - .7) / (HEART_PERIOD - .7)) : 0};
}
export function valveOpening(s, seconds) {
 const {t} = cardiacCycle(seconds);
 const start = s.kind === 'semilunar' ? .065 : .37;
 const end = s.kind === 'semilunar' ? S2_TIME : HEART_PERIOD - .035;
 if (t < start || t > end) return 0;
 return Math.min(1, (t - start) / .035, (end - t) / .035);
}
// Cross the leaflet plane only within the fully open interval (seconds).
export function valveTransit(s, seconds) {
 const start = s.kind === 'semilunar' ? .105 : .415;
 const end = s.kind === 'semilunar' ? .265 : .78;
 const {t} = cardiacCycle(seconds);
 const wait = t <= start ? start - t : HEART_PERIOD - t + start;
 return {wait, duration: end - start};
}
export function oxygenation(s, elapsed) {
 const fraction = Math.max(0, Math.min(1, elapsed / 4));
 if (s.oxygen === 'exchange-in') return fraction;
 if (s.oxygen === 'exchange-out') return 1 - fraction;
 return s.oxygen === 'high' ? 1 : 0;
}
