import * as T from './three.module.min.js';
import {anatomyProfile,isValve,valveOpening,cardiacCycle,BREATH_PERIOD} from './journey-physiology.js';
import {makeCurves,wallMaterial} from './journey-3d-geometry.js';
import {createValve} from './journey-valves.js';
export {createValve} from './journey-valves.js';
const V=(x,y,z)=>new T.Vector3(x,y,z);

// Visual dimensions only. Names and answer options ALWAYS come from blood-routes.
export function visualAnatomy(s,next){
 const profile=anatomyProfile(s),cap=profile.capillary,chamber=profile.chamber;
 const smallVein=['venules','pvenules'].includes(s.id);
 const radius=cap?.86:chamber?5.4:isValve(s)?3.3:s.kind==='arteriole'?1.65:smallVein?1.8:s.kind==='vein'?4.8:s.kind==='arch'?6:['arteries','pa','rpa'].includes(s.id)?3.8:s.id==='trunk'?5:6.2;
 // At the medium/easy level valves are traversed without creating extra steps.
 let valve=isValve(s)?s:null;
 if(!valve&&!isValve(next||{kind:''})){
  const implicit={ra:{id:'tricuspid',kind:'av-three'},la:{id:'mitral',kind:'av-two'},rv:{id:'pulmonaryValve',kind:'semilunar'},right:{id:'pulmonaryValve',kind:'semilunar'},lv:{id:'aorticValve',kind:'semilunar'},left:{id:'aorticValve',kind:'semilunar'}};
  if(implicit[s.id])valve=implicit[s.id];
 }
 return {...s,profile,radius,entry:radius,valve,branch:false,chamber,cap,smallVein,
  shape:chamber?s.kind:cap?'capillary':isValve(s)?'valve':s.kind==='vein'?'vein':s.kind==='arch'?'arch':'arterial',
  cacheKey:[s.kind,s.id,radius,!!valve].join(':')};
}
export function anatomyCurves(s){
 const r=s.radius;
 if(s.branch)return makeCurves(r);
 const parent=new T.CatmullRomCurve3(s.kind==='arch'?
  [V(0,0,2*r),V(.12*r,.12*r,-2*r),V(.55*r,.7*r,-5*r),V(1.8*r,1.1*r,-8*r),V(3.4*r,.85*r,-11*r)]:
  [V(0,0,2*r),V(.1*r,.04*r,-2*r),V(-.12*r,.08*r,-5*r),V(.15*r,-.07*r,-8*r),V(.32*r,.06*r,-11*r)]);
 return {parent,branches:[]};
}
function nativeRadius(s,u){
 if(s.chamber){const swell=Math.sin(Math.PI*Math.max(0,Math.min(1,(u-.06)/.88)));return s.radius*(.48+Math.pow(Math.max(0,swell),s.kind==='atrium'?.55:.85)*.9);}
 if(s.cap)return s.radius*(1-.1*u);
 if(s.kind==='arteriole')return s.radius*(1.15-.35*u);
 return s.radius*(1-.14*u);
}
export function lumenRadius(s,u){
 if(s.entry!==s.radius&&u<.42){const t=T.MathUtils.clamp((u-.1)/.32,0,1);return T.MathUtils.lerp(s.entry,lumenRadius({...s,entry:s.radius},u),t*t*(3-2*t));}
 const base=nativeRadius(s,u);
 // Leave room around the sinus root / ventricular support cuff, including
 // valves embedded in the easier levels' chamber scenes.
 if(s.valve&&u>.67&&u<.96){const clearance=nativeRadius(s,.73)*1.30,blend=Math.min(1,(u-.67)/.05,(.96-u)/.04);return T.MathUtils.lerp(base,Math.max(base,clearance),Math.max(0,blend));}
 return base;
}
export function lumenGeometry(s,curve,quality){
 const length=quality==='low'?64:100,radial=quality==='low'?28:44;
 const g=new T.TubeGeometry(curve,length,1,radial,false),p=g.attributes.position,n=g.attributes.normal;
 for(let j=0;j<=length;j++){
  const u=j/length,c=curve.getPointAt(u),radius=lumenRadius(s,u);
  for(let i=0;i<=radial;i++){
   const k=j*(radial+1)+i,a=i/radial*Math.PI*2;
   const ripple=s.chamber?.026*Math.sin(a*7+u*14):.006*Math.sin(a*5+u*22);
   const flatten=s.kind==='right-ventricle'?.82:s.kind==='vein'?.85:1;
   p.setXYZ(k,c.x+n.getX(k)*radius*(1+ripple),c.y+n.getY(k)*radius*flatten*(1+ripple),c.z+n.getZ(k)*radius*(1+ripple));
  }
 }
 g.computeVertexNormals();g.computeBoundingSphere();return g;
}
export function oxygenAt(s,u){const f=T.MathUtils.clamp((u-.12)/.72,0,1);return s.oxygen==='exchange-in'?f:s.oxygen==='exchange-out'?1-f:s.oxygen==='high'?1:0;}
export function gasRadius(s,isOxygen,f){const outward=s.oxygen==='exchange-out'?isOxygen:!isOxygen;return s.radius*(outward?.2+f*1.7:1.9-f*1.7);}

export function addAnatomy(root,s,curves,low){
 const extras=new T.Group();root.add(extras);let valve=null,alveoli=null;
 const dummy=new T.Object3D();
 if(s.valve){
  valve=createValve(s.valve,nativeRadius(s,.73)*.98);
  valve.group.position.copy(curves.parent.getPointAt(.73));
  valve.group.quaternion.setFromUnitVectors(V(0,0,-1),curves.parent.getTangentAt(.73));extras.add(valve.group);
 }
 if(s.profile.venousValve){const venous=createValve({id:'venousValve',kind:'venous'},lumenRadius(s,.73)*.98);venous.group.position.copy(curves.parent.getPointAt(.73));venous.group.quaternion.setFromUnitVectors(V(0,0,-1),curves.parent.getTangentAt(.73));venous.update(.95);extras.add(venous.group);}
 if(s.chamber&&s.kind!=='atrium'){
  const count=s.kind==='left-ventricle'?24:16;
  const ridges=new T.InstancedMesh(new T.CapsuleGeometry(s.radius*.09,s.radius*.65,3,8),new T.MeshStandardMaterial({color:0xa1545d,roughness:.78}),count);
  for(let i=0;i<count;i++){
   const u=.48+(i%6)*.065,a=i*2.3999,c=curves.parent.getPointAt(u),r=lumenRadius(s,u)*.88;
   dummy.position.set(c.x+Math.cos(a)*r,c.y+Math.sin(a)*r*(s.kind==='right-ventricle'?.82:1),c.z);
   dummy.rotation.set(Math.PI/2,0,a*.08);dummy.scale.setScalar(1);dummy.updateMatrix();ridges.setMatrixAt(i,dummy.matrix);
  }extras.add(ridges);
 }
 if(s.cap){
  if(s.profile.pulmonary){
   alveoli=new T.Group();const geo=new T.SphereGeometry(s.radius*.9,low?16:24,12),mat=new T.MeshStandardMaterial({color:0xcca8a1,roughness:.85,transparent:true,opacity:.45,depthWrite:false,side:T.DoubleSide});
   for(let i=0;i<(low?10:16);i++){const u=.18+(i%6)*.1,c=curves.parent.getPointAt(u),a=i*2.3999;const m=new T.Mesh(geo,mat);m.position.set(c.x+Math.cos(a)*s.radius*1.8,c.y+Math.sin(a)*s.radius*1.8,c.z);m.userData.center=m.position.clone();alveoli.add(m);}extras.add(alveoli);
  }else{
   const mat=wallMaterial(false,s.radius);mat.color.set(0x80515c);mat.roughness=.9;
   extras.add(new T.Mesh(new T.TubeGeometry(curves.parent,64,s.radius*1.7,24,false),mat));
  }
 }
 return {group:extras,valve,update(time,reduced){
  if(valve)valve.update(reduced?1:valveOpening(s.valve,time),reduced?0:cardiacCycle(time).contraction);
  if(alveoli){const breath=reduced?1:1+.025*Math.sin(time/BREATH_PERIOD*Math.PI*2);alveoli.children.forEach(m=>m.scale.setScalar(breath));}
 }};
}
