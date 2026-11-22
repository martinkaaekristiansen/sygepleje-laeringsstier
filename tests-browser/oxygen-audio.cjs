const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'),
  assert = require('node:assert/strict'),
  { base, launch, seed, state, saved } = require('./oxygen-fixtures.cjs');
(async () => {
  const browser = await chromium.launch(launch);
  try {
    const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
    p.setDefaultTimeout(120000);
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await seed(p, { stage: 'trachea' });
    await p.locator('[data-oxygen=sound]').click();
    await p.waitForFunction(
      () => JSON.parse(document.querySelector('canvas').dataset.oxygenAudio || '{}').sources === 3,
    );
    const active = await p.locator('canvas').getAttribute('data-oxygen-audio');
    assert(JSON.parse(active).unlocked);
    await p.locator('[data-oxygen=settings]').click();
    const a = await state(p);
    await p.waitForTimeout(500);
    assert.deepEqual((await state(p)).camera.position, a.camera.position);
    await p.locator('[data-oxygen-setting=volume]').fill('0.5');
    await p.locator('[data-oxygen-setting=motion]').check();
    await p.locator('[data-oxygen-setting=quality]').selectOption('high');
    await p.locator('[data-oxygen-setting=sound]').uncheck();
    await p.locator('[data-oxygen=settings-close]').click();
    assert.equal((await saved(p)).oxygenJourney.settings.sound, false);
    assert.equal((await saved(p)).oxygenJourney.settings.volume, 0.5);
    assert.equal((await saved(p)).oxygenJourney.settings.motion, false);
    assert.equal((await saved(p)).oxygenJourney.settings.quality, 'high');
    await p.reload();
    await p.locator('[data-oxygen=start]:enabled').waitFor();
    assert.equal(await p.locator('[data-oxygen=sound]').textContent(), 'Slå lyd til');
    await p.locator('[data-oxygen=resume]').click();
    await p.waitForFunction(() => document.querySelector('.oxygen-loading').hidden);
    await p.locator('canvas').focus();
    const before = (await state(p)).camera;
    await p.keyboard.press('ArrowRight');
    await p.waitForFunction(
      (old) =>
        JSON.stringify(JSON.parse(document.querySelector('canvas').dataset.camera).look) !==
        JSON.stringify(old),
      before.look,
    );
    assert.notDeepEqual((await state(p)).camera.look, before.look);
    const unsupported = await browser.newPage();
    unsupported.setDefaultTimeout(120000);
    await unsupported.addInitScript(() => {
      Object.defineProperty(window, 'AudioContext', { value: undefined });
      Object.defineProperty(window, 'webkitAudioContext', { value: undefined });
    });
    await seed(unsupported, { stage: 'hb-binding' });
    await unsupported.locator('[data-oxygen=sound]').click();
    await unsupported.locator('[data-oxygen=settings]').click();
    await unsupported
      .getByText('Lyd understøttes ikke i denne browser.', { exact: true })
      .waitFor();
    assert.equal((await saved(unsupported)).oxygenJourney.active.phase, 'question');
    await unsupported.close();
    const fallback = await browser.newPage();
    fallback.setDefaultTimeout(120000);
    await fallback.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return /^webgl/.test(type) ? null : original.call(this, type, ...args);
      };
    });
    await fallback.goto(base + '#/sti/iltens-rejse/oxygen-easy');
    await fallback.getByRole('heading', { name: '3D kunne ikke vises' }).waitFor();
    assert(
      await fallback
        .getByRole('link', { name: 'Tilbage til læringsstier', exact: true })
        .isVisible(),
    );
    await fallback.close();
    assert.deepEqual(errors, []);
    console.log(
      'PASS oxygen audio/settings: gesture, mute, volume, motion, quality, reload, free look, unavailable audio and WebGL fallback',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
