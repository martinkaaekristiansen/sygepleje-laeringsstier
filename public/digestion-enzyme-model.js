import * as T from './three.module.min.js';
import { enzymeIdentity, enzymeOutline } from './digestion-enzyme-identity.js';
export function enzymeGeometry(label) {
  const identity = enzymeIdentity(label);
  const shape = new T.Shape();
  const points = enzymeOutline(identity);
  points.forEach(([x,y], i) => i ? shape.lineTo(x,y) : shape.moveTo(x,y));
  shape.closePath();
  const g = new T.ExtrudeGeometry(shape, { depth: 0.24, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.07, bevelThickness: 0.1 });
  g.translate(0,0,-0.12);
  return g;
}
export function enzymeModel(label) {
  const identity = enzymeIdentity(label);
  const m = new T.Mesh(enzymeGeometry(label), new T.MeshStandardMaterial({ color: identity.color, roughness: 0.45 }));
  m.userData.enzymeId = identity.id;
  return m;
}
