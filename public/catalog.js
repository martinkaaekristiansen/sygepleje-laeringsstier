// Add new built-in learning paths once, preserving local edits and deletions.
export function addBuiltinPaths(paths, installedIds, builtins) {
  const next = [...paths];
  const installed = new Set(installedIds);
  let changed = false;
  for (const path of builtins) {
    if (installed.has(path.id)) continue;
    if (!next.some(existing => existing.id === path.id)) next.push(structuredClone(path));
    installed.add(path.id);
    changed = true;
  }
  return { paths: next, installedIds: [...installed], changed };
}
