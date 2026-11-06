import * as T from './three.module.min.js';
const TAU=Math.PI*2,V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),lerp=T.MathUtils.lerp;
// Local coordinates: upstream +Z, ventricular/arterial outflow -Z. These are
// original teaching meshes, not patient scans or a fluid/solid mechanics model.
export const VALVE_ANATOMY={
 tricuspid:{type:'av',names:['Anterior','Posterior','Septal'],angles:[-.35,2.10,3.93,TAU-.35],saddle:.09,ellipse:.91,papillary:['Anterior','Posterior','Septal'],muscle:.065},
 mitral:{type:'av',names:['Anterior','Posterior'],angles:[0,Math.PI,TAU],saddle:.16,ellipse:.79,papillary:['Anterolateral','Posteromedial'],muscle:.12},
 pulmonaryValve:{type:'semilunar',names:['Anterior','Højre','Venstre'],angles:[-Math.PI/2,Math.PI/6,5*Math.PI/6,3*Math.PI/2],sinus:.13},
 aorticValve:{type:'semilunar',names:['Højre koronarflig','Venstre koronarflig','Non-koronarflig'],angles:[-Math.PI/6,Math.PI/2,7*Math.PI/6,11*Math.PI/6],sinus:.23,ostia:[0,1]},
 venousValve:{type:'venous',names:['Flig 1','Flig 2'],angles:[0,Math.PI,TAU],ellipse:1,saddle:0},
};
function annulus(d,a){
 const x=Math.cos(a);let y=Math.sin(a)*(d.ellipse||1);
 if(d===VALVE_ANATOMY.tricuspid)y=Math.max(y,-.77); // less mobile septal attachment
 // Saddle-shaped mitral annulus, gently flattened along the anterior hinge.
 return V(x,d===VALVE_ANATOMY.mitral&&y>0?y*.84:y,(d.saddle||0)*Math.cos(2*a));
}
export function sinusRadius(id,angle,z){
 const d=VALVE_ANATOMY[id],v=T.MathUtils.clamp((.28-z)/1.35,0,1);
 const lobe=.5+.5*Math.cos(3*(angle-(d.angles[0]+Math.PI/3)));
 return 1+d.sinus*Math.sin(Math.PI*v)**2*lobe;
}
/** A leaflet patch between its fixed curved hinge and its deforming free edge.
 * u runs commissure-to-commissure; v runs hinge-to-free-edge. Shared endpoints
 * never detach. AV patches coapt along a line/Y; semilunar pockets along a Y.
 */
export function leafletPoint(id,k,u,v,opening){
 const d=VALVE_ANATOMY[id],a=lerp(d.angles[k],d.angles[k+1],u),hinge=annulus(d,a),edge=V(),open=T.MathUtils.clamp(opening,0,1);
 const start=annulus(d,d.angles[k]),end=annulus(d,d.angles[k+1]),belly=Math.sin(Math.PI*u);
 if(d.type==='semilunar'){
  // Three U-shaped insertions; the free margin lies downstream of the nadir.
  hinge.z=.20-.61*(1-belly);
  const rootRadius=sinusRadius(id,a,hinge.z);hinge.x*=rootRadius;hinge.y*=rootRadius;
  const c=u<.5?start.clone().multiplyScalar(1-2*u):end.clone().multiplyScalar(2*u-1);
  edge.copy(c).lerp(V(Math.cos(a)*.94,Math.sin(a)*.94,0),open);edge.z=-.41-.045*belly*(1-open);
  const p=hinge.clone().lerp(edge,v),bulge=(.22*(1-open)+.025)*Math.sin(Math.PI*v)*belly;
  p.x+=Math.cos(a)*bulge;p.y+=Math.sin(a)*bulge;
  return p;
 }
 if(id==='mitral'){
  // Both leaflets meet at the SAME curved coaptation line. The broad anterior
  // leaflet covers more area; the posterior margin has three subtle scallops.
  edge.copy(start).lerp(end,u);edge.y=-.17*belly;edge.z=-.13*belly;
 }else{
  edge.copy(u<.5?start:end).multiplyScalar(Math.abs(2*u-1));edge.z=-.13*belly;
 }
 const unfolded=hinge.clone().multiplyScalar(.77);unfolded.z=hinge.z-1.02*belly;
 // Commissures stay fixed. All leaflet motion remains on the downstream side.
 unfolded.lerp(hinge,1-belly);edge.lerp(unfolded,open);
 const p=hinge.clone().lerp(edge,v);
 p.z-=(.12*(1-open)+.065)*Math.sin(Math.PI*v)*belly;
 if(id==='mitral'&&k===1)p.z-=.045*Math.sin(u*Math.PI*3)**2*Math.sin(Math.PI*v);
 return p;
}
function patch(rows,cols,point){
 const xyz=[],indices=[],uv=[];
 for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){xyz.push(...point(i/cols,j/rows).toArray());uv.push(i/cols,j/rows);}
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+cols+1;indices.push(a,b,a+1,b,b+1,a+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(xyz,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function tube(points,radius,material,closed=false){return new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points,closed),points.length*2,radius,5,closed),material);}
export function createValve(s,radius){
 const d=VALVE_ANATOMY[s.id];if(!d)throw Error(`Unknown valve: ${s.id}`);
 const group=new T.Group();group.name=s.id;group.scale.setScalar(radius);
 const av=d.type==='av',semi=d.type==='semilunar',rows=10,cols=24,leaves=[];
 // Small original collagen texture: no downloads and no extra model payload.
 const pixels=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const n=128+25*Math.sin(x*.8+2*Math.sin(y*.25))+9*Math.sin(y*1.7+x*.4),i=(y*64+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=n;pixels[i+3]=255;}
 const collagen=new T.DataTexture(pixels,64,64);collagen.wrapS=collagen.wrapT=T.RepeatWrapping;collagen.needsUpdate=true;
 const tissue=new T.MeshStandardMaterial({color:0xd9b5a0,roughness:.56,side:T.DoubleSide,metalness:0,bumpMap:collagen,bumpScale:.012});tissue.userData.ownedTextures=[collagen];
 const edgeMat=new T.MeshStandardMaterial({color:0xe5c8ad,roughness:.66});
 const muscle=new T.MeshStandardMaterial({color:s.id==='mitral'?0x9e4d53:0x8f4c57,roughness:.82,side:T.DoubleSide});
 // A thin fibrous hinge follows the actual nonplanar annulus / scalloped roots.
 for(let k=0;k<d.names.length;k++){
  const hinge=Array.from({length:33},(_,i)=>leafletPoint(s.id,k,i/32,0,0));
  const attachment=tube(hinge,.018,edgeMat);attachment.name='hinge-'+d.names[k];group.add(attachment);
  const geometry=patch(rows,cols,(u,v)=>leafletPoint(s.id,k,u,v,0));
  const mesh=new T.Mesh(geometry,tissue);mesh.name='leaflet-'+d.names[k];mesh.userData.leaflet=k;mesh.frustumCulled=false;group.add(mesh);leaves.push(mesh);
 }
 // Free-edge curves are fine 3D cords, not thick rimmed disks. One instanced
 // mesh draws all edges, secondary chordae and papillary attachments.
 const chordLinks=[],papillary=[],edgeSegments=d.names.length*cols;
 if(av){
  for(let k=0;k<d.papillary.length;k++){
   const a=d.angles[k],tip=V(Math.cos(a)*.66,Math.sin(a)*.64,-1.37),base=V(Math.cos(a)*1.01,Math.sin(a)*.99,-2.12);
   const size=s.id==='mitral'?.18:k===2?.10:.15;
   const pm=new T.Mesh(new T.ConeGeometry(size,base.distanceTo(tip),12,4),muscle);
   pm.position.copy(base).lerp(tip,.5);pm.quaternion.setFromUnitVectors(V(0,1,0),tip.clone().sub(base).normalize());pm.name='papillary-'+d.papillary[k];group.add(pm);
   papillary.push({tip,base,mesh:pm});
   // Each papillary group supports BOTH adjacent leaflets, including both
   // mitral leaflets. Primary marginal and secondary basal insertions fan out.
   for(const [leaf,fromStart]of[[k,true],[(k+d.names.length-1)%d.names.length,false]])for(const u of [.15,.29,.42]){
    chordLinks.push({muscle:k,leaf,u:fromStart?u:1-u,v:1});
    chordLinks.push({muscle:k,leaf,u:fromStart?u:1-u,v:.76});
   }
  }
  // Ventricular cuff and longitudinal trabeculae connect the muscle bases to
  // the wall. Left-sided relief is thicker; no support apparatus on semilunars.
  const cuff=patch(18,64,(u,v)=>{const a=u*TAU,hinge=annulus(d,a),r=1.04+.035*Math.sin(a*7+v*9),w=Math.min(1,v*4);return V(lerp(hinge.x,Math.cos(a)*r,w),lerp(hinge.y,Math.sin(a)*r,w),hinge.z*(1-w)-v*2.5);});
  const wall=new T.Mesh(cuff,muscle);wall.name='ventricular-wall';group.add(wall);
  for(let k=0;k<(s.id==='mitral'?14:10);k++){
   const a=k*2.39996,points=Array.from({length:8},(_,i)=>{const z=-.75-i*.23,b=a+.035*Math.sin(i);return V(Math.cos(b)*1.015,Math.sin(b)*1.015,z);});
   const ridge=tube(points,d.muscle,muscle);ridge.name='trabecula';group.add(ridge);
  }
 }
 if(semi){
  // Three separate sinus bulges between the annulus and sinotubular junction.
  const root=patch(24,72,(u,v)=>{const a=u*TAU,z=.28-v*1.35,r=sinusRadius(s.id,a,z);return V(Math.cos(a)*r,Math.sin(a)*r,z);});
  const rootWall=new T.Mesh(root,new T.MeshStandardMaterial({color:s.id==='aorticValve'?0xad625c:0xa77372,roughness:.74,side:T.DoubleSide}));rootWall.name='sinus-root';group.add(rootWall);
  // Only the two coronary sinuses have ostia. Small dark lumens are recessed
  // into the root wall, not selectable routes. No ostium on the noncoronary cusp.
  for(const k of d.ostia||[]){
   const a=(d.angles[k]+d.angles[k+1])/2,r=sinusRadius(s.id,a,-.58)-.008,position=V(Math.cos(a)*r,Math.sin(a)*r,-.58);
   const ostium=new T.Group();ostium.name='coronary-ostium-'+k;ostium.position.copy(position);ostium.quaternion.setFromUnitVectors(V(0,0,1),V(-Math.cos(a),-Math.sin(a),0));
   const rim=new T.Mesh(new T.TorusGeometry(.075,.012,6,18),edgeMat);rim.scale.y=.8;ostium.add(rim);
   const hole=new T.Mesh(new T.CircleGeometry(.069,18),new T.MeshBasicMaterial({color:0x2b1018,side:T.DoubleSide}));hole.scale.y=.8;hole.position.z=-.003;ostium.add(hole);group.add(ostium);
  }
 }
 const threadMesh=new T.InstancedMesh(new T.CylinderGeometry(1,1,1,5),edgeMat,edgeSegments+chordLinks.length);threadMesh.frustumCulled=false;threadMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);group.add(threadMesh);
 const dummy=new T.Object3D(),direction=V(),mid=V();
 function segment(i,a,b,width){direction.copy(b).sub(a);dummy.position.copy(mid.copy(a).add(b).multiplyScalar(.5));dummy.quaternion.setFromUnitVectors(V(0,1,0),direction.clone().normalize());dummy.scale.set(width,direction.length(),width);dummy.updateMatrix();threadMesh.setMatrixAt(i,dummy.matrix);}
 let last=-1,lastContraction=-1;
 function update(open,contraction=0){
  open=T.MathUtils.clamp(open,0,1);const deform=Math.abs(last-open)>=.0001;if(!deform&&Math.abs(lastContraction-contraction)<.001)return;last=open;lastContraction=contraction;
  for(const p of papillary){
   p.activeTip=p.tip.clone().lerp(p.base,.065*contraction);
   p.mesh.position.copy(p.base).lerp(p.activeTip,.5);p.mesh.scale.y=1-.065*contraction;
  }
  let thread=deform?0:edgeSegments;
  if(deform)for(let k=0;k<leaves.length;k++){
   const g=leaves[k].geometry,p=g.attributes.position;
   for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const a=leafletPoint(s.id,k,i/cols,j/rows,open);p.setXYZ(j*(cols+1)+i,a.x,a.y,a.z);}
   p.needsUpdate=true;g.computeVertexNormals();
   for(let i=0;i<cols;i++)segment(thread++,leafletPoint(s.id,k,i/cols,1,open),leafletPoint(s.id,k,(i+1)/cols,1,open),.006);
  }
  for(const link of chordLinks){const tip=papillary[link.muscle].activeTip,target=leafletPoint(s.id,link.leaf,link.u,link.v,open);segment(thread++,tip,target,.0065);}
  threadMesh.instanceMatrix.needsUpdate=true;
 }
 group.userData={leafletCount:leaves.length,chordae:chordLinks.length,papillaryCount:papillary.length,leafletNames:d.names,ostia:d.ostia?.length||0};
 update(0);return {group,update,definition:s,leaves,papillary,chordLinks};
}
