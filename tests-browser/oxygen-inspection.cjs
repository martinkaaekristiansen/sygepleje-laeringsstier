const { base } = require('./oxygen-fixtures.cjs');
async function openInspector(page) {
  await page.goto(base);
  await page.locator('h1').first().waitFor();
  await page.evaluate(async () => {
    const url = document.querySelector('script[type=module]').src,
      { createOxygenWorld } = await import(new URL('oxygen-world.js', url)),
      engine = await import(new URL('oxygen-engine.js', url)),
      data = await import(new URL('oxygen-data.js', url));
    document.body.innerHTML =
      '<div id="oxygen-root"><div class="oxygen-game"><canvas style="width:100%;height:100%"></canvas></div></div>';
    const canvas = document.querySelector('canvas'),
      world = createOxygenWorld(canvas, {
        onError: (e) => {
          throw e;
        },
      });
    await world.ready;
    world.pause(true);
    world.settings({ quality: 'low', motion: true });
    globalThis.oxygenInspection = {
      world,
      engine,
      data,
      canvas,
      async checkpoint({
        stage,
        entry = 'nose',
        side = 'right',
        exit = 'mouth',
        animation = false,
        age = 0,
        level = 'hard',
        yaw = 0,
        pitch = 0,
      }) {
        const run = engine.newOxygenRun(level);
        let safety = 0;
        while (++safety < 600) {
          const id = data.oxygenRoute(run)[run.index].id;
          if (id === stage && run.phase !== 'travel') break;
          if (run.phase === 'question') {
            const q = data.oxygenQuestion(run),
              key =
                id === 'outside'
                  ? entry
                  : id === 'mainbronchus'
                    ? side
                    : id === 'out_pharynx'
                      ? exit
                      : q.options.find((o) => o.correct).key;
            engine.answerOxygen(run, key);
          } else engine.advanceOxygen(run, run.duration - run.age);
        }
        if (animation && run.phase === 'question')
          engine.answerOxygen(run, data.oxygenQuestion(run).options.find((o) => o.correct).key);
        if (run.phase === 'animation') {
          run.worldTime += age;
          run.age = age;
        }
        run.yaw = yaw;
        run.pitch = pitch;
        run.motion = true;
        await world.prepare(run);
        world.setRun(run);
        world.renderAt(run);
        this.run = run;
        return world.snapshot();
      },
    };
  });
}
module.exports = { openInspector };
