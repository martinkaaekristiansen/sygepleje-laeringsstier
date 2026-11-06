const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.APP_URL||'http://127.0.0.1:3001/sygepleje-laeringsstier/';
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'#/sti/blodcellens-rejse/blood-medium');await page.locator('[data-blood=start]').tap();await page.locator('[data-passage]').first().waitFor();
  // Simulate an older saved game that stopped at the pulmonary explanation.
  await page.evaluate(async()=>{
   const db=await new Promise(r=>{const q=indexedDB.open('laeringsstier-v2');q.onsuccess=()=>r(q.result);});
   await new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite'),st=tx.objectStore('records'),get=st.get('progress');get.onsuccess=()=>{
    const data=get.result,record=data['blodcellens-rejse'];record.done=['blood-easy'];record.bloodJourney.stats.easy={completed:true,attempts:2,best:100,lastCompleted:'2026-11-05T12:00:00.000Z'};
    Object.assign(record.bloodJourney.active,{index:11,correct:11,phase:'arrival',lastSide:0});st.put(data,'progress');
   };tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();
  });
  await page.reload();await page.locator('[data-blood=resume]').tap();await page.locator('[data-passage]').first().waitFor();
  assert.equal(await page.locator('[data-blood=continue]').count(),0);assert.equal(await page.locator('[role=progressbar]').getAttribute('aria-valuenow'),'11');assert.equal(await page.locator('[data-map-location]').getAttribute('data-map-location'),'pcapillaries');assert.equal(await page.locator('.blood-funfact').count(),0);assert.equal(await page.locator('.blood-minimap figcaption').textContent(),'KROPSKORT');
  const world=await page.locator('.blood-world').boundingBox(),map=await page.locator('.blood-minimap').boundingBox();
  assert.ok(map.x-world.x<15);assert.ok(world.y+world.height-(map.y+map.height)<15);
  assert.equal(await page.locator('.blood-minimap').evaluate(e=>getComputedStyle(e).pointerEvents),'none');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('.blood-play').screenshot({path:'/tmp/blood-bodymap-mobile.png'});
  await page.locator('[data-passage]').filter({hasText:'Lungevenoler'}).tap();await page.waitForFunction(()=>document.querySelector('[data-map-location]')?.dataset.mapLocation==='pvenules');
  assert.equal(await page.locator('[data-passage]').count(),2);assert.equal(await page.locator('[data-blood=continue]').count(),0);
  await page.locator('[data-blood=menu]').tap();await page.locator('.blood-levels').waitFor();assert.match(await page.locator('.blood-level:has([value=easy])').textContent(),/✓ Gennemført/);
  await page.setViewportSize({width:1360,height:1000});await page.locator('[data-blood=resume]').click();await page.locator('[data-passage]').first().waitFor();await page.locator('.blood-play').screenshot({path:'/tmp/blood-bodymap-desktop.png'});
  assert.deepEqual(errors,[]);console.log('PASS: old arrival saves resume without a stop, completion preserved, current map location and simplified caption, bottom-left mobile map, unobstructed controls and automatic capillary departure');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
