// A self-contained, offline review copy. It does not publish or contact a server.
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
const files=await readdir('public'),imports={};
for(const file of files.filter(f=>f.endsWith('.js'))) {
 const source=(await readFile(`public/${file}`,'utf8')).replace(/(['"])\.\/([^'"]+\.js)\1/g,(_,quote,name)=>`${quote}preview:${name}${quote}`);
 imports[`preview:${file}`]=`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
}
let html=await readFile('public/index.html','utf8');
for(const file of files.filter(f=>f.endsWith('.css')))html=html.replace(`<link rel="stylesheet" href="./${file}">`,`<style>${await readFile(`public/${file}`,'utf8')}</style>`);
html=html.replace('<script type="module" src="./app.js"></script>',`<script type="importmap">${JSON.stringify({imports})}</script><script type="module">import 'preview:app.js';</script>`);
// Carry the complete upstream MIT notice in the standalone distribution too.
html=html.replace('</head>',`<!-- Three.js license\n${await readFile('public/three-LICENSE.txt','utf8')}\n-->\n</head>`);
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/blodcellens-rejse.html',html);
console.log('Offline review copy ready: artifacts/blodcellens-rejse.html');
