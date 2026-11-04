import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
// Validate JavaScript before producing a static, dependency-free Pages artifact.
for (const file of ['public/app.js', 'public/data.js']) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}
const html = await readFile('public/index.html', 'utf8');
if (/\b(?:src|href)=["']\/(?!\/)/.test(html)) {
  throw new Error('Use relative asset URLs so the app works below the repository path.');
}
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });
await writeFile('dist/.nojekyll', '');
console.log('GitHub Pages artifact ready in dist/');
