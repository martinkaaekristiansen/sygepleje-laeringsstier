// Pedagogical proximity zones, not measurements of sounds inside blood vessels.
export const HEART_RATE = 70;
export const BREATH_RATE = 14;
export const HEART_PERIOD = 60 / HEART_RATE;
export const BREATH_PERIOD = 60 / BREATH_RATE;
export const S2_TIME = 0.31;
export const isValve = (s) => s.kind.startsWith('av-') || s.kind === 'semilunar';
export const isChamber = (s) => ['atrium', 'right-ventricle', 'left-ventricle'].includes(s.kind);

const zones = {
  heart: { heart: 1, lungs: 0, flow: 0.7, pulse: 0.75 },
  great: { heart: 0.76, lungs: 0, flow: 0.65, pulse: 0.7 },
  artery: { heart: 0.22, lungs: 0, flow: 0.34, pulse: 0.35 },
  arteriole: { heart: 0.035, lungs: 0, flow: 0.12, pulse: 0.07 },
  capillary: { heart: 0.012, lungs: 0, flow: 0.035, pulse: 0 },
  venule: { heart: 0.035, lungs: 0, flow: 0.08, pulse: 0 },
  vein: { heart: 0.18, lungs: 0, flow: 0.16, pulse: 0 },
  cava: { heart: 0.64, lungs: 0, flow: 0.22, pulse: 0.06 },
};
export function anatomyProfile(s) {
  const capillary = s.kind.includes('capillary'),
    chamber = isChamber(s),
    valve = isValve(s);
  let zone =
    valve || chamber
      ? 'heart'
      : capillary
        ? 'capillary'
        : s.kind === 'arteriole'
          ? 'arteriole'
          : s.kind === 'vein'
            ? 'vein'
            : 'artery';
  if (['aorta', 'ascending', 'arch', 'trunk'].includes(s.id)) zone = 'great';
  if (['cava', 'svc'].includes(s.id)) zone = 'cava';
  if (['venules', 'pvenules'].includes(s.id)) zone = 'venule';
  const sound = { ...zones[zone] };
  if (s.id === 'pulmonaryValve') sound.lungs = 0.07;
  if (s.id === 'trunk') sound.lungs = 0.15;
  if (['pa', 'rpa'].includes(s.id)) {
    sound.heart = 0.5;
    sound.lungs = 0.3;
  }
  if (['parterioles', 'pvenules'].includes(s.id)) sound.lungs = 0.85;
  if (['pcapillaries', 'lungs'].includes(s.id)) sound.lungs = 1;
  if (s.id === 'pv') {
    sound.heart = 0.52;
    sound.lungs = 0.22;
  }
  return {
    zone,
    sound,
    capillary,
    chamber,
    valve,
    pulmonary: [
      'pulmonaryValve',
      'trunk',
      'pa',
      'rpa',
      'parterioles',
      'pcapillaries',
      'pvenules',
      'pv',
      'lungs',
    ].includes(s.id),
    // Wall thickness and lumen are illustrative relative units, not a uniform scale.
    wall: capillary
      ? 0.008
      : zone === 'venule'
        ? 0.015
        : s.kind === 'left-ventricle'
          ? 0.17
          : s.kind === 'right-ventricle'
            ? 0.075
            : s.kind === 'atrium'
              ? 0.035
              : s.kind === 'vein'
                ? 0.025
                : s.kind === 'arteriole'
                  ? 0.11
                  : 0.09,
    lumen: capillary
      ? 0.48
      : zone === 'venule'
        ? 0.8
        : s.kind === 'arteriole'
          ? 0.7
          : chamber
            ? 1.12
            : s.kind === 'vein'
              ? 1.08
              : 0.95,
    speed: capillary ? 0.025 : s.kind === 'arteriole' ? 0.055 : s.kind === 'vein' ? 0.065 : 0.11,
    // Only the peripheral arm vein model has venous valves, never cava/lung veins.
    venousValve: s.id === 'veins',
  };
}
export function cardiacCycle(seconds) {
  const t = ((seconds % HEART_PERIOD) + HEART_PERIOD) % HEART_PERIOD;
  const systole = t < S2_TIME;
  // Emptying is not the instantaneous contraction pulse: end-systolic volume
  // stays low through isovolumetric relaxation, then rises during filling.
  const smooth = (value) => {
    const x = Math.max(0, Math.min(1, value));
    return x * x * (3 - 2 * x);
  };
  const emptying =
    t < S2_TIME ? smooth((t - 0.065) / (S2_TIME - 0.065)) : 1 - smooth((t - 0.37) / 0.28);
  return {
    t,
    systole,
    emptying,
    contraction: systole ? Math.sin((Math.PI * t) / S2_TIME) : 0,
    atrialContraction: t > 0.7 ? Math.sin((Math.PI * (t - 0.7)) / (HEART_PERIOD - 0.7)) : 0,
  };
}
export function valveOpening(s, seconds) {
  const { t } = cardiacCycle(seconds);
  const start = s.kind === 'semilunar' ? 0.065 : 0.37;
  const end = s.kind === 'semilunar' ? S2_TIME : HEART_PERIOD - 0.035;
  if (t < start || t > end) return 0;
  return Math.min(1, (t - start) / 0.035, (end - t) / 0.035);
}
// Cross the leaflet plane only within the fully open interval (seconds).
export function valveTransit(s, seconds) {
  const start = s.kind === 'semilunar' ? 0.105 : 0.415;
  const end = s.kind === 'semilunar' ? 0.265 : 0.78;
  const { t } = cardiacCycle(seconds);
  const wait = t <= start ? start - t : HEART_PERIOD - t + start;
  return { wait, duration: end - start };
}
export function oxygenation(s, elapsed) {
  const fraction = Math.max(0, Math.min(1, elapsed / 4));
  if (s.oxygen === 'exchange-in') return fraction;
  if (s.oxygen === 'exchange-out') return 1 - fraction;
  return s.oxygen === 'high' ? 1 : 0;
}

export function respiratoryCycle(seconds) {
  const t = ((seconds % BREATH_PERIOD) + BREATH_PERIOD) % BREATH_PERIOD;
  const smooth = (x) => x * x * (3 - 2 * x);
  const volume = t < 1.7 ? smooth(t / 1.7) : t < 3.5 ? 1 - smooth((t - 1.7) / 1.8) : 0;
  const sound =
    t < 1.7
      ? Math.sin((Math.PI * t) / 1.7) ** 1.7
      : t < 3.5
        ? 0.48 * Math.sin((Math.PI * (t - 1.7)) / 1.8) ** 2
        : 0;
  return { t, volume, sound, inspiration: t < 1.7 };
}
