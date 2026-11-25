import path from 'node:path';
import { readFileSync } from 'node:fs';
import { git } from './git.js';
const plan = JSON.parse(readFileSync(process.argv[2] || 'artifacts/change-plan.json', 'utf8'));
const head = plan.head,
  files = new Set(git(['ls-tree', '-rz', '--name-only', head]).split('\0').filter(Boolean));
let checked = 0;
for (const file of plan.documentation.filter((f) => f.endsWith('.md') && files.has(f))) {
  const source = git(['show', `${head}:${file}`]);
  if (/^(?:<{7}|={7}|>{7})(?: |$)/m.test(source)) throw Error('Merge markers in ' + file);
  for (const match of source.matchAll(/\[[^\]]*\]\(<?([^\s)>]+)>?(?:\s+"[^"]*")?\)/g)) {
    const url = match[1];
    if (/^(?:[a-z][\w+.-]*:|\/|#)/i.test(url)) continue;
    const dest = path.posix.normalize(
      path.posix.join(path.posix.dirname(file), decodeURIComponent(url.split('#')[0])),
    );
    if (!files.has(dest) && ![...files].some((f) => f.startsWith(dest.replace(/\/$/, '') + '/')))
      throw Error(`Broken relative documentation link: ${file} -> ${dest}`);
  }
  checked++;
}
console.log(
  `Documentation checked from Git objects: ${checked} changed Markdown files; no deployment needed for documentation alone.`,
);
