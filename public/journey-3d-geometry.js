import * as T from './three.module.min.js';
const V=(x,y,z)=>new T.Vector3(x,y,z);
export function makeCurves(radius,capillary=false){
 const r=radius;
 const parent=new T.CatmullRomCurve3([V(0,0,3*r),V(.22*r,.1*r,-r),V(.12*r,-.06*r,-3*r),V(-.18*r,.06*r,-5*r),V(-.1*r,0,-7*r)]);
 const branches=[-1,1].map(side=>new T.CatmullRomCurve3([parent.getPoint(1),V(side*(side<0?1.2:.85)*r,side*.08*r,-9*r),V(side*(side<0?3.4:2.5)*r,side*.22*r,-12*r),V(side*(side<0?5.8:4.9)*r,side*.35*r,-18*r)]));
 const cap=new T.CatmullRomCurve3([V(0,0,3*r),V(.12*r,.06*r,-3*r),V(-.35*r,.13*r,-8*r),V(.25*r,-.1*r,-14*r),V(.6*r,.1*r,-22*r)]);
 return {parent:capillary?cap:parent,branches:capillary?[]:branches};
}
export function cellGeometry(quality='high'){
 const radial=quality==='low'?32:48,rings=quality==='low'?16:24,positions=[],indices=[];
 for(const side of [1,-1])for(let j=0;j<=rings;j++)for(let i=0;i<=radial;i++){
  const r=j/rings,a=i/radial*Math.PI*2;
  const h=.5*Math.sqrt(Math.max(0,1-r*r))*(.207+2.003*r*r-1.123*r**4);
  positions.push(Math.cos(a)*r,Math.sin(a)*r,side*h);
 }
 const stride=radial+1,offset=(rings+1)*stride;
 for(let side=0;side<2;side++)for(let j=0;j<rings;j++)for(let i=0;i<radial;i++){
  const a=side*offset+j*stride+i,b=a+1,c=a+stride,d=c+1;
  if(side===0)indices.push(a,c,b,b,c,d);else indices.push(a,b,c,b,d,c);
 }
 // Closed rim. Both radial surfaces share its positions after normal smoothing.
 for(let i=0;i<radial;i++){const a=rings*stride+i,b=offset+a;indices.push(a,a+1,b,b,a+1,b+1);}
 const unique=[],weld=new Map(),remap=[];for(let i=0;i<positions.length;i+=3){const key=positions.slice(i,i+3).map(v=>Math.round(v*1e5)).join(',');if(!weld.has(key)){weld.set(key,unique.length/3);unique.push(...positions.slice(i,i+3));}remap.push(weld.get(key));}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(unique,3));const clean=[];for(let i=0;i<indices.length;i+=3){const [a,b,c]=indices.slice(i,i+3).map(j=>remap[j]);if(a!==b&&a!==c&&b!==c)clean.push(a,b,c);}g.setIndex(clean);g.computeVertexNormals();return g;
}
function segments(curve,n,fromRadius,toRadius){
 const points=curve.getPoints(n);return points.slice(0,-1).map((a,i)=>{const b=points[i+1],d=b.clone().sub(a);return {a,d,l2:d.lengthSq(),r0:T.MathUtils.lerp(fromRadius,toRadius,i/n),dr:(toRadius-fromRadius)/n};});
}
// A smooth union of swept vessels is polygonised as one watertight Y wall.
// Unlike overlapping TubeGeometry objects it has open, connected branch lumens.
export async function vesselGeometry(stage,curves,quality='high'){
 const r=stage.radius,cap=stage.kind.includes('capillary');
 const seg=[...segments(curves.parent,cap?26:18,stage.entry,r*.88),...curves.branches.flatMap(c=>segments(c,20,r*.88,r*.6))];
 const step=r*(quality==='low'?.18:.12),min=V(cap?-2*r:-7*r,-2*r,cap?-21*r:-16.8*r),max=V(cap?2*r:7*r,2*r,2*r);
 const nx=Math.ceil((max.x-min.x)/step)+1,ny=Math.ceil((max.y-min.y)/step)+1,nz=Math.ceil((max.z-min.z)/step)+1,count=nx*ny*nz;
 const values=new Float32Array(count),gradient=new Float32Array(count*3),idx=(x,y,z)=>x+nx*(y+ny*z);
 const smooth=r*.22;
 function field(x,y,z){
  let value=1e9;
  for(const s of seg){const ax=x-s.a.x,ay=y-s.a.y,az=z-s.a.z,t=Math.max(0,Math.min(1,(ax*s.d.x+ay*s.d.y+az*s.d.z)/s.l2));const d=Math.hypot(ax-t*s.d.x,ay-t*s.d.y,az-t*s.d.z)-(s.r0+s.dr*t);
   // Smooth minimum only rounds the junction; it does not seal either branch.
   const h=Math.max(smooth-Math.abs(value-d),0)/smooth;value=Math.min(value,d)-h*h*smooth*.25;
  }return value;
 }
 for(let z=0;z<nz;z++){
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)values[idx(x,y,z)]=field(min.x+x*step,min.y+y*step,min.z+z*step);
  if(z%12===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  const i=idx(x,y,z)*3;
  gradient[i]=values[idx(Math.min(nx-1,x+1),y,z)]-values[idx(Math.max(0,x-1),y,z)];
  gradient[i+1]=values[idx(x,Math.min(ny-1,y+1),z)]-values[idx(x,Math.max(0,y-1),z)];
  gradient[i+2]=values[idx(x,y,Math.min(nz-1,z+1))]-values[idx(x,y,Math.max(0,z-1))];
 }
 const positions=[],normals=[],indices=[],cache=new Map();
 const corner=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
 const tetra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
 function vertex(a,b){
  const key=a<b?a*count+b:b*count+a;if(cache.has(key))return cache.get(key);
  const t=values[a]/(values[a]-values[b]),coords=i=>{const x=i%nx,y=Math.floor(i/nx)%ny,z=Math.floor(i/(nx*ny));return [min.x+x*step,min.y+y*step,min.z+z*step];};
  const pa=coords(a),pb=coords(b),n=positions.length/3;for(let k=0;k<3;k++){positions.push(pa[k]+(pb[k]-pa[k])*t);normals.push(gradient[a*3+k]+(gradient[b*3+k]-gradient[a*3+k])*t);}cache.set(key,n);return n;
 }
 function triangle(a,b,c){
  const p=i=>new T.Vector3().fromArray(positions,i*3),normal=new T.Vector3().fromArray(normals,a*3);
  if(p(b).sub(p(a)).cross(p(c).sub(p(a))).dot(normal)<0)indices.push(a,c,b);else indices.push(a,b,c);
 }
 for(let z=0;z<nz-1;z++){
  for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){
   const cube=corner.map(([dx,dy,dz])=>idx(x+dx,y+dy,z+dz));
   for(const tet of tetra){const inside=tet.map(i=>cube[i]).filter(i=>values[i]<0),outside=tet.map(i=>cube[i]).filter(i=>values[i]>=0);if(!inside.length||!outside.length)continue;
    if(inside.length===1){const v=outside.map(b=>vertex(inside[0],b));triangle(...v);}
    else if(inside.length===3){const v=inside.map(a=>vertex(a,outside[0]));triangle(...v);}
    else {const a=vertex(inside[0],outside[0]),b=vertex(inside[0],outside[1]),c=vertex(inside[1],outside[0]),d=vertex(inside[1],outside[1]);triangle(a,b,c);triangle(b,d,c);}
   }
  }
  if(z%12===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.normalizeNormals();const uv=[];for(let i=0;i<positions.length;i+=3)uv.push((positions[i]+positions[i+1]*.7)/(r*2),-positions[i+2]/(r*4)+positions[i+1]/(r*3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeBoundingSphere();return g;
}
export function wallMaterial(capillary=false,radius=1){
 const size=256,pixels=new Uint8Array(size*size*4),heights=new Uint8Array(size*size*4);
 const hash=(x,y,n)=>{const h=Math.sin(((x+n)%n)*127.1+((y+n)%n)*311.7)*43758.5453;return h-Math.floor(h);};
 const noise=(x,y,n)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return T.MathUtils.lerp(T.MathUtils.lerp(hash(ix,iy,n),hash(ix+1,iy,n),u),T.MathUtils.lerp(hash(ix,iy+1,n),hash(ix+1,iy+1,n),u),v);};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const n=.55*noise(x/16,y/32,16)+.3*noise(x/8,y/8,32)+.15*noise(x/4,y/4,64),i=(x+y*size)*4;
  pixels[i]=175+n*65;pixels[i+1]=132+n*60;pixels[i+2]=125+n*58;pixels[i+3]=255;
  heights[i]=heights[i+1]=heights[i+2]=Math.round(n*255);heights[i+3]=255;
 }
 const map=new T.DataTexture(pixels,size,size),bump=new T.DataTexture(heights,size,size);
 for(const texture of [map,bump]){texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;}
 map.colorSpace=T.SRGBColorSpace;
 const material=new T.MeshStandardMaterial({color:capillary?0xb06870:0x9c4447,map,bumpMap:bump,bumpScale:radius*.004,roughness:.58,metalness:0,side:T.BackSide,transparent:capillary,opacity:capillary?.83:1,depthWrite:true});
 material.userData.ownedTextures=[map,bump];return material;
}
