import * as T from './three.module.min.js';

// Anchors remain in the real 3D hierarchy. Text uses CSS pixels independently
// of camera distance, device pixel ratio and automatic rendering resolution.
export function anatomicalLabel(text, position, width = 2, options = {}) {
  const anchor = new T.Object3D();
  anchor.position.fromArray(position);
  anchor.userData = { anatomicalLabel: text, labelWidth: width, ...options };
  return anchor;
}
export function labelRectangleFits(rect, bounds, occupied, protectedPoints = []) {
  const overlaps = (a, b) =>
    a.x < b.x + b.width + 5 &&
    a.x + a.width + 5 > b.x &&
    a.y < b.y + b.height + 5 &&
    a.y + a.height + 5 > b.y;
  return (
    rect.x >= 8 &&
    rect.y >= 8 &&
    rect.x + rect.width <= bounds.width - 8 &&
    rect.y + rect.height <= bounds.height - 8 &&
    !occupied.some((other) => overlaps(rect, other)) &&
    !protectedPoints.some((p) => {
      const r = p.radius || 20;
      return overlaps(rect, { x: p.x - r, y: p.y - r, width: r * 2, height: r * 2 });
    })
  );
}
export function createAnatomicalLabelLayer(canvas, onLayoutChange = () => {}) {
  const layer = document.createElement('div');
  layer.className = 'digest-anatomy-labels';
  layer.setAttribute('aria-hidden', 'true');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('digest-anatomy-leaders');
  layer.append(svg);
  canvas.parentElement.append(layer);
  const entries = new Map(),
    ray = new T.Raycaster();
  let lastLayout = -Infinity,
    exclusions = [],
    lastSize = '',
    enabled = true;
  const observer = new ResizeObserver(() => {
    lastLayout = -Infinity;
    onLayoutChange();
  });
  for (const element of canvas.parentElement.querySelectorAll(
    '.blood-game-bar,.digest-hud,.digest-learning,.digest-map,.digest-panel,.digest-settings',
  ))
    observer.observe(element);
  const visible = (o) => {
    for (let p = o; p; p = p.parent) if (!p.visible) return false;
    return true;
  };
  function setAnchors(anchors) {
    const ids = new Set(anchors.map((a) => a.uuid));
    for (const [id, e] of entries)
      if (!ids.has(id)) {
        e.element.remove();
        e.line.remove();
        entries.delete(id);
      }
    for (const anchor of anchors)
      if (!entries.has(anchor.uuid)) {
        const element = document.createElement('span');
        element.className = 'digest-anatomy-label';
        element.textContent = anchor.userData.anatomicalLabel;
        element.dataset.anatomicalLabel = element.textContent;
        element.style.visibility = 'hidden';
        const line = document.createElementNS(svg.namespaceURI, 'line');
        line.style.visibility = 'hidden';
        svg.append(line);
        layer.append(element);
        if (anchor.userData.maxWidth) element.style.maxWidth = anchor.userData.maxWidth + 'px';
        entries.set(anchor.uuid, {
          anchor,
          element,
          line,
          checked: -Infinity,
          occluded: false,
          slot: anchor.userData.side || 0,
          width: 0,
          height: 0,
        });
      }
    lastLayout = -Infinity;
  }
  function update(camera, occluders, now, show = true, keepClear = []) {
    enabled = show;
    layer.hidden = !show;
    if (!show) return;
    const box = canvas.getBoundingClientRect(),
      bounds = { width: box.width, height: box.height },
      size = box.width + 'x' + box.height;
    const layoutChanged = !Number.isFinite(lastLayout) || size !== lastSize;
    const refresh = now - lastLayout > 200 || layoutChanged;
    if (refresh) {
      lastLayout = now;
      lastSize = size;
      exclusions = [
        ...canvas.parentElement.querySelectorAll(
          '.blood-game-bar,.digest-hud,.digest-learning,.digest-map,.digest-panel,.digest-settings:not([hidden])',
        ),
      ]
        .filter((el) => !el.hidden && getComputedStyle(el).visibility !== 'hidden')
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.left - box.left, y: r.top - box.top, width: r.width, height: r.height };
        })
        .filter((r) => r.width && r.height);
      layer.style.setProperty('--anatomy-label-font', box.width <= 600 ? '20px' : '18px');
      for (const e of entries.values()) {
        e.width = e.element.offsetWidth;
        e.height = e.element.offsetHeight;
      }
    }
    const candidates = [];
    for (const e of entries.values()) {
      e.element.style.visibility = e.line.style.visibility = 'hidden';
      e.element.dataset.hiddenReason = 'outside';
      if (!visible(e.anchor)) continue;
      const point = e.anchor.getWorldPosition(new T.Vector3()),
        deform = e.anchor.userData.deform;
      if (deform) {
        const p = deform.motility.point(deform.rest, deform.u, deform.axis);
        point.copy(p).applyMatrix4(e.anchor.parent.matrixWorld);
      }
      const projected = point.clone().project(camera);
      if (
        projected.z <= -1 ||
        projected.z >= 1 ||
        Math.abs(projected.x) > 1 ||
        Math.abs(projected.y) > 1
      )
        continue;
      const moved =
        !e.lastEye ||
        e.lastEye.distanceToSquared(camera.position) > 0.0025 ||
        e.lastPoint.distanceToSquared(point) > 0.0025 ||
        Math.abs(e.lastAim.dot(camera.quaternion)) < 0.9999;
      if (layoutChanged || now - e.checked >= (moved ? 200 : 800)) {
        e.lastEye = camera.position.clone();
        e.lastAim = camera.quaternion.clone();
        e.lastPoint = point.clone();
        e.checked = now;
        const delta = point.clone().sub(camera.position),
          distance = delta.length();
        ray.set(camera.position, delta.normalize());
        ray.near = 0.04;
        ray.far = Math.max(0.04, distance - 0.12);
        e.occluded = occluders
          .filter(visible)
          .some((o) => o !== e.anchor.userData.target && ray.intersectObject(o, false).length > 0);
      }
      if (e.occluded) {
        e.element.dataset.hiddenReason = 'occluded';
        continue;
      }
      candidates.push({
        e,
        x: ((projected.x + 1) * box.width) / 2,
        y: ((1 - projected.y) * box.height) / 2,
        priority: e.anchor.userData.priority || 0,
      });
    }
    candidates.sort((a, b) => b.priority - a.priority);
    const occupied = [...exclusions],
      points = [...candidates.map((c) => ({ x: c.x, y: c.y })), ...keepClear],
      limit = box.width <= 600 ? 3 : 5;
    let shown = 0;
    for (const { e, x, y } of candidates) {
      e.element.dataset.hiddenReason = 'crowded';
      if (shown >= limit) continue;
      const w = e.width,
        h = e.height,
        gap = e.anchor.userData.labelGap || 28,
        offsets = [
          [-w / 2, -h - gap],
          [gap, -h / 2],
          [-w - gap, -h / 2],
          [-w / 2, gap],
          [-w - gap, -h - gap],
          [gap, -h - gap],
          [-w - gap, gap],
          [gap, gap],
          [-w / 2, -h - Math.max(75, gap)],
          [-w / 2, Math.max(75, gap)],
        ],
        order = [e.slot, ...offsets.map((_, i) => i).filter((i) => i !== e.slot)];
      let placed = null;
      for (const slot of order) {
        const [dx, dy] = offsets[slot],
          r = { x: x + dx, y: y + dy, width: w, height: h };
        if (labelRectangleFits(r, bounds, occupied, points)) {
          placed = r;
          e.slot = slot;
          break;
        }
      }
      if (!placed) continue;
      occupied.push(placed);
      shown++;
      e.element.style.transform = `translate(${placed.x}px,${placed.y}px)`;
      e.element.style.visibility = 'visible';
      e.element.dataset.hiddenReason = '';
      const endX = Math.max(placed.x, Math.min(placed.x + w, x)),
        endY = Math.max(placed.y, Math.min(placed.y + h, y));
      e.line.setAttribute('x1', x);
      e.line.setAttribute('y1', y);
      e.line.setAttribute('x2', endX);
      e.line.setAttribute('y2', endY);
      e.line.style.visibility = 'visible';
    }
    if (refresh)
      canvas.dataset.anatomyLabels = JSON.stringify(
        [...entries.values()].map((e) => ({
          text: e.element.textContent,
          visible: e.element.style.visibility === 'visible',
          reason: e.element.dataset.hiddenReason,
          fontSize: box.width <= 600 ? 20 : 18,
          width: e.width,
          height: e.height,
        })),
      );
  }
  return {
    setAnchors,
    update,
    invalidate() {
      lastLayout = -Infinity;
    },
    dispose() {
      observer.disconnect();
      layer.remove();
      entries.clear();
    },
    get enabled() {
      return enabled;
    },
  };
}
