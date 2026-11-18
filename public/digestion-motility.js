import { gastricFrame } from './digestion-gastric.js';
import * as T from './three.module.min.js';

// Rates are pedagogically scaled; strengths are relative radius changes.
// Gastric waves use about three cycles/minute; colon mass events are infrequent
// relative to local haustral mixing, with a compressed classroom timescale. Segmentation mixes locally, whereas the moving band propels contents.
export const MOTILITY = {
  oesophagus: { period: 9, amplitude: 0.3, segments: 0, mixing: 0, kind: 'propulsive' },
  stomach: {
    width: 0.16,
    period: 20,
    mixPeriod: 80,
    amplitude: 0.17,
    segments: 1,
    mixing: 0.025,
    kind: 'antral-retropulsion',
  },
  duodenum: { period: 12, amplitude: 0.09, segments: 4, mixing: 0.065, kind: 'segmentation' },
  jejunum: { period: 14, amplitude: 0.075, segments: 5, mixing: 0.065, kind: 'segmentation' },
  ileum: { period: 18, amplitude: 0.07, segments: 4, mixing: 0.045, kind: 'segmentation' },
  caecum: { period: 28, amplitude: 0.025, segments: 2, mixing: 0.025, kind: 'local-mixing' },
  ascending: {
    period: 120,
    mixPeriod: 18,
    amplitude: 0.09,
    segments: 5,
    mixing: 0.045,
    kind: 'haustral',
  },
  transverse: {
    period: 150,
    mixPeriod: 18,
    amplitude: 0.09,
    segments: 5,
    mixing: 0.045,
    kind: 'haustral',
  },
  descending: {
    period: 150,
    mixPeriod: 18,
    amplitude: 0.09,
    segments: 5,
    mixing: 0.04,
    kind: 'haustral',
  },
  sigmoid: {
    period: 120,
    mixPeriod: 18,
    amplitude: 0.09,
    segments: 4,
    mixing: 0.04,
    kind: 'haustral',
  },
  rectum: { period: 22, amplitude: 0.035, segments: 1, mixing: 0.012, kind: 'reservoir' },
};
const clamp = T.MathUtils.clamp;
export function motionParameters(id, u) {
  const c = MOTILITY[id];
  if (!c) return [u, 0, 0, 0];
  if (id === 'stomach') {
    const distal = T.MathUtils.smoothstep(u, 0.2, 0.85);
    const envelope = 0.08 + 0.92 * distal;
    // Low, slow proximal tone/accommodation is independent of the antral wave.
    return [u, (-0.6 * (1 - distal)) / envelope, (-0.4 * (1 - distal)) / envelope, envelope];
  }
  const phase = Math.cos(u * Math.PI * 2 * c.segments);
  const a = ((1 + phase) / 2) ** 3,
    b = ((1 - phase) / 2) ** 3;
  const ends = clamp(u / 0.045, 0, 1) * clamp((1 - u) / 0.045, 0, 1);
  return [u, a, b, ends];
}
export function motionWeights(id, seconds, enabled = true) {
  const c = MOTILITY[id];
  if (!c || !enabled) return [0, 0, 0, 0];
  const cycle = (((seconds / c.period) % 1) + 1) % 1;
  const mix = 0.5 + 0.5 * Math.sin((seconds * Math.PI * 2) / (c.mixPeriod || c.period * 0.55));
  // Colon has local haustral mixing and a brief mass movement once per cycle.
  const elapsed = ((seconds % c.period) + c.period) % c.period;
  const active = c.kind !== 'haustral' || elapsed < 14;
  const center = c.kind === 'haustral' ? Math.min(1, elapsed / 14) : cycle;
  const mass = c.kind === 'haustral' ? (active ? Math.sin(center * Math.PI) : 0) : 1;
  return [center, c.mixing * mix, c.mixing * (1 - mix), c.amplitude * mass];
}
export function motionScale(parameters, weights, width = 0.11) {
  const [u, a, b, envelope] = parameters,
    [center, mixA, mixB, strength] = weights;
  const band = Math.max(0, 1 - ((u - center) / width) ** 2) ** 2;
  return 1 - envelope * (band * strength + a * mixA + b * mixB);
}
const glsl = `
attribute vec4 digestParams;
attribute vec3 digestAxis;
uniform vec4 digestMotion;
uniform float digestWidth;
varying vec3 digestPosition;
float digestScale(vec4 params) {
  float distanceAlong=(params.x-digestMotion.x)/digestWidth;
  float band=max(0.0,1.0-distanceAlong*distanceAlong); band*=band;
  return 1.0-params.w*(band*digestMotion.w+params.y*digestMotion.y+params.z*digestMotion.z);
}
vec3 digestDeform(vec3 p) {
  return digestAxis+(p-digestAxis)*digestScale(digestParams);
}
`;
export function createMotility(id, built) {
  if (!MOTILITY[id]) return null;
  const clock = { value: new T.Vector4(0, 0, 0, 0) };
  function geometryAttributes(geometry) {
    const vertices = geometry.attributes.position;
    const parameters = [],
      axes = [],
      gradients = [],
      derivatives = [];
    for (let i = 0; i < vertices.count; i++) {
      const p = new T.Vector3().fromBufferAttribute(vertices, i);
      const gastric = id === 'stomach' ? gastricFrame(p, true) : null;
      const u =
        id === 'stomach'
          ? gastric.u
          : id === 'caecum'
            ? clamp((p.y + 4.2) / 9, 0, 1)
            : Math.floor(i / (geometry.userData.around + 1)) / geometry.userData.along;
      const axis =
        id === 'stomach'
          ? gastric.axis
          : id === 'caecum'
            ? new T.Vector3(0.35, p.y, -6.2)
            : built.path.getPointAt(u);
      const params = motionParameters(id, u);
      if (id === 'caecum') params[3] *= clamp(1 - Math.max(0, p.distanceTo(axis) - 3.4), 0, 1);
      parameters.push(...params);
      axes.push(...axis.toArray());
      if (gastric) {
        gradients.push(...gastric.gradient.toArray());
        derivatives.push(...gastric.derivative.toArray());
      }
    }
    geometry.setAttribute('digestParams', new T.Float32BufferAttribute(parameters, 4));
    geometry.setAttribute('digestAxis', new T.Float32BufferAttribute(axes, 3));
    if (id === 'stomach') {
      geometry.setAttribute('digestGradient', new T.Float32BufferAttribute(gradients, 3));
      geometry.setAttribute('digestDerivative', new T.Float32BufferAttribute(derivatives, 3));
      geometry.computeBoundingSphere();
      geometry.boundingSphere.radius += 0.25; // bounded accommodation, computed only at construction
    }
  }
  geometryAttributes(built.geometry);
  return {
    geometry: geometryAttributes,
    id,
    kind: MOTILITY[id].kind,
    clock,
    update(seconds, enabled = true) {
      clock.value.fromArray(motionWeights(id, seconds, enabled));
    },
    point(p, u, axis) {
      return p
        .clone()
        .sub(axis)
        .multiplyScalar(
          motionScale(motionParameters(id, u), clock.value.toArray(), MOTILITY[id].width),
        )
        .add(axis);
    },
    instances(geometry, entries) {
      geometry.setAttribute(
        'digestParams',
        new T.InstancedBufferAttribute(
          new Float32Array(entries.flatMap((e) => motionParameters(id, e.u))),
          4,
        ),
      );
      geometry.setAttribute(
        'digestAxis',
        new T.InstancedBufferAttribute(new Float32Array(entries.flatMap((e) => e.axis)), 3),
      );
    },
    material(material, instanced = false) {
      const previous = material.onBeforeCompile.bind(material),
        key = material.customProgramCacheKey.bind(material);
      const programKey = key();
      material.onBeforeCompile = (shader, renderer) => {
        previous(shader, renderer);
        shader.uniforms.digestMotion = clock;
        shader.vertexShader =
          glsl.replace(
            'uniform float digestWidth;',
            `const float digestWidth = ${MOTILITY[id].width || 0.11};`,
          ) + shader.vertexShader;
        if (id === 'stomach') {
          shader.vertexShader =
            `attribute vec3 digestGradient; attribute vec3 digestDerivative;
          vec4 gastricParams(float u) { float d=smoothstep(0.2,0.85,u); float e=0.08+0.92*d; return vec4(u,-0.6*(1.0-d)/e,-0.4*(1.0-d)/e,e); }
` + shader.vertexShader;
          // Inverse-transpose of the deformation Jacobian. The continuous field
          // keeps smooth normals on both wall and folds as a wave travels past.
          shader.vertexShader = shader.vertexShader.replace(
            '#include <beginnormal_vertex>',
            `#include <beginnormal_vertex>
            float s=digestScale(digestParams);
            float slope=(digestScale(gastricParams(digestParams.x+0.001))-digestScale(gastricParams(digestParams.x-0.001)))/0.002;
            vec3 v=(1.0-s)*digestDerivative+(position-digestAxis)*slope;
            objectNormal=normalize(objectNormal-digestGradient*dot(v,objectNormal)/max(0.1,s+dot(digestGradient,v)));
          `,
          );
        }
        shader.vertexShader = instanced
          ? shader.vertexShader.replace(
              '#include <project_vertex>',
              `
          digestPosition=digestDeform((instanceMatrix*vec4(transformed,1.0)).xyz);
          vec4 mvPosition=vec4(digestPosition,1.0);
          mvPosition=modelViewMatrix*mvPosition;
          gl_Position=projectionMatrix*mvPosition;
        `,
            )
          : shader.vertexShader.replace(
              '#include <begin_vertex>',
              '#include <begin_vertex>\ntransformed=digestDeform(transformed);digestPosition=transformed;',
            );
      };
      material.customProgramCacheKey = () =>
        programKey +
        ':digest-motility-v2:' +
        instanced +
        (id === 'stomach' ? ':gastric-normals' : ':radial');
    },
  };
}

export function flowProgress(id, seconds, index) {
  const c = MOTILITY[id];
  const speed =
    id === 'oesophagus' ? 0.075 : c?.kind === 'haustral' ? 0.009 : id === 'stomach' ? 0.025 : 0.018;
  const drift = seconds * speed + index * 0.61803398875;
  const mix = c?.kind === 'segmentation' ? Math.sin(seconds * 0.65 + index) * 0.05 : 0;
  return 0.06 + ((((drift + mix) % 1) + 1) % 1) * 0.84;
}
