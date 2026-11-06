import test from 'node:test';
import assert from 'node:assert/strict';
import {BLOOD_LEVELS,routeFor,uniqueRoute,CIRCULATION_ID,circulationPath,circuitFor} from '../public/circulation-data.js';
import {newDraft,assess,saveResult,accepts,validCirculation,shuffle} from '../public/circulation-engine.js';
import {emptyState,validateState,addNewBuiltins} from '../public/model.js';
import {getPathProgress} from '../public/progress.js';
import {POSITIONS} from '../public/circulation-labels.js';
import {examView} from '../public/circulation-exam.js';
import {moveCard} from '../public/circulation-order.js';
for(const level of Object.keys(BLOOD_LEVELS))test(`${level}: four activities reuse original routes and score independently`,()=>{
 assert.equal(routeFor(level),BLOOD_LEVELS[level].steps);
 const record={done:[],notes:{},answers:{}},route=routeFor(level);
 for(const activity of ['order','labels','context','exam']){
  const d=newDraft(level,activity);assert.equal(getPathProgress(circulationPath,record).complete,false);
  if(activity==='order'){assert.notDeepEqual(d.answers,route.map((_,i)=>i));d.answers=route.map((_,i)=>i);}
  if(activity==='exam'){assert.ok(!examView(level,d).includes(route[2].name));d.answers=route.map(n=>n.name);}
  if(activity==='labels')d.answers=Object.fromEntries(uniqueRoute(level).map(n=>[n.id,n.id]));
  if(activity==='context')for(const i of d.locations)d.answers[i]={before:route[(i+route.length-2)%(route.length-1)].id,after:route[i+1].id,oxygen:route[i].oxygen,circuit:circuitFor(route[i])};
  const r=assess(level,activity,d);assert.equal(r.percent,100);assert.equal(r.passed,true);assert.equal(saveResult(record,r),true);assert.equal(saveResult(record,r),false);assert.equal(record.circulation.results[`${level}:${activity}`].attempts,1);
  for(const n of uniqueRoute(level))assert.equal(POSITIONS[n.id].length,2);
 }
 assert.equal(getPathProgress(circulationPath,record).complete,true);assert.ok(validCirculation(record.circulation));
 const state=emptyState();state.progress[CIRCULATION_ID]=record;assert.ok(validateState(state));assert.deepEqual(JSON.parse(JSON.stringify(state)).progress,state.progress);
});
test('wrong answers complete a submitted activity but never imply academic mastery; attempts are idempotent',()=>{
 const record={done:[],notes:{},answers:{}},d=newDraft('hard','exam');const r=assess('hard','exam',d);saveResult(record,r);assert.equal(r.passed,false);assert.equal(r.percent,0);assert.equal(record.done.length,1);assert.equal(record.circulation.results['hard:exam'].passed,false);assert.ok(record.circulation.errors.rv>0);
 const second=newDraft('hard','exam');second.answers=routeFor('hard').map(n=>n.name);saveResult(record,assess('hard','exam',second));saveResult(record,assess('hard','exam',newDraft('hard','exam')));assert.equal(record.circulation.results['hard:exam'].best,100);assert.equal(record.circulation.results['hard:exam'].passed,true);
});
test('Danish / Latin synonyms are accepted, incorrect side and anatomically distinct structures are rejected',()=>{
 const nodes=Object.fromEntries(routeFor('hard').map(n=>[n.id,n]));
 for(const [id,name]of [['ra','HØJRE FORKAMMER'],['rv','ventriculus dexter'],['la','venstre atrium'],['mitral','Valva bicuspidalis'],['pv','lungevenerne'],['pcapillaries','lungekapillærer'],['ascending','opadstigende aorta']])assert.ok(accepts(nodes[id],name),name);
 for(const [id,name]of [['rv','venstre hjertekammer'],['svc','vena cava inferior'],['rpa','arteria pulmonalis sinistra'],['ascending','aortabuen'],['pcapillaries','kapillærer'],['pcapillaries','omkring alveolerne']])assert.equal(accepts(nodes[id],name),false);
});
test('order is assessed, duplicate aorta occurrences interchangeable; retries shuffle and keyboard reorder',()=>{
 const d=newDraft('easy','order');d.answers=routeFor('easy').map((_,i)=>i);[d.answers[0],d.answers[10]]=[d.answers[10],d.answers[0]];assert.equal(assess('easy','order',d).percent,100);moveCard(d,2,5);assert.ok(assess('easy','order',d).errors>0);assert.notDeepEqual(shuffle([1,2,3],()=>.999),[1,2,3]);
});
test('installing new builtin preserves every previous path and saved learner record',()=>{
 const state=emptyState();state.paths=state.paths.filter(p=>p.id!==CIRCULATION_ID);state.installed=state.installed.filter(id=>id!==CIRCULATION_ID);state.progress['blodcellens-rejse']={done:['blood-hard'],notes:{},answers:{},bloodJourney:{custom:'unchanged'}};const before=structuredClone(state.progress);const next=addNewBuiltins(state);assert.deepEqual(next.progress,before);assert.ok(next.paths.some(p=>p.id===CIRCULATION_ID));assert.ok(validateState(next));
});

test('invalid persisted activity data is rejected without resetting existing learner data',()=>{const state=emptyState(),d=newDraft('easy','order');state.progress[CIRCULATION_ID]={done:[],notes:{},answers:{},circulation:{level:'easy',drafts:{'easy:order':d},results:{},errors:{}}};assert.ok(validateState(state));d.answers[0]=999;assert.equal(validateState(state),false);});
