import test from 'node:test';
import assert from 'node:assert/strict';
import {BLOOD_LEVELS,bloodPath} from '../public/blood-routes.js';
import {newJourney,passages,choosePassage,continueJourney,emptyStats,startAttempt,recordResult,validJourney} from '../public/journey-engine.js';
import {emptyState,validateState,addNewBuiltins} from '../public/model.js';
const expected={
 easy:['aorta','arteries','arterioles','capillaries','venules','veins','cava','right','lungs','left','aorta'],
 medium:['aorta','arteries','arterioles','capillaries','venules','veins','svc','ra','rv','pa','parterioles','pcapillaries','pvenules','pv','la','lv','aorta'],
 hard:['ascending','arch','arteries','arterioles','capillaries','venules','veins','svc','ra','tricuspid','rv','pulmonaryValve','trunk','rpa','parterioles','pcapillaries','pvenules','pv','la','mitral','lv','aorticValve','ascending']
};
for(const route of Object.values(BLOOD_LEVELS)) {
 test(`${route.name}: exact route, two unambiguous options, gated progression, two lives`,()=>{
  assert.deepEqual(route.steps.map(s=>s.id),expected[route.id]);assert.equal(route.choices.length,route.steps.length-1);
  let run=newJourney(route,()=>0);assert.ok(validJourney(route,run));assert.ok(run.sides.filter(s=>s===0).length>=2);assert.ok(run.sides.filter(s=>s===1).length>=2);
  for(let i=0;i<route.choices.length;i++) {
   const choices=passages(route,run);assert.equal(choices.length,2);assert.equal(choices.filter(c=>c.correct).length,1);assert.notEqual(choices[0].name,choices[1].name);
   const correct=choices.findIndex(c=>c.correct),next=choosePassage(route,run,correct);assert.equal(next.index,i+1);assert.equal(next.lives,2);
   assert.equal(choosePassage(route,next,correct),next);run=continueJourney(next);assert.ok(validJourney(route,run));
  }
  assert.equal(run.phase,'won');assert.equal(run.correct,route.choices.length);assert.equal(run.errors,0);assert.deepEqual(passages(route,run),[]);
  run=newJourney(route,()=>1);const wrong=passages(route,run).findIndex(c=>!c.correct),after=choosePassage(route,run,wrong);
  assert.equal(after.lives,1);assert.equal(after.index,0);assert.equal(after.phase,'feedback');assert.deepEqual(after.sides,run.sides);assert.equal(choosePassage(route,after,wrong),after);
  const lost=choosePassage(route,continueJourney(after),wrong);assert.equal(lost.lives,0);assert.equal(lost.phase,'lost');assert.ok(validJourney(route,lost));assert.equal(choosePassage(route,lost,1-wrong),lost);
 });
 test(`${route.name}: oxygen follows systemic and pulmonary capillary exchange`,()=>{
  const give=route.steps.findIndex(s=>s.oxygen==='exchange-out'),take=route.steps.findIndex(s=>s.oxygen==='exchange-in');
  assert.ok(give>0&&take>give);assert.ok(route.steps.slice(0,give).every(s=>s.oxygen==='high'));assert.ok(route.steps.slice(give+1,take).every(s=>s.oxygen==='low'));assert.ok(route.steps.slice(take+1).every(s=>s.oxygen==='high'));
 });
}
test('alternate real branches have a named target and a non-false anatomical explanation',()=>{
 const alt=Object.values(BLOOD_LEVELS).flatMap(r=>r.choices).filter(c=>c.wrong.category==='other-route');assert.equal(alt.length,2);
 for(const c of alt){assert.match(c.wrong.explanation,/normal|anatomisk og fysiologisk mulige/);assert.match(c.wrong.explanation,/højre arm|højre lunge/);}
 const hard=BLOOD_LEVELS.hard;assert.equal(hard.steps.find(s=>s.id==='tricuspid').kind,'av-three');assert.equal(hard.steps.find(s=>s.id==='mitral').kind,'av-two');assert.equal(hard.steps.filter(s=>s.kind==='semilunar').length,2);
});
test('attempts, best score and completion date survive subsequent failed attempts and serialization',()=>{
 const route=BLOOD_LEVELS.easy;let run=newJourney(route),stats=startAttempt(emptyStats());
 while(run.phase!=='won')run=continueJourney(choosePassage(route,run,run.sides[run.index]));
 stats=recordResult(stats,route,run,'2026-11-05T12:00:00.000Z');assert.equal(stats.best,100);assert.equal(stats.completed,true);
 stats=startAttempt(stats);let lost=newJourney(route);for(let i=0;i<2;i++)lost=choosePassage(route,continueJourney(lost),1-lost.sides[lost.index]);
 stats=JSON.parse(JSON.stringify(recordResult(stats,route,lost)));assert.equal(stats.completed,true);assert.equal(stats.attempts,2);assert.equal(stats.lastCompleted,'2026-11-05T12:00:00.000Z');assert.equal(stats.best,100);
});
test('adding the game preserves existing learning content and progression',()=>{
 const state=emptyState();assert.ok(validateState(state));assert.equal(bloodPath.semester,1);assert.equal(bloodPath.subject,'Anatomi og fysiologi');assert.equal(bloodPath.steps.length,3);
 const old={...state,paths:state.paths.filter(p=>p.id!==bloodPath.id),installed:state.installed.filter(id=>id!==bloodPath.id)};
 const p=old.paths[0];old.progress[p.id]={done:[p.steps[0].id],notes:{[p.steps[0].id]:'Bevar'},answers:{}};
 const migrated=addNewBuiltins(old);assert.deepEqual(migrated.progress,old.progress);assert.deepEqual(migrated.paths.slice(0,2),old.paths);assert.equal(migrated.paths.length,3);
});
