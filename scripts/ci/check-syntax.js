import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { git } from './git.js';
export function checkSyntax(files) {
  const result = spawnSync(
    process.execPath,
    ['--experimental-vm-modules', fileURLToPath(new URL('./syntax-worker.cjs', import.meta.url))],
    {
      input: JSON.stringify(files),
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  if (result.error) throw result.error;
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) throw Error('JavaScript syntax check failed');
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = git(['ls-files', '--cached', '--others', '--exclude-standard', '-z'])
    .split('\0')
    .filter(
      (f) =>
        /\.(?:js|cjs|mjs)$/.test(f) &&
        (/^(public|scripts|test|tests-browser)\//.test(f) || f === 'server.js'),
    );
  checkSyntax([...new Set(files)]);
}
