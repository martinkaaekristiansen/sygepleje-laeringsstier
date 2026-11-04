import test from 'node:test';
import assert from 'node:assert/strict';
import { semester5Path as path } from '../public/semester5.js';
import { pharmacologyPath } from '../public/pharmacology.js';
import { validQuestions } from '../public/data.js';
import { addBuiltinPaths } from '../public/catalog.js';

test('semester 5 has twelve integrated steps with 36 valid questions and reflection guidance',()=>{
 assert.equal(path.semester,5);assert.equal(path.subject,'Sygepleje');assert.equal(path.durationMinutes,120);
 assert.equal(path.steps.length,12);
 const questions=path.steps.flatMap(s=>s.questions);
 assert.equal(questions.length,36);assert.equal(new Set(questions.map(q=>q.q)).size,36);
 for(const step of path.steps){assert.equal(step.type,'reflection');assert.ok(step.guide.length>100);assert.ok(step.curriculumSource);assert.equal(step.questions.length,3);assert.ok(validQuestions(step.questions));for(const q of step.questions)assert.match(q.source,/Semesterbeskrivelse E26/)}
});
test('all four curriculum themes and the research/implementation progression are represented',()=>{
 const content=path.steps.map(s=>s.title+' '+s.text).join('\n');
 for(const term of ['Tema 1','Tema 2','Tema 3','Tema 4','akut koronart','infektion','barn','Folkesundhed','Sociologi','genetik','Farmakologi','Etik','IMRaD','kvalitetsforbedring'])assert.ok(content.toLowerCase().includes(term.toLowerCase()),term);
});
test('adding semester 5 preserves previously edited pharmacology and does not reinstall deleted paths',()=>{
 const edited={...pharmacologyPath,title:'Min egen version'};
 const result=addBuiltinPaths([edited],[pharmacologyPath.id],[pharmacologyPath,path]);
 assert.equal(result.paths.length,2);assert.equal(result.paths[0].title,'Min egen version');assert.equal(result.paths[1].id,path.id);
 assert.equal(addBuiltinPaths(result.paths,result.installedIds,[pharmacologyPath,path]).paths.length,2);
 assert.deepEqual(addBuiltinPaths([edited],result.installedIds,[pharmacologyPath,path]).paths,[edited]);
});
