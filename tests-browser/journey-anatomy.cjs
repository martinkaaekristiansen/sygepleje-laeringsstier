const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.APP_URL||'http://127.0.0.1:3001/sygepleje-laeringsstier/';
(async()=>{
 const {BLOOD_LEVELS}=await import('../public/blood-routes.js');
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try{
  // Full detailed route with sound and real animation, including valve transit.
  const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.audioStarts=[];window.audioSources=[];
   const start=AudioBufferSourceNode.prototype.start;
   AudioBufferSourceNode.prototype.start=function(...args){audioStarts.push(args);audioSources.push(this);return start.apply(this,args);};
  });
  await page.goto(base+'#/sti/blodcellens-rejse/blood-hard');await page.locator('[data-audio-toggle]').click();await page.locator('[data-blood=start]').click();await page.locator('[data-passage]').first().waitFor();
  const frames=await page.evaluate(()=>new Promise(resolve=>{let last=performance.now(),times=[];function tick(t){times.push(t-last);last=t;if(times.length===45)resolve(times);else requestAnimationFrame(tick);}requestAnimationFrame(tick);}));
  assert.ok(frames.filter(t=>t>100).length<5,'no repeated >100ms main-thread stalls');
  const route=BLOOD_LEVELS.hard;
  for(let i=0;i<route.choices.length;i++){
   const s=route.steps[i];
   assert.equal(await page.locator('[data-passage]').count(),2);
   if(s.id==='tricuspid')await page.locator('.blood-play').screenshot({path:'/tmp/blood-anatomy-valve-desktop.png'});
   if(s.id==='pcapillaries'){
    await page.waitForTimeout(4100);
    await page.locator('.blood-play').screenshot({path:'/tmp/blood-anatomy-lung-desktop.png'});
    assert.match(await page.locator('.blood-world-caption').textContent(),/alveoler/);
   }
   const started=Date.now();await page.locator('[data-passage]').filter({hasText:route.steps[i+1].name}).click();
   if(i===route.choices.length-1)await page.locator('.blood-result').waitFor();
   else {
    await page.waitForFunction(expected=>document.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')===String(expected),i+1);
    if(await page.locator('[data-blood=continue]').count()){
     // Wait through the exchange animation, then ensure acknowledgment does not
     // restart oxygenation. The renderer retains its entry timestamp.
     await page.waitForTimeout(4100);await page.locator('[data-blood=continue]').click();
    }
    await page.locator('[data-passage]').first().waitFor();
   }
   if(s.kind==='semilunar'||s.kind.startsWith('av-'))assert.ok(Date.now()-started>=600,'valve passage waits for the open phase');
  }
  const starts=await page.evaluate(()=>audioStarts);
  assert.equal(starts.length,4,'three continuous layers plus pulse modulation, never restarted per step');
  assert.ok(starts.every(s=>s[0]===starts[0][0]),'shared start time for all sources');
  assert.match(await page.locator('.blood-result').textContent(),/Tillykke/);
  // Reduced motion stops ambient repainting, and touch controls remain visible.
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await mobile.goto(base+'#/sti/blodcellens-rejse/blood-medium');await mobile.locator('[data-blood=start]').tap();await mobile.locator('[data-passage]').first().waitFor();
  const medium=BLOOD_LEVELS.medium;
  for(let i=0;i<11;i++){
   await mobile.locator('[data-passage]').filter({hasText:medium.steps[i+1].name}).tap();await mobile.waitForFunction(n=>document.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')===String(n),i+1);
   if(await mobile.locator('[data-blood=continue]').count())await mobile.locator('[data-blood=continue]').tap();await mobile.locator('[data-passage]').first().waitFor();
  }
  const before=await mobile.locator('.blood-world canvas').evaluate(c=>c.toDataURL());await mobile.waitForTimeout(200);const after=await mobile.locator('.blood-world canvas').evaluate(c=>c.toDataURL());assert.equal(after,before,'reduced motion renders a static anatomical view');
  assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await mobile.locator('.blood-play').screenshot({path:'/tmp/blood-anatomy-lung-mobile.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS: full hard route with sound and moving valves, common source clock, continuous layers, responsive pulmonary view, reduced motion and desktop frame responsiveness');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
