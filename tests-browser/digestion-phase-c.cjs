const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const base = process.env.APP_URL || 'http://127.0.0.1:3001/';
const output =
  process.env.DIGEST_SCREENSHOTS || path.resolve('docs/codex-fordoejelse/fase-c-screenshots');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const reuse = process.env.DIGEST_REUSE_CAPTURES === '1';
  const captures = reuse
      ? JSON.parse(fs.readFileSync(path.join(output, 'captures.json'), 'utf8')).filter(
          (c) => Number(c.name.slice(0, 2)) < 30,
        )
      : [],
    errors = [];
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      hasTouch: true,
      reducedMotion: 'no-preference',
    });
    page.setDefaultTimeout(120000);
    page.on('dialog', (d) => d.accept());
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && !m.text().includes('Failed to load resource'))
        errors.push(m.text());
    });
    await page.addInitScript(() => {
      const raf = requestAnimationFrame;
      window.__held = [];
      window.__holdFrames = false;
      window.requestAnimationFrame = (callback) =>
        raf((t) => {
          if (window.__holdFrames) window.__held.push(callback);
          else callback(t);
        });
      window.__resumeFrames = () => {
        window.__holdFrames = false;
        const pending = window.__held.splice(0);
        pending.forEach((cb) => raf(cb));
      };
    });
    await page.goto(base + '#/sti/fordoejelsens-vilde-rejse/digestion-stanley');
    await page.locator('[data-digest=start]').waitFor();

    async function fixture(character, index, mode, age = 0) {
      await page.goto('about:blank');
      await page.goto(base + '#/');
      await page.locator('#digestion-root').waitFor({ state: 'detached' });
      await page.evaluate(
        async ({ base, character, index, mode, age }) => {
          const { newDigestion } = await import(base + 'digestion-engine.js');
          const { ROUTE, BOSSES } = await import(base + 'digestion-data.js');
          const phase = ['absorb', 'transport'].includes(mode)
            ? 'absorption'
            : mode === 'bile'
              ? 'secretion'
              : mode;
          const product =
            index > 6
              ? 'residue'
              : index === 6
                ? (mode === 'reaction'
                    ? { stanley: 'maltose', poul: 'small-peptide', trine: 'lipid-products' }
                    : { stanley: 'glucose', poul: 'amino-acid', trine: 'lipid-products' })[
                    character
                  ]
                : character === 'stanley'
                  ? index >= 4
                    ? 'short-chain'
                    : 'polysaccharide'
                  : character === 'poul'
                    ? index >= 5
                      ? 'peptide'
                      : 'protein'
                    : 'triglyceride';
          const active = {
            ...newDigestion(character),
            index,
            phase,
            product,
            absorbed: index > 6,
            absorptionPassed: mode === 'transport',
            absorptionView: mode === 'transport' ? 'transport' : 'absorb',
            completed: ROUTE.filter((s) => s.index < index && BOSSES[character][s.id]).map(
              (s) => s.id,
            ),
          };
          if (mode === 'bile') {
            active.task = 1;
            active.secretionKind = 'bile';
          }
          if (age) active.animation = { stage: ROUTE[index].id, mode, age };
          const db = await new Promise((resolve, reject) => {
            const r = indexedDB.open('laeringsstier-v2');
            r.onsuccess = () => resolve(r.result);
            r.onerror = () => reject(r.error);
          });
          await new Promise((resolve, reject) => {
            const tx = db.transaction('records', 'readwrite'),
              store = tx.objectStore('records'),
              r = store.get('progress');
            r.onsuccess = () => {
              const all = r.result || {};
              all['fordoejelsens-vilde-rejse'] ??= { done: [], notes: {}, answers: {} };
              all['fordoejelsens-vilde-rejse'].digestion = {
                results: {},
                active,
                settings: { sound: false, motion: true, quality: 'auto', volume: 0.3 },
              };
              store.put(all, 'progress');
            };
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
          });
          db.close();
        },
        { base, character, index, mode, age },
      );
      await page.goto(
        base + '?phase-c=' + Date.now() + '#/sti/fordoejelsens-vilde-rejse/digestion-stanley',
      );
      await page.locator('[data-digest=resume]').click();
      const expected = ['absorb', 'transport'].includes(mode)
        ? mode
        : mode === 'route'
          ? 'travel'
          : mode;
      await page.waitForFunction(
        (expected) => document.querySelector('canvas')?.dataset.digestMode === expected,
        expected,
        { polling: 100 },
      );
      await page.waitForFunction(
        () => Number(document.querySelector('canvas').dataset.sceneAge) >= 0.2,
        null,
        { polling: 100 },
      );
      await page
        .locator('canvas')
        .evaluate((c) => Promise.all(c.getAnimations().map((a) => a.finished.catch(() => {}))));
      assert.equal(await page.locator('.digest-micro').count(), 0);
    }
    async function waitAge(age) {
      await page.waitForFunction(
        (age) => Number(document.querySelector('canvas').dataset.sceneAge) >= age,
        age,
        { polling: 100 },
      );
    }
    async function state() {
      return page.locator('canvas').evaluate((c) => ({
        stage: c.dataset.digestStage,
        mode: c.dataset.digestMode,
        age: Number(c.dataset.sceneAge),
        camera: JSON.parse(c.dataset.camera),
        motility: JSON.parse(c.dataset.motility || '{}'),
        epithelium: JSON.parse(c.dataset.epithelialState || '{}'),
        defecation: JSON.parse(c.dataset.defecation || '{}'),
        triangles: Number(c.dataset.triangles),
        drawCalls: Number(c.dataset.drawCalls),
        renderRatio: Number(c.dataset.renderRatio),
        villi: Number(c.dataset.villusCount),
      }));
    }
    async function capture(name, caption) {
      if (name.includes('slutskaerm'))
        await page.evaluate(
          () =>
            new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
        );
      await page.evaluate(() => (window.__holdFrames = true));
      const snapshot = await state();
      await page.screenshot({ path: path.join(output, name), timeout: 120000 });
      const viewport = page.viewportSize();
      captures.push({ name, caption, viewport, ...snapshot });
      await page.evaluate(() => window.__resumeFrames());
      fs.writeFileSync(
        path.join(output, 'captures.json'),
        JSON.stringify(captures, null, 2) + '\n',
      );
      console.log(
        'CAPTURE',
        name,
        JSON.stringify({
          age: snapshot.age,
          phase: snapshot.epithelium.phase,
          triangles: snapshot.triangles,
          drawCalls: snapshot.drawCalls,
        }),
      );
      return snapshot;
    }
    if (!reuse) {
      for (const mobile of [false, true]) {
        await page.setViewportSize(
          mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
        );
        const size = mobile ? 'mobil' : 'desktop';
        await fixture('stanley', 3, 'route');
        await waitAge(2);
        const first = await capture(
          `01-oesophagus-${size}-a.png`,
          'Peristaltisk kontraktion bag bolus i oesophagus.',
        );
        await waitAge(5);
        const second = await capture(
          `02-oesophagus-${size}-b.png`,
          'Kontraktionen er rykket frem; kameraet er uændret.',
        );
        assert.deepEqual(first.camera, second.camera);
        assert.ok(second.motility.weights[0] > first.motility.weights[0]);
        await fixture('poul', 4, 'route');
        await waitAge(8);
        await capture(
          `03-ventrikel-${size}-a.png`,
          'Lokal gastrisk bevægelse med antral transport og blanding.',
        );
        await waitAge(14);
        await capture(
          `04-ventrikel-${size}-b.png`,
          'Senere fase med distale kontraktioner og retropulsion.',
        );
        await fixture('trine', 8, 'route');
        await waitAge(1.7);
        await capture(
          `24-ileocoekalovergang-${size}.png`,
          'Kontrolleret passage gennem ileocøkalklappen til caecum.',
        );
        await fixture('stanley', 9, 'route');
        await waitAge(3);
        await capture(
          `25-colon-haustral-${size}-a.png`,
          'Lokale haustrale kontraktioner med en langsommere fremaddrivende bølge.',
        );
        await waitAge(8);
        await capture(
          `26-colon-haustral-${size}-b.png`,
          'Senere fase i colon; kameraet peger fortsat langs lumen.',
        );
        await fixture('stanley', 0, 'reaction');
        await waitAge(2.4);
        await capture(
          `05-stivelse-${size}-a.png`,
          'Spytamylase nærmer sig stivelseskæden; bindinger fremhæves.',
        );
        await waitAge(5.5);
        await capture(
          `06-stivelse-${size}-b.png`,
          'Spaltede bindinger og kortere sammenhængende kulhydratfragmenter.',
        );
        assert.ok(Number(await page.locator('canvas').getAttribute('data-cleaved-bonds')) > 0);
        await fixture('trine', 5, 'bile');
        await waitAge(2.5);
        await capture(
          `07-emulgering-${size}.png`,
          'Galde emulgerer fedtdråber uden at klippe esterbindinger.',
        );
        await fixture('trine', 5, 'reaction');
        await waitAge(5.5);
        await capture(
          `08-lipase-${size}.png`,
          'Lipase spalter de ydre esterbindinger: to frie fedtsyrer og et 2-monoglycerid.',
        );
        await fixture('trine', 6, 'absorb');
        await waitAge(2);
        const micelle = await capture(
          `09-micelle-${size}.png`,
          'Micellen leverer lipidprodukter ved børstesømmen og bliver i lumen.',
        );
        assert.equal(micelle.epithelium.micelleCrosses, false);
        await fixture('poul', 4, 'reaction');
        await waitAge(1);
        await capture(`10-protein-${size}-a.png`, 'Proteinet udfoldes i det sure ventrikelmiljø.');
        await waitAge(5.5);
        await capture(
          `11-protein-${size}-b.png`,
          'Pepsin har spaltet proteinet til kortere peptidfragmenter.',
        );
        await fixture('poul', 6, 'absorb');
        await waitAge(2);
        await capture(
          `12-peptidoptagelse-${size}-a.png`,
          'Aminosyrer samt di- og tripeptider bevæger sig ind i enterocytterne.',
        );
        await waitAge(5.5);
        const hydrolysis = await capture(
          `13-peptidoptagelse-${size}-b.png`,
          'De optagne små peptider hydrolyseres inde i epitelet.',
        );
        assert.equal(hydrolysis.epithelium.hydrolysed, true);
        assert.equal(hydrolysis.epithelium.enterocytes, 18);
        await fixture('stanley', 6, 'absorb');
        await waitAge(3.5);
        await capture(
          `14-glukoseoptagelse-${size}.png`,
          'Glukose passerer børstesømmen og enterocytterne i det lokale vævsudsnit.',
        );
        await fixture('stanley', 6, 'transport');
        await waitAge(6);
        const blood = await capture(
          `15-blodtransport-${size}.png`,
          'Glukose følger kapillærblod og portal transport mod leveren.',
        );
        assert.equal(blood.epithelium.destination, 'liver-via-portal-blood');
        await fixture('trine', 6, 'transport');
        await waitAge(1.1);
        await capture(
          `16-reesterificering-${size}.png`,
          'Triglycerider gendannes inde i enterocytterne før chylomikrontransport.',
        );
        await waitAge(5.3);
        const lymph = await capture(
          `17-lymfetransport-${size}.png`,
          'Chylomikronerne passerer til lactealet og følger lymfevejen.',
        );
        assert.ok(lymph.epithelium.chylomicrons >= 2);
        assert.equal(lymph.epithelium.compartment, 'lymph');
        await waitAge(10);
        await capture(
          `18-lymfe-til-blod-${size}.png`,
          'Lymfen føres til ductus thoracicus og venstre venevinkel, videre til systemisk blod.',
        );
        await fixture('stanley', 14, 'finale');
        await waitAge(1.5);
        await capture(
          `19-finalen-${size}-a.png`,
          'Rectum og begge analsfinktere før den ufordøjelige rest passerer.',
        );
        await waitAge(4.8);
        const impact = await capture(
          `20-finalen-${size}-b.png`,
          'Resten rammer toiletvandet oppefra; næringsstoffet er allerede absorberet.',
        );
        assert.ok(impact.defecation.camera[1] > impact.defecation.waterY);
        await page.locator('[data-digest=skip]').click();
        await page.getByRole('heading', { name: 'TILLYKKE!', exact: false }).waitFor();
        await capture(
          `21-slutskaerm-stanley-${size}.png`,
          'Stanleys afslutning: glukose til portalblod og lever.',
        );
        for (const character of ['trine', 'poul']) {
          await fixture(character, 14, 'finale', 5.3);
          await page.locator('[data-digest=skip]').click();
          await page.getByRole('heading', { name: 'TILLYKKE!', exact: false }).waitFor();
          const text = await page.locator('.digest-nutrient-ending').textContent();
          assert.match(text, character === 'trine' ? /venstre venevinkel/ : /tripeptider/);
          await capture(
            `22-slutskaerm-${character}-${size}.png`,
            character === 'trine'
              ? 'Trines afslutning: chylomikroner via lymfe til systemisk blod.'
              : 'Pouls afslutning: optagelse af aminosyrer/små peptider og portal transport.',
          );
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      }
    }
    // The shortest supported portrait and a rotated phone must leave the
    // teaching section, captions and controls usable without changing B poses.
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(viewport);
      const size = viewport.width === 320 ? 'lille-portrait' : 'landskab';
      for (const [character, index, mode, age, prefix, caption] of [
        [
          'stanley',
          6,
          'absorb',
          4,
          '30-epitel',
          'Epiteludsnittet på kort skærm med kompakt information og frie labels.',
        ],
        [
          'trine',
          6,
          'transport',
          7.6,
          '31-lymfe',
          'Lymfekar og transportvej på lille eller roteret skærm.',
        ],
        [
          'stanley',
          14,
          'finale',
          5,
          '32-finale',
          'Toiletfinalen med kamera over vandet og læsbare kontroller på kort skærm.',
        ],
      ]) {
        await fixture(character, index, mode, age);
        await capture(`${prefix}-${size}.png`, caption);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        const layout = await page.evaluate(() => {
          const r = (s) => document.querySelector(s).getBoundingClientRect();
          const info = r('.digest-learning'),
            panel = r('.digest-panel'),
            progress = r('.blood3d-bottom');
          return {
            separate: info.bottom <= panel.top,
            progress: progress.bottom <= info.top || progress.left >= info.right,
          };
        });
        assert.ok(layout.separate, JSON.stringify(layout));
        assert.ok(layout.progress, JSON.stringify(layout));
        if (mode === 'finale')
          assert.ok((await state()).defecation.camera[1] > (await state()).defecation.waterY);
      }
    }
    const videos = [];
    if (process.env.DIGEST_VIDEO !== '0') {
      await page.setViewportSize({ width: 1280, height: 800 });
      for (const [character, index, mode, seconds, name] of [
        ['stanley', 3, 'route', 9, 'peristaltik-oesophagus'],
        ['trine', 6, 'transport', 12.5, 'chylomikroner-lymfe'],
        ['stanley', 14, 'finale', 6, 'toiletfinale'],
      ]) {
        try {
          await fixture(character, index, mode);
          const dir = path.resolve('/workspace/work/fase-c-video', name);
          fs.mkdirSync(dir, { recursive: true });
          const session = await page.context().newCDPSession(page),
            frames = [];
          let acceptingFrames = true,
            streamError;
          const onFrame = async (event) => {
            if (!acceptingFrames) return;
            try {
              const file = path.join(dir, String(frames.length).padStart(5, '0') + '.jpg');
              fs.writeFileSync(file, Buffer.from(event.data, 'base64'));
              frames.push({ file, time: event.metadata.timestamp });
              await session.send('Page.screencastFrameAck', { sessionId: event.sessionId });
            } catch (error) {
              if (acceptingFrames) streamError = error;
            }
          };
          session.on('Page.screencastFrame', onFrame);
          await session.send('Page.startScreencast', {
            format: 'jpeg',
            quality: 85,
            maxWidth: 1280,
            maxHeight: 800,
            everyNthFrame: 1,
          });
          await page.waitForTimeout(seconds * 1000);
          acceptingFrames = false;
          await session.send('Page.stopScreencast');
          session.off('Page.screencastFrame', onFrame);
          await session.detach();
          if (streamError) throw streamError;
          assert.ok(frames.length >= 4, 'too few real browser frames');
          const lines = [];
          frames.forEach((frame, i) => {
            lines.push(`file '${frame.file}'`);
            if (i < frames.length - 1)
              lines.push('duration ' + Math.max(0.001, frames[i + 1].time - frame.time));
          });
          const list = path.join(dir, 'frames.txt');
          fs.writeFileSync(list, lines.join('\n') + '\n');
          execFileSync(
            'ffmpeg',
            [
              '-y',
              '-f',
              'concat',
              '-safe',
              '0',
              '-i',
              list,
              '-fps_mode',
              'vfr',
              '-c:v',
              'libx264',
              '-pix_fmt',
              'yuv420p',
              '-movflags',
              '+faststart',
              path.join(output, name + '.mp4'),
            ],
            { stdio: 'pipe' },
          );
          videos.push({
            name: name + '.mp4',
            frames: frames.length,
            duration: frames.at(-1).time - frames[0].time,
            source: 'Actual Chromium Page.screencastFrame; variable frame timestamps retained.',
          });
          console.log('PASS recording', name, frames.length, 'actual frames');
        } catch (error) {
          videos.push({ name, error: error.message });
          console.log('VIDEO_UNAVAILABLE', name, error.message);
        }
      }
    }
    fs.writeFileSync(path.join(output, 'recordings.json'), JSON.stringify(videos, null, 2) + '\n');
    // Actual IndexedDB checkpoints, reloading the real app during each sequence.
    for (const [character, index, mode] of [
      ['stanley', 0, 'reaction'],
      ['stanley', 2, 'swallow'],
      ['trine', 5, 'bile'],
      ['poul', 6, 'absorb'],
      ['trine', 6, 'transport'],
      ['stanley', 14, 'finale'],
    ]) {
      await fixture(character, index, mode);
      await waitAge(2.5);
      await page.waitForTimeout(1100);
      const saved = await page.evaluate(async () => {
        const db = await new Promise((r) => {
          const q = indexedDB.open('laeringsstier-v2');
          q.onsuccess = () => r(q.result);
        });
        const data = await new Promise((r) => {
          const q = db.transaction('records').objectStore('records').get('progress');
          q.onsuccess = () => r(q.result);
        });
        db.close();
        return data['fordoejelsens-vilde-rejse'].digestion.active;
      });
      assert.ok(saved.animation.age >= 1.5, JSON.stringify(saved.animation));
      await page.reload();
      await page.locator('[data-digest=resume]').click();
      await page.waitForFunction(
        (mode) => document.querySelector('canvas')?.dataset.digestMode === mode,
        mode,
        { polling: 100 },
      );
      await waitAge(saved.animation.age);
      const resumed = await state();
      assert.ok(resumed.age >= saved.animation.age);
      assert.equal(resumed.stage, saved.animation.stage);
      console.log('PASS animation checkpoint', character, mode, saved.animation.age, resumed.age);
    }
    // Keyboard activation of the replay button preserves the stage and resets age.
    await fixture('stanley', 0, 'reaction', 5);
    await page.locator('[data-digest=replay]').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () => Number(document.querySelector('canvas').dataset.sceneAge) < 2,
      null,
      { polling: 100 },
    );
    const stable = await state();
    await page.waitForTimeout(650);
    assert.deepEqual((await state()).camera, stable.camera);
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'captures.json'), JSON.stringify(captures, null, 2) + '\n');
    console.log(
      'PASS phase C: actual desktop/mobile animations, blood/lymph separation, intracellular peptide hydrolysis, above-water finale, all three ending screens, replay and IndexedDB animation checkpoints; no shader/page errors.',
    );
    await page.close();
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
