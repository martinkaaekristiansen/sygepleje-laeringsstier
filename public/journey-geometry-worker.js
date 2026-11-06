import { chamberGeometry } from './journey-chambers.js';
self.onmessage = ({ data: { id, stage, quality } }) => {
  try {
    const geometry = chamberGeometry(stage, quality),
      attributes = {};
    for (const [name, a] of Object.entries(geometry.attributes))
      attributes[name] = { array: a.array, itemSize: a.itemSize, normalized: a.normalized };
    const index = geometry.index?.array;
    self.postMessage({ id, attributes, index, userData: geometry.userData }, [
      ...Object.values(attributes).map((a) => a.array.buffer),
      ...(index ? [index.buffer] : []),
    ]);
    geometry.dispose();
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};
