const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
const base=process.env.APP_URL||'http://127.0.0.1:3001/sygepleje-laeringsstier/';
(async()=>{const {BLOOD_LEVELS,circuitFor}=await import('../public/circulation-data.js');const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});try{
 const page=await browser.newPage({viewport:{width:1360,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'#/sti/find-vej-kredsloeb/circulation-order');await page.locator('.route-card').first().waitFor();
 // Direct position selection supports long routes on mobile without repeated taps.
 const initialNames=await page.locator('.route-card strong').allTextContents();await page.locator('[data-move-to="0"]').selectOption({value:'3'});assert.equal((await page.locator('.route-card strong').allTextContents())[3],initialNames[0]);
 // Actual native drag and drop between adjacent visible cards.
 await page.locator('[data-card="0"]').scrollIntoViewIfNeeded();const dragNames=await page.locator('.route-card strong').allTextContents();await page.locator('[data-card="0"]').dragTo(page.locator('[data-card="1"]'));assert.equal((await page.locator('.route-card strong').allTextContents())[1],dragNames[0]);
 // Keyboard alternative, including persistence of an incomplete attempt.
 const before=await page.locator('.route-card strong').allTextContents();await page.locator('[data-move="0:1"]').focus();await page.keyboard.press('Enter');await page.locator('.circulation-save').filter({hasText:'Gemt på denne enhed.'}).waitFor();await page.reload();await page.locator('.route-card').first().waitFor();const after=await page.locator('.route-card strong').allTextContents();assert.equal(after[1],before[0]);
 for(const level of Object.values(BLOOD_LEVELS)){
  await page.locator('[data-level]').selectOption(level.id);await page.locator('[data-activity=order]').click();
  for(let i=0;i<level.steps.length;i++){const names=await page.locator('.route-card strong').allTextContents();if(names[i]===level.steps[i].name)continue;const from=names.findIndex((n,j)=>j>i&&n===level.steps[i].name);assert.ok(from>=0);for(let j=from;j>i;j--)await page.locator(`[data-move="${j}:-1"]`).click();}
  assert.deepEqual(await page.locator('.route-card strong').allTextContents(),level.steps.map(n=>n.name));await page.locator('button[type=submit]').click();assert.match(await page.locator('#result-title').textContent(),/100 %/);
  await page.locator('[data-activity=context]').click();const selectors=await page.locator('[data-context]').evaluateAll(es=>es.map(e=>e.dataset.context));for(const selector of selectors){const [i,key]=selector.split(':'),index=Number(i),n=level.steps[index],value=key==='before'?level.steps[(index+level.steps.length-2)%(level.steps.length-1)].id:key==='after'?level.steps[index+1].id:key==='oxygen'?n.oxygen:circuitFor(n);await page.locator(`[data-context="${selector}"]`).selectOption(value);}await page.locator('button[type=submit]').click();assert.match(await page.locator('#result-title').textContent(),/100 %/);
  await page.locator('.circulation-save').filter({hasText:'Gemt på denne enhed.'}).waitFor();await page.reload();await page.locator('#result-title').waitFor();assert.match(await page.locator('#result-title').textContent(),/100 %/);assert.equal(await page.locator('.activity-tabs small').filter({hasText:'✓ Bestået'}).count(),2);
  assert.equal(await page.locator('[data-activity=labels],[data-activity=exam]').count(),0);
 }
 await page.screenshot({path:'/tmp/circulation-context-desktop.png',fullPage:true});
 await page.locator('[data-new]').click();await page.locator('button[type=submit]').click();assert.match(await page.locator('#result-title').textContent(),/Øv videre · 0 %/);assert.match(await page.locator('.activity-heading').textContent(),/bedste resultat 100/);await page.locator('[data-repeat]').click();assert.equal(await page.locator('.location-cards fieldset').count(),6);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/circulation-context-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('[data-level]').selectOption('easy');assert.equal(await page.locator('.activity-tabs button').count(),2);
 // Simulate upgrading an existing device: retired activities disappear, stored results stay.
 await page.locator('.circulation-save').filter({hasText:'Gemt på denne enhed.'}).waitFor();
 const legacy=await page.evaluate(async()=>{
  const prefix=document.querySelector('script[type=module]').src.replace(/app.js$/,'');const {openStorage}=await import(prefix+'storage.js');const {newDraft,assess,saveResult}=await import(prefix+'circulation-engine.js');const store=await openStorage(),state=await store.load(),path=state.paths.find(p=>p.id==='find-vej-kredsloeb'),record=state.progress[path.id];
  path.steps.splice(1,0,{id:'circulation-labels',title:'Sæt navn på anatomien',type:'game',text:'',questions:[]});path.steps.push({id:'circulation-exam',title:'Find vej uden hjælp',type:'game',text:'',questions:[]});
  for(const activity of ['labels','exam']){const d=newDraft('easy',activity);record.circulation.drafts[`easy:${activity}`]=d;saveResult(record,assess('easy',activity,d));}
  record.last='circulation-exam';const before=structuredClone(record.circulation);await store.save(state);store.close();return before;
 });
 await page.evaluate(()=>history.replaceState(null,'','#/sti/find-vej-kredsloeb/circulation-exam'));await page.reload();await page.locator('#activity-title').waitFor();assert.equal(await page.locator('[data-activity]').count(),2);assert.match(await page.locator('#activity-title').textContent(),/Hvor er blodcellen/);
 const upgraded=await page.evaluate(async()=>{const prefix=document.querySelector('script[type=module]').src.replace(/app.js$/,'');const {openStorage}=await import(prefix+'storage.js');const store=await openStorage(),state=await store.load();store.close();return state;});
 assert.deepEqual(upgraded.paths.find(p=>p.id==='find-vej-kredsloeb').steps.map(s=>s.id),['circulation-order','circulation-context']);assert.deepEqual(upgraded.progress['find-vej-kredsloeb'].circulation,legacy);
 await page.goto(base+'#/sti/find-vej-kredsloeb/circulation-labels');await page.locator('#activity-title').waitFor();assert.equal(await page.locator('[data-activity=labels],[data-activity=exam]').count(),0);

 await page.goto(base);await page.locator('[data-semester="1"]').click();assert.equal(await page.locator('[data-open="find-vej-kredsloeb"]').count(),1);assert.equal(await page.locator('[data-open="blodcellens-rejse"]').count(),1);assert.deepEqual(errors,[]);console.log('PASS circulation: all 3 levels × 2 activities, drag/keyboard, retry, best score, reload, mobile, navigation, retired steps and preserved historical results');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
