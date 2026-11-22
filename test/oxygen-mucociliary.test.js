import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/three.module.min.js';
import { createOxygenNetwork } from '../public/oxygen-network.js';
import {
  ciliaryBeat,
  mucusParticleAt,
  CILIARY_PERIOD,
  MUCUS_SPEED,
  ciliaCount,
  buildMucociliaryField,
} from '../public/oxygen-mucociliary.js';
const n = createOxygenNetwork(),
  part = n.parts.get('trachea');
test('mucus runs proximally and remains anchored above the cilia at the real wall', () => {
  let previous = 1;
  for (let t = 0; t <= 20; t += 0.1) {
    const p = mucusParticleAt(part, t),
      center = part.path.getPointAt(p.u);
    assert(p.u < previous);
    previous = p.u;
    assert(Math.abs(p.point.distanceTo(center) - p.radial) < 1e-8);
    assert(p.radial < part.radius && p.radial > part.radius - 0.15);
    assert.equal(p.boundTo, 'mucus');
    assert.equal(p.direction, 'toward-pharynx');
  }
  assert.equal(
    mucusParticleAt(part, 30).visible,
    false,
    'the same bacterium exits proximally, rather than teleporting back',
  );
});
test('the witness bacterium overtakes the inspiring observer in the opposite direction', () => {
  const player = (t) => 0.12 + 0.7 * (t / 13);
  const early = mucusParticleAt(part, 0),
    late = mucusParticleAt(part, 13);
  assert(early.u > player(0));
  assert(late.u < player(13));
  const crossing = (0.76 - 0.12) / (MUCUS_SPEED + 0.7 / 13);
  assert(crossing > 5 && crossing < 10);
  assert(Math.abs(mucusParticleAt(part, crossing).u - player(crossing)) < 1e-8);
});
test('stationary observers and expiration never reverse the independent mucus clock', () => {
  for (const inspiration of [true, false]) {
    const a = mucusParticleAt(part, 3),
      b = mucusParticleAt(part, 7);
    assert(b.u < a.u);
    assert.equal(b.direction, 'toward-pharynx');
    const stationary = 0.5;
    assert.notEqual(b.u - stationary, a.u - stationary);
    assert.equal(mucusParticleAt(part, 7).point.distanceTo(b.point), 0);
  }
});
test('coordinated proximal power stroke and slower recovery repeat without a jump', () => {
  const power = ciliaryBeat(CILIARY_PERIOD * 0.27) - ciliaryBeat(0),
    recovery = ciliaryBeat(CILIARY_PERIOD * 0.99) - ciliaryBeat(CILIARY_PERIOD * 0.28);
  assert(power < -1.3);
  assert(recovery > 1.3);
  assert(Math.abs(ciliaryBeat(CILIARY_PERIOD - 1e-6) - ciliaryBeat(1e-6)) < 1e-5);
  assert.notEqual(ciliaryBeat(0.2, 0), ciliaryBeat(0.2, 0.1), 'metachronal phase difference');
});
test('cilia decrease distally, never occur in alveoli, and use instancing at both detail levels', () => {
  assert(ciliaCount('trachea') > ciliaCount('bronchus'));
  assert(ciliaCount('bronchus') > ciliaCount('bronchiole'));
  assert(ciliaCount('bronchiole') > ciliaCount('terminal'));
  for (const kind of ['respiratory', 'duct', 'sac', 'alveolus']) assert.equal(ciliaCount(kind), 0);
  const field = buildMucociliaryField(part),
    camera = new T.PerspectiveCamera();
  camera.position.copy(part.path.getPointAt(0.5));
  field.update(4, camera, { origin: 0, activeWitness: true });
  assert.equal(field.count, 1152);
  assert.equal(
    field.sections.reduce((s, x) => s + x.near.count, 0),
    1152,
  );
  assert.equal(
    field.sections.reduce((s, x) => s + x.far.count, 0),
    1152,
  );
  assert(
    field.sections.every(
      (s) => s.near.isInstancedMesh && s.far.isInstancedMesh && s.near.visible !== s.far.visible,
    ),
  );
  const p = field.witness.position.clone();
  field.update(4, camera, { origin: 0, activeWitness: true });
  assert(field.witness.position.equals(p), 'pause freezes transport too');
  assert.equal(field.witness.userData.boundTo, 'mucus');
});
