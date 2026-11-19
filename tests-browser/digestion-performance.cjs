// Run one variant at a time: APP_URL, PERF_LABEL, PERF_OUTPUT, PERF_SAMPLES.
// Lock only the adaptive resolution during measurement, never the animation.
// PERF_EXPECT_VILLI can select an archived model count (old duodenum: 2200).
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.APP_URL || 'http://127.0.0.1:3001/';
const output = process.env.PERF_OUTPUT || path.resolve('docs/codex-fordoejelse/fase-b1');
const label = process.env.PERF_LABEL || 'after';
const samples = Number(process.env.PERF_SAMPLES || 90);
const ratio = Number(process.env.PERF_RATIO || 0.8);
const regions = (process.env.PERF_REGIONS || 'jejunum').split(',');
const mode = process.env.PERF_MODE || 'route';
const character = process.env.PERF_CHARACTER || 'stanley';
const sizes = (process.env.PERF_SIZES || 'mobile,desktop').split(',');
fs.mkdirSync(output, { recursive: true });

async function fixture(page, index, motion) {
  // Mount the real game with an isolated in-memory progress record. This avoids
  // IndexedDB migrations/background saves affecting either benchmark variant.
  await page.route('**/?performance-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><html lang="da"><head>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    ${[
      'theme.css',
      'style.css',
      'blood-game.css',
      'journey-3d.css',
      'blood-fullscreen.css',
      'digestion.css',
    ]
      .map((file) => `<link rel="stylesheet" href="${file}">`)
      .join('')}
    </head><body><div id="app"><div id="digestion-root"></div></div></body></html>`,
    }),
  );
  await page.goto(base + '?performance-fixture');
  await page.evaluate(
    async ({ base, index, motion, profile, mode, character }) => {
      if (profile) {
        const T = await import(base + 'three.module.min.js');
        window.__cpu = { sphereCalls: 0, sphereMs: 0, rootMatrixCalls: 0, rootMatrixMs: 0 };
        const sphere = T.BufferGeometry.prototype.computeBoundingSphere;
        T.BufferGeometry.prototype.computeBoundingSphere = function (...args) {
          const start = performance.now();
          const result = sphere.apply(this, args);
          window.__cpu.sphereMs += performance.now() - start;
          window.__cpu.sphereCalls++;
          return result;
        };
        const matrix = T.Object3D.prototype.updateMatrixWorld;
        T.Object3D.prototype.updateMatrixWorld = function (...args) {
          if (!this.isGroup || !this.parent?.isScene) return matrix.apply(this, args);
          const start = performance.now();
          const result = matrix.apply(this, args);
          window.__cpu.rootMatrixMs += performance.now() - start;
          window.__cpu.rootMatrixCalls++;
          return result;
        };
      }
      const { mountDigestion } = await import(base + 'digestion-game.js');
      const { newDigestion } = await import(base + 'digestion-engine.js');
      window.__game = mountDigestion(document.querySelector('#digestion-root'), {
        record: {
          digestion: {
            results: {},
            active: {
              ...newDigestion(character),
              index,
              phase: mode === 'route' ? 'route' : 'absorption',
              absorptionPassed: mode === 'transport',
              absorptionView: mode === 'transport' ? 'transport' : 'absorb',
              absorbed: index > 6,
              product:
                index > 6
                  ? 'residue'
                  : mode !== 'route'
                    ? { stanley: 'glucose', poul: 'amino-acid', trine: 'lipid-products' }[character]
                    : 'polysaccharide',
            },
            settings: { sound: false, motion, volume: 0.3 },
          },
        },
        save: async () => true,
        onCharacter: () => {},
      });
    },
    { base, index, motion, mode, character, profile: process.env.PERF_PROFILE === '1' },
  );
  await page.locator('[data-digest=resume]').click();
  await page
    .locator(mode === 'route' ? '[data-choice]' : 'canvas')
    .first()
    .waitFor();
  await page.waitForFunction(
    (motion) => Number(document.querySelector('canvas').dataset.sceneAge) >= (motion ? 1.2 : 0.001),
    motion,
  );
  const yaw = Number(process.env.PERF_YAW || 0);
  if (yaw) {
    for (let i = 0; i < 3; i++) {
      await page.mouse.move(60, 420);
      await page.mouse.down();
      await page.mouse.move(60 + yaw / 0.012, 420, { steps: 3 });
      await page.mouse.up();
    }
    await page.waitForFunction(
      (yaw) => Math.abs(JSON.parse(document.querySelector('canvas').dataset.look).yaw - yaw) < 0.01,
      yaw,
    );
  }
}

async function prepare(page) {
  if (process.env.PERF_WORLD)
    await page.route('**/digestion-world.js', (route) =>
      route.fulfill({
        contentType: 'text/javascript',
        body: fs.readFileSync(process.env.PERF_WORLD, 'utf8'),
      }),
    );
  if (process.env.PERF_MUCOSA)
    await page.route('**/digestion-mucosa.js', (route) =>
      route.fulfill({
        contentType: 'text/javascript',
        body: fs.readFileSync(process.env.PERF_MUCOSA, 'utf8'),
      }),
    );
  if (mode !== 'route') await page.route('**/digestion-sequence.js', async route => {
    const response=await route.fetch();
    // Benchmark fixture holds only progression, not physiology, at a fixed scene.
    await route.fulfill({response,body:(await response.text()).replace('pending.next();','/* fixed-scene measurement */')});
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/digestion-performance.js', async (route) => {
    const response = await route.fetch();
    const source = (await response.text())
      .replace('let ratio = maximum', `let ratio = ${ratio}`)
      .replace('sample(ms) {', 'sample(ms) { return false;');
    await route.fulfill({ response, body: source });
  });
  return errors;
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const results = [];
  try {
    for (const size of sizes)
      for (const region of regions) {
        const viewport =
          size === 'mobile' ? { width: 390, height: 844 } : { width: 1280, height: 800 };
        const page = await browser.newPage({
          viewport,
          deviceScaleFactor: 1,
          hasTouch: size === 'mobile',
          reducedMotion: 'no-preference',
        });
        page.setDefaultTimeout(120000);
        const errors = await prepare(page);
        const index = { stomach: 4, duodenum: 5, jejunum: 6, ileum: 7 }[region];
        if (process.env.PERF_CAPTURE_ONLY !== '1') {
          await fixture(page, index, true);
          await page.waitForTimeout(5000);
          const result = await page.evaluate(async (samples) => {
            const times = [],
              triangleCounts = [],
              drawCallCounts = [];
            if (window.__cpu) Object.keys(window.__cpu).forEach((key) => (window.__cpu[key] = 0));
            let previous;
            await new Promise((resolve) => {
              function frame(now) {
                if (previous !== undefined) {
                  times.push(now - previous);
                  const c = document.querySelector('canvas');
                  triangleCounts.push(Number(c.dataset.triangles));
                  drawCallCounts.push(Number(c.dataset.drawCalls));
                }
                previous = now;
                if (times.length < samples) requestAnimationFrame(frame);
                else resolve();
              }
              requestAnimationFrame(frame);
            });
            const sorted = [...times].sort((a, b) => a - b);
            const median = sorted[Math.floor(sorted.length / 2)];
            const canvas = document.querySelector('canvas');
            const gl = canvas.getContext('webgl2');
            const extension = gl.getExtension('WEBGL_debug_renderer_info');
            return {
              samples,
              medianFrameMs: median,
              medianFps: 1000 / median,
              meanFrameMs: times.reduce((a, b) => a + b, 0) / times.length,
              p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
              triangles: [...triangleCounts].sort((a, b) => a - b)[Math.floor(samples / 2)],
              drawCalls: [...drawCallCounts].sort((a, b) => a - b)[Math.floor(samples / 2)],
              triangleRange: [Math.min(...triangleCounts), Math.max(...triangleCounts)],
              drawCallRange: [Math.min(...drawCallCounts), Math.max(...drawCallCounts)],
              renderRatio: Number(canvas.dataset.renderRatio),
              villi: Number(canvas.dataset.villusCount),
              camera: JSON.parse(canvas.dataset.camera),
              buffer: [canvas.width, canvas.height],
              renderer: extension
                ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)
                : gl.getParameter(gl.RENDERER),
              cpuProfile: window.__cpu,
              frameTimesMs: times,
            };
          }, samples);
          assert.equal(result.renderRatio, ratio);
          assert.equal(result.villi, Number(process.env.PERF_EXPECT_VILLI || { stomach: 0, duodenum: 4840, jejunum: 3200, ileum: 1500 }[region]));
          assert.deepEqual(errors, []);
          results.push({
            label,
            size,
            region,
            mode,
            character,
            viewport,
            yaw: Number(process.env.PERF_YAW || 0),
            ...result,
          });
          console.log(JSON.stringify({ label, size, region, ...result, frameTimesMs: undefined }));
          fs.writeFileSync(
            path.join(output, `${label}.json`),
            JSON.stringify({ chromium: browser.version(), results }, null, 2) + '\n',
          );
        }
        await page.close();
        if (process.env.PERF_CAPTURE === '0') continue;
        // Separate static capture: identical animation pose, camera and pixel ratio.
        const still = await browser.newPage({
          viewport,
          deviceScaleFactor: 1,
          reducedMotion: 'no-preference',
        });
        still.setDefaultTimeout(120000);
        const stillErrors = await prepare(still);
        await fixture(still, index, false);
        await still.waitForTimeout(1000);
        await still.screenshot({
          path: path.join(output, `${label}-${region}-${size}.png`),
          timeout: 120000,
        });
        assert.deepEqual(stillErrors, []);
        await still.close();
      }
    if (results.length) {
      fs.writeFileSync(
        path.join(output, `${label}.json`),
        JSON.stringify({ chromium: browser.version(), results }, null, 2) + '\n',
      );
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
