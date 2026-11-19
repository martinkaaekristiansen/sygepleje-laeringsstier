import * as T from './three.module.min.js';
import { enzymeModel } from './digestion-enzyme-model.js';
import { enzymeIdentity } from './digestion-enzyme-identity.js';

// The chosen teaching symbol has one owner outside the disposable question
// layer. A page reload reconstructs it from learning progress; within a run the
// exact same group, mesh, geometry and colour survive every question/sequence.
export function createEnzymeLifecycle(dispose) {
  const layer = new T.Group();
  layer.name = 'persistent-selected-enzyme';
  let current = null,
    serial = 0;
  function clear() {
    if (!current) return;
    layer.remove(current.object);
    dispose?.(current.object);
    current = null;
  }
  return {
    layer,
    get current() {
      return current;
    },
    select(label, scope, candidate = null) {
      const identity = enzymeIdentity(label);
      // Bile salts are not an enzyme and keep their separate emulsification.
      if (!identity || identity.id === 'bile') return null;
      if (current?.scope === scope && current.id === identity.id) return current.object;
      clear();
      const object = candidate || new T.Group();
      if (!candidate) object.add(enzymeModel(label));
      object.visible = true;
      object.userData.enzymeId = identity.id;
      object.userData.kind = 'protein-enzyme';
      layer.add(object);
      current = { object, id: identity.id, label, scope, serial: ++serial, exit: null };
      return object;
    },
    enter(scope, mode) {
      if (!current) return;
      if (current.scope !== scope || ['menu', 'face-intro', 'entry', 'intro'].includes(mode))
        clear();
      else if (
        !['boss', 'secretion', 'brush-border', 'reaction'].includes(mode) &&
        current.exit === null
      )
        current.exit = 0;
    },
    stepExit(seconds, motion = true) {
      if (!current || current.exit === null) return;
      current.exit += motion ? Math.max(0, seconds) : 1.2;
      const opacity = Math.max(0, 1 - current.exit / 1.2);
      current.object.traverse((o) => {
        if (o.material) {
          o.material.transparent = true;
          o.material.opacity = opacity;
        }
      });
      if (current.exit >= 1.2) clear();
    },
    snapshot() {
      if (!current) return null;
      const mesh = current.object.children[0];
      return {
        id: current.id,
        scope: current.scope,
        instance: current.object.uuid,
        mesh: mesh?.uuid,
        geometry: mesh?.geometry?.uuid,
        serial: current.serial,
        visible: current.object.visible,
        retiring: current.exit !== null,
        intact: !!mesh?.geometry,
        color: mesh?.material.color.getHexString(),
      };
    },
    clear,
  };
}
