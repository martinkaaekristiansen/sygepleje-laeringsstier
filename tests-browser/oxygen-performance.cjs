// Run alone, after functional tests. Both variants use this complete world,
// identical prepared segments/camera/time, DPR=1 and 1280×800 CSS pixels.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'),
  fs = require('node:fs'),
  path = require('node:path'),
  { launch } = require('./oxygen-fixtures.cjs'),
  { openInspector } = require('./oxygen-inspection.cjs');
const output = process.env.OXYGEN_OUTPUT || path.resolve('docs/codex-iltens-rejse/performance');
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch(launch);
  try {
    const p = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });
    p.setDefaultTimeout(120000);
    await openInspector(p);
    await p.evaluate(async () => {
      const i = oxygenInspection;
      i.world.settings({ quality: 'high', motion: true });
      for (const stage of i.data.oxygenRoute(i.engine.newOxygenRun()).map((s) => s.id))
        await i.checkpoint({ stage });
    });
    const environment = await p.evaluate(() => {
        const gl = oxygenInspection.world.renderer.getContext(),
          info = gl.getExtension('WEBGL_debug_renderer_info');
        return {
          userAgent: navigator.userAgent,
          renderer: info
            ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL)
            : gl.getParameter(gl.RENDERER),
          viewport: [innerWidth, innerHeight],
          ratio: oxygenInspection.world.renderer.getPixelRatio(),
          samples: 45,
          warmup: 12,
        };
      }),
      results = [];
    for (const stage of ['trachea', 'hb-binding', 'lv', 'tissue-oxygen']) {
      for (const optimized of [false, true, true, false]) {
        await p.evaluate(
          async (args) => {
            const i = oxygenInspection;
            await i.checkpoint({
              stage: args.stage,
              animation: ['hb-binding', 'tissue-oxygen'].includes(args.stage),
              age:
                args.stage === 'trachea'
                  ? 6
                  : args.stage === 'hb-binding'
                    ? 5
                    : args.stage === 'lv'
                      ? 0
                      : 7,
            });
            i.world.setOptimized(args.optimized);
            i.base = structuredClone(i.run);
          },
          { stage, optimized },
        );
        const sample = await p.evaluate(async () => {
          const i = oxygenInspection,
            w = i.world,
            intervals = [],
            cpu = [];
          let previous;
          for (let k = 0; k < 57; k++) {
            const now = await new Promise(requestAnimationFrame);
            if (k >= 12 && previous !== undefined) intervals.push(now - previous);
            previous = now;
            const r = structuredClone(i.base);
            r.worldTime += k / 30;
            const t = performance.now();
            w.renderAt(r);
            cpu.push(performance.now() - t);
          }
          const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length,
            sorted = [...intervals].sort((a, b) => a - b);
          return {
            fps: 1000 / mean(intervals),
            frameMs: mean(intervals),
            p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
            cpuMs: mean(cpu.slice(12)),
            ...w.snapshot().stats,
            camera: w.snapshot().camera,
          };
        });
        results.push({ stage, optimized, ...sample });
        console.log(
          'PERF',
          stage,
          optimized,
          sample.fps.toFixed(2),
          sample.triangles,
          sample.drawCalls,
        );
      }
      for (const optimized of [false, true]) {
        await p.evaluate(
          async (args) => {
            const i = oxygenInspection;
            await i.checkpoint({
              stage: args.stage,
              animation: ['hb-binding', 'tissue-oxygen'].includes(args.stage),
              age:
                args.stage === 'trachea'
                  ? 6
                  : args.stage === 'hb-binding'
                    ? 5
                    : args.stage === 'lv'
                      ? 0
                      : 7,
            });
            i.world.setOptimized(args.optimized);
            const r = structuredClone(i.run);
            r.worldTime += 0.1;
            i.world.renderAt(r);
          },
          { stage, optimized },
        );
        await p.screenshot({
          path: path.join(output, stage + '-' + (optimized ? 'efter' : 'foer') + '.png'),
        });
      }
    }
    fs.writeFileSync(
      path.join(output, 'maalinger.json'),
      JSON.stringify(
        {
          method:
            'Controlled ABBA comparison, complete same code/world. Before = culling and LOD disabled; after = enabled. Not a historical version comparison. Same camera/time/DPR per pair. Software renderer; run without other browser tests. Animation poses use fixed 1/30-second simulation steps; FPS/frame time use unmodified wall-clock rAF intervals.',
          environment,
          results,
        },
        null,
        2,
      ),
    );
    console.log('PASS oxygen performance measurements');
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
