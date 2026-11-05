const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.APP_URL||'http://127.0.0.1:3001/sygepleje-laeringsstier/';
const readState=page=>page.evaluate(async()=>{
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('laeringsstier-v2');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 const store=db.transaction('records','readonly').objectStore('records');const keys=['meta','paths','progress','drafts','installed','dismissedUpdates'];
 const values=await Promise.all(keys.map(k=>new Promise(r=>{const req=store.get(k);req.onsuccess=()=>r(req.result);})));db.close();return {...values[0],...Object.fromEntries(keys.slice(1).map((k,i)=>[k,values[i+1]]))};
});
const home=async page=>{await page.locator('header a[href="#/"]').first().click();await page.locator('.continue-section').waitFor();};
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],requests=[];let accept=true;
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));page.on('dialog',d=>accept?d.accept():d.dismiss());
  await page.goto(base);await page.locator('.continue-section').waitFor();
  const initial=await readState(page);assert.deepEqual(initial.paths.map(p=>p.semester),[3,5,1]);assert.equal(await page.locator('[data-semester]').count(),7);
  assert.equal(await page.getByRole('link',{name:/Underviser/}).count(),0);
  await page.locator('[data-semester="1"]').click();assert.equal(await page.locator('.path-card').count(),1);assert.equal(await page.locator('.filters button').count(),2);assert.equal(await page.locator('[data-action=teacher]').count(),0);
  await page.goto(base+'#/underviser');await page.locator('.continue-section').waitFor();assert.equal(await page.locator('input[type=password],#editor').count(),0);
  await page.goto(base+'#/sti/fordoejelse');await page.getByRole('heading',{name:'Læringsstien blev ikke fundet'}).waitFor();
  await home(page);await page.locator('[data-semester="3"]').click();await page.locator('.path-card [data-open]').click();await page.locator('#lesson-heading').waitFor();
  const pharma=initial.paths[0],q=pharma.steps[0].questions[0],wrong=(q.correct+1)%q.a.length;
  await page.locator(`[data-answer="0:${wrong}"]`).click();await page.locator('#feedback-0').waitFor();
  await page.locator(`[data-answer="0:${q.correct}"]`).click();await page.locator('#feedback-0').waitFor();
  await page.locator(`[data-answer="0:${wrong}"]`).click();await page.locator('#option-feedback-0').waitFor();
  assert.equal(await page.locator(`[data-answer="0:${q.correct}"]`).getAttribute('aria-pressed'),'true');
  await page.reload();await page.locator('#lesson-heading').waitFor();assert.equal(await page.locator(`[data-answer="0:${q.correct}"]`).getAttribute('aria-pressed'),'true');
  accept=false;await page.locator('[data-action=retry]').click();assert.equal(await page.locator(`[data-answer="0:${q.correct}"]`).getAttribute('aria-pressed'),'true');
  accept=true;await page.locator('[data-action=retry]').click();await page.locator('#feedback-0').waitFor({state:'detached'});
  await home(page);assert.equal(await page.locator('.continue-card').count(),1);assert.equal(await page.locator('.continue-progress').getAttribute('aria-valuenow'),'0');
  for(const path of initial.paths.filter(p=>p.semester!==1)) {
   await page.locator(`[data-semester="${path.semester}"]`).click();await page.locator(`.path-card [data-open="${path.id}"]`).click();
   let count=0;
   for(let i=0;i<path.steps.length;i++) {
    const s=path.steps[i];await page.waitForFunction(id=>decodeURIComponent(location.hash).endsWith(id),s.id);
    for(let j=0;j<s.questions.length;j++) {await page.locator(`[data-answer="${j}:${s.questions[j].correct}"]`).click();await page.locator(`#feedback-${j}`).waitFor();assert.match(await page.locator(`#feedback-${j}`).textContent(),/Korrekt!/);count++;}
    if(s.type==='reflection') {await page.locator('#reflection').fill('Min faglige refleksion '+i);await page.locator('.reflection-guide summary').click();assert.ok(await page.locator('.reflection-guide .prose').isVisible());}
    const deep=page.url();await page.locator('[data-action=complete]').click();
    if(i===0){await home(page);assert.equal(await page.locator('.continue-progress').getAttribute('aria-valuenow'),String(Math.round(100/path.steps.length)));await page.goBack();await page.locator('#lesson-heading').waitFor();assert.notEqual(page.url(),deep);}
   }
   await page.getByText('Godt gået! Læringsstien er gennemført.',{exact:true}).waitFor();assert.equal(count,path.semester===3?20:36);
   await home(page);assert.equal(await page.locator('.continue-card').count(),0);
  }
  const complete=await readState(page);for(const p of initial.paths.filter(p=>p.semester!==1))assert.equal(complete.progress[p.id].done.length,p.steps.length);
  assert.equal(Object.keys(complete.progress[initial.paths[1].id].notes).length,12);
  await page.setViewportSize({width:390,height:844});await page.reload();await page.locator('.continue-section').waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('.path-card [data-open]').click();await page.locator('#lesson-heading').waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'/tmp/laeringsstier-studerende.png'});
  assert.deepEqual(errors,[]);assert.ok(!requests.some(u=>/publisher|catalog\.json|workers\.dev/.test(u)));
  await page.close();
  // Upgrade an existing IndexedDB profile, including data left by the removed publishing version.
  const upgrade=await browser.newPage();await upgrade.goto(base);await upgrade.locator('.continue-section').waitFor();
  const old={...structuredClone(initial.paths[0]),id:'fordoejelse',builtinId:'fordoejelse',semester:1,title:'Tidligere sti'};
  const seeded={...complete,paths:[old,...complete.paths],drafts:{fordoejelse:{path:old}},publication:{version:1,known:{},pending:{},history:{}}};
  await upgrade.evaluate(async state=>{
   const db=await new Promise(r=>{const req=indexedDB.open('laeringsstier-v2');req.onsuccess=()=>r(req.result);});
   await new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite'),store=tx.objectStore('records');for(const [k,v]of Object.entries(state))if(!['schemaVersion','revision'].includes(k))store.put(v,k);store.put({schemaVersion:2,revision:state.revision},'meta');tx.oncomplete=resolve;tx.onerror=reject;});db.close();
  },seeded);
  await upgrade.reload();await upgrade.locator('.continue-section').waitFor();const migrated=await readState(upgrade);
  assert.deepEqual(migrated.paths,complete.paths);assert.deepEqual(migrated.progress,complete.progress);assert.equal(migrated.drafts.fordoejelse,undefined);
  await upgrade.goto(base+'#/sti/fordoejelse');await upgrade.getByRole('heading',{name:'Læringsstien blev ikke fundet'}).waitFor();await upgrade.close();
  // Old localStorage data also migrates without restoring the retired path.
  const legacy=await browser.newPage();await legacy.addInitScript(({old,paths})=>{if(!localStorage.getItem('paths-v1')){localStorage.setItem('paths-v1',JSON.stringify([old,...paths]));localStorage.setItem('progress-v1',JSON.stringify({[paths[0].id]:{done:[0],last:1,notes:{1:'Bevar denne note'}}}));}},{old,paths:initial.paths});
  await legacy.goto(base);await legacy.locator('.continue-section').waitFor();const migratedLegacy=await readState(legacy);assert.equal(migratedLegacy.paths.length,3);assert.deepEqual(migratedLegacy.progress[pharma.id].done,[pharma.steps[0].id]);assert.equal(migratedLegacy.progress[pharma.id].notes[pharma.steps[1].id],'Bevar denne note');await legacy.close();
  console.log('PASS: no teacher or publishing UI/network, retired path absent on new and old devices, 56 questions, corrections/explanations/restart, reflections, progression, migration, deep links, history and mobile');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
