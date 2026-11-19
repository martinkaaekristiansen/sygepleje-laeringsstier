const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
const { seed } = require('./digestion-fixtures.cjs');
const base = process.env.APP_URL || 'http://127.0.0.1:3001/sygepleje-laeringsstier/';
const before = process.env.ORAL_BEFORE_URL;
const output = process.env.ORAL_OUTPUT || path.resolve('docs/codex-fordoejelse/mund-mobilkamera');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const b = await chromium.launch({
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const results = [],
    errors = [];
  try {
    for (const variant of before ? ['before', 'after'] : ['after'])
      for (const mobile of [false, true]) {
        const p = await b.newPage({
          viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
          hasTouch: mobile,
          isMobile: mobile,
          deviceScaleFactor: 1,
          reducedMotion: 'reduce',
        });
        p.setDefaultTimeout(120000);
        p.on('pageerror', (e) => errors.push(e.message));
        p.on('console', (m) => {
          if (m.type() === 'error') errors.push(m.text());
        });
        p.on('dialog', (d) => d.accept());
        const url = variant === 'before' ? before : base,
          size = mobile ? 'mobil' : 'desktop';
        for (const [name, index, phase, mode] of [
          ['indgang', 0, 'entry', undefined],
          ['mund', 0, 'boss', 'boss'],
          ['synkning', 2, 'route', 'travel'],
          ['jejunum', 6, 'route', 'travel'],
        ]) {
          await seed(p, url, {
            index,
            phase,
            mode,
            age: 2,
            motion: false,
            extra:
              name === 'indgang'
                ? {
                    animation: {
                      stage: 'mouth',
                      mode: 'face-intro',
                      age: 3,
                      physicalRouteVersion: 1,
                      cameraDistance: 0,
                      fromDistance: 0,
                      targetDistance: 0,
                      travelDuration: 0,
                    },
                  }
                : {},
          });
          if (name === 'indgang') await p.locator('[data-entry]').first().waitFor();
          await p.locator('[data-digest=settings]').click();
          await p.locator('[data-digest=pause]').click();
          await p.locator('[data-digest=settings-close]').click();
          const state = await p.locator('canvas').evaluate((c) => ({
            camera: JSON.parse(c.dataset.camera),
            route: JSON.parse(c.dataset.routeCamera),
            oral: JSON.parse(c.dataset.oralState || '{}'),
            bounds: { width: c.clientWidth, height: c.clientHeight },
            stage: c.dataset.digestStage,
          }));
          if (variant === 'after') {
            assert(state.oral.face);
            assert(
              Math.abs(state.oral.tongue[0] - state.oral.tongueBase[0]) < 1e-6,
              'both tongue sections share the same midline',
            );
            if (name === 'indgang')
              assert(
                state.route.cameraDistance < 0,
                'old entry checkpoints are corrected to the outside view',
              );
            if (mobile) {
              assert(state.camera.fov > 100);
              assert(state.oral.horizontalFov >= 70);
            } else assert.equal(state.camera.fov, 74);
          }
          const file = `${variant}-${name}-${size}.png`;
          await p.screenshot({ path: path.join(output, file) });
          results.push({ variant, size, name, file, ...state });
          console.log(
            'PASS view',
            variant,
            name,
            size,
            'fov',
            state.camera.fov.toFixed(1),
            'distance',
            state.route.cameraDistance,
          );
        }
        if (variant === 'after') {
          for (const viewport of [
            { width: 320, height: 568 },
            { width: 375, height: 667 },
            { width: 390, height: 844 },
            { width: 768, height: 1024 },
            { width: 844, height: 390 },
            { width: 1024, height: 768 },
            { width: 1280, height: 800 },
          ]) {
            await p.setViewportSize(viewport);
            await p.waitForTimeout(200);
            const view = await p.locator('canvas').evaluate((c) => ({
              camera: JSON.parse(c.dataset.camera),
              oral: JSON.parse(c.dataset.oralState),
              width: c.clientWidth,
              height: c.clientHeight,
            }));
            assert(view.camera.fov >= 74 && view.camera.fov <= 120);
            if (view.width < view.height) assert(view.oral.horizontalFov >= 70);
            const layout = await p.locator('.digest-learning').evaluate((info) => {
              const a = info.getBoundingClientRect(),
                b = document.querySelector('.digest-panel').getBoundingClientRect();
              return {
                separate: a.bottom <= b.top,
                overflow: document.documentElement.scrollWidth > innerWidth,
              };
            });
            assert(layout.separate && !layout.overflow);
            results.push({ type: 'resize', viewport, ...view });
          }
        }
        await p.close();
      }
    // Real new games, without a checkpoint fixture: all three begin outside, then
    // fly continuously through the mouth and reach an active learning question.
    for (const character of ['stanley', 'poul', 'trine']) {
      const p = await b.newPage({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
        reducedMotion: 'reduce',
      });
      p.setDefaultTimeout(120000);
      p.on('pageerror', (e) => errors.push(e.message));
      await p.goto(base + '#/sti/fordoejelsens-vilde-rejse/digestion-' + character);
      await p.locator('[data-digest=start]').click();
      await p.locator('[data-entry]').first().waitFor();
      const start = await p.locator('canvas').evaluate((c) => JSON.parse(c.dataset.routeCamera));
      assert(start.cameraDistance < 0);
      await p.locator('[data-entry]').filter({ hasText: 'Cavitas oris' }).click();
      await p.waitForFunction(
        () => document.querySelector('canvas').dataset.digestMode === 'intro',
      );
      await p.waitForFunction(
        () => JSON.parse(document.querySelector('canvas').dataset.routeCamera).cameraDistance > 0,
      );
      await p.locator('[data-choice]').first().waitFor();
      assert.equal(await p.locator('canvas').getAttribute('data-digest-stage'), 'mouth');
      results.push({
        type: 'natural-start',
        character,
        outsideDistance: start.cameraDistance,
        enteredMouth: true,
      });
      console.log('PASS outside-to-mouth start', character);
      await p.close();
    }
    const retina = await b.newPage({
      viewport: { width: 390, height: 664 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 3,
      reducedMotion: 'reduce',
    });
    retina.setDefaultTimeout(120000);
    retina.on('pageerror', (e) => errors.push(e.message));
    for (const [name, phase, mode] of [
      ['indgang', 'entry', undefined],
      ['mund', 'boss', 'boss'],
    ]) {
      await seed(retina, base, { index: 0, phase, mode, motion: false });
      if (name === 'indgang') await retina.locator('[data-entry]').first().waitFor();
      await retina.locator('[data-digest=settings]').click();
      await retina.locator('[data-digest=pause]').click();
      await retina.locator('[data-digest=settings-close]').click();
      const state = await retina
        .locator('canvas')
        .evaluate((c) => ({
          camera: JSON.parse(c.dataset.camera),
          oral: JSON.parse(c.dataset.oralState),
          route: JSON.parse(c.dataset.routeCamera),
        }));
      assert(state.oral.horizontalFov >= 73.9);
      if (name === 'indgang') assert(state.route.cameraDistance < 0);
      const file = 'retina-' + name + '-390x664.png';
      await retina.screenshot({ path: path.join(output, file) });
      results.push({
        type: 'retina-mobile',
        name,
        file,
        viewport: { width: 390, height: 664 },
        deviceScaleFactor: 3,
        ...state,
      });
      console.log('PASS retina phone', name);
    }
    await retina.close();
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(output, 'checks.json'),
      JSON.stringify({ results, errors }, null, 2) + '\n',
    );
    console.log(
      'PASS mouth/phone regression: real external entry, centered tongue, continuous flight and responsive framing',
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
