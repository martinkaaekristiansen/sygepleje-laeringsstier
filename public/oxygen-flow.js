import * as T from './three.module.min.js';
import { cellGeometry } from './journey-3d-geometry.js';
import { bloodFlowParameter, valveOpening } from './journey-physiology.js';
import { chamberPlan, chamberField } from './journey-chambers.js';
const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
const streamGeometry = { near: cellGeometry('low'), far: cellGeometry('distant') };
// Geometry and advection reuse the blood game. Two instanced LODs retain every cell.
export function buildBloodStream(path, radius, { kind = 'artery', stage = null, count = 12 } = {}) {
  const group = new T.Group(),
    mat = new T.MeshLambertMaterial({ color: kind === 'vein' ? 0xa93c56 : 0xd64c59 }),
    near = new T.InstancedMesh(streamGeometry.near, mat, count),
    far = new T.InstancedMesh(streamGeometry.far, mat, count),
    dummy = new T.Object3D(),
    frames = path.computeFrenetFrames(80, false),
    cap = kind === 'capillary',
    plan = stage ? chamberPlan(stage) : null;
  group.name = 'reused-erythrocyte-stream';
  group.add(near, far);
  near.frustumCulled = far.frustumCulled = false;
  let last = -Infinity;
  return {
    group,
    near,
    far,
    update(time, camera, { lod = true, reduced = false } = {}) {
      if (time - last < 0.06 && time >= last) return;
      last = time;
      const eye = group.worldToLocal(camera.position.clone());
      let nearCount = 0,
        farCount = 0;
      for (let i = 0; i < count; i++) {
        let u = bloodFlowParameter((i + 0.5) / count, time, {
          capillary: cap,
          venous: kind === 'vein',
        });
        for (const [valve, start, end, wait] of [
          [plan?.inletValve, 0.07, 0.16, 0.06],
          [plan?.exitValve, 0.68, 0.8, 0.66],
        ])
          if (valve && valveOpening(valve, time) < 0.8 && u > start && u < end) u = wait;
        const point = path.getPointAt(u),
          j = Math.round(u * 80),
          size = cap ? 0.078 : stage ? 0.3 : Math.min(0.3, radius * 0.28),
          offset = cap ? 0 : Math.max(0, radius * 0.55 - size);
        point
          .addScaledVector(frames.normals[j], Math.cos(i * 2.399) * offset)
          .addScaledVector(frames.binormals[j], Math.sin(i * 2.399) * offset);
        const outside =
          stage &&
          chamberField(stage, point.clone().multiplyScalar(1 / stage.radius), plan) > -0.22;
        const visible =
          !outside &&
          point.distanceTo(eye) >
            (camera.userData.oxygenTeachingFocus ? Math.max(0.75, size * 3) : size * 3);
        dummy.position.copy(point);
        dummy.quaternion.setFromUnitVectors(V(0, 0, 1), path.getTangentAt(u));
        dummy.rotateZ(reduced ? i : time * 0.12 + i);
        const distant = lod && point.distanceTo(eye) > 4;
        if (visible) {
          dummy.scale.setScalar(size);
          dummy.updateMatrix();
          if (distant) far.setMatrixAt(farCount++, dummy.matrix);
          else near.setMatrixAt(nearCount++, dummy.matrix);
        }
      }
      near.count = nearCount;
      far.count = farCount;
      near.instanceMatrix.needsUpdate = far.instanceMatrix.needsUpdate = true;
    },
    snapshot: () => ({
      count,
      biconcave: true,
      direction: 'forward-blood-flow',
      nearTriangles: near.geometry.index.count / 3,
      farTriangles: far.geometry.index.count / 3,
    }),
  };
}
// Background molecules cross the same thin barrier in opposite directions.
// Each O2 is a pair of O atoms; each CO2 has one C and two O atoms.
export function buildCounterDiffusion(landmarks) {
  const group = new T.Group(),
    oxygen = new T.InstancedMesh(
      new T.SphereGeometry(0.024, 8, 6),
      new T.MeshLambertMaterial({ color: 0xe86d73 }),
      24,
    ),
    carbonO = new T.InstancedMesh(oxygen.geometry, oxygen.material, 16),
    carbonC = new T.InstancedMesh(
      new T.SphereGeometry(0.022, 8, 6),
      new T.MeshLambertMaterial({ color: 0x433c48 }),
      8,
    ),
    d = new T.Object3D();
  group.add(oxygen, carbonO, carbonC);
  group.name = 'opposite-alveolar-gas-diffusion';
  for (const m of [oxygen, carbonO, carbonC]) m.frustumCulled = false;
  let last = -Infinity;
  return {
    group,
    update(time) {
      if (time - last < 0.05 && time >= last) return;
      last = time;
      for (const [kind, count] of [
        ['oxygen', 12],
        ['carbon', 8],
      ])
        for (let i = 0; i < count; i++) {
          const phase = (time * 0.14 + i / count) % 1,
            u = kind === 'oxygen' ? phase : 1 - phase,
            point = landmarks.epithelium
              .clone()
              .addScaledVector(landmarks.outward, -0.35 + u * 0.7)
              .add(V(0, Math.sin(i * 2.399) * 0.33, Math.cos(i * 2.399) * 0.33)),
            scale = Math.min(1, phase * 10, (1 - phase) * 10);
          for (let j = 0; j < 2; j++) {
            d.position.copy(point).add(V(0, (j - 0.5) * (kind === 'oxygen' ? 0.048 : 0.11), 0));
            d.scale.setScalar(scale);
            d.updateMatrix();
            (kind === 'oxygen' ? oxygen : carbonO).setMatrixAt(i * 2 + j, d.matrix);
          }
          if (kind === 'carbon') {
            d.position.copy(point);
            d.updateMatrix();
            carbonC.setMatrixAt(i, d.matrix);
          }
        }
      for (const m of [oxygen, carbonO, carbonC]) m.instanceMatrix.needsUpdate = true;
    },
    snapshot: () => ({
      oxygen: 'alveolus-to-blood',
      carbonDioxide: 'blood-to-alveolus',
      oxygenMolecules: 12,
      carbonDioxideMolecules: 8,
    }),
  };
}
