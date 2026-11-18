const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { seed } = require('./digestion-fixtures.cjs');
const base = process.env.APP_URL || 'http://127.0.0.1:3001/sygepleje-laeringsstier/';
const output = process.env.V2_OUTPUT || path.resolve('docs/codex-fordoejelse/forbedringer-v2');
const frames = fs.mkdtempSync(path.join(os.tmpdir(), 'digestion-v2-gastric-'));
fs.mkdirSync(output, { recursive: true });
fs.mkdirSync(frames, { recursive: true });
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.setDefaultTimeout(120000);
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text()); });
    await seed(page, base, { character: 'poul', index: 4, phase: 'boss', mode: 'boss', age: 15, motion: true });
    await page.waitForFunction(() => Number(document.querySelector('canvas').dataset.sceneAge) >= 15.2);
    await page.screenshot({ path: path.join(output, 'mave-infoboks-desktop.png') });
    // Actual game, opposite look direction from the same camera position.
    await page.mouse.move(100, 480); await page.mouse.down();
    await page.mouse.move(885, 480, { steps: 8 }); await page.mouse.up();
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(output, 'mave-indvendigt-modsat.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await seed(page, base, { character: 'trine', index: 4, phase: 'route', mode: 'travel', age: 15, motion: true });
    await page.waitForFunction(() => Number(document.querySelector('canvas').dataset.sceneAge) >= 15.2);
    await page.screenshot({ path: path.join(output, 'mave-infoboks-mobil.png') });
    await page.goto(base + '#/'); await page.locator('h1').first().waitFor();
    const moduleBase = await page.locator('script[type=module]').evaluate(s => new URL('.', s.src).href);
    await page.setViewportSize({ width: 1280, height: 800 });
    // The inspection uses the real production geometry, rugae, texture, motion
    // shader and tracers. Transparency and the outside cameras are only here.
    const html = `<!doctype html><html lang="da"><meta charset="utf-8"><style>
      *{box-sizing:border-box}body{margin:0;background:#1d111c;color:#f8e7d4;font:16px system-ui}
      header{height:90px;padding:12px 24px}h1{font:24px Georgia;margin:0 0 5px}p{margin:0;font-size:14px}
      #view{position:relative;width:1280px;height:640px}canvas{display:block;width:1280px;height:640px}
      #labels{position:absolute;inset:0;pointer-events:none}.label{position:absolute;background:#24121ad9;border:1px solid #d6b798;border-radius:5px;padding:2px 5px;font-size:12px;white-space:nowrap;transform:translate(-50%,-50%)}
      footer{height:70px;padding:8px 24px}strong{color:#ffd68f}.columns{display:flex;justify-content:space-around;margin-top:5px}
      </style><header><h1>Mavesækkens kontraktioner – to modsatte kameravinkler</h1><p>Modelkontrol med spillets geometri og shader. Gennemsigtig væg gør folder og indhold synlige.</p><div class=columns><b>Side 1</b><b>Side 2 · modsat kamera</b></div></header>
      <div id=view><canvas></canvas><div id=labels></div></div><footer><strong id=time></strong><p>Langsom proximal accommodation · kraftigere bølge mod antrum/pylorus · tilbagestrømning ved modstand.</p><p>Billedvis rendering til visuel vurdering. Videoens 10 FPS er afspilningshastighed, ikke en performancemåling.</p></footer>
      <script type=module>
       import * as T from ${JSON.stringify(moduleBase + 'three.module.min.js')};
       import {buildOrganSurface} from ${JSON.stringify(moduleBase + 'digestion-anatomy.js')};
       import {buildGastricFolds,gastricFrame} from ${JSON.stringify(moduleBase + 'digestion-gastric.js')};
       import {createMotility,motionParameters,motionScale,motionWeights,MOTILITY} from ${JSON.stringify(moduleBase + 'digestion-motility.js')};
       import {lumenFlow} from ${JSON.stringify(moduleBase + 'digestion-flow.js')};
       import {mucosaTexture} from ${JSON.stringify(moduleBase + 'digestion-secretions.js')};
       import {ROUTE} from ${JSON.stringify(moduleBase + 'digestion-data.js')};
       const renderer=new T.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true});
       renderer.setSize(1280,640,false);renderer.setPixelRatio(1);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
       const scene=new T.Scene();scene.background=new T.Color(0x24101b);
       scene.add(new T.HemisphereLight(0xffe1db,0x24132c,1.25));
       for(const z of [8,-21]){const light=new T.PointLight(0xffe4dc,45,40,1.4);light.position.set(1,3,z);scene.add(light);}
       const built=buildOrganSurface(ROUTE[4]),motion=createMotility('stomach',built),texture=mucosaTexture();
       const wallMaterial=new T.MeshStandardMaterial({color:0xa34a61,roughness:.45,side:T.DoubleSide,map:texture,bumpMap:texture,bumpScale:.055,transparent:true,opacity:.42,depthWrite:false});
       motion.material(wallMaterial);scene.add(new T.Mesh(built.geometry,wallMaterial));
       const folds=buildGastricFolds(),foldMaterial=new T.MeshStandardMaterial({color:0xcb7c8b,roughness:.63,side:T.DoubleSide});
       motion.geometry(folds);motion.material(foldMaterial);scene.add(new T.Mesh(folds,foldMaterial));
       const flow=lumenFlow('stomach',built);scene.add(flow.mesh);
       const gate=new T.Mesh(new T.TorusGeometry(.7,.17,10,32),new T.MeshStandardMaterial({color:0xd6979d,roughness:.63}));
       gate.position.set(4.5,-1.8,-6.8);gate.rotation.y=Math.PI/2;scene.add(gate);
       const cameras=[10,-23.6].map(z=>{const c=new T.PerspectiveCamera(40,1,.03,100);c.position.set(.4,.1,z);c.lookAt(.4,-1,-6.8);return c;});
       const points=[['Cardia',[-1.6,2.5,-3.8]],['Fundus',[-2,2,-7]],['Corpus',[-2,-.5,-9]],['Antrum',[3,-2,-8]],['Pylorus',[4.5,-1.8,-6.8]]];
       const labels=cameras.map((c,side)=>points.map(([name,xyz])=>{const d=document.createElement('span');d.className='label';d.textContent=name;document.querySelector('#labels').append(d);return {d,p:new T.Vector3(...xyz)};}));
       window.renderGastricPose=(time)=>{
        motion.update(time);flow.update(time);
        const phase=(time/20)%1;gate.scale.setScalar(.72+(phase>.88?(1-phase)/.12:0)*.28);
        renderer.setScissorTest(false);renderer.clear();renderer.setScissorTest(true);
        for(let i=0;i<2;i++){
         renderer.setViewport(i*640,0,640,640);renderer.setScissor(i*640,0,640,640);renderer.render(scene,cameras[i]);
         labels[i].forEach(({d,p})=>{const f=gastricFrame(p),q=motion.point(p,f.u,f.axis).project(cameras[i]);d.style.left=(i*640+(q.x+1)*320)+'px';d.style.top=((1-q.y)*320)+'px';});
        }
        document.querySelector('#time').textContent='Animationsfase: '+time.toFixed(1)+' s / 20 s';
        return {time,weights:motionWeights('stomach',time),proximalScale:motionScale(motionParameters('stomach',.1),motionWeights('stomach',time),MOTILITY.stomach.width),antralScale:motionScale(motionParameters('stomach',.8),motionWeights('stomach',time),MOTILITY.stomach.width),triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls};
       };
       window.renderGastricPose(0);window.__ready=true;
      </script></html>`;
    await page.route('**/*?v2-inspection', r => r.fulfill({ contentType: 'text/html', body: html }));
    await page.goto(base + '?v2-inspection'); await page.waitForFunction(() => window.__ready === true);
    const poses = [], keyframes = new Set([0, 50, 100, 150, 190]);
    for (let i = 0; i <= 200; i++) {
      poses.push(await page.evaluate(t => window.renderGastricPose(t), i / 10));
      const file = path.join(frames, String(i).padStart(4, '0') + '.png');
      await page.screenshot({ path: file });
      if (keyframes.has(i)) fs.copyFileSync(file, path.join(output, 'mave-to-sider-' + String(i / 10).padStart(2, '0') + 's.png'));
    }
    assert.deepEqual(errors, []);
    execFileSync('ffmpeg', ['-y', '-framerate', '10', '-i', path.join(frames, '%04d.png'), '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(output, 'mave-kontraktioner-to-sider.mp4')], { stdio: 'pipe' });
    fs.writeFileSync(path.join(output, 'gastric-poses.json'), JSON.stringify({ moduleBase, source: 'Real production meshes/shader; inspection-only transparency and two outside cameras; offline frame sampling, not measured FPS.', displayFps: 10, durationSeconds: poses.length / 10, poses, errors }, null, 2) + '\n');
    console.log('PASS actual stomach/info screenshots, opposite in-game look, 201 model poses from two cameras, shared wall/fold deformation and MP4; no shader/page errors');
  } finally {
    await browser.close();
    fs.rmSync(frames, { recursive: true, force: true });
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
