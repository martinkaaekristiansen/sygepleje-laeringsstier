import { nutrientModel } from './digestion-molecules.js';
import {
  buildOrganSurface,
  organCurve,
  lumenRadius,
  peristalsis,
  stomachPoint as stomachPointLocal,
} from './digestion-anatomy.js';
import { reactionState } from './digestion-engine.js';
import * as T from './three.module.min.js';
import { CHARACTERS } from './digestion-data.js';
// One renderer, camera and animation loop for every nutrient and scale.
export function createDigestionWorld(canvas, onPick) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
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
    mode = 'menu',
    actors = [],
    enzymes = [],
    teeth = [],
    villi = [],
    drops = [],
    moving = true,
    quality = 'auto',
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
    microReady = false,
    wall = null,
    wallBase = null,
    organPath = null;
  const resize = () => {
    const b = canvas.getBoundingClientRect();
    renderer.setSize(b.width, b.height, false);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, quality === 'low' ? 0.7 : 1.4));
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
  function molecule(id, parent = root) {
    const m = nutrientModel(id);
    parent.add(m);
    return m;
  }
  function enzyme(x, y, z, color, index) {
    const g = new T.Group();
    root.add(g);
    g.position.set(x, y, z);
    g.userData.choice = index;
    for (let i = 0; i < 13 + index * 2; i++) {
      const a = (i / (13 + index * 2)) * Math.PI * 1.55;
      const p = sphere(
        Math.cos(a) * 0.5,
        Math.sin(a) * 0.5,
        Math.sin(i * 3) * 0.16,
        0.22,
        color,
        g,
      );
      p.userData.choice = index;
    }
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
    if (transition && moving && root.children.length) {
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
    environment = null;
    environmentKey = '';
    microReady = false;
    wall = null;
    wallBase = null;
  }
  function clearContent() {
    for (const child of [...root.children])
      if (child !== environment) {
        root.remove(child);
        free(child);
      }
    actors = [...envActors];
    drops = [...envDrops];
    teeth = [...envTeeth];
    enzymes = [];
  }
  function lumen(s) {
    canvas.dataset.environmentBuilds = String(Number(canvas.dataset.environmentBuilds || 0) + 1);
    const stomach = s.id === 'stomach',
      colon = s.index >= 10,
      small = ['duodenum', 'jejunum', 'ileum'].includes(s.id),
      mouth = s.id === 'mouth';
    const built = buildOrganSurface(s, quality === 'low');
    organPath = built.path;
    wall = mesh(built.geometry, stomach ? 0xa34a61 : colon ? 0x946f79 : 0xb96f72);
    wall.material.side = T.DoubleSide;
    wall.material.roughness = 0.64;
    wallBase = wall.geometry.attributes.position.array.slice();
    canvas.dataset.organShape = built.geometry.userData.kind;
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
      const count = s.id === 'ileum' ? 50 : quality === 'low' ? 70 : 180;
      const instance = new T.InstancedMesh(
        new T.CapsuleGeometry(0.09, 0.42, 3, 6),
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
        const molar = i % 16 < 4 || i % 16 > 11;
        const tooth = mesh(new T.SphereGeometry(1, 16, 12), 0xffedd6);
        tooth.scale.set(molar ? 0.28 : 0.22, molar ? 0.34 : 0.44, molar ? 0.3 : 0.15);
        if (molar) {
          for (let k = 0; k < 3; k++) {
            const cusp = sphere((k - 1) * 0.13, (i < 16 ? -1 : 1) * 0.24, 0, 0.13, 0xffedd6, tooth);
          }
        }
        const a = ((i % 16) / 15) * Math.PI;
        tooth.position.set(Math.cos(a) * 2.7, (i < 16 ? 1 : -1) * 2.1, -Math.sin(a) * 2.8);
        teeth.push(tooth);
      }
      for (const y of [-2.3, 2.3]) {
        const arch = new T.CatmullRomCurve3(
          Array.from(
            { length: 20 },
            (_, i) =>
              new T.Vector3(
                Math.cos((i / 19) * Math.PI) * 2.7,
                y,
                -Math.sin((i / 19) * Math.PI) * 2.8,
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
    if (s.id === 'pharynx') {
      const epiglottis = sphere(1.25, -0.5, -4, 0.7, 0xc47e94);
      epiglottis.scale.set(0.6, 0.14, 1.2);
      actors.push({ object: epiglottis, type: 'epiglottis' });
      for (let i = 0; i < 7; i++) {
        const ring = mesh(new T.TorusGeometry(0.72, 0.07, 7, 20), 0xe3bba6);
        ring.position.set(2, -1, -4 - i * 0.25);
      }
    }
    if (s.id === 'ileum') {
      for (let i = 0; i < 6; i++) {
        const p = sphere(2.3, -0.7, -4 - i * 1.5, 0.32, 0xd8ac96);
        p.scale.set(0.14, 0.6, 1.6);
      }
    }
    if (s.id === 'pharynx' || s.id === 'caecum') {
      const branch = mesh(
        new T.CylinderGeometry(s.id === 'caecum' ? 0.3 : 0.8, 0.15, 3, 16, 1, true),
        0x92536b,
      );
      branch.position.set(2.6, -0.7, -6);
      branch.rotation.z = 0.8;
    }
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
  function microscopic(kind) {
    scene.background.set(0x142b38);
    scene.fog.color.set(0x142b38);
    const vill = mesh(new T.CapsuleGeometry(0.82, 2.6, 10, 24), 0xd99b96);
    vill.position.set(0, -0.8, -8);
    vill.material.transparent = true;
    vill.material.opacity = 0.25;
    const lymph = mesh(new T.CylinderGeometry(0.11, 0.11, 3.2, 12), 0x8bd898);
    lymph.position.set(0, -0.8, -7.8);
    for (const x of [-0.55, 0.55]) {
      const c = new T.CatmullRomCurve3([
        new T.Vector3(x, -2.3, -7.7),
        new T.Vector3(x, 0, -7.5),
        new T.Vector3(0, 0.8, -7.6),
        new T.Vector3(-x, 0, -7.5),
        new T.Vector3(-x, -2.3, -7.7),
      ]);
      mesh(new T.TubeGeometry(c, 48, 0.045, 8, false), x < 0 ? 0xd35365 : 0x659ebb);
    }
    const cell = mesh(new T.BoxGeometry(0.68, 1, 0.38), 0xdfa6b3);
    cell.position.set(0, 0.5, -7);
    cell.material.transparent = true;
    cell.material.opacity = 0.5;
    for (let i = 0; i < 30; i++) {
      const m = mesh(new T.CapsuleGeometry(0.012, 0.12, 3, 6), 0xf5c7a6);
      m.position.set(-0.3 + (i % 10) * 0.065, 1.09, -7.15 + Math.floor(i / 10) * 0.12);
    }
    for (const x of [-0.2, 0.18]) {
      const pore = mesh(new T.TorusGeometry(0.045, 0.015, 8, 20), x < 0 ? 0x6bbce3 : 0xb9a4ec);
      pore.rotation.x = Math.PI / 2;
      pore.position.set(x, 1.01, -6.95);
      pore.name =
        character === 'stanley' ? 'SGLT1' : character === 'poul' ? 'PEPT1' : 'lipid-interface';
    }
    const basal = mesh(new T.TorusGeometry(0.055, 0.018, 8, 20), 0x7bdda9);
    basal.position.set(-0.1, 0.03, -6.79);
    basal.name = character === 'stanley' ? 'GLUT2' : 'basolateral-transport';
    const pump = mesh(new T.TorusGeometry(0.04, 0.02, 7, 20), 0xf3c252);
    pump.rotation.y = Math.PI / 2;
    pump.position.set(0.35, 0.28, -7);
    pump.name = 'Na-K-ATPase';
    if (character === 'trine') {
      const micelle = new T.Group();
      root.add(micelle);
      micelle.position.set(-0.2, 1.32, -7);
      for (let i = 0; i < 14; i++)
        sphere(
          Math.cos(i * 2.4) * 0.11,
          Math.sin(i * 2.4) * 0.1,
          Math.sin(i) * 0.05,
          0.025,
          0xbfcf6b,
          micelle,
        );
      const ch = molecule('trine');
      ch.position.set(0.1, 0.4, -7);
      ch.scale.setScalar(0.1);
      const coat = sphere(0.1, 0.4, -7, 0.15, 0x95d2a7);
      coat.material.transparent = true;
      coat.material.opacity = 0.3;
      actors.push({ object: ch, type: 'chylomicron' }, { object: coat, type: 'chylomicron' });
    }
    const cap = bond(
      [-0.55, -2.4, -7.6],
      [-2, -2.8, -10],
      character === 'trine' ? 0x8bd898 : 0xc74861,
      root,
      0.08,
    );
    cap.name = character === 'trine' ? 'lymph-outflow' : 'portal-outflow';
    for (let i = 0; i < 8; i++) {
      const m = sphere(
        -0.2 + (i % 3) * 0.04,
        1.3 + (i % 2) * 0.03,
        -6.95,
        0.025,
        CHARACTERS[character].color,
      );
      actors.push({ object: m, type: 'absorb', i });
      if (character === 'stanley') {
        const na = sphere(-0.16 + (i % 3) * 0.04, 1.33, -6.95, 0.012, 0x7fc9ef);
        actors.push({ object: na, type: 'sodium', i });
      }
    }
  }
  function labelChoices(labels) {
    const types = ['amylase', 'pepsin', 'lipase', 'trypsin'];
    enzymes.forEach((e, i) => {
      const type = types.findIndex((t) => (labels[i] || '').toLowerCase().includes(t));
      const color = [0xf4c35d, 0xb69cf0, 0x7bd5bb, 0xed9a85][type] || 0x94b8cb;
      e.children.forEach((p, j) => {
        const a = (j / e.children.length) * Math.PI * 1.65;
        p.material.color.setHex(color);
        p.position.set(
          Math.cos(a) * (0.45 + (type === 2 ? 0.12 : 0)),
          Math.sin(a) * 0.5,
          type === 1
            ? Math.sin(j * 0.8) * 0.35
            : type === 3
              ? Math.cos(j * 0.9) * 0.28
              : Math.sin(j * 3) * 0.16,
        );
      });
    });
    wake();
  }
  function setScene(s, id, nextMode = 'travel', residue = false) {
    const micro = ['villus', 'cell', 'membrane', 'transport'].includes(nextMode);
    const organ = !micro && !['menu', 'finale'].includes(nextMode);
    const reuse = organ && environment && environmentKey === s.id + ':' + id + ':' + residue;
    const reuseMicro = micro && microReady && character === id;
    if (reuse) clearContent();
    else if (!reuseMicro) disposeRoot(true);
    stage = s;
    character = id;
    mode = nextMode;
    age = 0;
    targetPH = s.ph || ph;
    canvas.dataset.scale = ['villus', 'cell', 'membrane', 'transport'].includes(mode)
      ? {
          villus: 'millimeter',
          cell: 'mikrometer',
          membrane: 'nanometer',
          transport: 'mikrometer',
        }[mode]
      : 'centimeter';
    if (!reuseMicro) {
      cameraTarget.set(0, 0, 2);
      lookTarget.set(0, 0, -8);
    }
    if (s.id === 'stomach') {
      cameraTarget.set(0, 0, -3.2);
      lookTarget.set(1, -0.4, -7);
    }
    scene.background.set(0x24101b);
    scene.fog.color.set(0x24101b);
    if (mode === 'menu') {
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
    } else if (['villus', 'cell', 'membrane', 'transport'].includes(mode)) {
      if (!reuseMicro) {
        microscopic(mode);
        microReady = true;
      }
      const targets = {
        villus: [0, 0.5, -3, 0, 0, -8],
        cell: [0, 1.7, -5.6, 0, 0.5, -7],
        membrane: [-0.12, 1.35, -6.55, -0.12, 1, -6.98],
        transport: [0, -0.8, -4.5, -0.4, -1, -7.7],
      };
      const v = targets[mode];
      cameraTarget.set(...v.slice(0, 3));
      lookTarget.set(...v.slice(3));
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
      }
      if (mode === 'intro')
        for (let i = 0; i < 8; i++) {
          const food = sphere(Math.sin(i) * 0.4, Math.cos(i) * 0.3, -3, 0.25, 0xc39e67);
          actors.push({ object: food, type: 'food', i });
        }
      if (s.index >= 10 && s.index < 16)
        for (let i = 0; i < 8; i++) {
          const water = sphere(Math.cos(i) * 1.5, Math.sin(i) * 1.5, -3 - i * 0.5, 0.06, 0x81c8ee);
          actors.push({ object: water, type: 'water-out', i });
        }
      const fragmented = s.index >= 7 && !residue;
      const mol = residue || fragmented ? new T.Group() : molecule(id);
      if (fragmented) {
        root.add(mol);
        for (let i = 0; i < 8; i++)
          sphere(
            ((i % 4) - 1.5) * 0.45,
            Math.floor(i / 4) * 0.4,
            0,
            0.14,
            CHARACTERS[id].color,
            mol,
          );
      }
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
      mol.position.set(0, -0.25, s.id === 'stomach' ? -6.3 : -4.5);
      mol.scale.setScalar(0.65);
      actors.push({ object: mol, type: 'substrate' });
      const chemical = !(
        (s.id === 'mouth' && id !== 'stanley') ||
        (s.id === 'stomach' && id === 'stanley')
      );
      if (mode === 'reaction' && chemical)
        for (let i = 0; i < 8; i++) {
          const w = sphere((i - 4) * 0.3, -0.3, -5, 0.06, 0x80cbe0);
          drops.push(w);
        }
      if (s.id === 'duodenum')
        for (let i = 0; i < 32; i++)
          sphere(2 - i * 0.13, 0.7 - i * 0.03, -6 - i * 0.1, 0.07, i % 2 ? 0xb3cc66 : 0xf3d3ac);
      if (mode === 'boss')
        for (let i = 0; i < 3; i++)
          enzyme((i - 1) * 1.7, 0.8, -6, [0x87d4b6, 0xb29be8, 0xf6b955][i], i);
      if (mode === 'reaction' && chemical) {
        enzyme(0, 0.8, -6, CHARACTERS[id].color, 0);
        labelChoices([
          id === 'stanley'
            ? 'amylase'
            : id === 'trine'
              ? 'lipase'
              : s.id === 'stomach'
                ? 'pepsin'
                : 'trypsin',
        ]);
      }
    }
    if (s.id === 'stomach') enzymes.forEach((e) => e.scale.setScalar(0.65));
    if (!moving && mode === 'reaction') age = 5;
    canvas.dataset.digestStage = s.id;
    canvas.dataset.digestMode = mode;
    wake();
  }
  function frame(now) {
    raf = 0;
    if (disposed) return;
    const dt = Math.min(0.08, (now - last) / 1000 || 0.016);
    last = now;
    if (!paused) {
      age += dt;
      if (moving) time += dt;
    }
    ph += (targetPH - ph) * Math.min(1, dt * 1.6);
    let destination = cameraTarget.clone();
    if (
      moving &&
      organPath &&
      stage.id !== 'stomach' &&
      ['travel', 'boss', 'reaction'].includes(mode)
    ) {
      const u = Math.min(0.2, age / 60);
      destination = organPath.getPointAt(u);
      const ahead = organPath.getPointAt(Math.min(0.35, u + 0.15));
      lookTarget.copy(ahead);
    }
    camera.position.lerp(destination, moving ? Math.min(1, dt * 2) : 1);
    cameraLook.lerp(lookTarget, moving ? Math.min(1, dt * 2) : 1);
    camera.lookAt(cameraLook);
    camera.near = ['cell', 'membrane'].includes(mode) ? 0.002 : 0.03;
    camera.updateProjectionMatrix();
    if (mode === 'intro' && moving) {
      camera.position.z = 5 - Math.min(1, age / 12) * 3;
      camera.position.y = Math.sin(age * 1.3) * 0.12;
    }
    light.intensity = ['villus', 'cell', 'membrane', 'transport'].includes(mode) ? 0.45 : 14;
    light.position.copy(camera.position);
    light.position.y = 1.2;
    for (const [i, m] of teeth.entries())
      m.position.y =
        (i < 16 ? 1 : -1) * (2.1 - (moving ? Math.max(0, Math.sin(time * 3)) * 0.55 : 0));
    for (const [i, m] of drops.entries()) {
      if (moving) m.position.z += dt * 0.5;
      if (m.position.z > 2) m.position.z = -18;
    }
    for (const a of actors) {
      const m = a.object;
      if (a.type === 'molecule' || a.type === 'substrate') {
        m.rotation.y = moving ? Math.sin(time * 0.5 + (a.i || 0)) * 0.4 : 0;
        if (mode === 'reaction' && m.userData.update) {
          const state = m.userData.update(age, stage.id);
          canvas.dataset.reactionPhase = state.phase;
          canvas.dataset.cleavedBonds = String(m.userData.links.filter((l) => !l.visible).length);
        }
      }
      if (a.type === 'epiglottis' && moving)
        m.rotation.x = Math.sin(Math.min(1, age / 3) * Math.PI) * 0.8;
      if (a.type === 'tongue' && moving) m.position.z = -2 + Math.sin(time * 1.2) * 0.25;
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
        const f =
          mode === 'transport'
            ? moving
              ? Math.min(1, age / 5)
              : 1
            : mode === 'membrane'
              ? 0.2
              : 0;
        const start = new T.Vector3(-0.2 + (a.i % 3) * 0.04, 1.3, -6.95);
        const inside = new T.Vector3(0.05 + (a.i % 3) * 0.02, 0.3, -7);
        const end = new T.Vector3(character === 'trine' ? 0 : -0.55, -1.8, -7.7);
        m.position.copy(f < 0.5 ? start.lerp(inside, f * 2) : inside.lerp(end, (f - 0.5) * 2));
        if (a.type === 'sodium') {
          m.position.x += 0.035;
          m.visible = f < 0.55;
        }
        if (character === 'poul' && f > 0.4) m.scale.setScalar(0.7);
      }
      if (a.type === 'chylomicron') {
        m.visible = mode === 'transport';
        if (mode === 'transport') {
          const f = moving ? Math.min(1, age / 5) : 1;
          m.position.set(0.1 * (1 - f), 0.4 - f * 2.2, -7 - f * 0.7);
        }
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
      if (mode === 'reaction') {
        const f = age < 3 ? Math.min(1, age / 2) : age < 6 ? 1 : Math.max(0, 1 - (age - 6) / 2);
        const z = stage.id === 'stomach' ? -6.3 : -4.5;
        e.position.set(-0.2, -0.15, z - 1.7 + f * 1.7);
        e.rotation.z = 0;
        canvas.dataset.enzymeIntact = String(e.children.length > 0);
      }
    }
    if (wall && wallBase && moving && stage.id === 'oesophagus') {
      const a = wall.geometry.attributes.position,
        meta = wall.geometry.userData;
      for (let j = 0; j <= meta.along; j++) {
        const u = j / meta.along,
          f = peristalsis(u, time);
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
      transitionAge += dt;
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
    } else if (['villus', 'cell', 'membrane', 'transport'].includes(mode)) {
      const names =
        character === 'trine'
          ? [
              ['Micelle', -0.2, 1.32, -7],
              ['Reesterificering', 0.1, 0.4, -7],
              ['Centralt lymfekar', 0, -0.8, -7.8],
            ]
          : [
              [character === 'stanley' ? 'SGLT1 + Na⁺' : 'PEPT1 / aminosyrer', -0.2, 1.01, -6.95],
              [character === 'stanley' ? 'GLUT2' : 'Basolateral transport', -0.1, 0.03, -6.79],
              ['Na⁺/K⁺-ATPase', 0.35, 0.28, -7],
              ['Blodkapillær → portåre', -0.55, -1.8, -7.7],
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
    } else canvas.dataset.landmarks = '[]';
    renderer.render(scene, camera);
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
  const ray = new T.Raycaster(),
    ndc = new T.Vector2();
  const click = (e) => {
    if (mode !== 'boss') return;
    const b = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - b.left) / b.width) * 2 - 1, 1 - ((e.clientY - b.top) / b.height) * 2);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(enzymes, true)[0];
    if (hit) onPick(hit.object.userData.choice);
  };
  canvas.addEventListener('click', click);
  const visibility = () => {
    paused = document.hidden;
    if (!paused) wake();
  };
  document.addEventListener('visibilitychange', visibility);
  resize();
  return {
    setScene,
    labelChoices,
    settings(o) {
      moving = o.motion;
      quality = o.quality;
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
      canvas.removeEventListener('click', click);
      document.removeEventListener('visibilitychange', visibility);
      disposeRoot();
      if (oldRoot) free(oldRoot);
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
