// Reproducible cold-context comparison. Run after other browsers finish.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
(async () => {
  const after = path.resolve(process.cwd()),
    before = path.resolve(process.env.DOSE_BASELINE || '/workspace/work/doedelig-dosis');
  const { startStaticServer } = await import(
    pathToFileURL(path.join(after, 'scripts/static-server.js'))
  );
  const result = {
    date: new Date().toISOString(),
    conditions: {
      node: process.version,
      browser: 'Playwright 1.56.1 Chromium',
      viewport: '1280 × 800',
      cache: 'new browser context per sample',
      network: 'local static server, identical Pages subpath, no throttling',
      samples: 3,
      limitations:
        'Local timing is not a physical iPhone or public-network benchmark; small differences are noise.',
    },
    build: {},
    home: {},
    game: {},
  };
  for (const [name, root] of [
    ['before', before],
    ['after', after],
  ]) {
    const samples = [];
    for (let i = 0; i < 3; i++) {
      const started = performance.now(),
        r = spawnSync(process.execPath, ['scripts/build.js'], { cwd: root, encoding: 'utf8' });
      if (r.status) throw Error(r.stderr);
      samples.push(performance.now() - started);
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/build-manifest.json')));
    result.build[name] = {
      samplesMs: samples,
      medianMs: [...samples].sort((a, b) => a - b)[1],
      bytes: manifest.bytes,
      files: manifest.files.length,
      asset: manifest.assets,
    };
  }
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    for (const [name, root] of [
      ['before', before],
      ['after', after],
    ]) {
      const server = await startStaticServer({
          root: path.join(root, 'dist'),
          prefix: '/sygepleje-laeringsstier/',
        }),
        samples = [];
      try {
        for (let i = 0; i < 3; i++) {
          const context = await browser.newContext({ viewport: { width: 1280, height: 800 } }),
            page = await context.newPage();
          await page.goto(server.url);
          await page.locator('.continue-section').waitFor();
          await page.waitForLoadState('networkidle');
          const cdp = await context.newCDPSession(page);
          const heap = await cdp.send('Runtime.getHeapUsage');
          samples.push(
            await page.evaluate(() => ({
              domContentLoadedMs:
                performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd,
              loadMs: performance.getEntriesByType('navigation')[0].loadEventEnd,
              resourceBytes: performance
                .getEntriesByType('resource')
                .reduce((n, r) => n + r.decodedBodySize, 0),
              requests: performance.getEntriesByType('resource').length,
              newGameImages: performance
                .getEntriesByType('resource')
                .filter((r) => /dose-.*webp/.test(r.name)).length,
              heapBytesRounded: performance.memory?.usedJSHeapSize || null,
            })),
          );
          samples.at(-1).heapBytes = heap.usedSize;
          {
            const begin = Date.now();
            await page.goto(server.url + '#/sti/doedelig-dosis/sagsmapper');
            await page.locator('.dose-folder').waitFor();
            await page.waitForFunction(
              () => document.querySelector('link[href*="dose.css"]')?.sheet,
            );
            await page.locator('.dose-cover').evaluate(async (el) => {
              const url = getComputedStyle(el).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
              if (url) {
                const image = new Image();
                image.src = url;
                await image.decode();
              }
            });
            await page.locator('[data-dose=start]').click();
            await page.locator('[data-clue=opening]').waitFor();
            const interactiveMs = Date.now() - begin;
            await page
              .locator('.dose-photo img')
              .evaluateAll((imgs) => Promise.all(imgs.map((img) => img.decode())));
            await page.waitForLoadState('networkidle');
            const gameSample = {
              interactiveMs,
              readyMs: Date.now() - begin,
              ...(await page.evaluate(() => ({
                resourceBytes: performance
                  .getEntriesByType('resource')
                  .reduce((n, r) => n + r.decodedBodySize, 0),
                images: performance
                  .getEntriesByType('resource')
                  .filter((r) => /dose-.*webp/.test(r.name)).length,
                heapBytesRounded: performance.memory?.usedJSHeapSize || null,
                domNodes: document.querySelectorAll('*').length,
              }))),
            };
            gameSample.heapBytes = (await cdp.send('Runtime.getHeapUsage')).usedSize;
            (result.game[name] ||= []).push(gameSample);
          }
          await context.close();
        }
      } finally {
        await new Promise((r) => server.close(r));
      }
      result.home[name] = samples;
    }
  } finally {
    await browser.close();
  }
  const destination = path.join(after, 'docs/codex-doedelig-dosis-ux/performance.json');
  fs.writeFileSync(destination, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
