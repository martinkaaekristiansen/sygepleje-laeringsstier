import * as T from './three.module.min.js';
import {makeCurves,vesselGeometry,cellGeometry,wallMaterial} from './journey-3d-geometry.js';
import {cardiacCycle} from './journey-physiology.js';
const forward=new T.Vector3(0,0,-1),up=new T.Vector3(0,1,0);
const ease=t=>t*t*(3-2*t);
export async function createBloodWorld(canvas,{clock,onReady=()=>{},onFrame=()=>{},onError=()=>{},quality='auto'}={}){
 let renderer;
 try{renderer=new T.WebGLRenderer({canvas,antialias:quality!=='low',alpha:false,powerPreference:'high-performance'});}catch{throw Error('Denne enhed kunne ikke starte WebGL 2. Prøv en nyere browser med hardwareacceleration. Den eksisterende læringssti er stadig tilgængelig.');}
 const mobile=matchMedia('(max-width:700px)').matches;const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info'),software=debug&&/SwiftShader|llvmpipe/i.test(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL));
 let low=quality==='low'||quality==='auto'&&(mobile||software||navigator.hardwareConcurrency<=4),disposed=false,paused=false,raf=0,last=0,elapsed=0,stageAge=0,stage,curves,root,wall,cells,tissue,gas;
 let mode='idle',distance=.16,flight=null,ready=false,hover=-1,previousTime=0,fps=60,slow=0;
 const cache=new Map(),materials=new Set(),geometries=new Set();let dirty=true,adaptive=quality==='auto';
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const scene=new T.Scene();scene.background=new T.Color('#2d0d14');
 const camera=new T.PerspectiveCamera(68,1,.025,400);
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,low?(software?.5:1):1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 renderer.shadowMap.enabled=!low;renderer.shadowMap.type=T.PCFSoftShadowMap;
 scene.add(new T.HemisphereLight(0xf9beaa,0x51101d,.7));
 const light=new T.SpotLight(0xffccb1,3,100,Math.PI*.38,.8,0);light.castShadow=!low;light.shadow.mapSize.set(512,512);light.shadow.bias=-.0003;scene.add(light,light.target);
 const fill=new T.PointLight(0xf6b9a0,.3,100,0);scene.add(fill);
 const depthLights=[-1,1].map(()=>{const l=new T.PointLight(0xffbba2,1.1,100,0);scene.add(l);return l;});
 const cellGeo=cellGeometry(low?'low':'high');geometries.add(cellGeo);
 const cellMat=new T.MeshPhysicalMaterial({color:0xc32b35,roughness:.48,metalness:0,ior:1.3,specularIntensity:.32,clearcoat:.12,clearcoatRoughness:.38,emissive:0x2a0105,emissiveIntensity:.16});materials.add(cellMat);
 const dummy=new T.Object3D(),q=new T.Quaternion(),v=new T.Vector3(),pos=new T.Vector3(),tangent=new T.Vector3();
 const raycaster=new T.Raycaster(),ndc=new T.Vector2();
 const seeds=Array.from({length:64},(_,i)=>({u:(i*.6180339887)%1,angle:i*2.39996,radial:.2+((i*13.73)%1)*.58,spin:i*.41}));
 const pickPlanes=[];
 const resized=()=>{if(disposed)return;const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.fov=camera.aspect<.75?110:68;camera.updateProjectionMatrix();render();};
 const observer=new ResizeObserver(resized);observer.observe(canvas);
 const lost=e=>{e.preventDefault();paused=true;onError('3D-visningen mistede forbindelsen til grafikkortet. Genindlæs demonstrationen; din eksisterende progression er bevaret.');};canvas.addEventListener('webglcontextlost',lost);
 async function prepare(s){
  if(disposed)return null;
  const meshQuality=low?'low':'high',key=s.id+':'+meshQuality;
  if(cache.has(key))return cache.get(key);
  const promise=(async()=>{const c=makeCurves(s.radius,s.kind.includes('capillary')),g=await vesselGeometry(s,c,meshQuality);if(disposed){g.dispose();return null;}geometries.add(g);return {curves:c,geometry:g,quality:meshQuality};})();cache.set(key,promise);return promise;
 }
 function localToWorld(point){return root.localToWorld(point.clone());}
 function rootDirection(dir){return dir.clone().applyQuaternion(root.quaternion).normalize();}
 function projected(point){const p=localToWorld(point).project(camera);return {x:(p.x+1)*50,y:(1-p.y)*50,visible:p.z<1&&p.x>-1&&p.x<1};}
 function drawCells(dt){
  const cap=stage.kind.includes('capillary'),count=cells.count,eye=root.worldToLocal(camera.position.clone());
  const lowColour=new T.Color(0x792336),highColour=new T.Color(0xcb303b),colour=new T.Color();cellMat.color.set(0xffffff);
  for(let i=0;i<count;i++){
   const seed=seeds[i],branch=!cap&&i%3===0,curve=branch?curves.branches[i%2]:curves.parent;
   const u=(seed.u+elapsed*(cap?.018:.04))%1;
   pos.copy(curve.getPointAt(u));tangent.copy(curve.getTangentAt(u));
   const size=cap?.63:.65+(i%4)*.08,localRadius=branch?T.MathUtils.lerp(stage.radius*.88,stage.radius*.6,u):T.MathUtils.lerp(stage.entry,stage.radius*.88,u);const radial=cap?0:Math.max(0,localRadius-size-.12)*seed.radial;
   pos.x+=Math.cos(seed.angle)*radial;pos.y+=Math.sin(seed.angle)*radial;
   dummy.position.copy(pos);dummy.quaternion.setFromUnitVectors(forward,tangent);
   if(cap){q.setFromAxisAngle(v.set(0,1,0),Math.sin(elapsed*.3+i)*.23);dummy.quaternion.multiply(q);}
   if(!cap){q.setFromAxisAngle(v.set(1,.4,0).normalize(),seed.spin+elapsed*.12);dummy.quaternion.multiply(q);}
   const visibleSize=pos.distanceTo(eye)<(cap?1.65:2.2)?0:size;dummy.scale.set(visibleSize*(cap?.81+Math.sin(elapsed*.4+i)*.035:1),visibleSize*(cap?.94:1),visibleSize*(cap?1.35:1));dummy.updateMatrix();cells.setMatrixAt(i,dummy.matrix);const oxygen=cap?Math.max(0,Math.min(1,1-(u-.16)/.6)):1;cells.setColorAt(i,colour.lerpColors(lowColour,highColour,oxygen));
  }cells.instanceMatrix.needsUpdate=true;if(cells.instanceColor)cells.instanceColor.needsUpdate=true;
  if(gas){
   for(let i=0;i<gas.count;i++){
    const o2=i%2===0,f=motion.matches?.6:(elapsed*.2+i*.123)%1,u=.25+(i%5)*.12;
    const center=curves.parent.getPointAt(u),a=i*2.3999,radial=stage.radius*(o2?.25+f*1.8:2.05-f*1.8);
    dummy.position.copy(center).add(v.set(Math.cos(a)*radial,Math.sin(a)*radial,0));dummy.quaternion.identity();dummy.scale.setScalar(stage.radius*.035);dummy.updateMatrix();gas.setMatrixAt(i,dummy.matrix);
   }gas.instanceMatrix.needsUpdate=true;
  }
 }
 function moveCamera(localPoint,localDirection,snap=false){
  camera.position.copy(localToWorld(localPoint));const dir=rootDirection(localDirection);q.setFromUnitVectors(forward,dir);
  if(snap||motion.matches)camera.quaternion.copy(q);else camera.quaternion.slerp(q,.14);
 }
 function render(){
  if(disposed||!root)return;
  renderer.render(scene,camera);
 }
 function tick(timestamp){
  if(disposed)return;raf=0;
  const realDt=last?(timestamp-last)/1000:0,dt=Math.min(.2,realDt);last=timestamp;
  if(root&&!document.hidden){
   if(!paused&&!motion.matches){elapsed+=dt;stageAge+=dt;}
   if(!paused){
    if(mode==='approach'){
     if(motion.matches)distance=.92;
     else distance=Math.min(.945,distance+dt*(distance<.82?.14:Math.max(.001,(.95-distance)*.2)));
     if(distance>.82&&!ready){ready=true;onReady();}
     moveCamera(curves.parent.getPointAt(distance),curves.parent.getTangentAt(distance));
    }else if(mode==='capillary'){
     if(!motion.matches)distance=Math.min(.91,distance+dt*.035);
     moveCamera(curves.parent.getPointAt(distance),curves.parent.getTangentAt(distance));
    }else if(flight){
     flight.age+=dt;const f=Math.min(1,flight.age/flight.duration),e=ease(f);
     if(flight.ok){
      if(e<.28){const u=T.MathUtils.lerp(flight.from,1,e/.28);moveCamera(curves.parent.getPointAt(u),curves.parent.getTangentAt(u));}
      else {const u=(e-.28)/.72*.83;moveCamera(curves.branches[flight.side].getPointAt(u),curves.branches[flight.side].getTangentAt(u));}
     }else {const u=flight.from+Math.sin(f*Math.PI)*.025;moveCamera(curves.parent.getPointAt(u),curves.parent.getTangentAt(u));}
     if(f>=1){const done=flight.done;flight=null;mode='waiting';done();}
    }
   }
   const pulse=motion.matches||paused?0:cardiacCycle(clock()).contraction*(stage.kind==='artery'?.013:.003);
   wall.scale.set(1+pulse,1+pulse,1);
   const dir=forward.clone().applyQuaternion(camera.quaternion);
   light.position.copy(camera.position).addScaledVector(up,stage.radius*.22);light.target.position.copy(camera.position).addScaledVector(dir,stage.radius*8);
   fill.position.copy(camera.position).addScaledVector(dir,-stage.radius*.5);
   depthLights.forEach((l,i)=>{l.position.copy(localToWorld(curves.branches[i]?.getPointAt(.55)||curves.parent.getPointAt(.85)));l.intensity=hover===i?.7:.45;});
   if(!paused&&!motion.matches||dirty){drawCells(dt);render();dirty=false;}
   if(timestamp-previousTime>200){
    if(dt>0)fps=fps*.8+Math.min(60,1/Math.max(.001,realDt))*.2;
    previousTime=timestamp;
    if(adaptive&&!low&&fps<28&&++slow>18){low=true;renderer.setPixelRatio(1);renderer.shadowMap.enabled=false;cells.count=Math.min(cells.count,24);resized();}
   }
   onFrame({distance,ready,age:stageAge,anchors:curves.branches.map(c=>projected(c.getPointAt(.23))),fps:paused||motion.matches?0:fps,quality:low?'Let':'Høj',drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles});
  }
  if(!document.hidden)raf=requestAnimationFrame(tick);
 }
 const wake=()=>{last=0;if(!disposed&&!raf&&!document.hidden)raf=requestAnimationFrame(tick);};document.addEventListener('visibilitychange',wake);motion.addEventListener('change',wake);
 async function enter(s){
  const oldPoint=root?camera.position.clone():null,oldDirection=root?forward.clone().applyQuaternion(camera.quaternion):null;
  mode='loading';const built=await prepare(s);if(disposed||!built)return;
  if(root){scene.remove(root);root.traverse(obj=>{if(obj.isInstancedMesh)obj.dispose();if(obj.material&&obj.material!==cellMat){obj.material.userData.ownedTextures?.forEach(t=>t.dispose());obj.material.dispose();materials.delete(obj.material);}if(obj.userData.temporaryGeometry){obj.geometry.dispose();geometries.delete(obj.geometry);}});pickPlanes.splice(0).forEach(p=>p.geometry.dispose());}
  dirty=true;stage=s;canvas.dataset.meshQuality=built.quality;curves=built.curves;stageAge=0;distance=.16;ready=false;hover=-1;
  root=new T.Group();scene.add(root);
  const cap=s.kind.includes('capillary'),mat=wallMaterial(cap,s.radius);materials.add(mat);wall=new T.Mesh(built.geometry,mat);wall.receiveShadow=!low;root.add(wall);
  if(oldPoint){root.quaternion.setFromUnitVectors(curves.parent.getTangentAt(distance),oldDirection);root.position.copy(oldPoint).sub(curves.parent.getPointAt(distance).applyQuaternion(root.quaternion));}
  root.updateMatrixWorld(true);
  cells=new T.InstancedMesh(cellGeo,cellMat,cap?8:44);cells.count=cap?8:low?24:44;cells.instanceMatrix.setUsage(T.DynamicDrawUsage);cells.castShadow=!low;cells.frustumCulled=false;root.add(cells);
  gas=null;tissue=null;
  if(cap){
   // A soft tissue sheath is seen through the thin endothelial teaching window.
   // Keep its open ends beyond the camera path; exposed cut fibre ends look like
   // extra holes and distract from the single capillary lumen.
   const muscleGeo=new T.TubeGeometry(curves.parent,64,s.radius*1.7,32,false),muscleMat=wallMaterial(false,s.radius);muscleMat.color.set(0x80515c);muscleMat.roughness=.9;geometries.add(muscleGeo);materials.add(muscleMat);
   tissue=new T.Mesh(muscleGeo,muscleMat);tissue.userData.temporaryGeometry=true;root.add(tissue);
   const gasGeo=new T.SphereGeometry(1,8,6),gasMat=new T.MeshStandardMaterial({roughness:.65,color:0xffffff,emissive:0x271a10,emissiveIntensity:.1});geometries.add(gasGeo);materials.add(gasMat);gas=new T.InstancedMesh(gasGeo,gasMat,low?16:24);gas.userData.temporaryGeometry=true;for(let i=0;i<gas.count;i++)gas.setColorAt(i,new T.Color(i%2?0xd0d1c6:0xf4d3a0));root.add(gas);
  }
  curves.branches.forEach((curve,i)=>{const p=new T.Mesh(new T.CircleGeometry(s.radius*.8,16),new T.MeshBasicMaterial({visible:false,side:T.DoubleSide}));p.position.copy(curve.getPointAt(.23));p.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),curve.getTangentAt(.23));p.userData.side=i;root.add(p);pickPlanes.push(p);});
  scene.fog=new T.FogExp2(cap?0x42262a:0x300c14,.035/s.radius);
  light.intensity=1.6;light.distance=s.radius*25;light.shadow.camera.near=.04;light.shadow.camera.far=s.radius*25;
  fill.intensity=.15;fill.distance=s.radius*15;depthLights.forEach(l=>{l.distance=s.radius*12;});
  camera.far=s.radius*40;camera.updateProjectionMatrix();moveCamera(curves.parent.getPointAt(distance),curves.parent.getTangentAt(distance),true);
  mode=cap?'capillary':'approach';if(cap)onReady();resized();wake();
 }
 return {
  enter,prepare,
  highlight(side){if(hover!==side)dirty=true;hover=side;},
  pick(clientX,clientY){if(!ready||mode!=='approach')return -1;const r=canvas.getBoundingClientRect();ndc.set((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1);raycaster.setFromCamera(ndc,camera);root.updateMatrixWorld(true);return raycaster.intersectObjects(pickPlanes)[0]?.object.userData.side??-1;},
  travel(side,ok,done){if(mode!=='approach'||!ready)return;if(motion.matches){if(ok){moveCamera(curves.branches[side].getPointAt(.83),curves.branches[side].getTangentAt(.83),true);}done();return;}flight={side,ok,done,from:distance,age:0,duration:ok?2.6:.75};mode='travel';},
  pause(value){paused=value;dirty=true;},
  resumeChoice(){mode='approach';ready=true;},
  setQuality(value){dirty=true;adaptive=value==='auto';slow=0;low=value==='low'||value==='auto'&&(mobile||software||navigator.hardwareConcurrency<=4);renderer.setPixelRatio(Math.min(devicePixelRatio||1,low?(software?.5:1):1.5));renderer.shadowMap.enabled=!low;light.castShadow=!low;if(cells)cells.castShadow=!low;if(wall)wall.receiveShadow=!low;if(cells&&!stage.kind.includes('capillary'))cells.count=low?24:44;if(stage){const requested=stage;void prepare(requested).then(built=>{if(built&&!disposed&&stage===requested&&built.quality===(low?'low':'high')){wall.geometry=built.geometry;canvas.dataset.meshQuality=built.quality;dirty=true;}}).catch(()=>onError('Grafikkvaliteten kunne ikke ændres. Genindlæs demonstrationen.'));}resized();},
  dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();document.removeEventListener('visibilitychange',wake);motion.removeEventListener('change',wake);canvas.removeEventListener('webglcontextlost',lost);geometries.forEach(g=>g.dispose());materials.forEach(m=>{m.userData.ownedTextures?.forEach(t=>t.dispose());m.dispose();});cells?.dispose();tissue?.dispose?.();gas?.dispose();pickPlanes.forEach(p=>{p.geometry.dispose();p.material.dispose();});scene.clear();renderer.dispose();renderer.forceContextLoss();},
 };
}
