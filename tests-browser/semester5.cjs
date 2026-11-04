const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:3000');
  const id='semester5-akut-kritisk-e26-v1';
  await page.evaluate(id=>{
   const previous=JSON.parse(localStorage.getItem('paths-v1')).filter(p=>p.id!==id);
   previous.find(p=>p.semester===3).title='Mit tilpassede farmakologiforløb';
   localStorage.setItem('paths-v1',JSON.stringify(previous));
   localStorage.setItem('builtin-paths-v1',JSON.stringify(['farmakologi-medicinhaandtering-3semester-v1']));
   localStorage.setItem('progress-v1',JSON.stringify({fordoejelse:{done:[0],last:1,notes:{4:'Gem min refleksion'}}}));
  },id);
  await page.reload();
  const saved=await page.evaluate(()=>({paths:JSON.parse(localStorage.getItem('paths-v1')),progress:JSON.parse(localStorage.getItem('progress-v1'))}));
  assert.equal(saved.paths.find(p=>p.semester===3).title,'Mit tilpassede farmakologiforløb');
  assert.equal(saved.progress.fordoejelse.notes[4],'Gem min refleksion');
  const path=saved.paths.find(p=>p.id===id);assert.equal(saved.paths.filter(p=>p.id===id).length,1);
  await page.locator('[data-semester="5"]').click();await page.locator('[data-subject="Sygepleje"]').click();
  assert.match(await page.locator('.card-meta').textContent(),/120 min/);
  await page.screenshot({path:'/tmp/semester5-mobile-overview.png',fullPage:true});
  await page.locator(`[data-open="${id}"]`).click();
  let answers=0;
  for(const [i,step] of path.steps.entries()){
   assert.equal(await page.locator('.quiz fieldset').count(),3);
   assert.equal(await page.locator('[data-action=complete]').isDisabled(),true);
   const note='Refleksion til trin '+(i+1);
   await page.locator('#reflection').fill(note);
   for(const [j,q] of step.questions.entries()){
    await page.locator(`[data-answer="${j}:${q.correct}"]`).click();answers++;
   }
   assert.equal(await page.locator('.feedback.correct').count(),3);
   assert.equal(await page.locator('#reflection').inputValue(),note);
   await page.locator('.reflection-guide summary').click();
   assert.equal(await page.locator('.reflection-guide .prose').textContent(),step.guide);
   if(i===0)await page.screenshot({path:'/tmp/semester5-mobile-lesson.png',fullPage:true});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.locator('[data-action=complete]').click();
  }
  assert.equal(answers,36);
  await page.reload();await page.locator('[data-semester="5"]').click();
  assert.match(await page.locator('.progress-label').textContent(),/100%/);
  await page.locator('[data-open]').click();
  assert.equal(await page.locator('#reflection').inputValue(),'Refleksion til trin 12');
  // Guide remains editable and is preserved by the teacher's save/export/import flow.
  await page.locator('[data-action=teacher]').click();await page.locator('#teacher-code').fill('7269');await page.locator('#teacher-login button').click();
  await page.locator(`[data-edit="${id}"]`).click();
  assert.equal(await page.locator('[data-question]').count(),36);
  assert.equal(await page.locator('[data-field=guide]').count(),12);
  await page.locator('[data-edit-step="0"] [data-field=guide]').fill('Min vejledning <script>test</script>');
  await page.locator('#editor button[type=submit]').click();
  const before=await page.locator('.teacher-list>div').count();
  const downloaded=page.waitForEvent('download');await page.locator('[data-action=export]').click();const file=await downloaded;
  await page.locator('#import').setInputFiles(await file.path());
  await page.waitForFunction(count=>document.querySelectorAll('.teacher-list>div').length===count,2*before);
  const guides=await page.evaluate(()=>JSON.parse(localStorage.getItem('paths-v1')).filter(p=>p.semester===5).map(p=>p.steps[0].guide));
  assert.deepEqual(guides,['Min vejledning <script>test</script>','Min vejledning <script>test</script>']);
  await page.locator('[data-action=home]').first().click();await page.locator('[data-semester="5"]').click();await page.locator(`[data-open="${id}"]`).click();
  await page.locator('.reflection-guide summary').click();
  assert.equal(await page.locator('.reflection-guide script').count(),0);
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'/tmp/semester5-desktop-lesson.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS: 5th-semester filtering, migration, all 36 answers, all 12 reflection guides, notes/progression persistence, guide editing/import/export, escaping and mobile layout');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
