// Records the actual environment; does not install, publish or modify app data.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
// Trust only this checked-out workspace, never a wildcard or a global setting.
// Container shells and checkout actions can have different HOME/NSS ownership.
const git = args => execFileSync('git', ['-c', `safe.directory=${process.cwd()}`, ...args], { encoding: 'utf8' });
const profile = process.env.CI_ENV_PROFILE || 'local';
if (!/^[a-z-]+$/.test(profile)) throw Error('Unknown benchmark profile');
const folder = path.resolve('artifacts/ci-environment');
fs.mkdirSync(folder, { recursive: true });
const file = path.join(folder, profile + '.json');
const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : {};
const stage = process.argv[2] || 'checkout';
const tracked = git(['ls-files', '-z'])
  .split('\0')
  .filter(Boolean);
const present = tracked.filter((p) => fs.existsSync(p));
const snapshot = {
  at: new Date().toISOString(),
  node: process.version,
  filesOnDisk: present.length,
  trackedFiles: tracked.length,
  trackedBytesOnDisk: present.reduce((n, p) => n + fs.statSync(p).size, 0),
  browserCacheHit: process.env.BROWSER_CACHE_HIT || null,
  npmCacheHit: process.env.NPM_CACHE_HIT || null,
  browserDirectory: process.env.PLAYWRIGHT_BROWSERS_PATH || 'default',
  gitObjects: git(['count-objects', '-v']),
};
const result = {
  ...old,
  profile,
  commit: git(['rev-parse', 'HEAD']).trim(),
  runner: {
    os: process.platform,
    arch: process.arch,
    cpus: require('node:os').availableParallelism(),
  },
  note: 'No deployment. Compare GitHub job/step timestamps, not estimates.',
  stages: { ...old.stages, [stage]: snapshot },
};
fs.writeFileSync(file, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ profile, stage, ...snapshot }));
