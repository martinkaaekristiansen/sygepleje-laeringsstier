// Run against npm run dev, or set APP_URL to a hosted build.
// PLAYWRIGHT_MODULE may point to an existing Playwright installation.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.APP_URL || 'http://127.0.0.1:3000');
    await page.locator('[data-action=teacher]').click();
    assert.equal(await page.locator('[data-action=new]').count(),0);
    await page.locator('#teacher-code').fill('1111');
    await page.locator('#teacher-login button').click();
    assert.match(await page.locator('#code-error').textContent(),/forkert/);
    assert.equal(await page.locator('[data-action=export]').count(),0);
    const unlock=async()=>{await page.locator('#teacher-code').fill('7269');await page.locator('#teacher-login button').click()};
    await unlock();
    await page.locator('[data-edit]').first().click();
    assert.equal(await page.locator('.quiz-editor').count(),5);
    assert.equal(await page.locator('[data-edit-step="3"] [data-question]').count(),5);
    await page.locator('[data-action=cancel]').click();
    await page.locator('[data-action=new]').click();
    await page.locator('[name=title]').fill('Spørgsmål på alle trin');
    await page.locator('[name=description]').fill('Browserkontrol');
    const types=['text','case','podcast','reflection','video','quiz'];
    for(let i=0;i<types.length;i++){
      if(i) await page.locator('[data-action=add-step]').click();
      const step=page.locator(`[data-edit-step="${i}"]`);
      await step.locator('[data-field=title]').fill('Trin '+types[i]);
      await step.locator('[data-field=text]').fill('Tekst bevares sammen med spørgsmål.');
      await step.locator('[data-field=type]').selectOption(types[i]);
      await step.locator('[data-add-question]').click();
      await step.locator('[data-q=q]').fill('Hvilket svar er korrekt?');
      for(let j=0;j<3;j++)await step.locator(`[data-choice="${j}"]`).fill(['Forkert','Korrekt','Også forkert'][j]);
      await step.locator('[data-q=correct]').selectOption('1');
      await step.locator('[data-q=why]').fill('Det andet svar er det korrekte i denne test.');
    }
    // Changing content type must preserve the questions and their answers.
    await page.locator('[data-edit-step="0"] [data-field=type]').selectOption('case');
    await page.locator('[data-edit-step="0"] [data-field=type]').selectOption('text');
    assert.equal(await page.locator('[data-edit-step="0"] [data-q=q]').inputValue(),'Hvilket svar er korrekt?');
    await page.locator('#editor button[type=submit]').click();
    await page.locator('[data-action=lock-teacher]').click();
    assert.equal(await page.locator('#editor').count(),0);
    assert.equal(await page.locator('[data-action=new]').count(),0);
    await unlock();
    await page.reload();
    await page.locator('[data-action=teacher]').click();
    assert.equal(await page.locator('#teacher-login').count(),1);
    await page.locator('[data-action=home]').first().click();
    await page.locator('.path-card').filter({hasText:'Spørgsmål på alle trin'}).locator('[data-open]').click();
    for(let i=0;i<types.length;i++){
      await page.locator(`[data-step="${i}"]`).click();
      assert.equal(await page.locator('.quiz fieldset').count(),1);
      assert.match(await page.locator('.prose').textContent(),/Tekst bevares/);
      assert.equal(await page.locator('[data-action=complete]').isDisabled(),true);
      if(types[i]==='reflection')await page.locator('#reflection').fill('Min refleksion');
      await page.locator('[data-answer="0:0"]').click();
      assert.match(await page.locator('.feedback').textContent(),/Prøv at tænke/);
      assert.equal(await page.locator('[data-action=complete]').isDisabled(),false);
      await page.locator('[data-action=retry]').click();
      await page.locator('[data-answer="0:1"]').click();
      assert.match(await page.locator('.feedback').textContent(),/Korrekt!/);
      if(types[i]==='reflection')assert.equal(await page.locator('#reflection').inputValue(),'Min refleksion');
      await page.locator('[data-action=complete]').click();
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    // Roundtrip questions attached to non-quiz steps through export/import.
    await page.locator('[data-action=teacher]').click();await unlock();
    const downloadPromise=page.waitForEvent('download');await page.locator('[data-action=export]').click();
    const download=await downloadPromise;
    const exported=await download.path();
    await page.locator('#import').setInputFiles(exported);
    await page.waitForFunction(()=>document.querySelectorAll('.teacher-list>div').length===4);
    assert.equal(await page.locator('.teacher-list>div').count(),4);
    // Invalid question data on a case step must be rejected without adding paths.
    const dialogPromise=page.waitForEvent('dialog');
    await page.locator('#import').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([{title:'Bad',description:'Bad',semester:1,subject:'Sygepleje',steps:[{title:'Case',type:'case',text:'Text',questions:[{q:'Bad',a:['A','B'],correct:5,why:'Invalid'}]}]}]))});
    const dialog=await dialogPromise;assert.match(dialog.message(),/kunne ikke importeres/);await dialog.accept();
    assert.equal(await page.locator('.teacher-list>div').count(),4);
    assert.deepEqual(errors,[]);
    console.log('PASS: PIN lock/unlock/relock, legacy demo, questions on all six step types, feedback, completion, persistence, reflection, import/export, invalid import and mobile layout');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
