import * as T from './three.module.min.js';
import { chamberGeometry } from './journey-chambers.js';
// Build the chamber off the UI thread; cached geometry remains owned by the world.
export function createGeometryLoader() {
  let worker,
    sequence = 0,
    disposed = false;
  const pending = new Map();
  function fail(error) {
    for (const { reject } of pending.values()) reject(error);
    pending.clear();
    worker?.terminate();
    worker = null;
  }
  return {
    chamber(stage, quality) {
      if (disposed) return Promise.reject(Error('Grafikken er lukket.'));
      if (typeof Worker === 'undefined' || import.meta.url.startsWith('data:'))
        return Promise.resolve(chamberGeometry(stage, quality));
      if (!worker) {
        worker = new Worker(new URL('./journey-geometry-worker.js', import.meta.url), {
          type: 'module',
        });
        worker.onerror = () =>
          fail(Error('Hjertekammeret kunne ikke indlæses. Genindlæs spillet.'));
        worker.onmessage = ({ data }) => {
          const job = pending.get(data.id);
          if (!job) return;
          pending.delete(data.id);
          if (data.error) {
            job.reject(Error(data.error));
            return;
          }
          const geometry = new T.BufferGeometry();
          for (const [name, a] of Object.entries(data.attributes))
            geometry.setAttribute(name, new T.BufferAttribute(a.array, a.itemSize, a.normalized));
          if (data.index) geometry.setIndex(new T.BufferAttribute(data.index, 1));
          geometry.userData = data.userData;
          geometry.computeBoundingSphere();
          job.resolve(geometry);
        };
      }
      return new Promise((resolve, reject) => {
        const id = ++sequence;
        pending.set(id, { resolve, reject });
        worker.postMessage({ id, stage, quality });
      });
    },
    dispose() {
      disposed = true;
      fail(Error('Grafikken er lukket.'));
    },
  };
}
