import * as T from './three.module.min.js';
import { anatomicalCameraFrames } from './digestion-camera-frames.js';
const clamp = T.MathUtils.clamp;
export const EXTERNAL_ENTRY = Object.freeze({ start: -18, choice: -16 });
// Keep at least the square-view horizontal field on portrait screens. Widen
// the lens, rather than moving the eye off its safe anatomical centerline.
export function digestionFieldOfView(aspect) {
  return Math.min(
    120,
    T.MathUtils.radToDeg(
      2 * Math.atan(Math.tan(T.MathUtils.degToRad(74 / 2)) / Math.min(1, Math.max(0.3, aspect))),
    ),
  );
}
export function createRouteCamera(tract) {
  const orientationAt = anatomicalCameraFrames(point, tract.route.length);
  let distance = null,
    from = 0,
    target = 0,
    duration = 0;
  function point(s) {
    if (s < 0) return tract.route.getPointAt(0).addScaledVector(tract.route.getTangentAt(0), s);
    if (s <= tract.route.length) return tract.route.getPointAt(clamp(s / tract.route.length, 0, 1));
    return tract.route
      .getPointAt(1)
      .addScaledVector(tract.route.getTangentAt(1), s - tract.route.length);
  }
  return {
    get distance() {
      return distance;
    },
    reset() {
      distance = null;
      from = target = duration = 0;
    },
    needed(id) {
      return distance !== null && Math.abs(distance - tract.stations[id].distance) > 0.025;
    },
    duration(id) {
      return clamp(
        Math.abs((distance ?? tract.stations[id].distance) - tract.stations[id].distance) / 6,
        1.2,
        8,
      );
    },
    begin(id, mode, age = 0, checkpoint = null) {
      const stop = tract.stations[id].distance;
      if (mode === 'entry') {
        distance = from = target = EXTERNAL_ENTRY.choice;
        duration = 0;
        return;
      }
      if (
        mode === 'face-intro' &&
        !(
          checkpoint?.physicalRouteVersion === tract.version &&
          Number.isFinite(checkpoint.cameraDistance) &&
          checkpoint.cameraDistance < 0
        )
      ) {
        checkpoint = null;
        distance = EXTERNAL_ENTRY.start;
      }
      const minimum =
        id === 'mouth' && ['face-intro', 'intro'].includes(mode) ? EXTERNAL_ENTRY.start : 0;
      if (
        checkpoint?.physicalRouteVersion === tract.version &&
        Number.isFinite(checkpoint.cameraDistance)
      ) {
        distance = clamp(checkpoint.cameraDistance, minimum, tract.route.length + 2.2);
        from = clamp(checkpoint.fromDistance ?? distance, minimum, tract.route.length + 2.2);
        target = clamp(checkpoint.targetDistance ?? stop, minimum, tract.route.length + 2.2);
        duration = clamp(checkpoint.travelDuration ?? 0, 0, 30);
        return;
      }
      if (distance === null)
        distance = ['entry', 'face-intro', 'intro'].includes(mode)
          ? mode === 'intro'
            ? EXTERNAL_ENTRY.choice
            : EXTERNAL_ENTRY.start
          : mode === 'swallow'
            ? tract.stations.epiglottis.distance
            : stop;
      from = distance;
      target = distance;
      duration = 0;
      if (mode === 'face-intro') {
        target = EXTERNAL_ENTRY.choice;
        duration = 3;
      }
      if (mode === 'journey') {
        target = stop;
        duration = clamp(Math.abs(target - from) / 6, 1.2, 8);
      }
      if (mode === 'intro') {
        target = tract.stations.mouth.distance;
        duration = 10;
      }
      if (mode === 'swallow') {
        target = tract.stations.oesophagus.distance;
        duration = 3;
      }
      if (mode === 'finale') {
        target = tract.route.length + 2.2;
        duration = 4.8;
      }
      this.update(age);
    },
    update(age) {
      if (duration) {
        const u = clamp(age / duration, 0, 1);
        const f = u * u * (3 - 2 * u);
        distance = from + (target - from) * f;
      }
      return distance;
    },
    pose(id) {
      const s = distance ?? tract.stations[id].distance,
        position = point(s),
        rawLook = point(s + 2.5),
        orientation = orientationAt(s),
        look = position
          .clone()
          .addScaledVector(
            new T.Vector3(0, 0, -1).applyQuaternion(orientation),
            rawLook.distanceTo(position),
          );
      if (distance < 0) {
        look.copy(point(0)).addScaledVector(tract.route.getTangentAt(0), 0.5);
        look.y += 3.5 * T.MathUtils.smoothstep(-distance, 3, 10);
      }
      if (['pharynx', 'epiglottis'].includes(id)) {
        const delta = Math.abs((distance ?? 0) - tract.stations[id].distance);
        if (delta < 1) look.lerp(tract.stations[id].look, 1 - T.MathUtils.smoothstep(delta, 0, 1));
      }
      const forward = look.clone().sub(position).normalize(),
        up = new T.Vector3(0, 1, 0).addScaledVector(forward, -forward.y).normalize();
      const part = tract.route.atDistance(Math.min(distance ?? 0, tract.route.length)).part;
      return { position, look, up, part: part.id };
    },
    checkpoint() {
      return {
        physicalRouteVersion: tract.version,
        cameraDistance: distance,
        fromDistance: from,
        targetDistance: target,
        travelDuration: duration,
      };
    },
  };
}

export function sceneStep(elapsed, mode) {
  return ['journey', 'intro', 'swallow', 'finale'].includes(mode)
    ? Math.min(0.4, Math.max(0, elapsed))
    : Math.max(0, elapsed);
}
