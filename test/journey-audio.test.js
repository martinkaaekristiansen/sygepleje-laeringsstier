import test from 'node:test';
import assert from 'node:assert/strict';
import {BLOOD_LEVELS} from '../public/blood-routes.js';
import {anatomyProfile, HEART_PERIOD, BREATH_PERIOD, S2_TIME, valveOpening, valveTransit, oxygenation} from '../public/journey-physiology.js';
import {normalizeAudio, synthesizeLayer} from '../public/journey-audio.js';
const all = Object.values(BLOOD_LEVELS).flatMap(l=>l.steps);
const node = id=>all.find(s=>s.id===id);
const sound = id=>anatomyProfile(node(id)).sound;
test('all structures have bounded anatomical audio zones; heart/lung proximity follows the route',()=>{
 for(const s of all) for(const v of Object.values(anatomyProfile(s).sound)) assert.ok(v>=0&&v<=1,s.id);
 for(const id of ['ra','rv','la','lv','tricuspid','mitral','aorticValve','pulmonaryValve']) assert.equal(sound(id).heart,1,id);
 assert.ok(sound('ascending').heart>sound('arteries').heart);
 assert.ok(sound('arteries').heart>sound('arterioles').heart);
 assert.ok(sound('arterioles').heart>sound('capillaries').heart);
 assert.ok(sound('cava').heart>sound('veins').heart);
 assert.ok(sound('veins').heart>sound('venules').heart);
 assert.ok(sound('trunk').lungs<sound('rpa').lungs);
 assert.ok(sound('rpa').lungs<sound('parterioles').lungs);
 assert.ok(sound('pcapillaries').lungs>sound('pv').lungs);
 for(const id of ['capillaries','veins','aorta','la','rv']) assert.equal(sound(id).lungs,0);
});
test('synthesis has distinct S1/S2, 70 bpm, 14 breaths/min, quiet loop boundaries and safe headroom',()=>{
 const rate=24000, h=synthesizeLayer('heart',rate);
 assert.ok(Math.abs(h.length/rate-60/70)<1/rate);
 const energy=(start,end)=>h.slice(Math.floor(start*rate),Math.floor(end*rate)).reduce((n,v)=>n+v*v,0);
 assert.ok(energy(0,.18)>5);assert.ok(energy(S2_TIME,S2_TIME+.12)>5);
 assert.equal(energy(.5,.8),0);assert.ok(energy(0,.18)>energy(S2_TIME,S2_TIME+.12));
 for(const layer of ['heart','breath','flow']){
  const samples=synthesizeLayer(layer,rate);let peak=0;
  for(const v of samples){assert.ok(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));}
  assert.ok(peak<=.651);if(layer!=='flow'){assert.ok(Math.abs(samples[0])<.001);assert.ok(Math.abs(samples.at(-1))<.001);}else{let maxDelta=0;for(let i=1;i<samples.length;i++)maxDelta=Math.max(maxDelta,Math.abs(samples[i]-samples[i-1]));assert.ok(Math.abs(samples[0]-samples.at(-1))<=maxDelta,'flow seam is no sharper than the continuous noise');}
 }
 assert.ok(Math.abs(synthesizeLayer('breath',rate).length/rate-BREATH_PERIOD)<1/rate);
 assert.ok(.65*(.65+.23+.16*1.3)<1,'headroom with all layers and maximum master');
});
test('only peripheral veins have venous valves; LV walls thicker than RV; single file capillary profile',()=>{
 assert.deepEqual([...new Set(all.filter(s=>anatomyProfile(s).venousValve).map(s=>s.id))],['veins']);
 assert.ok(anatomyProfile(node('lv')).wall>anatomyProfile(node('rv')).wall);
 assert.ok(anatomyProfile(node('rv')).wall>anatomyProfile(node('ra')).wall);
 assert.ok(anatomyProfile(node('capillaries')).speed<anatomyProfile(node('arterioles')).speed);
});
test('AV and semilunar valves open in opposite phases and camera transit stays within open phase',()=>{
 for(const id of ['mitral','tricuspid','aorticValve','pulmonaryValve']){
  const s=node(id);
  for(let time=0;time<HEART_PERIOD*2;time+=.01){
   const transit=valveTransit(s,time);assert.ok(transit.wait>=0&&transit.wait<HEART_PERIOD);
   for(const f of [0,.5,1]) assert.ok(valveOpening(s,time+transit.wait+transit.duration*f)>.99);
  }
 }
 assert.equal(valveOpening(node('mitral'),.18),0);assert.equal(valveOpening(node('aorticValve'),.18),1);
 assert.equal(valveOpening(node('mitral'),.55),1);assert.equal(valveOpening(node('aorticValve'),.55),0);
});
test('oxygenation changes gradually through capillaries, with no blue state',()=>{
 assert.deepEqual([0,1,2,3,4].map(t=>oxygenation(node('pcapillaries'),t)),[0,.25,.5,.75,1]);
 assert.deepEqual([0,2,4].map(t=>oxygenation(node('capillaries'),t)),[1,.5,0]);
});
test('settings validate corrupt data and clamp volume',()=>{
 assert.equal(normalizeAudio(null).enabled,false);
 assert.equal(normalizeAudio({enabled:'yes',volume:Infinity}).volume,.45);
 assert.equal(normalizeAudio({volume:8}).volume,1);
 assert.equal(normalizeAudio({volume:-1,heart:false}).heart,false);
});
