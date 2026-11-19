const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const base = process.env.APP_URL || 'http://127.0.0.1:3040/';
const output =
  process.env.ANATOMY_OUTPUT ||
  path.resolve('docs/codex-fordoejelse/anatomi-enzymer-hcl-mikrobiota');
const temp = fs.mkdtempSync('/tmp/digestion-anatomy-frames-');
fs.mkdirSync(path.join(output, 'video'), { recursive: true });
(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const records = [],
    videos = [],
    errors = [];
  try {
    async function make(size) {
      const page = await browser.newPage({
        viewport: size === 'mobil' ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      });
      page.setDefaultTimeout(120000);
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      await page.route('**/?anatomy-review', (r) =>
        r.fulfill({
          contentType: 'text/html',
          body: '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="digestion.css"><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block}.review-caption{position:absolute;top:0;left:0;right:0;padding:8px 16px;background:#27121bf0;color:#ffedda;font:18px/1.3 system-ui;pointer-events:none;z-index:5}</style><canvas></canvas><div class="review-caption blood-game-bar"></div>',
        }),
      );
      await page.goto(base + '?anatomy-review');
      await page.evaluate(async () => {
        window.T = await import('./three.module.min.js');
        window.ROUTE = (await import('./digestion-data.js')).ROUTE;
        window.tract = (await import('./digestion-tract.js')).buildDigestiveTract();
        window.world = (await import('./digestion-world.js')).createDigestionWorld(
          document.querySelector('canvas'),
        );
        world.settings({ motion: true });
        world.pause(true);
      });
      return page;
    }
    async function state(
      page,
      {
        id = 'stomach',
        mode = 'boss',
        age = 0,
        worldTime = age,
        distance,
        yaw = 0,
        pitch = 0,
        task = 0,
        denatured = false,
        caption = '',
        select = false,
        choices = false,
      },
    ) {
      await page.evaluate(
        ({
          id,
          mode,
          age,
          worldTime,
          distance,
          yaw,
          pitch,
          task,
          denatured,
          caption,
          select,
          choices,
        }) => {
          const s = tract.stations[id].distance,
            end = mode === 'swallow' ? tract.stations.oesophagus.distance : s,
            u = age / 3,
            d = distance ?? (mode === 'swallow' ? s + (end - s) * u * u * (3 - 2 * u) : s);
          if (select) world.selectEnzyme('Pepsin');
          world.setScene(
            ROUTE.find((s) => s.id === id),
            'poul',
            mode,
            ['caecum', 'ascending', 'transverse', 'descending', 'sigmoid'].includes(id),
            ['caecum', 'ascending', 'transverse', 'descending', 'sigmoid'].includes(id)
              ? 'residue'
              : 'protein',
            {
              age,
              worldTime,
              physicalRouteVersion: 1,
              cameraDistance: d,
              fromDistance: mode === 'swallow' ? s : d,
              targetDistance: mode === 'swallow' ? end : d,
              travelDuration: mode === 'swallow' ? 3 : 0,
              yaw,
              pitch,
            },
          );
          world.learningState({ task, proteinDenatured: denatured, completed: [] });
          if (choices) world.labelChoices(['Pepsin', 'Spytamylase', 'Lipase']);
          world.configureChoices([], choices ? 'enzyme' : 'source');
          world.pause(true);
          document.querySelector('.review-caption').textContent = caption;
          document.querySelector('.review-caption').hidden = !caption;
        },
        {
          id,
          mode,
          age,
          worldTime,
          distance,
          yaw,
          pitch,
          task,
          denatured,
          caption,
          select,
          choices,
        },
      );
      await page.waitForFunction(
        ({ mode, age }) => {
          const c = document.querySelector('canvas');
          return c.dataset.digestMode === mode && Math.abs(+c.dataset.sceneAge - age) < 0.001;
        },
        { mode, age },
      );
      return page.locator('canvas').evaluate((c) => ({
        camera: JSON.parse(c.dataset.camera),
        route: JSON.parse(c.dataset.routeCamera),
        protein: JSON.parse(c.dataset.proteinState || 'null'),
        enzyme: JSON.parse(c.dataset.selectedEnzyme || 'null'),
        swallow: JSON.parse(c.dataset.swallowPose || '{}'),
        builds: +c.dataset.environmentBuilds,
      }));
    }
    async function clip(page, name, title, fps, count, frame) {
      if (process.env.REVIEW_CLIPS && !process.env.REVIEW_CLIPS.split(',').includes(name)) {
        const previous = JSON.parse(
          fs.readFileSync(path.join(output, 'visual-checks.json')),
        ).videos.find((v) => v.file === 'video/' + name + '.mp4');
        assert(previous, 'missing reusable clip ' + name);
        videos.push(previous);
        return;
      }
      const dir = path.join(temp, name);
      fs.mkdirSync(dir);
      const states = [];
      for (let i = 0; i < count; i++) {
        const data = await frame(i / (count - 1));
        await page.screenshot({ path: path.join(dir, `frame-${String(i).padStart(3, '0')}.png`) });
        if (data) states.push(data);
      }
      const file = 'video/' + name + '.mp4';
      execFileSync(
        'ffmpeg',
        [
          '-v',
          'error',
          '-y',
          '-framerate',
          String(fps),
          '-i',
          path.join(dir, 'frame-%03d.png'),
          '-c:v',
          'libx264',
          '-preset',
          'fast',
          '-crf',
          '23',
          '-pix_fmt',
          'yuv420p',
          '-movflags',
          '+faststart',
          path.join(output, file),
        ],
        { stdio: 'pipe' },
      );
      videos.push({
        file,
        title,
        fps,
        frames: count,
        duration: count / fps,
        conditions:
          'Deterministically sampled real rendering; playback frame rate is not a performance measurement.',
        states,
      });
      console.log('VIDEO', file);
    }
    for (const size of ['desktop', 'mobil']) {
      const page = await make(size);
      for (const [id, mode, age] of [
        ['epiglottis', 'travel', 0],
        ['epiglottis', 'swallow', 1.1],
        ['mouth', 'intro', 8],
        ['stomach', 'boss', 0],
        ['caecum', 'travel', 0],
      ]) {
        const data = await state(page, { id, mode, age });
        const file = `after-${id}-${mode}-${size}.png`;
        await page.screenshot({ path: path.join(output, file) });
        records.push({ file, size, id, mode, age, ...data });
        console.log('AFTER', file);
      }
      for (const manual of [false, true])
        await clip(
          page,
          `synkning-${size}-${manual ? 'manuelt-blik' : 'standardblik'}`,
          `Synkning fra begyndelse til slutning · ${manual ? 'med' : 'uden'} manuel kamerarotation`,
          8,
          25,
          async (f) => {
            const data = await state(page, {
              id: 'epiglottis',
              mode: 'swallow',
              age: f * 3,
              yaw: manual ? 0.55 : 0,
              pitch: manual ? 0.12 : 0,
              caption: 'Synkning · larynx beskyttes; fødevejen fortsætter bag luftvejen',
            });
            assert(Math.abs(data.camera.rollDegrees) < 1e-6);
            return data;
          },
        );
      await page.close();
    }
    let page = await make('desktop');
    await clip(page, 'hcl-sekretion', 'Saltsyre fra parietalcellerne · H⁺ og Cl⁻', 8, 49, (f) =>
      state(page, {
        mode: 'hcl',
        age: f * 6,
        task: 1,
        caption: 'Saltsyre fra parietalcellerne · H⁺ + Cl⁻ · ikke et enzym',
      }),
    );
    await clip(
      page,
      'protein-denaturering',
      'Denaturering ændrer foldningen; primærkæden bevares',
      8,
      49,
      async (f) => {
        const data = await state(page, {
          mode: 'denaturation',
          age: f * 6,
          task: 2,
          caption: 'Denaturering · proteinet folder delvist ud, uden at peptidbindinger spaltes',
        });
        assert.equal(data.protein.visibleLinks, 11);
        return data;
      },
    );
    let selectedInstance;
    await clip(
      page,
      'pepsin-valg-til-produkter',
      'Samme pepsin fra valg gennem spørgsmål til intakt enzym og peptider',
      8,
      121,
      async (f) => {
        const t = f * 15;
        let data;
        if (t < 1)
          data = await state(page, {
            task: 2,
            denatured: true,
            choices: true,
            caption: 'Hvilket enzym starter proteinnedbrydningen? · vælg pepsin',
          });
        else if (t < 5)
          data = await state(page, {
            mode: 'secretion',
            age: t - 1,
            task: 4,
            denatured: true,
            select: !selectedInstance,
            caption: 'Pepsin er valgt · hovedceller udskiller pepsinogen; syre fremmer aktivering',
          });
        else if (t < 7)
          data = await state(page, {
            task: 4,
            denatured: true,
            caption: 'Hvad gør pepsin? · samme enzym forbliver synligt under funktionsspørgsmålet',
          });
        else
          data = await state(page, {
            mode: 'reaction',
            age: Math.min(7, t - 7),
            task: 0,
            denatured: true,
            caption:
              'Pepsin spalter peptidbindinger · kortere peptider dannes; enzymet forbliver intakt',
          });
        if (data.enzyme) {
          selectedInstance ??= data.enzyme.instance;
          assert.equal(data.enzyme.instance, selectedInstance);
          assert(data.enzyme.intact);
        }
        return data;
      },
    );
    const start = await page.evaluate(() => tract.stations.oesophagus.distance),
      end = await page.evaluate(() => tract.stations.duodenum.distance);
    await clip(
      page,
      'kamera-oesophagus-mave-duodenum',
      'Opret kamera gennem oesophagus, mavesæk og duodenum',
      8,
      65,
      async (f) => {
        const distance = start + (end - start) * f;
        const id = await page.evaluate((d) => {
          const p = tract.route.atDistance(d).part.id;
          return p === 'oesophagus' || p === 'oevre-oesophaguslukke'
            ? 'oesophagus'
            : p === 'cardia' || p === 'stomach'
              ? 'stomach'
              : 'duodenum';
        }, distance);
        const data = await state(page, {
          id,
          mode: 'journey',
          distance,
          worldTime: f * 8,
          caption: 'Kontinuerlig fødevej · stabil opadretning · ingen ændring af kanalens krumning',
        });
        assert.equal(data.builds, 1);
        assert(Math.abs(data.camera.rollDegrees) < 1e-6);
        return data;
      },
    );
    await page.evaluate(async () => {
      world.dispose();
      const old = document.querySelector('canvas'),
        canvas = document.createElement('canvas');
      old.replaceWith(canvas);
      const { buildChewingAnatomy } = await import('./digestion-chewing.js');
      window.chewing = buildChewingAnatomy();
      window.chewRenderer = new T.WebGLRenderer({ canvas, antialias: true });
      chewRenderer.setSize(innerWidth, innerHeight, false);
      window.chewScene = new T.Scene();
      chewScene.background = new T.Color(0x24101b);
      chewScene.add(new T.HemisphereLight(0xffe7d5, 0x291729, 2));
      const light = new T.PointLight(0xffe5dd, 60, 30);
      light.position.set(2, 4, 5);
      chewScene.add(light, chewing.group);
      window.chewCamera = new T.PerspectiveCamera(45, innerWidth / innerHeight, 0.05, 50);
      chewCamera.position.set(4, 1.8, 6);
      chewCamera.lookAt(0, -0.4, -1);
      document.querySelector('.review-caption').hidden = false;
      document.querySelector('.review-caption').textContent =
        'En hel tyggecyklus · geometrisk kontrol af tænder, tandkød og tunge set udefra';
    });
    await clip(
      page,
      'hel-tyggecyklus',
      'En hel tyggecyklus · samme geometri som i spillet, set udefra',
      12,
      29,
      async (f) =>
        page.evaluate(async (f) => {
          const { CHEW_RATE } = await import('./digestion-audio.js');
          const pose = chewing.update((f * 2 * Math.PI) / CHEW_RATE);
          chewRenderer.render(chewScene, chewCamera);
          return pose;
        }, f),
    );
    await page.close();
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(output, 'visual-checks.json'),
      JSON.stringify(
        {
          records,
          videos,
          errors,
          note: 'World screenshots/clips use the real modules, deterministic saved poses and a paused scene for comparison. Review captions are external annotations. Real automatic progression, choices and lifecycle are tested separately in the browser suites. The chewing close-up uses the exact shared mouth geometry without the enclosing wall.',
        },
        null,
        2,
      ) + '\n',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
