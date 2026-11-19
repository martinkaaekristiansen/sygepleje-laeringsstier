import * as T from './three.module.min.js';
const SUBDIVIDE_MUCOSA = true;
// Conservative portal rectangles. Occluding mucosal walls still perform depth
// testing; this only omits cells whose sole entrance cannot be on screen.
export function createTractVisibility(tract, cores, exterior = null) {
  const cells = [],
    portals = [],
    parents = [];
  for (const part of tract.parts) {
    const organ = part.kind === 'organ' ? cores.get(part.id) : null,
      bridge = organ ? null : tract.connections.find((c) => c.id === part.id),
      object = organ ? organ.group : bridge.mesh,
      villi = (organ || bridge).mucosa?.mesh.children || [],
      subdivide = SUBDIVIDE_MUCOSA && villi.length > 0,
      count = subdivide ? 8 : 1,
      parent = { id: part.id, object, villi };
    parents.push(parent);
    for (let section = 0; section < count; section++) {
      if (section) {
        if (bridge) portals.push(bridge.sectionPorts[section]);
        else {
          const descriptor = organ.descriptor,
            built = descriptor.built,
            position = built.geometry.attributes.position,
            around = built.geometry.userData.around,
            along = position.count / (around + 1) - 1,
            row = Math.round((section / 8) * along);
          portals.push({
            points: Array.from({ length: around }, (_, i) =>
              new T.Vector3()
                .fromBufferAttribute(position, row * (around + 1) + i)
                .applyMatrix4(descriptor.matrix),
            ),
            center: built.path.getPointAt(section / 8).applyMatrix4(descriptor.matrix),
          });
        }
      }
      cells.push({
        parent,
        section: subdivide ? section : null,
        end: part.start + ((part.end - part.start) * (section + 1)) / count,
      });
    }
    if (part !== tract.parts.at(-1))
      portals.push(organ ? organ.descriptor.outlet : tract.byId[bridge.to].inlet);
  }
  if (exterior) {
    const parent = { id: 'bathroom', object: exterior, villi: [] };
    parents.push(parent);
    cells.push({ parent, section: null, end: Infinity });
    portals.push(tract.segments.at(-1).outlet);
  }
  function rectangle(port, camera) {
    const points = port.points.map((p) => p.clone().applyMatrix4(camera.matrixWorldInverse)),
      clipped = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i],
        b = points[(i + 1) % points.length],
        inside = a.z <= -camera.near;
      if (inside) clipped.push(a);
      if (inside !== b.z <= -camera.near) {
        const t = (-camera.near - a.z) / (b.z - a.z);
        clipped.push(a.clone().lerp(b, t));
      }
    }
    if (!clipped.length) return null;
    const r = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const p of clipped) {
      p.applyMatrix4(camera.projectionMatrix);
      r.x0 = Math.min(r.x0, p.x);
      r.x1 = Math.max(r.x1, p.x);
      r.y0 = Math.min(r.y0, p.y);
      r.y1 = Math.max(r.y1, p.y);
    }
    return r;
  }
  return function update(camera, distance) {
    camera.updateMatrixWorld();
    let current = cells.findIndex((c) => distance <= c.end);
    if (current < 0) current = cells.length - 1;
    const visible = new Set([current]);
    for (const direction of [-1, 1]) {
      let aperture = { x0: -1, y0: -1, x1: 1, y1: 1 };
      for (let i = current; i + direction >= 0 && i + direction < cells.length; i += direction) {
        const boundary = direction > 0 ? i : i - 1,
          port = portals[boundary];
        if (camera.position.distanceTo(port.center) > 0.4) {
          const r = rectangle(port, camera);
          if (!r) break;
          aperture = {
            x0: Math.max(aperture.x0, r.x0),
            x1: Math.min(aperture.x1, r.x1),
            y0: Math.max(aperture.y0, r.y0),
            y1: Math.min(aperture.y1, r.y1),
          };
          if (aperture.x0 > aperture.x1 || aperture.y0 > aperture.y1) break;
        }
        visible.add(i + direction);
      }
    }
    // Roots just beyond a portal may have tips/sway in the visible cell.
    // One neighboring section is wider than the maximum villus height.
    const padded = new Set(visible);
    if (SUBDIVIDE_MUCOSA)
      for (const i of visible)
        for (const n of [i - 1, i + 1]) if (n >= 0 && n < cells.length) padded.add(n);
    for (const p of parents) {
      p.object.visible = false;
      for (const mesh of p.villi) mesh.visible = false;
    }
    for (const i of padded) {
      const { parent, section } = cells[i];
      parent.object.visible = true;
      for (const mesh of parent.villi)
        if (section === null || mesh.userData.section === section) mesh.visible = true;
    }
    return [...new Set([...padded].map((i) => cells[i].parent.id))];
  };
}
