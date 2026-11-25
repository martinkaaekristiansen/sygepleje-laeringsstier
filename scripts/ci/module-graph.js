import { readFileSync } from 'node:fs';
import path from 'node:path';
import { git } from './git.js';
import { parse } from 'acorn';
import postcss from 'postcss';

export function walk(node, visit, parent = null, key = '') {
  if (!node || typeof node !== 'object') return;
  if (node.type) visit(node, parent, key);
  for (const [k, value] of Object.entries(node)) {
    if (k === 'loc') continue;
    if (Array.isArray(value)) value.forEach((v) => walk(v, visit, node, k));
    else if (value && typeof value === 'object') walk(value, visit, node, k);
  }
}
export function literal(node) {
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node?.type === 'TemplateLiteral' && !node.expressions.length)
    return node.quasis[0].value.cooked;
  if (node?.type === 'NewExpression' && node.callee.name === 'URL')
    return literal(node.arguments[0]);
  return null;
}
export function inspectJS(source, filename) {
  const ast = parse(source, {
    ecmaVersion: 'latest',
    sourceType: filename.endsWith('.cjs') ? 'script' : 'module',
    locations: true,
    allowHashBang: true,
  });
  const references = [],
    imports = [],
    exports = [],
    identifiers = new Map(),
    unknown = [];
  const add = (node, value, kind) => {
    if (value !== null) references.push({ value, kind, line: node.loc.start.line });
    else unknown.push({ kind, line: node.loc.start.line });
  };
  walk(ast, (node, parent, key) => {
    if (node.type === 'ImportDeclaration') {
      add(node, node.source.value, 'import');
      imports.push({
        source: node.source.value,
        line: node.loc.start.line,
        start: node.start,
        end: node.end,
        specifiers: node.specifiers.map((s) => ({
          local: s.local.name,
          imported: s.imported?.name || (s.type === 'ImportDefaultSpecifier' ? 'default' : '*'),
          start: s.start,
          end: s.end,
        })),
      });
    }
    if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') {
      if (node.source) add(node, node.source.value, 'reexport');
      const d = node.declaration;
      if (d?.id) exports.push({ name: d.id.name, line: node.loc.start.line });
      for (const v of d?.declarations || [])
        if (v.id.type === 'Identifier')
          exports.push({ name: v.id.name, line: node.loc.start.line });
      for (const s of node.specifiers || [])
        exports.push({ name: s.exported.name, line: node.loc.start.line });
    }
    if (node.type === 'ExportDefaultDeclaration')
      exports.push({ name: 'default', line: node.loc.start.line });
    if (node.type === 'ImportExpression') add(node, literal(node.source), 'dynamic-import');
    if (
      node.type === 'CallExpression' &&
      node.callee.type === 'Identifier' &&
      node.callee.name === 'require'
    )
      add(node, literal(node.arguments[0]), 'require');
    if (
      node.type === 'CallExpression' &&
      node.callee.type === 'Identifier' &&
      node.callee.name === 'fetch'
    )
      add(node, literal(node.arguments[0]), 'fetch');
    if (node.type === 'NewExpression' && node.callee.name === 'URL')
      add(node, literal(node.arguments[0]), 'url');
    if (node.type === 'NewExpression' && node.callee.name === 'Worker')
      add(node, literal(node.arguments[0]), 'worker');
    if (node.type === 'Identifier') {
      if (parent?.type.startsWith('Import')) return;
      if (
        (parent?.type === 'MemberExpression' || parent?.type === 'Property') &&
        key === 'property' &&
        !parent.computed
      )
        return;
      if (parent?.type === 'Property' && key === 'key' && !parent.computed && !parent.shorthand)
        return;
      if (
        (parent?.type === 'VariableDeclarator' && key === 'id') ||
        (/Function/.test(parent?.type || '') && (key === 'id' || key === 'params'))
      )
        return;
      identifiers.set(node.name, (identifiers.get(node.name) || 0) + 1);
    }
  });
  return { references, imports, exports, identifiers: Object.fromEntries(identifiers), unknown };
}
export function inspectCSS(source) {
  const root = postcss.parse(source),
    references = [],
    duplicates = [],
    seen = new Map();
  root.walkDecls((decl) => {
    for (const m of decl.value.matchAll(/url\(\s*['"]?([^'"\)\s]+)['"]?\s*\)/g))
      references.push({ value: m[1], kind: 'css-url', line: decl.source.start.line });
  });
  root.walkAtRules('import', (rule) => {
    const m = rule.params.match(/^(?:url\()?['"]([^'"]+)/);
    if (m) references.push({ value: m[1], kind: 'css-import', line: rule.source.start.line });
  });
  root.walkRules((rule) => {
    if (rule.nodes.some((n) => n.type !== 'decl' && n.type !== 'comment')) return;
    const parents = [];
    for (let p = rule.parent; p?.type !== 'root'; p = p.parent)
      parents.unshift(p.name + ':' + p.params);
    const key = JSON.stringify([
      parents,
      rule.selector,
      rule.nodes.filter((n) => n.type === 'decl').map((n) => [n.prop, n.value, !!n.important]),
    ]);
    if (seen.has(key))
      duplicates.push({
        earlier: seen.get(key),
        later: rule.source.start.line,
        selector: rule.selector,
        start: rule.source.start.offset,
        end: rule.source.end.offset + 1,
      });
    seen.set(key, rule.source.start.line);
  });
  return { references, duplicates };
}
export function trackedFiles(root = process.cwd(), ref = null) {
  return git(ref ? ['ls-tree', '-rz', '--name-only', ref] : ['ls-files', '-z'], { root })
    .split('\0')
    .filter(Boolean);
}
export function readSource(file, { root = process.cwd(), ref = null } = {}) {
  return ref
    ? git(['show', `${ref}:${file}`], { root })
    : readFileSync(path.join(root, file), 'utf8');
}
export function moduleGraph({ root = process.cwd(), ref = null, files = null } = {}) {
  const names = files || trackedFiles(root, ref),
    available = new Set(names),
    nodes = {},
    missing = [];
  const resolve = (from, spec) => {
    if (!spec || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(spec)) return null;
    const clean = spec.split(/[?#]/)[0];
    if (!clean || (!clean.startsWith('.') && !clean.startsWith('/') && !/\.[a-z\d]+$/i.test(clean)))
      return null;
    const target = path.posix.normalize(
      clean.startsWith('/') ? clean.slice(1) : path.posix.join(path.posix.dirname(from), clean),
    );
    if (available.has(target)) return target;
    // Browser fixtures resolve new URL('module.js', the built entrypoint URL).
    if (!from.startsWith('public/') && available.has('public/' + clean)) return 'public/' + clean;
    return target;
  };
  for (const file of names.filter(
    (n) => /\.(js|cjs|css|html)$/.test(n) && /^(public|scripts|test|tests-browser)\//.test(n),
  )) {
    const source = readSource(file, { root, ref });
    let info;
    if (/\.(js|cjs)$/.test(file)) info = inspectJS(source, file);
    else if (file.endsWith('.css')) info = inspectCSS(source);
    else
      info = {
        references: [...source.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)].map((m) => ({
          value: m[1],
          kind: 'html',
          line: source.slice(0, m.index).split('\n').length,
        })),
      };
    const dependencies = [];
    for (const item of info.references) {
      const target = resolve(file, item.value);
      if (target) {
        dependencies.push(target);
        if (!available.has(target)) missing.push({ from: file, target, ...item });
      }
    }
    nodes[file] = { ...info, dependencies: [...new Set(dependencies)] };
  }
  return { nodes, missing, files: names };
}
export function closure(graph, starts) {
  const result = new Set(),
    todo = [...starts];
  while (todo.length) {
    const file = todo.pop();
    if (result.has(file)) continue;
    result.add(file);
    todo.push(...(graph.nodes[file]?.dependencies || []));
  }
  return result;
}
export const GAME_ROOTS = {
  digestion: ['public/digestion-game.js'],
  blood: ['public/blood-game.js'],
  oxygen: ['public/oxygen-game.js'],
};
export function impactedGames(graph, changed) {
  return Object.entries(GAME_ROOTS)
    .filter(([, roots]) => [...closure(graph, roots)].some((f) => changed.includes(f)))
    .map(([name]) => name);
}
