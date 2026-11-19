const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const occlusion = process.env.OCCLUSION_COMPARE === '1';
const output = path.resolve(
  'docs/codex-fordoejelse/sammenhaengende-verden/performance' + (occlusion ? '/occlusion' : ''),
);
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const results = [];
  for (const size of ['desktop', 'mobile'])
    for (const id of ['duodenum', 'jejunum', 'ileum'])
      for (const variant of ['before', 'after']) {
        if (
          process.env.PERFORMANCE_CASES &&
          !process.env.PERFORMANCE_CASES.split(',').includes(size + ':' + id)
        )
          continue;
        const base =
          variant === 'before' && !occlusion
            ? process.env.BEFORE_URL || 'http://127.0.0.1:3021/'
            : process.env.APP_URL || 'http://127.0.0.1:3030/';
        const viewport =
          size === 'desktop' ? { width: 1280, height: 800 } : { width: 390, height: 844 };
        const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
        page.setDefaultTimeout(120000);
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('console', (m) => {
          if (m.type() === 'error') errors.push(m.text());
        });
        if (occlusion && variant === 'before')
          await page.route('**/digestion-visibility.js', async (route) => {
            const r = await route.fetch();
            await route.fulfill({
              response: r,
              body: (await r.text()).replace(
                'const SUBDIVIDE_MUCOSA = true;',
                'const SUBDIVIDE_MUCOSA = false;',
              ),
            });
          });
        await page.route('**/digestion-performance.js', async (route) => {
          const r = await route.fetch();
          await route.fulfill({
            response: r,
            body: (await r.text())
              .replace('let ratio = maximum', 'let ratio = 0.8')
              .replace('sample(ms) {', 'sample(ms) { return false;'),
          });
        });
        await page.route('**/?comparable-performance', (r) =>
          r.fulfill({
            contentType: 'text/html',
            body: '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block}</style><canvas></canvas>',
          }),
        );
        await page.goto(base + '?comparable-performance');
        await page.evaluate(
          async ({ id, variant, occlusion }) => {
            const T = await import('./three.module.min.js'),
              { viewPose } = await import('./digestion-camera.js'),
              { ROUTE } = await import('./digestion-data.js');
            let matrix = new T.Matrix4();
            if (variant === 'after' || occlusion) {
              const { buildDigestiveTract } = await import('./digestion-tract.js');
              matrix = buildDigestiveTract().byId[id].matrix;
            }
            const local = viewPose(id),
              position = local.position.clone().applyMatrix4(matrix),
              look = local.look.clone().applyMatrix4(matrix),
              up = new T.Vector3(0, 1, 0).transformDirection(matrix);
            // Identical LOCAL pose, expressed in each architecture's coordinates. This
            // changes the benchmark camera only; progression and all anatomy are real.
            const original = T.PerspectiveCamera.prototype.lookAt;
            T.PerspectiveCamera.prototype.lookAt = function (...args) {
              this.position.copy(position);
              this.up.copy(up);
              return original.call(this, look);
            };
            const { createDigestionWorld } = await import('./digestion-world.js');
            window.world = createDigestionWorld(document.querySelector('canvas'));
            window.world.settings({ motion: true });
            window.world.setScene(
              ROUTE.find((s) => s.id === id),
              'stanley',
              'travel',
              id === 'ileum',
              id === 'ileum' ? 'residue' : 'glucose',
            );
            window.reference = {
              position: local.position.toArray(),
              look: local.look.toArray(),
              up: [0, 1, 0],
            };
          },
          { id, variant, occlusion },
        );
        await page.waitForTimeout(5000);
        const data = await page.evaluate(async () => {
          const samples = [],
            triangles = [],
            calls = [];
          let prior;
          await new Promise((resolve) => {
            function tick(now) {
              if (prior !== undefined) {
                samples.push(now - prior);
                const c = document.querySelector('canvas');
                triangles.push(Number(c.dataset.triangles));
                calls.push(Number(c.dataset.drawCalls));
              }
              prior = now;
              if (samples.length < 60) requestAnimationFrame(tick);
              else resolve();
            }
            requestAnimationFrame(tick);
          });
          const sorted = [...samples].sort((a, b) => a - b),
            median = sorted[Math.floor(sorted.length / 2)],
            gl = document.querySelector('canvas').getContext('webgl2'),
            ext = gl.getExtension('WEBGL_debug_renderer_info');
          return {
            samples: 60,
            frameTimesMs: samples,
            villi: +document.querySelector('canvas').dataset.villusCount,
            drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
            medianFps: 1000 / median,
            medianFrameMs: median,
            meanFrameMs: samples.reduce((a, b) => a + b, 0) / samples.length,
            p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
            triangles: Math.round(triangles.reduce((a, b) => a + b, 0) / triangles.length),
            drawCalls: Math.round(calls.reduce((a, b) => a + b, 0) / calls.length),
            renderRatio: Number(document.querySelector('canvas').dataset.renderRatio),
            renderer: ext
              ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
              : gl.getParameter(gl.RENDERER),
            reference: window.reference,
          };
        });
        // Comparison images use the same physiological phase, independently of
        // how long each GPU needed to render the 60 benchmark intervals.
        await page.evaluate(
          async ({ id, variant, occlusion }) => {
            world.dispose();
            document.querySelector('canvas').remove();
            const canvas = document.createElement('canvas');
            document.body.append(canvas);
            const { createDigestionWorld } = await import('./digestion-world.js'),
              { ROUTE } = await import('./digestion-data.js');
            window.world = createDigestionWorld(canvas);
            world.settings({ motion: true });
            world.pause(true);
            world.setScene(
              ROUTE.find((s) => s.id === id),
              'stanley',
              'travel',
              id === 'ileum',
              id === 'ileum' ? 'residue' : 'glucose',
              variant === 'after' || occlusion ? { age: 5, worldTime: 5 } : 5,
            );
          },
          { id, variant, occlusion },
        );
        await page.waitForFunction(() => +document.querySelector('canvas').dataset.sceneAge === 5);
        await page.screenshot({ path: path.join(output, `${variant}-${id}-${size}.png`) });
        data.screenshotPhaseSeconds = 5;
        assert.deepEqual(errors, []);
        assert.equal(data.renderRatio, 0.8);
        results.push({ variant, id, size, viewport, dpr: 1, ...data });
        fs.writeFileSync(
          path.join(output, 'results.json'),
          JSON.stringify(
            {
              conditions:
                'Sequential runs, same Chromium / SwiftShader, 5 s warmup + 60 RAF intervals, DPR 1, fixed ratio 0.8, identical organ-local camera poses. No other browser tests during measurement.',
              baseline: occlusion
                ? 'Same working tree with coarse organ portals'
                : 'd7130f8d0298ad6b6c3db9f3e49991c6279b53a6',
              results,
            },
            null,
            2,
          ),
        );
        console.log(
          'MEASURE',
          variant,
          id,
          size,
          data.medianFps.toFixed(2),
          data.medianFrameMs.toFixed(1),
          data.triangles,
          data.drawCalls,
        );
        await page.close();
      }
  for (const before of results.filter((r) => r.variant === 'before')) {
    const after = results.find(
      (r) => r.variant === 'after' && r.id === before.id && r.size === before.size,
    );
    for (const field of ['viewport', 'dpr', 'renderRatio', 'drawingBuffer', 'reference'])
      assert.deepEqual(after[field], before[field], 'matched benchmark condition: ' + field);
  }
  await browser.close();
  console.log(
    'PASS comparable before/after performance,',
    results.length,
    'fixed-pose screenshots',
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
