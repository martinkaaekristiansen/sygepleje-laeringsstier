const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.APP_URL||'http://127.0.0.1:3001/sygepleje-laeringsstier/';
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];let accept=true;
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>accept?d.accept():d.dismiss());
  const selected=(q,a)=>page.locator(`[data-answer="${q}:${a}"]`);
  const answer=async(q,a)=>{await selected(q,a).click();await page.waitForFunction(([q,a])=>document.querySelector(`[data-answer="${q}:${a}"]`).getAttribute('aria-pressed')==='true',[q,a]);};
  const inspect=async(q,a)=>{await selected(q,a).click();await page.waitForFunction(([q,a])=>document.querySelector(`[data-answer="${q}:${a}"]`).getAttribute('aria-expanded')==='true',[q,a]);};
  await page.goto(base);await page.locator('.filters').waitFor();
  assert.deepEqual(await page.locator('[data-subject]').allTextContents(),['Alle fagområder','Anatomi og fysiologi']);
  await page.locator('[data-semester="2"]').click();assert.deepEqual(await page.locator('[data-subject]').allTextContents(),['Alle fagområder']);
  await page.locator('[data-semester="3"]').click();assert.deepEqual(await page.locator('[data-subject]').allTextContents(),['Alle fagområder','Farmakologi']);
  await page.locator('[data-semester="1"]').click();await page.locator('[data-open=fordoejelse]').click();await page.locator('#lesson-heading').waitFor();await page.locator('[data-action=complete]').click();await page.waitForFunction(()=>location.hash.includes('s2'));
  await page.locator('[data-step="3"]').click();await selected(0,0).waitFor();
  await answer(0,1);await answer(0,2);assert.equal(await selected(0,1).getAttribute('aria-pressed'),'false');
  await answer(0,0);await inspect(0,1);assert.equal(await selected(0,0).getAttribute('aria-pressed'),'true');assert.match(await page.locator('#option-feedback-0').textContent(),/amylase/);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'option-feedback-0');
  await selected(0,2).focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('[data-answer="0:2"]').getAttribute('aria-expanded')==='true');assert.equal(await selected(0,0).getAttribute('aria-pressed'),'true');
  await page.reload();await selected(0,0).waitFor();assert.equal(await selected(0,0).getAttribute('aria-pressed'),'true');await inspect(0,2);assert.equal(await selected(0,0).getAttribute('aria-pressed'),'true');
  for(const [q,a] of [[1,1],[2,2],[3,1],[4,1]])await answer(q,a);
  assert.match(await page.locator('.quiz .result h3').textContent(),/5 af 5/);await inspect(2,0);assert.match(await page.locator('.quiz .result h3').textContent(),/5 af 5/);
  await page.locator('[data-action=complete]').click();await page.locator('#reflection').waitFor();await page.locator('#reflection').fill('Bevar refleksionen ved genstart.');await page.locator('[data-action=previous]').click();await selected(0,0).waitFor();
  accept=false;await page.locator('[data-action=retry]').click();assert.equal(await selected(0,0).getAttribute('aria-pressed'),'true');accept=true;
  await page.locator('[data-action=retry]').click();await page.waitForFunction(()=>document.querySelectorAll('.answer[aria-pressed="true"]').length===0);assert.equal(await page.locator('[data-step="0"] > span').textContent(),'✓');assert.equal(await page.locator('[data-step="3"] > span').textContent(),'4');
  await answer(0,2);await answer(0,0);await page.locator('[data-step="4"]').click();await page.locator('#reflection').waitFor();assert.equal(await page.locator('#reflection').inputValue(),'Bevar refleksionen ved genstart.');
  // Teacher can add feedback per option, and it follows the answer when reordered.
  await page.locator('header a[href="#/underviser"]').click();await page.locator('#teacher-code').fill('7269');await page.locator('#teacher-login button').click();await page.locator('[data-edit=fordoejelse]').click();await page.locator('[data-editor-step="fordoejelse:s4"]').click();
  const question=page.locator('[data-question]').first();
  await question.locator('[data-explanation="0"]').fill('Amylase i spyttet starter nedbrydningen i munden.');
  await question.locator('[data-explanation="1"]').fill('Mavesækken er ikke startstedet. Stivelsesnedbrydningen er begyndt i munden, før maden når mavesækken.');
  await question.locator('[data-explanation="2"]').fill('Tyktarmen ligger senere i fordøjelseskanalen, så nedbrydningen starter ikke dér.');
  await page.locator('[data-option-move="0:1:-1"]').click();await page.waitForFunction(()=>document.querySelector('[data-q=correct]').value==='1');assert.match(await page.locator('[data-explanation="0"]').first().inputValue(),/Mavesækken/);
  await page.locator('[data-add-option="0"]').click();await question.locator('[data-choice="3"]').fill('Et midlertidigt svar');await question.locator('[data-explanation="3"]').fill('Midlertidig forklaring');await page.locator('[data-remove-option="0:3"]').click();await page.waitForFunction(()=>document.querySelectorAll('[data-question]')[0].querySelectorAll('[data-choice]').length===3);
  await page.locator('[data-action=toggle-preview]').click();await answer(0,1);await inspect(0,0);assert.match(await page.locator('#option-feedback-0').textContent(),/Mavesækken er ikke startstedet/);assert.equal(await selected(0,1).getAttribute('aria-pressed'),'true');
  await page.locator('#editor button[type=submit]').click();await page.locator('.teacher-list').waitFor();await page.goto(base+'#/sti/fordoejelse/fordoejelse%3As4');await selected(0,1).waitFor();assert.equal(await selected(0,1).getAttribute('aria-pressed'),'true');await inspect(0,0);assert.match(await page.locator('#option-feedback-0').textContent(),/Mavesækken er ikke startstedet/);
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('#option-feedback-0').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/laeringsstier-quiz-feedback.png'});
  await page.reload();await selected(0,1).waitFor();await inspect(0,2);assert.equal(await selected(0,1).getAttribute('aria-pressed'),'true');
  assert.deepEqual(errors,[]);console.log('PASS: populated semester filters, answer changes, correct-answer retention, choice explanations, reload, keyboard, restart/cancel, isolated progress, editor reordering and mobile');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
