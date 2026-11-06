import test from 'node:test';import assert from 'node:assert/strict';import * as T from '../public/three.module.min.js';
import {BLOOD_LEVELS} from '../public/blood-routes.js';import {visualAnatomy,anatomyCurves,lumenGeometry,addAnatomy} from '../public/journey-3d-anatomy.js';import {chamberPlan,chamberField,deformChamberPoint,chamberAnimator} from '../public/journey-chambers.js';
for(const id of ['ra','rv','la','lv'])test(`${id}: cavity, distinct ports, deforming wall, clear camera corridor`,()=>{
 const i=BLOOD_LEVELS.hard.steps.findIndex(n=>n.id===id),s=visualAnatomy(BLOOD_LEVELS.hard.steps[i],BLOOD_LEVELS.hard.steps[i+1]),plan=chamberPlan(s),g=lumenGeometry(s,plan.parent,'low');
 assert.equal(g.userData.chamber,true);assert.ok(g.index.count/3<180000);assert.ok(chamberField(s,plan.center,plan)<-.7);assert.ok(plan.ports.length>=2);
 const mesh=new T.Mesh(g.clone(),new T.MeshBasicMaterial({side:T.DoubleSide})),animate=chamberAnimator(mesh,s),ray=new T.Raycaster();
 for(const time of [0,.155,.5,.79]){animate(time);mesh.updateMatrixWorld(true);for(let u=.16;u<.93;u+=.012){const a=plan.parent.getPointAt(u),b=plan.parent.getPointAt(u+.01);ray.set(a,b.clone().sub(a).normalize());ray.far=a.distanceTo(b);assert.equal(ray.intersectObject(mesh).length,0,`${id} camera segment at ${u.toFixed(2)} phase ${time}`);}}
 const p=plan.center.clone().add(new T.Vector3(.7,-.3,0)).multiplyScalar(s.radius),phase=plan.atrium?.79:.155;assert.ok(deformChamberPoint(p,s,phase).distanceTo(p)>.02,'contraction is visible');
 const root=new T.Group(),extras=addAnatomy(root,s,{parent:plan.parent},true,g);if(!plan.atrium){const valve=extras.group.getObjectByName(plan.inletValve.id);assert.equal(valve.userData.papillaryCount,plan.left?2:3);assert.ok(valve.userData.chordae>0);}
 for(let t=0;t<.857;t+=.05){extras.update(t,false);root.updateMatrixWorld(true);for(let u=.16;u<.65;u+=.007){const a=plan.parent.getPointAt(u),b=plan.parent.getPointAt(u+.005);ray.set(a,b.clone().sub(a).normalize());ray.far=a.distanceTo(b);assert.equal(ray.intersectObject(root,true).length,0,`${id} camera cannot intersect support apparatus at ${u}, phase ${t}`);}}
 g.dispose();mesh.geometry.dispose();mesh.material.dispose();
});
