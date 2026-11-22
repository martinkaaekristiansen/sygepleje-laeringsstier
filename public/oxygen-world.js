import * as T from './three.module.min.js';
import { createOxygenNetwork, alveolarLandmarks, sideSign } from './oxygen-network.js';
import {
  buildHead,
  buildAirwayPart,
  buildAlveolus,
  createBloodPartBuilder,
  buildCarina,
} from './oxygen-anatomy.js';
import { buildMucociliaryField, nasalClearancePart } from './oxygen-mucociliary.js';
import {
  gasMolecule,
  buildFocusErythrocyte,
  buildCarbonCarrier,
  buildTissue,
  buildCarbonTransportForms,
} from './oxygen-molecules.js';
import { oxygenRoute } from './oxygen-data.js';
import { anatomicalLook } from './digestion-camera-frames.js';
import { digestionFieldOfView } from './digestion-route-camera.js';
import { createAnatomicalLabelLayer, anatomicalLabel } from './digestion-anatomy-labels.js';
import { renderBudget } from './digestion-performance.js';
import { respiratoryCycle } from './journey-physiology.js';
const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z),
  smooth = (x, a = 0, b = 1) => T.MathUtils.smoothstep(x, a, b);
function pathPoint(points, t) {
  const k = T.MathUtils.clamp(t, 0, 1) * (points.length - 1),
    i = Math.min(points.length - 2, Math.floor(k));
  return points[i].clone().lerp(points[i + 1], k - i);
}
function collectLabels(root) {
  const out = [];
  root.traverse((o) => {
    if (o.userData.anatomicalLabel) out.push(o);
  });
  return out;
}
export function createOxygenWorld(
  canvas,
  { onStep = () => {}, onLook = () => {}, onError = () => {} } = {},
) {
  const renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    }),
    scene = new T.Scene(),
    camera = new T.PerspectiveCamera(74, 1, 0.008, 450),
    network = createOxygenNetwork(),
    bloodBuilder = createBloodPartBuilder(),
    cores = new Map(),
    pending = new Map(),
    alveoli = new Map(),
    budget = renderBudget(globalThis.devicePixelRatio || 1);
  scene.background = new T.Color(0x26111c);
  scene.fog = new T.FogExp2(0x351321, 0.008);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  scene.add(new T.HemisphereLight(0xffdcc5, 0x3b2236, 1.7));
  const light = new T.PointLight(0xffdfce, 1.7, 80, 0),
    fill = new T.PointLight(0xd8eff0, 0.55, 90, 0);
  scene.add(light, fill);
  const head = buildHead(network);
  scene.add(head.group);
  cores.set('head', head);
  const tissue = buildTissue(network);
  scene.add(tissue.group);
  cores.set('tissue', tissue);
  const actor = new T.Group(),
    oxygen = gasMolecule('oxygen'),
    carbon = buildCarbonCarrier(),
    cell = buildFocusErythrocyte(),
    transportForms = buildCarbonTransportForms();
  const tissueBinding = cell.hb.sites[0].position
    .clone()
    .multiply(cell.hb.group.scale)
    .add(cell.hb.group.position)
    .multiply(cell.group.scale)
    .add(network.tissue.capillary);
  const tissueOxygenPoints = [
    tissueBinding,
    network.tissue.capillary.clone().add(V(-0.45, 0, 0)),
    network.tissue.capillary.clone().add(V(-0.55, 0, 0)),
    network.tissue.cell,
    network.tissue.mitochondrion,
  ];
  actor.add(oxygen.group, carbon.group, cell.group, transportForms.group);
  scene.add(actor);
  oxygen.group.name = 'same-player-O2';
  carbon.group.name = 'new-metabolic-carbon';
  oxygen.group.add(anatomicalLabel('O₂', [0, 0.18, 0], 1, { priority: 100 }));
  cell.group.add(
    anatomicalLabel('Erytrocyt', [0, 1.1, 0], 1.4, { target: cell.membrane, priority: 75 }),
  );
  const chest = new T.Group();
  chest.name = 'enlarged-respiratory-overview';
  const lungs = [];
  for (const sign of [-1, 1]) {
    const lung = new T.Mesh(
      new T.SphereGeometry(1, 28, 20),
      new T.MeshStandardMaterial({
        color: 0xc68f9d,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        side: T.DoubleSide,
        roughness: 0.7,
      }),
    );
    lung.position.set(sign * 18, 48, -1);
    lung.scale.set(20, 25, 13);
    chest.add(lung);
    lungs.push(lung);
  }
  const diaphragm = new T.Mesh(
    new T.SphereGeometry(1, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new T.MeshStandardMaterial({ color: 0xaa8f7d, side: T.DoubleSide, roughness: 0.7 }),
  );
  diaphragm.position.set(0, 22, 0);
  diaphragm.scale.set(34, 5, 16);
  chest.add(diaphragm);
  diaphragm.add(anatomicalLabel('Diaphragma', [0, 1, 0], 2, { target: diaphragm, priority: 85 }));
  const ribs = new T.Group();
  for (let i = 0; i < 7; i++) {
    const ring = new T.Mesh(
      new T.TorusGeometry(34 - i * 0.9, 0.12, 6, 64, Math.PI * 1.6),
      new T.MeshStandardMaterial({
        color: 0xe3c6b1,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        roughness: 0.7,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 29 + i * 5, -1);
    ring.scale.set(1, 0.48, 1);
    ribs.add(ring);
  }
  chest.add(ribs);
  scene.add(chest);
  let run = null,
    paused = true,
    disposed = false,
    raf = 0,
    last = 0,
    dirty = true,
    ready = false,
    quality = 'auto',
    lod = true,
    cull = true,
    reportAt = -Infinity,
    desiredDirection = V(0, 0, -1),
    cameraStarted = false,
    drag = null,
    mucusState = null,
    hbState = null,
    carbonState = null,
    lastLabelKey = '',
    lastWidth = 0,
    lastHeight = 0;
  const labels = createAnatomicalLabelLayer(canvas, request),
    labelRoot = new T.Group();
  scene.add(labelRoot);
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    lastWidth = r.width;
    lastHeight = r.height;
    camera.aspect = r.width / r.height;
    camera.fov = digestionFieldOfView(camera.aspect);
    if (r.height <= 500 && r.width >= 500)
      camera.setViewOffset(r.width, r.height, -r.width * 0.25, 0, r.width, r.height);
    else camera.clearViewOffset();
    const ratio =
      quality === 'low'
        ? 0.8
        : quality === 'high'
          ? Math.min(2, globalThis.devicePixelRatio || 1)
          : budget.ratio;
    renderer.setPixelRatio(ratio);
    renderer.setSize(r.width, r.height, false);
    canvas.dataset.renderRatio = String(ratio);
    labels.invalidate();
    request();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  function request() {
    dirty = true;
    if (!raf && !disposed) raf = requestAnimationFrame(frame);
  }
  function coreKey(stage, r) {
    const id = stage.anatomy || stage.id;
    if (['outside', 'nose', 'mouth', 'pharynx', 'larynx', 'exterior'].includes(id)) return 'head';
    if (['trachea', 'mucus'].includes(id)) return 'trachea';
    if (id === 'mainbronchus') return 'carina';
    if (
      [
        'alveolus',
        'oxygen-diffusion',
        'hb-binding',
        'pcap-oxygen',
        'pcap-carbon',
        'bicarbonate-return',
        'co2-diffusion',
      ].includes(id)
    )
      return r.side + ':alveolar';
    if (['tissue-oxygen', 'metabolism', 'perspective', 'tissue-carbon', 'bicarbonate'].includes(id))
      return 'tissue';
    if (['la', 'ra'].includes(id)) return id;
    if (['lv', 'mitral', 'aorticValve'].includes(id)) return 'lv';
    if (['rv', 'tricuspid', 'pulmonaryValve'].includes(id)) return 'rv';
    const part = network.stagePart(stage, r);
    return part?.id || null;
  }
  async function ensure(key) {
    if (!key || cores.has(key)) return cores.get(key);
    if (pending.has(key)) return pending.get(key);
    const job = (async () => {
      let core;
      if (key === 'carina') core = await buildCarina(network);
      else if (key.endsWith(':alveolar')) {
        const side = key.split(':')[0];
        core = buildAlveolus(side);
        alveoli.set(side, core);
        const cap = bloodBuilder.vessel(network.parts.get(side + ':pulmonary-capillary'));
        core.group.add(cap.group);
        core.capillary = cap;
      } else if (network.hearts[key]) core = await bloodBuilder.chamber(network.hearts[key]);
      else {
        const part = network.parts.get(key);
        if (!part) return null;
        core =
          part.kind === 'airway' ||
          ['trachea', 'bronchus', 'bronchiole', 'terminal', 'respiratory', 'duct', 'sac'].includes(
            part.kind,
          )
            ? buildAirwayPart(part)
            : bloodBuilder.vessel(part);
      }
      if (disposed) return null;
      scene.add(core.group);
      cores.set(key, core);
      lastLabelKey = '';
      request();
      return core;
    })().finally(() => pending.delete(key));
    pending.set(key, job);
    return job;
  }
  const nasalField = buildMucociliaryField(nasalClearancePart(network.parts.get('nose')));
  if (nasalField) {
    head.group.add(nasalField.group);
    head.nasalField = nasalField;
  }
  const initialReady = Promise.all([head.ready, ensure('carina')]).then(() => {
    ready = true;
    resize();
    request();
  });
  function cameraPose(r, path, distance, stage) {
    let eye = path.at(distance),
      direction = V(0, 0, -1).applyQuaternion(path.frames(distance * 10)),
      look = eye.clone().add(direction),
      id = stage.anatomy || stage.id;
    if (stage.id === 'outside') {
      eye = V(0, 95, 24);
      look = V(0, 95, 1.4);
    }
    if (stage.id === 'exterior') {
      const u = ['exam', 'won'].includes(r.phase)
        ? 1
        : r.phase === 'animation'
          ? smooth(r.age / (r.duration || 1))
          : 0;
      eye = V(0, 95, 24).lerp(V(0, 65, 112), u);
      look = V(0, 95, 1.4).lerp(V(0, 58, -1), u);
    }
    const stationaryTravel =
      r.phase === 'travel' &&
      Math.abs(path.stations[oxygenRoute(r)[r.fromIndex].id].end - path.stations[stage.id].start) <
        1e-6;
    if (r.phase !== 'travel' || stationaryTravel) {
      if (!stage.expiration && id === 'pharynx') look = V(0, 90.8, -3.85);
      if (!stage.expiration && id === 'larynx') look = V(0, 89.4, -4.7);
      if (['oxygen-diffusion', 'hb-binding', 'bicarbonate-return', 'co2-diffusion'].includes(id)) {
        const a = alveolarLandmarks(r.side);
        look = a.cell.clone();
        if (id === 'oxygen-diffusion')
          look = a.center
            .clone()
            .lerp(a.cell, r.phase === 'animation' ? smooth(r.age / r.duration) : 0.45);
        if (id === 'hb-binding') {
          const blend = r.phase === 'travel' ? smooth(r.age / 0.75) : 1;
          eye = a.observer.clone().lerp(a.cell.clone().add(V(0.14, 0.14, 0.4)), blend);
          const unbound = a.cell.clone().add(V(-sideSign(r.side) * 0.12, 0, 0.01));
          const centre = a.cell.clone().add(V(0.172, 0, 0));
          const f = r.phase === 'animation' ? smooth(smooth(r.age / r.duration), 0, 0.25) : 0;
          look = a.cell.clone().lerp(unbound.lerp(centre, 0.5 + 0.5 * f), blend);
        }
        if (id === 'bicarbonate-return') {
          const plasma = a.cell.clone().add(V(-sideSign(r.side) * 0.35, 0, 0));
          look = pathPoint(
            [plasma, a.cell, a.cell, plasma],
            r.phase === 'animation' ? smooth(r.age / r.duration) : 0,
          );
        }
        if (id === 'co2-diffusion')
          look = pathPoint(
            [
              a.cell.clone().add(V(-sideSign(r.side) * 0.35, 0, 0)),
              a.endothelium,
              a.basal,
              a.epithelium,
              a.center,
            ],
            r.phase === 'animation' ? smooth(r.age / r.duration) : 0,
          );
      }
      if (
        ['tissue-oxygen', 'metabolism', 'perspective', 'tissue-carbon', 'bicarbonate'].includes(id)
      )
        look = network.tissue.cell.clone();
      if (id === 'tissue-oxygen')
        look = pathPoint(
          tissueOxygenPoints,
          r.phase === 'animation' ? smooth(r.age / r.duration) : 0,
        );
      if (id === 'tissue-carbon')
        look = network.tissue.cell
          .clone()
          .lerp(network.tissue.capillary, r.phase === 'animation' ? smooth(r.age / r.duration) : 0);
      if (id === 'bicarbonate') look = network.tissue.capillary.clone();
    }
    if (r.phase === 'travel' && oxygenRoute(r)[r.fromIndex]?.id === 'hb-binding') {
      const a = alveolarLandmarks(r.side);
      eye = a.cell
        .clone()
        .add(V(0.14, 0.14, 0.4))
        .lerp(eye, smooth(r.age / 0.75));
    }
    return { eye, look };
  }
  function setVisibility(stage, r) {
    const route = oxygenRoute(r),
      keys = new Set();
    for (let i = Math.max(0, r.index - 2); i <= Math.min(route.length - 1, r.index + 2); i++)
      keys.add(coreKey(route[i], r));
    if (r.index < 15 || stage.expiration) keys.add('head');
    if (['trachea', 'mucus', 'mainbronchus'].includes(stage.anatomy || stage.id)) {
      keys.add('carina');
      keys.add('trachea');
    }
    if (
      [
        'oxygen-diffusion',
        'hb-binding',
        'pcap-oxygen',
        'pcap-carbon',
        'bicarbonate-return',
        'co2-diffusion',
      ].includes(stage.id)
    )
      keys.add(r.side + ':alveolar');
    if (
      ['tissue-oxygen', 'metabolism', 'perspective', 'tissue-carbon', 'bicarbonate'].includes(
        stage.id,
      )
    )
      keys.add('systemic-capillary');
    const overview = ['outside', 'exterior'].includes(stage.id);
    for (const [key, core] of cores)
      core.group.visible = !cull || keys.has(key) || (overview && key === 'head');
    chest.visible = overview;
  }
  function placeActors(r, stage, path, distance) {
    const a = alveolarLandmarks(r.side),
      sign = sideSign(r.side),
      time = r.worldTime,
      mode = r.phase === 'animation' ? r.mode : '',
      fraction = r.phase === 'animation' ? smooth(r.age / (r.duration || 1)) : 0,
      id = stage.id,
      bloodContext =
        !!stage.blood ||
        [
          'oxygen-diffusion',
          'hb-binding',
          'tissue-oxygen',
          'bicarbonate-return',
          'co2-diffusion',
        ].includes(id);
    cell.group.visible = bloodContext || ['tissue-carbon', 'bicarbonate'].includes(id);
    cell.group.quaternion.identity();
    const atValve =
      ['mitral', 'tricuspid', 'aorticValve', 'pulmonaryValve'].includes(id) ||
      (r.phase === 'travel' && r.valveDuration > 0);
    let cellPoint = path.at(Math.min(path.length, distance + (atValve ? 0 : 0.65)));
    if (['oxygen-diffusion', 'hb-binding', 'bicarbonate-return', 'co2-diffusion'].includes(id))
      cellPoint = a.cell.clone();
    if (['tissue-oxygen', 'metabolism', 'perspective', 'tissue-carbon', 'bicarbonate'].includes(id))
      cellPoint = network.tissue.capillary.clone();
    cell.group.position.copy(cellPoint);
    cell.hb.hemeLabel.visible = r.gas === 'oxygen' && !r.oxygenUsed;
    if (stage.blood && !['pcap-oxygen', 'pcap-carbon'].includes(id)) {
      const tangent = path
        .at(Math.min(path.length, distance + 0.1))
        .sub(path.at(Math.max(0, distance - 0.1)))
        .normalize();
      if (tangent.lengthSq() > 0.5) cell.group.quaternion.setFromUnitVectors(V(0, 0, 1), tangent);
    }
    transportForms.group.visible = cell.group.visible && r.gas !== 'oxygen';
    transportForms.group.position.copy(cellPoint);
    transportForms.group.quaternion.copy(cell.group.quaternion);
    let bound = r.carrier === 'hemoglobin' ? 1 : 0,
      release = false;
    if (mode === 'hb-binding') bound = fraction;
    if (id === 'tissue-oxygen') {
      bound = 1;
      release = r.phase === 'animation' && fraction > 0.1;
    }
    if (r.gas !== 'oxygen') {
      bound = 1;
      release = !['pcap-carbon', 'bicarbonate-return', 'co2-diffusion'].includes(id);
    }
    hbState = cell.hb.update(bound, {
      releasePrimary: release,
      primaryIsPlayer: r.gas === 'oxygen',
    });
    hbState.position = cellPoint.toArray();
    hbState.valveControlled = atValve;
    cell.membrane.material.color.set(stage.oxygen === 'low' ? 0x882e46 : 0xc83b4d);
    cell.group.updateMatrixWorld(true);
    const binding = cell.hb.group.localToWorld(cell.hb.sites[0].position.clone()),
      freeInCell = a.cell.clone().add(V(-sign * 0.12, 0, 0.01)),
      plasmaPoint = cellPoint.clone().add(V(0.47, 0, 0));
    let o = path.at(Math.min(path.length, distance + 0.55)),
      scale = 0.6;
    if (id === 'outside') {
      o = V(-3, 94.7, 16);
      scale = 3;
    } else if (r.carrier === 'hemoglobin') {
      o = binding;
      scale = 0.195;
    } else if (r.carrier === 'erythrocyte-free') {
      o = freeInCell;
      scale = 0.195;
    } else if (r.carrier === 'tissue') {
      o = network.tissue.mitochondrion.clone();
      scale = 0.6;
    }
    if (mode === 'oxygen-diffusion') {
      o = pathPoint(
        [
          a.center,
          a.epithelium.clone().addScaledVector(a.outward, -0.2),
          a.epithelium,
          a.basal,
          a.endothelium,
          a.cell.clone().add(V(-sign * 0.32, 0, 0)),
          freeInCell,
        ],
        fraction,
      );
      scale = T.MathUtils.lerp(1, 0.195, fraction);
    }
    if (id === 'hb-binding') {
      o = freeInCell.clone().lerp(binding, mode === 'hb-binding' ? smooth(fraction, 0, 0.25) : 0);
      scale = 0.195;
    }
    if (id === 'tissue-oxygen') {
      o = pathPoint(tissueOxygenPoints, mode === 'tissue-oxygen' ? fraction : 0);
      scale = T.MathUtils.lerp(0.195, 0.6, mode === 'tissue-oxygen' ? fraction : 0);
    }
    if (['larynx', 'pharynx', 'out_larynx', 'out_pharynx'].includes(id)) scale = 0.5;
    oxygen.group.visible =
      r.gas === 'oxygen' &&
      !r.oxygenUsed &&
      !(mode === 'metabolism' && fraction > 0.7) &&
      !(mode === 'perspective' && fraction > 0.35);
    oxygen.group.position.copy(o);
    oxygen.group.scale.setScalar(scale);
    oxygen.group.quaternion.copy(camera.quaternion);
    let carbonVisible = r.gas !== 'oxygen' || (mode === 'perspective' && fraction > 0.5),
      hydration = r.gas === 'bicarbonate' ? 1 : 0,
      carbonPoint = plasmaPoint.clone(),
      carbonScale = 0.45;
    if (mode === 'perspective') {
      carbonPoint = network.tissue.mitochondrion.clone().add(V(0.2, 0.1, 0));
      carbonScale = 0.6;
    }
    if (id === 'tissue-carbon') {
      carbonPoint = pathPoint(
        [
          network.tissue.mitochondrion,
          network.tissue.cell,
          cellPoint.clone().add(V(-0.55, 0, 0)),
          plasmaPoint,
        ],
        mode === 'tissue-carbon' ? fraction : 0,
      );
      carbonScale = T.MathUtils.lerp(0.6, 0.45, mode === 'tissue-carbon' ? fraction : 0);
    }
    if (mode === 'bicarbonate') {
      hydration = smooth(fraction, 0.22, 0.7);
      carbonPoint = pathPoint(
        [
          plasmaPoint,
          cellPoint.clone().add(V(0.14, 0, 0)),
          cellPoint.clone().add(V(0.14, 0, 0)),
          plasmaPoint,
        ],
        fraction,
      );
    }
    if (mode === 'bicarbonate-return') hydration = 1 - smooth(fraction, 0.22, 0.7);
    if (['bicarbonate-return', 'co2-diffusion'].includes(id)) {
      carbonPoint = a.cell.clone().add(V(-sign * 0.35, 0, 0));
      if (mode === 'bicarbonate-return')
        carbonPoint = pathPoint([carbonPoint, a.cell, a.cell, carbonPoint], fraction);
    }
    if (mode === 'co2-diffusion') {
      carbonPoint = pathPoint(
        [carbonPoint, a.endothelium, a.basal, a.epithelium, a.center],
        fraction,
      );
      carbonScale = T.MathUtils.lerp(0.45, 1, fraction);
    }
    if (r.carrier === 'alveolar-air' || stage.expiration || id === 'exterior') {
      carbonPoint = path.at(Math.min(path.length, distance + 0.55));
      carbonScale = 1;
    }
    if (id === 'exterior' && r.phase === 'animation') {
      carbonPoint = V(sign * 0.45, 95.45, 4.7).lerp(V(0, 97, 30), fraction);
      carbonScale = 1.5;
    }
    carbon.group.visible = carbonVisible;
    carbon.group.position.copy(carbonPoint);
    carbon.group.scale.setScalar(carbonScale);
    carbon.group.quaternion.copy(camera.quaternion);
    carbonState = carbon.update(hydration);
    tissue.update(time, id === 'metabolism' || id === 'perspective');
  }
  function render(dt = 0) {
    if (!run || disposed) return;
    const route = oxygenRoute(run),
      stage = route[run.index],
      path = network.routeFor(run),
      { distance } = path.position(run),
      pose = cameraPose(run, path, distance, stage),
      view = anatomicalLook(pose.eye, pose.look, run.yaw, run.pitch);
    camera.userData.oxygenTeachingFocus = stage.id === 'hb-binding';
    camera.position.copy(pose.eye);
    const target = view.look.clone().sub(pose.eye).normalize();
    if (!cameraStarted) {
      desiredDirection.copy(target);
      cameraStarted = true;
    } else desiredDirection.lerp(target, 1 - Math.exp(-Math.max(0.016, dt) / 0.13)).normalize();
    const corrected = anatomicalLook(
      camera.position,
      camera.position.clone().add(desiredDirection),
    );
    camera.up.copy(corrected.up);
    camera.lookAt(corrected.look);
    camera.updateMatrixWorld(true);
    light.position.copy(camera.position).add(V(0, 1, 0.4));
    fill.position.copy(camera.position).add(V(2, -1, 1));
    setVisibility(stage, run);
    const time = run.worldTime;
    const breath =
      ['expiration', 'exhalation'].includes(run.mode) && run.phase === 'animation'
        ? 1 - smooth(run.age / run.duration)
        : respiratoryCycle(time).volume;
    diaphragm.position.y = 22 - 2 * breath;
    diaphragm.scale.y = 5 - 2 * breath;
    ribs.scale.set(1 + 0.025 * breath, 1, 1 + 0.025 * breath);
    for (const lung of lungs)
      lung.scale.set(
        20 * (1 + 0.025 * breath),
        25 * (1 + 0.02 * breath),
        13 * (1 + 0.025 * breath),
      );
    mucusState = null;
    for (const [key, core] of cores) {
      if (!core.group.visible) continue;
      if (core.field) {
        const trachea = key === 'trachea',
          origin = stage.expiration
            ? (run.expirationMucusOrigin ?? time)
            : (run.mucusOrigin ?? time),
          activeWitness =
            trachea &&
            (stage.expiration
              ? run.expirationMucusOrigin !== undefined
              : run.mucusOrigin !== undefined);
        const state = core.field.update(time, camera, {
          origin,
          activeWitness,
          emphasized: run.mode === 'mucus-highlight',
          lod,
        });
        if (trachea) mucusState = state;
      }
      if (core.definition) core.update(time, false);
      if (core.stream) core.stream.update(time, camera, { lod, reduced: run.motion === false });
      if (core.capillary?.stream)
        core.capillary.stream.update(time, camera, { lod, reduced: run.motion === false });
      if (core.side && core.membranes)
        core.update(time, stage.expiration, {
          camera,
          lod,
          reduced: run.motion === false,
          volume:
            run.phase === 'animation' && run.mode === 'expiration'
              ? 1 - smooth(run.age / run.duration)
              : null,
        });
    }
    if (head.group.visible && head.nasalField)
      head.nasalField.update(time, camera, { activeWitness: false, lod });
    placeActors(run, stage, path, distance);
    scene.updateMatrixWorld(true);
    const key =
      [...cores]
        .filter(([, c]) => c.group.visible)
        .map(([k]) => k)
        .join('|') +
      '|' +
      (carbon.group.visible ? 'C' : 'O');
    if (key !== lastLabelKey) {
      lastLabelKey = key;
      labels.setAnchors(collectLabels(scene));
    }
    labels.update(
      camera,
      [...cores.values()]
        .filter((c) => c.group.visible)
        .flatMap((c) => [
          ...(c.wall && !(c.wall.material.transparent && c.wall.material.opacity < 0.5)
            ? [c.wall]
            : []),
          ...(c.occluders || []),
        ]),
      performance.now(),
      run.phase !== 'exam' && run.phase !== 'won' && ready,
      [oxygen.group.visible ? oxygen.group : carbon.group]
        .filter((g) => g.visible)
        .map((g) => {
          const p = g.position.clone().project(camera);
          return { x: ((p.x + 1) * lastWidth) / 2, y: ((1 - p.y) * lastHeight) / 2, radius: 30 };
        }),
    );
    renderer.render(scene, camera);
    if (performance.now() - reportAt > 180) {
      reportAt = performance.now();
      const f = camera.getWorldDirection(V()),
        up = V(0, 1, 0).applyQuaternion(camera.quaternion),
        ref = V(0, 1, 0).addScaledVector(f, -f.y).normalize(),
        roll = T.MathUtils.radToDeg(Math.atan2(f.dot(up.clone().cross(ref)), up.dot(ref)));
      canvas.dataset.oxygenStage = stage.id;
      canvas.dataset.oxygenPhase = run.phase;
      canvas.dataset.oxygenMode = run.mode;
      canvas.dataset.worldTime = String(time);
      canvas.dataset.camera = JSON.stringify({
        position: camera.position.toArray(),
        look: corrected.look.toArray(),
        up: up.toArray(),
        roll,
        fov: camera.fov,
        distance,
      });
      canvas.dataset.player = JSON.stringify({
        species: run.gas,
        oxygenInstance: oxygen.group.uuid,
        carbonInstance: carbon.carbon.uuid,
        carbonIdentity: run.carbonIdentity,
        carrier: run.carrier,
        visible: run.gas === 'oxygen' ? oxygen.group.visible : carbon.group.visible,
      });
      canvas.dataset.mucus = JSON.stringify(mucusState);
      canvas.dataset.hemoglobin = JSON.stringify({
        ...hbState,
        instance: cell.hb.group.uuid,
        erythrocyte: cell.group.uuid,
      });
      canvas.dataset.carbon = JSON.stringify(carbonState);
      canvas.dataset.renderStats = JSON.stringify({
        triangles: renderer.info.render.triangles,
        drawCalls: renderer.info.render.calls,
        cores: cores.size,
        cilia: [...cores.values()]
          .filter((c) => c.group.visible)
          .reduce((s, c) => s + (c.field?.count || 0), 0),
        ratio: renderer.getPixelRatio(),
        oneRenderer: true,
      });
    }
  }
  function frame(now) {
    raf = 0;
    if (disposed) return;
    const ms = last ? Math.max(0, now - last) : 16.7,
      dt = Math.min(1, ms / 1000);
    last = now;
    try {
      if (!paused && ready) onStep(dt);
      if (!paused || dirty) {
        dirty = false;
        render(dt);
      }
      if (quality === 'auto' && !paused && budget.sample(ms)) resize();
    } catch (e) {
      paused = true;
      onError(e);
    }
    if (!paused && !raf) raf = requestAnimationFrame(frame);
  }
  const down = (e) => {
    if (paused || !run || e.button > 0) return;
    drag = { x: e.clientX, y: e.clientY, yaw: run.yaw, pitch: run.pitch, id: e.pointerId };
    canvas.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    if (!drag || paused) return;
    run.yaw = drag.yaw - (e.clientX - drag.x) * 0.006;
    run.pitch = T.MathUtils.clamp(drag.pitch + (e.clientY - drag.y) * 0.004, -1.25, 1.25);
    onLook();
    request();
  };
  const end = () => {
    drag = null;
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  return {
    network,
    scene,
    camera,
    renderer,
    ready: initialReady,
    async prepare(r) {
      run = r;
      const route = oxygenRoute(r),
        keys = new Set();
      for (let i = Math.max(0, r.index - 1); i <= Math.min(route.length - 1, r.index + 1); i++)
        keys.add(coreKey(route[i], r));
      if (
        ['tissue-oxygen', 'metabolism', 'perspective', 'tissue-carbon', 'bicarbonate'].includes(
          route[r.index].id,
        )
      )
        keys.add('systemic-capillary');
      await Promise.all([...keys].map(ensure));
      dirty = true;
      request();
    },
    setRun(r) {
      run = r;
      cameraStarted = false;
      request();
    },
    pause(value) {
      paused = value;
      last = 0;
      request();
    },
    settings(s) {
      quality = s.quality || 'auto';
      if (run) run.motion = s.motion !== false;
      resize();
    },
    lookChanged() {
      onLook();
      request();
    },
    center() {
      if (run) {
        run.yaw = 0;
        run.pitch = 0;
        cameraStarted = false;
        onLook();
        request();
      }
    },
    setOptimized(value) {
      lod = value;
      cull = value;
      request();
    },
    renderAt(r) {
      run = r;
      reportAt = -Infinity;
      render(0.016);
    },
    snapshot() {
      return {
        camera: JSON.parse(canvas.dataset.camera || 'null'),
        mucus: mucusState,
        hemoglobin: hbState,
        carbon: carbonState,
        stats: JSON.parse(canvas.dataset.renderStats || 'null'),
      };
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      labels.dispose();
      bloodBuilder.dispose();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', end);
      canvas.removeEventListener('pointercancel', end);
      const geometries = new Set(),
        materials = new Set(),
        textures = new Set();
      scene.traverse((o) => {
        if (o.isInstancedMesh) o.dispose();
        if (o.geometry) geometries.add(o.geometry);
        for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) {
          materials.add(m);
          for (const t of [...(m.userData.ownedTextures || []), ...Object.values(m)])
            if (t?.isTexture) textures.add(t);
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
    },
  };
}
