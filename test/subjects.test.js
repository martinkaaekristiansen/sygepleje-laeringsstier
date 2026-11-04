import test from 'node:test';
import assert from 'node:assert/strict';
import {ALL_SUBJECTS,pathSubjects,uniqueSubjects,semesterSubjects,filterPaths,editorSubjects} from '../public/subjects.js';
import {emptyState,normalizePath,pathErrors,commitPath,validateState} from '../public/model.js';
import {renderHome} from '../public/home.js';

test('one path appears once in all selected subjects on its semester',()=>{
  const paths=[{id:'multi',semester:4,subjects:['Sygepleje','Farmakologi','Kommunikation']},{id:'other',semester:5,subject:'Etik'}];
  for(const subject of paths[0].subjects)assert.deepEqual(filterPaths(paths,4,subject).map(p=>p.id),['multi']);
  assert.equal(filterPaths(paths,4,ALL_SUBJECTS).length,1);
  assert.equal(filterPaths(paths,5,'Kommunikation').length,0);
  assert.ok(semesterSubjects(paths,4).includes('Kommunikation'));
  assert.ok(!semesterSubjects(paths,5).includes('Kommunikation'));
  assert.ok(editorSubjects(paths).includes('Kommunikation'));
  assert.ok(!semesterSubjects(paths.filter(p=>p.id!=='multi'),4).includes('Kommunikation'));
});
test('names normalize spaces and case, keep Danish letters, and treat old subject as one selection',()=>{
  assert.deepEqual(pathSubjects({subject:'Sygepleje'}),['Sygepleje']);
  assert.deepEqual(uniqueSubjects([' Farmakologi ','farmakologi','Klinisk   kommunikation','klinisk kommunikation','Ernæring','Ernæring']),['Farmakologi','Klinisk kommunikation','Ernæring']);
  assert.deepEqual(pathSubjects({subject:'Sygepleje',subjects:[]}),[]);
});
test('multiple subjects and custom subjects preserve legacy data and existing progress',()=>{
  const state=emptyState(),old=state.paths[0];delete old.subjects;
  state.progress[old.id]={done:[old.steps[0].id],last:old.steps[0].id,notes:{[old.steps[0].id]:'Bevar'},answers:{}};
  assert.ok(validateState(state));
  const edited={...old,subjects:['Sygepleje','Etik']};
  const saved=commitPath(state,edited);
  assert.ok(validateState(saved));assert.deepEqual(saved.progress,state.progress);
  assert.deepEqual(saved.paths[0].subjects,['Sygepleje','Etik']);assert.equal(saved.paths[0].subject,'Sygepleje');
  assert.equal(normalizePath(old).steps[0].id,old.steps[0].id);
});
test('blank selection is allowed in autosaved drafts, but required before saving a path',()=>{
  const state=emptyState(),p={...structuredClone(state.paths[0]),subjects:[],subject:''};
  state.drafts[p.id]={path:p};assert.ok(validateState(state));assert.ok(pathErrors(p).some(e=>e.includes('mindst ét fag')));
  for(const subjects of [[''],['Alle fagområder'],['x'.repeat(81)],[null],'Etik'])assert.ok(pathErrors({...p,subjects}).length);
  assert.equal(pathErrors({...p,subjects:['Etik']}).length,0);
});
test('custom subject names are escaped in student labels and filter buttons',()=>{
  const p={...emptyState().paths[0],subjects:['<img src=x onerror=alert(1)>']};
  const html=renderHome({paths:[p],progress:{},semester:1,subject:ALL_SUBJECTS});
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
});

test('student filters hide all unused subjects, including default subjects',()=>{
  const paths=[{semester:1,subject:'Anatomi og fysiologi'},{semester:3,subject:'Farmakologi'}];
  assert.deepEqual(semesterSubjects(paths,1),[ALL_SUBJECTS,'Anatomi og fysiologi']);
  assert.deepEqual(semesterSubjects(paths,2),[ALL_SUBJECTS]);
  assert.deepEqual(semesterSubjects(paths,3),[ALL_SUBJECTS,'Farmakologi']);
  assert.ok(editorSubjects(paths).includes('Mikrobiologi'));
});
