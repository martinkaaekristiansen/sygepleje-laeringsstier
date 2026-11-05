const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.APP_URL||'http://127.0.0.1:3001/sygepleje-laeringsstier/';
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const errors=[],external=[];
 try{
  const page=await browser.newPage({viewport:{width:1200,height:950},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(base).origin)external.push(r.url());});
  await page.addInitScript(()=>{window.contexts3d=[];window.audio3d=[];const Audio=window.AudioContext;window.AudioContext=new Proxy(Audio,{construct(target,args){const c=new target(...args);audio3d.push(c);return c;}});const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){const c=get.call(this,type,...args);if(type==='webgl2'&&c&&!contexts3d.includes(c))contexts3d.push(c);return c;};});
  await page.goto(base+'#/blodcelle-3d');await page.locator('[data-action3d=start]:enabled').waitFor({timeout:90000});
  assert.equal(await page.evaluate(()=>contexts3d.length),1);await page.locator('.blood3d-sound summary').click();await page.locator('[data-action3d=sound]').click();await page.locator('.blood3d-sound summary').click();
  const stats=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('laeringsstier-blood3d-review-v1')));
  await page.locator('[data-action3d=start]').click();await page.locator('[data-choice3d]:visible').first().waitFor();assert.equal(await page.locator('[data-choice3d]:visible').count(),2);
  await page.locator('[data-choice3d]').filter({hasText:'Mod hoved og hals'}).click();await page.locator('[data-feedback3d]:visible').waitFor();assert.equal(await page.locator('[data-lives]').getAttribute('aria-label'),'1 af 2 liv');assert.match(await page.locator('[data-feedback3d]').textContent(),/begge grene normale/);
  await page.locator('[data-choice3d]').filter({hasText:'Mod hoved og hals'}).click();await page.getByRole('heading',{name:'Prøv en ny rejse.'}).waitFor();assert.equal(await page.locator('[data-choice3d]:visible').count(),0);
  await page.locator('[data-action3d=start]').click();await page.locator('[data-choice3d]:visible').first().waitFor();assert.equal(await page.locator('[data-lives]').getAttribute('aria-label'),'2 af 2 liv');
  for(const [i,label]of ['Mod højre arm','Mod biceps','Aktivt muskelområde'].entries()){
   await page.locator('[data-choice3d]:visible').first().waitFor();const target=page.locator('[data-choice3d]').filter({hasText:label}),side=await target.getAttribute('data-choice3d');
   await page.keyboard.press(side==='0'?'ArrowLeft':'ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.dataset.choice3d),side);await page.keyboard.press('Enter');
   await page.waitForFunction(name=>document.querySelector('canvas')?.dataset.stage===name,['arteries','arterioles','capillaries'][i],{timeout:90000});
  }
  assert.equal(await page.evaluate(()=>contexts3d.length),1,'same WebGL renderer across anatomical scenes');assert.equal(await page.evaluate(()=>audio3d.length),1,'existing audio engine continues across the 3D scenes');
  await page.locator('[data-action3d=finish]').waitFor();
  const a=await page.locator('canvas').screenshot();await page.waitForTimeout(300);const b=await page.locator('canvas').screenshot();assert.ok(a.equals(b),'reduced motion is static actual WebGL');
  assert.ok(Number(await page.locator('canvas').getAttribute('data-draw-calls'))<20);assert.ok(Number(await page.locator('canvas').getAttribute('data-triangles'))<250000);
  await page.locator('[data-action3d=finish]').click();await page.getByRole('heading',{name:'Fejlfri rejse.'}).waitFor();assert.deepEqual(await stats(),{attempts:2,bestErrors:0,completed:true});
  await page.reload();await page.locator('[data-action3d=start]:enabled').waitFor({timeout:90000});assert.equal((await stats()).completed,true);await page.locator('.blood3d-heading a').click();await page.locator('.blood-levels').waitFor();assert.equal(await page.getByRole('radio').count(),3);assert.equal(await page.getByText('✓ Gennemført',{exact:true}).count(),0,'review does not award or erase real course completion');
  // Touch layout and the direct 3D raycast target, not only HTML labels.
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});mobile.on('pageerror',e=>errors.push(e.message));
  await mobile.goto(base+'#/blodcelle-3d');await mobile.locator('[data-action3d=start]:enabled').waitFor({timeout:90000});await mobile.locator('[data-action3d=start]').tap();await mobile.locator('[data-choice3d]:visible').first().waitFor();assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const good=mobile.locator('[data-choice3d]').filter({hasText:'Mod højre arm'}),box=await good.boundingBox();assert.ok(box.width>=44&&box.height>=44);await mobile.locator('[data-choice3d]').evaluateAll(nodes=>nodes.forEach(e=>e.style.pointerEvents='none'));await mobile.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);await mobile.waitForFunction(()=>document.querySelector('canvas')?.dataset.stage==='arteries');
  await mobile.locator('.blood3d-viewport').screenshot({path:'/tmp/blood3d-mobile.png'});
  await mobile.locator('[data-choice3d]').evaluateAll(nodes=>nodes.forEach(e=>e.style.pointerEvents='auto'));
  await mobile.locator('[data-choice3d]').filter({hasText:'Mod triceps'}).tap();await mobile.locator('[data-feedback3d]:visible').waitFor();
  const feedbackBox=await mobile.locator('[data-feedback3d]').boundingBox(),viewportBox=await mobile.locator('.blood3d-viewport').boundingBox();
  assert.ok(feedbackBox.y>=viewportBox.y&&feedbackBox.y+feedbackBox.height<=viewportBox.y+viewportBox.height,'feedback is inside the mobile play area');
  await mobile.locator('[data-choice3d]').filter({hasText:'Mod triceps'}).tap();await mobile.getByRole('heading',{name:'Prøv en ny rejse.'}).waitFor();assert.match(await mobile.locator('[data-overlay]').textContent(),/normal arteriel blodforsyning/);await mobile.close();
  const fallback=await browser.newPage();await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:original.call(this,type,...args);};});await fallback.goto(base+'#/blodcelle-3d');await fallback.getByRole('heading',{name:'3D kunne ikke vises'}).waitFor();await fallback.close();
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log('PASS: actual WebGL, connected scene transitions, two lives/restart, keyboard/touch, static reduced motion, local review medal, original levels preserved, one renderer and no external requests');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
