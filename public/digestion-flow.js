import { gastricFlowPose } from './digestion-gastric.js';
import * as T from './three.module.min.js';
import { flowProgress } from './digestion-motility.js';
// One draw call replaces the old individual droplet meshes. Geometry/material
// are reused; the 26 matrices follow the real curved lumen rather than random z.
export function lumenFlow(id, built) {
  const colon = [
    'caecum',
    'ascending',
    'transverse',
    'descending',
    'sigmoid',
    'rectum',
    'anus',
  ].includes(id);
  const geometry = new T.SphereGeometry(colon || id === 'stomach' ? 0.08 : 0.045, 7, 5);
  const mesh = new T.InstancedMesh(
    geometry,
    new T.MeshStandardMaterial({
      color: colon ? 0x80b9a1 : id === 'stomach' ? 0xf5cf7a : 0xf0c7b7,
      roughness: 0.55,
    }),
    26,
  );
  const dummy = new T.Object3D(),
    point = new T.Vector3(),
    normal = new T.Vector3(),
    binormal = new T.Vector3();
  mesh.frustumCulled = false;
  return {
    mesh,
    update(seconds) {
      for (let i = 0; i < mesh.count; i++) {
        const u = flowProgress(id, seconds, i),
          k = Math.min(
            built.frames.normals.length - 1,
            Math.round(u * (built.frames.normals.length - 1)),
          );
        if (id === 'stomach') {
          point.copy(gastricFlowPose(seconds, i).point);
        } else if (id === 'caecum') {
          point.set(
            0.2 + Math.cos(i * 2.4 + seconds * 0.14) * 1.3,
            -2 + u * 5,
            -6.2 + Math.sin(i * 2.4 + seconds * 0.14) * 1.2,
          );
          const entry = (seconds / 28 + i * 0.02) % 1;
          if (i < 3 && entry < 0.14) point.set(4.4 - (entry / 0.14) * 3.5, 0.65, -6);
        } else {
          point.copy(built.path.getPointAt(u));
          normal.copy(built.frames.normals[k]);
          binormal.copy(built.frames.binormals[k]);
          point
            .addScaledVector(normal, Math.cos(i * 2.4) * 0.8)
            .addScaledVector(binormal, Math.sin(i * 2.4) * 0.8);
        }
        dummy.position.copy(point);
        dummy.scale.set(1, colon ? 1.8 : 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
