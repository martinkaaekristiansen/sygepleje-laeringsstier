const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:3000');
  const home=async()=>page.locator('[data-action=home]').first().click();
  assert.equal(await page.locator('.continue-card').count(),0);
  assert.equal(await page.locator('main > section').first().getAttribute('class'),'continue-section');
  assert.match(await page.locator('.continue-empty').textContent(),/Ingen ufærdige/);
  await page.locator('[data-open="fordoejelse"]').click();await home();
  assert.equal(await page.locator('.continue-card').count(),1);
  assert.match(await page.locator('.continue-progress-label').textContent(),/0 af 5/);
  await page.reload();await page.locator('[data-resume="fordoejelse"]').click();
  assert.equal(await page.locator('.lesson h2').textContent(),'Mød din patient');
  await page.locator('[data-action=complete]').click();await home();
  assert.equal(await page.locator('.continue-progress').getAttribute('aria-valuenow'),'20');
  assert.match(await page.locator('.continue-step').textContent(),/trin 2/);
  await page.locator('[data-resume="fordoejelse"]').click();
  assert.equal(await page.locator('.lesson h2').textContent(),'Fra mund til tarm');
  await home();await page.locator('[data-semester="5"]').click();
  const fifth='semester5-akut-kritisk-e26-v1';
  await page.locator(`[data-open="${fifth}"]`).click();await home();
  assert.equal(await page.locator('[data-resume]').first().getAttribute('data-resume'),fifth);
  await page.locator('[data-semester="7"]').click();await page.locator('[data-subject="Farmakologi"]').click();
  assert.equal(await page.locator('.path-card').count(),0);
  assert.equal(await page.locator('.continue-card').count(),2);
  await page.screenshot({path:'/tmp/progress-overview-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'/tmp/progress-overview-mobile.png',fullPage:true});
  // Old saved progress remains usable; completed or deleted paths are omitted.
  await page.evaluate(()=>{
   const data=JSON.parse(localStorage.getItem('progress-v1'));
   data.fordoejelse={done:[0,1,2,3,4],last:4};
   data.deleted={done:[0],last:1};
   const paths=JSON.parse(localStorage.getItem('paths-v1'));
   paths.push({id:'short',title:'Kort øvelse',semester:6,subject:'Sygepleje',description:'Test',steps:[{title:'Første trin',type:'text',text:'Læs'},{title:'Andet trin',type:'text',text:'Læs videre'}]});
   data.short={done:[0],last:1};
   localStorage.setItem('paths-v1',JSON.stringify(paths));localStorage.setItem('progress-v1',JSON.stringify(data));
  });
  await page.reload();assert.equal(await page.locator('.continue-card').count(),2);
  assert.equal(await page.locator('[data-resume="fordoejelse"]').count(),0);
  await page.locator('[data-resume="short"]').click();assert.equal(await page.locator('.lesson h2').textContent(),'Andet trin');
  await page.locator('[data-action=complete]').click();await home();
  assert.equal(await page.locator('[data-resume="short"]').count(),0);
  assert.equal(await page.locator('.continue-card').count(),1);
  // Editing a path resets its progress and removes the old resume card.
  await page.locator('[data-action=teacher]').click();await page.locator('#teacher-code').fill('7269');await page.locator('#teacher-login button').click();
  await page.locator(`[data-edit="${fifth}"]`).click();await page.locator('#editor button[type=submit]').click();
  await home();assert.equal(await page.locator('.continue-card').count(),0);
  assert.match(await page.locator('.continue-empty').textContent(),/Ingen ufærdige/);
  await page.reload();assert.equal(await page.locator('.continue-card').count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS: top-of-home placement, first-open at 0%, progress counts, correct-step resume, cross-semester/filter overview, recency, old data, completion/removal, teacher reset and mobile layout');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
