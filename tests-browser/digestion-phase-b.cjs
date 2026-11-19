const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.APP_URL || 'http://127.0.0.1:3001/';
const output =
  process.env.DIGEST_SCREENSHOTS || path.resolve('docs/codex-fordoejelse/fase-b-screenshots');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: 'no-preference',
      hasTouch: true,
    });
    page.setDefaultTimeout(60000);
    page.on('dialog', (dialog) => dialog.accept());
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && !m.text().includes('Failed to load resource'))
        errors.push(m.text());
    });
    await page.addInitScript(() => {
      const raf = requestAnimationFrame;
      window.requestAnimationFrame = (f) =>
        raf((t) => {
          if (!window.__captureFreeze) f(t);
        });
    });
    await page.goto(
      base + '?capture=' + Date.now() + '#/sti/fordoejelsens-vilde-rejse/digestion-stanley',
    );
    await page.locator('[data-digest=start]').waitFor();
    async function fixture(index, phase = 'route', character = 'stanley') {
      await page.mouse.click(5, 5);
      await page.goto('about:blank');
      await page.goto(base + '#/');
      await page.locator('#digestion-root').waitFor({ state: 'detached' });
      await page.evaluate(
        async ({ index, phase, character, base }) => {
          const { newDigestion } = await import(base + 'digestion-engine.js');
          const run = {
            ...newDigestion(character),
            index,
            phase,
            absorbed: index > 6,
            product:
              index > 6
                ? 'residue'
                : character === 'stanley'
                  ? 'polysaccharide'
                  : character === 'poul'
                    ? 'protein'
                    : 'triglyceride',
          };
          const db = await new Promise((r) => {
            const q = indexedDB.open('laeringsstier-v2');
            q.onsuccess = () => r(q.result);
          });
          await new Promise((resolve, reject) => {
            const tx = db.transaction('records', 'readwrite'),
              st = tx.objectStore('records'),
              q = st.get('progress');
            q.onsuccess = () => {
              const all = q.result || {};
              all['fordoejelsens-vilde-rejse'] ??= { done: [], notes: {}, answers: {} };
              const d = (all['fordoejelsens-vilde-rejse'].digestion ??= { results: {} });
              d.active = run;
              d.settings = { sound: false, motion: true, quality: 'auto', volume: 0.3 };
              delete d.learningCurrent;
              st.put(all, 'progress');
            };
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
          });
          db.close();
        },
        { index, phase, character, base },
      );
      await page.goto(
        base + '?capture=' + Date.now() + '#/sti/fordoejelsens-vilde-rejse/digestion-stanley',
      );
      await page.locator('[data-digest=resume]').click();
      await page.locator('[data-choice]').first().waitFor();
      await page.waitForFunction((index) => {
        const c = document.querySelector('canvas');
        return (
          c.dataset.digestStage ===
            [
              'mouth',
              'pharynx',
              'epiglottis',
              'oesophagus',
              'stomach',
              'duodenum',
              'jejunum',
              'ileum',
              'caecum',
              'ascending',
            ][index] && Number(c.dataset.sceneAge) >= 1.2
        );
      }, index);
      assert.equal(
        await page.locator('.digest-panel h2').textContent(),
        phase === 'route'
          ? 'Hvad er næste anatomiske struktur?'
          : await page.locator('.digest-panel h2').textContent(),
      );
      const camera = JSON.parse(await page.locator('canvas').getAttribute('data-camera'));
      await page.waitForTimeout(250);
      assert.deepEqual(
        JSON.parse(await page.locator('canvas').getAttribute('data-camera')),
        camera,
        'camera stays still while reading',
      );
    }
    await fixture(2);
    assert.equal(
      JSON.parse(await page.locator('canvas').getAttribute('data-swallow-pose')).closure,
      0,
    );
    await page.screenshot({ timeout: 120000, path: output + '/01-epiglottis-hvile-desktop.png' });
    await page.locator('[data-choice]').filter({ hasText: 'Oesophagus' }).click();
    await page.waitForFunction(
      () => JSON.parse(document.querySelector('canvas').dataset.swallowPose || '{}').closure > 0.8,
    );
    const swallow = JSON.parse(await page.locator('canvas').getAttribute('data-swallow-pose'));
    assert.ok(swallow.lift > 0.3 && swallow.epiglottisAngle < -1 && swallow.vocalGap < 0.08);
    await page.evaluate(() => (window.__captureFreeze = true));
    await page.screenshot({
      timeout: 120000,
      path: output + '/02-epiglottis-synkning-desktop.png',
    });
    await page.evaluate(() => (window.__captureFreeze = false));
    for (const [index, name] of [
      [5, '03-duodenum'],
      [6, '04-jejunum'],
      [7, '05-ileum'],
      [8, '06-caecum-appendix'],
      [9, '08-colon-ascendens-kamera'],
      [0, '09-mund-uden-navigationsring'],
    ]) {
      await fixture(index, index === 0 ? 'boss' : 'route');
      if ([5, 6, 7].includes(index))
        assert.ok(Number(await page.locator('canvas').getAttribute('data-villus-count')) >= 1500);
      await page.screenshot({ timeout: 120000, path: output + '/' + name + '-desktop.png' });
    }
    await fixture(8);
    await page.mouse.move(720, 500);
    await page.mouse.down();
    await page.mouse.move(630, 550, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await page.screenshot({
      timeout: 120000,
      path: output + '/07-caecum-ileum-appendix-desktop.png',
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await fixture(2);
    await page.screenshot({ timeout: 120000, path: output + '/10-epiglottis-mobil.png' });
    await fixture(6);
    await page.screenshot({ timeout: 120000, path: output + '/11-jejunum-mobil.png' });
    await fixture(8);
    await page.screenshot({ timeout: 120000, path: output + '/12-caecum-mobil.png' });
    await fixture(6);
    const performanceSample = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const samples = [];
          let previous;
          function sample(t) {
            if (previous !== undefined) samples.push(t - previous);
            previous = t;
            if (samples.length < 24) {
              requestAnimationFrame(sample);
              return;
            }
            const sorted = [...samples].sort((a, b) => a - b),
              canvas = document.querySelector('canvas');
            resolve({
              renderer: 'Chromium SwiftShader in cloud; emulated mobile 390x844',
              samples: samples.length,
              medianFrameMs: Math.round(sorted[Math.floor(sorted.length / 2)] * 10) / 10,
              medianFps: Math.round(10000 / sorted[Math.floor(sorted.length / 2)]) / 10,
              triangles: Number(canvas.dataset.triangles),
              drawCalls: Number(canvas.dataset.drawCalls),
              renderRatio: Number(canvas.dataset.renderRatio),
              villi: Number(canvas.dataset.villusCount),
            });
          }
          requestAnimationFrame(sample);
        }),
    );
    fs.writeFileSync(
      path.join(output, 'performance-cloud.json'),
      JSON.stringify(performanceSample, null, 2) + '\n',
    );
    console.log('Cloud render sample', JSON.stringify(performanceSample));
    const before = JSON.parse(await page.locator('canvas').getAttribute('data-camera'));
    await page.mouse.move(190, 430);
    await page.mouse.down();
    for (let i = 0; i < 6; i++) {
      await page.mouse.move(370, 430, { steps: 3 });
      await page.mouse.move(30, 430, { steps: 3 });
    }
    // A trusted touch gesture can pan repeatedly without moving the camera position.
    await page.mouse.up();
    const client = await page.context().newCDPSession(page);
    for (let i = 0; i < 6; i++) {
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: 50, y: 430 }],
      });
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: 350, y: 430 }],
      });
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    await page.waitForFunction(
      () => Math.abs(JSON.parse(document.querySelector('canvas').dataset.look).yaw) > Math.PI,
    );
    const after = JSON.parse(await page.locator('canvas').getAttribute('data-camera'));
    assert.deepEqual(after.position, before.position);
    assert.notDeepEqual(after.quaternion, before.quaternion);
    assert.ok(
      Math.abs(JSON.parse(await page.locator('canvas').getAttribute('data-look')).yaw) > Math.PI,
      'look can reach beyond 180 degrees',
    );
    await page.screenshot({ timeout: 120000, path: output + '/13-tilbageblik-mobil.png' });
    assert.deepEqual(errors, []);
    console.log(
      'PASS phase B: actual scene screenshots, rest/swallow coordination, 1500–4840 rooted villi (3200 in jejunum), stable camera and unrestricted backward mouse/touch look, desktop/mobile, no page errors',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
