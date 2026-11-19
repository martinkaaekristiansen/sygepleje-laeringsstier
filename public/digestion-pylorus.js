import * as T from './three.module.min.js';
export const PYLORIC_OUTER_RADIUS = 0.98;
export function pyloricRadius(radius, aperture) {
  return aperture + ((radius - 0.54) / (0.98 - 0.54)) * (0.98 - aperture);
}
export function pyloricAperture(phase, distance = Infinity) {
  const pulse = phase > 0.88 ? (1 - phase) / 0.12 : 0,
    passage = 1 - T.MathUtils.smoothstep(Math.abs(distance), 0.5, 2.5);
  return 0.3 + 0.24 * Math.max(pulse, passage);
}
export function buildPyloricGate() {
  const aperture = { value: 0.3 },
    material = new T.MeshStandardMaterial({ color: 0xd6979d, roughness: 0.5, side: T.DoubleSide });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.pyloricAperture = aperture;
    shader.vertexShader = 'uniform float pyloricAperture;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <beginnormal_vertex>',
      `#include <beginnormal_vertex>
   float r=length(position.xy);vec2 radial=position.xy/r;
   float nr=pyloricAperture+(r-.54)/.44*(.98-pyloricAperture);
   vec2 normalRadial=radial*dot(objectNormal.xy,radial);
   objectNormal=normalize(vec3(normalRadial/((.98-pyloricAperture)/.44)+(objectNormal.xy-normalRadial)/(nr/r),objectNormal.z));`,
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
   float oldRadius=length(transformed.xy);
   transformed.xy*=(pyloricAperture+(oldRadius-.54)/.44*(.98-pyloricAperture))/oldRadius;`,
    );
  };
  material.customProgramCacheKey = () => 'anatomical-pylorus-fixed-outer-collar-v1';
  const mesh = new T.Mesh(new T.TorusGeometry(0.76, 0.22, 12, 48), material);
  mesh.name = 'anatomical-pyloric-sphincter';
  mesh.userData.aperture = aperture;
  return mesh;
}
