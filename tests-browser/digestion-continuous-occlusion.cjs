// Pixel equality at a frozen clock proves that fine portal culling omits only
// occluded villi. No model, instance count, material or resolution is changed.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const output = path.resolve('docs/codex-fordoejelse/sammenhaengende-verden/occlusion');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const captures = [],
    errors = [];
  for (const variant of ['coarse', 'fine']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    if (variant === 'coarse')
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
    await page.route('**/?occlusion-inspection', (r) =>
      r.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;overflow:hidden}canvas{display:block;width:100vw;height:100vh}</style><canvas></canvas>',
      }),
    );
    await page.goto((process.env.APP_URL || 'http://127.0.0.1:3030/') + '?occlusion-inspection');
    await page.evaluate(async () => {
      const { createDigestionWorld } = await import('./digestion-world.js'),
        { buildDigestiveTract } = await import('./digestion-tract.js'),
        { ROUTE } = await import('./digestion-data.js');
      window.tract = buildDigestiveTract();
      window.route = ROUTE;
      window.world = createDigestionWorld(document.querySelector('canvas'));
      world.settings({ motion: true });
      world.pause(true);
    });
    for (const size of ['desktop', 'mobile']) {
      if (size === 'mobile') await page.setViewportSize({ width: 390, height: 844 });
      for (const id of [
        'duodenum',
        'jejunum',
        'ileum',
        'pylorus',
        'duodenum-jejunum',
        'jejunum-ileum',
        'ileocoekal',
      ]) {
        const exists = await page.evaluate((id) => !!tract.parts.find((p) => p.id === id), id);
        assert(exists, 'required culling location exists: ' + id);
        for (const yaw of [0, Math.PI]) {
          await page.evaluate(
            ({ id, yaw }) => {
              const p = tract.parts.find((p) => p.id === id),
                distance = (p.start + p.end) / 2,
                stage =
                  route.find((s) => s.id === id) ||
                  route.find((s) => s.id === tract.connections.find((c) => c.id === id).to);
              world.setScene(stage, 'stanley', 'journey', false, 'glucose', {
                age: 2,
                physicalRouteVersion: 1,
                cameraDistance: distance,
                fromDistance: distance,
                targetDistance: distance,
                travelDuration: 0,
                worldTime: 5,
                yaw,
                pitch: 0,
              });
              world.learningState({ completed: [], task: 0 });
              world.pause(true);
            },
            { id, yaw },
          );
          await page.waitForTimeout(1000);
          const name = `${size}-${id}-${yaw === 0 ? 'forward' : 'back'}`;
          await page.screenshot({ path: path.join(output, `${variant}-${name}.png`) });
          const data = await page.locator('canvas').evaluate((c) => ({
            triangles: +c.dataset.triangles,
            drawCalls: +c.dataset.drawCalls,
            ratio: +c.dataset.renderRatio,
          }));
          captures.push({ variant, name, ...data });
          console.log('OCCLUSION', variant, name, data);
        }
      }
    }
    await page.close();
  }
  assert.deepEqual(errors, []);
  const comparisons = captures
    .filter((c) => c.variant === 'fine')
    .map((c) => {
      const name = c.name;
      const pixelEqual = fs
        .readFileSync(path.join(output, 'coarse-' + name + '.png'))
        .equals(fs.readFileSync(path.join(output, 'fine-' + name + '.png')));
      return {
        name,
        pixelEqual,
        coarse: captures.find((b) => b.variant === 'coarse' && b.name === name),
        fine: c,
      };
    });
  assert.equal(comparisons.length, 28);
  fs.writeFileSync(path.join(output, 'pixel-checks.json'), JSON.stringify(comparisons, null, 2));
  assert(
    comparisons.every((c) => c.pixelEqual),
    'culling must retain every visible pixel: ' +
      comparisons
        .filter((c) => !c.pixelEqual)
        .map((c) => c.name)
        .join(', '),
  );
  fs.writeFileSync(
    path.join(output, 'captures.json'),
    JSON.stringify({ captures, errors }, null, 2),
  );
  await browser.close();
  console.log(
    'PASS',
    comparisons.length,
    'exact-pixel portal-culling comparisons, all three mucosal junctions',
  );
  // Retain the full numerical audit and one representative exact-pixel pair;
  // the other generated comparisons are temporary validation artifacts.
  for (const c of captures)
    if (c.name !== 'desktop-jejunum-forward')
      fs.unlinkSync(path.join(output, c.variant + '-' + c.name + '.png'));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
