import * as T from './three.module.min.js';
import { nutrientModel } from './digestion-molecules.js';
import { cellGeometry } from './journey-3d-geometry.js';
import { anatomicalLabel } from './digestion-anatomy-labels.js';
const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
export const ATOMS = {
  oxygen: { O: 2 },
  'carbon-dioxide': { C: 1, O: 2 },
  bicarbonate: { C: 1, O: 3, H: 1 },
};
export const CARBON_REACTION = {
  left: { CO2: 1, H2O: 1 },
  right: { H: 1, HCO3: 1 },
  formula: 'CO₂ + H₂O ⇌ H⁺ + HCO₃⁻',
};
export function gasMolecule(kind = 'oxygen') {
  const group = new T.Group();
  group.name = 'molecule-' + kind;
  group.userData = { kind, atoms: { ...ATOMS[kind] }, charge: kind === 'bicarbonate' ? -1 : 0 };
  const geometry = new T.SphereGeometry(1, 16, 12),
    materials = {
      O: new T.MeshStandardMaterial({ color: 0xe8626c, roughness: 0.4 }),
      C: new T.MeshStandardMaterial({ color: 0x373b48, roughness: 0.5 }),
      H: new T.MeshStandardMaterial({ color: 0xf8eee3, roughness: 0.4 }),
    };
  const atoms = [];
  function atom(element, p, r) {
    const m = new T.Mesh(geometry, materials[element]);
    m.position.copy(p);
    m.scale.setScalar(r);
    m.userData.element = element;
    group.add(m);
    atoms.push(m);
    return m;
  }
  function bond(a, b, double = false) {
    const d = b.clone().sub(a);
    for (const side of double ? [-1, 1] : [0]) {
      const mesh = new T.Mesh(
        new T.CylinderGeometry(0.013, 0.013, d.length(), 8),
        new T.MeshStandardMaterial({ color: 0xe7d5bd, roughness: 0.55 }),
      );
      mesh.position.copy(a).lerp(b, 0.5);
      mesh.position.z += side * 0.018;
      mesh.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
      group.add(mesh);
    }
  }
  if (kind === 'oxygen') {
    const a = V(-0.065, 0, 0),
      b = V(0.065, 0, 0);
    atom('O', a, 0.065);
    atom('O', b, 0.065);
    bond(a, b, true);
  } else if (kind === 'carbon-dioxide') {
    atom('C', V(), 0.06);
    for (const side of [-1, 1]) {
      const p = V(side * 0.145, 0, 0);
      atom('O', p, 0.065);
      bond(V(), p, true);
    }
  } else {
    atom('C', V(), 0.06);
    for (let i = 0; i < 3; i++) {
      const p = V(
        Math.cos((i * 2 * Math.PI) / 3) * 0.15,
        Math.sin((i * 2 * Math.PI) / 3) * 0.15,
        0,
      );
      atom('O', p, 0.055);
      bond(V(), p, i === 0);
      if (i === 2) {
        const h = p.clone().add(V(-0.055, -0.07, 0));
        atom('H', h, 0.035);
        bond(p, h);
      }
    }
  }
  return { group, atoms, kind };
}
export function buildHemoglobin() {
  const group = new T.Group();
  group.name = 'four-subunit-hemoglobin';
  const sites = [],
    lobes = [];
  const geometry = new T.SphereGeometry(0.29, 18, 14),
    positions = [
      [-0.32, 0.32, 0],
      [0.32, 0.32, 0.035],
      [-0.32, -0.32, 0.035],
      [0.32, -0.32, 0],
    ];
  positions.forEach((p, i) => {
    const center = V(...p),
      material = new T.MeshStandardMaterial({
        color: i < 2 ? 0xb69ac2 : 0x8ab8b4,
        roughness: 0.55,
      }),
      lobe = new T.Mesh(geometry, material);
    lobe.position.copy(center);
    group.add(lobe);
    lobes.push(lobe);
    const outward = V(center.x, center.y, 0.7).normalize(),
      heme = new T.Group();
    heme.position.copy(center).addScaledVector(outward, 0.31);
    heme.quaternion.setFromUnitVectors(V(0, 1, 0), outward);
    const ring = new T.Mesh(
      new T.CylinderGeometry(0.135, 0.135, 0.026, 8),
      new T.MeshStandardMaterial({ color: 0xc67176, roughness: 0.45 }),
    );
    heme.add(ring);
    const iron = new T.Mesh(
      new T.SphereGeometry(0.028, 12, 8),
      new T.MeshStandardMaterial({
        color: 0xffd57e,
        emissive: 0x75501c,
        emissiveIntensity: 0.25,
        roughness: 0.3,
      }),
    );
    iron.position.y = 0.026;
    heme.add(iron);
    group.add(heme);
    const oxygen = gasMolecule('oxygen');
    oxygen.group.scale.setScalar(0.7);
    oxygen.group.position.copy(heme.position).addScaledVector(outward, 0.14);
    group.add(oxygen.group);
    sites.push({
      heme,
      iron,
      oxygen: oxygen.group,
      outward,
      position: oxygen.group.position.clone(),
    });
  });
  const primary = sites[0];
  primary.oxygen.visible = false;
  const hemeLabel = anatomicalLabel('Hæm · Fe²⁺', [0, 0.2, 0], 1, {
    target: primary.iron,
    priority: 90,
  });
  primary.heme.add(hemeLabel);
  function update(fraction = 0, { releasePrimary = false, primaryIsPlayer = true } = {}) {
    const n = Math.max(0, Math.min(4, Math.floor(fraction * 4 + 0.00001)));
    sites.forEach((s, i) => {
      s.oxygen.visible = (i > 0 || !primaryIsPlayer) && i < n && !(i === 0 && releasePrimary);
      s.iron.material.emissiveIntensity = i === 0 && fraction > 0 && !releasePrimary ? 0.8 : 0.25;
    });
    return {
      capacity: 4,
      bound: n - (releasePrimary && n > 0 ? 1 : 0),
      subunits: 4,
      hemes: 4,
      irons: 4,
      intact: true,
      primarySite: primary.position.toArray(),
    };
  }
  update();
  return { group, sites, lobes, hemeLabel, update };
}
export function buildFocusErythrocyte() {
  const group = new T.Group();
  group.name = 'same-travelling-erythrocyte';
  const geometry = cellGeometry('low'),
    material = new T.MeshPhysicalMaterial({
      color: 0xc73848,
      roughness: 0.42,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      side: T.DoubleSide,
    }),
    membrane = new T.Mesh(geometry, material);
  group.add(membrane);
  const rim = new T.Mesh(
    new T.TorusGeometry(0.95, 0.025, 6, 64),
    new T.MeshStandardMaterial({ color: 0xd74c5b, roughness: 0.6 }),
  );
  group.add(rim);
  const hb = buildHemoglobin();
  hb.group.position.set(0.4, 0, 0);
  hb.group.scale.setScalar(0.28);
  group.add(hb.group);
  group.scale.setScalar(0.43);
  return { group, membrane, hb, geometry };
}
export function buildCarbonCarrier() {
  const molecule = gasMolecule('bicarbonate'),
    group = molecule.group,
    atoms = molecule.atoms;
  for (const child of [...group.children])
    if (!child.userData.element) {
      group.remove(child);
      child.geometry.dispose();
      child.material.dispose();
    }
  const geometry = new T.CylinderGeometry(0.012, 0.012, 1, 8),
    bondMaterial = new T.MeshStandardMaterial({ color: 0xe3d2bd, roughness: 0.5 }),
    links = [
      [0, 1],
      [0, 2],
      [0, 3],
      [3, 4],
    ].map(([a, b]) => {
      const mesh = new T.Mesh(geometry, bondMaterial);
      group.add(mesh);
      return { a, b, mesh };
    });
  const linear = [V(), V(-0.145, 0, 0), V(0.145, 0, 0), V(0.2, -0.2, 0), V(0.3, -0.25, 0)],
    hydrated = atoms.map((a) => a.position.clone());
  const charge = anatomicalLabel('HCO₃⁻ · hydrogencarbonat', [0, 0.25, 0], 1.8, { priority: 95 });
  group.add(charge);
  const carbonLabel = anatomicalLabel('CO₂', [0, 0.28, 0], 1, { priority: 100 });
  group.add(carbonLabel);
  return {
    group,
    atoms,
    carbon: atoms[0],
    update(fraction) {
      const f = T.MathUtils.clamp(fraction, 0, 1);
      atoms.forEach((a, i) => {
        a.position.copy(linear[i]).lerp(hydrated[i], f);
        a.visible = i < 3 || f > 0.001;
        if (i >= 3) a.scale.setScalar((i === 3 ? 0.055 : 0.035) * Math.max(0.001, f));
      });
      for (const link of links) {
        const a = atoms[link.a].position,
          b = atoms[link.b].position,
          d = b.clone().sub(a);
        link.mesh.visible = atoms[link.a].visible && atoms[link.b].visible;
        link.mesh.position.copy(a).lerp(b, 0.5);
        link.mesh.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
        link.mesh.scale.y = d.length();
      }
      charge.visible = f > 0.98;
      carbonLabel.visible = f <= 0.98;
      group.userData.charge = f > 0.98 ? -1 : 0;
      group.userData.atoms = { ...(f > 0.98 ? ATOMS.bicarbonate : ATOMS['carbon-dioxide']) };
      group.userData.kind =
        f > 0.98 ? 'bicarbonate' : f < 0.02 ? 'carbon-dioxide' : 'hydration-reaction';
      return {
        carbonInstance: atoms[0].uuid,
        fraction: f,
        carbonIdentity: 'metabolic-carbon-1',
        charge: f > 0.98 ? -1 : 0,
      };
    },
  };
}
// Illustrative transport forms: most HCO3− in plasma, a few CO2 dissolved or
// attached to globin amino groups. None is attached to a heme iron.
export function buildCarbonTransportForms() {
  const group = new T.Group(),
    geometry = new T.SphereGeometry(1, 8, 6),
    counts = { C: 11, O: 30, H: 8 },
    meshes = {},
    dummy = new T.Object3D();
  for (const [element, count] of Object.entries(counts)) {
    const mesh = new T.InstancedMesh(
      geometry,
      new T.MeshLambertMaterial({
        color: element === 'C' ? 0x454251 : element === 'H' ? 0xeee4d5 : 0xde8688,
      }),
      count,
    );
    mesh.frustumCulled = false;
    group.add(mesh);
    meshes[element] = mesh;
  }
  const index = { C: 0, O: 0, H: 0 };
  function atom(e, p, r) {
    dummy.position.copy(p);
    dummy.scale.setScalar(r);
    dummy.updateMatrix();
    meshes[e].setMatrixAt(index[e]++, dummy.matrix);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2,
      p = V(Math.cos(a) * 0.48, Math.sin(a) * 0.48, ((i % 3) - 1) * 0.13);
    atom('C', p, 0.008);
    for (let j = 0; j < 3; j++) {
      const q = p
        .clone()
        .add(
          V(Math.cos((j * 2 * Math.PI) / 3) * 0.022, Math.sin((j * 2 * Math.PI) / 3) * 0.022, 0),
        );
      atom('O', q, 0.008);
      if (j === 2) atom('H', q.clone().add(V(-0.009, -0.01, 0)), 0.005);
    }
  }
  for (let i = 0; i < 3; i++) {
    const p =
      i < 2 ? V(0.172 + (i ? -0.03 : 0.03), -0.03, i ? 0.025 : -0.025) : V(-0.46, 0.06, 0.08);
    atom('C', p, 0.008);
    for (const sign of [-1, 1]) atom('O', p.clone().add(V(0, sign * 0.021, 0)), 0.008);
  }
  group.name = 'CO2-transport-mostly-plasma-bicarbonate';
  return {
    group,
    snapshot: () => ({
      bicarbonate: 8,
      dissolved: 1,
      globinBound: 2,
      boundToHemeIron: false,
      illustrativeNotExactPercentages: true,
    }),
  };
}
export function buildMitochondrion() {
  const group = new T.Group();
  group.name = 'mitochondrion-cutaway';
  const membrane = new T.Mesh(
    new T.SphereGeometry(1, 28, 16, 0, Math.PI * 1.35),
    new T.MeshStandardMaterial({ color: 0xbc9394, side: T.DoubleSide, roughness: 0.6 }),
  );
  membrane.scale.set(0.65, 0.32, 0.3);
  group.add(membrane);
  const inner = new T.Mesh(
    new T.SphereGeometry(1, 24, 14, 0, Math.PI * 1.28),
    new T.MeshStandardMaterial({ color: 0xd8ac86, side: T.DoubleSide, roughness: 0.6 }),
  );
  inner.scale.set(0.58, 0.26, 0.24);
  group.add(inner);
  for (let i = 0; i < 7; i++) {
    const x = -0.43 + i * 0.14,
      path = new T.CatmullRomCurve3([
        V(x, -0.16, -0.08),
        V(x + 0.05, 0.13, -0.08),
        V(x, 0.18, 0.07),
        V(x - 0.04, -0.13, 0.08),
      ]);
    group.add(
      new T.Mesh(
        new T.TubeGeometry(path, 12, 0.016, 5, false),
        new T.MeshStandardMaterial({ color: 0xe8b98c, roughness: 0.55 }),
      ),
    );
  }
  group.add(anatomicalLabel('Mitokondrie · ATP', [0, 0.4, 0], 1.8, { priority: 75 }));
  return group;
}
export function buildTissue(network) {
  const group = new T.Group();
  group.name = 'tissue-cell-and-metabolism';
  group.position.copy(network.tissue.cell);
  const membrane = new T.Mesh(
    new T.SphereGeometry(1, 28, 20),
    new T.MeshStandardMaterial({
      color: 0xd9bc9b,
      transparent: true,
      opacity: 0.19,
      depthWrite: false,
      side: T.DoubleSide,
      roughness: 0.6,
    }),
  );
  membrane.scale.set(1.25, 1.3, 1.05);
  group.add(membrane);
  const nucleus = new T.Mesh(
    new T.SphereGeometry(0.3, 20, 12),
    new T.MeshStandardMaterial({ color: 0x8c739f, roughness: 0.6 }),
  );
  nucleus.position.set(0.23, -0.35, -0.35);
  group.add(nucleus);
  const mito = buildMitochondrion();
  mito.rotation.y = Math.PI;
  mito.position.copy(network.tissue.mitochondrion).sub(network.tissue.cell);
  group.add(mito);
  group.add(anatomicalLabel('Vævscelle', [0, 1.4, 0], 1.8, { priority: 70 }));
  const nutrient = nutrientModel('stanley', 'glucose');
  nutrient.scale.setScalar(0.8);
  nutrient.position.copy(mito.position).add(V(0.55, 0.15, 0.15));
  nutrient.add(anatomicalLabel('Næringsstof · glukose', [0, 0.25, 0], 1.8, { priority: 70 }));
  group.add(nutrient);
  const atp = new T.InstancedMesh(
    new T.SphereGeometry(0.035, 8, 6),
    new T.MeshStandardMaterial({ color: 0xf8d67d, emissive: 0x795c21, emissiveIntensity: 0.4 }),
    14,
  );
  group.add(atp);
  atp.visible = false;
  const d = new T.Object3D();
  return {
    group,
    mito,
    update(t, active) {
      atp.visible = active;
      nutrient.visible = active;
      if (!active) return;
      for (let i = 0; i < 14; i++) {
        const u = (t * 0.18 + i / 14) % 1;
        d.position
          .copy(mito.position)
          .add(V(Math.cos(i * 2.4) * u * 0.9, u * 0.7, Math.sin(i * 2.4) * u * 0.6));
        d.updateMatrix();
        atp.setMatrixAt(i, d.matrix);
      }
      atp.instanceMatrix.needsUpdate = true;
    },
    snapshot: () => ({
      oxygenUsedFor: 'oxidative-phosphorylation',
      carbonSource: 'nutrient-carbon',
      oxygenDirectlyConvertedToCarbonDioxide: false,
    }),
  };
}
