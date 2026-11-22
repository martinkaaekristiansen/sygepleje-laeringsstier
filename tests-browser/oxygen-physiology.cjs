const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'),
  assert = require('node:assert/strict'),
  { launch, seed, state, saved } = require('./oxygen-fixtures.cjs'),
  { openInspector } = require('./oxygen-inspection.cjs');
(async () => {
  const browser = await chromium.launch(launch),
    errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.setDefaultTimeout(120000);
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await openInspector(page);
    const result = await page.evaluate(async () => {
      const i = oxygenInspection,
        w = i.world;
      const a = await i.checkpoint({ stage: 'trachea', age: 2 }),
        b = await i.checkpoint({ stage: 'trachea', age: 12 });
      const playerY = [a.camera.position[1], b.camera.position[1]],
        bacteriaY = [a.mucus.point[1], b.mucus.point[1]],
        identity = a.mucus.instance;
      const r = i.run;
      r.yaw = Math.PI;
      w.setRun(r);
      w.renderAt(r);
      const back = w.snapshot();
      const early = await i.checkpoint({ stage: 'mucus' }),
        stillCamera = early.camera.position;
      const t = i.run.worldTime;
      i.engine.advanceOxygen(i.run, 1);
      w.renderAt(i.run);
      const late = w.snapshot();
      const out = await i.checkpoint({ stage: 'out_trachea' });
      i.engine.advanceOxygen(i.run, 1);
      w.renderAt(i.run);
      const outLater = w.snapshot();
      const hb0 = await i.checkpoint({ stage: 'hb-binding' }),
        hb1 = await i.checkpoint({ stage: 'pcap-oxygen' }),
        release = await i.checkpoint({ stage: 'tissue-oxygen', animation: true, age: 8 });
      const carbon = await i.checkpoint({ stage: 'tissue-carbon' }),
        bicarb = await i.checkpoint({ stage: 'venules' }),
        backCarbon = await i.checkpoint({ stage: 'co2-diffusion' });
      const alveolar = [...w.scene.children].find((o) => o.name === 'right-alveolar-exchange');
      return {
        playerY,
        bacteriaY,
        identity,
        back,
        early,
        stillCamera,
        late,
        out,
        outLater,
        hb0,
        hb1,
        release,
        carbon,
        bicarb,
        backCarbon,
        opposite: !!alveolar.getObjectByName('opposite-alveolar-gas-diffusion'),
        actualTime: t,
      };
    });
    assert(result.playerY[1] < result.playerY[0]);
    assert(result.bacteriaY[1] > result.bacteriaY[0]);
    assert(
      result.bacteriaY[0] < result.playerY[0] && result.bacteriaY[1] > result.playerY[1],
      'wall bacterium passes observer',
    );
    assert.equal(result.back.mucus.instance, result.identity);
    assert.equal(result.back.mucus.boundTo, 'mucus');
    assert.deepEqual(result.early.camera.position, result.late.camera.position);
    assert(result.late.mucus.u < result.early.mucus.u);
    assert(result.outLater.mucus.u < result.out.mucus.u);
    assert.equal(result.hb1.hemoglobin.bound, 4);
    assert.equal(result.release.hemoglobin.bound, 3);
    assert.equal(result.hb0.hemoglobin.intact, true);
    assert.equal(result.hb0.hemoglobin.capacity, 4);
    assert.equal(result.carbon.carbon.carbonInstance, result.bicarb.carbon.carbonInstance);
    assert.equal(result.backCarbon.carbon.carbonInstance, result.bicarb.carbon.carbonInstance);
    assert(result.opposite);
    await seed(page, { stage: 'hb-binding', animation: true, age: 3 });
    await page.locator('[data-oxygen=settings]').click();
    const before = await state(page);
    await page.waitForTimeout(500);
    assert.deepEqual((await state(page)).camera.position, before.camera.position);
    await page.locator('[data-oxygen=settings-close]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-oxygen=menu]').click();
    const checkpoint = await saved(page);
    await page.reload();
    await page.locator('[data-oxygen=resume]:enabled').waitFor();
    await page.locator('[data-oxygen=resume]').click();
    const resumed = await saved(page);
    assert.equal(resumed.oxygenJourney.active.index, checkpoint.oxygenJourney.active.index);
    assert(resumed.oxygenJourney.active.age >= checkpoint.oxygenJourney.active.age);
    assert.equal(resumed.oxygenJourney.active.gas, 'oxygen');
    assert.deepEqual(errors, []);
    require('node:fs').writeFileSync(
      '/tmp/oxygen-physiology.json',
      JSON.stringify({ result, errors }, null, 2),
    );
    console.log(
      'PASS oxygen physiology: mucus opposition, stationary/expiration, same Hb/RBC/O2, new conserved carbon, pause and reload',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
