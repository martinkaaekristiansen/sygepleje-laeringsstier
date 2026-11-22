const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'),
  assert = require('node:assert/strict'),
  http = require('node:http'),
  fs = require('node:fs/promises'),
  path = require('node:path');
// Test the real hashed Pages artifact under a repository subdirectory.
(async () => {
  const root = path.resolve('dist'),
    prefix = '/sygepleje-laeringsstier/';
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (!url.pathname.startsWith(prefix)) throw Error();
      const name = decodeURIComponent(url.pathname.slice(prefix.length)) || 'index.html',
        file = path.resolve(root, name);
      if (!file.startsWith(root + path.sep)) throw Error();
      res.writeHead(200, {
        'Content-Type':
          {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.svg': 'image/svg+xml',
          }[path.extname(file)] || 'application/octet-stream',
      });
      res.end(await fs.readFile(file));
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  process.env.APP_URL = 'http://127.0.0.1:' + server.address().port + prefix;
  const { seed, state, chooseCorrect, launch, base } = require('./oxygen-fixtures.cjs'),
    browser = await chromium.launch(launch);
  try {
    const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    p.setDefaultTimeout(120000);
    const errors = [],
      bad = [],
      requests = [];
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    p.on('response', (r) => {
      requests.push(r.url());
      if (r.status() >= 400) bad.push({ url: r.url(), status: r.status() });
    });
    await seed(p, { stage: 'la' });
    assert.equal((await state(p)).stage, 'la');
    await chooseCorrect(p);
    await p.waitForFunction(
      () => document.querySelector('canvas').dataset.oxygenStage === 'mitral',
    );
    await p.locator('a.back').click();
    await p.locator('.continue-section').waitFor();
    await p.locator('[data-semester="1"]').click();
    assert.equal(await p.locator('.path-card').count(), 4);
    for (const id of ['fordoejelsens-vilde-rejse', 'blodcellens-rejse', 'find-vej-kredsloeb'])
      assert.equal(await p.locator('[data-open="' + id + '"]').count(), 1);
    assert(requests.some((u) => u.includes('/assets/') && u.includes('journey-geometry-worker')));
    assert.deepEqual(bad, []);
    assert.deepEqual(errors, []);
    require('node:fs').writeFileSync(
      '/tmp/oxygen-built-browser.json',
      JSON.stringify({ base, errors, bad, requests: requests.length, worker: true }, null, 2),
    );
    console.log(
      'PASS built Pages subpath: heart worker, relative assets, game choices, navigation cleanup, six paths and old games',
    );
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
