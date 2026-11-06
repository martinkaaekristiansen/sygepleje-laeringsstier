import test from 'node:test';
import assert from 'node:assert/strict';
import {builtins,emptyState,migrateLegacy,normalizePath,commitPath,validateState,updatesFor,acceptUpdate,newStep} from '../public/model.js';
import {getPathProgress} from '../public/progress.js';

test('legacy migration preserves content, indexed completion and reflections with stable IDs',()=>{
  const original=structuredClone(builtins[0]);delete original.contentVersion;
  for(const s of original.steps){delete s.id;for(const q of s.questions){delete q.id;delete q.optionIds;}}
  original.title='Min lokale udgave';
  const raw={paths:JSON.stringify([original]),progress:JSON.stringify({[original.id]:{done:[0,2],last:2,notes:{2:'Mine refleksioner'}}}),installed:null};
  const state=migrateLegacy(raw),p=state.paths[0],record=state.progress[p.id];
  assert.equal(p.title,original.title);assert.deepEqual(record.done,[p.steps[0].id,p.steps[2].id]);assert.equal(record.notes[p.steps[2].id],'Mine refleksioner');assert.equal(record.last,p.steps[2].id);
  assert.equal(state.paths.length,builtins.length);assert.equal(validateState(state),true);assert.deepEqual(migrateLegacy(raw),state);
});
test('malformed legacy storage is not silently replaced',()=>{
  for(const raw of ['{}','null','[{}]','bad'])assert.throws(()=>migrateLegacy({paths:raw,progress:null,installed:null}));
  const state=emptyState();state.schemaVersion=999;assert.equal(validateState(state),false);
});
test('deleted builtins stay deleted and local editions are not overwritten',()=>{
  const state=migrateLegacy({paths:'[]',progress:'{}',installed:JSON.stringify(builtins.map(p=>p.id))});assert.equal(state.paths.length,0);assert.ok(validateState(state));
});
test('reorder and title edits preserve progression; content edits invalidate only changed steps',()=>{
  const state=emptyState(),p=state.paths[0],ids=p.steps.map(s=>s.id);
  state.progress[p.id]={done:ids.slice(0,3),last:ids[1],notes:{[ids[1]]:'Bevar mig'},answers:{}};
  const edit=structuredClone(p);edit.steps.reverse();edit.title='Ny titel';
  const moved=commitPath(state,edit);assert.deepEqual(moved.progress[p.id],state.progress[p.id]);assert.equal(getPathProgress(moved.paths[0],moved.progress[p.id]).percent,75);
  edit.steps.find(s=>s.id===ids[1]).text+=' Ny faglig viden';
  const changed=commitPath(moved,edit);assert.deepEqual(changed.progress[p.id].done,[ids[0],ids[2]]);assert.equal(changed.progress[p.id].notes[ids[1]],'Bevar mig');assert.equal(changed.paths[0].contentVersion,3);
  const noop=commitPath(changed,changed.paths[0]);assert.equal(noop.paths[0].contentVersion,3);
});
test('reordering questions and options preserves the correct option and completion',()=>{
  const state=emptyState(),p=state.paths[1],s=p.steps[0];state.progress[p.id]={done:[s.id],last:s.id,notes:{},answers:{[s.id]:{[s.questions[0].id]:s.questions[0].optionIds[0]}}};
  const edit=structuredClone(p),q=edit.steps[0].questions[0],correct=q.optionIds[q.correct];
  q.a.reverse();q.optionIds.reverse();q.correct=q.optionIds.indexOf(correct);edit.steps[0].questions.reverse();
  assert.deepEqual(commitPath(state,edit).progress[p.id],state.progress[p.id]);
});
test('updates keep the local edition with notes and quiz responses as a separate copy',()=>{
  const state=emptyState(),p=state.paths[1],s=p.steps[0],q=s.questions[0];
  p.title='Mit indhold';state.progress[p.id]={done:[s.id],last:s.id,notes:{[s.id]:'Note'},answers:{[s.id]:{[q.id]:q.optionIds[q.correct]}}};
  const update={...structuredClone(builtins[1]),builtinVersion:2};assert.equal(updatesFor(state,[update]).length,1);
  const next=acceptUpdate(state,update),copy=next.paths.find(p=>p.title==='Mit indhold (min tidligere udgave)');assert.ok(copy);assert.ok(validateState(next));
  const record=next.progress[copy.id];assert.equal(record.notes[copy.steps[0].id],'Note');assert.equal(record.answers[copy.steps[0].id][copy.steps[0].questions[0].id],copy.steps[0].questions[0].optionIds[q.correct]);assert.equal(next.progress[update.id],undefined);
});
test('new imports have independent IDs and incomplete drafts remain valid',()=>{
  const p=normalizePath(builtins[0],true);assert.notEqual(p.id,builtins[0].id);assert.notEqual(p.steps[0].id,builtins[0].steps[0].id);
  const state=emptyState(),draft={id:'draft',title:'',description:'',semester:1,subject:'Sygepleje',steps:[newStep('quiz')]};state.drafts[draft.id]={path:draft,selected:draft.steps[0].id};assert.ok(validateState(state));
});
test('orphaned legacy progress is retained without blocking migration',()=>{
  const state=migrateLegacy({paths:null,installed:null,progress:JSON.stringify({removed:{done:[0],last:1,notes:{0:'Arkiveret'}}})});
  assert.ok(validateState(state));assert.equal(state.progress.removed.legacy.notes[0],'Arkiveret');
});
test('malformed backups and unsafe draft structure are rejected without crashing',()=>{
  for(const value of [null,{},[],{schemaVersion:2}, {...emptyState(),paths:[null]}])assert.equal(validateState(value),false);
  const state=emptyState(),path={id:'draft',title:'',description:'',semester:1,subject:'Sygepleje',steps:[newStep('text')]};
  path.steps[0].image={bad:true};state.drafts.draft={path};assert.equal(validateState(state),false);
});

test('retired first-semester path disappears from old devices and backups without changing other progress',async()=>{
  const {removeRetiredPaths,addNewBuiltins}=await import('../public/model.js');
  const state=emptyState(),path=state.paths[0],old={...structuredClone(path),id:'fordoejelse',semester:1,builtinId:'fordoejelse'};
  state.paths.push(old);state.drafts[old.id]={path:old};state.installed.push(old.id);
  state.progress[path.id]={done:[path.steps[0].id],last:path.steps[1].id,notes:{[path.steps[1].id]:'Bevar refleksion'},answers:{}};
  const next=addNewBuiltins(state);
  assert.ok(validateState(next));assert.ok(!next.paths.some(p=>p.id===old.id));assert.equal(next.drafts[old.id],undefined);
  assert.deepEqual(next.progress,state.progress);assert.deepEqual(next.paths,state.paths.slice(0,builtins.length));assert.deepEqual(removeRetiredPaths(next),next);
  assert.ok(!emptyState().paths.some(p=>p.id==='fordoejelse'));
  const legacy=migrateLegacy({paths:JSON.stringify([old,...state.paths.slice(0,builtins.length)]),progress:'{}',installed:JSON.stringify(state.installed)});
  assert.ok(!legacy.paths.some(p=>p.id===old.id));assert.equal(legacy.paths.length,builtins.length);
});
