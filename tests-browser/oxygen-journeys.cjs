const { devices, levels } = require('./ci-shards.cjs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'),
  assert = require('node:assert/strict'),
  fs = require('node:fs');
const clockScale = Number(process.env.OXYGEN_TEST_SPEED || 1);
if (!Number.isFinite(clockScale) || clockScale < 1 || clockScale > 8)
  throw Error('Invalid test clock');
const { base, launch, state, chooseCorrect, saved } = require('./oxygen-fixtures.cjs');
(async () => {
  const browser = await chromium.launch(launch),
    results = [],
    errors = [];
  try {
    for (const mobile of devices())
      for (const level of levels()) {
        const context = await browser.newContext({
            viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
            isMobile: mobile,
            hasTouch: mobile,
          }),
          page = await context.newPage();
        if (clockScale !== 1)
          await context.addInitScript(
            ({ speed }) => {
              const request = window.requestAnimationFrame.bind(window);
              window.requestAnimationFrame = (callback) => request((now) => callback(now * speed));
            },
            { speed: clockScale },
          );
        page.setDefaultTimeout(120000);
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('console', (m) => {
          if (m.type() === 'error') errors.push(m.text());
        });
        await page.goto(base + '#/sti/iltens-rejse/oxygen-' + level);
        await page.locator('[data-oxygen=start]:enabled').waitFor();
        await page.locator('[data-oxygen=start]').click();
        const seen = [];
        let oxygenId,
          cellId,
          carbonId,
          complete = false;
        for (let i = 0; i < 12000; i++) {
          assert.deepEqual(errors, []);
          const s = await state(page);
          if (seen.at(-1) !== s.stage) {
            seen.push(s.stage);
            console.log(mobile ? 'MOBILE' : 'DESKTOP', level, s.stage);
          }
          if (s.player) {
            oxygenId ??= s.player.oxygenInstance;
            assert.equal(s.player.oxygenInstance, oxygenId);
            if (s.player.species !== 'oxygen') {
              carbonId ??= s.player.carbonInstance;
              assert.equal(s.player.carbonInstance, carbonId);
              assert.notEqual(carbonId, oxygenId);
            }
          }
          if (s.hb) {
            cellId ??= s.hb.erythrocyte;
            assert.equal(s.hb.erythrocyte, cellId);
            assert(s.hb.capacity === 4 && s.hb.intact);
          }
          if (s.camera) assert(Math.abs(s.camera.roll) < 0.01, 'anatomical upright camera');
          if (s.exam) {
            for (let j = 0; j < 5; j++) {
              await page.locator('[data-exam-answer="0"]').click();
              await page.locator('[data-digest=exam-next]').click();
            }
            await page.getByText('Testresultat: 5 af 5', { exact: true }).waitFor();
            const data = await saved(page);
            assert.equal(data.oxygenJourney.active.phase, 'won');
            assert.equal(data.oxygenJourney.stats[level].completed, true);
            assert(data.done.includes('oxygen-' + level));
            assert.equal(seen.length, 58);
            results.push({
              mobile,
              level,
              clockScale,
              stages: seen.length,
              exam: '5/5',
              sameOxygen: true,
              sameErythrocyte: true,
              newCarbon: true,
            });
            complete = true;
            break;
          }
          if (!s.hidden && !s.inert && s.choices)
            await chooseCorrect(page, {
              outside: mobile ? 'mouth' : 'nose',
              mainbronchus: level === 'medium' ? 'left' : 'right',
              out_pharynx: mobile ? 'nose' : 'mouth',
            });
          else await page.waitForTimeout(150);
        }
        assert(complete, 'journey completed');
        fs.writeFileSync(
          process.env.OXYGEN_JOURNEY_RESULTS || '/tmp/oxygen-journeys.json',
          JSON.stringify({ results, errors }, null, 2),
        );
        await context.close();
      }
    fs.writeFileSync(
      process.env.OXYGEN_JOURNEY_RESULTS || '/tmp/oxygen-journeys.json',
      JSON.stringify({ results, errors }, null, 2),
    );
    console.log('PASS oxygen: six full UI journeys, all three levels on desktop and mobile');
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
