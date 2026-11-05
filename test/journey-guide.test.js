import test from 'node:test';
import assert from 'node:assert/strict';
import {BLOOD_LEVELS} from '../public/blood-routes.js';
import {JOURNEY_GUIDE,renderBodyMap,renderFunFact} from '../public/journey-guide.js';
test('every structure on all routes has an anatomical fact and a map location',()=>{
 for(const route of Object.values(BLOOD_LEVELS))for(const s of route.steps){
  const p=JOURNEY_GUIDE[s.id];assert.ok(p,s.id);assert.ok(p.fact.length>40,s.id);
  assert.ok(p.x>0&&p.x<120&&p.y>0&&p.y<174,s.id);
  assert.match(renderBodyMap(s),new RegExp(`data-map-location="${s.id}"`));
  assert.ok(renderFunFact(s).includes(p.fact));
 }
});
test('front-view map keeps right arm and right lung on patient right, separates chambers and closes the circuit',()=>{
 const p=JOURNEY_GUIDE;
 assert.ok(p.capillaries.x<35);assert.ok(p.pcapillaries.x<60);
 assert.ok(p.ra.x<p.la.x);assert.ok(p.rv.x<p.lv.x);
 assert.ok(p.ra.y<p.rv.y);assert.ok(p.la.y<p.lv.y);
 for(const level of Object.values(BLOOD_LEVELS))assert.deepEqual(p[level.steps[0].id],p[level.steps.at(-1).id]);
});
