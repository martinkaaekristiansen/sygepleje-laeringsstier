const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.APP_URL||'http://127.0.0.1:3001/sygepleje-laeringsstier/';
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try{
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1360,height:1000},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
   await context.addInitScript(()=>{
    window.audioContexts=[];window.audioRamps=[];window.audioGains=[];
    const Original=window.AudioContext;
    window.AudioContext=new Proxy(Original,{construct(target,args){const c=new target(...args);window.audioContexts.push(c);return c;}});
    const gain=AudioContext.prototype.createGain;AudioContext.prototype.createGain=function(){const g=gain.call(this);audioGains.push(g);return g;};
    const target=AudioParam.prototype.setTargetAtTime;
    AudioParam.prototype.setTargetAtTime=function(...args){window.audioRamps.push(args);return target.apply(this,args);};
   });
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'#/sti/blodcellens-rejse/blood-easy');await page.locator('[data-audio-toggle]').waitFor();
   assert.equal(await page.evaluate(()=>audioContexts.length),0,'no autoplay/context before gesture');
   await page.locator('[data-audio-toggle]').click();
   await page.locator('[data-blood=start]').click();await page.locator('[data-passage]').first().waitFor();
   await page.waitForFunction(()=>audioContexts[0]?.state==='running');assert.equal(await page.evaluate(()=>audioContexts.length),1);
   assert.match(await page.locator('[data-audio-status]').textContent(),/70 slag/);
   await page.locator('[data-audio=lungs]').uncheck();await page.locator('[data-audio=flow]').uncheck();
   await page.locator('[data-audio=volume]').fill('73');
   await page.locator('[data-audio=volume]').focus();await page.keyboard.press('ArrowLeft');
   assert.equal(await page.locator('[data-audio=volume]').inputValue(),'72','range keyboard must not move portal focus');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'blood-volume');
   await page.locator('[data-passage]').filter({hasText:'Arterier'}).click();
   await page.waitForFunction(()=>document.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')==='1');
   assert.equal(await page.evaluate(()=>audioContexts.length),1,'same continuous audio graph after navigation');
   assert.ok(await page.evaluate(()=>audioRamps.length>15&&audioRamps.every(a=>a[2]>0)),'all target changes smoothed');
   await page.reload();await page.locator('[data-audio-toggle]').waitFor();
   assert.equal(await page.evaluate(()=>audioContexts.length),0,'saved enabled preference must not autoplay');
   assert.equal(await page.locator('[data-audio=volume]').inputValue(),'72');assert.equal(await page.locator('[data-audio=lungs]').isChecked(),false);assert.equal(await page.locator('[data-audio=flow]').isChecked(),false);
   await page.locator('[data-blood=resume]').click();await page.waitForFunction(()=>audioContexts[0]?.state==='running');
   await page.locator('[data-audio-toggle]').click();await page.waitForFunction(()=>audioGains[0]?.gain.value<.001);assert.equal(await page.evaluate(()=>audioContexts[0].state),'running','mute keeps the cardiac clock continuous');
   await page.locator('[data-audio-toggle]').click();await page.waitForFunction(()=>audioContexts[0]?.state==='running');
   await page.locator('[data-blood=exit]').click();await page.waitForFunction(()=>audioContexts[0]?.state==='closed');
   assert.deepEqual(errors,[]);await context.close();
  }
  // A missing Audio API must leave the game fully playable with a useful status.
  const c=await browser.newContext({reducedMotion:'reduce'});await c.addInitScript(()=>{window.AudioContext=undefined;window.webkitAudioContext=undefined;});const p=await c.newPage();
  await p.goto(base+'#/sti/blodcellens-rejse/blood-easy');await p.locator('[data-audio-toggle]').click();await p.locator('[data-blood=start]').click();await p.locator('[data-passage]').first().waitFor();assert.match(await p.locator('[data-audio-status]').textContent(),/kunne ikke startes/);await c.close();
  console.log('PASS: audio gestures, continuous graph, smooth ramps, layer controls, keyboard volume, saved preferences, mute/resume/dispose, mobile and no-Audio fallback');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
