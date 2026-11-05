// Canvas tunnel renderer. It knows only visual structure/oxygen and camera motion.
// All hit targets, names and keyboard controls live in the accessible DOM layer.
export function mountJourneyScene(canvas,structure,{reduced=false,ambient=true}={}) {
 const ctx=canvas.getContext('2d');if(!ctx)return {dispose(){},travel(_side,_ok,done){done();}};
 let frame=0,disposed=false,last=0,clock=0,flight=null,width=0,height=0;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const isReduced=()=>reduced||motion.matches;
 const resize=()=>{const r=canvas.getBoundingClientRect();width=r.width;height=r.height;const d=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);ctx.setTransform(d,0,0,d,0,0);draw();};
 const observer=new ResizeObserver(resize);observer.observe(canvas);
 const ellipse=(x,y,rx,ry,fill,stroke,line=1)=>{ctx.beginPath();ctx.ellipse(x,y,Math.max(1,rx),Math.max(1,ry),0,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}};
 function cell(x,y,size,rotation,bright) {
  ctx.save();ctx.translate(x,y);ctx.rotate(rotation);
  const g=ctx.createRadialGradient(-size*.3,-size*.35,size*.1,0,0,size);g.addColorStop(0,bright?'#ff8c79':'#c96a70');g.addColorStop(.45,bright?'#b82632':'#812237');g.addColorStop(.72,bright?'#ee5351':'#aa3e50');g.addColorStop(1,'#450d20');
  ellipse(0,0,size,size*.6,g,'#fbb5a536',1);ellipse(0,-size*.02,size*.48,size*.25,'#3d0c2138');ctx.restore();
 }
 function draw() {
  if(disposed||!width||!height)return;
  const t=clock/1000,oxygen=structure.oxygen;
  const high=oxygen==='high'||(oxygen==='exchange-in'&&t>1.2)||(oxygen==='exchange-out'&&t<1.2);
  const flightProgress=flight?Math.min(1,(performance.now()-flight.start)/flight.duration):0;
  const ease=flightProgress*flightProgress*(3-2*flightProgress);
  const push=flight?(flight.ok?ease:.07*Math.sin(flightProgress*Math.PI)):0;
  const direction=flight?.side===0?-1:1;
  const cx=width/2-direction*width*.23*push*(1+push*3.8),cy=height*.47;
  ctx.fillStyle='#190d17';ctx.fillRect(0,0,width,height);
  ctx.save();ctx.translate(cx,cy);ctx.scale(1+push*3.8,1+push*3.8);ctx.translate(-width/2,-cy);
  const glow=ctx.createRadialGradient(width*.5,cy,8,width*.5,cy,width*.8);glow.addColorStop(0,'#160b13');glow.addColorStop(.4,high?'#792a39':'#4b1c31');glow.addColorStop(.72,high?'#c95555':'#8b3f50');glow.addColorStop(1,'#300c1d');ctx.fillStyle=glow;ctx.fillRect(-width,-height,width*3,height*3);
  const capillary=structure.kind.includes('capillary');
  const chamber=['atrium','right-ventricle','left-ventricle'].includes(structure.kind);
  const phase=isReduced()||!ambient?0:(t*.12)%1;
  // Perspective cross sections: narrow deep rings expand into the camera.
  for(let i=25;i>=0;i--) {
   const z=(i+phase)/26,scale=1/Math.max(.14,z*3+.16);
   const bend=structure.kind==='arch'?Math.sin(z*1.7)*width*.15:Math.sin(z*4+t*.14)*width*.025;
   const rx=width*.145*scale*(chamber?1.24:1),ry=height*.16*scale*(structure.kind.includes('ventricle')?1.35:1);
   ellipse(width/2+bend,cy+Math.sin(z*5)*height*.016,rx,ry,null,`rgba(${high?'245,130,122':'193,106,117'},${.035+.09*(1-z)})`,Math.max(2,7*scale));
  }
  // Longitudinal folds on the vessel wall; trabeculae in ventricular chambers.
  for(let i=0;i<18;i++) {
   const a=i*Math.PI/9;ctx.beginPath();ctx.moveTo(width/2+Math.cos(a)*width*.11,cy+Math.sin(a)*height*.12);
   ctx.bezierCurveTo(width/2+Math.cos(a+.08)*width*.28,cy+Math.sin(a+.08)*height*.32,width/2+Math.cos(a-.12)*width*.54,cy+Math.sin(a-.12)*height*.7,width/2+Math.cos(a)*width,cy+Math.sin(a)*height);
   ctx.strokeStyle=i%2?'#ffb3a314':'#180a2042';ctx.lineWidth=chamber?11:3;ctx.stroke();
  }
  if(chamber){
   const thick=structure.kind==='left-ventricle';ellipse(width/2,cy,width*.47,height*.45,null,thick?'#e9967e80':'#c47b7045',thick?35:12);
   if(structure.kind==='atrium'){ellipse(width*.5,cy,width*.37,height*.32,null,'#e4b2a545',3);}
  }
  // Organic central ridge hides the vanishing point: only two openings remain.
  const ridge=ctx.createLinearGradient(width*.43,0,width*.57,0);ridge.addColorStop(0,'#562333');ridge.addColorStop(.5,high?'#b6615b':'#854350');ridge.addColorStop(1,'#562333');
  ctx.beginPath();ctx.moveTo(width*.5,height*.27);ctx.bezierCurveTo(width*.52,height*.43,width*.65,height*.68,width*.67,height*1.2);ctx.lineTo(width*.33,height*1.2);ctx.bezierCurveTo(width*.35,height*.68,width*.48,height*.43,width*.5,height*.27);ctx.fillStyle=ridge;ctx.fill();
  // Two game-world route portals: pedagogical choices, not extra anatomical ostia.
  for(const side of [0,1]) {
   const x=width*(side===0?.27:.73),y=height*.51;
   const r=width<550?width*.205:width*.17;
   const g=ctx.createRadialGradient(x,y,4,x,y,r*1.35);g.addColorStop(0,'#160d17');g.addColorStop(.66,'#240c1c');g.addColorStop(.81,high?'#a74650':'#763545');g.addColorStop(1,'#ed9c8240');
   ellipse(x,y,r*1.12,height*.255,g,'#f1ab8b69',2);
   for(let j=5;j>0;j--)ellipse(x,y,r*(.17+j*.13),height*(.05+j*.034),null,`#e6a187${j%2?'23':'12'}`,2);
  }
  // Valve leaflets occupy the foreground; the camera passes their opening.
  const valve=structure.kind.startsWith('av-')||structure.kind==='semilunar';
  if(valve) {
   const semilunar=structure.kind==='semilunar',n=structure.kind==='av-two'?2:3;
   ellipse(width/2,cy,width*.44,height*.44,null,'#dfb8a571',5);
   for(let i=0;i<n;i++) {
    const a=i*2*Math.PI/n-Math.PI/2,r=width*.44,x=width/2+Math.cos(a)*r,y=cy+Math.sin(a)*height*.44;
    ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(width/2+Math.cos(a-.6)*r*.6,cy+Math.sin(a-.6)*height*.28,width/2+Math.cos(a)*width*.18,cy+Math.sin(a)*height*.2);ctx.quadraticCurveTo(width/2+Math.cos(a+.6)*r*.6,cy+Math.sin(a+.6)*height*.28,x,y);ctx.fillStyle=semilunar?'#dfb8a5b3':'#d79787b3';ctx.fill();ctx.strokeStyle='#f4d9bdc9';ctx.lineWidth=2;ctx.stroke();
    if(!semilunar){ellipse(x,y+height*.16,9,19,'#a65b59','#e29b874d');}
    if(!semilunar)for(let j=-1;j<=1;j++){ctx.beginPath();ctx.moveTo(width/2+Math.cos(a)*width*.2,cy+Math.sin(a)*height*.2);ctx.lineTo(x+j*14,y+height*.16);ctx.strokeStyle='#f4d8bd8c';ctx.lineWidth=1.5;ctx.stroke();}
   }
  }
  for(let i=0;i<(capillary?4:11);i++) {
   const z=((i*.093+(isReduced()||!ambient?0:t*.11))%1),sz=7+z*z*30;
   const x=width/2+Math.sin(i*7.3)*width*(capillary?.025:.07+z*.5),y=cy+Math.cos(i*3.2)*height*(.05+z*.48);
   cell(x,y,sz,i*.8+t*.07,high);
  }
  ctx.restore();
  // A subtle erythrocyte edge keeps the player embodied inside the vessel.
  cell(width*.5,height*1.025,width*.16,-.08,high);
  if(['exchange-in','exchange-out'].includes(oxygen)) {
   const inward=oxygen==='exchange-in';
   if(inward){
    // A transparent teaching window through the capillary wall shows alveolar air.
    for(let i=0;i<5;i++){const x=width*(.18+i*.16);ellipse(x,height*.12,width*.06,height*.065,'#ffebc01c','#f5d4b875',2);}
   }
   ctx.fillStyle='#fff2dc';ctx.font='600 15px system-ui';ctx.textAlign='center';
   ctx.fillText(inward?'ALVEOLE  →  O₂  →  HÆMOGLOBIN':'HÆMOGLOBIN  →  O₂  →  MUSKELVÆV',width/2,height*.84);
   ctx.font='12px system-ui';ctx.fillText(inward?'CO₂ bevæger sig fra blod til alveole':'CO₂ bevæger sig fra væv til blod',width/2,height*.89);
   for(let i=0;i<5;i++){const x=width*(.18+i*.16),f=isReduced()?.5:(t*.4+i*.2)%1;ellipse(x,height*(inward?.1+f*.13:.23-f*.13),4,4,'#ffe6ac');}
  }
  const vignette=ctx.createRadialGradient(width/2,cy,height*.15,width/2,cy,Math.max(width,height)*.75);vignette.addColorStop(0,'#00000000');vignette.addColorStop(1,'#120716c9');ctx.fillStyle=vignette;ctx.fillRect(0,0,width,height);
 }
 function tick(now) {
  if(disposed)return;frame=0;
  if(!document.hidden){if(now-last>=32||flight){clock+=last?Math.min(50,now-last):0;last=now;draw();}
   if(flight&&now-flight.start>=flight.duration){const done=flight.done;flight=null;done();return;}}
  if(flight||(!isReduced()&&ambient))frame=requestAnimationFrame(tick);
 }
 const wake=()=>{if(!disposed){last=0;if(!frame)frame=requestAnimationFrame(tick);draw();}};
 document.addEventListener('visibilitychange',wake);motion.addEventListener('change',wake);
 resize();wake();
 return {dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('visibilitychange',wake);motion.removeEventListener('change',wake);},travel(side,ok,done){if(isReduced()){done();return;}flight={side,ok,start:performance.now(),duration:ok?950:420,done};wake();}};
}
