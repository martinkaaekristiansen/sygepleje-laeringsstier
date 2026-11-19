import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/three.module.min.js';
import { buildDigestiveTract } from '../public/digestion-tract.js';
import { createRouteCamera } from '../public/digestion-route-camera.js';
import { anatomicalLook } from '../public/digestion-camera-frames.js';
const tract = buildDigestiveTract(),
  rig = createRouteCamera(tract);
function poseAt(distance) {
  rig.begin('stomach', 'travel', 0, {
    physicalRouteVersion: 1,
    cameraDistance: distance,
    fromDistance: distance,
    targetDistance: distance,
    travelDuration: 0,
  });
  return rig.pose('stomach');
}
function cameraFor(p, yaw = 0, pitch = 0) {
  const view = anatomicalLook(p.position, p.look, yaw, pitch),
    camera = new T.PerspectiveCamera();
  camera.position.copy(p.position);
  camera.up.copy(view.up);
  camera.lookAt(view.look);
  return camera;
}
function roll(camera) {
  const forward = new T.Vector3(0, 0, -1).applyQuaternion(camera.quaternion),
    up = new T.Vector3(0, 1, 0).applyQuaternion(camera.quaternion),
    reference = new T.Vector3(0, 1, 0).addScaledVector(forward, -forward.y).normalize();
  return T.MathUtils.radToDeg(
    Math.atan2(forward.dot(up.clone().cross(reference)), up.dot(reference)),
  );
}
test('oesophagus, cardia, stomach and pylorus remain upright without changing the physical camera path', () => {
  const start = tract.parts.find((p) => p.id === 'oesophagus').start,
    end = tract.parts.find((p) => p.id === 'duodenum').end;
  let prior = null,
    maxRoll = 0,
    maxCorrection = 0;
  for (let s = start; s <= end; s += 0.02) {
    const p = poseAt(s),
      camera = cameraFor(p),
      actualUp = new T.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    assert(p.position.distanceTo(tract.route.getPointAt(s / tract.route.length)) < 1e-8);
    assert(actualUp.y > 0.03, 'no inversion relative to the patient superior axis');
    maxRoll = Math.max(maxRoll, Math.abs(roll(camera)));
    const target = tract.route
      .getPointAt(Math.min(1, (s + 2.5) / tract.route.length))
      .sub(p.position);
    maxCorrection = Math.max(
      maxCorrection,
      T.MathUtils.radToDeg(target.angleTo(p.look.clone().sub(p.position))),
    );
    if (prior)
      assert(camera.quaternion.angleTo(prior) < 0.1, 'continuous view, no quaternion flip');
    prior = camera.quaternion.clone();
  }
  assert(maxRoll < 1e-8);
  assert(maxCorrection < 16);
});
test('free left/right and up/down look retains an upright horizon including near-vertical passages', () => {
  for (let s = tract.stations.oesophagus.distance; s <= tract.stations.duodenum.distance; s += 0.7)
    for (const yaw of [-Math.PI, -0.7, 0, 0.7, Math.PI, Math.PI * 4])
      for (const pitch of [-1.25, 0, 1.25]) {
        const p = poseAt(s),
          camera = cameraFor(p, yaw, pitch),
          up = new T.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        assert(up.y > 0.03);
        assert(Math.abs(roll(camera)) < 1e-8);
        assert(camera.position.equals(p.position));
      }
});
test('a horizontal half turn looks fully back along steep passages while remaining upright', () => {
  for (const id of ['oesophagus', 'stomach', 'duodenum', 'ascending', 'descending']) {
    const p = poseAt(tract.stations[id].distance),
      forward = cameraFor(p),
      back = cameraFor(p, Math.PI),
      a = forward.getWorldDirection(new T.Vector3()),
      b = back.getWorldDirection(new T.Vector3());
    assert(
      a.dot(b) < -0.999999,
      id +
        ': a half turn must reverse the full viewing direction, including its vertical component',
    );
    assert(new T.Vector3(0, 1, 0).applyQuaternion(back.quaternion).y > 0.03);
    assert(back.position.equals(forward.position));
  }
});
