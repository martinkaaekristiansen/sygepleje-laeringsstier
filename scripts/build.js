import {cp,mkdir,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
// All modules are checked. Content-addressed asset URLs avoid mixing releases
// from a browser cache while keeping imports relative for GitHub Pages.
const files=(await readdir('public')).sort();
const hash=createHash('sha256');
for(const file of files) {
  if(file.endsWith('.js'))execFileSync(process.execPath,['--check',`public/${file}`],{stdio:'inherit'});
  hash.update(file);hash.update(await readFile(`public/${file}`));
}
const html=await readFile('public/index.html','utf8');
if(/\b(?:src|href)=["']\/(?!\/)/.test(html))throw Error('Asset URLs must be relative for GitHub Pages.');
const assets=`assets/${hash.digest('hex').slice(0,12)}`;
await rm('dist',{recursive:true,force:true});
await mkdir(`dist/${assets}`,{recursive:true});
for(const file of files)if(file!=='index.html')await cp(`public/${file}`,`dist/${assets}/${file}`);
await writeFile('dist/index.html',html.replace(/(src|href)="\.\/([^"#]+)"/g,`$1="./${assets}/$2"`));
await writeFile('dist/.nojekyll','');
console.log(`GitHub Pages artifact ready in dist/ (${assets})`);
