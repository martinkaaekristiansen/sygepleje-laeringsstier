const {publishingFixture,publishCurrent,withdraw}=require('./publishing-fixture.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.APP_URL||'http://127.0.0.1:3001/sygepleje-laeringsstier/';
const readState=page=>page.evaluate(async()=>{
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('laeringsstier-v2');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 const tx=db.transaction('records','readonly'),store=tx.objectStore('records');const data=await Promise.all(['meta','paths','progress','drafts'].map(k=>new Promise(r=>{const req=store.get(k);req.onsuccess=()=>r(req.result);})));db.close();return {...data[0],paths:data[1],progress:data[2],drafts:data[3]};
});
const settle=page=>page.waitForFunction(()=>{const status=document.querySelector('#draft-status');return !status||status.textContent.includes('Kladde gemt');});
async function home(page){await page.locator('header a[href="#/"]').first().click();await page.locator('.continue-section').waitFor();}
async function login(page){await page.locator('header a[href="#/underviser"]').click();await page.locator('#teacher-code,[data-action=new],#editor').first().waitFor();if(await page.locator('#teacher-code').count()){await page.locator('#teacher-code').fill('7269');await page.locator('#teacher-login button').click();}await page.locator('[data-action=new],#editor').first().waitFor();}
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 const errors=[];
 const fresh=async(options={})=>{const context=await browser.newContext(options);await publishingFixture(context);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());return {context,page};};
 try {
  const {context,page}=await fresh({viewport:{width:1440,height:1000}});
  await page.goto(base);await page.locator('.continue-section').waitFor();
  assert.equal(await page.locator('.continue-card').count(),0);
  await page.locator('[data-open=fordoejelse]').click();await page.locator('#lesson-heading').waitFor();
  await page.locator('[data-action=complete]').click();await page.waitForFunction(()=>location.hash.includes('s2'));
  const deep=page.url();await page.reload();await page.locator('#lesson-heading').waitFor();assert.match(await page.locator('#lesson-heading').textContent(),/Fra mund/);
  await home(page);assert.equal(await page.locator('.continue-progress').getAttribute('aria-valuenow'),'20');
  await page.goBack();await page.locator('#lesson-heading').waitFor();assert.equal(page.url(),deep);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'lesson-heading');
  await login(page);await page.locator('[data-edit=fordoejelse]').click();await page.locator('#editor').waitFor();
  assert.equal(await page.locator('[data-action=export-draft]').count(),0);
  const initial=await readState(page),p=initial.paths.find(p=>p.id==='fordoejelse'),stepId=p.steps[0].id;
  await page.locator('[name=title]').fill('Fordøjelsessystemet – min udgave');await settle(page);await page.reload();await page.locator('#teacher-code').waitFor();
  await page.locator('#teacher-code').fill('0000');await page.locator('#teacher-login button').click();assert.match(await page.locator('#code-error').textContent(),/forkert/);
  await page.locator('#teacher-code').fill('7269');await page.locator('#teacher-login button').click();await page.locator('#editor').waitFor();assert.match(await page.locator('[name=title]').inputValue(),/min udgave/);
  await page.locator(`[data-editor-step="${stepId}"]`).click();await page.locator('[data-step-move="1"]').click();await settle(page);
  await page.locator('[data-action=toggle-preview]').click();await page.locator('#preview-lesson .lesson').waitFor();assert.equal(await page.locator('#preview-lesson .step-list').count(),0);
  await publishCurrent(page);
  let saved=await readState(page);assert.deepEqual(saved.progress.fordoejelse.done,[stepId]);assert.equal(saved.paths.find(p=>p.id==='fordoejelse').steps[1].id,stepId);
  await home(page);assert.equal(await page.locator('.continue-progress').getAttribute('aria-valuenow'),'20');
  // Every existing pharmacology and semester-five question works, including reload persistence.
  for(const semester of [3,5]) {
   await page.locator(`[data-semester="${semester}"]`).click();await page.locator('.path-card [data-open]').click();await page.locator('#lesson-heading').waitFor();
   saved=await readState(page);const path=saved.paths.find(p=>p.semester===semester);let count=0;
   for(let i=0;i<path.steps.length;i++) {
    await page.waitForFunction(id=>decodeURIComponent(location.hash).endsWith(id),path.steps[i].id);
    for(let j=0;j<path.steps[i].questions.length;j++) {
     const q=path.steps[i].questions[j];await page.locator(`[data-answer="${j}:${q.correct}"]`).click();await page.locator(`#feedback-${j}`).waitFor();assert.match(await page.locator(`#feedback-${j}`).textContent(),/Korrekt!/);assert.equal(await page.evaluate(()=>document.activeElement.id),`feedback-${j}`);count++;
    }
    if(i===0){await page.reload();await page.locator('#feedback-0').waitFor();}
    if(semester===5){await page.locator('#reflection').fill('Faglig refleksion '+i);await page.locator('.reflection-guide summary').click();assert.ok((await page.locator('.reflection-guide .prose').textContent()).length>20);}
    await page.locator('[data-action=complete]').click();
   }
   await page.getByText('Godt gået! Læringsstien er gennemført.',{exact:true}).waitFor();
   assert.equal(count,semester===3?20:36);await home(page);assert.equal(await page.locator(`[data-resume="${path.id}"]`).count(),0);
  }
  // New teacher content, one-step editing, validation, choices, undo, preview and deletion.
  await login(page);await page.locator('[data-action=new]').click();await page.locator('#editor').waitFor();
  await page.locator('[data-action=publish]').click();await page.locator('#validation').waitFor();assert.match(await page.locator('#validation').textContent(),/titel/);
  await page.locator('[name=title]').fill('Ny øvelse');await page.locator('[name=description]').fill('En test af cases og spørgsmål');
  await page.locator('[data-editor-step]').nth(1).click();await page.locator('[data-field=title]').fill('Beslutning');await page.locator('[data-field=text]').fill('Fiktiv case');
  await page.locator('[data-action=add-question]').click();await page.locator('[data-q=q]').fill('Hvad vælger du?');
  for(let i=0;i<3;i++)await page.locator(`[data-choice="${i}"]`).fill(['Rigtigt','Forkert','Også forkert'][i]);
  await page.locator('[data-q=why]').fill('Begrundelse for det korrekte svar og misforståelser.');
  await page.locator('[data-option-move="0:1:-1"]').click();await page.waitForFunction(()=>document.querySelector('[data-q=correct]').value==='1');assert.equal(await page.locator('[data-q=correct]').inputValue(),'1');
  await page.locator('[data-action=duplicate-step]').click();await page.waitForFunction(()=>document.querySelectorAll('.editor-outline li').length===2);assert.equal(await page.locator('.editor-outline li').count(),2);
  await page.locator('[data-action=undo]').click();await page.waitForFunction(()=>document.querySelectorAll('.editor-outline li').length===1);assert.equal(await page.locator('.editor-outline li').count(),1);
  await page.locator('.editor-outline li button').first().click();await page.locator('[data-action=toggle-preview]').click();await page.locator('[data-answer="0:0"]').click();await page.locator('#feedback-0').waitFor();assert.match(await page.locator('#feedback-0').textContent(),/Prøv at tænke/);
  await page.locator('[data-action=retry]').click();await page.locator('[data-answer="0:1"]').click();await page.locator('#feedback-0').waitFor();assert.match(await page.locator('#feedback-0').textContent(),/Korrekt!/);
  await publishCurrent(page);
  assert.equal(await page.locator('[data-action="export"],#import,[data-action="backup"],#restore,[data-action="previous-backup"],[data-update]').count(),0);
  assert.equal(await page.getByText('For at dele indhold skal du eksportere',{exact:false}).count(),0);
  const before=(await readState(page)).paths.length;
  const created=(await readState(page)).paths.find(p=>p.title==='Ny øvelse');assert.ok(created);
  await withdraw(page,created.id);await page.waitForFunction(n=>document.querySelectorAll('.teacher-list>div').length===n,before-1);
  await page.reload();await page.locator('#teacher-code').waitFor();await login(page);
  assert.equal((await readState(page)).paths.some(p=>p.id===created.id),false);
  await context.close();
  // Storage failure keeps editor open; retry succeeds.
  const fail=await fresh();await fail.page.goto(base);await fail.page.locator('.continue-section').waitFor();await login(fail.page);await fail.page.locator('[data-edit=fordoejelse]').click();await fail.page.locator('#editor').waitFor();
  await fail.page.evaluate(()=>{window.originalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){throw new DOMException('Quota','QuotaExceededError');};});
  await fail.page.locator('[name=title]').fill('Bevar mit arbejde');await fail.page.waitForTimeout(600);
  await fail.page.locator('#editor button[type=submit]').click();await fail.page.locator('#storage-status').waitFor();assert.equal(await fail.page.locator('#editor').count(),1);assert.equal(await fail.page.locator('[name=title]').inputValue(),'Bevar mit arbejde');
  await fail.page.evaluate(()=>IDBObjectStore.prototype.put=window.originalPut);await fail.page.locator('[data-action=retry-save]').click();await fail.page.waitForFunction(()=>document.querySelector('#storage-status').hidden);await fail.page.locator('#editor button[type=submit]').click();await fail.page.locator('.teacher-list').waitFor();await fail.context.close();
  // Concurrent tabs cannot silently overwrite one another.
  const tabs=await fresh();await tabs.page.goto(base);await tabs.page.locator('.continue-section').waitFor();
  const tab2=await tabs.context.newPage();tab2.on('pageerror',e=>errors.push(e.message));await tab2.goto(base);await tab2.locator('.continue-section').waitFor();
  await tabs.page.locator('[data-open=fordoejelse]').click();await tabs.page.locator('#lesson-heading').waitFor();
  await tabs.page.locator('[data-action=complete]').click();await tabs.page.waitForFunction(()=>location.hash.includes('s2'));
  await tab2.locator('[data-open=fordoejelse]').click();await tab2.locator('#storage-status').waitFor();assert.match(await tab2.locator('#storage-status').textContent(),/anden fane/);
  assert.equal((await readState(tab2)).progress.fordoejelse.done.length,1);await tabs.context.close();
  // Legacy migration and recovery are tested in isolated browsers before first startup.
  const legacy=await fresh();await legacy.context.addInitScript(()=>{if(!localStorage.getItem('seeded')){localStorage.setItem('seeded','1');localStorage.setItem('progress-v1',JSON.stringify({fordoejelse:{done:[0],last:1,notes:{4:'Bevar refleksion'}}}));}});await legacy.page.goto(base);await legacy.page.locator('.continue-card').waitFor();assert.equal(await legacy.page.locator('.continue-progress').getAttribute('aria-valuenow'),'20');assert.ok((await readState(legacy.page)).progress.fordoejelse.notes['fordoejelse:s5']);await legacy.context.close();
  const corrupt=await fresh();await corrupt.context.addInitScript(()=>localStorage.setItem('paths-v1','{"forkert":true}'));await corrupt.page.goto(base);await corrupt.page.locator('.recovery').waitFor();assert.equal(await corrupt.page.evaluate(()=>localStorage.getItem('paths-v1')),'{"forkert":true}');await corrupt.context.close();
  // Mobile 12-step path starts with the content, not a long navigation list.
  const mobile=await fresh({viewport:{width:390,height:844}});await mobile.page.goto(base);await mobile.page.locator('[data-semester="5"]').click();await mobile.page.locator('.path-card [data-open]').click();await mobile.page.locator('#lesson-heading').waitFor();
  assert.equal(await mobile.page.locator('.step-navigation').getAttribute('open'),null);assert.ok(await mobile.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await mobile.page.screenshot({path:'/tmp/laeringsstier-mobile.png',fullPage:true});await login(mobile.page);await mobile.page.locator('[data-edit="semester5-akut-kritisk-e26-v1"]').click();await mobile.page.locator('.editor-outline li button').first().click();await mobile.page.locator('[data-edit-step]').waitFor();assert.equal(await mobile.page.locator('[data-edit-step]').count(),1);assert.ok(await mobile.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mobile.page.screenshot({path:'/tmp/laeringsstier-editor-mobile.png',fullPage:true});await mobile.context.close();
  assert.deepEqual(errors,[]);console.log('PASS: migration, recovery, drafts, stable progress, browser history, deep links, focus, mobile, 56 clinical quiz questions, editor, preview, simplified teacher controls, deletion and storage failure');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
