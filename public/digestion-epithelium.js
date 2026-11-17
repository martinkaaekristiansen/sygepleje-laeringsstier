import * as T from './three.module.min.js';
import { CHARACTERS } from './digestion-data.js';
import { viewPose } from './digestion-camera.js';
import { physiologyLabel as anatomicalLabel } from './digestion-physiology-label.js';

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * T.MathUtils.clamp(t, 0, 1));
const A = {
  lumen: [-1.25, 0.65, 1.6],
  apical: [-0.7, 0.3, 0.8],
  cell: [0, 0.1, 0.03],
  basal: [0, -0.45, -0.72],
  blood: [-1.1, -1.1, -1.05],
  lymph: [1.1, -1.1, -1.05],
};
export function epithelialTimeline(character, mode, age) {
  const t = Math.max(0, age),
    fat = character === 'trine',
    protein = character === 'poul';
  if (mode === 'absorb') {
    const cross = fat ? Math.max(0, (t - 2.5) / 3) : t / 5;
    const delivery = [-0.7, 0.3, 1.1];
    // Cargo accompanies the micelle to the brush border, then leaves its coat.
    const apicalApproach = fat
      ? t < 2.5
        ? mix(A.lumen, delivery, t / 2.5)
        : mix(delivery, A.apical, (t - 2.5) / 1.5)
      : mix(A.lumen, A.apical, cross * 2);
    return {
      position: cross < 0.5 ? apicalApproach : mix(A.apical, A.cell, (cross - 0.5) * 2),
      compartment: cross < 0.5 ? 'lumen' : 'epithelium',
      phase: fat
        ? t < 2
          ? 'micelle-assembly'
          : t < 3
            ? 'micelle-delivery'
            : t < 5.5
              ? 'lipid-uptake'
              : 'intracellular-lipids'
        : protein
          ? t < 2.5
            ? 'aa-and-peptide-uptake'
            : t < 4
              ? 'pept1-uptake'
              : 'intracellular-peptide-hydrolysis'
          : 'glucose-sglt1-uptake',
      hydrolysed: protein && t >= 4,
      micelleCrosses: false,
      intactProteinCrosses: false,
      intactTriglycerideCrosses: false,
    };
  }
  const route = fat ? 'lymph' : 'blood',
    start = fat ? 4 : 0;
  const cellFraction = fat ? 0.25 : 0.4;
  const f = T.MathUtils.clamp((t - start) / 4, 0, 1);
  const end = A[route];
  const p =
    f < cellFraction
      ? mix(A.cell, A.basal, f / cellFraction)
      : mix(A.basal, end, (f - cellFraction) / (1 - cellFraction));
  // Continuations are explicitly schematic: portal blood -> liver; lymph ->
  // thoracic duct -> left venous angle -> systemic blood (never vena portae).
  const onward = T.MathUtils.clamp((t - (fat ? 8 : 4)) / 3.5, 0, 1);
  return {
    position: onward ? mix(end, [fat ? 1.8 : -1.8, -2.15, 0.1], onward) : p,
    compartment: f < cellFraction ? 'epithelium' : route,
    phase: fat
      ? t < 2.5
        ? 'reesterification'
        : t < 4
          ? 'chylomicron-assembly'
          : t < 8
            ? 'lacteal-transport'
            : 'lymph-to-systemic-blood'
      : t < 4
        ? 'basolateral-to-capillary'
        : 'portal-to-liver',
    destination: fat ? 'systemic-blood-via-lymph' : 'liver-via-portal-blood',
    hydrolysed: protein,
    micelleCrosses: false,
    intactProteinCrosses: false,
    intactTriglycerideCrosses: false,
  };
}

// A rasterized aperture avoids projecting a viewing ray for every wall/villus
// fragment. The same wall-anchored circle follows motility and free look.
export function epithelialCutaway() {
  return {
    apply(material) {
      material.stencilWrite = true;
      material.stencilWriteMask = 0;
      material.stencilRef = 1;
      material.stencilFunc = T.NotEqualStencilFunc;
    },
    mask() {
      const mask = new T.Mesh(
        new T.CircleGeometry(2.8, 48),
        new T.MeshBasicMaterial({
          side: T.DoubleSide,
          colorWrite: false,
          depthWrite: false,
          depthTest: false,
          stencilWrite: true,
          stencilRef: 1,
          stencilFunc: T.AlwaysStencilFunc,
          stencilZPass: T.ReplaceStencilOp,
        }),
      );
      mask.name = 'epithelial-stencil-aperture';
      mask.renderOrder = -1000;
      return mask;
    },
  };
}

export function buildEpithelium(character, wall, motility, cutaway) {
  const group = new T.Group();
  group.name = 'epithelium-in-jejunal-wall';
  const pose = viewPose('jejunum'),
    camera = new T.PerspectiveCamera(74, 1, 0.03, 180);
  camera.position.copy(pose.position);
  camera.lookAt(pose.look);
  camera.updateMatrixWorld();
  wall.updateWorldMatrix(true, false);
  const ray = new T.Raycaster(),
    anchor = new T.Vector3(),
    axis = new T.Vector3();
  let u = 0,
    landscape;
  function layout(width, height) {
    const nextLandscape = width > 600 && height <= 500;
    if (landscape !== nextLandscape) {
      landscape = nextLandscape;
      ray.setFromCamera(new T.Vector2(0, landscape ? 0.04 : -0.25), camera);
      const hit = ray.intersectObject(wall)[0];
      if (!hit) throw Error('Absorption requires a visible jejunal wall');
      anchor.copy(hit.point);
      u = hit.uv.y;
      const normal = pose.position.clone().sub(anchor).normalize();
      group.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), normal);
      axis.set(0, 0, 0);
      for (const id of [hit.face.a, hit.face.b, hit.face.c])
        axis.add(new T.Vector3().fromBufferAttribute(wall.geometry.attributes.digestAxis, id));
      axis.multiplyScalar(1 / 3);
    }
    // A projected 150px teaching section fits above landscape controls. This
    // changes the schematic cutaway only; the B station camera stays fixed.
    const scale = landscape
      ? (150 * anchor.distanceTo(pose.position) * 2 * Math.tan((74 * Math.PI) / 360)) /
        (5.6 * height)
      : 1;
    group.scale.setScalar(scale);
    group.position.copy(motility.point(anchor, u, axis));
  }
  layout(window.innerWidth, window.innerHeight);
  group.add(cutaway.mask());
  const materials = new Map();
  const material = (color, opacity = 1) => {
    const key = color + ':' + opacity;
    if (!materials.has(key))
      materials.set(
        key,
        new T.MeshStandardMaterial({
          color,
          roughness: 0.55,
          emissive: color,
          emissiveIntensity: 0.12,
          transparent: opacity < 1,
          opacity,
          depthWrite: opacity === 1,
          side: T.DoubleSide,
        }),
      );
    return materials.get(key);
  };
  const add = (geometry, color, position, parent = group, opacity = 1) => {
    const mesh = new T.Mesh(geometry, material(color, opacity));
    mesh.position.fromArray(position);
    parent.add(mesh);
    return mesh;
  };
  const batch = (geometry, color, positions, opacity = 1) => {
    const mesh = new T.InstancedMesh(geometry, material(color, opacity), positions.length),
      dummy = new T.Object3D();
    for (const [i, p] of positions.entries()) {
      dummy.position.fromArray(p);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    group.add(mesh);
    return mesh;
  };
  const stroma = add(new T.SphereGeometry(3.15, 24, 12), 0xc97d83, [0, 0, -1.5]);
  stroma.scale.z = 0.1;
  const cells = [];
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 6; col++) cells.push([(col - 2.5) * 0.68, (row - 1) * 0.61, 0]);
  batch(new T.BoxGeometry(0.68, 0.61, 1.2), 0xa36176, cells, 0.22);
  batch(new T.BoxGeometry(0.625, 0.555, 1.215), 0xf0c8b3, cells, 0.32);
  batch(
    new T.SphereGeometry(0.13, 8, 6),
    0xa26d9c,
    cells.map((p) => [p[0], p[1], -0.12]),
  );
  // A fine apical texture represents the brush border without giant microvilli
  // or hundreds of extra animated geometries at the teaching scale.
  const brushCanvas = document.createElement('canvas');
  brushCanvas.width = brushCanvas.height = 64;
  const brushContext = brushCanvas.getContext('2d');
  brushContext.fillStyle = 'rgba(255,235,175,.55)';
  for (let i = 0; i < 80; i++) brushContext.fillRect((i * 17) % 64, (i * 29) % 64, 1, 3);
  const brushTexture = new T.CanvasTexture(brushCanvas);
  brushTexture.wrapS = brushTexture.wrapT = T.RepeatWrapping;
  brushTexture.repeat.set(10, 5);
  const brush = add(new T.PlaneGeometry(4.02, 1.78), 0xf7ddac, [0, 0, 0.615], group, 0.35);
  brush.material.map = brushTexture;
  brush.userData.ownedTexture = brushTexture;
  function tube(points, color, r = 0.065) {
    return add(
      new T.TubeGeometry(
        new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
        24,
        r,
        6,
        false,
      ),
      color,
      [0, 0, 0],
    );
  }
  tube(
    [
      [-1.9, 0.65, -1.12],
      [-1.6, -0.7, -1.12],
      [-1.1, -1.1, -1.05],
      [-1.8, -2.15, 0.1],
    ],
    character === 'trine' ? 0x8d6d76 : 0xd84e66,
    0.075,
  );
  tube(
    [
      [0.95, 0.7, -1.12],
      [1, -0.5, -1.12],
      [1.1, -1.1, -1.05],
      [1.8, -2.15, 0.1],
    ],
    character === 'trine' ? 0x8ed8aa : 0x6c8878,
    0.1,
  );
  const label = (text, p, width, avoidMap = false) =>
    group.add(anatomicalLabel(text, p, width, avoidMap));
  label('Enterocytter · skematisk udsnit', [0, 1.9, 1], 2.7);
  label('Børstesøm mod lumen', [-0.85, 1.15, 0.8], 2.25);
  label(
    character === 'trine' ? 'Lacteal → lymfe → systemisk blod' : 'Kapillær → v. portae → lever',
    [0, -2.65, 0.6],
    3,
    true,
  );
  const packets = [];
  const colors = Object.fromEntries(
    Object.entries(CHARACTERS).map(([id, value]) => [id, value.color]),
  );
  const bead = new T.SphereGeometry(0.19, 8, 6),
    glucose = new T.TorusGeometry(0.23, 0.052, 5, 6),
    fatty = new T.CapsuleGeometry(0.075, 0.4, 2, 6);
  for (let i = 0; i < 3; i++) {
    const packet = new T.Group();
    group.add(packet);
    if (character === 'poul') packet.scale.setScalar(0.68);
    const count = character === 'poul' ? i + 1 : 1;
    const units = [];
    for (let j = 0; j < count; j++)
      units.push(
        add(
          character === 'stanley' ? glucose : character === 'trine' ? fatty : bead,
          colors[character],
          [(j - (count - 1) / 2) * 0.34, 0, 0],
          packet,
        ),
      );
    const links = [];
    for (let j = 1; j < count; j++) {
      const link = add(
        new T.CylinderGeometry(0.025, 0.025, 0.34, 5),
        0xf7ddc3,
        [(j - count / 2) * 0.34, 0, 0],
        packet,
      );
      link.rotation.z = Math.PI / 2;
      links.push(link);
    }
    if (character === 'trine' && i === 0)
      add(new T.BoxGeometry(0.16, 0.14, 0.12), 0xf7d08d, [-0.13, 0, 0], packet);
    packets.push({ group: packet, units, links, initialCount: count });
  }
  let micelle = null,
    micelleLabel = null,
    reesterified = null,
    chylomicrons = [];
  if (character === 'trine') {
    micelle = new T.Group();
    group.add(micelle);
    const shell = new T.InstancedMesh(new T.SphereGeometry(0.045, 6, 4), material(0xc6d47a), 24),
      dummy = new T.Object3D();
    for (let i = 0; i < 24; i++) {
      const y = 1 - (i + 0.5) / 12,
        r = Math.sqrt(1 - y * y),
        a = i * 2.399963;
      dummy.position.set(Math.cos(a) * r * 0.32, y * 0.32, Math.sin(a) * r * 0.32);
      dummy.updateMatrix();
      shell.setMatrixAt(i, dummy.matrix);
    }
    micelle.add(shell);
    micelleLabel = anatomicalLabel('Micelle i lumen', [-2.6, 0.55, 1.4], 2);
    group.add(micelleLabel);
    reesterified = new T.Group();
    group.add(reesterified);
    reesterified.position.fromArray(A.cell);
    for (let i = 0; i < 3; i++) {
      const tail = add(fatty, colors.trine, [(i - 1) * 0.15, 0, 0], reesterified);
      tail.rotation.z = Math.PI / 2;
    }
    add(new T.BoxGeometry(0.08, 0.42, 0.08), 0xf7d08d, [-0.2, 0, 0], reesterified);
    for (let i = 0; i < 2; i++) {
      const ch = new T.Group();
      group.add(ch);
      add(new T.SphereGeometry(0.19, 12, 8), 0xf6ce87, [0, 0, 0], ch, 0.75);
      for (let j = 0; j < 3; j++)
        add(fatty, colors.trine, [(j - 1) * 0.065, 0, 0], ch).scale.setScalar(0.42);
      chylomicrons.push(ch);
    }
  }
  return {
    group,
    get anchor() {
      return anchor.toArray();
    },
    layout,
    count: 18,
    update(age, mode, seconds) {
      const point = motility.point(anchor, u, axis);
      group.position.copy(point);
      const state = epithelialTimeline(character, mode, age);
      packets.forEach((p, i) => {
        const st = epithelialTimeline(character, mode, Math.max(0, age - i * 0.2));
        p.group.position.fromArray(st.position);
        p.group.position.y += (i - 1) * 0.22;
        p.group.visible = character !== 'trine' || mode === 'absorb';
        if (character === 'poul') {
          p.links.forEach((link) => (link.visible = !st.hydrolysed));
          p.units.forEach(
            (unit, j) =>
              (unit.position.y = st.hydrolysed ? (j - (p.units.length - 1) / 2) * 0.28 : 0),
          );
        }
      });
      if (micelle) {
        micelle.position.fromArray(mix(A.lumen, [-0.7, 0.3, 1.1], Math.min(1, age / 2.5)));
        micelle.scale.setScalar(Math.min(1, 0.5 + age * 0.25));
        micelle.visible = mode === 'absorb';
        micelleLabel.visible = micelle.visible;
        reesterified.visible = mode === 'transport' && age < 4;
        reesterified.scale.setScalar(Math.min(1, 0.4 + age * 0.4));
        chylomicrons.forEach((ch, i) => {
          ch.visible = mode === 'transport' && age >= 2.5;
          ch.position.fromArray(
            epithelialTimeline(character, mode, Math.max(0, age - i * 0.2)).position,
          );
          ch.position.y += i * 0.26;
          ch.scale.setScalar(Math.min(1, (age - 2.5) / 1));
        });
      }
      return {
        ...state,
        enterocytes: 18,
        brushBorder: true,
        anchored: true,
        peptides: character === 'poul' ? (state.hydrolysed ? 0 : 2) : 0,
        chylomicrons: chylomicrons.filter((ch) => ch.visible).length,
      };
    },
  };
}
