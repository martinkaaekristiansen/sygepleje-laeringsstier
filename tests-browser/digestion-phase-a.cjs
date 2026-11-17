const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const base = process.env.APP_URL || 'http://127.0.0.1:3001/sygepleje-laeringsstier/';
const viewports = [
  {width:1280,height:800}, {width:1024,height:768}, {width:768,height:1024},
  {width:390,height:844}, {width:375,height:667}, {width:320,height:568},
  {width:568,height:320}, {width:667,height:375}, {width:844,height:390},
];
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce', viewport: {width:1280,height:800} });
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'#/sti/fordoejelsens-vilde-rejse/digestion-stanley');
    await page.locator('[data-digest=start]').click();
    await page.locator('[data-digest=skip]').click();
    await page.locator('[data-entry]').filter({hasText:'Cavitas oris'}).click();
    await page.locator('[data-digest=skip]').click();
    await page.locator('[data-choice]').first().waitFor();
    async function layout(label) {
      const result=await page.evaluate(()=>{
        const rect = s => document.querySelector(s).getBoundingClientRect().toJSON();
        const panel=rect('.digest-panel'), info=rect('.digest-learning'), heading=rect('.digest-panel h2'), map=rect('.blood-minimap');
        const buttons=[...document.querySelectorAll('[data-choice]')].map(b=>b.getBoundingClientRect().toJSON());
        const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
        return {panel,info,heading,map,buttons,collision:overlap(panel,info)||overlap(panel,map)||overlap(info,map),
          answerOverlap: buttons.some((b,i)=>overlap(b,heading)||buttons.some((c,j)=>i!==j&&overlap(b,c))),
          width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth};
      });
      assert.equal(result.collision,false,label+': panel, information, map separated '+JSON.stringify(result));
      assert.equal(result.answerOverlap,false,label+': answer and question do not overlap');
      assert.ok(result.panel.bottom<=result.height && result.panel.left>=0 && result.panel.right<=result.width,label);
      assert.ok(result.info.bottom<result.panel.top,label+': permanent text remains above controls');
      assert.ok(result.scroll<=result.width,label+': no horizontal scroll');
      for(const b of result.buttons) assert.ok(b.height>=44,label+': touch target');
      console.log('PASS layout:',label);
    }
    for (const v of viewports) {
      await page.setViewportSize(v); await page.waitForFunction(() => Math.abs(document.querySelector('#digestion-root').clientHeight-innerHeight)<2); await page.waitForTimeout(200);
      await layout('enzyme '+v.width+'x'+v.height);
      const identities=JSON.parse(await page.locator('canvas').getAttribute('data-enzyme-identities'));
      assert.deepEqual(await page.locator('[data-choice] [data-enzyme-id]').evaluateAll(es=>es.map(e=>e.dataset.enzymeId)),identities);
      assert.equal(await page.locator('[data-setting=quality],.digest-reader,.digest-learning button,[data-digest=info]').count(),0);
      await page.screenshot({path:`/tmp/phase-a-enzyme-${v.width}x${v.height}.png`});
    }
    await page.setViewportSize({width:1280,height:800});
    const before=await page.locator('.digest-panel').textContent();
    const points=JSON.parse(await page.locator('canvas').getAttribute('data-targets'));
    const box=await page.locator('canvas').boundingBox();
    for(const point of points.filter(p=>p.visible)) {
      const x=box.x+point.x/100*box.width, y=box.y+point.y/100*box.height;
      await page.mouse.click(x,y);
    }
    // Click the central enzyme area, then drag to verify independent look controls.
    await page.mouse.click(640,400);
    assert.equal(await page.locator('.digest-panel').textContent(),before);
    const look=await page.locator('canvas').getAttribute('data-look');
    await page.mouse.move(640,400); await page.mouse.down(); await page.mouse.move(710,420,{steps:5}); await page.mouse.up();
    await page.waitForTimeout(100);
    assert.notEqual(await page.locator('canvas').getAttribute('data-look'),look);
    assert.equal(await page.locator('.digest-panel').textContent(),before);
    // Complete chemistry to inspect both anatomical choices inside the same compact box.
    await page.locator('[data-choice]').filter({hasText:'Spytamylase'}).click();
    await page.locator('[data-choice]').filter({hasText:'Spytkirtlerne'}).click();
    await page.locator('[data-digest=skip]').click();
    await page.locator('[data-choice]').filter({hasText:'Den spaltes til kortere kulhydratkæder'}).click();
    await page.locator('[data-digest=skip]').click();
    assert.equal(await page.locator('.digest-panel h2').textContent(),'Hvad er næste anatomiske struktur?');
    assert.equal(await page.locator('.digest-panel [data-choice]').count(),2);
    for(const v of viewports) {
      await page.setViewportSize(v); await page.waitForFunction(() => Math.abs(document.querySelector('#digestion-root').clientHeight-innerHeight)<2); await page.waitForTimeout(200); await layout('anatomy '+v.width+'x'+v.height);
      await page.screenshot({path:`/tmp/phase-a-route-${v.width}x${v.height}.png`});
    }
    // A long source question exercises internal scrolling and a different saved nutrient.
    await page.evaluate(async (base) => {
      const { newDigestion } = await import(new URL('digestion-engine.js', document.querySelector('script[type="module"]').src).href);
      const run = {...newDigestion('poul'), index:6, phase:'boss', task:1, product:'small-peptide', completed:['stomach','duodenum']};
      const db = await new Promise(resolve => { const q=indexedDB.open('laeringsstier-v2'); q.onsuccess=()=>resolve(q.result); });
      await new Promise((resolve,reject) => {
        const tx=db.transaction('records','readwrite'), st=tx.objectStore('records'), q=st.get('progress');
        q.onsuccess=()=>{const all=q.result;all['fordoejelsens-vilde-rejse'].digestion.active=run;st.put(all,'progress');};
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
      });
      db.close();
    }, base);
    await page.reload(); await page.locator('[data-digest=resume]').click();
    await page.getByRole('heading',{name:'Hvor findes de relevante peptidaser?'}).waitFor();
    for(const v of viewports) {
      await page.setViewportSize(v); await page.waitForFunction(() => Math.abs(document.querySelector('#digestion-root').clientHeight-innerHeight)<2); await page.waitForTimeout(200); await layout('long source '+v.width+'x'+v.height);
      for(const button of await page.locator('[data-choice]').all()) {
        await button.scrollIntoViewIfNeeded();
        assert.ok(await button.isVisible());
      }
      await page.screenshot({path:`/tmp/phase-a-long-${v.width}x${v.height}.png`});
    }
    // Reproduce the CI failure independently of the installed system font:
    // wrapped source answers need 82px while the information field remains visible.
    await page.setViewportSize({width:844,height:390});
    await page.addStyleTag({content: '.digest-choices button { min-height: 82px !important; }'});
    await page.waitForTimeout(200);
    await layout('long source with taller wrapped answers 844x390');
    await page.screenshot({path:'/tmp/phase-a-long-wrapped-844x390.png'});
    assert.deepEqual(errors,[]);
    console.log('PASS phase A: desktop, tablet, small mobile and landscape layouts; stable enzyme/icon identity; removed controls; canvas clicks do not answer; drag still works; two anatomical buttons in question panel');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
