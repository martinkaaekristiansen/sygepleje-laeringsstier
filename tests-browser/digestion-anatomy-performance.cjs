const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const output =
  process.env.ANATOMY_OUTPUT ||
  path.resolve('docs/codex-fordoejelse/anatomi-enzymer-hcl-mikrobiota/performance');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const results = [];
  try {
    for (const size of ['desktop', 'mobil'])
      for (const id of ['mouth', 'epiglottis', 'stomach', 'ascending', 'jejunum']) {
        if(process.env.PERFORMANCE_CASES&&!process.env.PERFORMANCE_CASES.split(',').includes(size+':'+id))continue;
        let reference;
        for (const variant of ['before', 'after']) {
          const base =
            variant === 'before'
              ? process.env.BEFORE_URL || 'http://127.0.0.1:3030/'
              : process.env.APP_URL || 'http://127.0.0.1:3040/';
          const viewport =
            size === 'desktop' ? { width: 1280, height: 800 } : { width: 390, height: 844 };
          const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
          page.setDefaultTimeout(120000);
          const errors = [];
          page.on('pageerror', (e) => errors.push(e.message));
          await page.route('**/digestion-performance.js', async (route) => {
            const r = await route.fetch();
            await route.fulfill({
              response: r,
              body: (await r.text())
                .replace('let ratio = maximum', 'let ratio = 0.8')
                .replace('sample(ms) {', 'sample(ms) { return false;'),
            });
          });
          await page.route('**/?anatomy-benchmark', (r) =>
            r.fulfill({
              contentType: 'text/html',
              body: '<!doctype html><link rel="stylesheet" href="digestion.css"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block}</style><canvas></canvas>',
            }),
          );
          await page.goto(base + '?anatomy-benchmark');
          reference = await page.evaluate(
            async ({ id, reference }) => {
              const T = await import('./three.module.min.js');
              const { buildDigestiveTract } = await import('./digestion-tract.js');
              const { createRouteCamera } = await import('./digestion-route-camera.js');
              window.tract = buildDigestiveTract();
              const rig = createRouteCamera(tract);
              rig.begin(id, 'travel');
              const p = rig.pose(id);
              const ref = reference || {
                position: p.position.toArray(),
                look: p.look.toArray(),
                up: p.up.toArray(),
              };
              const lookAt = T.PerspectiveCamera.prototype.lookAt;
              T.PerspectiveCamera.prototype.lookAt = function () {
                this.position.fromArray(ref.position);
                this.up.fromArray(ref.up);
                return lookAt.call(this, new T.Vector3(...ref.look));
              };
              const { createDigestionWorld } = await import('./digestion-world.js');
              window.ROUTE = (await import('./digestion-data.js')).ROUTE;
              window.world = createDigestionWorld(document.querySelector('canvas'));
              world.settings({ motion: true });
              world.setScene(
                ROUTE.find((s) => s.id === id),
                'poul',
                'travel',
                id === 'ascending',
                id === 'ascending' ? 'residue' : id === 'jejunum' ? 'amino-acid' : 'protein',
              );
              return ref;
            },
            { id, reference },
          );
          await page.waitForTimeout(5000);
          const metrics = await page.evaluate(async () => {
            const frameTimesMs = [],
              triangles = [],
              calls = [];
            let previous;
            await new Promise((resolve) => {
              function frame(now) {
                if (previous !== undefined) {
                  frameTimesMs.push(now - previous);
                  triangles.push(+document.querySelector('canvas').dataset.triangles);
                  calls.push(+document.querySelector('canvas').dataset.drawCalls);
                }
                previous = now;
                if (frameTimesMs.length < 60) requestAnimationFrame(frame);
                else resolve();
              }
              requestAnimationFrame(frame);
            });
            const sorted = [...frameTimesMs].sort((a, b) => a - b),
              medianFrameMs = sorted[30],
              canvas = document.querySelector('canvas'),
              gl = canvas.getContext('webgl2'),
              ext = gl.getExtension('WEBGL_debug_renderer_info');
            return {
              frameTimesMs,
              medianFrameMs,
              medianFps: 1000 / medianFrameMs,
              p95FrameMs: sorted[57],
              meanFrameMs: frameTimesMs.reduce((a, b) => a + b) / 60,
              triangles: Math.round(triangles.reduce((a, b) => a + b) / 60),
              drawCalls: Math.round(calls.reduce((a, b) => a + b) / 60),
              renderRatio: +canvas.dataset.renderRatio,
              villi: +canvas.dataset.villusCount,
              actualCamera: JSON.parse(canvas.dataset.camera),
              drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
              renderer: ext
                ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
                : gl.getParameter(gl.RENDERER),
            };
          });
          assert.equal(metrics.renderRatio, 0.8);
          assert.deepEqual(metrics.drawingBuffer, [
            Math.floor(viewport.width * 0.8),
            Math.floor(viewport.height * 0.8),
          ]);
          if (variant === 'before') reference.quaternion = metrics.actualCamera.quaternion;
          else {
            assert(
              metrics.actualCamera.position.every(
                (v, i) => Math.abs(v - reference.position[i]) < 1e-8,
              ),
            );
            const same = await page.evaluate(
              ({ a, b }) => {
                return Math.abs(a.reduce((n, v, i) => n + v * b[i], 0));
              },
              { a: metrics.actualCamera.quaternion, b: reference.quaternion },
            );
            assert(same > 1 - 1e-8, 'identical reference camera orientation');
          }
          assert.deepEqual(errors, []);
          await page.evaluate((id) => {
            world.pause(true);
            const s = tract.stations[id].distance;
            world.setScene(
              ROUTE.find((x) => x.id === id),
              'poul',
              'travel',
              id === 'ascending',
              id === 'ascending' ? 'residue' : id === 'jejunum' ? 'amino-acid' : 'protein',
              {
                age: 4,
                worldTime: 4,
                physicalRouteVersion: 1,
                cameraDistance: s,
                fromDistance: s,
                targetDistance: s,
                travelDuration: 0,
              },
            );
            world.pause(true);
          }, id);
          await page.waitForTimeout(500);
          const image = `${variant}-${id}-${size}.png`;
          await page.screenshot({ path: path.join(output, image) });
          results.push({ variant, id, size, viewport, dpr: 1, reference, image, ...metrics });
          fs.writeFileSync(
            path.join(output, 'results.json'),
            JSON.stringify(
              {
                baseline:
                  'f93bb976e1dc3c8c86210146e2fee9219f980d8d (published mouth corrections preserved on requested branch base 1c7eb85)',
                conditions:
                  'Sequential variants, same Chromium/SwiftShader, fixed 0.8 render ratio, DPR 1, 5 s warmup + 60 RAF intervals. No other browser tests during measurement. Identical frozen patient-world camera position, look and up for each pair. Comparison stills at physiology time 4 s; functional camera and label checks use the real unfrozen camera separately.',
                results,
              },
              null,
              2,
            ) + '\n',
          );
          console.log(
            'PERF',
            variant,
            id,
            size,
            metrics.medianFps.toFixed(2),
            'FPS',
            metrics.medianFrameMs.toFixed(1),
            'ms',
            metrics.triangles,
            'triangles',
            metrics.drawCalls,
            'calls',
          );
          await page.close();
        }
      }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
