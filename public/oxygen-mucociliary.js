import * as T from './three.module.min.js';
import { anatomicalLabel } from './digestion-anatomy-labels.js';
export const CILIARY_PERIOD = 1.1,
  MUCUS_SPEED = 0.035;
const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z),
  smooth = (x) => {
    x = Math.max(0, Math.min(1, x));
    return x * x * (3 - 2 * x);
  };
export function ciliaryBeat(time, phase = 0) {
  const u = (((time / CILIARY_PERIOD + phase) % 1) + 1) % 1;
  return u < 0.28 ? 0.7 - 1.4 * smooth(u / 0.28) : -0.7 + 1.4 * smooth((u - 0.28) / 0.72);
}
export function airwayRadius(part, u) {
  return T.MathUtils.lerp(part.startRadius ?? part.radius, part.endRadius ?? part.radius, u);
}
export function nasalClearancePart(part) {
  return {
    ...part,
    id: 'nasal-clearance',
    path: new T.CatmullRomCurve3(part.path.getSpacedPoints(80).reverse()),
    startRadius: part.endRadius,
    endRadius: part.startRadius,
    ciliaRange: [0.35, 0.8],
    mucusRange: [0.35, 0.8],
    mucusFrames: undefined,
  };
}
export function mucusParticleAt(
  part,
  time,
  { origin = 0, initialU = 0.76, angle = 0, cycle = false } = {},
) {
  const range = part.mucusRange || [0, 1],
    span = range[1] - range[0];
  let u = initialU - MUCUS_SPEED * (time - origin);
  const visible = cycle || (u >= range[0] && u <= range[1]);
  if (cycle) u = range[0] + ((((u - range[0]) % span) + span) % span);
  u = T.MathUtils.clamp(u, range[0], range[1]);
  const frames = (part.mucusFrames ??= part.path.computeFrenetFrames(80, false)),
    j = Math.min(80, Math.round(u * 80)),
    inward = frames.normals[j]
      .clone()
      .multiplyScalar(Math.cos(angle))
      .addScaledVector(frames.binormals[j], Math.sin(angle)),
    height = Math.min(0.1, part.radius * 0.18),
    r = airwayRadius(part, u) - height - 0.018;
  return {
    u,
    visible,
    point: part.path.getPointAt(u).addScaledVector(inward, r),
    radial: r,
    inward: inward.negate(),
    tangent: part.path.getTangentAt(u),
    direction: 'toward-pharynx',
    boundTo: 'mucus',
    height,
  };
}
export function ciliaCount(kind) {
  return (
    {
      nose: 384,
      trachea: 1152,
      bronchus: 576,
      bronchiole: 192,
      terminal: 64,
      respiratory: 0,
      duct: 0,
      sac: 0,
      alveolus: 0,
    }[kind] || 0
  );
}
export function buildMucociliaryField(part) {
  const count = ciliaCount(part.kind);
  if (!count) return null;
  const group = new T.Group();
  group.name = 'mucociliary-' + part.id;
  const clock = { value: 0 },
    highlight = { value: 0 },
    height = Math.min(0.1, part.radius * 0.18),
    frames = part.path.computeFrenetFrames(80, false),
    sections = [],
    dummy = new T.Object3D(),
    basis = new T.Matrix4(),
    cols = 32,
    rows = count / cols;
  const material = new T.MeshLambertMaterial({ color: 0xefcdba, side: T.DoubleSide });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.ciliaryTime = clock;
    shader.vertexShader =
      'attribute float ciliaryPhase; uniform float ciliaryTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
 float u=fract(ciliaryTime/${CILIARY_PERIOD.toFixed(3)}+ciliaryPhase);
 float f=u<.28?u/.28:(u-.28)/.72;f=f*f*(3.-2.*f);
 float angle=u<.28?.7-1.4*f:-.7+1.4*f;
 float bend=clamp(position.y/${height.toFixed(5)},0.,1.);
 transformed.z+=sin(angle)*position.y*bend;
 transformed.y*=1.-.22*abs(sin(angle))*bend;`,
    );
  };
  material.customProgramCacheKey = () => `oxygen-cilium-${height.toFixed(5)}`;
  const sectionRows = Math.max(1, Math.ceil(rows / 6));
  for (let start = 0; start < rows; start += sectionRows) {
    const end = Math.min(rows, start + sectionRows),
      n = (end - start) * cols,
      range = part.ciliaRange || [0.025, 0.975],
      uMid = range[0] + ((range[1] - range[0]) * (start + end)) / (2 * rows),
      center = part.path.getPointAt(uMid),
      root = new T.Group();
    root.position.copy(center);
    const nearGeo = new T.CylinderGeometry(height * 0.035, height * 0.06, height, 5, 1).translate(
        0,
        height / 2,
        0,
      ),
      farGeo = new T.PlaneGeometry(height * 0.075, height).translate(0, height / 2, 0),
      phases = [];
    const near = new T.InstancedMesh(nearGeo, material, n),
      far = new T.InstancedMesh(farGeo, material, n);
    for (let row = start; row < end; row++)
      for (let col = 0; col < cols; col++) {
        const k = (row - start) * cols + col,
          range = part.ciliaRange || [0.025, 0.975],
          u = range[0] + (range[1] - range[0]) * ((row + 0.5) / rows),
          a = (col / cols) * Math.PI * 2 + (row % 2) * 0.07,
          j = Math.round(u * 80),
          out = frames.normals[j]
            .clone()
            .multiplyScalar(Math.cos(a))
            .addScaledVector(frames.binormals[j], Math.sin(a)),
          inward = out.clone().negate(),
          tangent = part.path.getTangentAt(u),
          x = inward.clone().cross(tangent).normalize();
        basis.makeBasis(x, inward, tangent);
        dummy.quaternion.setFromRotationMatrix(basis);
        dummy.position
          .copy(part.path.getPointAt(u))
          .addScaledVector(out, airwayRadius(part, u) - 0.008)
          .sub(center);
        dummy.updateMatrix();
        near.setMatrixAt(k, dummy.matrix);
        far.setMatrixAt(k, dummy.matrix);
        phases.push(u * 0.85 + col * 0.026);
      }
    for (const mesh of [near, far]) {
      mesh.geometry.setAttribute(
        'ciliaryPhase',
        new T.InstancedBufferAttribute(new Float32Array(phases), 1),
      );
      mesh.computeBoundingSphere();
      mesh.boundingSphere.radius += height * 1.5;
      root.add(mesh);
    }
    far.visible = false;
    group.add(root);
    sections.push({ root, near, far, center, count: n });
  }
  const range = part.mucusRange || [0, 1],
    gelPath = new T.CatmullRomCurve3(
      Array.from({ length: 81 }, (_, i) =>
        part.path.getPointAt(T.MathUtils.lerp(range[0], range[1], i / 80)),
      ),
    ),
    gelGeo = new T.TubeGeometry(gelPath, 80, 1, 24, false),
    p = gelGeo.attributes.position,
    normals = gelGeo.attributes.normal;
  for (let row = 0; row <= 80; row++) {
    const u = T.MathUtils.lerp(range[0], range[1], row / 80),
      c = part.path.getPointAt(u),
      r = airwayRadius(part, u) - height - 0.012;
    for (let col = 0; col <= 24; col++) {
      const k = row * 25 + col;
      p.setXYZ(k, c.x + normals.getX(k) * r, c.y + normals.getY(k) * r, c.z + normals.getZ(k) * r);
    }
  }
  gelGeo.computeVertexNormals();
  const gelMaterial = new T.MeshLambertMaterial({
    color: 0x94c3ba,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    side: T.DoubleSide,
  });
  gelMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.mucusTime = clock;
    shader.uniforms.mucusHighlight = highlight;
    shader.fragmentShader =
      'uniform float mucusTime; uniform float mucusHighlight;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
 float stream=pow(.5+.5*sin((vMapUv.x+mucusTime*${MUCUS_SPEED / (range[1] - range[0])})*80.),12.);
 diffuseColor.rgb+=vec3(.08,.15,.10)*stream*(1.+mucusHighlight);`,
    );
  };
  // Define UVs even without a texture; USE_MAP is unnecessary for the pattern.
  gelMaterial.onBeforeCompile = ((prior) => (shader) => {
    prior(shader);
    shader.vertexShader = 'varying vec2 mucusUv;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <uv_vertex>',
      '#include <uv_vertex>\n mucusUv=uv;',
    );
    shader.fragmentShader =
      'varying vec2 mucusUv;\n' + shader.fragmentShader.replace('vMapUv.x', 'mucusUv.x');
  })(gelMaterial.onBeforeCompile);
  gelMaterial.customProgramCacheKey = () => 'oxygen-mucus-proximal-'+(range[1]-range[0]).toFixed(5);
  const gel = new T.Mesh(gelGeo, gelMaterial);
  group.add(gel);
  const liquidGeo = gelGeo.clone(),
    lp = liquidGeo.attributes.position;
  for (let row = 0; row <= 80; row++) {
    const u = T.MathUtils.lerp(range[0], range[1], row / 80),
      c = part.path.getPointAt(u),
      r = airwayRadius(part, u) - height * 0.35;
    for (let col = 0; col <= 24; col++) {
      const k = row * 25 + col,
        q = V().fromBufferAttribute(lp, k).sub(c).normalize().multiplyScalar(r).add(c);
      lp.setXYZ(k, q.x, q.y, q.z);
    }
  }
  liquidGeo.computeVertexNormals();
  const liquid = new T.Mesh(
    liquidGeo,
    new T.MeshLambertMaterial({
      color: 0xc4dedb,
      transparent: true,
      opacity: 0.055,
      depthWrite: false,
      side: T.DoubleSide,
    }),
  );
  group.add(liquid);
  const bacteriaGeometry = [
      new T.CapsuleGeometry(0.007, 0.024, 2, 6),
      new T.SphereGeometry(0.011, 8, 6),
    ],
    bacteria = bacteriaGeometry.map(
      (geo, i) =>
        new T.InstancedMesh(geo, new T.MeshLambertMaterial({ color: i ? 0xc9b487 : 0x78c6bd }), 18),
    );
  bacteria.forEach((m) => {
    m.frustumCulled = false;
    group.add(m);
  });
  const witness = new T.Mesh(
    new T.CapsuleGeometry(0.014, 0.05, 3, 8),
    new T.MeshStandardMaterial({
      color: 0x66d9c9,
      emissive: 0x1e7167,
      emissiveIntensity: 0.45,
      roughness: 0.5,
    }),
  );
  witness.name = 'bacterium-bound-to-mucus';
  witness.userData.boundTo = 'mucus';
  const label = anatomicalLabel('Bakterie i slimlaget', [0, 0.06, 0], 1.6, {
    target: witness,
    priority: 110,
  });
  witness.add(label);
  group.add(witness);
  let lastParticles = -Infinity,
    diagnostic = null;
  return {
    group,
    count,
    sections,
    witness,
    clock,
    update(
      time,
      camera,
      { origin = 0, activeWitness = false, emphasized = false, lod = true } = {},
    ) {
      clock.value = time;
      highlight.value = emphasized ? 1 : 0;
      for (const s of sections) {
        const near = !lod || camera.position.distanceTo(s.center) < 3;
        s.near.visible = near;
        s.far.visible = !near;
      }
      if (time - lastParticles > 0.07 || time < lastParticles) {
        lastParticles = time;
        for (let kind = 0; kind < 2; kind++) {
          const mesh = bacteria[kind];
          for (let i = 0; i < 18; i++) {
            const q = mucusParticleAt(part, time, {
              initialU: i / 18 + kind * 0.09,
              angle: i * 2.399 + kind,
              cycle: true,
            });
            dummy.position.copy(q.point);
            dummy.quaternion.setFromUnitVectors(V(0, 1, 0), q.tangent);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
          }
          mesh.instanceMatrix.needsUpdate = true;
        }
      }
      const q = mucusParticleAt(part, time, { origin, angle: 0.8 });
      witness.visible = activeWitness && q.visible;
      witness.position.copy(q.point);
      witness.quaternion.setFromUnitVectors(V(0, 1, 0), q.tangent);
      diagnostic = {
        count,
        direction: q.direction,
        boundTo: q.boundTo,
        u: q.u,
        radial: q.radial,
        height,
        point: q.point.toArray(),
        visible: witness.visible,
        worldTime: time,
        instance: witness.uuid,
      };
      return diagnostic;
    },
    snapshot: () => diagnostic,
  };
}
