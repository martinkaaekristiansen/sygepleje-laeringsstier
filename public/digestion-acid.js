import * as T from './three.module.min.js';
import { stomachPoint } from './digestion-anatomy.js';
import { gastricFrame } from './digestion-gastric.js';
import { anatomicalLabel } from './digestion-anatomy-labels.js';

// HCl dissociates in gastric fluid. These are teaching symbols for H+ and Cl-,
// not enzymes, and do not cut or alter any protein bond.
export function buildAcidSecretion({ target, motility, labels = true }) {
  const group = new T.Group();
  group.name = 'parietal-acid-secretion';
  const sources = [stomachPoint(0.4, 0.12), stomachPoint(0.58, 0.55)];
  const meshes = [0xf5bd65, 0x89dac6].map((color) => {
    const mesh = new T.InstancedMesh(
      new T.SphereGeometry(0.075, 8, 6),
      new T.MeshBasicMaterial({ color }),
      16,
    );
    mesh.frustumCulled = false;
    group.add(mesh);
    return mesh;
  });
  if (labels) {
    group.add(
      anatomicalLabel(
        'Parietalceller · saltsyre',
        sources[0].clone().lerp(target, 0.2).toArray(),
        2.5,
      ),
    );
    group.add(
      anatomicalLabel(
        'H⁺ + Cl⁻',
        target
          .clone()
          .add(new T.Vector3(0, 0.8, 0))
          .toArray(),
        1.2,
      ),
    );
  }
  const dummy = new T.Object3D();
  function update(time) {
    const origins = sources.map((p) => {
      const frame = gastricFrame(p);
      return motility ? motility.point(p, frame.u, frame.axis) : p.clone();
    });
    meshes.forEach((mesh, ion) => {
      for (let i = 0; i < mesh.count; i++) {
        const f = (time * 0.23 + i * 0.618) % 1;
        dummy.position.copy(origins[i % 2]).lerp(target, 0.025 + 0.9 * f);
        dummy.position.x += (ion ? 1 : -1) * 0.09 + Math.sin(i * 2 + f * 4) * 0.08;
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    });
    return {
      kind: 'parietal-hcl',
      ions: ['H⁺', 'Cl⁻'],
      enzyme: false,
      particles: 32,
      sources: sources.map((p) => p.toArray()),
    };
  }
  update(0);
  return { group, meshes, update };
}
