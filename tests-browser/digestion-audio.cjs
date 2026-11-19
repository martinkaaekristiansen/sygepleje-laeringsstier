const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.APP_URL || 'http://127.0.0.1:3001/sygepleje-laeringsstier/';
(async () => {
  const { BOSSES, ROUTE } = await import('../public/digestion-data.js');
  const { ORGAN_SOUND } = await import('../public/digestion-audio.js');
  const assert = require('node:assert/strict');
  const b = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  try {
    for (const mobile of [false, true]) {
      const p = await b.newPage({
        viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
        hasTouch: mobile,
        reducedMotion: 'reduce',
      });
      p.setDefaultTimeout(120000);
      await p.addInitScript(() => {
        const Original = window.AudioContext;
        window.__contexts = [];
        window.AudioContext = function (...args) {
          const ctx = new Original(...args);
          ctx.__gains = [];
          const gain = ctx.createGain.bind(ctx);
          ctx.createGain = () => {
            const g = gain();
            ctx.__gains.push(g);
            return g;
          };
          window.__contexts.push(ctx);
          return ctx;
        };
      });
      await p.goto(base + '#/sti/fordoejelsens-vilde-rejse/digestion-stanley');
      assert.equal(await p.evaluate(() => __contexts.length), 0);
      if (!mobile) {
        await p.locator('[data-digest=settings]').click();
        await p.locator('[data-setting=motion]').check();
        await p.locator('[data-digest=settings-close]').click();
      }
      await p.locator('[data-digest=start]').click();
      await p.locator('[data-entry]').filter({ hasText: 'Cavitas oris' }).click();
      await p.locator('[data-entry]').first().waitFor({ state: 'detached' });
      if (!mobile) {
        await p.locator('[data-choice]').first().waitFor();
        const fixed = await p.locator('canvas').getAttribute('data-camera');
        await p.waitForTimeout(800);
        assert.equal(
          await p.locator('canvas').getAttribute('data-camera'),
          fixed,
          'intro motion has a bounded end',
        );
      }
      await p.locator('[data-choice]').first().waitFor();
      await p.locator('[data-digest=sound]').click();
      await p.waitForFunction(() => __contexts.length === 1 && __contexts[0].state === 'running');
      await p.locator('[data-digest=settings]').click();
      await p.locator('[data-setting=volume]').fill('0.6');
      await p.locator('[data-setting=motion]').check();
      await p.locator('[data-digest=settings-close]').click();
      await p.waitForFunction(
        () =>
          JSON.parse(document.querySelector('.digestion-game').dataset.audio).lastEvent === 'chew',
      );
      // lastEvent can still describe an earlier chew. The gain uses a smooth
      // AudioParam ramp, so wait for its actual value rather than click latency.
      await p.waitForFunction(
        () => Math.abs(__contexts[0].__gains[0].gain.value - 0.6) < 0.03,
        undefined,
        { timeout: 5000 },
      );
      assert.ok(
        Math.abs((await p.evaluate(() => __contexts[0].__gains[0].gain.value)) - 0.6) < 0.03,
      );
      const snap = JSON.parse(await p.locator('.digestion-game').getAttribute('data-audio'));
      assert.equal(snap.profile, 'mouth');
      assert.ok(snap.voices <= 4);
      await p.locator('[data-digest=sound]').click();
      await p.waitForFunction(() => __contexts[0].__gains[0].gain.value < 0.01, undefined, {
        timeout: 5000,
      });
      assert.ok((await p.evaluate(() => __contexts[0].__gains[0].gain.value)) < 0.01);
      await p.locator('[data-digest=sound]').click();
      await p.locator('[data-digest=settings]').click();
      await p.waitForFunction(() => __contexts[0].__gains[0].gain.value < 0.01, undefined, {
        timeout: 5000,
      });
      assert.ok((await p.evaluate(() => __contexts[0].__gains[0].gain.value)) < 0.01);
      await p.locator('[data-digest=settings-close]').click();
      const profiles = new Set();
      let wrongTrachea = false,
        won = false;
      for (let n = 0; n < 100; n++) {
        const s = await p.evaluate(() => ({
          stage: document.querySelector('canvas').dataset.digestStage,
          mode: document.querySelector('canvas').dataset.digestMode,
          title: document.querySelector('.digest-panel h2')?.textContent,
          audio: JSON.parse(document.querySelector('.digestion-game').dataset.audio),
        }));
        if (s.title?.includes('TILLYKKE')) {
          won = true;
          break;
        }
        assert.equal(s.audio.profile, ORGAN_SOUND[s.stage]);
        profiles.add(s.audio.profile);
        assert.ok(s.audio.voices <= 4);
        if (s.mode === 'finale')
          await p.waitForFunction(
            () =>
              JSON.parse(document.querySelector('.digestion-game').dataset.audio).lastEvent ===
                'splash' ||
              JSON.parse(document.querySelector('.digestion-game').dataset.audio).lastEvent ===
                'finish',
          );
        const before = JSON.stringify([s.stage, s.mode, s.title]);
        assert.equal(await p.locator('[data-absorb]').count(), 0);
        if (await p.locator('[data-choice]').count()) {
          if (s.stage === 'epiglottis' && !wrongTrachea) {
            await p.locator('[data-choice]').filter({ hasText: 'Trachea' }).click();
            await p.waitForFunction(
              () =>
                JSON.parse(document.querySelector('.digestion-game').dataset.audio).lastEvent ===
                'cough',
            );
            wrongTrachea = true;
            continue;
          }
          const q = BOSSES.stanley[s.stage]?.find((q) => q.prompt === s.title),
            next = ROUTE.find((r) => r.id === s.stage).index + 1;
          await p
            .locator('[data-choice]')
            .filter({ hasText: q?.options[0] || ROUTE[next].danish + ' · ' + ROUTE[next].latin })
            .click();
        } else {
          await p.waitForFunction(
            (before) =>
              JSON.stringify([
                document.querySelector('canvas').dataset.digestStage,
                document.querySelector('canvas').dataset.digestMode,
                document.querySelector('.digest-panel h2')?.textContent,
              ]) !== before,
            before,
          );
          continue;
        }
        await p.waitForFunction(
          (before) =>
            JSON.stringify([
              document.querySelector('canvas').dataset.digestStage,
              document.querySelector('canvas').dataset.digestMode,
              document.querySelector('.digest-panel h2')?.textContent,
            ]) !== before,
          before,
        );
      }
      assert.ok(won);
      assert.ok(wrongTrachea);
      assert.equal(profiles.size, 8);
      assert.equal(await p.evaluate(() => __contexts.length), 1);
      await p.getByRole('link', { name: '← Tilbage til læringsstier' }).click();
      await p.locator('#digestion-root').waitFor({ state: 'detached' });
      await p.waitForFunction(() => __contexts[0].state === 'closed');
      await p.close();
      console.log(
        'PASS organic audio gesture, real gain, chewing sync, mute, reading pause and cleanup',
        mobile ? 'mobile' : 'desktop',
      );
    }
    const silent = await b.newPage({ reducedMotion: 'reduce' });
    await silent.addInitScript(() => {
      window.AudioContext = function () {
        throw Error('Audio unavailable');
      };
      window.webkitAudioContext = undefined;
    });
    await silent.goto(base + '#/sti/fordoejelsens-vilde-rejse/digestion-stanley');
    await silent.locator('[data-digest=start]').click();
    await silent.locator('[data-entry]').filter({ hasText: 'Cavitas oris' }).click();
    await silent.locator('[data-entry]').first().waitFor({ state: 'detached' });
    await silent.locator('[data-digest=sound]').click();
    await silent.waitForFunction(
      () => JSON.parse(document.querySelector('.digestion-game').dataset.audio).blocked,
    );
    await silent.locator('[data-choice]').first().waitFor();
    assert.equal(await silent.locator('[data-choice]').count(), 3);
    await silent.locator('[data-choice]').filter({ hasText: 'Spytamylase' }).click();
    await silent.getByRole('heading', { name: 'Hvor kommer spytamylase fra?' }).waitFor();
    await silent.close();
    console.log('PASS unsupported audio keeps the learning game available');
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
