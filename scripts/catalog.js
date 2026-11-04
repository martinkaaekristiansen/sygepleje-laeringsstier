import {readdir,readFile} from 'node:fs/promises';
import {validateDocument} from '../public/publication.js';
export async function buildCatalog(directory='content/paths') {
  const files=(await readdir(directory)).filter(name=>name.endsWith('.json')).sort();
  const entries=[];
  for(const file of files) {
    const doc=JSON.parse(await readFile(`${directory}/${file}`,'utf8'));await validateDocument(doc);
    if(file!==`${doc.path.id}.json`)throw Error(`Udgivelsesfilen har forkert navn: ${file}`);
    entries.push(doc);
  }
  return {format:'laeringsstier-catalog-v1',entries};
}
