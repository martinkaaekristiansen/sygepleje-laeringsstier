import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cpSync,
  mkdtempSync,
  symlinkSync,
  readFileSync,
  writeFileSync,
  rmSync,
  readdirSync,
} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'build-contract-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const dir of ['public', 'scripts']) cpSync(dir, path.join(root, dir), { recursive: true });
  for (const file of ['package.json', 'vendor-manifest.json']) cpSync(file, path.join(root, file));
  symlinkSync(path.resolve('node_modules'), path.join(root, 'node_modules'));
  return {
    root,
    build: () => spawnSync(process.execPath, ['scripts/build.js'], { cwd: root, encoding: 'utf8' }),
    manifest: () => JSON.parse(readFileSync(path.join(root, 'artifacts/build-manifest.json'))),
    put: (file, data) => writeFileSync(path.join(root, file), data),
  };
}
test('production build is deterministic, retains runtime bytes and vendor checksums, omits only audited test-only modules', (t) => {
  const f = fixture(t),
    first = f.build();
  assert.equal(first.status, 0, first.stderr);
  const manifest = f.manifest(),
    hashes = () =>
      readdirSync(path.join(f.root, 'dist', manifest.assets)).map((name) => [
        name,
        createHash('sha256')
          .update(readFileSync(path.join(f.root, 'dist', manifest.assets, name)))
          .digest('hex'),
      ]);
  const previous = hashes();
  assert.equal(manifest.excluded.length, 3);
  assert.equal(manifest.vendorVerified.length, 3);
  for (const file of manifest.files.filter((f) => f !== 'index.html'))
    assert.deepEqual(
      readFileSync(path.join(f.root, 'dist', manifest.assets, file)),
      readFileSync(path.join(f.root, 'public', file)),
    );
  assert.equal(f.build().status, 0);
  assert.deepEqual(f.manifest(), manifest);
  assert.deepEqual(hashes(), previous);
});
test('build rejects tampered vendor and missing runtime dependency', (t) => {
  const f = fixture(t);
  f.put('public/three.module.min.js', 'invalid vendor');
  assert.notEqual(f.build().status, 0);
  cpSync('public/three.module.min.js', path.join(f.root, 'public/three.module.min.js'));
  f.put('public/app.js', "import './missing-file.js';");
  const result = f.build();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing runtime dependencies/);
});
test('runtime references reinstate historical module and unresolved imports copy all conservatively', (t) => {
  const f = fixture(t);
  f.put('public/app.js', "import './digestion-absorption.js';");
  assert.equal(f.build().status, 0);
  assert(!f.manifest().excluded.includes('digestion-absorption.js'));
  f.put('public/app.js', 'export function load(name) { return import(name); }');
  assert.equal(f.build().status, 0);
  assert.deepEqual(f.manifest().excluded, []);
  assert.equal(f.manifest().conservativeCopyAll, true);
});
