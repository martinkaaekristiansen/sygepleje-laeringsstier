const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'),
  assert = require('node:assert/strict'),
  { launch } = require('./oxygen-fixtures.cjs'),
  { openInspector } = require('./oxygen-inspection.cjs');
(async () => {
  const b = await chromium.launch(launch);
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
    p.setDefaultTimeout(120000);
    await openInspector(p);
    const results = [];
    for (const viewport of [
      { width: 1280, height: 800 },
      { width: 390, height: 844 },
      { width: 844, height: 390 },
      { width: 568, height: 320 },
    ]) {
      await p.setViewportSize(viewport);
      await p.waitForTimeout(100);
      for (const side of ['left', 'right'])
        for (const [stage, animation, age, name] of [
          ['hb-binding', false, 0, 'same-player-O2'],
          ['hb-binding', true, 5, 'same-player-O2'],
          ['tissue-oxygen', true, 0, 'same-player-O2'],
          ['tissue-oxygen', true, 5, 'same-player-O2'],
          ['tissue-carbon', true, 7, 'new-metabolic-carbon'],
          ['bicarbonate', false, 5, 'new-metabolic-carbon'],
          ['bicarbonate-return', false, 4, 'new-metabolic-carbon'],
          ['co2-diffusion', true, 4, 'new-metabolic-carbon'],
        ]) {
          const r = await p.evaluate(
            async (args) => {
              const i = oxygenInspection;
              await i.checkpoint(args);
              const actor = i.world.scene.getObjectByName(args.name),
                v = actor.position.clone().project(i.world.camera);
              return {
                ...args,
                visible: actor.visible,
                screen: v.toArray(),
                camera: i.world.snapshot().camera,
              };
            },
            { stage, animation, age, side, name },
          );
          assert(r.visible, stage);
          assert(
            Math.abs(r.screen[0]) < 0.9 &&
              Math.abs(r.screen[1]) < 0.9 &&
              r.screen[2] > -1 &&
              r.screen[2] < 1,
            JSON.stringify(r),
          );
          results.push({ ...r, viewport });
        }
    }
    const movement = await p.evaluate(async () => {
      const i = oxygenInspection;
      await i.checkpoint({ stage: 'oxygen-diffusion', animation: true, age: 9.9 });
      let previous = i.world.camera.position.clone(),
        max = 0,
        steps = 0;
      while (steps++ < 400) {
        const run = i.run;
        if (run.phase === 'question') {
          if (i.data.oxygenRoute(run)[run.index].id !== 'hb-binding') break;
          i.engine.answerOxygen(run, '0');
        }
        i.engine.advanceOxygen(run, 0.05);
        await i.world.prepare(run);
        i.world.renderAt(run);
        max = Math.max(max, previous.distanceTo(i.world.camera.position));
        previous.copy(i.world.camera.position);
      }
      return { max, steps };
    });
    assert(movement.max < 0.13, JSON.stringify(movement));
    require('node:fs').writeFileSync(
      '/tmp/oxygen-visibility.json',
      JSON.stringify({ results, movement }, null, 2),
    );
    console.log(
      'PASS oxygen visibility: 64 desktop/mobile/landscape, both-lung molecule views and continuous Hb zoom',
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
