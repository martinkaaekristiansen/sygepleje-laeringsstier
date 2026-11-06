const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.APP_URL||'http://127.0.0.1:3001/sygepleje-laeringsstier/';
async function stored(page){return page.evaluate(async()=>{const db=await new Promise(r=>{const q=indexedDB.open('laeringsstier-v2');q.onsuccess=()=>r(q.result);});const result=await new Promise(r=>{const q=db.transaction('records').objectStore('records').get('progress');q.onsuccess=()=>r(q.result);});db.close();return result['blodcellens-rejse'];});}
async function ready(page){await page.waitForFunction(()=>document.querySelector('[data-passage]:not(:disabled)')||document.querySelector('[data-blood=continue]')||document.querySelector('.blood-result'));if(await page.locator('[data-blood=continue]').count()){await page.locator('[data-blood=continue]').click();await page.locator('[data-passage]').first().waitFor();}}
(async()=>{
 const {BLOOD_LEVELS,BLOOD_PATH_ID}=await import('../public/blood-routes.js');
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try {
  const context=await browser.newContext({viewport:{width:1360,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(base);await page.locator('[data-semester="1"]').click();await page.locator(`[data-open="${BLOOD_PATH_ID}"]`).click();await page.locator('.blood-levels').waitFor();assert.equal(await page.getByRole('radio').count(),3);assert.equal(await page.locator('input[type=password]').count(),0);
  for(const [level,route]of Object.entries(BLOOD_LEVELS)) {
   await page.locator(`[name=blood-level][value=${level}]`).check();await page.locator('[data-blood=start]').click();await page.locator('[data-passage]').first().waitFor();
   // A wrong choice must not advance; the next attempt needs no acknowledgment.
   const wrong=page.locator('[data-passage]').filter({hasText:route.choices[0].wrong.name});await wrong.click();await page.locator('#blood-feedback').waitFor();assert.match(await page.locator('.blood-lives').getAttribute('aria-label'),/^1 /);assert.equal(await page.locator('[data-passage]:not(:disabled)').count(),2);assert.equal(await page.locator('[data-blood=continue]').count(),0);assert.match(await page.locator('.blood-location h1').textContent(),new RegExp(route.steps[0].name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
   await page.reload();await page.locator('[data-blood=resume]').click();await page.locator('#blood-feedback').waitFor();assert.match(await page.locator('.blood-lives').getAttribute('aria-label'),/^1 /);await ready(page);
   for(let i=0;i<route.choices.length;i++) {
    await page.locator('[data-passage]').first().waitFor();assert.equal(await page.locator('[data-passage]').count(),2);assert.deepEqual((await page.locator('[data-passage] strong').allTextContents()).sort(),[route.steps[i+1].name,route.choices[i].wrong.name].sort());assert.equal(await page.locator('[data-blood=continue]').count(),0);assert.equal(await page.locator('[data-map-location]').getAttribute('data-map-location'),route.steps[i].id);assert.ok((await page.locator('.blood-funfact p').textContent()).length>30);
    const target=page.locator('[data-passage]').filter({hasText:route.steps[i+1].name});
    if(i===0){const side=await target.getAttribute('data-passage');await page.keyboard.press(side==='0'?'ArrowLeft':'ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.dataset.passage),side);await page.keyboard.press('Enter');}
    else await target.click();
    // The next decision is only available after the prior transition settles.
    if(i<route.choices.length-1){await page.waitForFunction(expected=>document.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')===String(expected),i+1);await ready(page);}
   }
   await page.getByRole('heading',{name:'Tillykke! Du har gennemført kredsløbet!'}).waitFor();assert.equal(await page.locator('canvas').getAttribute('data-stage'),route.steps.at(-1).id,'the 3D camera returns to aorta before the result');const record=await stored(page);assert.equal(record.bloodJourney.stats[level].completed,true);assert.equal(record.bloodJourney.stats[level].attempts,1);assert.equal(record.bloodJourney.stats[level].best,100);assert.ok(record.bloodJourney.stats[level].lastCompleted);assert.ok(record.done.includes('blood-'+level));assert.equal(record.bloodJourney.active.errors,1);
   await page.locator('[data-blood=menu]').click();await page.locator('.blood-levels').waitFor();await page.reload();await page.locator('.blood-levels').waitFor();assert.match(await page.locator(`.blood-level:has([value=${level}])`).textContent(),/✓ Gennemført/);
  }
  assert.equal(await page.getByText('✓ Gennemført',{exact:true}).count(),3);
  // Later failure must retain completion and the previous date/best score.
  const before=await stored(page);await page.locator('[name=blood-level][value=easy]').check();await page.locator('[data-blood=start]').click();await ready(page);
  for(let n=0;n<2;n++){await page.locator('[data-passage]').filter({hasText:BLOOD_LEVELS.easy.choices[0].wrong.name}).click();if(n===0){await page.locator('#blood-feedback').waitFor();await ready(page);}}
  await page.getByRole('heading',{name:'Game Over',exact:true}).waitFor();assert.equal(await page.locator('[data-passage]').count(),0);const after=await stored(page);assert.equal(after.bloodJourney.stats.easy.attempts,2);assert.equal(after.bloodJourney.stats.easy.completed,true);assert.equal(after.bloodJourney.stats.easy.lastCompleted,before.bloodJourney.stats.easy.lastCompleted);assert.equal(after.bloodJourney.stats.easy.best,100);
  await page.locator('[data-blood=restart]').click();await ready(page);assert.match(await page.locator('.blood-lives').getAttribute('aria-label'),/^2 /);assert.equal((await stored(page)).bloodJourney.stats.easy.attempts,3);
  await page.locator('[data-blood=menu]').click();await page.locator('.blood-levels').waitFor();await page.locator('[data-blood=exit]').click();await page.locator('.continue-section').waitFor();assert.equal(await page.locator('.continue-card').count(),0);
  assert.deepEqual(errors,[]);await context.close();
  // Touch layout with real motion; no horizontal overflow and no double advancement.
  const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),touch=await mobile.newPage();touch.on('pageerror',e=>errors.push(e.message));
  await touch.goto(base+'#/sti/blodcellens-rejse/blood-hard');await touch.locator('.blood-levels').waitFor();await touch.screenshot({path:'/tmp/blood-game-menu-mobile.png',fullPage:true});assert.ok(await touch.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.ok(await touch.locator('[value=hard]').isChecked());await touch.locator('[value=easy]').check();await touch.locator('[data-blood=start]').tap();await touch.locator('[data-passage]').first().waitFor();const target=touch.locator('[data-passage]').filter({hasText:'Arterier'});const box=await target.boundingBox();assert.ok(box.width>=44&&box.height>=44);await touch.screenshot({path:'/tmp/blood-game-mobile.png',fullPage:true});await target.tap();assert.equal(await touch.locator('[data-passage]:not(:disabled)').count(),0);await touch.waitForFunction(()=>document.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')==='1');await ready(touch);assert.equal((await stored(touch)).bloodJourney.active.correct,1);assert.ok(await touch.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mobile.close();
  // Inspect detailed cardiac geometry on a desktop with real motion.
  const visual=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});await visual.goto(base+'#/sti/blodcellens-rejse/blood-hard');await visual.locator('[value=hard]').check();await visual.locator('[data-blood=start]').click();await ready(visual);
  for(let i=0;i<9;i++){await visual.locator('[data-passage]').filter({hasText:BLOOD_LEVELS.hard.steps[i+1].name}).click();await visual.waitForFunction(expected=>document.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')===String(expected),i+1);await ready(visual);}
  await visual.screenshot({path:'/tmp/blood-game-valve.png',fullPage:true});assert.match(await visual.locator('.blood-world-caption').textContent(),/Tre klapsejl/);await visual.close();assert.deepEqual(errors,[]);
  console.log('PASS: all 3 circuits, two portals per junction, keyboard/touch, life loss/game over/restart, no skipped stages, persistent stats/date, unchanged completion after failure, app progression, mobile/desktop and Pages subpath');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
