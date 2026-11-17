import * as T from './three.module.min.js';
import { organCurve } from './digestion-anatomy.js';
export function viewPose(id) {
  if (['pharynx', 'epiglottis'].includes(id))
    return { position: new T.Vector3(4.8, 2.5, -0.5), look: new T.Vector3(0, -0.4, -5) };
  if (id === 'caecum')
    return { position: new T.Vector3(-0.4, 3.2, -4.8), look: new T.Vector3(0.4, -1, -6.2) };
  if (id === 'stomach')
    return { position: new T.Vector3(0, 0, -3.2), look: new T.Vector3(1, -0.4, -7) };
  if (
    [
      'ascending',
      'transverse',
      'descending',
      'sigmoid',
      'rectum',
      'duodenum',
      'jejunum',
      'ileum',
      'oesophagus',
    ].includes(id)
  ) {
    const path = organCurve(id);
    return { position: path.getPointAt(0.045), look: path.getPointAt(0.38) };
  }
  return { position: new T.Vector3(0, 0, 2), look: new T.Vector3(0, 0, -4) };
}
