// Source is retained for Node tests and historical reference measurements.
// A runtime dependency reinstates it; unknown module loading copies all files.
export const TEST_ONLY_PUBLIC_MODULES = {
  'public/digestion-absorption.js':
    'test/digestion-absorption.test.js; historical epithelial paths',
  'public/digestion-camera.js':
    'test/digestion-phase-b.test.js and historical performance references',
  'public/digestion-epithelium.js': 'test/digestion-phase-c.test.js; historical cutaway model',
};
