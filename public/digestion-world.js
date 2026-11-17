import { enzymeModel } from './digestion-enzyme-model.js';
import { enzymeIdentity } from './digestion-enzyme-identity.js';
import { renderBudget } from './digestion-performance.js';
import { chewingPose, chewBeat } from './digestion-audio.js';
import { absorptionPoint, ABSORPTION_ANCHORS } from './digestion-absorption.js';
import { addSecretions, mucosaTexture } from './digestion-secretions.js';
import { nutrientModel } from './digestion-molecules.js';
import {
  buildOrganSurface,
  organCurve,
  lumenRadius,
  peristalsis,
  stomachPoint as stomachPointLocal,
  toothPose,
} from './digestion-anatomy.js';
import { reactionState, relativeActivity } from './digestion-engine.js';
import * as T from './three.module.min.js';
import { CHARACTERS, ROUTE, PRODUCTS } from './digestion-data.js';
// One renderer, camera and animation loop for every nutrient and scale.
export function createDigestionWorld(canvas, onPhysiology = () => {}) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  const texture = mucosaTexture();
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(74, 1, 0.03, 180);
  scene.background = new T.Color(0x24101b);
  scene.fog = new T.FogExp2(0x24101b, 0.025);
  const ambient = new T.HemisphereLight(0xffd2b1, 0x24132c, 1.25);
  scene.add(ambient);
  const light = new T.PointLight(0xffc4a6, 32, 35, 1.4);
  scene.add(light);
  const rim = new T.PointLight(0x5dcad2, 18, 30, 1.5);
  rim.position.set(3, 1, -9);
  scene.add(rim);
  let root = new T.Group();
  scene.add(root);
  let stage,
    character = 'stanley',
    product = 'polysaccharide',
    mode = 'menu',
    actors = [],
    enzymes = [],
    teeth = [],
    villi = [],
    drops = [],
    moving = true,
    disposed = false,
    raf = 0,
    last = 0,
    time = 0,
    age = 0,
    ph = 6.8,
    targetPH = 6.8,
    paused = false,
    environment = null,
    envActors = [],
    envDrops = [],
    envTeeth = [],
    environmentKey = '',
    oldRoot = null,
    transitionAge = 0,
    cameraTarget = new T.Vector3(0, 0, 2),
    lookTarget = new T.Vector3(0, 0, -8),
    cameraLook = new T.Vector3(0, 0, -8),
    wall = null,
    wallBase = null,
    organPath = null,
    targets = [],
    envTargets = [],
    choiceTargets = [],
    hovered = -1,
    yaw = 0,
    pitch = 0,
    drag = null,
    cough = 0,
    secretions = null,
    soundBeats = new Map(),
    sceneSoundEvents = new Set();
  const budget = renderBudget(devicePixelRatio || 1);
  const resize = () => {
    const b = canvas.getBoundingClientRect();
    renderer.setSize(b.width, b.height, false);
    renderer.setPixelRatio(budget.ratio);
    camera.aspect = b.width / Math.max(1, b.height);
    camera.updateProjectionMatrix();
    wake();
  };
  const obs = new ResizeObserver(resize);
  obs.observe(canvas);
  function mesh(geometry, color, parent = root, roughness = 0.63) {
    const m = new T.Mesh(
      geometry,
      new T.MeshStandardMaterial({ color, roughness, side: T.DoubleSide }),
    );
    parent.add(m);
    return m;
  }
  function sphere(x, y, z, r, color, parent = root) {
    const m = mesh(new T.SphereGeometry(r, 16, 10), color, parent);
    m.position.set(x, y, z);
    return m;
  }
  function bond(a, b, color, parent = root, r = 0.055) {
    const av = new T.Vector3(...a),
      bv = new T.Vector3(...b),
      d = bv.clone().sub(av);
    const m = mesh(new T.CylinderGeometry(r, r, d.length(), 8), color, parent);
    m.position.copy(av).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    return m;
  }
  function molecule(id, parent = root, form = product) {
    const m = nutrientModel(id, form);
    parent.add(m);
    return m;
  }
  function enzyme(x, y, z, color, index) {
    const g = new T.Group();
    root.add(g);
    g.position.set(x, y, z);
    g.userData.choice = index;
    enzymes.push(g);
    return g;
  }
  function free(group) {
    group?.traverse((o) => {
      o.geometry?.dispose();
      if (o.isInstancedMesh) o.dispose();
      if (o.material)
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
    });
  }
  function disposeRoot(transition = false) {
    if (oldRoot) {
      scene.remove(oldRoot);
      free(oldRoot);
      oldRoot = null;
    }
    if (transition && moving && budget.ratio >= 1 && root.children.length) {
      oldRoot = root;
      transitionAge = 0;
    } else {
      scene.remove(root);
      free(root);
    }
    root = new T.Group();
    scene.add(root);
    actors = [];
    enzymes = [];
    teeth = [];
    drops = [];
    targets = [];
    environment = null;
    environmentKey = '';
    wall = null;
    wallBase = null;
    secretions = null;
  }
  function clearContent() {
    for (const child of [...root.children])
      if (child !== environment) {
        root.remove(child);
        free(child);
      }
    if (wall) {
      wall.material.transparent = false;
      wall.material.opacity = 1;
      wall.material.depthWrite = true;
    }
    actors = [...envActors];
    drops = [...envDrops];
    teeth = [...envTeeth];
    enzymes = [];
    targets = [...envTargets];
  }
  function tag(object, target) {
    object.userData.target = target;
    targets.push(object);
    return object;
  }
  function opening(x, y, z, r, target, color = 0x3a1724) {
    const group = new T.Group();
    root.add(group);
    const lip = mesh(new T.TorusGeometry(r, 0.12, 10, 36), 0xba7787, group);
    const hole = mesh(new T.CircleGeometry(r, 36), color, group);
    hole.position.z = -0.04;
    if (!['mouth', 'nose'].includes(target)) {
      hole.material.transparent = true;
      hole.material.opacity = 0.22;
      hole.material.depthWrite = false;
    }
    group.position.set(x, y, z);
    tag(lip, target);
    tag(hole, target);
    return group;
  }
  function face() {
    const head = sphere(0, 0.2, -3, 2.35, 0xc89c83);
    head.scale.set(0.82, 1.25, 0.66);
    for (const side of [-1, 1]) {
      const ear = sphere(side * 1.85, 0.15, -3, 0.42, 0xc3927e);
      ear.scale.set(0.45, 1, 0.65);
      const eye = sphere(side * 0.65, 0.9, -1.6, 0.25, 0xf2e8df);
      eye.scale.y = 0.55;
      sphere(side * 0.65, 0.9, -1.39, 0.1, 0x493528);
    }
    const nose = sphere(0, 0.35, -1.15, 0.4, 0xd6ab92);
    nose.scale.set(0.65, 1.1, 1.05);
    tag(nose, 'nose');
    for (const x of [-0.16, 0.16]) {
      const nostril = opening(x, 0.12, -0.86, 0.12, 'nose', 0x20161a);
      nostril.scale.y = 0.55;
    }
    const mouth = opening(0, -0.75, -1.1, 0.72, 'mouth', 0x27121b);
    mouth.scale.y = 0.48;
    const chin = sphere(0, -1.5, -1.6, 0.55, 0xc89c83);
    chin.scale.y = 0.7;
    for (let i = 0; i < 5; i++) {
      const food = sphere((i - 2) * 0.16, -0.65, 2, 0.15, 0xc7a46a);
      actors.push({ object: food, type: 'face-food', i });
    }
  }
  function lumen(s) {
    canvas.dataset.environmentBuilds = String(Number(canvas.dataset.environmentBuilds || 0) + 1);
    const stomach = s.id === 'stomach',
      colon = [
        'caecum',
        'ascending',
        'transverse',
        'descending',
        'sigmoid',
        'rectum',
        'anus',
      ].includes(s.id),
      small = ['duodenum', 'jejunum', 'ileum'].includes(s.id),
      mouth = s.id === 'mouth';
    const built = buildOrganSurface(s);
    organPath = built.path;
    wall = mesh(built.geometry, stomach ? 0xa34a61 : colon ? 0x946f79 : 0xb96f72);
    tag(wall, 'inspect');
    wall.material.side = T.DoubleSide;
    wall.material.roughness = 0.45;
    if (texture) {
      wall.material.map = texture;
      wall.material.bumpMap = texture;
      wall.material.bumpScale = 0.055;
    }
    wallBase = wall.geometry.attributes.position.array.slice();
    canvas.dataset.organShape = built.geometry.userData.kind;
    if (stomach && character === 'stanley') {
      const amylase = mesh(new T.TorusKnotGeometry(0.22, 0.06, 32, 7), 0x65d6ec);
      amylase.position.set(-0.6, 0.3, -6.5);
      amylase.material.transparent = true;
      actors.push({ object: amylase, type: 'amylase-inhibition' });
    }
    if (stomach) {
      for (let i = 0; i < 16; i++) {
        const a = i / 16;
        const points = Array.from({ length: 24 }, (_, j) => {
          const p = stomachPointLocal(0.14 + (j / 24) * 0.73, a);
          p.multiplyScalar(0.98);
          return p;
        });
        mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points), 40, 0.075, 6, false), 0xcb7c8b);
      }
      const outlet = mesh(new T.TorusGeometry(0.7, 0.17, 10, 32), 0xd6979d);
      outlet.position.set(4.5, -1.8, -6.8);
      outlet.rotation.y = Math.PI / 2;
      const liquid = mesh(new T.CircleGeometry(5, 48), 0x9e9146);
      liquid.rotation.x = -Math.PI / 2;
      liquid.position.set(0.5, -2.8, -6.8);
      liquid.material.transparent = true;
      liquid.material.opacity = 0.45;
    }
    if (small) {
      const count = s.id === 'ileum' ? 50 : 180;
      const instance = new T.InstancedMesh(
        new T.LatheGeometry(
          [
            new T.Vector2(0, 0),
            new T.Vector2(0.075, 0.04),
            new T.Vector2(0.1, 0.24),
            new T.Vector2(0.07, 0.48),
            new T.Vector2(0, 0.63),
          ],
          8,
        ),
        new T.MeshStandardMaterial({ color: 0xe8a18f, roughness: 0.65 }),
        count,
      );
      const dummy = new T.Object3D();
      for (let i = 0; i < count; i++) {
        const a = i * 2.399,
          z = -2 - (i % 30) * 0.55;
        const u = ((i % 30) / 30) * 0.65 + 0.15,
          c = built.path.getPointAt(u),
          t = built.path.getTangentAt(u),
          n = new T.Vector3(0, 1, 0).cross(t).normalize(),
          bin = t.clone().cross(n).normalize();
        dummy.position
          .copy(c)
          .addScaledVector(n, Math.cos(a) * 2.3)
          .addScaledVector(bin, Math.sin(a) * 2.3);
        dummy.scale.setScalar(s.id === 'ileum' ? 0.65 : 1);
        dummy.quaternion.setFromUnitVectors(
          new T.Vector3(0, 1, 0),
          new T.Vector3(-Math.cos(a), -Math.sin(a), 0),
        );
        dummy.updateMatrix();
        instance.setMatrixAt(i, dummy.matrix);
      }
      root.add(instance);
    }
    if (mouth) {
      const tongue = sphere(0, -2, -2, 1.4, 0xd46b80);
      tongue.scale.set(1.8, 0.35, 2.8);
      actors.push({ object: tongue, type: 'tongue' });
      for (let i = 0; i < 32; i++) {
        const j = i % 16,
          molar = j < 4 || j > 11,
          canine = j === 4 || j === 11;
        const tooth = mesh(new T.SphereGeometry(1, 16, 12), 0xf5e4c6);
        tooth.scale.set(
          molar ? 0.31 : canine ? 0.2 : 0.24,
          molar ? 0.32 : canine ? 0.5 : 0.37,
          molar ? 0.32 : 0.13,
        );
        if (molar)
          for (let k = 0; k < 3; k++) sphere((k - 1) * 0.24, 0.65, 0, 0.22, 0xf5e4c6, tooth);
        const pose = toothPose(i);
        tooth.position.fromArray(pose.position);
        tooth.rotation.z = pose.rotation;
        tooth.userData.crownDirection = pose.crownDirection;
        teeth.push(tooth);
      }
      for (const y of [-2, 2]) {
        const arch = new T.CatmullRomCurve3(
          Array.from(
            { length: 20 },
            (_, i) =>
              new T.Vector3(
                Math.cos((i / 19) * Math.PI) * 2.35,
                y,
                -2.8 + Math.sin((i / 19) * Math.PI) * 3.3,
              ),
          ),
        );
        mesh(new T.TubeGeometry(arch, 32, 0.22, 8, false), 0xae526b);
      }
      const palate = sphere(0, 2.8, -1, 1.4, 0xb96a7c);
      palate.scale.set(2, 0.24, 2.5);
      const lips = mesh(new T.TorusGeometry(3.15, 0.4, 12, 48), 0x933858);
      lips.position.z = 3;
      lips.scale.y = 0.7;
    }
    if (['cardia', 'pylorus', 'ileocaecal', 'anal', 'anus'].includes(s.id)) {
      const ring = mesh(new T.TorusGeometry(1.8, 0.55, 16, 48), 0xc8778d);
      ring.position.z = -7;
      actors.push({ object: ring, type: 'sphincter' });
    }
    if (['pharynx', 'epiglottis'].includes(s.id)) {
      const trachea = opening(0, -1, -4, 0.8, 'trachea');
      actors.push({ object: trachea, type: 'larynx' });
      for (const side of [-1, 1]) {
        const fold = sphere(side * 0.25, 0, -0.3, 0.2, 0xe6c5cf, trachea);
        fold.scale.set(0.35, 2.6, 0.35);
        actors.push({ object: fold, type: 'vocal-fold', side });
      }
      for (let i = 0; i < 9; i++) {
        const ring = mesh(new T.TorusGeometry(0.8, 0.08, 8, 30, Math.PI * 1.6), 0xdfc6b0, trachea);
        ring.position.set(0, -i * 0.05, -i * 0.32);
        tag(ring, 'trachea');
      }
      const esophagus = opening(0, 1, -6, 0.7, 'oesophagus');
      esophagus.scale.y = 0.7;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const f = mesh(new T.CapsuleGeometry(0.045, 0.55, 3, 6), 0xcf8c98);
        f.position.set(Math.cos(a) * 0.55, 1 + Math.sin(a) * 0.3, -6.1);
        f.rotation.x = Math.PI / 2;
        tag(f, 'oesophagus');
      }
      const epi = sphere(0, -0.1, -3.9, 0.7, 0xbc718c);
      epi.scale.set(0.7, 0.13, 1);
      if (s.id === 'pharynx') tag(epi, 'epiglottis');
      actors.push({ object: epi, type: 'epiglottis' });
    }
    if (s.id === 'ileum') {
      for (let i = 0; i < 6; i++) {
        const p = sphere(2.3, -0.7, -4 - i * 1.5, 0.32, 0xd8ac96);
        p.scale.set(0.14, 0.6, 1.6);
      }
    }
    if (s.id === 'caecum') {
      const curve = new T.CatmullRomCurve3([
        new T.Vector3(-1.4, -1, -5),
        new T.Vector3(-2.3, -1.6, -5.5),
        new T.Vector3(-2.5, -2.5, -6),
        new T.Vector3(-1.9, -2.7, -6.2),
      ]);
      const appendix = mesh(new T.TubeGeometry(curve, 28, 0.24, 12, false), 0xa96f83);
      tag(appendix, 'appendix');
      appendix.userData.pickPosition = new T.Vector3(-1.9, -2.7, -6.2);
      tag(sphere(-1.9, -2.7, -6.2, 0.24, 0xa96f83), 'appendix');
      const hit = sphere(-1.9, -2.7, -6.2, 0.42, 0xa96f83);
      hit.material.transparent = true;
      hit.material.opacity = 0;
      tag(hit, 'appendix');
      opening(0, 1.6, -5, 1.05, 'ascending');
    }
    if (!['pharynx', 'epiglottis', 'caecum'].includes(s.id)) {
      const center =
        s.id === 'stomach' ? new T.Vector3(4.5, -1.8, -6.8) : built.path.getPointAt(0.32);
      const exit = opening(
        center.x,
        center.y,
        center.z,
        s.id === 'stomach' ? 0.65 : 1.25,
        ROUTE[s.index + 1]?.id || 'anus',
      );
      if (s.id === 'stomach') exit.rotation.y = Math.PI / 3;
      else
        exit.quaternion.setFromUnitVectors(
          new T.Vector3(0, 0, 1),
          built.path.getTangentAt(0.32).negate(),
        );
    }
    secretions = addSecretions(root, s, character);
    for (let i = 0; i < 26; i++) {
      const m = sphere(
        Math.sin(i * 9) * 2,
        Math.cos(i * 4) * 2,
        -2 - (i % 12) * 1.4,
        colon ? 0.09 : 0.045,
        colon ? 0x80b9a1 : 0xf0c7b7,
      );
      if (colon) m.scale.y = 2.5;
      drops.push(m);
    }
  }
  function absorptionInLumen() {
    // The original wall, folds, villi, camera and organ path remain in place.
    // A translucent teaching cutaway reveals vessels beyond the epithelium.
    if (wall) {
      wall.material.transparent = true;
      wall.material.opacity = 0.24;
      wall.material.depthWrite = false;
    }
    const barrier = mesh(new T.BoxGeometry(0.32, 1.9, 0.8), 0xdfa6b3);
    barrier.position.set(0.84, 0.5, -5.13);
    barrier.material.transparent = true;
    barrier.material.opacity = 0.4;
    barrier.material.depthWrite = false;
    for (let i = 0; i < 7; i++) {
      const v = mesh(new T.CapsuleGeometry(0.045, 0.25, 3, 7), 0xf5c7a6);
      v.rotation.z = -Math.PI / 2;
      v.position.set(0.6, -0.15 + i * 0.22, -4.85);
    }
    for (const [x, z, c] of [
      [1.38, -5.55, 0xcf5369],
      [1.75, -5.4, 0x8bd898],
    ]) {
      const curve = new T.CatmullRomCurve3([
        new T.Vector3(x, -1.3, z),
        new T.Vector3(x, 0, z),
        new T.Vector3(x - 0.15, 1.3, z),
      ]);
      mesh(new T.TubeGeometry(curve, 24, x > 1.5 ? 0.1 : 0.07, 8, false), c);
    }
    for (const [x, y, z, name] of [
      [0.6, 0.7, -4.8, character === 'stanley' ? 'SGLT1' : 'Optagelse'],
      [1.12, 0.1, -5.25, character === 'stanley' ? 'GLUT2' : 'Videre transport'],
    ]) {
      const gateway = mesh(new T.TorusGeometry(0.11, 0.035, 8, 18), 0x65c5df);
      gateway.position.set(x, y, z);
      gateway.rotation.y = Math.PI / 3;
      gateway.name = name;
    }
    if (character === 'trine') {
      const micelle = new T.Group();
      root.add(micelle);
      micelle.position.set(-0.55, 0.9, -4.7);
      for (let i = 0; i < 12; i++)
        sphere(
          Math.cos((i * Math.PI) / 6) * 0.23,
          Math.sin((i * Math.PI) / 6) * 0.23,
          0,
          0.04,
          0xc7ce69,
          micelle,
        );
      const tg = molecule('trine', root, 'triglyceride');
      tg.position.fromArray(ABSORPTION_ANCHORS.cell);
      tg.scale.setScalar(0.16);
      actors.push({ object: tg, type: 'reesterified' });
      const ch = molecule('trine', root, 'triglyceride');
      ch.scale.setScalar(0.14);
      const coat = sphere(0, 0, 0, 0.24, 0xf5dc8c);
      coat.material.transparent = true;
      coat.material.opacity = 0.7;
      coat.material.depthWrite = false;
      actors.push({ object: ch, type: 'chylomicron' }, { object: coat, type: 'chylomicron' });
    }
    for (let i = 0; i < (character === 'trine' ? 6 : 2); i++) {
      const form =
        character === 'stanley'
          ? 'glucose'
          : character === 'poul'
            ? 'amino-acid'
            : 'lipid-products';
      const m = molecule(character, root, form);
      m.scale.setScalar(character === 'trine' ? 0.13 : 0.65);
      actors.push({ object: m, type: 'absorb', i });
      if (character !== 'trine') {
        const ion = sphere(0, 0, 0, 0.035, 0x7fc9ef);
        actors.push({ object: ion, type: 'sodium', i });
      }
    }
    canvas.dataset.absorptionSpace = 'intestinal-lumen';
    canvas.dataset.epithelialBarrier = 'true';
  }
  function labelChoices(labels) {
    enzymes.forEach((e, i) => {
      const identity = enzymeIdentity(labels[i] || '');
      e.visible = Boolean(identity);
      if (!identity) return;
      e.position.x = labels.length === 2 ? (i - 0.5) * 2.3 : (i - 1) * 1.7;
      if (e.userData.enzymeId === identity.id) return;
      for (const child of [...e.children]) { free(child); e.remove(child); }
      const model = enzymeModel(labels[i]);
      e.add(model);
      e.userData.enzymeId = identity.id;
      e.userData.kind = identity.id === 'bile' ? 'bile-salts' : 'protein-enzyme';
    });
    canvas.dataset.enzymeIdentities = JSON.stringify(enzymes.filter(e => e.visible).map(e => e.userData.enzymeId));
    wake();
  }
  function setScene(s, id, nextMode = 'travel', residue = false, nextProduct) {
    if (['villus', 'cell', 'membrane'].includes(nextMode)) nextMode = 'absorb';
    const absorbing = ['absorb', 'transport'].includes(nextMode);
    const isFace = ['entry', 'face-intro'].includes(nextMode);
    const organ = !isFace && !['menu', 'finale'].includes(nextMode);
    const reuse = organ && environment && environmentKey === s.id + ':' + id + ':' + residue;
    if (reuse) clearContent();
    else disposeRoot(true);
    stage = s;
    character = id;
    product =
      nextProduct || { stanley: 'polysaccharide', trine: 'triglyceride', poul: 'protein' }[id];
    mode = nextMode;
    age = 0;
    sceneSoundEvents.clear();
    targetPH = s.ph || ph;
    canvas.dataset.scale = 'centimeter';
    canvas.dataset.absorptionSpace = absorbing ? 'intestinal-lumen' : '';
    if (!reuse) {
      yaw = 0;
      pitch = 0;
    }
    cameraTarget.set(0, 0, 2);
    lookTarget.set(0, 0, -8);
    if (s.id === 'stomach') {
      cameraTarget.set(0, 0, -3.2);
      lookTarget.set(1, -0.4, -7);
    }
    scene.background.set(0x24101b);
    scene.fog.color.set(0x24101b);
    if (isFace) {
      face();
      cameraTarget.set(0, 0, 5.5);
      lookTarget.set(0, 0, -2);
    } else if (mode === 'menu') {
      const m = molecule(id);
      m.position.set(0, 3.2, -5);
      m.scale.setScalar(0.8);
      actors.push({ object: m, type: 'molecule', i: 0 });
    } else if (mode === 'finale') {
      scene.background.set(0xf5e9cd);
      scene.fog.color.set(0xf5e9cd);
      const bowl = mesh(new T.TorusGeometry(2, 0.55, 20, 64), 0xf7f7ef);
      bowl.rotation.x = -Math.PI / 2;
      bowl.position.set(0, -2, -6);
      const water = mesh(new T.CircleGeometry(1.7, 48), 0x61c9de);
      water.rotation.x = -Math.PI / 2;
      water.position.set(0, -2.3, -6);
      actors.push({ object: water, type: 'water' });
      for (let i = 0; i < 4; i++) {
        const ring = mesh(new T.TorusGeometry(0.3, 0.025, 6, 40), 0xd7f8ff);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(0, -2.27, -6);
        actors.push({ object: ring, type: 'ripple', i });
      }
    } else {
      if (!reuse) {
        environment = new T.Group();
        const main = root;
        root = environment;
        lumen(s);
        root = main;
        root.add(environment);
        environmentKey = s.id + ':' + id + ':' + residue;
        envActors = [...actors];
        envDrops = [...drops];
        envTeeth = [...teeth];
        envTargets = [...targets];
      }
      if (absorbing) {
        absorptionInLumen();
      } else {
        if (mode === 'intro')
          for (let i = 0; i < 8; i++) {
            const food = sphere(Math.sin(i) * 0.4, Math.cos(i) * 0.3, -3, 0.25, 0xc39e67);
            actors.push({ object: food, type: 'food', i });
          }
        if (['caecum', 'ascending', 'transverse', 'descending', 'sigmoid', 'rectum'].includes(s.id))
          for (let i = 0; i < 8; i++) {
            const water = sphere(
              Math.cos(i) * 1.5,
              Math.sin(i) * 1.5,
              -3 - i * 0.5,
              0.06,
              0x81c8ee,
            );
            actors.push({ object: water, type: 'water-out', i });
          }
        const mol = residue ? new T.Group() : molecule(id);
        if (residue) {
          root.add(mol);
          for (let i = 0; i < 8; i++)
            bond(
              [-0.7 + i * 0.2, Math.sin(i) * 0.2, 0],
              [-0.5 + i * 0.2, Math.sin(i + 1) * 0.2, 0],
              0xc9b58c,
              mol,
              0.07,
            );
        }
        mol.position.set(0, s.id === 'stomach' ? -0.25 : 1.2, s.id === 'stomach' ? -6.3 : -4.5);
        mol.scale.setScalar(0.65);
        actors.push({ object: mol, type: 'substrate' });
        const chemical = !(
          (s.id === 'mouth' && id !== 'stanley') ||
          (s.id === 'stomach' && id === 'stanley')
        );
        if (['reaction', 'secretion', 'brush-border'].includes(mode) && chemical)
          for (let i = 0; i < 8; i++) {
            const w = sphere((i - 4) * 0.3, -0.3, -5, 0.06, 0x80cbe0);
            drops.push(w);
          }
        if (mode === 'bile') {
          for (let i = 0; i < 8; i++) {
            const droplet = sphere(
              ((i % 4) - 1.5) * 0.7,
              0.7 + Math.floor(i / 4) * 0.7,
              -5,
              0.32,
              0xd6c36e,
            );
            actors.push({ object: droplet, type: 'fat-drop', i });
          }
        }
        if (s.id === 'duodenum')
          for (let i = 0; i < 32; i++)
            sphere(2 - i * 0.13, 0.7 - i * 0.03, -6 - i * 0.1, 0.07, i % 2 ? 0xb3cc66 : 0xf3d3ac);
        if (mode === 'boss')
          for (let i = 0; i < 3; i++)
            enzyme((i - 1) * 1.7, 0.8, -6, [0x87d4b6, 0xb29be8, 0xf6b955][i], i);
        if (['reaction', 'secretion', 'brush-border'].includes(mode) && chemical) {
          enzyme(0, 0.8, -6, CHARACTERS[id].color, 0);
          labelChoices([
            id === 'stanley'
              ? s.id === 'jejunum'
                ? 'maltase'
                : s.id === 'mouth' ? 'spytamylase' : 'bugspytamylase'
              : id === 'trine'
                ? 'lipase'
                : s.id === 'stomach'
                  ? 'pepsin'
                  : s.id === 'jejunum'
                    ? 'peptidaser'
                    : 'trypsin',
          ]);
        }
      }
    }
    if (s.id === 'stomach') enzymes.forEach((e) => e.scale.setScalar(0.65));
    if (!moving && mode === 'reaction') age = 5;
    canvas.dataset.hypotheses = JSON.stringify(
      enzymes.filter((e) => e.visible).map((e) => e.userData.kind || 'protein-enzyme'),
    );
    canvas.dataset.digestStage = s.id;
    canvas.dataset.digestMode = mode;
    canvas.dataset.molecularForm = product;
    canvas.dataset.absorptionDestination = character === 'trine' ? 'lymph' : 'blood';
    wake();
  }
  function frame(now) {
    raf = 0;
    if (disposed) return;
    const elapsed = Math.max(0, (now - last) / 1000 || 0.016);
    const dt = Math.min(0.08, elapsed);
    last = now;
    if (!paused) {
      age += elapsed;
      if (moving) time += dt;
    }
    secretions?.update(moving ? time : 2, ph);
    ph += (targetPH - ph) * Math.min(1, dt * 1.6);
    // A bounded transition settles completely. Physiological animation continues
    // independently; no organ-path travel is applied while waiting for an answer.
    const settle = !moving || age >= 1.1;
    if (settle) {
      camera.position.copy(cameraTarget);
      cameraLook.copy(lookTarget);
    } else {
      camera.position.lerp(cameraTarget, Math.min(1, dt * 7));
      cameraLook.lerp(lookTarget, Math.min(1, dt * 7));
    }
    camera.lookAt(cameraLook);
    camera.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(pitch, yaw, 0, 'YXZ')));
    if (cough > 0) {
      cough -= dt;
      rim.intensity = 18 + Math.sin(cough * 20) * 3;
    }
    camera.near = 0.03;
    camera.updateProjectionMatrix();
    if (mode === 'intro' && moving) {
      const f = Math.min(1, age / 10);
      camera.position.z = 5 - f * 3;
      camera.position.y = Math.sin(Math.min(age, 10) * 1.3) * 0.12 * (1 - f);
    }
    light.intensity = 14;
    light.position.copy(camera.position);
    light.position.y = 1.2;
    const emitOnce = (key, event) => {
      if (!sceneSoundEvents.has(key)) {
        sceneSoundEvents.add(key);
        onPhysiology(event);
      }
    };
    const beat = (key, value, event) => {
      if (soundBeats.get(key) !== value) {
        soundBeats.set(key, value);
        if (value >= 0) onPhysiology(event);
      }
    };
    if (!paused && moving) {
      if (stage.id === 'mouth' && !['menu', 'entry', 'face-intro'].includes(mode))
        beat('chew', chewBeat(time), 'chew');
      if (stage.id === 'oesophagus' && age < 9)
        beat('oesophagus', Math.floor(age / 2.5), 'peristalsis');
      if (stage.id === 'stomach') beat('stomach', Math.floor(time / 7.3), 'rumble');
      if (['duodenum', 'jejunum', 'ileum'].includes(stage.id))
        beat('wet', Math.floor(time / 6.7), stage.id === 'duodenum' ? 'secretion' : 'peristalsis');
      if (
        ['caecum', 'ascending', 'transverse', 'descending', 'sigmoid', 'rectum'].includes(stage.id)
      )
        beat('colon', Math.floor(time / 8.7), 'bubble');
      if (mode === 'reaction' && age >= 2) emitOnce('binding', 'binding');
      if (mode === 'reaction' && age >= 3.2) emitOnce('cleave', 'cleave');
      if (mode === 'absorb' && age >= 3) emitOnce('absorption', 'absorption');
      if (mode === 'finale' && age >= 2.7) emitOnce('splash', 'splash');
    }
    canvas.dataset.chewingPhase = String(chewingPose(time));
    canvas.dataset.chewBeat = String(chewBeat(time));
    for (const [i, m] of teeth.entries())
      m.position.y = i < 16 ? 1.75 : -1.75 + (moving ? chewingPose(time) * 0.45 : 0);
    for (const [i, m] of drops.entries()) {
      if (moving) m.position.z += dt * 0.5;
      if (m.position.z > 2) m.position.z = -18;
    }
    for (const a of actors) {
      const m = a.object;
      if (a.type === 'fat-drop') {
        const f = moving ? Math.min(1, age / 3) : 1;
        m.scale.setScalar(1 - f * 0.45);
        m.position.x = ((a.i % 4) - 1.5) * (0.2 + f * 0.7);
      }
      if (a.type === 'substrate' && stage.id === 'oesophagus' && organPath && moving)
        m.position.copy(organPath.getPointAt(Math.min(0.65, 0.12 + age * 0.055)));
      if (a.type === 'molecule' || a.type === 'substrate') {
        m.rotation.y = moving ? Math.sin(time * 0.5 + (a.i || 0)) * 0.4 : 0;
        if (
          mode === 'secretion' &&
          character === 'poul' &&
          stage.id === 'stomach' &&
          m.userData.update
        )
          m.userData.update(Math.min(1.8, age), 'stomach');
        if (mode === 'reaction' && m.userData.update) {
          if (stage.id === 'jejunum') {
            const f = moving ? Math.min(1, age / 1.2) : 1;
            m.position.set(0.6 * f, 1.2 - 0.5 * f, -4.5 - 0.3 * f);
          }
          const state = m.userData.update(moving ? age : 7, stage.id);
          canvas.dataset.reactionPhase = state.phase;
          canvas.dataset.cleavedBonds = String(m.userData.links.filter((l) => !l.visible).length);
        }
      }
      if (a.type === 'larynx') {
        const f =
          mode === 'swallow' || stage.id === 'epiglottis'
            ? moving
              ? Math.min(1, age / 1.2)
              : 1
            : 0;
        m.position.y = -1 + f * 0.4;
        m.scale.y = 1 - f * 0.35;
      }
      if (a.type === 'vocal-fold') {
        const f =
          mode === 'swallow' || stage.id === 'epiglottis'
            ? moving
              ? Math.min(1, age / 1.2)
              : 1
            : 0;
        m.position.x = a.side * (0.25 - f * 0.22);
      }
      if (a.type === 'amylase-inhibition') {
        const activity = relativeActivity(ph, 'amylase');
        m.material.opacity = 0.2 + 0.8 * activity;
        m.rotation.y = time * 0.3 * activity;
      }
      if (a.type === 'epiglottis')
        m.rotation.x =
          mode === 'swallow' || stage.id === 'epiglottis'
            ? (moving ? Math.min(1, age / 1.2) : 1) * 1.1
            : -0.4;
      if (a.type === 'face-food') {
        m.position.z = mode === 'face-intro' ? 2 - Math.min(1, age / 3) * 2.4 : 1.2;
        m.position.x = (a.i - 2) * 0.16;
      }
      if (a.type === 'tongue' && moving)
        m.position.z =
          mode === 'intro' ? -2 - Math.min(1, age / 10) * 0.45 : -2 + Math.sin(time * 1.2) * 0.15;
      if (a.type === 'food') {
        const f = moving ? Math.min(1, age / 10) : 1;
        m.position.set(
          Math.sin(a.i) * (0.4 + f),
          Math.cos(a.i) * (0.3 + f * 0.3),
          -3 - f * a.i * 0.12,
        );
        m.scale.setScalar(1 - f * 0.5);
      }
      if (a.type === 'water-out' && moving) {
        const f = Math.min(1, age / 7);
        m.position.x = Math.cos(a.i) * (1.5 + f * 2.5);
        m.position.y = Math.sin(a.i) * (1.5 + f * 2.5);
        m.scale.setScalar(1 - f * 0.8);
      }
      if (a.type === 'sphincter') m.scale.setScalar(moving ? 1 + Math.sin(time * 1.5) * 0.08 : 1);
      if (a.type === 'absorb' || a.type === 'sodium') {
        const t = moving ? age : 5;
        m.position.fromArray(absorptionPoint(character, mode, t, a.i).position);
        if (a.type === 'sodium') {
          m.position.x -= 0.09;
          m.visible = mode === 'absorb';
        }
        if (character === 'trine') m.visible = mode === 'absorb';
      }
      if (a.type === 'reesterified') m.visible = mode === 'transport' && (!moving || age < 2);
      if (a.type === 'chylomicron') {
        m.visible = mode === 'transport' && (!moving || age >= 2);
        m.position.fromArray(absorptionPoint('trine', 'transport', moving ? age : 5).position);
      }
      if (a.type === 'ripple') {
        const u = Math.max(0, age - 2.5 - a.i * 0.18);
        m.visible = age > 2.5;
        m.scale.setScalar(0.3 + Math.min(1.5, u) * 1.1);
        m.material.transparent = true;
        m.material.opacity = Math.max(0, 1 - u / 2);
      }
      if (a.type === 'water') {
        m.scale.setScalar(1 + (moving ? Math.sin(age * 5) * 0.03 : 0));
        const fall = Math.min(1, Math.max(0, (age - 1.5) / 1.4));
        camera.position.set(0, 1.4 - fall * 2.9, -2 - fall * 2);
        camera.lookAt(0, -2.3, -6);
        scene.background.setRGB(
          0.25 + Math.min(1, age / 2) * 0.7,
          0.16 + Math.min(1, age / 2) * 0.75,
          0.2 + Math.min(1, age / 2) * 0.65,
        );
      }
    }
    for (const [i, e] of enzymes.entries()) {
      e.rotation.z = moving ? Math.sin(time + i) * 0.15 : 0;
      if (['reaction', 'secretion', 'brush-border'].includes(mode)) {
        const f = age < 3 ? Math.min(1, age / 2) : age < 6 ? 1 : Math.max(0, 1 - (age - 6) / 2);
        const z = stage.id === 'stomach' ? -6.3 : -4.5;
        if (mode === 'secretion')
          e.position.set(
            2 * (1 - Math.min(1, age / 2)),
            0.35 + 0.85 * Math.min(1, age / 2),
            -4 - 0.5 * Math.min(1, age / 2),
          );
        else e.position.set(-0.2, stage.id === 'stomach' ? -0.15 : 1.2, z - 1.7 + f * 1.7);
        if (stage.id === 'jejunum' && ['brush-border', 'reaction'].includes(mode)) {
          e.position.set(0.6, 0.7, -4.8);
          e.scale.setScalar(0.6);
        }
        e.rotation.z = 0;
        canvas.dataset.enzymeIntact = String(e.children.length > 0);
      }
    }
    if (wall && wallBase && moving && stage.id === 'oesophagus') {
      const a = wall.geometry.attributes.position,
        meta = wall.geometry.userData;
      for (let j = 0; j <= meta.along; j++) {
        const u = j / meta.along,
          f = peristalsis(u, (Math.min(0.65, 0.12 + age * 0.055) - 0.075) / 0.14);
        for (let i = 0; i <= meta.around; i++) {
          const k = (j * (meta.around + 1) + i) * 3;
          a.array[k] = wallBase[k] * f;
          a.array[k + 1] = wallBase[k + 1] * f;
        }
      }
      a.needsUpdate = true;
    }
    if (wall && moving && stage.id === 'stomach') {
      wall.scale.set(1 + Math.sin(time * 0.7) * 0.012, 1 + Math.sin(time * 0.7 + 0.8) * 0.018, 1);
    }
    if (oldRoot) {
      transitionAge += elapsed;
      const fade = Math.min(1, transitionAge / 1.1);
      oldRoot.traverse((o) => {
        if (o.material) {
          o.material.transparent = true;
          o.material.userData.transitionBase ??= o.material.opacity;
          o.material.opacity = o.material.userData.transitionBase * (1 - fade);
        }
      });
      if (fade === 1) {
        scene.remove(oldRoot);
        free(oldRoot);
        oldRoot = null;
      }
    }

    if (stage?.id === 'stomach') {
      const names = [
        ['Fundus', -2, 2, -7],
        ['Corpus', -2, -0.5, -9],
        ['Antrum', 3, -2, -8],
        ['Pylorus', 4.5, -1.8, -6.8],
        ['Curvatura major', -4, -1, -7],
        ['Curvatura minor', 3, 1, -7],
      ];
      canvas.dataset.landmarks = JSON.stringify(
        names.map(([name, x, y, z]) => {
          const p = new T.Vector3(x, y, z).project(camera);
          return {
            name,
            x: (p.x + 1) * 50,
            y: (1 - p.y) * 50,
            visible: p.z < 1 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1,
          };
        }),
      );
    } else if (['absorb', 'transport'].includes(mode)) {
      canvas.dataset.landmarks = JSON.stringify([
        { name: 'Tarmlumen' },
        { name: 'Tarmepitel' },
        { name: 'Blodkapillær' },
        { name: 'Lymfekar' },
      ]);
    } else canvas.dataset.landmarks = '[]';
    if (!paused && moving && budget.sample(dt * 1000)) resize();
    canvas.dataset.renderRatio = String(budget.ratio);
    renderer.render(scene, camera);
    root.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    canvas.dataset.targets = JSON.stringify(
      targets.map((o) => {
        o.geometry?.computeBoundingSphere();
        const p = (
          o.userData.pickPosition?.clone() ||
          o.geometry?.boundingSphere?.center.clone() ||
          new T.Vector3()
        )
          .applyMatrix4(o.matrixWorld)
          .project(camera);
        return {
          target: o.userData.target,
          x: (p.x + 1) * 50,
          y: (1 - p.y) * 50,
          visible: p.z < 1 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1,
        };
      }),
    );
    canvas.dataset.look = JSON.stringify({ yaw, pitch });
    canvas.dataset.camera = JSON.stringify({
      position: camera.position.toArray(),
      look: cameraLook.toArray(),
      fov: camera.fov,
      quaternion: camera.quaternion.toArray(),
    });
    canvas.dataset.chylomicrons = String(
      actors.filter((a) => a.type === 'chylomicron' && a.object.visible).length,
    );
    canvas.dataset.transportProgress = (mode === 'transport' ? Math.min(1, age / 5) : 0).toFixed(2);
    canvas.dataset.molecularForm = product;
    const nutrient = actors.find((a) => a.type === 'substrate')?.object;
    canvas.dataset.moleculeUnits = String(nutrient?.userData.units?.length || 0);
    canvas.dataset.absorptionDestination = character === 'trine' ? 'lymph' : 'blood';
    canvas.dataset.secretionStreams = String(secretions?.count || 0);
    canvas.dataset.ph = ph.toFixed(2);
    canvas.dataset.triangles = renderer.info.render.triangles;
    canvas.dataset.drawCalls = renderer.info.render.calls;
    canvas.dataset.geometries = renderer.info.memory.geometries;
    if (!paused && (moving || Math.abs(ph - targetPH) > 0.01)) raf = requestAnimationFrame(frame);
  }
  function wake() {
    if (!disposed && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }
  function mark(index) {
    hovered = index;
    targets.forEach((o) => {
      if (o.material?.emissive)
        o.material.emissive.setHex(choiceTargets[index] === o.userData.target ? 0x355b55 : 0);
    });
    enzymes.forEach((e, i) =>
      e.traverse((o) => {
        if (o.material?.emissive) o.material.emissive.setHex(i === index ? 0x244c55 : 0);
      }),
    );
    canvas.style.cursor = 'grab';
    wake();
  }
  const down = (e) => {
    drag = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false };
    canvas.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    if (drag) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 7) drag.moved = true;
      if (drag.moved) {
        yaw = T.MathUtils.clamp(yaw + (e.clientX - drag.lastX) * 0.004, -0.95, 0.95);
        pitch = T.MathUtils.clamp(pitch + (e.clientY - drag.lastY) * 0.003, -0.5, 0.5);
        wake();
      }
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
    }
  };
  const up = () => { drag = null; };
  const abort = () => {
    drag = null;
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', abort);
  canvas.style.touchAction = 'none';
  const visibility = () => {
    if (!document.hidden && !paused) wake();
  };
  document.addEventListener('visibilitychange', visibility);
  resize();
  return {
    setScene,
    labelChoices,
    learningState(run) {
      secretions?.setProgress({
        enzyme: Boolean(
          run?.completed?.includes(stage.id) || run?.task > (character === 'trine' ? 3 : 1),
        ),
        bile: Boolean(run?.completed?.includes(stage.id) || run?.task > 1),
      });
      wake();
    },
    configureChoices(options, kind = 'anatomy') {
      if (mode === 'boss' && kind !== 'enzyme') enzymes.forEach((e) => (e.visible = false));
      canvas.dataset.hypotheses = JSON.stringify(
        enzymes.filter((e) => e.visible).map((e) => e.userData.kind),
      );
      choiceTargets = options.map((o) => o.target || '');
      canvas.dataset.targets = JSON.stringify(
        targets.map((o) => {
          o.geometry?.computeBoundingSphere();
          const p = (
            o.userData.pickPosition?.clone() ||
            o.geometry?.boundingSphere?.center.clone() ||
            new T.Vector3()
          )
            .applyMatrix4(o.matrixWorld)
            .project(camera);
          return { target: o.userData.target, x: (p.x + 1) * 50, y: (1 - p.y) * 50 };
        }),
      );
    },
    highlightChoice: mark,
    center() {
      yaw = 0;
      pitch = 0;
      wake();
    },
    feedback() {
      if (moving) cough = 0.5;
      wake();
    },
    settings(o) {
      moving = o.motion;
      resize();
      wake();
    },
    pause(v) {
      paused = v;
      if (!v) wake();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      obs.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', abort);
      document.removeEventListener('visibilitychange', visibility);
      disposeRoot();
      if (oldRoot) free(oldRoot);
      texture?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
