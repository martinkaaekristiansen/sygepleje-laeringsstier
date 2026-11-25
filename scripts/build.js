import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { checkSyntax } from './ci/check-syntax.js';
import { moduleGraph, closure } from './ci/module-graph.js';
import { TEST_ONLY_PUBLIC_MODULES } from './ci/production-policy.js';

// Build-time tools only: the published application has no npm runtime.
const vendor = JSON.parse(await readFile('vendor-manifest.json', 'utf8'));
for (const [file, expected] of Object.entries(vendor.sha256)) {
  const actual = createHash('sha256')
    .update(await readFile(`public/${file}`))
    .digest('hex');
  if (actual !== expected)
    throw Error(
      `Unexpected vendor file: ${file}. Review version, license and manifest before release.`,
    );
}
const all = (await readdir('public')).sort();
checkSyntax(all.filter((f) => f.endsWith('.js')).map((f) => 'public/' + f));
const graph = moduleGraph({ files: all.map((f) => 'public/' + f) });
const live = closure(graph, ['public/index.html']);
const missing = graph.missing.filter((r) => live.has(r.from));
if (missing.length) throw Error('Missing runtime dependencies: ' + JSON.stringify(missing));
const uncertain = [...live].some(
  (f) =>
    !f.includes('/three.') &&
    graph.nodes[f]?.unknown?.some((r) =>
      ['dynamic-import', 'require', 'worker', 'fetch'].includes(r.kind),
    ),
);
const excluded = all.filter(
  (f) => !uncertain && TEST_ONLY_PUBLIC_MODULES['public/' + f] && !live.has('public/' + f),
);
const files = all.filter((f) => !excluded.includes(f));
const hash = createHash('sha256');
let bytes = 0;
for (const file of files) {
  const data = await readFile(`public/${file}`);
  hash.update(file);
  hash.update(data);
  bytes += data.length;
}
const html = await readFile('public/index.html', 'utf8');
if (/\b(?:src|href)=["']\/(?!\/)/.test(html))
  throw Error('Asset URLs must be relative for GitHub Pages.');
const assets = `assets/${hash.digest('hex').slice(0, 12)}`;
await rm('dist', { recursive: true, force: true });
await mkdir(`dist/${assets}`, { recursive: true });
for (const file of files)
  if (file !== 'index.html') await cp(`public/${file}`, `dist/${assets}/${file}`);
await writeFile(
  'dist/index.html',
  html.replace(/(src|href)="\.\/([^"#]+)"/g, `$1="./${assets}/$2"`),
);
await writeFile('dist/.nojekyll', '');
await mkdir('artifacts', { recursive: true });
await writeFile(
  'artifacts/build-manifest.json',
  JSON.stringify(
    {
      assets,
      files,
      bytes,
      excluded,
      conservativeCopyAll: uncertain,
      vendorVerified: Object.keys(vendor.sha256),
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `GitHub Pages artifact ready in dist/ (${assets}; ${files.length} source files; ${bytes} bytes; test-only omissions: ${excluded.length})`,
);
