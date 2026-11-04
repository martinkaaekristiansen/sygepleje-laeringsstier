import test from 'node:test';
import assert from 'node:assert/strict';
import { pharmacologyPath as path } from '../public/pharmacology.js';
import { validQuestions } from '../public/data.js';
import { addBuiltinPaths } from '../public/catalog.js';

test('3rd semester pharmacology contains 20 distinct sourced questions in four steps',()=>{
 assert.equal(path.semester,3); assert.equal(path.subject,'Farmakologi');
 assert.equal(path.steps.length,4);
 const questions=path.steps.flatMap(s=>s.questions);
 assert.equal(questions.length,20);
 assert.equal(new Set(questions.map(q=>q.source)).size,20);
 for(const step of path.steps){assert.equal(step.questions.length,5);assert.ok(validQuestions(step.questions))}
 assert.match(path.steps[0].text,/ikke et facit/);
});
test('new path is added without replacing existing content or duplicating on reload',()=>{
 const existing=[{id:'custom',title:'Mit indhold',steps:[]}];
 const first=addBuiltinPaths(existing,[],[path]);
 assert.equal(first.paths.length,2);assert.deepEqual(first.paths[0],existing[0]);assert.equal(existing.length,1);
 assert.equal(addBuiltinPaths(first.paths,first.installedIds,[path]).paths.length,2);
 const edited={...path,title:'Underviserens ændring'};
 assert.equal(addBuiltinPaths([edited],[],[path]).paths[0].title,'Underviserens ændring');
});
test('deleting a previously installed built-in path is respected',()=>{
 assert.deepEqual(addBuiltinPaths([], [path.id], [path]).paths,[]);
});
test('selected arithmetic answers match independent calculations',()=>{
 const questions=path.steps.flatMap(s=>s.questions);
 const expected=new Map([
 ['februar 2023 · opgave 5',`${50/2} minutter`],
 ['november 2022 · opgave 1',`${0.65*1000} ml`],
 ['november 2020 · opgave 6',`${String(25/10).replace('.',',')} mg/ml`],
 ['november 2020 · opgave 4',`${String(1/2).replace('.',',')} ml`],
 ['november 2021 · opgave 6',`${40/10} timer`],
 ['november 2020 · opgave 5',`${10*20} mg`],
 ['november 2021 · opgave 3',`${10*1000/100} mg/ml`],
 ['november 2020 · opgave 3',`${1*1000/100} mg/ml`]
 ]);
 for(const [source,value] of expected){const q=questions.find(q=>q.source.endsWith(source));assert.ok(q);assert.equal(q.a[q.correct],value)}
});
