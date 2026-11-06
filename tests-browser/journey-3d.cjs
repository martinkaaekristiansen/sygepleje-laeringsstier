const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.APP_URL||'http://127.0.0.1:3001/sygepleje-laeringsstier/';
(async()=>{
 const {BLOOD_LEVELS}=await import('../public/blood-routes.js');
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const errors=[],requests=[];
 try{
  const page=await browser.newPage({viewport:{width:1200,height:950},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.addInitScript(()=>{window.contexts3d=[];window.audio3d=[];const Audio=window.AudioContext;window.AudioContext=new Proxy(Audio,{construct(target,args){const c=new target(...args);audio3d.push(c);return c;}});const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){const c=get.call(this,type,...args);if(type==='webgl2'&&c&&!contexts3d.includes(c))contexts3d.push(c);return c;};});
  await page.goto(base+'#/blodcelle-3d');await page.locator('[data-blood=start]:enabled').waitFor();assert.match(page.url(),/#\/sti\/blodcellens-rejse\/blood-easy$/);
  assert.equal(await page.evaluate(()=>contexts3d.length),1);assert.equal(await page.getByRole('radio').count(),3);await page.locator('[data-audio-toggle]').click();await page.locator('[data-blood=start]').click();
  const route=BLOOD_LEVELS.easy;
  for(let i=0;i<route.choices.length;i++){
   await page.locator('[data-passage]:enabled').first().waitFor();assert.equal(await page.locator('canvas').getAttribute('data-engine'),'three.js r180');
   const names=await page.locator('[data-passage] strong').allTextContents();assert.deepEqual(names.sort(),[route.steps[i+1].name,route.choices[i].wrong.name].sort());
   if(i===8){const a=await page.locator('canvas').screenshot();await page.waitForTimeout(200);assert.ok(a.equals(await page.locator('canvas').screenshot()),'reduced motion renders static WebGL anatomy');assert.ok(Number(await page.locator('canvas').getAttribute('data-draw-calls'))<80);assert.ok(Number(await page.locator('canvas').getAttribute('data-triangles'))<250000);}
   await page.locator('[data-passage]').filter({hasText:route.steps[i+1].name}).click();
   if(i<route.choices.length-1)await page.waitForFunction(n=>document.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')===String(n),i+1);
  }
  await page.getByRole('heading',{name:'Tillykke! Du har gennemført kredsløbet!'}).waitFor();assert.match(await page.locator('.blood-result').textContent(),/Fejlfri rejse/);
  assert.equal(await page.evaluate(()=>contexts3d.length),1,'all regions share one renderer');assert.equal(await page.evaluate(()=>audio3d.length),1,'all regions share the existing audio graph');
  await page.reload();await page.locator('[data-blood=start]:enabled').waitFor();assert.match(await page.locator('.blood-level:has([value=easy])').textContent(),/Fejlfrit gennemført/);
  await page.locator('[data-blood=exit]').click();await page.waitForFunction(()=>audio3d.every(c=>c.state==='closed'));
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});mobile.on('pageerror',e=>errors.push(e.message));
  await mobile.goto(base+'#/sti/blodcellens-rejse/blood-easy');await mobile.locator('[data-blood=start]:enabled').tap();await mobile.locator('[data-passage]:enabled').first().waitFor();assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const good=mobile.locator('[data-passage]').filter({hasText:'Arterier'}),box=await good.boundingBox();assert.ok(box.width>=44&&box.height>=44);
  await mobile.locator('[data-passage]').evaluateAll(nodes=>nodes.forEach(e=>e.style.pointerEvents='none'));await mobile.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);await mobile.waitForFunction(()=>document.querySelector('canvas')?.dataset.stage==='arteries');await mobile.locator('[data-passage]:enabled').first().waitFor();
  await mobile.locator('[data-passage]').filter({hasText:'Venoler'}).tap();await mobile.locator('#blood-feedback').waitFor();const f=await mobile.locator('.blood-message').boundingBox(),w=await mobile.locator('.blood-world').boundingBox();assert.ok(f.y>=w.y&&f.y+f.height<=w.y+w.height,'feedback fits the mobile play area');await mobile.locator('.blood-world').screenshot({path:'/tmp/blood3d-mobile.png'});await mobile.close();
  const fallback=await browser.newPage();await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:get.call(this,type,...args);};});await fallback.goto(base+'#/sti/blodcellens-rejse/blood-easy');await fallback.getByRole('heading',{name:'3D kunne ikke vises'}).waitFor();assert.equal(await fallback.locator('[data-passage]').count(),0);await fallback.getByRole('button',{name:'Tilbage til læringsstierne',exact:true}).click();await fallback.close();
  assert.deepEqual(errors,[]);assert.ok(requests.every(u=>!u.includes('journey-scene.js')&&!u.includes('journey-3d-demo.js')),'no retired renderer or separate demo');assert.ok(requests.filter(u=>/^https?:/.test(u)).every(u=>new URL(u).origin===new URL(base).origin));
  console.log('PASS: WebGL only, original names, old demo-link redirect, one renderer/audio graph, persisted perfect medal, direct touch raycasting, mobile feedback and explicit no-WebGL message');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
