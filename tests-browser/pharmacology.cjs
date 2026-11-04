const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:3000');
  // Simulate the old version's saved content and progress before this path existed.
  await page.evaluate(()=>{
   const demo=JSON.parse(localStorage.getItem('paths-v1')).find(p=>p.id==='fordoejelse');
   demo.title='Min lokale demo';
   localStorage.setItem('paths-v1',JSON.stringify([demo,{id:'lokal',title:'Min egen sti',semester:2,subject:'Sygepleje',description:'Bevares',steps:[{title:'Tekst',type:'text',text:'Min egen tekst'}]}]));
   localStorage.setItem('progress-v1',JSON.stringify({fordoejelse:{done:[0],last:1,notes:{4:'Min refleksion'}}}));
   localStorage.removeItem('builtin-paths-v1');
  });
  await page.reload();
  const saved=await page.evaluate(()=>({paths:JSON.parse(localStorage.getItem('paths-v1')),progress:JSON.parse(localStorage.getItem('progress-v1'))}));
  assert.equal(saved.paths.length,4);assert.equal(saved.paths[0].title,'Min lokale demo');assert.equal(saved.paths[1].steps[0].text,'Min egen tekst');
  assert.deepEqual(saved.progress.fordoejelse,{done:[0],last:1,notes:{4:'Min refleksion'}});
  const path=saved.paths.find(p=>p.semester===3&&p.subject==='Farmakologi');assert.ok(path);
  await page.locator('[data-semester="3"]').click();await page.locator('[data-subject="Farmakologi"]').click();
  await page.locator('[data-open]').click();
  assert.match(await page.locator('.prose').textContent(),/ikke et facit/);
  let answered=0;
  for(const [i,step] of path.steps.entries()){
   assert.equal(await page.locator('.quiz fieldset').count(),5);
   assert.equal(await page.locator('.question-source').count(),5);
   assert.equal(await page.locator('[data-action=complete]').isDisabled(),true);
   for(const [j,q] of step.questions.entries()){
    await page.locator(`[data-answer="${j}:${q.correct}"]`).click();answered++;
   }
   assert.equal(await page.locator('.feedback.correct').count(),5);
   assert.match(await page.locator('.result').first().textContent(),/5 af 5/);
   await page.locator('[data-action=complete]').click();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  assert.equal(answered,20);
  await page.reload();await page.locator('[data-semester="3"]').click();
  assert.match(await page.locator('.progress-label').textContent(),/100%/);
  const count=await page.evaluate(id=>JSON.parse(localStorage.getItem('paths-v1')).filter(p=>p.id===id).length,path.id);assert.equal(count,1);
  await page.locator('[data-action=teacher]').click();await page.locator('#teacher-code').fill('7269');await page.locator('#teacher-login button').click();
  await page.locator(`[data-edit="${path.id}"]`).click();assert.equal(await page.locator('[data-question]').count(),20);
  await page.locator('[data-action=cancel]').click();page.once('dialog',d=>d.accept());await page.locator(`[data-delete="${path.id}"]`).click();
  await page.reload();await page.locator('[data-semester="3"]').click();assert.equal(await page.locator('[data-open]').count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS: existing-user migration preserves content/progress, 3rd-semester filter, 20 answers, source references, completion persistence, teacher editing, deletion persistence and mobile layout');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
