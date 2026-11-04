import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('entrypoint assets resolve inside the GitHub Pages repository path', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const base = 'https://martinkaaekristiansen.github.io/sygepleje-laeringsstier/';
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]);
  assert.ok(refs.includes('./app.js'));
  assert.ok(refs.includes('./style.css'));
  for (const ref of refs) assert.ok(new URL(ref, base).href.startsWith(base));
});
