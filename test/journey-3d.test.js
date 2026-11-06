import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/three.module.min.js';
import {BLOOD_LEVELS} from '../public/blood-routes.js';
import {newJourney,passages,recordResult} from '../public/journey-engine.js';
import {visualAnatomy,anatomyCurves,lumenGeometry,createValve,oxygenAt,gasRadius} from '../public/journey-3d-anatomy.js';
import {cellGeometry,vesselGeometry} from '../public/journey-3d-geometry.js';
import {valveTransit,valveOpening,HEART_PERIOD} from '../public/journey-physiology.js';

test('every original route has 3D anatomy; choices remain the original anatomical names',()=>{
 for(const route of Object.values(BLOOD_LEVELS)){
  const run=newJourney(route);
  route.steps.forEach((s,i)=>{
   const v=visualAnatomy(s,route.steps[i+1]);assert.ok(v.radius>0);assert.equal(v.name,s.name);
   // Only the real pulmonary bifurcation is physically modelled as a fork.
   assert.equal(v.branch,s.id==='trunk');
   if(i<route.choices.length){const options=passages(route,{...run,index:i});assert.deepEqual(options.map(p=>p.name).sort(),[route.steps[i+1].name,route.choices[i].wrong.name].sort());assert.ok(options.every(p=>!/biceps|triceps|Aktivt|Hvilende|Mod højre arm/.test(p.name)));}
  });
 }
});
test('erythrocyte is a closed biconcave 3D mesh',()=>{
 const g=cellGeometry('low'),p=g.attributes.position,a=g.index.array,edges=new Map();let center=0,rim=0;
 for(let i=0;i<p.count;i++){const r=Math.hypot(p.getX(i),p.getY(i));if(r<.02)center=Math.max(center,Math.abs(p.getZ(i)));if(r>.5&&r<.85)rim=Math.max(rim,Math.abs(p.getZ(i)));}
 assert.ok(rim>2*center);
 for(let i=0;i<a.length;i+=3)for(const[x,y]of[[a[i],a[i+1]],[a[i+1],a[i+2]],[a[i+2],a[i]]]){const k=x<y?`${x}:${y}`:`${y}:${x}`;edges.set(k,(edges.get(k)||0)+1);}assert.ok([...edges.values()].every(n=>n===2));g.dispose();
});
test('all 3D lumens contain their camera path, without extra openings in heart chambers',async()=>{
 const seen=new Set();
 for(const route of Object.values(BLOOD_LEVELS))for(let i=0;i<route.steps.length;i++){
  const s=visualAnatomy(route.steps[i],route.steps[i+1]);if(seen.has(s.cacheKey))continue;seen.add(s.cacheKey);
  const curves=anatomyCurves(s),g=s.branch?await vesselGeometry(s,curves,'low'):lumenGeometry(s,curves.parent,'low');
  const mat=new T.MeshBasicMaterial({side:T.DoubleSide}),mesh=new T.Mesh(g,mat),ray=new T.Raycaster();mesh.updateMatrixWorld(true);
  for(const curve of [curves.parent,...curves.branches])for(let u=.16;u<.88;u+=.025){const a=curve.getPointAt(u),b=curve.getPointAt(u+.025);ray.set(a,b.clone().sub(a).normalize());ray.far=a.distanceTo(b)*.99;assert.equal(ray.intersectObject(mesh).length,0,`${s.id}: camera stays inside lumen`);}
  if(!s.branch)assert.equal(curves.branches.length,0);g.dispose();mat.dispose();
 }
});
test('AV and semilunar leaflets/chordae and open transit phase are distinguished',()=>{
 for(const s of BLOOD_LEVELS.hard.steps.filter(s=>s.kind.startsWith('av-')||s.kind==='semilunar')){
  const v=createValve(s,2);assert.equal(v.group.userData.leafletCount,s.kind==='av-two'?2:3);assert.equal(v.group.userData.chordae>0,s.kind.startsWith('av-'));
  v.update(1);for(let t=0;t<HEART_PERIOD;t+=.013){const crossing=valveTransit(s,t);for(const f of [.1,.5,.9])assert.ok(valveOpening(s,t+crossing.wait+crossing.duration*f)>.98);}
 }
 const medium=BLOOD_LEVELS.medium;for(const id of ['ra','rv','la','lv']){const i=medium.steps.findIndex(s=>s.id===id);assert.ok(visualAnatomy(medium.steps[i],medium.steps[i+1]).valve);}
 const hard=BLOOD_LEVELS.hard;assert.equal(visualAnatomy(hard.steps[8],hard.steps[9]).valve,null,'explicit valve step must not be duplicated in atrium');
});
test('oxygen/gas direction reverses at lungs; original completion survives a failure',()=>{
 for(const route of Object.values(BLOOD_LEVELS))for(const s of route.steps){
  if(s.oxygen==='exchange-in'){assert.ok(oxygenAt(s,.9)>oxygenAt(s,.1));assert.ok(gasRadius({...s,radius:1},true,.9)<gasRadius({...s,radius:1},true,.1));}
  if(s.oxygen==='exchange-out'){assert.ok(oxygenAt(s,.9)<oxygenAt(s,.1));assert.ok(gasRadius({...s,radius:1},true,.9)>gasRadius({...s,radius:1},true,.1));}
  if(s.oxygen==='low')assert.equal(oxygenAt(s,.5),0);
 }
 const before={completed:true,attempts:4,best:100,lastCompleted:'2026-11-05',perfect:true};const after=recordResult(before,BLOOD_LEVELS.easy,{correct:1,phase:'lost',errors:2});assert.deepEqual(after,before);
});
