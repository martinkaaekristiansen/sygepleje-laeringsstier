import * as T from './three.module.min.js';
import { caecumSurfacePoint } from './digestion-caecum.js';
import { lumenRadius } from './digestion-anatomy.js';
export const MICROBIOTA_REGIONS = Object.freeze([
  'caecum',
  'ascending',
  'transverse',
  'descending',
  'sigmoid',
]);
export const MICROBIOTA_INFORMATION = {
  caecum:
    'Caecum har en blind bund; appendix er et blindt vedhæng. Tyktarmens bakterier kaldes mikrobiota.',
  ascending:
    'Tyktarmen optager vand. Bakterier omsætter kostfibre, som vores egne enzymer ikke kan spalte.',
  transverse:
    'Bakterier fermenterer kostfibre til kortkædede fedtsyrer, som tarmens celler kan udnytte.',
  descending:
    'Indholdet føres ned i venstre side. Nogle tarmbakterier danner K-vitamin og visse B-vitaminer.',
};
export function microbeSway(time, phase) {
  return [
    0.018 * Math.sin(time * 0.45 + phase),
    0.012 * Math.cos(time * 0.38 + phase),
    0.018 * Math.sin(time * 0.31 + phase),
  ];
}
export function buildMicrobiota(id, built, motility = null) {
  if (!MICROBIOTA_REGIONS.includes(id)) return null;
  const group = new T.Group();
  group.name = 'normal-colonic-microbiota';
  const clock = { value: 0 },
    anchors = [],
    palette = [0x83aaa0, 0xb5a7bc, 0xb4ae80],
    dummy = new T.Object3D();
  const curved = new T.CatmullRomCurve3([
    new T.Vector3(-0.06, -0.07, 0),
    new T.Vector3(0.025, 0, 0),
    new T.Vector3(-0.015, 0.08, 0),
  ]);
  const geometries = [
    new T.CapsuleGeometry(0.035, 0.12, 2, 6),
    new T.SphereGeometry(0.055, 8, 6),
    new T.TubeGeometry(curved, 6, 0.027, 6, false),
  ];
  const meshes = geometries.map((geometry, kind) => {
    const material = new T.MeshLambertMaterial({ color: 0xffffff });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.microbeTime = clock;
      shader.vertexShader =
        'attribute float microbePhase; uniform float microbeTime;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float turn=.07*sin(microbeTime*.27+microbePhase);
        transformed.xy=mat2(cos(turn),-sin(turn),sin(turn),cos(turn))*transformed.xy;
        transformed+=vec3(.018*sin(microbeTime*.45+microbePhase),.012*cos(microbeTime*.38+microbePhase),.018*sin(microbeTime*.31+microbePhase));`,
      );
    };
    material.customProgramCacheKey = () => 'normal-microbiota-v1';
    const entries = [],
      phases = [],
      mesh = new T.InstancedMesh(geometry, material, 32);
    for (let i = 0; i < 32; i++) {
      const index = i * 3 + kind,
        u = 0.06 + 0.82 * ((index + 0.5) / 96) ** 1.4,
        a = index * 2.3999632297;
      let axis,
        p,
        parameter = u;
      if (id === 'caecum') {
        const y = -3 + u * 6.5;
        axis = new T.Vector3(0.35, y, -6.2);
        p = caecumSurfacePoint(y, a);
        parameter = (y + 4.2) / 9;
      } else {
        const j = Math.min(
          built.frames.normals.length - 1,
          Math.round(u * (built.frames.normals.length - 1)),
        );
        axis = built.path.getPointAt(u);
        p = axis
          .clone()
          .addScaledVector(built.frames.normals[j], Math.cos(a) * lumenRadius(id, u, a))
          .addScaledVector(built.frames.binormals[j], Math.sin(a) * lumenRadius(id, u, a));
      }
      p.lerp(axis, 0.18 + 0.12 * (0.5 + 0.5 * Math.sin(index * 3.1)));
      dummy.position.copy(p);
      dummy.rotation.set(index * 0.61, index * 0.37, index * 0.83);
      dummy.scale.setScalar(0.85 + 0.25 * (0.5 + 0.5 * Math.sin(index * 7.1)));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, new T.Color(palette[(i + kind) % palette.length]));
      entries.push({ u: parameter, axis: axis.toArray() });
      phases.push(index * 1.73);
      anchors.push({ kind, u: parameter, point: p.toArray(), axis: axis.toArray(), radius: 0.14 });
    }
    geometry.setAttribute(
      'microbePhase',
      new T.InstancedBufferAttribute(new Float32Array(phases), 1),
    );
    if (motility) {
      motility.instances(geometry, entries);
      motility.material(material, true);
    }
    mesh.computeBoundingSphere();
    mesh.boundingSphere.radius += 0.7;
    mesh.userData.microbiotaShape = ['rod', 'coccus', 'curved-rod'][kind];
    group.add(mesh);
    return mesh;
  });
  group.userData = { kind: 'normal-microbiota', count: 96, anchors };
  return { group, meshes, count: 96, clock, anchors };
}
