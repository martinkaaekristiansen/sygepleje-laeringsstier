import * as T from './three.module.min.js';

// Oral-local coordinates. The mouth is a real hole aligned with the persistent
// lumen and lip ring; no disc or closed head mesh blocks the camera's entry.
export function buildExternalFace({ nasalOpenings = false } = {}) {
  const group = new T.Group();
  group.name = 'external-face-with-open-mouth';
  const shape = new T.Shape();
  shape.absellipse(0, 3.2, 7.2, 9.6, 0, Math.PI * 2, false);
  const mouth = new T.Path();
  mouth.absellipse(0, 0, 3.3, 2.3, 0, Math.PI * 2, true);
  shape.holes.push(mouth);
  if (nasalOpenings) for (const side of [-1, 1]) {
    const nostril = new T.Path();
    nostril.absellipse(side * .45, 3.35, .3, .24, 0, Math.PI * 2, true);
    shape.holes.push(nostril);
  }
  const geometry = new T.ExtrudeGeometry(shape, {
    depth: 0.55,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.18,
    bevelThickness: 0.2,
    curveSegments: 48,
  });
  const skin = new T.Mesh(
    geometry,
    new T.MeshStandardMaterial({
      color: 0xc89c83,
      roughness: 0.65,
    }),
  );
  skin.position.z = 2.25;
  group.add(skin);
  function oval(position, scale, color) {
    const m = new T.Mesh(
      new T.SphereGeometry(1, 20, 14),
      new T.MeshStandardMaterial({ color, roughness: 0.5 }),
    );
    m.position.fromArray(position);
    m.scale.fromArray(scale);
    group.add(m);
    return m;
  }
  const nose = oval([0, 4.1, 3.15], [0.9, 1.6, 1.35], 0xd6ab92);
  if (nasalOpenings) {
    nose.geometry.dispose();
    nose.geometry = new T.SphereGeometry(1, 48, 32);
    const p = nose.geometry.attributes.position, index = nose.geometry.index, kept = [];
    for (let i = 0; i < index.count; i += 3) {
      const center = new T.Vector3();
      for (let j = 0; j < 3; j++) center.add(new T.Vector3().fromBufferAttribute(p, index.getX(i + j)));
      center.multiplyScalar(1 / 3).multiply(nose.scale).add(nose.position);
      if ([-1, 1].some(side => ((center.x - side * .45) / .34) ** 2 + ((center.y - 3.35) / .28) ** 2 < 1.3)) continue;
      kept.push(index.getX(i), index.getX(i + 1), index.getX(i + 2));
    }
    nose.geometry.setIndex(kept);
    nose.geometry.computeVertexNormals();
  }
  for (const side of [-1, 1]) {
    if (!nasalOpenings) oval([side * 0.45, 3.35, 4.2], [0.23, 0.15, 0.12], 0x3a2023);
    oval([side * 2.65, 7.15, 2.95], [1.0, 0.53, 0.3], 0xf2e8df);
    oval([side * 2.65, 7.15, 3.23], [0.29, 0.34, 0.1], 0x493528);
    oval([side * 2.65, 8.25, 2.95], [1.1, 0.15, 0.2], 0x6c493c);
  }
  group.userData.kind = 'head-with-patent-oral-opening';
  return { group, nose, skin };
}
