const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.APP_URL||'http://127.0.0.1:3001/sygepleje-laeringsstier/';
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  const checkbox=name=>page.getByRole('checkbox',{name,exact:true});
  const waitSelected=name=>page.waitForFunction(name=>[...document.querySelectorAll('[name=path-subject]')].some(el=>el.value===name&&el.checked),name);
  const home=async()=>{await page.locator('header a[href="#/"]').first().click();await page.locator('.continue-section').waitFor();};
  const login=async()=>{await page.locator('header a[href="#/underviser"]').click();await page.locator('#teacher-code,[data-action=new],#editor').first().waitFor();if(await page.locator('#teacher-code').count()){await page.locator('#teacher-code').fill('7269');await page.locator('#teacher-login button').click();}await page.locator('#editor,[data-action=new]').first().waitFor();};
  await page.goto(base);await page.locator('.continue-section').waitFor();await login();
  await page.locator('[data-action=new]').click();await page.locator('#editor').waitFor();
  await page.locator('[name=title]').fill('Tværfaglig øvelse');await page.locator('[name=description]').fill('En sti med flere fag.');await page.locator('[name=semester]').selectOption('4');
  await checkbox('Anatomi og fysiologi').uncheck();
  await page.waitForFunction(()=>document.querySelector('#draft-status').textContent.includes('Kladde gemt'));
  assert.equal(await page.locator('#storage-status').isVisible(),false);
  await page.locator('#editor button[type=submit]').click();await page.locator('#validation').waitFor();assert.match(await page.locator('#validation').textContent(),/mindst ét fag/);
  await checkbox('Sygepleje').check();await checkbox('Farmakologi').check();
  await page.locator('#new-subject').fill('  Klinisk   kommunikation  ');await page.locator('[data-action=add-subject]').click();await waitSelected('Klinisk kommunikation');
  await page.locator('#new-subject').fill('farmakologi');await page.locator('#new-subject').press('Enter');await page.waitForFunction(()=>document.querySelector('#new-subject').value==='');assert.equal(await checkbox('Farmakologi').count(),1);
  await page.locator('#new-subject').fill('Alle fagområder');await page.locator('[data-action=add-subject]').click();await page.locator('#subject-error').getByText(/Skriv et fagnavn/).waitFor();await page.locator('#new-subject').fill('');
  await page.waitForFunction(()=>document.querySelector('#draft-status').textContent.includes('Kladde gemt'));
  await page.reload();await page.locator('#teacher-code').fill('7269');await page.locator('#teacher-login button').click();await page.locator('#subject-picker').waitFor();
  for(const name of ['Sygepleje','Farmakologi','Klinisk kommunikation'])assert.ok(await checkbox(name).isChecked());
  // A draft's new subject does not appear for students until the path is saved.
  await page.locator('[data-action=close-editor]').click();await page.locator('.draft-list').waitFor();const draftId=await page.locator('.draft-list [data-edit]').getAttribute('data-edit');
  await home();await page.locator('[data-semester="4"]').click();assert.equal(await page.locator('[data-subject="Klinisk kommunikation"]').count(),0);
  await login();await page.locator(`.draft-list [data-edit="${draftId}"]`).click();await page.locator('#subject-picker').waitFor();
  // Saving also adds a typed subject if the teacher has not pressed Add yet.
  await page.locator('#new-subject').fill('Etik');await page.locator('#editor button[type=submit]').click();await page.locator('.teacher-list').waitFor();
  await home();await page.locator('[data-semester="4"]').click();await page.locator('[data-subject="Etik"]').waitFor();
  for(const subject of ['Sygepleje','Farmakologi','Klinisk kommunikation','Etik','Alle fagområder']) {
   await page.locator(`[data-subject="${subject}"]`).click();assert.equal(await page.locator('.path-card').count(),1);assert.match(await page.locator('.path-card').textContent(),/Tværfaglig øvelse/);
  }
  await page.locator('[data-subject="Klinisk kommunikation"]').click();await page.locator('[data-semester="5"]').click();
  assert.equal(await page.locator('[data-subject="Klinisk kommunikation"]').count(),0);assert.equal(await page.locator('[data-subject="Alle fagområder"]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-semester="4"]').click();await page.locator(`[data-open="${draftId}"]`).click();await page.locator('#lesson-heading').waitFor();assert.match(await page.locator('.learning-head .eyebrow').textContent(),/Sygepleje.*Farmakologi.*Klinisk kommunikation.*Etik/);
  await page.locator('[data-action=complete]').click();await page.getByText('Godt gået! Læringsstien er gennemført.',{exact:true}).waitFor();
  await login();await page.locator(`[data-edit="${draftId}"]`).click();await page.locator('#subject-picker').waitFor();await checkbox('Farmakologi').uncheck();await page.locator('[name=semester]').selectOption('6');
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'/tmp/laeringsstier-fag-editor.png',fullPage:true});
  await page.locator('#editor button[type=submit]').click();await page.locator('.teacher-list').waitFor();await home();await page.locator('[data-semester="4"]').click();assert.equal(await page.locator('[data-subject="Klinisk kommunikation"]').count(),0);
  await page.locator('[data-semester="6"]').click();await page.locator('[data-subject="Klinisk kommunikation"]').click();assert.equal(await page.locator('.path-card').count(),1);assert.match(await page.locator('.progress-label').textContent(),/100%/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'/tmp/laeringsstier-fag-elev.png',fullPage:true});
  assert.equal(await page.locator('[data-subject="Farmakologi"]').count(),0);
  // Custom names can be reused on another path; deleting the last path removes its semester filter.
  await login();await page.locator('[data-action=new]').click();await page.locator('#subject-picker').waitFor();assert.equal(await checkbox('Klinisk kommunikation').count(),1);await page.locator('[data-action=close-editor]').click();await page.locator('.teacher-list').waitFor();await page.locator(`[data-delete="${draftId}"]`).click();await page.waitForFunction(id=>!document.querySelector(`[data-delete="${id}"]`),draftId);
  await home();await page.locator('[data-semester="6"]').click();assert.equal(await page.locator('[data-subject="Klinisk kommunikation"]').count(),0);
  assert.deepEqual(errors,[]);console.log('PASS: multiple subjects, custom names, deduplication, draft recovery, validation, semester filtering, changes/deletion, stable progress and mobile layout');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
