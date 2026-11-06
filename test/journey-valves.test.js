import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/three.module.min.js';
import {VALVE_ANATOMY,leafletPoint,createValve,sinusRadius} from '../public/journey-valves.js';
import {BLOOD_LEVELS} from '../public/blood-routes.js';
import {newJourney,passages,choosePassage,continueJourney} from '../public/journey-engine.js';
import {valveOpening,HEART_PERIOD} from '../public/journey-physiology.js';
const valves=BLOOD_LEVELS.hard.steps.filter(s=>VALVE_ANATOMY[s.id]);
function dispose(v){const geos=new Set(),mats=new Set();v.group.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)mats.add(o.material);});geos.forEach(g=>g.dispose());mats.forEach(m=>{m.userData.ownedTextures?.forEach(t=>t.dispose());m.dispose();});}

test('trunk offers right pulmonary artery versus an impossible direct aortic connection, never left versus right lung',()=>{
 const route=BLOOD_LEVELS.hard,index=route.steps.findIndex(s=>s.id==='trunk'),run={...newJourney(route),index};
 const opts=passages(route,run);assert.equal(opts.length,2);assert.equal(opts.find(p=>p.correct).name,'Arteria pulmonalis dextra (højre lungearterie)');
 const wrong=opts.find(p=>!p.correct);assert.equal(wrong.name,'Aorta ascendens');assert.notEqual(wrong.category,'other-route');assert.match(wrong.explanation,/ingen direkte forbindelse/);
 assert.ok(!opts.some(p=>/sinistra|venstre lunge/i.test(p.name)));
 const failed=choosePassage(route,run,opts.findIndex(p=>!p.correct));assert.equal(failed.lives,1);assert.equal(failed.index,index);
 const retried=choosePassage(route,continueJourney(failed),opts.findIndex(p=>p.correct));assert.equal(retried.index,index+1);
});
test('closed valves seal their central lumen; open valves provide a clear central passage',()=>{
 for(const s of valves){
  const v=createValve(s,1),ray=new T.Raycaster();
  for(const opening of [0,1]){
   v.update(opening);v.group.updateMatrixWorld(true);
   for(const x of [-.19,.07,.21])for(const y of [-.21,.09,.18]){
    ray.set(new T.Vector3(x,y,2),new T.Vector3(0,0,-1));ray.far=5;
    const hits=ray.intersectObjects(v.leaves);
    assert.equal(hits.length>0,opening===0,`${s.id}: central seal / open lumen at ${x},${y}`);
   }
  }
  dispose(v);
 }
});
test('leaflets are curved patches with fixed hinges and continuously deforming free edges',()=>{
 for(const s of valves){
  const d=VALVE_ANATOMY[s.id];
  for(let k=0;k<d.names.length;k++){
   for(const u of [0,.25,.5,.75,1])assert.ok(leafletPoint(s.id,k,u,0,0).distanceTo(leafletPoint(s.id,k,u,0,1))<1e-8,'hinge never detaches');
   const closed=leafletPoint(s.id,k,.5,1,0),open=leafletPoint(s.id,k,.5,1,1);assert.ok(closed.distanceTo(open)>.4);
   const points=Array.from({length:21},(_,i)=>leafletPoint(s.id,k,.5,1,i/20));
   for(let i=1;i<points.length;i++)assert.ok(points[i].distanceTo(points[i-1])<.12,'no jump between animation frames');
   if(d.type==='av')assert.ok(open.z<closed.z-.5,'AV leaflets open into the ventricle');
   else assert.ok(Math.hypot(open.x,open.y)>.9,'semilunar cusps open towards the arterial wall');
   const zs=[0,.25,.5,.75,1].map(v=>leafletPoint(s.id,k,.5,v,0).z);assert.ok(Math.max(...zs)-Math.min(...zs)>.1,'not a planar circle');
  }
 }
});
test('AV support apparatus is ventricular, attached to both adjacent leaflets; semilunars have none',()=>{
 for(const s of valves){
  const v=createValve(s,1),av=s.kind.startsWith('av-');
  assert.equal(v.leaves.length,s.id==='mitral'?2:3);assert.equal(v.papillary.length,av?s.id==='mitral'?2:3:0);
  assert.equal(v.chordLinks.length>0,av);
  for(let k=0;k<v.papillary.length;k++){
   assert.equal(new Set(v.chordLinks.filter(c=>c.muscle===k).map(c=>c.leaf)).size,2);
   const p=v.papillary[k];assert.ok(p.tip.z<-1&&p.base.z<p.tip.z);assert.ok(Math.hypot(p.base.x,p.base.y)>.95,'muscle joins the wall');
  }
  for(let t=0;t<HEART_PERIOD;t+=.017){v.update(valveOpening(s,t),.5);for(const mesh of v.leaves)assert.ok(mesh.geometry.attributes.position.array.every(Number.isFinite));}
  assert.equal(v.group.userData.ostia,s.id==='aorticValve'?2:0);
  assert.equal(v.group.getObjectByName('coronary-ostium-2'),undefined,'noncoronary sinus has no ostium');
  if(av){v.update(0,1);for(const p of v.papillary)assert.ok(p.activeTip.z<p.tip.z,'papillary contraction tensions chordae downstream');}
  dispose(v);
 }
});

test('semilunar scalloped attachments join their own sinus wall without floating gaps',()=>{
 for(const id of ['pulmonaryValve','aorticValve'])for(let k=0;k<3;k++)for(let i=0;i<=24;i++){
  const u=i/24,a=VALVE_ANATOMY[id].angles[k]*(1-u)+VALVE_ANATOMY[id].angles[k+1]*u,p=leafletPoint(id,k,u,0,0);
  assert.ok(Math.abs(Math.hypot(p.x,p.y)-sinusRadius(id,a,p.z))<1e-8);
 }
});
