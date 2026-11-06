import * as T from './three.module.min.js';
import {vesselGeometry,cellGeometry,wallMaterial} from './journey-3d-geometry.js';
import {visualAnatomy,anatomyCurves,lumenGeometry,lumenRadius,oxygenAt,gasRadius,addAnatomy} from './journey-3d-anatomy.js';
import {cardiacCycle,valveOpening,valveTransit} from './journey-physiology.js';
const forward=new T.Vector3(0,0,-1),up=new T.Vector3(0,1,0),ease=t=>t*t*(3-2*t);
export async function createBloodWorld(canvas,{clock=()=>performance.now()/1000,onReady=()=>{},onFrame=()=>{},onError=()=>{},quality='auto'}={}){
 let renderer;
 try{renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch{throw Error('3D kræver WebGL 2. Aktivér hardwareacceleration, eller prøv en nyere browser. Dine gemte resultater bevares.');}
 canvas.dataset.engine='three.js r180';
 const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
 const software=debug&&/SwiftShader|llvmpipe/i.test(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL));
 const mobile=matchMedia('(max-width:700px)').matches,motion=matchMedia('(prefers-reduced-motion: reduce)');
 let adaptive=quality==='auto',low=quality==='low'||adaptive&&(mobile||software||navigator.hardwareConcurrency<=4);
 let disposed=false,paused=true,dirty=true,raf=0,last=0,elapsed=0,age=0,stage=null,curves,root,wall,cells,gas,extras;
 let distance=.16,ready=false,flight=null,mode='loading',hover=-1,fps=60,slow=0,reportAt=0,entry=0;
 const cache=new Map(),persistent=new Set(),pickPlanes=[],markers=[],anchors=[];
 const scene=new T.Scene();scene.background=new T.Color(0x2d0d14);
 const camera=new T.PerspectiveCamera(68,1,.025,500);
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 renderer.shadowMap.type=T.PCFSoftShadowMap;
 scene.add(new T.HemisphereLight(0xf9beaa,0x51101d,.7));
 const key=new T.SpotLight(0xffccb1,1.6,100,Math.PI*.38,.8,0);key.shadow.mapSize.set(512,512);key.shadow.bias=-.0003;scene.add(key,key.target);
 const fill=new T.PointLight(0xf6b9a0,.15,100,0);scene.add(fill);
 const depth=new T.PointLight(0xffbba2,.45,100,0);scene.add(depth);
 const cellGeo=cellGeometry('low');persistent.add(cellGeo);
 const cellMat=new T.MeshPhysicalMaterial({color:0xffffff,roughness:.48,metalness:0,ior:1.3,specularIntensity:.3,clearcoat:.1});
 const dummy=new T.Object3D(),q=new T.Quaternion(),v=new T.Vector3(),pos=new T.Vector3(),tangent=new T.Vector3();
 const highRed=new T.Color(0xcb303b),lowRed=new T.Color(0x792336),colour=new T.Color();
 const seeds=Array.from({length:44},(_,i)=>({u:(i*.6180339887)%1,angle:i*2.39996,radial:.18+((i*13.73)%1)*.58,spin:i*.41}));
 const raycaster=new T.Raycaster(),ndc=new T.Vector2();
 const local=p=>root.localToWorld(p.clone());
 const projected=p=>{const a=local(p).project(camera);return {x:(a.x+1)*50,y:(1-a.y)*50};};
 function render(){if(root&&!disposed)renderer.render(scene,camera);}
 function resize(){if(disposed)return;const box=canvas.getBoundingClientRect();if(!box.width||!box.height)return;renderer.setSize(box.width,box.height,false);camera.aspect=box.width/box.height;camera.fov=camera.aspect<.75?100:68;camera.updateProjectionMatrix();dirty=true;}
 const observer=new ResizeObserver(resize);observer.observe(canvas);
 const lost=e=>{e.preventDefault();paused=true;onError('Forbindelsen til grafikkortet blev afbrudt. Genindlæs spillet. Dine gemte resultater bevares.');};canvas.addEventListener('webglcontextlost',lost);
 function disposeTree(tree){
  const geos=new Set(),mats=new Set();tree.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry&&!persistent.has(o.geometry))geos.add(o.geometry);if(o.material&&o.material!==cellMat)mats.add(o.material);});
  geos.forEach(g=>g.dispose());mats.forEach(m=>{m.userData.ownedTextures?.forEach(t=>t.dispose());m.dispose();});
 }
 async function prepare(s,next){
  if(disposed)return null;const visual=s.profile?s:visualAnatomy(s,next),detail=low?'low':'high',id=visual.cacheKey+':'+visual.entry.toFixed(2)+':'+detail;
  if(!cache.has(id))cache.set(id,(async()=>{const c=anatomyCurves(visual),g=visual.branch?await vesselGeometry(visual,c,detail):lumenGeometry(visual,c.parent,detail);if(disposed){g.dispose();return null;}persistent.add(g);return {curves:c,geometry:g,quality:detail};})());
  return cache.get(id);
 }
 function move(point,direction,snap=false){camera.position.copy(local(point));q.setFromUnitVectors(forward,direction.clone().applyQuaternion(root.quaternion).normalize());if(snap||motion.matches)camera.quaternion.copy(q);else camera.quaternion.slerp(q,.16);}
 function onCurve(u,snap=false){canvas.dataset.cameraU=u.toFixed(4);move(curves.parent.getPointAt(u),curves.parent.getTangentAt(u),snap);}
 function drawCells(){
  const eye=root.worldToLocal(camera.position.clone()),cap=stage.cap;
  for(let i=0;i<cells.count;i++){
   const seed=seeds[i],branch=stage.branch&&i%3===0,curve=branch?curves.branches[i%2]:curves.parent;
   let u=(seed.u+elapsed*(cap?.022:stage.kind==='vein'?.035:.055))%1;
   // Erythrocytes remain upstream of a closed valve instead of crossing its cusps.
   if(stage.valve&&!motion.matches&&valveOpening(stage.valve,clock())<.8&&u>.68&&u<.8)u=.66-(i%3)*.015;
   pos.copy(curve.getPointAt(u));tangent.copy(curve.getTangentAt(u));
   const size=cap?.63:.65+(i%4)*.08,r=branch?stage.radius*.6:lumenRadius(stage,u);
   const radial=cap?0:Math.max(0,r-size-.15)*seed.radial;
   pos.x+=Math.cos(seed.angle)*radial;pos.y+=Math.sin(seed.angle)*radial*(stage.kind==='right-ventricle'?.8:1);
   dummy.position.copy(pos);dummy.quaternion.setFromUnitVectors(forward,tangent);
   q.setFromAxisAngle(v.set(cap?0:1,cap?1:.4,0).normalize(),cap?Math.sin(elapsed*.3+i)*.2:seed.spin+elapsed*.12);dummy.quaternion.multiply(q);
   const sizeVisible=pos.distanceTo(eye)<(cap?1.8:2.8)?0:size;
   dummy.scale.set(sizeVisible*(cap?.81:1),sizeVisible*(cap?.94:1),sizeVisible*(cap?1.35:1));dummy.updateMatrix();cells.setMatrixAt(i,dummy.matrix);cells.setColorAt(i,colour.lerpColors(lowRed,highRed,oxygenAt(stage,u)));
  }
  cells.instanceMatrix.needsUpdate=true;cells.instanceColor.needsUpdate=true;
  if(gas){for(let i=0;i<gas.count;i++){const f=motion.matches?.55:(elapsed*.2+i*.123)%1,u=.25+(i%5)*.12,c=curves.parent.getPointAt(u),a=i*2.3999,r=gasRadius(stage,i%2===0,f);dummy.position.copy(c).add(v.set(Math.cos(a)*r,Math.sin(a)*r,0));dummy.quaternion.identity();dummy.scale.setScalar(stage.radius*.04);dummy.updateMatrix();gas.setMatrixAt(i,dummy.matrix);}gas.instanceMatrix.needsUpdate=true;}
 }
 function applyQuality(){renderer.setPixelRatio(Math.min(devicePixelRatio||1,low?(software?.5:1):1.5));renderer.shadowMap.enabled=!low;key.castShadow=!low;if(cells){cells.castShadow=!low;cells.count=stage.cap?8:low?24:44;}if(wall)wall.receiveShadow=!low;resize();}
 async function enter(s,next,{reset=false}={}){
  const token=++entry,visual=visualAnatomy(s,next),oldPoint=root&&!reset?camera.position.clone():null,oldDir=root&&!reset?forward.clone().applyQuaternion(camera.quaternion):null;
  if(stage&&!reset)visual.entry=lumenRadius(stage,.94);
  mode='loading';ready=false;flight=null;const built=await prepare(visual,next);if(disposed||token!==entry||!built)return;
  if(root){scene.remove(root);disposeTree(root);}pickPlanes.length=0;markers.length=0;anchors.length=0;
  stage=visual;curves=built.curves;age=0;distance=.16;hover=-1;dirty=true;root=new T.Group();scene.add(root);
  const material=wallMaterial(stage.cap,stage.radius);material.color.set(stage.cap?0xb06870:stage.chamber?0x793542:stage.kind==='vein'?0x874652:0x9c4447);
  if(stage.cap&&stage.profile.pulmonary)material.opacity=.4;
  wall=new T.Mesh(built.geometry,material);root.add(wall);
  if(oldPoint){root.quaternion.setFromUnitVectors(curves.parent.getTangentAt(distance),oldDir);root.position.copy(oldPoint).sub(curves.parent.getPointAt(distance).applyQuaternion(root.quaternion));}root.updateMatrixWorld(true);
  cells=new T.InstancedMesh(cellGeo,cellMat,44);cells.count=stage.cap?8:low?24:44;cells.instanceMatrix.setUsage(T.DynamicDrawUsage);cells.frustumCulled=false;root.add(cells);
  extras=addAnatomy(root,stage,curves,low);gas=null;
  if(stage.cap){const mat=new T.MeshStandardMaterial({color:0xffffff,roughness:.65,emissive:0x271a10,emissiveIntensity:.1});gas=new T.InstancedMesh(new T.SphereGeometry(1,8,6),mat,low?16:24);for(let i=0;i<gas.count;i++)gas.setColorAt(i,new T.Color(i%2?0xd0d1c6:0xf4d3a0));root.add(gas);}
  for(let i=0;i<2;i++){
   const center=stage.branch?curves.branches[i].getPointAt(.23):curves.parent.getPointAt(.68).add(v.set((i?1:-1)*stage.radius*.48,0,0));anchors.push(center);
   const plane=new T.Mesh(new T.PlaneGeometry(stage.radius*.7,stage.radius*.85),new T.MeshBasicMaterial({visible:false,side:T.DoubleSide}));plane.position.copy(center);plane.userData.side=i;root.add(plane);pickPlanes.push(plane);
   if(!stage.branch){const marker=new T.Mesh(new T.ConeGeometry(stage.radius*.08,stage.radius*.24,6),new T.MeshStandardMaterial({color:0xd9bba2,roughness:.6,transparent:true,opacity:.65}));marker.rotation.x=-Math.PI/2;marker.position.copy(center);root.add(marker);markers.push(marker);}
  }
  scene.fog=new T.FogExp2(stage.cap?0x42262a:0x300c14,.035/stage.radius);
  key.distance=stage.radius*25;key.shadow.camera.far=stage.radius*25;fill.distance=stage.radius*15;fill.intensity=stage.chamber?.35:.15;depth.distance=stage.radius*18;
  camera.far=stage.radius*40;camera.updateProjectionMatrix();onCurve(distance,true);
  canvas.dataset.stage=s.id;canvas.dataset.meshQuality=built.quality;canvas.dataset.shape=stage.shape;canvas.dataset.valve=stage.valve?.id||'';canvas.dataset.chordae=String(extras.valve?.group.userData.chordae||0);canvas.dataset.leaflets=String(extras.valve?.group.userData.leafletCount||0);canvas.dataset.pulmonary=String(stage.profile.pulmonary);
  mode='approach';applyQuality();wake();
 }
 function advanceFlight(dt){
  const f=flight;f.age+=dt;
  if(!f.ok){onCurve(f.from+Math.sin(Math.min(1,f.age/.7)*Math.PI)*.025);if(f.age>=.7)completeFlight();return;}
  if(stage.valve){
   if(f.age<.55){onCurve(T.MathUtils.lerp(f.from,.67,ease(f.age/.55)));return;}
   if(f.crossStart===null){const t=valveTransit(stage.valve,clock());f.crossStart=clock()+t.wait;f.crossDuration=t.duration;}
   const crossing=(clock()-f.crossStart)/f.crossDuration;
   if(crossing<0){onCurve(.67);return;}
   if(crossing<=1){const u=T.MathUtils.lerp(.67,.79,ease(crossing));onCurve(u);if(u>=.73)f.crossed=true;return;}
   // If a slow GPU skipped the open window, wait for the next beat rather
   // than jumping through closed cusps. The camera must cross on an open frame.
   if(!f.crossed){f.crossStart=null;onCurve(.67);return;}
   const after=(clock()-f.crossStart-f.crossDuration)/.55;onCurve(T.MathUtils.lerp(.79,.94,ease(Math.min(1,after))));if(after>=1)completeFlight();return;
  }
  const e=ease(Math.min(1,f.age/1.8));
  if(stage.branch){if(e<.28)onCurve(T.MathUtils.lerp(f.from,1,e/.28));else{const u=(e-.28)/.72*.83;move(curves.branches[f.side].getPointAt(u),curves.branches[f.side].getTangentAt(u));}}
  else{const u=T.MathUtils.lerp(f.from,.94,e),p=curves.parent.getPointAt(u);p.x+=Math.sin(Math.PI*e)*(f.side?1:-1)*stage.radius*.22;move(p,curves.parent.getTangentAt(u));}
  if(f.age>=1.8)completeFlight();
 }
 function completeFlight(){const done=flight.done;flight=null;mode='waiting';done();}
 function tick(timestamp){
  if(disposed)return;raf=0;const realDt=last?(timestamp-last)/1000:0,dt=Math.min(.12,realDt);last=timestamp;
  if(root&&!document.hidden){
   if(!paused&&!motion.matches){elapsed+=dt;age+=dt;}
   if(!paused&&mode==='approach'){
    const stop=stage.branch?.92:.57;
    if(motion.matches)distance=stop;else distance=Math.min(stop+.012,distance+dt*(distance<stop?(stage.cap?.08:.14):.001));
    onCurve(distance);if(distance>=stop&&!ready){ready=true;onReady();}
   }else if(!paused&&flight)advanceFlight(dt);
   const time=motion.matches||paused?0:clock(),cycle=cardiacCycle(time);
   const pulse=motion.matches||paused?0:stage.chamber?-(stage.kind==='atrium'?cycle.atrialContraction*.025:cycle.contraction*.045):stage.profile.sound.pulse*cycle.contraction*.02;
   wall.scale.set(1+pulse,1+pulse,1);extras.group.scale.set(1+pulse,1+pulse,1);
   const dir=forward.clone().applyQuaternion(camera.quaternion);key.position.copy(camera.position).addScaledVector(up,stage.radius*.2);key.target.position.copy(camera.position).addScaledVector(dir,stage.radius*8);fill.position.copy(camera.position).addScaledVector(dir,-stage.radius*.5);depth.position.copy(local(curves.parent.getPointAt(.86)));
   markers.forEach((m,i)=>{m.material.opacity=i===hover?1:.65;});
   if(!paused&&!motion.matches||dirty){drawCells();extras.update(time,motion.matches||paused);render();dirty=false;}
   canvas.dataset.distance=distance.toFixed(3);canvas.dataset.valveOpening=String(stage.valve?(motion.matches||paused?1:valveOpening(stage.valve,time)):0);
   if(timestamp-reportAt>250){if(realDt>0)fps=fps*.8+Math.min(60,1/realDt)*.2;reportAt=timestamp;if(adaptive&&!low&&fps<28&&++slow>16){low=true;applyQuality();}}
   onFrame({ready,age,anchors:anchors.map(projected),fps:motion.matches||paused?0:fps,quality:low?'Let':'Høj',triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls});
  }
  if(!document.hidden)raf=requestAnimationFrame(tick);
 }
 function wake(){last=0;dirty=true;if(!disposed&&!raf&&!document.hidden)raf=requestAnimationFrame(tick);}
 document.addEventListener('visibilitychange',wake);motion.addEventListener('change',wake);
 applyQuality();
 return {enter,prepare,
  pause(value){paused=value;dirty=true;},
  highlight(side){if(side!==hover){hover=side;dirty=true;}},
  pick(x,y){if(!ready||mode!=='approach')return -1;const box=canvas.getBoundingClientRect();ndc.set((x-box.left)/box.width*2-1,-(y-box.top)/box.height*2+1);raycaster.setFromCamera(ndc,camera);root.updateMatrixWorld(true);return raycaster.intersectObjects(pickPlanes)[0]?.object.userData.side??-1;},
  travel(side,ok,done){if(mode!=='approach'||!ready||paused)return false;ready=false;if(motion.matches){onCurve(ok?.94:distance,true);mode='waiting';done();return true;}flight={side,ok,done,age:0,from:distance,crossStart:null,crossDuration:0};mode='travel';return true;},
  resumeChoice(){mode='approach';ready=true;},
  setQuality(value){adaptive=value==='auto';slow=0;low=value==='low'||adaptive&&(mobile||software||navigator.hardwareConcurrency<=4);applyQuality();if(stage){const requested=stage;void prepare(stage,stage.valve).then(built=>{if(built&&!disposed&&stage===requested&&built.quality===(low?'low':'high')){wall.geometry=built.geometry;canvas.dataset.meshQuality=built.quality;dirty=true;}}).catch(()=>onError('Grafikken kunne ikke opdateres. Genindlæs spillet.'));}},
  dispose(){disposed=true;entry++;cancelAnimationFrame(raf);observer.disconnect();document.removeEventListener('visibilitychange',wake);motion.removeEventListener('change',wake);canvas.removeEventListener('webglcontextlost',lost);if(root)disposeTree(root);persistent.forEach(g=>g.dispose());cellMat.dispose();renderer.dispose();renderer.forceContextLoss();},
 };
}
