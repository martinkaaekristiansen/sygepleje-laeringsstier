// Reproducible inventory of a Git tree; never removes files or rewrites history.
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { git } from './git.js';
import { trackedFiles, moduleGraph, closure } from './module-graph.js';
export function audit(ref = 'HEAD') {
  const files = trackedFiles(process.cwd(), ref),
    groups = {},
    hashes = new Map(),
    entries = [];
  let ownLines = 0;
  for (const file of files) {
    const body = git(['show', `${ref}:${file}`], { encoding: null });
    const bytes = body.length,
      sha256 = createHash('sha256').update(body).digest('hex');
    const category = /^(?:docs\/|Codex_)/.test(file)
      ? 'documentation'
      : file.startsWith('public/')
        ? 'production'
        : file.startsWith('test/')
          ? 'unit'
          : file.startsWith('tests-browser/')
            ? 'browser'
            : file.startsWith('scripts/')
              ? 'scripts'
              : file.startsWith('.github/')
                ? 'workflow'
                : 'configuration';
    const own =
      /\.(?:js|cjs|mjs|css|html|yml)$/.test(file) &&
      category !== 'documentation' &&
      !file.includes('/three.');
    const lines = own ? body.toString().split('\n').length - Number(body.at(-1) === 10) : 0;
    ownLines += lines;
    const group = (groups[category] ||= { files: 0, bytes: 0, ownLines: 0 });
    group.files++;
    group.bytes += bytes;
    group.ownLines += lines;
    entries.push({ file, bytes, sha256, category });
    if (!hashes.has(sha256)) hashes.set(sha256, []);
    hashes.get(sha256).push({ file, bytes });
  }
  const graph = moduleGraph({ ref }),
    live = closure(graph, ['public/index.html']);
  const unusedImports = [];
  for (const [file, node] of Object.entries(graph.nodes))
    if (file.startsWith('public/') && !file.includes('/three.'))
      for (const item of node.imports || [])
        for (const binding of item.specifiers)
          if (!node.identifiers[binding.local])
            unusedImports.push({ file, line: item.line, name: binding.local, source: item.source });
  return {
    ref,
    commit: git(['rev-parse', ref]).trim(),
    files: files.length,
    bytes: entries.reduce((n, f) => n + f.bytes, 0),
    ownLines,
    groups,
    duplicates: [...hashes.entries()]
      .filter(([, v]) => v.length > 1)
      .map(([sha256, files]) => ({
        sha256,
        files,
        redundantBytes: files[0].bytes * (files.length - 1),
      })),
    largest: entries.toSorted((a, b) => b.bytes - a.bytes).slice(0, 20),
    unreachablePublic: files.filter((f) => f.startsWith('public/') && !live.has(f)),
    unusedImports,
    cssDuplicates: Object.entries(graph.nodes)
      .filter(([f]) => f.startsWith('public/') && f.endsWith('.css'))
      .flatMap(([file, node]) => (node.duplicates || []).map((d) => ({ file, ...d }))),
    productionClosure: [...live].sort(),
    missing: graph.missing.filter((m) => m.from.startsWith('public/') && live.has(m.from)),
    unknownRuntime: [...live]
      .filter((f) => !f.includes('/three.') && graph.nodes[f]?.unknown?.length)
      .map((file) => ({ file, unknown: graph.nodes[file].unknown })),
    gitObjectStorage: git(['count-objects', '-vH']).trim(),
  };
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  console.log(JSON.stringify(audit(process.argv[2] || 'HEAD'), null, 2));
