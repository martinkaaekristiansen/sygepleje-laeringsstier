import { buildChewingAnatomy, chewingBolusPose } from './digestion-chewing.js';
import { anatomicalLook } from './digestion-camera-frames.js';
import { buildMicrobiota } from './digestion-microbiota.js';
import { buildAcidSecretion } from './digestion-acid.js';
import { buildExternalFace } from './digestion-face.js';
import { buildPyloricGate, pyloricAperture } from './digestion-pylorus.js';
import {
  buildSurfaceUptake,
  buildMicelleAssembly,
  buildEmulsification,
} from './digestion-uptake.js';
import { createTractVisibility } from './digestion-visibility.js';
import { buildDigestiveTract } from './digestion-tract.js';
import { createRouteCamera, sceneStep, digestionFieldOfView } from './digestion-route-camera.js';
import { buildGastricFolds, gastricFrame } from './digestion-gastric.js';
import { createMotility } from './digestion-motility.js';
import { lumenFlow } from './digestion-flow.js';
import { buildFinale } from './digestion-finale.js';
import { anatomicalLabel, createAnatomicalLabelLayer } from './digestion-anatomy-labels.js';
import { buildSwallowAnatomy } from './digestion-swallow.js';
import { buildVilli, MUCOSA_REGIONS } from './digestion-mucosa.js';
import { buildCaecumGeometry, buildIleocaecalLips, ileocaecalGap } from './digestion-caecum.js';
import { enzymeModel } from './digestion-enzyme-model.js';
import { createEnzymeLifecycle } from './digestion-enzyme-lifecycle.js';
import { enzymeIdentity } from './digestion-enzyme-identity.js';
import { renderBudget } from './digestion-performance.js';
import { chewingPose, chewBeat } from './digestion-audio.js';
import { addSecretions, mucosaTexture } from './digestion-secretions.js';
import { nutrientModel } from './digestion-molecules.js';
import {
  buildOrganSurface,
  organCurve,
  lumenRadius,
  ORAL_CENTER,
  stomachPoint,
} from './digestion-anatomy.js';
import { reactionState, relativeActivity } from './digestion-engine.js';
import * as T from './three.module.min.js';
import { CHARACTERS, ROUTE, PRODUCTS, BOSSES } from './digestion-data.js';
// One renderer, camera and animation loop for every nutrient and scale.
export function createDigestionWorld(canvas, onPhysiology = () => {}) {
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    stencil: true,
    powerPreference: 'low-power',
  });
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  const texture = mucosaTexture();
  let tract = null,
    routeCamera = null,
    cores = new Map(),
    coreRoot = null,
    activeCore = null,
    visibilityUpdate = null,
    bathroom = null;
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(74, 1, 0.03, 180);
  scene.matrixAutoUpdate = false;
  scene.updateMatrix();
  scene.background = new T.Color(0x24101b);
  scene.fog = new T.FogExp2(0x24101b, 0.025);
  const ambient = new T.HemisphereLight(0xffe1db, 0x24132c, 1.25);
  scene.add(ambient);
  const light = new T.PointLight(0xffe4dc, 32, 35, 1.4);
  scene.add(light);
  const rim = new T.PointLight(0x5dcad2, 18, 30, 1.5);
  rim.position.set(3, 1, -9);
  scene.add(rim);
  let root = new T.Group();
  scene.add(root);
  const enzymeLife = createEnzymeLifecycle(free);
  scene.add(enzymeLife.layer);
  const labelLayer = createAnatomicalLabelLayer(canvas, wake);
  let anatomyAnchors = [],
    labelOccluders = [];
  let stage,
    character = 'stanley',
    product = 'polysaccharide',
    mode = 'menu',
    actors = [],
    enzymes = [],
    teeth = [],
    villi = [],
    drops = [],
    moving = true,
    disposed = false,
    raf = 0,
    last = 0,
    time = 0,
    age = 0,
    ph = 6.8,
    targetPH = 6.8,
    paused = false,
    cameraTarget = new T.Vector3(0, 0, 2),
    lookTarget = new T.Vector3(0, 0, -8),
    cameraLook = new T.Vector3(0, 0, -8),
    teachingOrientation = new T.Quaternion(),
    swallow = null,
    mucosa = null,
    microbiota = null,
    motility = null,
    flow = null,
    epithelium = null,
    epithelialState = null,
    finale = null,
    physiologyTime = 0,
    wall = null,
    organPath = null,
    targets = [],
    choiceTargets = [],
    hovered = -1,
    yaw = 0,
    pitch = 0,
    drag = null,
    cough = 0,
    secretions = null,
    acid = null,
    soundBeats = new Map(),
    sceneSoundEvents = new Set(),
    lastDiagnostics = -Infinity,
    diagnosticsDirty = true;
  const budget = renderBudget(devicePixelRatio || 1);
  function finaleViewportLook(width, height) {
    if (mode === 'finale') lookTarget.y = width <= 600 && height <= 650 ? 0 : -2.5;
  }
  const resize = () => {
    const b = canvas.getBoundingClientRect();
    renderer.setSize(b.width, b.height, false);
    renderer.setPixelRatio(budget.ratio);
    cores.forEach((c) => c.mucosa?.setBudget(budget.ratio));
    tract?.connections.forEach((c) => c.mucosa?.setBudget(budget.ratio));
    camera.aspect = b.width / Math.max(1, b.height);
    camera.fov = digestionFieldOfView(camera.aspect);
    camera.updateProjectionMatrix();
    finaleViewportLook(b.width, b.height);
    labelLayer.invalidate();
    epithelium?.layout?.(b.width, b.height);
    if (enzymes.length && mode === 'boss') labelChoices(enzymes.map((e) => e.userData.label || ''));
    wake();
  };
  const obs = new ResizeObserver(resize);
  obs.observe(canvas);
  function mesh(geometry, color, parent = root, roughness = 0.63) {
    const m = new T.Mesh(
      geometry,
      new T.MeshStandardMaterial({ color, roughness, side: T.DoubleSide }),
    );
    parent.add(m);
    return m;
  }
  function sphere(x, y, z, r, color, parent = root) {
    const m = mesh(new T.SphereGeometry(r, 16, 10), color, parent);
    m.position.set(x, y, z);
    return m;
  }
  function bond(a, b, color, parent = root, r = 0.055) {
    const av = new T.Vector3(...a),
      bv = new T.Vector3(...b),
      d = bv.clone().sub(av);
    const m = mesh(new T.CylinderGeometry(r, r, d.length(), 8), color, parent);
    m.position.copy(av).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    return m;
  }
  function molecule(id, parent = root, form = product) {
    const m = nutrientModel(id, form);
    parent.add(m);
    return m;
  }
  function enzyme(x, y, z, color, index) {
    const g = new T.Group();
    root.add(g);
    g.position.set(x, y, z);
    g.userData.choice = index;
    enzymes.push(g);
    return g;
  }
  function free(group) {
    group?.traverse((o) => {
      if (o.userData.geometryLods) o.userData.geometryLods.forEach((g) => g.dispose());
      else o.geometry?.dispose();
      o.userData.ownedTexture?.dispose();
      if (o.isInstancedMesh) o.dispose();
      if (o.material)
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
    });
  }
  function disposeRoot() {
    // Only the transient teaching layer changes; the anatomical core persists.
    scene.remove(root);
    free(root);
    root = new T.Group();
    scene.add(root);
    actors = [];
    enzymes = [];
    teeth = [];
    drops = [];
    targets = [];
    canvas.dataset.villusCount = '0';
    canvas.dataset.mucosaRegion = '';
    wall = null;
    swallow = null;
    mucosa = null;
    microbiota = null;
    motility = flow = epithelium = epithelialState = finale = null;
    secretions = null;
    acid = null;
  }
  function tag(object, target) {
    object.userData.target = target;
    targets.push(object);
    return object;
  }
  function tableau(dx = 0, dy = 0, dz = 0) {
    const pose = { position: cameraTarget, look: lookTarget },
      forward = pose.look.clone().sub(pose.position).normalize();
    const right = forward
      .clone()
      .cross(new T.Vector3(0, 1, 0))
      .normalize();
    if (right.lengthSq() < 0.01) right.set(1, 0, 0);
    const up = right.clone().cross(forward).normalize();
    return pose.look
      .clone()
      .addScaledVector(right, dx)
      .addScaledVector(up, dy)
      .addScaledVector(forward, dz);
  }
  function lumen(s) {
    canvas.dataset.environmentBuilds = String(Number(canvas.dataset.environmentBuilds || 0) + 1);
    const stomach = s.id === 'stomach',
      colon = [
        'caecum',
        'ascending',
        'transverse',
        'descending',
        'sigmoid',
        'rectum',
        'anus',
      ].includes(s.id),
      small = ['duodenum', 'jejunum', 'ileum'].includes(s.id),
      mouth = s.id === 'mouth';
    const descriptor = tract.byId[s.id];
    const built = descriptor.built;
    organPath = built.path;
    wall = mesh(
      built.geometry,
      stomach ? 0xa34a61 : colon ? 0xb17e83 : small ? 0xc78b8e : 0xb96f72,
    );

    tag(wall, 'inspect');
    wall.userData.labelOccluder = true;
    // Small-bowel surfaces face into the lumen. From the station camera the
    // opposite faces are hidden wall backs; other organs retain both sides.
    wall.material.side = small ? T.FrontSide : T.DoubleSide;
    wall.material.roughness = 0.45;
    if (texture) {
      wall.material.map = texture;
      wall.material.bumpMap = texture;
      wall.material.bumpScale = 0.055;
    }
    motility = createMotility(s.id, built);
    if (motility) motility.material(wall.material);
    microbiota = buildMicrobiota(s.id, built, motility);
    if (microbiota) root.add(microbiota.group);

    canvas.dataset.organShape = built.geometry.userData.kind;
    if (stomach && character === 'stanley') {
      const amylase = mesh(new T.TorusKnotGeometry(0.22, 0.06, 32, 7), 0x65d6ec);
      amylase.position.set(-0.6, 0.3, -6.5);
      amylase.material.transparent = true;
      actors.push({ object: amylase, type: 'amylase-inhibition' });
    }
    if (stomach) {
      const folds = mesh(buildGastricFolds({ ports: built.stomachPorts }), 0xcb7c8b);
      folds.userData.labelOccluder = true;
      motility.geometry(folds.geometry);
      motility.material(folds.material);
      const gate = buildPyloricGate(),
        outward = descriptor.outlet.outward.clone().transformDirection(descriptor.inverse);
      gate.position
        .copy(descriptor.outlet.center)
        .applyMatrix4(descriptor.inverse)
        .addScaledVector(outward, -0.025);
      gate.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), outward);
      root.add(gate);
      actors.push({ object: gate, type: 'pylorus-gate' });
      for (const [name, port] of [
        ['Cardia · fra oesophagus', descriptor.inlet],
        ['Pylorus · til duodenum', descriptor.outlet],
      ]) {
        const p = port.center.clone().applyMatrix4(descriptor.inverse);
        const inward = new T.Vector3(0, -0.5, -6.8).sub(p).normalize();
        root.add(
          anatomicalLabel(
            name,
            p
              .clone()
              .addScaledVector(inward, 0.3)
              .add(new T.Vector3(0, 0.25, 0))
              .toArray(),
            2,
            { priority: 90 },
          ),
        );
      }
      for (const [text, u, v] of [
        ['Fundus', 0.22, 0.5],
        ['Corpus', 0.43, 0.65],
        ['Antrum pyloricum', 0.63, 0.12],
        ['Curvatura major', 0.47, 0.5],
        ['Curvatura minor', 0.4, 0],
      ]) {
        const p = stomachPoint(u, v),
          center = new T.Vector3(0.8, -1, -6.8);
        p.lerp(center, 0.08);
        const frame = gastricFrame(p);
        root.add(
          anatomicalLabel(text, p.toArray(), 2, {
            priority: text === 'Corpus' ? 70 : 50,
            deform: { motility, rest: p.clone(), u: frame.u, axis: frame.axis },
          }),
        );
      }
      const liquid = mesh(new T.CircleGeometry(5, 48), 0x9e9146);
      liquid.rotation.x = -Math.PI / 2;
      liquid.position.set(0.5, -2.8, -6.8);
      liquid.material.transparent = true;
      liquid.material.opacity = 0.45;
    }
    if (small) {
      mucosa = buildVilli(s.id, built, texture, motility);
      root.add(mucosa.mesh);
      mucosa.setBudget(budget.ratio);
      canvas.dataset.villusCount = String(mucosa.count);
      canvas.dataset.mucosaRegion = s.id;
    } else {
      canvas.dataset.villusCount = '0';
      canvas.dataset.mucosaRegion = '';
    }
    if (mouth) {
      const oralRoot = root,
        oralStructures = new T.Group();
      oralStructures.position.fromArray(ORAL_CENTER);
      oralRoot.add(oralStructures);
      root = oralStructures;
      const face = buildExternalFace();
      oralStructures.add(face.group);
      tag(face.nose, 'nose');
      const chewing = buildChewingAnatomy();
      root.add(chewing.group);
      teeth = chewing.teeth;
      actors.push({ object: chewing.group, type: 'chewing', update: chewing.update });
      const palate = sphere(0, 2.8, -1, 1.4, 0xb96a7c);
      palate.scale.set(2, 0.24, 2.5);
      const lips = mesh(new T.TorusGeometry(3.15, 0.4, 12, 48), 0x933858);
      lips.position.z = 3;
      lips.scale.y = 0.7;
      tag(lips, 'mouth');
      root = oralRoot;
    }
    if (s.id === 'anal') {
      for (const y of [-0.7, -2.1]) {
        const ring = mesh(new T.TorusGeometry(0.95, 0.13, 12, 48), 0xc8778d);
        ring.position.set(0, y, 0);
        ring.rotation.x = -Math.PI / 2;
        actors.push({ object: ring, type: 'sphincter' });
      }
    }
    if (['pharynx', 'epiglottis'].includes(s.id)) {
      swallow = buildSwallowAnatomy({ labels: true, continuous: true });
      root.add(swallow.group);
      swallow.group.traverse((o) => {
        if (o.isMesh) o.userData.labelOccluder = true;
      });
      if (s.id === 'pharynx') tag(swallow.epiglottis, 'epiglottis');
      tag(swallow.trachea, 'trachea');
      tag(swallow.oesophagus, 'oesophagus');
    }
    if (s.id === 'ileum') {
      for (let i = 0; i < 6; i++) {
        const p = sphere(2.3, -0.7, -4 - i * 1.5, 0.32, 0xd8ac96);
        p.scale.set(0.14, 0.6, 1.6);
      }
    }
    if (s.id === 'caecum') {
      const lips = buildIleocaecalLips();
      root.add(lips);
      actors.push({ object: lips, type: 'ileocaecal-valve' });
      for (const [text, p, w] of [
        ['Caecums blinde bund', [0, -3.5, -6], 2.5],
        ['Ileocøkalklap', [2.4, 0.9, -5.9], 1.8],
        ['Appendix · lille åbning', [1.7, -2, -7.4], 2.3],
        ['Colon ascendens', [0.4, 3.6, -7], 2],
      ])
        root.add(
          anatomicalLabel(text, p, w, {
            priority: text.includes('Ileoc') ? 90 : 60,
            deform: {
              motility,
              rest: new T.Vector3(...p),
              u: T.MathUtils.clamp((p[1] + 4.2) / 9, 0, 1),
              axis: new T.Vector3(0.35, p[1], -6.2),
            },
          }),
        );
      canvas.dataset.caecumBranches = JSON.stringify(built.geometry.userData.branches);
      const target = (point, id) => {
        const marker = new T.Object3D();
        marker.position.fromArray(point);
        root.add(marker);
        tag(marker, id);
      };
      target(built.geometry.userData.branches.appendix.center, 'appendix');
      target([0.3, 3, -6], 'ascending');
    }
    if (['ascending', 'transverse', 'descending', 'sigmoid'].includes(s.id)) {
      const { along, around } = built.geometry.userData,
        positions = built.geometry.attributes.position;
      for (const [text, u, a] of [
        ['Haustra', 0.18, 0.1],
        ['Semilunære folder', 0.32, 0.65],
      ]) {
        const row = Math.round(along * u),
          column = Math.round(around * a),
          p = new T.Vector3().fromBufferAttribute(positions, row * (around + 1) + column);
        p.lerp(built.path.getPointAt(row / along), 0.08);
        root.add(
          anatomicalLabel(text, p.toArray(), 2, {
            priority: 65,
            deform: {
              motility,
              rest: p.clone(),
              u: row / along,
              axis: built.path.getPointAt(row / along),
            },
          }),
        );
      }
    }
    // No artificial exit marker: the continuous lumen/folds are the anatomical route.
    secretions = addSecretions(root, s, character);
    if (mouth) secretions.group.position.fromArray(ORAL_CENTER);
    if (!['mouth', 'pharynx', 'epiglottis'].includes(s.id)) {
      flow = lumenFlow(s.id, built);
      root.add(flow.mesh);
    }
  }
  function freezeStatic(group) {
    group.traverse((object) => {
      object.updateMatrix();
      object.matrixAutoUpdate = false;
    });
  }
  function ensureTract() {
    if (tract) return;
    tract = buildDigestiveTract();
    routeCamera = createRouteCamera(tract);
    coreRoot = new T.Group();
    coreRoot.matrixAutoUpdate = false;
    coreRoot.updateMatrix();
    coreRoot.name = 'continuous-digestive-tract';
    scene.add(coreRoot);
    const priorRoot = root,
      priorStage = stage;
    for (const d of tract.segments) {
      root = new T.Group();
      root.name = d.id;
      root.applyMatrix4(d.matrix);
      coreRoot.add(root);
      actors = [];
      drops = [];
      teeth = [];
      targets = [];
      swallow = mucosa = microbiota = motility = flow = secretions = wall = null;
      const logical = ROUTE.find((s) => s.id === d.id) || { ...ROUTE.at(-1), id: 'anal' };
      stage = logical;
      lumen(logical);
      const core = {
        group: root,
        descriptor: d,
        wall,
        motility,
        mucosa,
        microbiota,
        flow,
        swallow,
        secretions,
        actors: [...actors],
        drops: [...drops],
        teeth: [...teeth],
        targets: [...targets],
      };
      freezeStatic(root);
      for (const object of [
        ...actors.map((a) => a.object),
        ...teeth.slice(16),
        ...(swallow ? [swallow.group] : []),
      ])
        object.traverse((child) => (child.matrixAutoUpdate = true));
      cores.set(d.id, core);
      root.updateMatrix();
      root.matrixAutoUpdate = false;
    }
    for (const c of tract.connections) {
      const m = mesh(c.geometry, 0xffffff, coreRoot);
      m.name = c.id;
      m.userData.labelOccluder = true;
      m.material.vertexColors = true;
      m.material.map = texture;
      m.material.bumpMap = texture;
      m.material.bumpScale = 0.055;
      m.material.roughness = 0.45;
      c.mesh = m;
      m.updateMatrix();
      m.matrixAutoUpdate = false;
      if (c.mucosaRegion) {
        const built = {
          geometry: c.geometry,
          path: c.path,
          frames: c.path.computeFrenetFrames(24, false),
          surfaceFrame: c.surfaceFrame,
          mucosaRegion: c.mucosaRegion,
        };
        c.motility = createMotility(c.from, built);
        c.motility.material(m.material);
        c.mucosa = buildVilli(c.from, built, texture, c.motility);
        m.add(c.mucosa.mesh);
        c.mucosa.setBudget(budget.ratio);
        freezeStatic(c.mucosa.mesh);
      }
    }
    bathroom = buildFinale({ continuous: true });
    const end = tract.route.getPointAt(1);
    bathroom.group.position.set(end.x, end.y - 1.15, end.z + 6.3);
    bathroom.idle();
    coreRoot.add(bathroom.group);
    visibilityUpdate = createTractVisibility(tract, cores, bathroom.group);
    coreRoot.traverse((o) => {
      if (o.userData.anatomicalLabel) anatomyAnchors.push(o);
      if (o.userData.labelOccluder) labelOccluders.push(o);
    });
    root = priorRoot;
    stage = priorStage;
    canvas.dataset.environmentBuilds = '1';
    canvas.dataset.physicalRouteVersion = String(tract.version);
  }
  function selectCore(s) {
    activeCore = cores.get(s.id === 'epiglottis' ? 'pharynx' : s.id === 'anus' ? 'anal' : s.id);
    if (activeCore.secretionCharacter !== character) {
      activeCore.group.remove(activeCore.secretions.group);
      free(activeCore.secretions.group);
      activeCore.secretions = addSecretions(activeCore.group, stage, character);
      activeCore.secretionCharacter = character;
      if (stage.id === 'mouth') activeCore.secretions.group.position.fromArray(ORAL_CENTER);
      freezeStatic(activeCore.secretions.group);
    }
    ({ wall, motility, mucosa, microbiota, flow, swallow, secretions } = activeCore);
    organPath = activeCore.descriptor.built.path;
    activeCore.actors
      .filter((a) => a.type === 'amylase-inhibition')
      .forEach((a) => (a.object.visible = character === 'stanley'));
    actors = [...activeCore.actors];
    drops = [...activeCore.drops];
    teeth = [...activeCore.teeth];
    targets = [...activeCore.targets];
    root.applyMatrix4(activeCore.descriptor.matrix);
    const pose = tract.stations[s.id];
    cameraTarget.copy(pose.localPosition);
    lookTarget.copy(pose.localLook);
    canvas.dataset.villusCount = String(mucosa?.count || 0);
    canvas.dataset.mucosaRegion = mucosa ? s.id : '';
    canvas.dataset.organShape = activeCore.descriptor.built.geometry.userData.kind;
  }
  function absorptionInLumen() {
    const pose = routeCamera.pose(stage.id),
      inverse = activeCore.descriptor.inverse;
    epithelium = buildSurfaceUptake(character, wall.geometry, motility, {
      localPosition: pose.position.clone().applyMatrix4(inverse),
      localLook: pose.look.clone().applyMatrix4(inverse),
      localUp: pose.up.clone().transformDirection(inverse),
      path: activeCore.descriptor.built.path,
      aspect: camera.aspect,
      fov: camera.fov,
    });
    root.add(epithelium.group);
  }
  function labelChoices(labels) {
    enzymes.forEach((e, i) => {
      e.userData.label = labels[i] || '';
      const identity = enzymeIdentity(labels[i] || '');
      e.visible = Boolean(identity);
      if (!identity) return;
      const width =
        cameraTarget.distanceTo(lookTarget) *
        Math.tan(T.MathUtils.degToRad(camera.fov / 2)) *
        2 *
        camera.aspect;
      const scale = Math.min(0.8, width / 5.5);
      e.position.copy(tableau((i - (labels.length - 1) / 2) * scale * 1.8, -0.2, 0));
      e.scale.setScalar(scale);
      e.quaternion.copy(teachingOrientation);
      if (e.userData.enzymeId === identity.id) return;
      for (const child of [...e.children]) {
        free(child);
        e.remove(child);
      }
      const model = enzymeModel(labels[i]);
      e.add(model);
      e.userData.enzymeId = identity.id;
      e.userData.kind = identity.id === 'bile' ? 'bile-salts' : 'protein-enzyme';
    });
    canvas.dataset.enzymeIdentities = JSON.stringify(
      enzymes.filter((e) => e.visible).map((e) => e.userData.enzymeId),
    );
    wake();
  }
  function selectEnzyme(label) {
    const identity = enzymeIdentity(label);
    if (!identity || identity.id === 'bile') return;
    const candidate = enzymes.find((e) => e.userData.enzymeId === identity.id);
    enzymeLife.select(label, character + ':' + stage.id, candidate);
    if (candidate) enzymes = enzymes.filter((e) => e !== candidate);
    diagnosticsDirty = true;
    wake();
  }
  function setScene(s, id, nextMode = 'travel', residue = false, nextProduct, initialAge = 0) {
    if (['villus', 'cell', 'membrane'].includes(nextMode)) nextMode = 'absorb';
    const checkpoint = typeof initialAge === 'object' ? initialAge : null;
    initialAge = checkpoint?.age ?? (typeof initialAge === 'number' ? initialAge : 0);
    const absorbing = nextMode === 'absorb';
    enzymeLife.enter(id + ':' + s.id, nextMode);
    if (
      epithelium?.packets &&
      character === 'trine' &&
      nextMode === 'travel' &&
      stage?.id === 'jejunum'
    ) {
      const coats = epithelium.group;
      epithelium.packets.forEach((p) => (p.cargo.visible = false));
      root.remove(coats);
      activeCore.group.add(coats);
      activeCore.retainedUptake = epithelium;
    }
    disposeRoot();
    stage = s;
    character = id;
    product =
      nextProduct || { stanley: 'polysaccharide', trine: 'triglyceride', poul: 'protein' }[id];
    mode = nextMode;
    age = Math.max(0, Math.min(3600, initialAge));
    if (checkpoint) {
      yaw = checkpoint.yaw ?? yaw;
      pitch = checkpoint.pitch ?? pitch;
      physiologyTime = checkpoint.worldTime ?? physiologyTime;
    }
    sceneSoundEvents.clear();
    targetPH = s.ph || ph;
    canvas.dataset.scale = 'centimeter';
    canvas.dataset.absorptionSpace = absorbing ? 'intestinal-lumen' : '';
    canvas.dataset.epithelialBarrier = String(absorbing);
    ensureTract();
    if (
      mode === 'face-intro' &&
      !(checkpoint?.physicalRouteVersion === tract.version && checkpoint.cameraDistance < 0)
    ) {
      yaw = 0;
      pitch = 0;
    }
    coreRoot.visible = mode !== 'menu';
    if (mode === 'menu') {
      routeCamera.reset();
      physiologyTime = time = 0;
      soundBeats.clear();
      for (const core of cores.values()) {
        core.retainedUptake = null;
        for (const child of [...core.group.children])
          if (child.name === 'uptake-at-real-opaque-mucosa') {
            core.group.remove(child);
            free(child);
          }
      }
    }
    if (mode !== 'finale') bathroom.idle();
    if (mode !== 'menu') {
      selectCore(s);
      enzymeLife.layer.matrix.copy(activeCore.descriptor.matrix);
      enzymeLife.layer.matrixAutoUpdate = false;
      enzymeLife.layer.matrixWorldNeedsUpdate = true;
      routeCamera.begin(s.id, mode, age, checkpoint);
      const teachingPose = routeCamera.pose(s.id),
        inverse = activeCore.descriptor.inverse;
      teachingOrientation.setFromRotationMatrix(
        new T.Matrix4().lookAt(
          teachingPose.position.clone().applyMatrix4(inverse),
          teachingPose.look.clone().applyMatrix4(inverse),
          teachingPose.up.clone().transformDirection(inverse),
        ),
      );
    }
    scene.background.set(0x24101b);
    scene.fog.color.set(0x24101b);
    rim.color.setHex(MUCOSA_REGIONS[s.id] ? 0xffd6cc : 0xc7b5bf);
    rim.intensity = 4;
    if (mode === 'menu') {
      const m = molecule(id);
      m.position.set(0, 3.2, -5);
      m.scale.setScalar(0.8);
      actors.push({ object: m, type: 'molecule', i: 0 });
      cameraTarget.set(0, 0, 2);
      lookTarget.set(0, 0, -8);
    } else if (['entry', 'face-intro'].includes(mode)) {
      for (let i = 0; i < 5; i++) {
        const food = sphere(0, 0, 0, 0.15, 0xc7a46a);
        actors.push({ object: food, type: 'face-food', i });
      }
    } else if (mode === 'finale') {
      finale = bathroom;
      scene.background.set(0x29313d);
      scene.fog.color.set(0x29313d);
    } else if (mode === 'bile') {
      epithelium = buildEmulsification();
      epithelium.group.position.copy(tableau(0, 0, -0.5));
      root.add(epithelium.group);
    } else if (mode === 'micelle') {
      epithelium = buildMicelleAssembly();
      epithelium.group.position.copy(tableau(0, 0, -0.5));
      root.add(epithelium.group);
    } else if (!['entry', 'face-intro', 'journey', 'swallow'].includes(mode)) {
      if (absorbing) {
        absorptionInLumen();
      } else {
        if (mode === 'intro')
          for (let i = 0; i < 8; i++) {
            const food = sphere(Math.sin(i) * 0.4, Math.cos(i) * 0.3, -3, 0.25, 0xc39e67);
            actors.push({ object: food, type: 'food', i });
          }
        if (['caecum', 'ascending', 'transverse', 'descending', 'sigmoid', 'rectum'].includes(s.id))
          for (let i = 0; i < 8; i++) {
            const water = sphere(
              Math.cos(i) * 1.5,
              Math.sin(i) * 1.5,
              -3 - i * 0.5,
              0.06,
              0x81c8ee,
            );
            actors.push({ object: water, type: 'water-out', i });
          }
        const mol = residue ? new T.Group() : molecule(id);
        if (residue) {
          root.add(mol);
          for (let i = 0; i < 8; i++)
            bond(
              [-0.7 + i * 0.2, Math.sin(i) * 0.2, 0],
              [-0.5 + i * 0.2, Math.sin(i + 1) * 0.2, 0],
              0xc9b58c,
              mol,
              0.07,
            );
        }
        mol.position.copy(tableau(0, 0.9, -0.25));
        if (id === 'trine' && s.id === 'duodenum' && mode === 'reaction') {
          const interfaceDrop = sphere(0, 0, 0, 0.9, 0xd6b25f);
          interfaceDrop.position.copy(tableau(0, 0.9, 0.65));
          interfaceDrop.material.transparent = true;
          interfaceDrop.material.opacity = 0.15;
          interfaceDrop.material.depthWrite = false;
        }
        if (['pharynx', 'epiglottis', 'caecum'].includes(s.id)) mol.visible = false;
        mol.scale.setScalar(0.65);
        mol.quaternion.copy(teachingOrientation);
        actors.push({
          object: mol,
          type: 'substrate',
          viewQuaternion: teachingOrientation.clone(),
        });
        if (mode === 'hcl') {
          acid = buildAcidSecretion({ target: mol.position.clone(), motility });
          root.add(acid.group);
        }
        const chemical = !(
          (s.id === 'mouth' && id !== 'stanley') ||
          (s.id === 'stomach' && id === 'stanley')
        );
        if (['reaction', 'secretion', 'brush-border'].includes(mode) && chemical)
          for (let i = 0; i < 8; i++) {
            const w = sphere((i - 4) * 0.3, -0.3, -5, 0.06, 0x80cbe0);
            drops.push(w);
          }
        if (mode === 'bile') {
          for (let i = 0; i < 8; i++) {
            const droplet = sphere(
              ((i % 4) - 1.5) * 0.7,
              0.7 + Math.floor(i / 4) * 0.7,
              -5,
              0.32,
              0xd6c36e,
            );
            actors.push({ object: droplet, type: 'fat-drop', i });
          }
        }
        if (s.id === 'duodenum')
          for (let i = 0; i < 32; i++)
            sphere(2 - i * 0.13, 0.7 - i * 0.03, -6 - i * 0.1, 0.07, i % 2 ? 0xb3cc66 : 0xf3d3ac);
        if (mode === 'boss')
          for (let i = 0; i < 3; i++)
            enzyme((i - 1) * 1.7, 0.8, -6, [0x87d4b6, 0xb29be8, 0xf6b955][i], i);
        if (['reaction', 'secretion', 'brush-border'].includes(mode) && chemical) {
          if (!enzymeLife.current)
            selectEnzyme(
              id === 'stanley'
                ? s.id === 'jejunum'
                  ? 'maltase'
                  : s.id === 'mouth'
                    ? 'spytamylase'
                    : 'bugspytamylase'
                : id === 'trine'
                  ? 'lipase'
                  : s.id === 'stomach'
                    ? 'pepsin'
                    : s.id === 'jejunum'
                      ? 'peptidaser'
                      : 'trypsin',
            );
        }
      }
    }
    canvas.dataset.hypotheses = JSON.stringify(
      enzymes.filter((e) => e.visible).map((e) => e.userData.kind || 'protein-enzyme'),
    );
    diagnosticsDirty = true;
    const teachingAnchors = [];
    root.traverse((o) => {
      if (o.userData.anatomicalLabel) teachingAnchors.push(o);
    });
    labelLayer.setAnchors([...anatomyAnchors, ...teachingAnchors]);
    // Keep ambient food specks out of the teaching section; only the relevant
    // nutrient packets cross its epithelium. Wall/villus motility continues.
    if (flow) flow.mesh.visible = !absorbing;
    canvas.dataset.digestStage = s.id;
    canvas.dataset.digestMode = mode;
    canvas.dataset.molecularForm = product;
    canvas.dataset.absorptionDestination = 'intestinal-wall';
    // Geometry construction is loading time, not elapsed animation time.
    last = performance.now();
    wake();
  }
  function frame(now) {
    raf = 0;
    if (disposed || !stage) return;
    const elapsed = Math.max(0, (now - last) / 1000 || 0.016);
    const dt = paused ? 0 : Math.min(0.08, elapsed);
    last = now;
    if (!paused) {
      age += sceneStep(elapsed, mode);
      if (moving) {
        time += dt;
        physiologyTime += Math.min(0.5, elapsed);
      }
    }
    const organTime = physiologyTime;
    const gastric = cores.get('stomach'),
      gastricEnd = tract?.parts.find((p) => p.id === 'stomach')?.end;
    if (gastric) {
      const aperture = pyloricAperture(
        (physiologyTime / 20) % 1,
        (routeCamera?.distance ?? -100) - gastricEnd,
      );
      for (const actor of gastric.actors)
        if (actor.type === 'pylorus-gate') actor.object.userData.aperture.value = aperture;
    }
    for (const c of tract?.connections || []) {
      c.motility?.update(organTime, moving);
      if (c.mucosa) c.mucosa.clock.value = moving ? physiologyTime : 0;
    }
    for (const core of cores.values()) {
      if (core.microbiota && core.group.visible)
        core.microbiota.clock.value = moving ? organTime : 0;
      if (core === activeCore) continue;
      core.swallow?.update(3, false);
      if (core.group.visible) {
        core.flow?.update(moving ? organTime : 0);
        core.secretions?.update(moving ? time : 2, ph);
      }
      core.motility?.update(organTime, moving);
      if (core.mucosa) core.mucosa.clock.value = moving ? physiologyTime : 0;
    }
    motility?.update(organTime, moving);
    for (const core of cores.values()) if (core.group.visible) core.retainedUptake?.update(10);
    if (flow?.mesh.visible) flow.update(moving ? organTime : 0);
    if (epithelium) epithelialState = epithelium.update(moving ? age : 10, mode, organTime);
    const finalePose = finale?.update(moving ? age : 5.2);
    secretions?.update(moving ? time : 2, ph);
    if (acid) canvas.dataset.acidState = JSON.stringify(acid.update(moving ? age : 4));
    else canvas.dataset.acidState = 'null';
    if (mucosa) mucosa.clock.value = moving ? physiologyTime : 0;
    if (swallow)
      canvas.dataset.swallowPose = JSON.stringify(swallow.update(age, mode === 'swallow'));
    ph += (targetPH - ph) * Math.min(1, dt * 1.6);
    if (mode !== 'menu' && routeCamera) {
      routeCamera.update(age);
      const pose = routeCamera.pose(stage.id);
      camera.position.copy(pose.position);
      cameraLook.copy(pose.look);
      camera.up.copy(pose.up);
    } else {
      camera.position.copy(cameraTarget);
      cameraLook.copy(lookTarget);
      camera.up.set(0, 1, 0);
    }
    const view = anatomicalLook(camera.position, cameraLook, yaw, pitch);
    cameraLook.copy(view.look);
    camera.up.copy(view.up);
    camera.lookAt(cameraLook);
    if (cough > 0) {
      cough -= dt;
      rim.intensity = 18 + Math.sin(cough * 20) * 3;
    }
    light.intensity = 14;
    light.position.copy(camera.position);
    light.position.addScaledVector(camera.up, 0.6);
    rim.position
      .copy(camera.position)
      .addScaledVector(new T.Vector3(1, 0, 0).applyQuaternion(camera.quaternion), 2);
    const emitOnce = (key, event) => {
      if (!sceneSoundEvents.has(key)) {
        sceneSoundEvents.add(key);
        onPhysiology(event);
      }
    };
    const beat = (key, value, event) => {
      if (soundBeats.get(key) !== value) {
        soundBeats.set(key, value);
        if (value >= 0) onPhysiology(event);
      }
    };
    if (!paused && moving) {
      if (stage.id === 'mouth' && !['menu', 'entry', 'face-intro'].includes(mode))
        beat('chew', chewBeat(time), 'chew');
      if (stage.id === 'oesophagus') beat('oesophagus', Math.floor(organTime / 9), 'peristalsis');
      if (stage.id === 'stomach') beat('stomach', Math.floor(organTime / 20), 'rumble');
      if (['duodenum', 'jejunum', 'ileum'].includes(stage.id))
        beat(
          'wet',
          Math.floor(organTime / 6.7),
          stage.id === 'duodenum' ? 'secretion' : 'peristalsis',
        );
      if (
        ['caecum', 'ascending', 'transverse', 'descending', 'sigmoid', 'rectum'].includes(stage.id)
      )
        beat('colon', Math.floor(organTime / 8.7), 'bubble');
      if (mode === 'reaction' && age >= 2) emitOnce('binding', 'binding');
      if (mode === 'reaction' && age >= 3.2) emitOnce('cleave', 'cleave');
      if (mode === 'absorb' && age >= 3) emitOnce('absorption', 'absorption');
      if (mode === 'finale' && age >= 4.8) emitOnce('splash', 'splash');
    }
    canvas.dataset.chewingPhase = String(chewingPose(time));
    canvas.dataset.chewBeat = String(chewBeat(time));
    for (const [i, m] of drops.entries()) {
      if (moving) m.position.z += dt * 0.5;
      if (m.position.z > 2) m.position.z = -18;
    }
    for (const a of actors) {
      const m = a.object;
      if (a.type === 'ileocaecal-valve') {
        const phase = (organTime / 28) % 1;
        const localEye = camera.position.clone().applyMatrix4(activeCore.descriptor.inverse);
        const gap = ileocaecalGap(
          phase,
          localEye.distanceTo(new T.Vector3(3.06, 0.65, -6)),
          moving,
        );
        m.children.forEach((lip, i) => {
          const p = new T.Vector3(3.06, 0.65 + (i ? 1 : -1) * gap, -6);
          lip.position.copy(motility.point(p, (p.y + 4.2) / 9, new T.Vector3(0.35, p.y, -6.2)));
        });
      }
      if (a.type === 'fat-drop') {
        const f = moving ? Math.min(1, age / 3) : 1;
        m.scale.setScalar(1 - f * 0.45);
        m.position.copy(
          tableau(((a.i % 4) - 1.5) * (0.2 + f * 0.45), 0.5 + Math.floor(a.i / 4) * 0.4, -0.1),
        );
      }
      if (a.type === 'substrate' && stage.id === 'oesophagus' && organPath && moving) {
        m.position.copy(organPath.getPointAt(Math.min(0.92, motility.clock.value.x + 0.09)));
        m.visible = motility.clock.value.x < 0.84;
      }
      if (a.type === 'molecule' || a.type === 'substrate') {
        const angle = moving ? Math.sin(time * 0.5 + (a.i || 0)) * 0.18 : 0;
        if (a.viewQuaternion)
          m.quaternion
            .copy(a.viewQuaternion)
            .multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), angle));
        else m.rotation.y = angle;
        if (
          mode === 'denaturation' &&
          character === 'poul' &&
          stage.id === 'stomach' &&
          m.userData.update
        )
          m.userData.denature(moving ? Math.min(1, age / 6) : 1);
        if (mode === 'reaction' && m.userData.update) {
          if (stage.id === 'jejunum') {
            const f = moving ? Math.min(1, age / 1.2) : 1;
            m.position.copy(tableau(0.2 * f, 0.9 - 0.5 * f, 0));
          }
          const state = m.userData.update(moving ? age : 7, stage.id, {
            denatured: character === 'poul' && stage.id === 'stomach',
          });
          canvas.dataset.reactionPhase = state.phase;
          canvas.dataset.cleavedBonds = String(m.userData.links.filter((l) => !l.visible).length);
        }
      }
      if (a.type === 'amylase-inhibition') {
        const activity = relativeActivity(ph, 'amylase');
        m.material.opacity = 0.2 + 0.8 * activity;
        m.rotation.y = time * 0.3 * activity;
      }
      if (a.type === 'face-food') {
        m.position.set(
          ORAL_CENTER[0] + (a.i - 2) * 0.16,
          ORAL_CENTER[1] - 0.15,
          3.6 + (mode === 'face-intro' ? 8 * (1 - Math.min(1, age / 3)) : 0),
        );
      }
      if (a.type === 'chewing')
        a.update(time, moving && !['menu', 'entry', 'face-intro'].includes(mode));
      if (a.type === 'food') {
        const f = moving ? Math.min(1, age / 10) : 1;
        const pose = chewingBolusPose(time, a.i, f);
        m.position.fromArray(pose.position).add(new T.Vector3(...ORAL_CENTER));
        m.scale.fromArray(pose.scale);
      }
      if (a.type === 'water-out' && moving) {
        const f = Math.min(1, age / 7);
        m.position.x = Math.cos(a.i) * (1.5 + f * 2.5);
        m.position.y = Math.sin(a.i) * (1.5 + f * 2.5);
        m.scale.setScalar(1 - f * 0.8);
      }
      if (a.type === 'sphincter')
        m.scale.setScalar(
          finalePose ? 1 + finalePose.release * 0.15 : moving ? 1 + Math.sin(time * 1.5) * 0.03 : 1,
        );
    }
    for (const [i, e] of enzymes.entries()) {
      e.quaternion
        .copy(teachingOrientation)
        .multiply(
          new T.Quaternion().setFromAxisAngle(
            new T.Vector3(0, 0, 1),
            moving ? Math.sin(time + i) * 0.08 : 0,
          ),
        );
      if (['reaction', 'secretion', 'brush-border'].includes(mode)) {
        const f = age < 3 ? Math.min(1, age / 2) : age < 6 ? 1 : Math.max(0, 1 - (age - 6) / 2);
        const approach = f;
        e.position.copy(tableau(-0.75 * (1 - approach), 0.25, 0.7 * (1 - approach)));
        const width =
          cameraTarget.distanceTo(lookTarget) *
          Math.tan(T.MathUtils.degToRad(camera.fov / 2)) *
          2 *
          camera.aspect;
        e.scale.setScalar(Math.min(0.75, width / 5));
        e.rotation.z = 0;
        canvas.dataset.enzymeIntact = String(e.children.length > 0);
      }
    }
    enzymeLife.stepExit(paused ? 0 : Math.min(0.4, elapsed), moving);
    if (enzymeLife.current) {
      const e = enzymeLife.current.object,
        reaction = mode === 'reaction',
        f = reaction
          ? age < 2
            ? T.MathUtils.smoothstep(age, 0, 2)
            : age < 6
              ? 1
              : 1 - T.MathUtils.smoothstep(age, 6, 7)
          : 0,
        exit = (enzymeLife.current.exit || 0) / 1.2,
        position = tableau(-0.8 + 0.45 * f - exit * 1.3, 0.4 + 0.35 * f, -0.25 + exit * 1.2),
        width =
          cameraTarget.distanceTo(lookTarget) *
          Math.tan(T.MathUtils.degToRad(camera.fov / 2)) *
          2 *
          camera.aspect;
      const blend = moving ? 1 - Math.exp(-Math.max(0, elapsed) * 6) : 1;
      e.position.lerp(position, blend);
      e.scale.lerp(new T.Vector3().setScalar(Math.min(0.75, width / 5)), blend);
      e.quaternion.slerp(
        teachingOrientation
          .clone()
          .multiply(
            new T.Quaternion().setFromAxisAngle(
              new T.Vector3(0, 0, 1),
              moving && !reaction ? Math.sin(time) * 0.08 : 0,
            ),
          ),
        blend,
      );
      canvas.dataset.enzymeIntact = 'true';
    }
    if (!paused && moving && budget.sample(elapsed * 1000)) resize();
    canvas.dataset.renderRatio = String(budget.ratio);
    if (coreRoot?.visible)
      canvas.dataset.visibleCells = JSON.stringify(visibilityUpdate(camera, routeCamera.distance));
    renderer.render(scene, camera);
    const viewport = canvas.getBoundingClientRect(),
      teachingClear = [
        ...actors.filter((a) => a.type === 'substrate').map((a) => a.object),
        ...enzymes.filter((e) => e.visible),
        ...(enzymeLife.current ? [enzymeLife.current.object] : []),
      ]
        .filter((o) => o.visible)
        .map((o) => {
          const p = o.getWorldPosition(new T.Vector3()).project(camera);
          return {
            x: ((p.x + 1) * viewport.width) / 2,
            y: ((1 - p.y) * viewport.height) / 2,
            radius: 40,
          };
        });
    labelLayer.update(
      camera,
      labelOccluders,
      now,
      mode !== 'menu' && (routeCamera?.distance ?? -1) >= 0,
      teachingClear,
    );
    // WebGLRenderer has already updated scene/camera matrices for this frame.
    // Diagnostic attributes are test hooks, not animation inputs.
    if (diagnosticsDirty || now - lastDiagnostics >= 200 || paused || !moving) {
      diagnosticsDirty = false;
      lastDiagnostics = now;
      if (stage?.id === 'stomach' && activeCore && mode !== 'menu') {
        const names = [
          ['Fundus', -2, 2, -7],
          ['Corpus', -2, -0.5, -9],
          ['Antrum', 3, -2, -8],
          ['Pylorus', 4.5, -1.8, -6.8],
          ['Curvatura major', -4, -1, -7],
          ['Curvatura minor', 3, 1, -7],
        ];
        canvas.dataset.landmarks = JSON.stringify(
          names.map(([name, x, y, z]) => {
            const p = new T.Vector3(x, y, z)
              .applyMatrix4(activeCore.descriptor.matrix)
              .project(camera);
            return {
              name,
              x: (p.x + 1) * 50,
              y: (1 - p.y) * 50,
              visible: p.z < 1 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1,
            };
          }),
        );
      } else if (mode === 'absorb') {
        canvas.dataset.landmarks = JSON.stringify([
          { name: 'Tarmlumen' },
          { name: 'Tarmepitel' },
          { name: 'Villi' },
        ]);
      } else canvas.dataset.landmarks = '[]';
      canvas.dataset.targets = JSON.stringify(
        targets.map((o) => {
          if (o.geometry && !o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
          const p = (
            o.userData.pickPosition?.clone() ||
            o.geometry?.boundingSphere?.center.clone() ||
            new T.Vector3()
          )
            .applyMatrix4(o.matrixWorld)
            .project(camera);
          return {
            target: o.userData.target,
            x: (p.x + 1) * 50,
            y: (1 - p.y) * 50,
            visible: p.z < 1 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1,
          };
        }),
      );
      if (finalePose)
        canvas.dataset.defecation = JSON.stringify({
          ...finalePose,
          camera: camera.position.toArray(),
          look: cameraLook.toArray(),
          waterY: finale.group.position.y + finalePose.waterY,
          residueY: finale.group.position.y + finalePose.residueY,
        });
      canvas.dataset.sceneAge = String(age);
      canvas.dataset.selectedEnzyme = JSON.stringify(enzymeLife.snapshot());
      canvas.dataset.enzymeModels = JSON.stringify([
        ...enzymes
          .filter((e) => e.visible)
          .flatMap((e) => e.children.map((m) => ({ id: m.userData.enzymeId, mesh: m.uuid }))),
        ...(enzymeLife.current ? [enzymeLife.snapshot()] : []),
      ]);
      canvas.dataset.look = JSON.stringify({ yaw, pitch });
      canvas.dataset.routeCamera = JSON.stringify(routeCamera?.checkpoint() || {});
      canvas.dataset.worldTime = String(physiologyTime);
      const oral = cores.get('mouth')?.group.getObjectByName('oral-tongue'),
        tongueBase = cores.get('pharynx')?.swallow?.tongue;
      canvas.dataset.oralState = JSON.stringify({
        face: Boolean(cores.get('mouth')?.group.getObjectByName('external-face-with-open-mouth')),
        tongue: oral?.getWorldPosition(new T.Vector3()).toArray(),
        tongueBase: tongueBase?.getWorldPosition(new T.Vector3()).toArray(),
        horizontalFov: T.MathUtils.radToDeg(
          2 * Math.atan(Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * camera.aspect),
        ),
      });
      canvas.dataset.camera = JSON.stringify({
        position: camera.position.toArray(),
        look: cameraLook.toArray(),
        fov: camera.fov,
        quaternion: camera.quaternion.toArray(),
        up: new T.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).toArray(),
        rollDegrees: (() => {
          const forward = camera.getWorldDirection(new T.Vector3()),
            up = new T.Vector3(0, 1, 0).applyQuaternion(camera.quaternion),
            ref = new T.Vector3(0, 1, 0).addScaledVector(forward, -forward.y).normalize();
          return T.MathUtils.radToDeg(Math.atan2(forward.dot(up.clone().cross(ref)), up.dot(ref)));
        })(),
      });
      canvas.dataset.uptakeTargets = JSON.stringify(
        (epithelium?.packets || []).map((p) => {
          const object = p.coat || p.cargo,
            point = object.position.clone().applyMatrix4(root.matrixWorld).project(camera);
          return {
            x: (point.x + 1) * 50,
            y: (1 - point.y) * 50,
            visible: Math.abs(point.x) < 1 && Math.abs(point.y) < 1 && point.z < 1,
          };
        }),
      );
      canvas.dataset.epithelialState = JSON.stringify(epithelialState || {});
      canvas.dataset.motility = JSON.stringify(
        motility
          ? {
              id: stage.id,
              kind: motility.kind,
              time: organTime,
              weights: motility.clock.value.toArray(),
            }
          : {},
      );
      canvas.dataset.molecularForm = product;
      canvas.dataset.microbiota = JSON.stringify({
        region: stage.id,
        count: microbiota?.count || 0,
        shapes: microbiota?.meshes.map((m) => m.userData.microbiotaShape) || [],
        time: microbiota?.clock.value || 0,
        normalMicrobiota: true,
        drawCalls: microbiota?.meshes.length || 0,
      });
      const nutrient = actors.find((a) => a.type === 'substrate')?.object;
      canvas.dataset.proteinState = JSON.stringify(
        character === 'poul' && nutrient?.userData.form === 'protein'
          ? {
              instance: nutrient.uuid,
              units: nutrient.userData.units.length,
              links: nutrient.userData.links.length,
              visibleLinks: nutrient.userData.links.filter((l) => l.visible).length,
              positions: nutrient.userData.units.map((u) => u.position.toArray()),
              denaturation: nutrient.userData.denaturationProgress || 0,
            }
          : null,
      );
      canvas.dataset.moleculeUnits = String(nutrient?.userData.units?.length || 0);
      canvas.dataset.absorptionDestination = 'intestinal-wall';
      canvas.dataset.secretionStreams = String(secretions?.count || 0);
      canvas.dataset.secretionEnzymeVisible = String(Boolean(secretions?.proteinVisible));
      canvas.dataset.ph = ph.toFixed(2);
      canvas.dataset.triangles = renderer.info.render.triangles;
      canvas.dataset.drawCalls = renderer.info.render.calls;
      canvas.dataset.geometries = renderer.info.memory.geometries;
    }
    if (
      !raf &&
      !paused &&
      (((moving || ['journey', 'swallow', 'intro', 'finale'].includes(mode)) &&
        !(mode === 'finale' && age > 8)) ||
        Math.abs(ph - targetPH) > 0.01)
    )
      raf = requestAnimationFrame(frame);
  }
  function wake() {
    if (!disposed && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }
  function mark(index) {
    hovered = index;
    targets.forEach((o) => {
      if (o.material?.emissive)
        o.material.emissive.setHex(choiceTargets[index] === o.userData.target ? 0x355b55 : 0);
    });
    enzymes.forEach((e, i) =>
      e.traverse((o) => {
        if (o.material?.emissive) o.material.emissive.setHex(i === index ? 0x244c55 : 0);
      }),
    );
    canvas.style.cursor = 'grab';
    wake();
  }
  const down = (e) => {
    drag = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false };
    canvas.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    if (drag) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 7) drag.moved = true;
      if (drag.moved) {
        diagnosticsDirty = true;
        yaw += (e.clientX - drag.lastX) * 0.004;
        pitch = T.MathUtils.clamp(pitch + (e.clientY - drag.lastY) * 0.003, -1.25, 1.25);
        wake();
      }
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
    }
  };
  const up = () => {
    drag = null;
  };
  const abort = () => {
    drag = null;
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', abort);
  canvas.style.touchAction = 'none';
  const visibility = () => {
    if (!document.hidden && !paused) wake();
  };
  document.addEventListener('visibilitychange', visibility);
  resize();
  return {
    setScene,
    travelNeeded(id) {
      ensureTract();
      return routeCamera.needed(id);
    },
    travelDuration(id) {
      return routeCamera.duration(id);
    },
    timeline() {
      return {
        stage: stage?.id,
        mode,
        age,
        worldTime: physiologyTime,
        yaw,
        pitch,
        ...(mode !== 'menu' ? routeCamera?.checkpoint() : {}),
      };
    },
    complete() {
      finale?.complete();
      wake();
    },
    labelChoices,
    selectEnzyme,
    learningState(run) {
      if (
        character === 'poul' &&
        stage.id === 'stomach' &&
        mode !== 'denaturation' &&
        (run?.proteinDenatured || run?.task >= 2 || mode === 'reaction')
      )
        actors
          .find((a) => a.type === 'substrate')
          ?.object.userData.update?.(-1, 'stomach', { denatured: true });
      const tasks = BOSSES[character]?.[stage.id] || [],
        last = mode === 'reaction' ? tasks.length : run?.task || 0,
        sourceIndex = tasks.findLastIndex(
          (q) => q.kind === 'source' && ['secretion', 'brush-border'].includes(q.visual),
        ),
        enzymeTask = tasks
          .slice(0, last)
          .findLast((q) => q.kind === 'enzyme' && enzymeIdentity(q.options[0])?.id !== 'bile');
      if (mode === 'boss' && run?.task === 0) enzymeLife.clear();
      else if (
        !enzymeLife.current &&
        enzymeTask &&
        ['boss', 'secretion', 'brush-border', 'reaction'].includes(mode)
      )
        selectEnzyme(enzymeTask.options[0]);
      secretions?.setProgress({
        enzyme: Boolean(
          run?.completed?.includes(stage.id) || (sourceIndex >= 0 && run?.task > sourceIndex),
        ),
        bile: mode === 'bile' || Boolean(run?.completed?.includes(stage.id) || run?.task > 1),
      });
      wake();
    },
    configureChoices(options, kind = 'anatomy') {
      if (mode === 'boss' && kind !== 'enzyme') enzymes.forEach((e) => (e.visible = false));
      canvas.dataset.hypotheses = JSON.stringify(
        enzymes.filter((e) => e.visible).map((e) => e.userData.kind),
      );
      choiceTargets = options.map((o) => o.target || '');
      canvas.dataset.targets = JSON.stringify(
        targets.map((o) => {
          if (o.geometry && !o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
          const p = (
            o.userData.pickPosition?.clone() ||
            o.geometry?.boundingSphere?.center.clone() ||
            new T.Vector3()
          )
            .applyMatrix4(o.matrixWorld)
            .project(camera);
          return { target: o.userData.target, x: (p.x + 1) * 50, y: (1 - p.y) * 50 };
        }),
      );
    },
    highlightChoice: mark,
    center() {
      diagnosticsDirty = true;
      yaw = 0;
      pitch = 0;
      wake();
    },
    feedback() {
      if (moving) cough = 0.5;
      wake();
    },
    settings(o) {
      moving = o.motion;
      resize();
      wake();
    },
    pause(v) {
      paused = v;
      if (!v) wake();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      obs.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', abort);
      document.removeEventListener('visibilitychange', visibility);
      disposeRoot();
      enzymeLife.clear();
      labelLayer.dispose();
      if (coreRoot) {
        scene.remove(coreRoot);
        free(coreRoot);
      }
      texture?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
