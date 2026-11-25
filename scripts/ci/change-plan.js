import { readFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { git, validSHA } from './git.js';
import {
  moduleGraph,
  trackedFiles,
  closure,
  impactedGames,
  readSource,
  walk,
} from './module-graph.js';
import { parse } from 'acorn';
import { selectGroups } from './test-registry.js';
import { TEST_ONLY_PUBLIC_MODULES } from './production-policy.js';
import { tasksFor } from './browser-tasks.js';

const CORE =
  /^(?:public\/(?:app|model|storage|backup|data|content-version|builtin-baselines)\.js|package(?:-lock)?\.json|vendor-manifest\.json|server\.js|\.github\/|scripts\/)/;
const CONTENT =
  /^public\/(?:pharmacology|semester5|blood-routes|digestion-data|digestion-learning|digestion-question-pools|digestion-assessment|oxygen-data)\.js$/;
const TEXT_KEYS = new Set([
  'text',
  'name',
  'title',
  'label',
  'description',
  'prompt',
  'why',
  'note',
  'explanation',
  'explanations',
  'guide',
  'source',
  'danish',
  'latin',
]);
function fingerprint(source, filename, ignoreText) {
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  if (ignoreText)
    walk(ast, (node) => {
      if (node.type === 'Property' && TEXT_KEYS.has(node.key.name || node.key.value)) {
        const values = node.value.type === 'ArrayExpression' ? node.value.elements : [node.value];
        if (values.every((v) => v?.type === 'Literal' && typeof v.value === 'string'))
          for (const v of values) {
            v.value = '<text>';
            delete v.raw;
          }
      }
    });
  return createHash('sha256')
    .update(
      JSON.stringify(ast, (key, value) =>
        ['start', 'end', 'loc', 'raw'].includes(key)
          ? undefined
          : typeof value === 'bigint'
            ? String(value)
            : value,
      ),
    )
    .digest('hex');
}
export function changesBetween(base, head, root = process.cwd()) {
  if (!validSHA(base) || !validSHA(head))
    return { files: [], uncertain: true, reason: 'missing-or-initial-base' };
  try {
    git(['merge-base', '--is-ancestor', base, head], { root });
    return {
      files: git(['diff', '--no-renames', '--name-only', '-z', base, head], { root })
        .split('\0')
        .filter(Boolean),
      uncertain: false,
    };
  } catch {
    return { files: [], uncertain: true, reason: 'base-unavailable-or-not-ancestor' };
  }
}
export function createPlan({
  files,
  before,
  after,
  forceFull = false,
  uncertain = false,
  textOnly = [],
}) {
  const runtimeBefore = closure(before, ['public/index.html']),
    runtimeAfter = closure(after, ['public/index.html']);
  const reasons = [],
    domains = new Set();
  let deploy = false,
    full = forceFull || uncertain,
    layout = false,
    allJSBenign = true;
  if (forceFull) reasons.push('explicit-full-regression');
  if (uncertain) {
    reasons.push('uncertain-diff');
    deploy = true;
  }
  const unknownRuntime = [before, after].some((graph) =>
    [...closure(graph, ['public/index.html'])].some(
      (file) =>
        !file.includes('/three.') &&
        graph.nodes[file]?.unknown?.some((r) =>
          ['dynamic-import', 'require', 'worker', 'fetch'].includes(r.kind),
        ),
    ),
  );
  if (files.length && unknownRuntime) {
    full = true;
    deploy = true;
    reasons.push('unresolved-runtime-loading');
  }
  for (const file of files) {
    const runtime = runtimeBefore.has(file) || runtimeAfter.has(file);
    if (CORE.test(file)) {
      full = true;
      deploy = true;
      reasons.push('core-or-build:' + file);
      continue;
    }
    if (
      !runtime &&
      !file.startsWith('public/') &&
      (/^(?:docs\/|Codex_)/.test(file) ||
        /(?:^|\/)README[^/]*$|\.(?:md|png|jpe?g|mp4|webm|zip|docx|pdf)$/i.test(file))
    ) {
      reasons.push('non-runtime-documentation:' + file);
      continue;
    }
    if (file.startsWith('test/')) {
      full = true;
      reasons.push('unit-tests:' + file);
      continue;
    }
    if (file.startsWith('tests-browser/')) {
      full = true;
      reasons.push('browser-test-code:' + file);
      continue;
    }
    if (TEST_ONLY_PUBLIC_MODULES[file] && !runtime) {
      reasons.push('retained-test-only-module:' + file);
      continue;
    }
    if (!file.startsWith('public/')) {
      full = true;
      deploy = true;
      reasons.push('unclassified:' + file);
      continue;
    }
    deploy = true;
    if (textOnly.includes(file)) {
      reasons.push('ast-confirmed-text-or-comments:' + file);
      continue;
    }
    allJSBenign = false;
    if (file.endsWith('.css')) {
      layout = true;
      reasons.push('layout:' + file);
      continue;
    }
    const affected = new Set([...impactedGames(before, [file]), ...impactedGames(after, [file])]);
    for (const d of affected) domains.add(d);
    if (file.includes('/three.') || !affected.size || !runtime) {
      full = true;
      reasons.push('shared-vendor-or-unknown:' + file);
    } else reasons.push('transitive-game-dependencies:' + file + ':' + [...affected].join(','));
  }
  // Mixed CSS and logic must retain the union, rather than narrowing to layout.
  const groups = [
    ...new Set([
      ...selectGroups({ full, domains: [...domains] }),
      ...(layout ? selectGroups({ layout: true }) : []),
    ]),
  ];
  const validate =
    forceFull ||
    uncertain ||
    deploy ||
    files.some((f) => TEST_ONLY_PUBLIC_MODULES[f]) ||
    files.some((f) => /^(?:test|tests-browser|scripts)\//.test(f));
  return {
    version: 1,
    files,
    reasons,
    deploy,
    validate,
    full,
    layout,
    domains: [...domains],
    groups,
    documentation: files.filter(
      (f) => /\.(?:md|html|json)$/i.test(f) || /^(?:docs\/|Codex_)/.test(f),
    ),
    fastContent: deploy && !full && !layout && allJSBenign,
  };
}
export function planForRange({ base, head, root = process.cwd(), forceFull = false }) {
  const diff = changesBetween(base, head, root);
  const getGraph = (ref) =>
    moduleGraph({
      root,
      ref,
      files: trackedFiles(root, ref).filter((p) => p.startsWith('public/')),
    });
  const after = getGraph(head);
  let before = after;
  if (!diff.uncertain) before = getGraph(base);
  const textOnly = [];
  if (!diff.uncertain)
    for (const file of diff.files.filter((f) => f.startsWith('public/') && f.endsWith('.js'))) {
      try {
        const a = readSource(file, { root, ref: base }),
          b = readSource(file, { root, ref: head });
        if (
          fingerprint(a, file, false) === fingerprint(b, file, false) ||
          (CONTENT.test(file) && fingerprint(a, file, true) === fingerprint(b, file, true))
        )
          textOnly.push(file);
      } catch {
        /* A new/deleted/unparseable module must use the full path. */
      }
    }
  return { base, head, ...createPlan({ ...diff, before, after, forceFull, textOnly }) };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const event = process.env.GITHUB_EVENT_PATH
    ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH))
    : {};
  const head =
    process.env.CI_HEAD_SHA || process.env.GITHUB_SHA || git(['rev-parse', 'HEAD']).trim();
  const base = process.env.CI_BASE_SHA || event.pull_request?.base?.sha || event.before;
  const forceFull =
    process.env.CI_FORCE_FULL === 'true' ||
    ['schedule', 'workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME);
  if (!validSHA(head)) throw Error('Invalid head commit');
  const plan = planForRange({ base, head, forceFull });
  console.log(JSON.stringify(plan, null, 2));
  const extras = (process.env.CI_EXTRAS || '').split(',').filter(Boolean);
  const tasks = tasksFor(plan.groups, extras);
  if (process.env.GITHUB_OUTPUT)
    for (const [key, value] of Object.entries({
      deploy: plan.deploy,
      validate: plan.validate,
      full: plan.full,
      matrix: JSON.stringify({ include: tasks }),
      task_count: tasks.length,
    }))
      appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
}
