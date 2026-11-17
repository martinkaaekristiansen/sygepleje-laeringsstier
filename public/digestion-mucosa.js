import * as T from './three.module.min.js';
export const MUCOSA_REGIONS = {
  duodenum: { radius: 2.55, folds: 7, height: 0.34, count: 2200, villus: 0.34, color: 0xd58b80 },
  jejunum: { radius: 2.85, folds: 11, height: 0.52, count: 3200, villus: 0.46, color: 0xe1a08c },
  ileum: { radius: 2.65, folds: 7, height: 0.18, count: 1500, villus: 0.26, color: 0xd39a91 },
};
export function mucosaRadius(id, u, a) {
  const r = MUCOSA_REGIONS[id];
  const phase = u * r.folds + 0.035 * Math.sin(a * 3 + u * 9) + 0.025 * Math.sin(a * 5 - u * 4);
  const ridge = Math.pow(0.5 + 0.5 * Math.cos(phase * Math.PI * 2), 4);
  return (
    r.radius -
    r.height * ridge * (0.87 + 0.13 * Math.sin(a * 2 + u * 11)) +
    0.035 * Math.sin(a * 7 + u * 24)
  );
}
export function mucosaFrame(id, built, u, a) {
  const k = Math.min(
    built.frames.normals.length - 1,
    Math.round(u * (built.frames.normals.length - 1)),
  );
  const n = built.frames.normals[k],
    b = built.frames.binormals[k];
  const radial = n.clone().multiplyScalar(Math.cos(a)).addScaledVector(b, Math.sin(a));
  const point = built.path.getPointAt(u).addScaledVector(radial, mucosaRadius(id, u, a));
  // Numerical surface normal incorporates both the fold slope and circumferential irregularities.
  const along = built.path.getTangentAt(u).multiplyScalar(built.path.getLength());
  const du = 0.0002;
  along.addScaledVector(
    radial,
    (mucosaRadius(id, Math.min(1, u + du), a) - mucosaRadius(id, Math.max(0, u - du), a)) /
      (2 * du),
  );
  const around = n
    .clone()
    .multiplyScalar(-Math.sin(a))
    .addScaledVector(b, Math.cos(a))
    .multiplyScalar(mucosaRadius(id, u, a));
  around.addScaledVector(
    radial,
    (mucosaRadius(id, u, a + du) - mucosaRadius(id, u, a - du)) / (2 * du),
  );
  const inward = along.cross(around).normalize();
  if (inward.dot(radial) > 0) inward.negate();
  return { point, inward };
}
export function villusSway(y, height, time, phase) {
  return 0.022 * Math.sin(time * 0.6 + phase) * Math.pow(Math.max(0, y) / height, 2);
}
export function buildVilli(id, built, texture, motility = null) {
  const region = MUCOSA_REGIONS[id],
    camera = built.path.getPointAt(0.045);
  const group = new T.Group();
  group.name = 'rooted-villi-' + id;
  const clock = { value: 0 },
    entries = new Map(),
    anchors = [];
  const object = new T.Object3D();
  for (let i = 0; i < region.count; i++) {
    const u = 0.035 + ((i + 0.5) / region.count) * 0.91,
      a = i * 2.3999632297;
    const frame = mucosaFrame(id, built, u, a);
    object.position.copy(frame.point).addScaledVector(frame.inward, -0.035);
    object.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), frame.inward);
    const variation = 0.8 + 0.2 * (0.5 + 0.5 * Math.sin(i * 7.1));
    object.scale.set(
      0.8 + 0.16 * Math.sin(i * 3.1),
      (region.villus / 0.425) * variation,
      id === 'duodenum' ? 0.75 : 0.85,
    );
    object.updateMatrix();
    const distance = frame.point.distanceTo(camera);
    const lod = distance < 3.5 ? 0 : distance < 6 ? 1 : 2;
    // Eight longitudinal sections keep draw overhead low while allowing
    // offscreen bends/sections to be culled when looking around. Never drop roots.
    const key = `${Math.floor(u * 8)}:${lod}`;
    if (!entries.has(key)) entries.set(key, { lod, instances: [] });
    entries.get(key).instances.push({
      u,
      axis: built.path.getPointAt(u).toArray(),
      matrix: object.matrix.clone(),
      phase: i * 2.399963,
      color: new T.Color(region.color).multiplyScalar(0.9 + 0.12 * Math.sin(i * 1.73)),
    });
    if (i % 97 === 0)
      anchors.push({ u, a, point: frame.point.toArray(), inward: frame.inward.toArray() });
  }
  const meshes = [...entries.values()].map(({ instances, lod }) => {
    // Keep rounded caps at every LOD; only their tessellation changes.
    const detail = [
      [4, 10],
      [3, 8],
      [2, 6],
    ][lod];
    const geometry = new T.CapsuleGeometry(0.075, 0.29, ...detail);
    geometry.translate(0, 0.205, 0);
    geometry.setAttribute(
      'villusPhase',
      new T.InstancedBufferAttribute(new Float32Array(instances.map((e) => e.phase)), 1),
    );
    const material = new T.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.43,
      bumpMap: texture,
      bumpScale: 0.018,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.villusTime = clock;
      shader.vertexShader =
        'attribute float villusPhase; uniform float villusTime;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float rootWeight=pow(max(position.y,0.0)/0.425,2.0);
        transformed.x+=0.022*sin(villusTime*0.6+villusPhase)*rootWeight;
        transformed.z+=0.015*cos(villusTime*0.47+villusPhase)*rootWeight;`,
      );
    };
    material.customProgramCacheKey = () => 'rooted-villi-v1';
    const lowDetail = [
      [3, 8],
      [2, 8],
      [2, 6],
    ][lod];
    const lowGeometry = new T.CapsuleGeometry(0.075, 0.29, ...lowDetail);
    lowGeometry.translate(0, 0.205, 0);
    lowGeometry.setAttribute('villusPhase', geometry.getAttribute('villusPhase'));
    if (motility) {
      motility.instances(geometry, instances);
      motility.instances(lowGeometry, instances);
      motility.material(material, true);
    }
    const mesh = new T.InstancedMesh(geometry, material, instances.length);
    mesh.userData.geometryLods = [geometry, lowGeometry];
    instances.forEach((entry, i) => {
      mesh.setMatrixAt(i, entry.matrix);
      mesh.setColorAt(i, entry.color);
    });
    mesh.computeBoundingSphere();
    // Shader displacement is not included in the CPU geometry bounds.
    mesh.boundingSphere.radius += motility ? 0.65 : 0.06;
    mesh.userData.distanceLod = lod;
    group.add(mesh);
    return mesh;
  });
  group.userData = {
    kind: 'rounded-rooted-villi',
    count: region.count,
    anchors,
    height: region.villus,
    maxSway: 0.022,
  };
  let constrained = false;
  return {
    mesh: group,
    meshes,
    count: region.count,
    clock,
    setBudget(ratio) {
      const low = ratio < 1;
      if (low === constrained) return;
      constrained = low;
      meshes.forEach((mesh) => {
        mesh.geometry = mesh.userData.geometryLods[low ? 1 : 0];
        mesh.material.bumpMap = low ? null : texture;
        mesh.material.needsUpdate = true;
      });
    },
  };
}
