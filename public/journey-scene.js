import {anatomyProfile, cardiacCycle, valveOpening, valveTransit, oxygenation} from './journey-physiology.js';

// Canvas is presentation only. Choices/lives/routes and accessible controls remain
// in the engine/DOM. Coordinates are illustrative, not a scale anatomical model.
export function mountJourneyScene(canvas, structure, {reduced=false, ambient=true, now=()=>performance.now()/1000, enteredAt=performance.now()}={}) {
 const ctx=canvas.getContext('2d');
 if(!ctx)return {dispose(){},travel(_side,_ok,done){done();}};
 const profile=anatomyProfile(structure), motion=matchMedia('(prefers-reduced-motion: reduce)');
 let frame=0, disposed=false, last=0, elapsed=0, flight=null, width=0, height=0;
 const born=enteredAt;
 const still=()=>reduced||motion.matches||!ambient;
 const ellipse=(x,y,rx,ry,fill,stroke,line=1)=>{
  ctx.beginPath();ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);
  if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}
 };
 const mix=(a,b,f)=>`rgb(${a.map((v,i)=>Math.round(v+(b[i]-v)*f)).join(',')})`;
 const label=(text,x,y,size=12,color='#fff0dc')=>{ctx.font=`${size<12?'500':'600'} ${size}px system-ui`;ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(text,x,y);};
 const line=(points,color,thickness=1)=>{ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);ctx.strokeStyle=color;ctx.lineWidth=thickness;ctx.stroke();};
 function cell(x,y,r,rotation,oxygen,deform=0) {
  ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.scale(1-deform*.35,1+deform*.3);
  const g=ctx.createRadialGradient(-r*.28,-r*.3,r*.04,0,0,r);
  g.addColorStop(0,mix([159,59,71],[255,135,112],oxygen));g.addColorStop(.38,mix([93,20,39],[183,36,45],oxygen));g.addColorStop(.68,mix([133,41,57],[231,69,64],oxygen));g.addColorStop(1,'#390c1b');
  ellipse(0,0,r,r*.61,g,'#ffb69b55',1);ellipse(-r*.03,-r*.01,r*.48,r*.25,'#31071d32');
  ctx.beginPath();ctx.ellipse(-r*.13,-r*.16,r*.65,r*.3,-.05,3.5,5.6);ctx.strokeStyle='#ffc4a74a';ctx.lineWidth=1.5;ctx.stroke();ctx.restore();
 }
 function vessel(oxygen,time,cycle) {
  const cap=profile.capillary, vein=structure.kind==='vein', arteriole=structure.kind==='arteriole';
  const pulsation=still()?0:cycle.contraction*(vein?.003:cap?0:arteriole?.006:.023);
  const center=width*.5, y=height*.49;
  const radius=width*(cap?.31:arteriole?.41:.55)*profile.lumen;
  const glow=ctx.createRadialGradient(center,y,8,center,y,width*.8);
  glow.addColorStop(0,'#1b0a14');glow.addColorStop(.35,mix([74,24,42],[119,39,48],oxygen));glow.addColorStop(.7,mix([117,51,65],[174,73,65],oxygen));glow.addColorStop(1,'#29101b');
  ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
  const drift=still()?0:time*profile.speed;
  // Perspective wall sections. Arteries have layered media; capillaries have
  // only a delicate endothelium and basement membrane. No arterial valves.
  for(let i=25;i>=0;i--){
   const z=(i+(drift%1))/26, scale=1/Math.max(.22,z*3+.22);
   const bend=structure.kind==='arch'?Math.sin(z*1.7)*width*.16:Math.sin(z*3)*width*.015;
   const rx=radius*.26*scale*(1+pulsation), ry=height*.14*scale*(vein?.86:1);
   const x=center+bend, yy=y+Math.sin(z*4)*height*.02;
   ellipse(x,yy,rx,ry,null,`rgba(246,163,140,${cap?.1:.035+(1-z)*.09})`,cap?1.2:Math.max(1,profile.wall*width*.34*scale));
   if(!cap&&!vein&&i%3===0)ellipse(x,yy,rx+profile.wall*width*.15*scale,ry+profile.wall*height*.2*scale,null,'#ffcba41e',2);
   if(cap&&i%5===0){ellipse(x,yy,rx+3,ry+3,null,'#ffe7bc60',.8);ellipse(x+rx*.8,yy-ry*.6,4,2,'#d390985c');}
  }
  // Smooth endothelial highlight lines rather than ridged arterial interiors.
  for(let i=0;i<12;i++){
   const a=i*Math.PI/6, side=Math.cos(a), vertical=Math.sin(a);
   ctx.beginPath();ctx.moveTo(center+side*radius*.12,y+vertical*height*.045);
   ctx.bezierCurveTo(center+side*radius*.38,y+vertical*height*.2,center+side*radius*.9,y+vertical*height*.48,center+side*radius*2.5,y+vertical*height*1.2);
   ctx.strokeStyle=i%3?'#ffcaaf12':'#ffdfbf2b';ctx.lineWidth=cap?.8:1.8;ctx.stroke();
  }
  // Peripheral arm vein: two thin pockets. Not present in cava or pulmonary veins.
  if(profile.venousValve){
   for(const side of [-1,1]){
    const x=center+side*width*.43;
    ctx.beginPath();ctx.moveTo(x,height*.2);ctx.quadraticCurveTo(center+side*width*.23,height*.37,center+side*width*.34,height*.76);ctx.quadraticCurveTo(x,height*.56,x,height*.2);ctx.fillStyle='#efd1b13b';ctx.fill();ctx.strokeStyle='#f6d5bd88';ctx.lineWidth=2;ctx.stroke();
   }
  }
  if(cap){
   // Narrow lumen fills the cell's scale; the diffuse pale border is a teaching
   // window, not a thick muscular capillary wall.
   for(const side of [-1,1]){
    ctx.beginPath();ctx.moveTo(center+side*width*.045,height*.26);ctx.bezierCurveTo(center+side*width*.07,height*.5,center+side*width*.18,height*.82,center+side*width*.2,height);
    ctx.strokeStyle='#ffe0b7a0';ctx.lineWidth=1.4;ctx.stroke();
   }
  }
 }
 function chamber(oxygen,cycle,kind=structure.kind){
  const atrium=kind==='atrium', left=kind==='left-ventricle';
  const contraction=still()?0:(atrium?cycle.atrialContraction:cycle.contraction);
  const inset=contraction*(atrium?.008:.025), cx=width*.5;
  const g=ctx.createRadialGradient(cx,height*.45,5,cx,height*.5,width*.8);
  g.addColorStop(0,'#1a0a13');g.addColorStop(.42,mix([71,22,39],[110,31,40],oxygen));g.addColorStop(.7,mix([129,61,65],[183,84,73],oxygen));g.addColorStop(1,'#3b1725');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);
  // Rounded atrium; tapering ventricular apex, with asymmetric right chamber.
  ctx.beginPath();ctx.moveTo(width*(.23+inset),height*.12);
  ctx.bezierCurveTo(width*.04,height*.18,width*(.04+inset),height*.67,width*(atrium?.22:.4),height*(atrium?.88:1.05));
  ctx.bezierCurveTo(width*(atrium?.5:.52),height*(atrium?1:1.18),width*(.93-inset),height*.78,width*(.91-inset),height*.37);
  ctx.bezierCurveTo(width*.94,height*.07,width*.58,height*.04,width*(.23+inset),height*.12);
  ctx.fillStyle='#270e1b85';ctx.fill();const muscle=ctx.createLinearGradient(width*.08,0,width*.93,height);muscle.addColorStop(0,'#5c2838');muscle.addColorStop(.25,'#b87969');muscle.addColorStop(.55,'#955748');muscle.addColorStop(.8,'#c8886b');muscle.addColorStop(1,'#4b2030');ctx.strokeStyle=muscle;ctx.lineWidth=width*(left?.17:atrium?.035:.075);ctx.stroke();
  ctx.strokeStyle='#ffd0b148';ctx.lineWidth=3;ctx.stroke();
  // Trabeculae carneae on the ventricular walls; right atrial pectinate ridges.
  const count=atrium?(structure.id==='ra'?7:3):13;
  for(let i=0;i<count;i++){
   const y=height*(.18+i*.052), side=i%2?-1:1, x=cx+side*width*(.37+Math.sin(i*1.7)*.025);
   ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x-side*width*.09,y+height*.1,x-side*width*.04,y+height*.14,x+side*width*.04,y+height*.24);
   ctx.strokeStyle=atrium?'#e9a58b30':'#d28f7970';ctx.lineWidth=atrium?3:left?11:7;ctx.stroke();
   if(!atrium){ctx.strokeStyle='#ffc2a335';ctx.lineWidth=2;ctx.stroke();}
  }
  if(!atrium){
   // Papillary muscles are ventricular structures; not decorations in arteries.
   for(const side of [-1,1]){ctx.save();ctx.translate(cx+side*width*.33,height*.78);ctx.rotate(side*.25);ellipse(0,0,width*.035,height*.13,'#9f5656','#f2b69455',2);ctx.restore();}
  }
 }
 function portals(oxygen,opacity=1){
  ctx.save();ctx.globalAlpha=opacity;
  for(const side of [0,1]){
   const x=width*(side===0?.27:.73),y=height*.51,r=width*(width<550?.205:.17);
   const g=ctx.createRadialGradient(x,y,3,x,y,r*1.2);
   g.addColorStop(0,'#120b149e');g.addColorStop(.62,'#250d1baf');g.addColorStop(.85,mix([100,44,57],[148,58,64],oxygen));g.addColorStop(1,'#eab39818');
   ellipse(x,y,r*1.1,height*.255,g,'#f3c39d88',1.4);
   for(let j=4;j>0;j--)ellipse(x,y,r*(.2+j*.16),height*(.05+j*.044),null,j%2?'#f5be9c24':'#f5be9c12',1.4);
  }
  ctx.restore();
 }
 function valve(seconds,forceOpen=false){
  const semi=structure.kind==='semilunar', n=structure.kind==='av-two'?2:3;
  const opening=forceOpen||still()?1:valveOpening(structure,seconds), cx=width*.5,cy=height*.48;
  const rx=width*.45, ry=height*.43;
  ellipse(cx,cy,rx,ry,null,'#ffd8ae6b',8);ellipse(cx,cy,rx+5,ry+5,null,'#522d3477',5);
  for(let i=0;i<n;i++){
   const a=-Math.PI/2+i*2*Math.PI/n, half=Math.PI/n;
   const point=(angle,r)=>[cx+Math.cos(angle)*rx*r,cy+Math.sin(angle)*ry*r];
   const p1=point(a-half,.99),p2=point(a+half,.99),tip=point(a,.005+opening*.74);
   ctx.beginPath();ctx.moveTo(...p1);
   ctx.bezierCurveTo(...point(a-half*.45,1.1),...point(a+half*.45,1.1),...p2);
   if(semi){ctx.quadraticCurveTo(...point(a+half*.5,.22+opening*.65),...tip);ctx.quadraticCurveTo(...point(a-half*.5,.22+opening*.65),...p1);}
   else {ctx.quadraticCurveTo(...point(a+half*.3,.12+opening*.7),...tip);ctx.quadraticCurveTo(...point(a-half*.3,.12+opening*.7),...p1);}
   const g=ctx.createLinearGradient(cx,cy,...point(a,1));g.addColorStop(0,'#f4cfafb8');g.addColorStop(.6,'#bf8b7cb8');g.addColorStop(1,'#f2c6a8bf');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#ffe0bcbf';ctx.lineWidth=1.7;ctx.stroke();
   if(semi){
    // Three pocket-like cusps, central nodules at coaptation; never chordae.
    const base=point(a,.88);ellipse(...base,6,3,'#ffddb658');
   }else{
    // Sejl tether to the ventricular papillary muscles beyond the opening.
    const muscle=point(a,.8);muscle[1]+=height*.1;
    ellipse(...muscle,width*.014,height*.05,'#a35b57','#dba58b6b',1);
    for(const j of [-1,0,1]){
     const anchor=point(a+j*.15,.18+opening*.63);
     ctx.beginPath();ctx.moveTo(...anchor);ctx.quadraticCurveTo((anchor[0]+muscle[0])/2+4,(anchor[1]+muscle[1])/2,...muscle);ctx.strokeStyle='#ffe0bbb0';ctx.lineWidth=1.2;ctx.stroke();
    }
   }
  }
  label(still()?'Åben klap · stillestående visning':opening>.5?'Åben klap · blodet kan passere':'Lukket klap · hindrer tilbageløb',width*.5,height*.935,10);
 }
 function exchange(time,oxygen){
  const inward=structure.oxygen==='exchange-in', mobile=width<550;
  // An explicitly labelled transparent cutaway ABOVE the endothelial lumen.
  // The alveoli are outside the capillary, with two thin barrier contours.
  ctx.fillStyle='#261722d9';ctx.fillRect(0,height*.105,width,height*.145);
  if(inward){
   for(let i=0;i<(mobile?4:7);i++){
    const total=mobile?4:7,x=width*(.1+i*.8/(total-1)),y=height*.15,r=width*(mobile?.075:.05);
    const g=ctx.createRadialGradient(x,y,2,x,y,r);g.addColorStop(0,'#ecdab341');g.addColorStop(.8,'#ba978a36');g.addColorStop(1,'#efd8b881');
    ellipse(x,y,r,height*.045,g,'#f9dab6a6',1.3);
   }
  }
  line([[width*.03,height*.235],[width*.97,height*.235]],'#f9dab98f',1.2);
  line([[width*.03,height*.246],[width*.97,height*.246]],'#e4b59ebf',1.2);
  label(inward?'Alveoleluft · uden for blodkarret':'Muskelvæv · uden for blodkarret',width*.5,height*.19,mobile?10:12);
  label(inward?'Tynd alveole–kapillærbarriere':'Endotel + basalmembran',width*.5,height*.275,mobile?9:10);
  // Yellow O2 and pale CO2 travel in opposite directions through the barrier.
  for(let i=0;i<6;i++){
   const f=still()?.55:(time*.25+i/6)%1,x=width*(.13+i*.145);
   const o2y=height*(inward?.21+f*.13:.34-f*.13),co2y=height*(inward?.34-f*.13:.21+f*.13);
   ellipse(x,o2y,3,3,'#ffe19c');ellipse(x+11,co2y,2.5,2.5,'#e4d8d0');
  }
  const top=height*.79;
  ctx.fillStyle='#1f101de6';ctx.fillRect(width*.035,top,width*.93,height*.13);
  label(inward?'O₂ ↓ til blodet     CO₂ ↑ til alveolen':'O₂ ↑ til vævet     CO₂ ↓ til blodet',width*.5,top+height*.04,mobile?11:13);
  const bx=width*.19,by=top+height*.065,bw=width*.62;
  ctx.fillStyle='#662a3b';ctx.fillRect(bx,by,bw,5);ctx.fillStyle=mix([140,43,56],[241,90,71],oxygen);ctx.fillRect(bx,by,bw*(.75+.23*oxygen),5);
  label(inward?'Hæmoglobin binder gradvist mere O₂':'Hæmoglobin afgiver en del af sin O₂',width*.5,top+height*.112,10);
 }
 function draw(){
  if(disposed||!width||!height)return;
  const time=elapsed/1000, seconds=now(), cycle=cardiacCycle(seconds);
  const oxygen=oxygenation(structure,still()?4:(performance.now()-born)/1000);
  let push=0, progress=0;
  if(flight){
   const age=(performance.now()-flight.start)/1000;
   progress=Math.max(0,Math.min(1,(age-flight.wait)/flight.duration));
   const ease=progress*progress*(3-2*progress);
   push=flight.ok?(profile.valve?(age<flight.wait?.08*Math.min(1,age/.5):.08+.92*ease):ease):.06*Math.sin(Math.min(1,age/flight.duration)*Math.PI);
  }
  ctx.clearRect(0,0,width,height);ctx.fillStyle='#29111d';ctx.fillRect(0,0,width,height);
  ctx.save();
  const side=flight?.side===0?-1:1, shift=profile.valve?0:side*width*.23*push*(1+push*3.8);
  ctx.translate(width*.5-shift,height*.49);ctx.scale(1+push*3.8,1+push*3.8);ctx.translate(-width*.5,-height*.49);
  if(profile.chamber)chamber(oxygen,cycle);else if(structure.kind.startsWith('av-'))chamber(oxygen,cycle,structure.kind==='av-two'?'left-ventricle':'right-ventricle');else vessel(oxygen,time,cycle);
  const count=profile.capillary?4:10;
  for(let i=0;i<count;i++){
   const z=(i/count+(still()?0:time*profile.speed))%1, size=profile.capillary?width*(.016+z*z*.11):6+z*z*32;
   const x=width*.5+(profile.capillary?0:Math.sin(i*7.3)*width*(.08+z*.44));
   const y=profile.capillary?height*(.31+z*.72):height*.49+Math.cos(i*3.2)*height*(.08+z*.48);
   cell(x,y,size,profile.capillary?Math.PI/2:i*.8+time*.035,oxygen,profile.capillary?.8:0);
  }
  if(profile.valve)valve(seconds,flight&&flight.ok&&progress>0&&progress<1&&still());
  // Hypothesis portals are a distinct overlay, not new septal/vessel openings.
  if(!flight)portals(oxygen,profile.valve?.85:1);
  ctx.restore();
  if(profile.capillary)exchange(time,oxygen);
  cell(width*.5,height*1.035,Math.min(width*.17,height*.13),-.08,oxygen);
  const vignette=ctx.createRadialGradient(width*.5,height*.49,height*.28,width*.5,height*.49,Math.max(width,height)*.8);
  vignette.addColorStop(0,'#17091600');vignette.addColorStop(1,'#170916a1');ctx.fillStyle=vignette;ctx.fillRect(0,0,width,height);
 }
 function tick(time){
  if(disposed)return;frame=0;
  if(!document.hidden){
   if(time-last>=32||flight){elapsed+=last?Math.min(50,time-last):0;last=time;draw();}
   if(flight&&(time-flight.start)/1000>=flight.wait+flight.duration){const done=flight.done;flight=null;done();return;}
  }
  if(!document.hidden&&(flight||!still()))frame=requestAnimationFrame(tick);
 }
 const wake=()=>{if(disposed)return;last=0;draw();if(!frame&&!document.hidden)frame=requestAnimationFrame(tick);};
 function resize(){const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;const d=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);ctx.setTransform(d,0,0,d,0,0);draw();}
 const observer=new ResizeObserver(resize);observer.observe(canvas);
 document.addEventListener('visibilitychange',wake);motion.addEventListener('change',wake);resize();wake();
 return {
  dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('visibilitychange',wake);motion.removeEventListener('change',wake);},
  travel(side,ok,done){
   if(still()){done();return;}
   let wait=0,duration=ok?.95:.42;
   if(ok&&profile.valve){const transit=valveTransit(structure,now()+.5);wait=.5+transit.wait;duration=transit.duration;}
   flight={side,ok,start:performance.now(),wait,duration,done};wake();
  },
 };
}
