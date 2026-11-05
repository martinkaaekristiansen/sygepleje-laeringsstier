import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/three.module.min.js';
import {DEMO_3D_STAGES,demoChoices,demoSides,DEMO_3D_KEY} from '../public/journey-3d-data.js';
import {makeCurves,vesselGeometry,cellGeometry} from '../public/journey-3d-geometry.js';

test('review sequence has the specified order and two real branches with an explicit target',()=>{
 assert.deepEqual(DEMO_3D_STAGES.map(s=>s.id),['aorta','arteries','arterioles','capillaries']);
 for(const s of DEMO_3D_STAGES.slice(0,3)){
  assert.equal(s.choices.length,2);assert.equal(s.choices.filter(c=>c.correct).length,1);
  assert.match(s.choices.find(c=>!c.correct).explanation,/normal/);
  assert.ok(s.goal.length>30);assert.deepEqual(demoChoices(s,1),demoChoices(s,0).toReversed());
 }
 assert.equal(DEMO_3D_STAGES[3].choices.length,0);
 for(const sample of [()=>0,()=>1])assert.equal(new Set(demoSides(sample)).size,2);
 assert.ok(DEMO_3D_KEY.includes('review'),'separate review storage does not replace existing progression');
 assert.ok(DEMO_3D_STAGES.every((s,i)=>i===0||s.radius<DEMO_3D_STAGES[i-1].radius));
});
test('erythrocyte is a closed biconcave mesh, not a sprite or sphere',()=>{
 const g=cellGeometry('low'),p=g.attributes.position,a=g.index.array,edges=new Map();
 assert.ok(p.count>500);let center=0,rim=0;
 for(let i=0;i<p.count;i++){const radius=Math.hypot(p.getX(i),p.getY(i));if(radius<.02)center=Math.max(center,Math.abs(p.getZ(i)));if(radius>.5&&radius<.85)rim=Math.max(rim,Math.abs(p.getZ(i)));}
 assert.ok(rim>center*2);
 for(let i=0;i<a.length;i+=3)for(const [x,y]of [[a[i],a[i+1]],[a[i+1],a[i+2]],[a[i+2],a[i]]]){const key=x<y?`${x}:${y}`:`${y}:${x}`;edges.set(key,(edges.get(key)||0)+1);}
 assert.ok([...edges.values()].every(n=>n===2),'all mesh edges meet two faces');g.dispose();
});
test('Y-junction is one 3D mesh with both camera paths inside its open lumen',async()=>{
 const s=DEMO_3D_STAGES[1],curves=makeCurves(s.radius),g=await vesselGeometry(s,curves,'low');
 assert.ok(g.attributes.position.count>1000);assert.ok(g.index.count>6000);
 const mat=new T.MeshBasicMaterial({side:T.DoubleSide}),mesh=new T.Mesh(g,mat),ray=new T.Raycaster();mesh.updateMatrixWorld(true);
 for(const curve of [curves.parent,...curves.branches])for(let u=curve===curves.parent?.16:0;u<.8;u+=.025){
  const from=curve.getPointAt(u),to=curve.getPointAt(u+.025),distance=from.distanceTo(to);ray.set(from,to.clone().sub(from).normalize());ray.far=distance*.99;
  assert.equal(ray.intersectObject(mesh).length,0,'camera must not cross a sealed branch wall');
 }
 const ridgeRay=new T.Raycaster(new T.Vector3(0,0,-7*s.radius),new T.Vector3(0,0,-1),.1,20*s.radius);
 assert.ok(ridgeRay.intersectObject(mesh).length>0,'the junction separates into two branches, not a third straight opening');
 g.dispose();mat.dispose();
});
