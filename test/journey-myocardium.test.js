import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/three.module.min.js';
import {trabecularField,trabecularBridges,myocardiumMaterial} from '../public/journey-myocardium.js';
import {visualAnatomy,anatomyCurves,lumenGeometry,createValve,addAnatomy} from '../public/journey-3d-anatomy.js';
import {BLOOD_LEVELS} from '../public/blood-routes.js';
const hard=BLOOD_LEVELS.hard;
function stage(id){const i=hard.steps.findIndex(s=>s.id===id);return visualAnatomy(hard.steps[i],hard.steps[i+1]);}
function dispose(root){const g=new Set(),m=new Set();root.traverse(o=>{if(o.geometry)g.add(o.geometry);if(o.material)m.add(o.material);});g.forEach(x=>x.dispose());m.forEach(x=>{x.userData.ownedTextures?.forEach(t=>t.dispose());x.dispose();});}

test('right ventricular trabeculae are coarser than left; periodic, bounded relief fades to smooth boundaries',()=>{
 const right=trabecularField('right'),left=trabecularField('left');let maxR=0,maxL=0;
 for(let a=0;a<6.3;a+=.13)for(let t=0;t<=1;t+=.04){
  const r=right.sample(a,t),l=left.sample(a,t);assert.ok(r>=0&&r<=.106&&l>=0&&l<=.066);maxR=Math.max(maxR,r);maxL=Math.max(maxL,l);
  assert.ok(Math.abs(r-right.sample(a+2*Math.PI,t))<1e-10);
 }
 assert.ok(maxR>.09&&maxL>.05&&maxR>maxL*1.3);
 assert.ok(right.profile.width>left.profile.width);assert.ok(right.nodes.length<left.nodes.length);
 for(const field of [right,left])for(const a of [0,.7,3,6.28]){assert.equal(field.sample(a,-.2),0);assert.equal(field.sample(a,0),0);assert.equal(field.sample(a,1),0);assert.equal(field.sample(a,1.2),0);}
});
test('ventricular relief is one continuous wall with only its inlet/outlet boundaries, no holes through myocardium',()=>{
 for(const id of ['rv','lv']){
  const s=stage(id),c=anatomyCurves(s),g=lumenGeometry(s,c.parent,'low'),p=g.attributes.position,n=g.attributes.normal,idx=g.index.array;
  assert.equal(g.userData.trabeculated,true);assert.ok(p.array.every(Number.isFinite));assert.ok(n.array.every(Number.isFinite));
  const weld=new Map(),ids=[];for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(x=>x.toFixed(9)).join(',');if(!weld.has(key))weld.set(key,weld.size);ids.push(weld.get(key));}
  const edges=new Map();for(let i=0;i<idx.length;i+=3)for(const [a,b]of [[idx[i],idx[i+1]],[idx[i+1],idx[i+2]],[idx[i+2],idx[i]]]){const x=ids[a],y=ids[b],key=x<y?`${x}:${y}`:`${y}:${x}`;edges.set(key,(edges.get(key)||0)+1);}
  assert.ok([...edges.values()].every(n=>n===1||n===2));assert.ok([...edges.values()].filter(n=>n===1).length<1200,'only bounded ports at the sampling boundary');
  assert.ok(g.index.count/3<180000,'bounded mobile mesh budget');
  const root=new T.Group(),extras=addAnatomy(root,s,c,true,g);assert.equal(extras.group.getObjectByName('trabecular-bridges').children.length,id==='rv'?3:1);
  assert.equal(extras.group.children.some(o=>o.isInstancedMesh),false,'no floating capsule bars');dispose(root);g.dispose();
 }
 for(const id of ['ra','la','ascending','trunk']){const s=stage(id),g=lumenGeometry(s,anatomyCurves(s).parent,'low');assert.equal(g.userData.trabeculated,false,`${id} must not acquire ventricular trabeculae`);g.dispose();}
});
test('AV walls carry continuous relief and rounded papillary muscles; arterial valves have no trabecular support cuff',()=>{
 for(const id of ['tricuspid','mitral','pulmonaryValve','aorticValve']){
  const v=createValve(hard.steps.find(s=>s.id===id),1),wall=v.group.getObjectByName('ventricular-wall'),av=['tricuspid','mitral'].includes(id);
  assert.equal(Boolean(wall),av);
  if(av){assert.equal(wall.geometry.userData.trabeculated,true);assert.ok(wall.geometry.attributes.color.array.every(x=>x>=.7&&x<=1));
   for(const p of v.papillary){assert.equal(p.mesh.geometry.type,'LatheGeometry');assert.ok(p.mesh.geometry.attributes.color.array.every(x=>x===1),'papillary muscle cannot turn black with vertex colour material');}
  }
  dispose(v.group);
 }
});
test('trabecular bridges have two wall attachments and leave the central flow path clear',()=>{
 const surface=(a,t)=>({point:new T.Vector3(Math.cos(a),Math.sin(a),-3*t),outward:new T.Vector3(Math.cos(a),Math.sin(a),0)}),mat=myocardiumMaterial();
 for(const side of ['right','left']){
  const bridges=trabecularBridges(surface,side,1,mat);
  for(const b of bridges.children){const {centers,attachments,width}=b.userData;
   for(const [i,j]of [[0,0],[centers.length-1,1]]){assert.ok(centers[i].distanceTo(attachments[j])<width,'ends are embedded, not floating');assert.ok(Math.hypot(centers[i].x,centers[i].y)>1);}
   assert.ok(Math.hypot(centers[8].x,centers[8].y)<.93,'free middle spans a recess');assert.ok(centers.every(p=>Math.hypot(p.x,p.y)-width>.75),'no muscle across central camera path');
   b.geometry.dispose();
  }
 }
 mat.userData.ownedTextures.forEach(t=>t.dispose());mat.dispose();
});
