import * as T from './three.module.min.js';
const superior = new T.Vector3(0, 1, 0);
// The transported tube normal is a surface frame, not a camera horizon. Build
// upright views from the actual look-ahead direction. At almost vertical bends
// interpolate neighbouring view orientations around the gravity pole; a small
// gaze correction avoids the 180-degree roll singularity. Eye positions and all
// anatomical curves remain untouched.
export function anatomicalCameraFrames(point, length, samples = 2048) {
  const frames = [],
    quality = [];
  for (let i = 0; i <= samples; i++) {
    const s = (i / samples) * length,
      forward = point(s + 2.5)
        .sub(point(s))
        .normalize();
    quality.push(Math.hypot(forward.x, forward.z));
    frames.push(
      new T.Quaternion().setFromRotationMatrix(
        new T.Matrix4().lookAt(new T.Vector3(), forward, superior),
      ),
    );
  }
  for (let i = 0; i <= samples; i++) {
    if (quality[i] >= 0.18) continue;
    const first = i;
    while (i <= samples && quality[i] < 0.18) i++;
    const last = i,
      a = Math.max(0, first - 1),
      b = Math.min(samples, last),
      from = frames[a].clone(),
      to = last > samples ? from : frames[b].clone();
    for (let j = first; j < last; j++)
      frames[j].copy(from).slerp(to, T.MathUtils.smoothstep((j - a) / (b - a || 1), 0, 1));
  }
  return (distance) => {
    const k = T.MathUtils.clamp(distance / length, 0, 1) * samples,
      j = Math.min(samples - 1, Math.floor(k));
    return frames[j].clone().slerp(frames[j + 1], k - j);
  };
}
export function anatomicalLook(position, look, yaw = 0, pitch = 0) {
  const forward = look.clone().sub(position),
    distance = forward.length();
  forward.normalize();
  // Turn in the upright camera's own plane, including in steep passages.
  // Rotating only the global azimuth cannot reverse a near-vertical view.
  if (yaw) {
    const baseUp = superior.clone().addScaledVector(forward, -superior.dot(forward)).normalize();
    forward.applyAxisAngle(baseUp, yaw);
  }
  const elevation = T.MathUtils.clamp(
      Math.asin(T.MathUtils.clamp(forward.y, -1, 1)) + pitch,
      -Math.PI / 2 + 0.04,
      Math.PI / 2 - 0.04,
    ),
    azimuth = Math.atan2(forward.x, -forward.z);
  forward.set(
    Math.sin(azimuth) * Math.cos(elevation),
    Math.sin(elevation),
    -Math.cos(azimuth) * Math.cos(elevation),
  );
  const up = superior.clone().addScaledVector(forward, -superior.dot(forward)).normalize();
  return { look: position.clone().addScaledVector(forward, distance), up };
}
