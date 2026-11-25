import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import YAML from 'yaml';
import { git } from '../scripts/ci/git.js';
import {
  inspectJS,
  inspectCSS,
  moduleGraph,
  closure,
  impactedGames,
} from '../scripts/ci/module-graph.js';
import { createPlan, changesBetween, planForRange } from '../scripts/ci/change-plan.js';
import { GROUPS, LEGACY, allBrowserFiles, selectGroups } from '../scripts/ci/test-registry.js';
import { tasksFor } from '../scripts/ci/browser-tasks.js';
import { runChild } from '../scripts/ci/run-browser.js';
import { startStaticServer } from '../scripts/static-server.js';
const { devices, levels } = createRequire(import.meta.url)('../tests-browser/ci-shards.cjs');
function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ci-tools-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  git(['init', '-q'], { root });
  git(['config', 'user.email', 'test@example.invalid'], { root });
  git(['config', 'user.name', 'CI test'], { root });
  const put = (file, data) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), data);
  };
  const commit = () => {
    git(['add', '.'], { root });
    git(['commit', '-qm', 'fixture'], { root });
    return git(['rev-parse', 'HEAD'], { root }).trim();
  };
  put('public/index.html', '<script src="./app.js"></script>');
  put(
    'public/app.js',
    "import './digestion-game.js'; import './oxygen-game.js'; import './blood-game.js';",
  );
  for (const name of ['digestion', 'oxygen', 'blood'])
    put(`public/${name}-game.js`, "import './shared.js';");
  put('public/shared.js', 'export const value = 1;');
  return { root, put, commit };
}
test('module graph follows re-exports, literal dynamic imports, workers, CSS and transitive shared game dependencies', (t) => {
  const f = fixture(t);
  f.put(
    'public/shared.js',
    "export {x} from './nested.js'; const w = new Worker(new URL('./worker.js', import.meta.url)); import('./optional.js');",
  );
  for (const name of ['nested', 'worker', 'optional'])
    f.put(`public/${name}.js`, 'export const x=1');
  f.commit();
  const graph = moduleGraph({ root: f.root });
  assert(closure(graph, ['public/index.html']).has('public/worker.js'));
  assert(closure(graph, ['public/index.html']).has('public/optional.js'));
  assert.deepEqual(impactedGames(graph, ['public/nested.js']), ['digestion', 'blood', 'oxygen']);
  assert.equal(graph.missing.length, 0);
  assert.deepEqual(
    inspectJS('import(variable);', 'x.js').unknown.map((x) => x.kind),
    ['dynamic-import'],
  );
  assert.equal(
    inspectCSS('.x{color:red}.x{color:red}@media(a){.x{color:red}}').duplicates.length,
    1,
  );
});
test('docs alone never publish, but documentation actually loaded at runtime does', (t) => {
  const f = fixture(t);
  f.put('docs/help.html', '<p>Used</p>');
  f.put('public/app.js', "fetch('../docs/help.html');");
  f.commit();
  const graph = moduleGraph({ root: f.root });
  const make = (files) => createPlan({ files, before: graph, after: graph });
  assert.equal(make(['docs/old/report.md']).deploy, false);
  assert.equal(make(['docs/old/report.md']).validate, false);
  assert.equal(make(['docs/help.html']).deploy, true);
  assert.equal(make(['docs/help.html']).full, true);
});
test('selectors retain union of CSS, transitive logic, core and unknown changes', (t) => {
  const f = fixture(t);
  f.commit();
  const graph = moduleGraph({ root: f.root });
  const make = (files) => createPlan({ files, before: graph, after: graph });
  assert.deepEqual(make(['public/shared.js']).domains.sort(), ['blood', 'digestion', 'oxygen']);
  assert(make(['public/shared.js', 'public/style.css']).groups.includes('digestion-journeys'));
  for (const file of [
    'public/storage.js',
    'public/model.js',
    'public/data.js',
    'scripts/build.js',
    'package-lock.json',
    'public/three.module.js',
    'public/mystery.js',
  ])
    assert.equal(make([file]).full, true, file);
  assert.equal(make(['tests-browser/digestion.cjs']).deploy, false);
  assert.equal(make(['public/digestion-camera.js']).validate, true);
  assert.equal(make(['public/digestion-camera.js']).deploy, false);
  graph.nodes['public/shared.js'].unknown = [{ kind: 'dynamic-import' }];
  assert.equal(make(['docs/report.md']).full, true);
  assert.equal(make(['docs/report.md']).deploy, true);
});
test('whole push range retains multiple commits, renamed/deleted dependencies and merges', (t) => {
  const f = fixture(t);
  const base = f.commit();
  f.put('public/shared.js', 'export const value=2;');
  f.commit();
  f.put('README.md', 'readme');
  const head = f.commit();
  assert.deepEqual(changesBetween(base, head, f.root).files, ['README.md', 'public/shared.js']);
  git(['mv', 'public/shared.js', 'public/renamed.js'], { root: f.root });
  const renamed = f.commit();
  assert(changesBetween(head, renamed, f.root).files.includes('public/shared.js'));
  assert.equal(planForRange({ base: head, head: renamed, root: f.root }).full, true);
  git(['checkout', '-qb', 'side', base], { root: f.root });
  f.put('docs/side.md', 'side');
  f.commit();
  git(['checkout', '-q', '-'], { root: f.root });
  git(['merge', '--no-ff', 'side', '-m', 'merge'], { root: f.root });
  const merge = git(['rev-parse', 'HEAD'], { root: f.root }).trim();
  assert(changesBetween(base, merge, f.root).files.includes('docs/side.md'));
  assert(changesBetween('0'.repeat(40), merge, f.root).uncertain);
  assert(changesBetween('--bad', merge, f.root).uncertain);
});
test('text optimization cannot mask answer correctness, IDs, function bodies or unknown content', (t) => {
  const f = fixture(t);
  f.put('public/digestion-game.js', "import './digestion-data.js';");
  f.put(
    'public/digestion-data.js',
    "export const q={id:'stable',prompt:'Old',correct:0,explanation:'Text'};",
  );
  const base = f.commit();
  f.put(
    'public/digestion-data.js',
    "export const q={id:'stable',prompt:'New',correct:0,explanation:'Text'};",
  );
  const text = f.commit();
  assert.equal(planForRange({ base, head: text, root: f.root }).fastContent, true);
  f.put(
    'public/digestion-data.js',
    "export const q={id:'changed',prompt:'New',correct:1,explanation:()=>false};",
  );
  const logic = f.commit();
  assert.equal(planForRange({ base: text, head: logic, root: f.root }).fastContent, false);
  assert(
    planForRange({ base: text, head: logic, root: f.root }).groups.includes('digestion-journeys'),
  );
});
test('every browser script is classified exactly once; all original 19 tests and oxygen tests remain covered', () => {
  const expected = readdirSync('tests-browser')
    .filter((f) => f.endsWith('.cjs'))
    .map((f) => 'tests-browser/' + f)
    .sort();
  const actual = allBrowserFiles().sort();
  assert.deepEqual(actual, expected);
  assert.equal(new Set(actual).size, actual.length);
  const functional = Object.values(GROUPS).flatMap((x) => x.files);
  for (const file of LEGACY) assert(functional.includes(file), file);
  for (const suffix of [
    'physiology',
    'visibility',
    'audio',
    'state',
    'journeys',
    'layout',
    'build',
  ])
    assert(functional.includes('oxygen-' + suffix));
});
test('full matrix covers both devices and shared V2 assertions without clock acceleration', () => {
  const tasks = tasksFor(selectGroups({ full: true }));
  for (const group of [
    'digestion-journeys',
    'digestion-audio',
    'digestion-resume',
    'oxygen-journeys',
  ]) {
    assert(tasks.some((t) => t.group === group && t.device === 'mobile'));
    assert(tasks.some((t) => t.group === group && t.device === 'desktop'));
  }
  assert(tasks.some((t) => t.group === 'digestion-resume' && t.section === 'shared'));
  for (const device of ['desktop', 'mobile'])
    for (const level of ['easy', 'medium', 'hard'])
      assert(
        tasks.some(
          (t) => t.group === 'oxygen-journeys' && t.device === device && t.level === level,
        ),
      );
  assert.deepEqual(levels(), ['easy', 'medium', 'hard']);
  assert.throws(() => tasksFor(['unknown']));
  assert.throws(() => devices('bad'));
  assert.deepEqual(devices(), [false, true]);
});
test('new syntax checker agrees with node --check for valid/invalid ESM, CJS, hashbang and top-level return', (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'syntax-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [i, source, extension] of [
    [0, 'export const x=1;', '.mjs'],
    [1, 'export const =;', '.mjs'],
    [2, 'return 1;', '.cjs'],
    [3, 'return 1;', '.mjs'],
    [4, '#!/usr/bin/env node\nmodule.exports=1;', '.cjs'],
  ]) {
    const file = path.join(root, i + extension);
    writeFileSync(file, source);
    const old = spawnSync(process.execPath, ['--check', file]);
    const fast = spawnSync(
      process.execPath,
      ['--experimental-vm-modules', 'scripts/ci/syntax-worker.cjs'],
      { input: JSON.stringify([file]) },
    );
    assert.equal(fast.status === 0, old.status === 0, source);
  }
});
test('static server supports Pages prefix and cannot expose files through encoded paths or symlinks', async (t) => {
  const f = fixture(t);
  f.put('public/index.html', 'home');
  f.put('secret.txt', 'secret');
  symlinkSync(path.join(f.root, 'secret.txt'), path.join(f.root, 'public', 'escape.txt'));
  const server = await startStaticServer({ root: path.join(f.root, 'public'), prefix: '/site/' });
  t.after(() => new Promise((r) => server.close(r)));
  assert.equal(await (await fetch(server.url)).text(), 'home');
  for (const name of ['escape.txt', '%2e%2e%2fsecret.txt', '%2Fsecret.txt'])
    assert.equal((await fetch(server.url + name)).status, 404, name);
  assert.equal((await fetch(server.url, { method: 'POST' })).status, 405);
  assert.equal((await fetch(server.url, { method: 'HEAD' })).status, 200);
});
test('browser runner propagates errors and timeouts, instead of tee hiding a failing test', async () => {
  await assert.rejects(runChild(process.execPath, ['-e', 'process.exit(7)']), /exit 7/);
  await assert.rejects(
    runChild(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { timeout: 60 }),
    /timeout true/,
  );
});
test('workflows preserve least privileges, main-only deployment, gates, immutable actions and isolated runners', () => {
  for (const file of ['pages.yml', 'regression.yml', 'validate.yml']) {
    const workflow = YAML.parse(readFileSync('.github/workflows/' + file, 'utf8'));
    assert.equal(workflow.permissions.contents, 'read');
    for (const job of Object.values(workflow.jobs))
      for (const step of job.steps || []) if (step.uses) assert.match(step.uses, /@[a-f\d]{40}$/);
  }
  const pages = YAML.parse(readFileSync('.github/workflows/pages.yml', 'utf8'));
  assert.deepEqual(pages.jobs.deploy.needs, ['build', 'prepare']);
  assert(pages.jobs.deploy.if.includes('refs/heads/main'));
  const validation = YAML.parse(readFileSync('.github/workflows/validate.yml', 'utf8'));
  assert.deepEqual(validation.jobs.gate.needs, ['plan', 'core', 'regression']);
  assert.equal(validation.jobs.regression.strategy['max-parallel'], 16);
  assert.equal(validation.jobs.regression.strategy['fail-fast'], false);
  for (const job of Object.values(validation.jobs)) assert(!job.permissions?.pages);
});
