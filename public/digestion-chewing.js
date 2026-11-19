import * as T from './three.module.min.js';
import { toothPose } from './digestion-anatomy.js';
import { chewingPose } from './digestion-audio.js';

export const TONGUE_RADII = Object.freeze([1.45, 0.28, 1.4]);
export function chewingAnatomicalPose(time, active = true) {
  const closure = active ? chewingPose(time) : 0;
  return {
    closure,
    jawLift: 1.2 * closure,
    tongue: [0, -1.5 + 0.78 * closure, -1.25 + (active ? Math.sin(time * 1.2) * 0.025 : 0)],
  };
}
export function chewingBolusPose(time, index, progress) {
  const closure = chewingPose(time),
    tooth = toothPose(index % 2 ? 13 : 2);
  return {
    position: [tooth.position[0], 0.55 - 0.6 * (1 - closure), tooth.position[2]],
    scale: [
      1 - progress * 0.5,
      Math.max(0.025, (1 - closure) * 0.65) * (1 - progress * 0.5),
      1 - progress * 0.5,
    ],
  };
}
// A simplified vertical mandibular excursion. All lower teeth and their gingiva
// move together. The tongue stays inside the dental arch and below the bite.
export function buildChewingAnatomy() {
  const group = new T.Group(),
    upper = new T.Group(),
    lower = new T.Group();
  group.name = 'coordinated-chewing';
  group.add(upper, lower);
  const enamel = new T.MeshStandardMaterial({ color: 0xf5e4c6, roughness: 0.5 });
  const teeth = [];
  for (let i = 0; i < 32; i++) {
    const pose = toothPose(i),
      molar = pose.type === 'molar',
      canine = pose.type === 'canine';
    const tooth = new T.Mesh(new T.SphereGeometry(1, 16, 12), enamel);
    tooth.scale.set(
      molar ? 0.31 : canine ? 0.2 : 0.24,
      molar ? 0.32 : canine ? 0.5 : 0.37,
      molar ? 0.32 : 0.13,
    );
    if (molar)
      for (let k = 0; k < 3; k++) {
        const cusp = new T.Mesh(new T.SphereGeometry(0.3, 12, 8), enamel);
        cusp.position.set((k - 1) * 0.6, 1, 0);
        tooth.add(cusp);
      }
    tooth.position.fromArray(pose.position);
    tooth.rotation.z = pose.rotation;
    tooth.userData.crownDirection = pose.crownDirection;
    (i < 16 ? upper : lower).add(tooth);
    teeth.push(tooth);
  }
  for (const [jaw, y] of [
    [upper, 1.35],
    [lower, -1.45],
  ]) {
    const arch = new T.CatmullRomCurve3(
      Array.from(
        { length: 20 },
        (_, i) =>
          new T.Vector3(
            Math.cos((i / 19) * Math.PI) * 2.35,
            y,
            -2.8 + Math.sin((i / 19) * Math.PI) * 3.3,
          ),
      ),
    );
    jaw.add(
      new T.Mesh(
        new T.TubeGeometry(arch, 32, 0.22, 8, false),
        new T.MeshStandardMaterial({ color: 0xae526b, roughness: 0.65 }),
      ),
    );
  }
  const tongue = new T.Mesh(
    new T.SphereGeometry(1, 28, 20),
    new T.MeshStandardMaterial({ color: 0xd98994, roughness: 0.55 }),
  );
  tongue.name = 'oral-tongue';
  tongue.scale.fromArray(TONGUE_RADII);
  group.add(tongue);
  function update(time, active = true) {
    const pose = chewingAnatomicalPose(time, active);
    lower.position.y = pose.jawLift;
    tongue.position.fromArray(pose.tongue);
    return pose;
  }
  update(0, false);
  return { group, upper, lower, teeth, tongue, update };
}
