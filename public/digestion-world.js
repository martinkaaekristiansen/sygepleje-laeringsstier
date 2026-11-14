import * as T from './three.module.min.js';
import { CHARACTERS } from './digestion-data.js';
// One renderer, camera and animation loop for every nutrient and scale.
export function createDigestionWorld(canvas, onPick) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(74, 1, 0.03, 180);
  scene.background = new T.Color(0x24101b);
  scene.fog = new T.FogExp2(0x24101b, 0.025);
  const ambient = new T.HemisphereLight(0xffd2b1, 0x24132c, 2.2);
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
    paused = false;
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
    const g = new T.Group();
    parent.add(g);
    const col = CHARACTERS[id].color;
    if (id === 'trine') {
      for (let i = 0; i < 3; i++) {
        sphere(-0.65, (i - 1) * 0.55, 0, 0.18, 0xeae4d6, g);
        if (i) bond([-0.65, (i - 2) * 0.55, 0], [-0.65, (i - 1) * 0.55, 0], col, g);
        for (let j = 0; j < 6; j++) {
          sphere(-0.25 + j * 0.3, (i - 1) * 0.55 + Math.sin(j * 2) * 0.1, 0, 0.13, col, g);
          if (j)
            bond(
              [-0.25 + (j - 1) * 0.3, (i - 1) * 0.55 + Math.sin((j - 1) * 2) * 0.1, 0],
              [-0.25 + j * 0.3, (i - 1) * 0.55 + Math.sin(j * 2) * 0.1, 0],
              col,
              g,
              0.035,
            );
          else bond([-0.65, (i - 1) * 0.55, 0], [-0.25, (i - 1) * 0.55, 0], 0xff786b, g);
        }
      }
    } else {
      const points = Array.from({ length: id === 'poul' ? 24 : 12 }, (_, i) =>
        id === 'poul'
          ? [Math.cos(i * 0.83) * (0.55 + i * 0.012), Math.sin(i * 0.83) * 0.7, (i - 12) * 0.075]
          : [(i - 6) * 0.27, Math.sin(i * 0.8) * 0.22, Math.cos(i * 0.8) * 0.2],
      );
      points.forEach((p, i) => {
        const bead = mesh(
          id === 'stanley'
            ? new T.TorusGeometry(0.16, 0.05, 6, 6)
            : new T.SphereGeometry(0.16, 12, 8),
          i % 3 === 0 ? 0xffeee0 : col,
          g,
        );
        bead.position.set(...p);
        if (i) bond(points[i - 1], p, col, g, 0.045);
      });
      if (id === 'stanley') {
        bond([-0.5, 0, 0], [-0.3, 0.55, 0.1], col, g);
        for (let i = 0; i < 3; i++) sphere(-0.3 + i * 0.3, 0.55, 0.1, 0.14, col, g);
      }
    }
    return g;
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
  function disposeRoot() {
    root.traverse((o) => {
      o.geometry?.dispose();
      if (o.material) {
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
      }
    });
    scene.remove(root);
    root = new T.Group();
    scene.add(root);
    actors = [];
    enzymes = [];
    teeth = [];
    villi = [];
    drops = [];
  }
  function lumen(s) {
    const stomach = s.id === 'stomach',
      colon = s.index >= 10,
      small = ['duodenum', 'jejunum', 'ileum'].includes(s.id),
      mouth = s.id === 'mouth';
    const rings = quality === 'low' ? 70 : 130,
      sides = quality === 'low' ? 32 : 64,
      positions = [],
      indices = [];
    for (let j = 0; j <= rings; j++) {
      const z = 5 - (j / rings) * 28;
      for (let i = 0; i <= sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        const bulge = stomach ? 1 + 1.2 * Math.exp(-(((z + 6) / 6) ** 2)) : 1;
        const fold = small
          ? 0.11 * Math.cos((j / rings) * 160)
          : colon
            ? 0.24 * Math.cos((j / rings) * 48)
            : 0.06 * Math.cos(a * 12 + z);
        const radius = (mouth ? 3.6 : colon ? 3.7 : stomach ? 3 : 2.7) * bulge + fold;
        positions.push(
          Math.cos(a) * radius + (stomach ? Math.sin(z * 0.12) * 1.5 : Math.sin(z * 0.16) * 0.25),
          Math.sin(a) * radius * (stomach ? 0.78 : 1),
          z,
        );
        if (j < rings && i < sides) {
          const k = j * (sides + 1) + i;
          indices.push(k, k + sides + 1, k + 1, k + 1, k + sides + 1, k + sides + 2);
        }
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const wall = mesh(geo, stomach ? 0xa34a61 : colon ? 0x946f79 : 0xb96f72);
    wall.material.side = T.BackSide;
    wall.material.roughness = 0.48;
    if (stomach) {
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const points = Array.from({ length: 18 }, (_, j) => {
          const z = -j * 0.7,
            r = 3 * (1 + 1.2 * Math.exp(-(((z + 6) / 6) ** 2))) - 0.1;
          return new T.Vector3(
            Math.cos(a) * r + Math.sin(z * 0.12) * 1.5,
            Math.sin(a) * r * 0.78,
            z,
          );
        });
        const c = new T.CatmullRomCurve3(points);
        mesh(new T.TubeGeometry(c, 30, 0.13, 7, false), 0xca7d88);
      }
      const liquid = mesh(new T.CircleGeometry(5, 48), 0x9e9146);
      liquid.rotation.x = -Math.PI / 2;
      liquid.position.set(0, -2.7, -5);
      liquid.material.transparent = true;
      liquid.material.opacity = 0.45;
    }
    if (small) {
      const count = quality === 'low' ? 50 : 140;
      const instance = new T.InstancedMesh(
        new T.CapsuleGeometry(0.09, 0.42, 3, 6),
        new T.MeshStandardMaterial({ color: 0xe8a18f, roughness: 0.65 }),
        count,
      );
      const dummy = new T.Object3D();
      for (let i = 0; i < count; i++) {
        const a = i * 2.399,
          z = -2 - (i % 30) * 0.55;
        dummy.position.set(Math.cos(a) * 2.45, Math.sin(a) * 2.45, z);
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
        const tooth = mesh(new T.BoxGeometry(0.48, 0.8, 0.55), 0xffedd6);
        const a = ((i % 16) / 15) * Math.PI;
        tooth.position.set(Math.cos(a) * 2.7, (i < 16 ? 1 : -1) * 2.1, -Math.sin(a) * 2.8);
        teeth.push(tooth);
      }
      const lips = mesh(new T.TorusGeometry(3.15, 0.4, 12, 48), 0x933858);
      lips.position.z = 3;
      lips.scale.y = 0.7;
    }
    if (['cardia', 'pylorus', 'ileocaecal', 'anal', 'anus'].includes(s.id)) {
      const ring = mesh(new T.TorusGeometry(1.8, 0.55, 16, 48), 0xc8778d);
      ring.position.z = -7;
      actors.push({ object: ring, type: 'sphincter' });
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
    if (kind === 'villus' || kind === 'lumen') {
      for (let i = -2; i <= 2; i++) {
        const g = new T.Group();
        root.add(g);
        g.position.set(i * 2, -2, -6);
        const vill = mesh(new T.CapsuleGeometry(0.65, 2.6, 10, 20), 0xe5a192, g);
        const lymph = mesh(new T.CylinderGeometry(0.14, 0.14, 2.8, 12), 0x96d68d, g);
        lymph.position.z = 0.64;
        for (let j = 0; j < 2; j++) {
          const cap = mesh(new T.TorusGeometry(0.35, 0.045, 8, 24), j ? 0xd75263 : 0x6bb4c9, g);
          cap.position.set(j ? 0.25 : -0.25, 0.4, 0.7);
          cap.scale.y = 3;
        }
        for (let j = 0; j < 12; j++)
          sphere(
            Math.cos(j * 2.4) * 0.7,
            (j % 5) * 0.55 - 1.1,
            0.35,
            0.11,
            j % 4 ? 0xe6b699 : 0x74c6d8,
            g,
          );
        vill.material.transparent = true;
        vill.material.opacity = 0.65;
      }
    } else {
      const cell = mesh(new T.BoxGeometry(6, 3, 0.5), 0xc78b9e);
      cell.position.set(0, -1, -7);
      for (let i = 0; i < 30; i++) {
        const m = mesh(new T.CapsuleGeometry(0.055, 0.55, 3, 6), 0xf2ccad);
        m.position.set(-2.9 + i * 0.2, 0.9, -6.6);
      }
      for (let i = 0; i < (character === 'trine' ? 0 : 5); i++) {
        const p = mesh(new T.TorusGeometry(0.27, 0.09, 10, 20), i % 2 ? 0x8ce4c3 : 0x77b7ed);
        p.position.set(-2 + i, 0.35, -6.5);
      }
      if (character === 'trine' && kind === 'transport') {
        const ch = molecule('trine');
        ch.position.set(0, -1, -5.5);
        ch.scale.setScalar(0.5);
        const coat = sphere(0, -1, -5.5, 0.75, 0x97cba5);
        coat.material.transparent = true;
        coat.material.opacity = 0.18;
      }
      const cap = bond(
        [-3, -2.8, -6],
        [3, -2.8, -6],
        character === 'trine' ? 0x95dba5 : 0xc63e59,
        root,
        0.19,
      );
      cap.name = 'transport';
      if (character === 'stanley') {
        for (let i = 0; i < 8; i++) sphere(-1.9 + i * 0.55, 1.7, -5.7, 0.055, 0x81c8ee);
      }
      for (let i = 0; i < 8; i++) {
        const m = sphere(-2 + i * 0.55, 1.6, -5.7, 0.13, CHARACTERS[character].color);
        actors.push({ object: m, type: 'absorb', i });
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
    disposeRoot();
    stage = s;
    character = id;
    mode = nextMode;
    age = 0;
    targetPH = s.ph || ph;
    camera.position.set(0, 0, 3);
    camera.lookAt(0, 0, -8);
    scene.background.set(0x24101b);
    scene.fog.color.set(0x24101b);
    if (mode === 'menu') {
      ['stanley', 'trine', 'poul']
        .filter((k) => CHARACTERS[k])
        .forEach((k, i) => {
          const m = molecule(k);
          m.position.set((i - 1) * 2.7, 0, -5);
          actors.push({ object: m, type: 'molecule', i });
        });
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
    } else if (['villus', 'cell', 'membrane', 'transport'].includes(mode)) {
      microscopic(mode);
    } else {
      lumen(s);
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
      mol.position.set(0, -0.25, -4.5);
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
    camera.position.z = moving ? 3 - Math.min(1, age / 3) * 1.1 : 2;
    if (mode === 'intro' && moving) {
      camera.position.z = 6 - Math.min(1, age / 12) * 6;
      camera.position.y = Math.sin(age * 1.3) * 0.12;
    }
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
        if (mode === 'reaction') {
          m.children.forEach((p, i) => {
            if (!p.userData.original) p.userData.original = p.position.clone();
            const orig = p.userData.original;
            const split =
              (character === 'stanley' && stage.id !== 'stomach') ||
              (character === 'poul' && stage.id !== 'mouth') ||
              (character === 'trine' && stage.id !== 'mouth');
            const f = split ? Math.min(1, age / 3) : 0;
            p.position
              .copy(orig)
              .add(new T.Vector3(((i % 3) - 1) * f * 0.45, Math.sin(i) * f * 0.25, 0));
            if (character === 'poul' && stage.id === 'stomach')
              p.position.x = orig.x + (i / m.children.length - 0.5) * f;
            if (character === 'trine' && stage.id === 'stomach') p.position.lerp(orig, 0.8);
          });
        }
      }
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
      if (a.type === 'absorb') {
        const f = Math.min(1, age / 5);
        m.position.y = 1.6 - f * 4.4;
        m.position.x = -2 + a.i * 0.55 + f * 0.4;
      }
      if (a.type === 'water') {
        m.scale.setScalar(1 + (moving ? Math.sin(age * 5) * 0.03 : 0));
        camera.position.y = -Math.min(1, age / 4) * 1.1;
      }
    }
    for (const [i, e] of enzymes.entries()) {
      e.rotation.z = moving ? Math.sin(time + i) * 0.15 : 0;
      if (mode === 'reaction') e.position.z = -6 + Math.sin(Math.min(1, age / 4) * Math.PI) * 1.5;
    }
    if (stage?.id === 'oesophagus' && moving)
      root.scale.set(1 + Math.sin(time * 2) * 0.025, 1 + Math.sin(time * 2) * 0.025, 1);
    renderer.render(scene, camera);
    canvas.dataset.ph = ph.toFixed(2);
    canvas.dataset.triangles = renderer.info.render.triangles;
    canvas.dataset.drawCalls = renderer.info.render.calls;
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
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
