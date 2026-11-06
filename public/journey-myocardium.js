import * as T from './three.module.min.js';
const TAU=2*Math.PI,clamp=T.MathUtils.clamp;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const random=(i,j)=>{const n=Math.sin(i*127.1+j*311.7+19.3)*43758.5453;return n-Math.floor(n);};
export const TRABECULAR_PROFILES={
 // Coarseness is not myocardial wall thickness: LV has the thicker compact
 // wall, but its normal trabeculae are generally finer than those of the RV.
 right:{columns:10,spacing:.78,width:.14,height:.105},
 left:{columns:15,spacing:.62,width:.095,height:.065},
};
/** Connected irregular ridge network in periodic wall coordinates. Relief is
 * an inward displacement of ONE continuous endocardial mesh, never holes
 * through myocardium or floating cylinders. t spans the ventricular region.
 */
export function trabecularField(side='right',aspect=4){
 const profile=TRABECULAR_PROFILES[side],cols=profile.columns,rows=Math.ceil(aspect/profile.spacing),nodes=[],segments=[];
 for(let j=0;j<=rows;j++)for(let i=0;i<cols;i++)nodes.push({a:TAU*(i+.27*(random(i,j)-.5)+.22*(j%2))/cols,t:(j+(j&&j<rows?.25*(random(j,i)-.5):0))/rows});
 const at=(i,j)=>nodes[j*cols+(i+cols)%cols];
 function join(a,b,width){
  let dx=b.a-a.a;if(dx>Math.PI)dx-=TAU;if(dx<-Math.PI)dx+=TAU;const dy=(b.t-a.t)*aspect,length=Math.hypot(dx,dy),bend=.13*Math.sin(a.a*7+b.t*19);
  const point=t=>({a:a.a+dx*t-dy/length*bend*Math.sin(Math.PI*t),y:a.t*aspect+dy*t+dx/length*bend*Math.sin(Math.PI*t)});
  for(let i=0;i<4;i++){const p=point(i/4),q=point((i+1)/4),sx=q.a-p.a,sy=q.y-p.y;segments.push({a:p.a,y:p.y,dx:sx,dy:sy,l2:sx*sx+sy*sy,width,minY:Math.min(p.y,q.y)-width*3,maxY:Math.max(p.y,q.y)+width*3});}
 }

 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
  const width=profile.width*(.80+.35*random(i+37,j));
  join(at(i,j),at(i+(j%2?0:1),j+1),width);
  // Uneven cross-connections create branching ridges and blind intertrabecular
  // recesses; avoid a regular ladder or a uniform honeycomb pattern.
  if(random(i+7,j)>.27)join(at(i,j),at(i+(j%2?-1:0),j+1),width*.76);
  if(random(i,j+42)>.75)join(at(i,j),at(i+1,j),width*.70);
 }
 function sample(angle,t){
  if(t<=0||t>=1)return 0;const a=((angle%TAU)+TAU)%TAU,y=t*aspect;let remaining=1;
  for(const s of segments){
   if(y<s.minY||y>s.maxY)continue;
   let x=a-s.a;if(x>Math.PI)x-=TAU;if(x<-Math.PI)x+=TAU;
   const f=clamp((x*s.dx+(y-s.y)*s.dy)/s.l2,0,1),dist2=(x-f*s.dx)**2+(y-s.y-f*s.dy)**2;
   if(dist2>s.width*s.width*9)continue;
   remaining*=1-Math.exp(-dist2/(s.width*s.width));
  }
  return profile.height*(1-remaining)*smooth(0,.16,t)*(1-smooth(.84,1,t));
 }
 return {sample,profile,nodes,segments};
}
/** Smooth normals across a duplicated periodic mesh seam. */
export function smoothWallSeam(geometry,rows,columns){
 geometry.computeVertexNormals();const n=geometry.attributes.normal,v=new T.Vector3();
 for(let j=0;j<=rows;j++){const a=j*(columns+1),b=a+columns;v.set(n.getX(a)+n.getX(b),n.getY(a)+n.getY(b),n.getZ(a)+n.getZ(b)).normalize();n.setXYZ(a,v.x,v.y,v.z);n.setXYZ(b,v.x,v.y,v.z);}
 geometry.computeBoundingSphere();return geometry;
}
// Shared tissue material for trabeculated walls and papillary muscles. Original
// tiny periodic endocardial microtexture; ridge shape comes from real geometry.
export function myocardiumMaterial(){
 const size=64,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const a=x/size*TAU,b=y/size*TAU,n=128+20*Math.sin(a*8+1.6*Math.sin(b*3))+10*Math.sin(b*13+a*3),i=(y*size+x)*4;
  data[i]=data[i+1]=data[i+2]=n;data[i+3]=255;
 }
 const texture=new T.DataTexture(data,size,size);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
 const material=new T.MeshStandardMaterial({color:0xad5358,roughness:.48,vertexColors:true,side:T.DoubleSide,bumpMap:texture,bumpScale:.006,metalness:0});material.userData.ownedTextures=[texture];return material;
}

// A few short trabecular bridges are attached at BOTH ends to the ventricular
// wall. Their free middle spans a shallow recess, never the central flow path.
export function trabecularBridges(surface,side,scale,material){
 const group=new T.Group();group.name='trabecular-bridges';
 const locations=side==='right'?[[.4,.29,.92,.52],[2.7,.48,3.22,.70],[4.5,.30,4.95,.54]]:[[1.8,.38,2.21,.60]];
 for(const [a0,t0,a1,t1]of locations){
  const width=scale*(side==='right'?.035:.025),points=[];
  for(let j=0;j<=16;j++){
   const f=j/16,{point,outward}=surface(T.MathUtils.lerp(a0,a1,f),T.MathUtils.lerp(t0,t1,f));
   points.push(point.clone().addScaledVector(outward,width*.8-scale*.13*Math.sin(Math.PI*f)**2));
  }
  const curve=new T.CatmullRomCurve3(points),geometry=new T.TubeGeometry(curve,32,width,10,false);
  geometry.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*3).fill(.95),3));
  const bridge=new T.Mesh(geometry,material);bridge.name='trabecular-bridge';bridge.userData.attachments=[surface(a0,t0).point,surface(a1,t1).point];bridge.userData.centers=points;bridge.userData.width=width;group.add(bridge);
 }
 return group;
}
