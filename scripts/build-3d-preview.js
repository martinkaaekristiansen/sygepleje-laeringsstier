import './build-preview.js';
import {readFile,writeFile} from 'node:fs/promises';
const file='artifacts/blodcellens-rejse.html';
const html=(await readFile(file,'utf8')).replace("import 'preview:app.js';", "location.hash='#/blodcelle-3d'; import('preview:app.js');");
await writeFile('artifacts/blodcellens-rejse-3d.html',html);
console.log('3D review copy ready: artifacts/blodcellens-rejse-3d.html');
