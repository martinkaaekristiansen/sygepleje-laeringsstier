import * as T from './three.module.min.js';
export const UPTAKE_SECONDS = 10;
export const BASIC_TEXT = {
  stanley: 'Glukose er nu færdigfordøjet og optages gennem tyndtarmens slimhinde til blodet.',
  poul: 'Proteiner er nedbrudt til aminosyrer og små peptider, som optages gennem tyndtarmens slimhinde.',
  bile: 'Galde emulgerer fedtet, så store fedtdråber bliver til mindre dråber. Det giver lipase en større overflade at arbejde på.',
  lipase: 'Lipase spalter triglycerider til frie fedtsyrer og monoglycerider.',
  micelle:
    'Galdesalte danner miceller, som hjælper fedtsyrer og monoglycerider hen til tarmens overflade.',
  trine:
    'Micellerne afleverer fedtsyrer og monoglycerider ved tarmvæggen, hvor de optages. Galdesaltene bliver tilbage i tarmen.',
  residue:
    'Næringsstoffet er nu optaget gennem tarmvæggen. Du følger i stedet en ufordøjelig rest videre gennem fordøjelseskanalen.',
  overlap:
    'Faserne vises efter hinanden for overblikkets skyld. I kroppen overlapper emulgering, lipasespaltning og micelledannelse delvist.',
};
const smooth = (t, a, b) => T.MathUtils.smoothstep(t, a, b);
export function uptakePose(seconds, index = 0, lipid = false) {
  const t = Math.max(0, seconds) - index * 0.3,
    approach = smooth(t, 0, 3),
    transfer = smooth(t, 3.5, 7.5);
  return {
    cargoDistance: T.MathUtils.lerp(1.45, 0.34, approach) - transfer * 0.65,
    saltDistance: T.MathUtils.lerp(1.65, 0.4, approach),
    released: lipid && t >= 3.5,
    absorbed: t >= 7.5,
    bileInLumen: lipid,
  };
}
export function lipidLessonPose(seconds) {
  return {
    assembly: smooth(seconds, 0, 5),
    cargo: 'fatty-acids-and-monoglycerides',
    intactTriglycerides: 0,
  };
}
const beadGeometry = new T.SphereGeometry(1, 10, 7);
function bead(parent, p, r, color) {
  const m = new T.Mesh(
    beadGeometry.clone(),
    new T.MeshStandardMaterial({ color, roughness: 0.48 }),
  );
  m.position.fromArray(p);
  m.scale.setScalar(r);
  parent.add(m);
  return m;
}
export function lipidProducts() {
  const g = new T.Group();
  g.name = 'fatty-acids-and-monoglycerides';
  for (let chain = 0; chain < 3; chain++) {
    const y = (chain - 1) * 0.12;
    for (let j = 0; j < 4; j++)
      bead(
        g,
        [(j - 1.5) * 0.065, y + Math.sin(j * 2) * 0.018, 0],
        0.038,
        chain === 1 ? 0xeec76c : 0xf1a36a,
      );
    if (chain === 1) {
      bead(g, [-0.16, y, 0], 0.05, 0xf7e4b3);
      bead(g, [-0.2, y + 0.06, 0], 0.04, 0xf7e4b3);
    }
  }
  // One draw call per product packet, with the same rounded beads and colours.
  const positions = [],
    normals = [],
    colors = [],
    indices = [];
  let offset = 0;
  g.updateMatrixWorld();
  for (const m of [...g.children]) {
    const p = m.geometry.attributes.position,
      n = m.geometry.attributes.normal,
      normalMatrix = new T.Matrix3().getNormalMatrix(m.matrixWorld),
      c = m.material.color;
    for (let i = 0; i < p.count; i++) {
      positions.push(
        ...new T.Vector3().fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld).toArray(),
      );
      normals.push(
        ...new T.Vector3()
          .fromBufferAttribute(n, i)
          .applyMatrix3(normalMatrix)
          .normalize()
          .toArray(),
      );
      colors.push(c.r, c.g, c.b);
    }
    for (const i of m.geometry.index.array) indices.push(i + offset);
    offset += p.count;
    m.geometry.dispose();
    m.material.dispose();
    g.remove(m);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  g.add(new T.Mesh(geometry, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.48 })));
  return g;
}
function saltCoat() {
  const group = new T.Group();
  group.name = 'bile-salts-stay-in-lumen';
  const mesh = new T.InstancedMesh(
    new T.SphereGeometry(0.037, 8, 6),
    new T.MeshStandardMaterial({ color: 0x9cce78, roughness: 0.4 }),
    18,
  );
  const dummy = new T.Object3D();
  for (let i = 0; i < 18; i++) {
    const a = i * 2.39996323,
      y = 1 - (2 * (i + 0.5)) / 18,
      r = Math.sqrt(1 - y * y);
    dummy.position.set(Math.cos(a) * r * 0.28, y * 0.28, Math.sin(a) * r * 0.28);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  group.add(mesh);
  return group;
}
export function buildMicelleAssembly() {
  const group = new T.Group(),
    items = [];
  for (let i = 0; i < 4; i++) {
    const item = new T.Group(),
      cargo = lipidProducts(),
      coat = saltCoat();
    item.add(cargo, coat);
    item.position.set(((i % 2) - 0.5) * 0.8, (Math.floor(i / 2) - 0.5) * 0.75, 0);
    group.add(item);
    items.push({ coat, cargo });
  }
  return {
    group,
    update(age) {
      const state = lipidLessonPose(age);
      items.forEach(({ coat }) => coat.scale.setScalar(2.8 - 1.8 * state.assembly));
      return state;
    },
  };
}
export function buildSurfaceUptake(character, geometry, motility, pose) {
  const group = new T.Group();
  group.name = 'uptake-at-real-opaque-mucosa';
  const proxy = new T.Mesh(geometry, new T.MeshBasicMaterial({ side: T.DoubleSide }));
  proxy.updateMatrixWorld();
  const forward = pose.localLook.clone().sub(pose.localPosition).normalize(),
    right = forward
      .clone()
      .cross(pose.localUp || new T.Vector3(0, 1, 0))
      .normalize(),
    up = right.clone().cross(forward).normalize();
  const packets = [];
  for (let i = 0; i < 6; i++) {
    const horizontal = Math.tan(T.MathUtils.degToRad((pose.fov || 74) / 2)) * (pose.aspect || 1);
    const direction = forward
      .clone()
      .addScaledVector(right, horizontal * (0.35 + (i % 3) * 0.1))
      .addScaledVector(up, -0.24 + Math.floor(i / 3) * 0.13)
      .normalize();
    const ray = new T.Raycaster(pose.localPosition, direction, 0.03, 50),
      hit = ray.intersectObject(proxy)[0];
    if (!hit) throw Error('No real jejunal wall at uptake anchor');
    const inward = hit.face.normal.clone();
    if (inward.dot(forward) > 0) inward.negate();
    const cargo = character === 'trine' ? lipidProducts() : new T.Group();
    if (character !== 'trine') {
      const colors = character === 'stanley' ? 0xf3c15c : 0xb896e5;
      if (character === 'stanley') {
        const ring = new T.Mesh(
          new T.TorusGeometry(0.1, 0.026, 6, 6),
          new T.MeshStandardMaterial({ color: colors }),
        );
        cargo.add(ring);
      } else {
        bead(cargo, [0, 0, 0], 0.08, colors);
        if (i % 2) bead(cargo, [0.12, 0, 0], 0.08, colors);
      }
    }
    const coat = character === 'trine' ? saltCoat() : null;
    group.add(cargo);
    if (coat) group.add(coat);
    packets.push({
      anchor: hit.point.clone(),
      inward,
      cargo,
      coat,
      u: hit.uv.y,
      axis: pose.path.getPointAt(hit.uv.y),
    });
  }
  proxy.material.dispose();
  return {
    group,
    packets,
    update(age) {
      let absorbed = 0;
      for (let i = 0; i < packets.length; i++) {
        const p = packets[i],
          state = uptakePose(age, i, character === 'trine'),
          anchor = motility.point(p.anchor, p.u, p.axis);
        p.cargo.position.copy(anchor).addScaledVector(p.inward, state.cargoDistance);
        p.cargo.visible = !state.absorbed;
        if (p.coat) p.coat.position.copy(anchor).addScaledVector(p.inward, state.saltDistance);
        if (state.absorbed) absorbed++;
      }
      return {
        kind: 'automatic-wall-uptake',
        wallOpaque: true,
        packets: packets.length,
        absorbed,
        bileInLumen: character === 'trine',
        cargo:
          character === 'trine'
            ? 'fatty-acids-and-monoglycerides'
            : character === 'stanley'
              ? 'glucose'
              : 'amino-acids-and-small-peptides',
        bloodOrLymphScene: false,
      };
    },
  };
}

// Emulsification changes droplet size/area only. No molecular bonds are removed.
export function emulsificationPose(age) {
  const f = smooth(age, 0.5, 3.5);
  return {
    progress: f,
    droplets: f === 0 ? 1 : 12,
    chemicalBondsCleaved: 0,
    largeRadius: 0.68 * Math.cbrt(1 - f),
    smallRadius: 0.68 * Math.cbrt(f / 12),
  };
}
export function buildEmulsification() {
  const group = new T.Group(),
    large = bead(group, [0, 0, 0], 0.68, 0xe9bf63),
    small = [];
  for (let i = 0; i < 12; i++) {
    const g = new T.Group();
    g.add(bead(new T.Group(), [0, 0, 0], 1, 0xe9bf63));
    group.add(g);
    small.push(g);
  }
  return {
    group,
    update(age) {
      const state = emulsificationPose(age);
      large.visible = state.progress < 0.999;
      large.scale.setScalar(state.largeRadius);
      small.forEach((m, i) => {
        m.visible = state.progress > 0;
        m.children[0].scale.setScalar(state.smallRadius);
        const a = i * 2.4,
          r = 0.3 + state.progress * 0.7;
        m.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.65, Math.sin(i * 3) * 0.2);
      });
      return { ...state, kind: 'emulsification', bileIsEnzyme: false };
    },
  };
}
