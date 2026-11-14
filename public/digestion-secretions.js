import { relativeActivity } from './digestion-engine.js';
import * as T from './three.module.min.js';
export function addSecretions(parent, stage, character) {
  const group = new T.Group();
  group.name = 'secretions';
  parent.add(group);
  const systems = [];
  function tube(points, color, r = 0.08) {
    const c = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p)));
    const m = new T.Mesh(
      new T.TubeGeometry(c, 20, r, 8, false),
      new T.MeshStandardMaterial({ color, roughness: 0.5 }),
    );
    group.add(m);
    return m;
  }
  function gland(p, color, size) {
    const g = new T.Mesh(
      new T.SphereGeometry(size, 12, 10),
      new T.MeshStandardMaterial({ color, transparent: true, opacity: 0.65 }),
    );
    g.position.fromArray(p);
    g.scale.set(0.6, 1, 1.4);
    group.add(g);
  }
  function flow(from, to, color, count = 24, protein = false, acid = false) {
    const geometry = protein
      ? new T.TorusKnotGeometry(0.045, 0.018, 18, 5)
      : new T.SphereGeometry(0.045, 7, 5);
    const mat = new T.MeshStandardMaterial({
      color,
      roughness: 0.3,
      transparent: true,
      opacity: 0.8,
    });
    const m = new T.InstancedMesh(geometry, mat, count);
    group.add(m);
    systems.push({
      m,
      from: new T.Vector3(...from),
      to: new T.Vector3(...to),
      color,
      protein,
      acid,
    });
  }
  if (stage.id === 'mouth') {
    for (const side of [-1, 1]) {
      gland([side * 3.5, 0.5, -2], 0xc38ea2, 0.65);
      tube(
        [
          [side * 3.5, 0.5, -2],
          [side * 2.9, 0.8, -1.8],
          [side * 2.2, 0.8, -1.3],
        ],
        0x8acfd5,
      );
      flow([side * 2.2, 0.8, -1.3], [0, -0.4, -4], 0x82cde2);
      gland([side * 1.9, -2.6, -1.4], 0xad89ba, 0.5);
      tube(
        [
          [side * 1.9, -2.6, -1.4],
          [side * 0.6, -1.5, -0.8],
        ],
        0x8acfd5,
      );
      flow([side * 0.6, -1.5, -0.8], [0, -0.3, -3.4], 0x82cde2, 16);
      gland([side * 1.2, -2, -0.2], 0xc6a0bb, 0.38);
      for (let i = 0; i < 3; i++)
        flow([side * (0.8 + i * 0.25), -1.45, -0.5 - i * 0.3], [0, -0.2, -3.2], 0xa3d7df, 7);
    }
    if (character === 'stanley') flow([2.2, 0.8, -1.3], [0, -0.2, -4.5], 0x65d6ec, 10, true);
    if (character === 'trine') flow([0.5, -1.3, -1.8], [0, -0.2, -4.5], 0xf28a57, 3, true);
  }
  if (stage.id === 'stomach') {
    for (const side of [-1, 1]) {
      gland([side * 4, 0, -7], side < 0 ? 0xdfa15f : 0xb7a1ca, 0.32);
      flow([side * 3.8, -0.4, -7], [0, -0.6, -6.5], 0xf2aa64, 20, false, true);
    }
    if (character === 'poul') flow([3.8, -0.2, -7], [0, -0.2, -6.3], 0xaaa0b7, 12, true, true);
    if (character === 'trine') flow([-3.8, -0.2, -7], [0, -0.2, -6.3], 0xf28a57, 8, true);
  }
  if (stage.id === 'duodenum') {
    tube(
      [
        [4.8, 1.7, -5],
        [3, 0.7, -4.6],
        [2, 0.35, -4],
      ],
      0xc9cc64,
      0.13,
    );
    tube(
      [
        [4.8, -1.1, -5],
        [3, 0.2, -4.6],
        [2, 0.35, -4],
      ],
      0x82cde2,
      0.12,
    );
    const papilla = new T.Mesh(
      new T.SphereGeometry(0.28, 16, 10),
      new T.MeshStandardMaterial({ color: 0xd49491 }),
    );
    papilla.scale.set(0.6, 1, 1);
    papilla.position.set(2, 0.35, -4);
    group.add(papilla);
    flow([2, 0.35, -4], [0, -0.2, -5.4], 0xb5c85f, 30);
    flow([2, 0.35, -4], [0, -0.4, -5.3], 0x82cde2, 32, false, true);
    flow(
      [2, 0.35, -4],
      [0, -0.25, -4.5],
      character === 'stanley' ? 0x65d6ec : character === 'trine' ? 0xf28a57 : 0x93dc85,
      10,
      true,
    );
  }
  const dummy = new T.Object3D();
  return {
    count: systems.length,
    update(t, ph) {
      for (const s of systems) {
        for (let i = 0; i < s.m.count; i++) {
          const f = (t * 0.33 + i * 0.618) % 1;
          dummy.position.copy(s.from).lerp(s.to, f);
          dummy.position.x += Math.sin(i * 7 + f * 5) * 0.08;
          dummy.position.y += Math.sin(i * 3 + f * 4) * 0.08;
          dummy.rotation.set(f * 2, i, f * 3);
          dummy.updateMatrix();
          s.m.setMatrixAt(i, dummy.matrix);
          if (stage.id === 'stomach' && s.protein && s.acid) {
            s.m.material.color.setHex(0xffffff);
            s.m.setColorAt(
              i,
              new T.Color(0xaaa0b7).lerp(
                new T.Color(0xe975a9),
                relativeActivity(ph, 'pepsin') * Math.min(1, f * 1.8),
              ),
            );
          }
        }
        s.m.instanceMatrix.needsUpdate = true;
        if (s.m.instanceColor) s.m.instanceColor.needsUpdate = true;
        if (s.acid && stage.id === 'duodenum')
          s.m.material.color.copy(
            new T.Color(0xe5a56d).lerp(
              new T.Color(0x8ccab3),
              T.MathUtils.clamp((ph - 2.5) / 3.5, 0, 1),
            ),
          );
      }
    },
    group,
  };
}
export function mucosaTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const data = ctx.createImageData(128, 128);
  let seed = 821;
  for (let i = 0; i < data.data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const v = 205 + (seed % 35);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  ctx.strokeStyle = '#c2b6b6';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 18, 0);
    ctx.bezierCurveTo(i * 18 + 15, 45, i * 18 - 18, 85, i * 18, 128);
    ctx.stroke();
  }
  const texture = new T.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.repeat.set(6, 12);
  return texture;
}
