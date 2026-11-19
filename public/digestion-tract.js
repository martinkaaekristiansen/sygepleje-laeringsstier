import { MUCOSA_REGIONS } from './digestion-mucosa.js';
import * as T from './three.module.min.js';
import { buildOrganSurface, organCurve, stomachPoint, ORAL_CENTER } from './digestion-anatomy.js';
import { buildCaecumGeometry } from './digestion-caecum.js';
import {
  surfacePorts,
  transformPort,
  bridgePorts,
  invertSurface,
  orientSurface,
  smoothTractNormals,
} from './digestion-ports.js';

export const PHYSICAL_ROUTE_VERSION = 1;
export const PHYSICAL_ORDER = [
  'mouth',
  'pharynx',
  'oesophagus',
  'stomach',
  'duodenum',
  'jejunum',
  'ileum',
  'caecum',
  'ascending',
  'transverse',
  'descending',
  'sigmoid',
  'rectum',
  'anal',
];
export const JUNCTION_NAMES = [
  'mund-svaelg',
  'oevre-oesophaguslukke',
  'cardia',
  'pylorus',
  'duodenum-jejunum',
  'jejunum-ileum',
  'ileocoekal',
  'caecum-colon',
  'hoejre-colonfleksur',
  'venstre-colonfleksur',
  'colon-sigmoideum',
  'sigmoideum-rectum',
  'rectum-analkanal',
];
const V = (p) => new T.Vector3(...p);
const curve = (points) => new T.CatmullRomCurve3(points.map(V));
const placement = (p, q = new T.Quaternion()) =>
  new T.Matrix4().compose(V(p), q, new T.Vector3(1, 1, 1));
const rotation = (x, y, z = 0) => new T.Quaternion().setFromEuler(new T.Euler(x, y, z));
const color = (id) =>
  id === 'stomach'
    ? 0xa34a61
    : ['duodenum', 'jejunum', 'ileum'].includes(id)
      ? 0xc78b8e
      : ['caecum', 'ascending', 'transverse', 'descending', 'sigmoid', 'rectum', 'anal'].includes(
            id,
          )
        ? 0xb17e83
        : 0xb96f72;

class WorldCurve extends T.Curve {
  constructor(path, matrix) {
    super();
    this.path = path;
    this.matrix = matrix;
  }
  getPoint(t, target = new T.Vector3()) {
    return target.copy(this.path.getPointAt(t)).applyMatrix4(this.matrix);
  }
  getTangent(t, target = new T.Vector3()) {
    return target.copy(this.path.getTangentAt(t)).transformDirection(this.matrix);
  }
}
class ArcRoute extends T.Curve {
  constructor(parts) {
    super();
    this.parts = parts;
    this.ends = [];
    let s = 0;
    for (const p of parts) {
      p.start = s;
      s += p.path.getLength();
      p.end = s;
      this.ends.push(s);
    }
    this.length = s;
  }
  atDistance(s) {
    s = T.MathUtils.clamp(s, 0, this.length);
    const part = this.parts.find((p) => s <= p.end) || this.parts.at(-1);
    return { part, u: (s - part.start) / (part.end - part.start) };
  }
  getPoint(t, target = new T.Vector3()) {
    const { part, u } = this.atDistance(t * this.length);
    return part.path.getPointAt(u, target);
  }
  getPointAt(t, target = new T.Vector3()) {
    return this.getPoint(t, target);
  }
  getTangent(t, target = new T.Vector3()) {
    const { part, u } = this.atDistance(t * this.length);
    return part.path.getTangentAt(u, target);
  }
  getTangentAt(t, target = new T.Vector3()) {
    return this.getTangent(t, target);
  }
  getLength() {
    return this.length;
  }
}
function closestPort(ports, p) {
  return ports.reduce((a, b) =>
    a.center.distanceToSquared(p) < b.center.distanceToSquared(p) ? a : b,
  );
}

// Every wall is authored locally but is placed ONCE in this common world.
// Exact boundary rings are joined; camera and scene use the same route.
export function buildDigestiveTract() {
  const pharynxPath = new T.CurvePath();
  pharynxPath.add(
    new T.CubicBezierCurve3(
      V([ORAL_CENTER[0], ORAL_CENTER[1], -3.2]),
      V([ORAL_CENTER[0], ORAL_CENTER[1], -5.2]),
      V([0, 0.256854, -6.8]),
      V([0, -1.4, -6.8]),
    ),
  );
  pharynxPath.add(new T.LineCurve3(V([0, -1.4, -6.8]), V([0, -4, -6.8])));
  const definitions = {
    mouth: {
      path: curve([
        [ORAL_CENTER[0], ORAL_CENTER[1], 3],
        [ORAL_CENTER[0], ORAL_CENTER[1], 1],
        [ORAL_CENTER[0], ORAL_CENTER[1], -1.2],
        [ORAL_CENTER[0], ORAL_CENTER[1], -2.3],
      ]),
      radius: (u, a) => (3.5 * (1 - u) + 1.7 * u) * (1 + 0.025 * Math.cos(a * 2)),
      verticalScale: () => 0.8,
    },
    pharynx: { path: pharynxPath, radius: (u) => 2.6 - 1.4 * T.MathUtils.smoothstep(u, 0.45, 1) },
    oesophagus: {
      path: curve([
        [0, 0, 0],
        [0, -4, 1],
        [1.5, -8.7, 5.65],
        [3, -11, 6],
      ]),
      radius: (u, a) => 1.15 + 0.07 * Math.cos(a * 10),
      matrix: placement([0, -6, -6.7]),
    },
    stomach: {
      matrix: placement([6, -22, -6.8], rotation(0, Math.PI)),
      stomachPorts: [
        { name: 'cardia', center: stomachPoint(0.14, 0.03), radius: 1.05 },
        { name: 'pylorus', center: stomachPoint(0.58, 0), radius: 0.9 },
      ],
    },
    duodenum: {
      path: curve(
        organCurve('duodenum').points.map((p) =>
          p
            .clone()
            .sub(V([0, 0, 3]))
            .multiplyScalar(2.2)
            .add(V([0, 0, 3]))
            .toArray(),
        ),
      ),
      matrix: placement(
        [-5, -31, 0],
        new T.Quaternion().multiplyQuaternions(rotation(0, Math.PI), rotation(-Math.PI / 2, 0)),
      ),
    },
    jejunum: { matrix: placement([-19.6, -60, 9], rotation(0, -Math.PI / 2)) },
    ileum: {
      path: curve([
        [0, 0, 3],
        [0.8, -0.5, -3],
        [1.5, -1, -9],
        [-0.5, -0.8, -16],
        [0, -6, -21],
      ]),
      matrix: placement([1.4, -74, 9], rotation(0, Math.PI / 2)),
    },
    caecum: { matrix: placement([-34, -90, 15]) },
    ascending: {
      path: curve([
        [0, 0, 0],
        [0, 10, 0],
        [0, 28, 16],
        [0, 38, 21],
      ]),
      matrix: placement([-34, -80, 9]),
    },
    transverse: {
      path: curve([
        [0, 0, 0],
        [12, -1, 0],
        [36, -1, 0],
        [48, 0, 0],
      ]),
      matrix: placement([-24, -32, 30]),
    },
    descending: {
      path: curve([
        [0, 0, 0],
        [0, -10, -2],
        [0, -28, -16],
        [0, -40, -21],
      ]),
      matrix: placement([34, -42, 30]),
    },
    sigmoid: {
      path: curve(
        organCurve('sigmoid').points.map((p) =>
          p
            .clone()
            .sub(V([0, 0, 3]))
            .multiply(V([1, 1, 2.2]))
            .toArray(),
        ),
      ),
      matrix: placement(
        [24, -100, 8],
        new T.Quaternion().setFromUnitVectors(V([0, 0, -1]), V([-0.3, -Math.sqrt(0.91), 0])),
      ),
    },
    rectum: {
      path: curve([
        [0, 0, 0],
        [0, -4, 0],
        [0, -8, 0],
        [0, -12, 0],
      ]),
      radius: () => 2.65,
      matrix: placement([0, -102, 1]),
    },
    anal: {
      path: curve([
        [0, 0, 0],
        [0, -1, 0],
        [0, -2, 0],
        [0, -3.5, 0],
      ]),
      radius: (u) => 1.05 + 0.15 * Math.cos(u * Math.PI * 2),
      matrix: placement([0, -116, 1]),
    },
  };
  // Terminal authoring frames follow the sigmoid outlet. This avoids a tight
  // dogleg hidden inside the rectosigmoid/anal connections.
  const sigmoid = definitions.sigmoid,
    exit = sigmoid.path.getPointAt(1).applyMatrix4(sigmoid.matrix),
    direction = sigmoid.path.getTangentAt(1).transformDirection(sigmoid.matrix),
    terminalRotation = new T.Quaternion().setFromUnitVectors(V([0, -1, 0]), direction);
  definitions.rectum.matrix = placement(
    exit.clone().addScaledVector(direction, 8).toArray(),
    terminalRotation,
  );
  definitions.anal.matrix = placement(
    exit.clone().addScaledVector(direction, 22).toArray(),
    terminalRotation,
  );
  const segments = PHYSICAL_ORDER.map((id) => {
    const options = definitions[id],
      matrix = options.matrix || new T.Matrix4();
    const built = buildOrganSurface({ id }, false, options);
    built.stomachPorts = options.stomachPorts;
    if (id === 'duodenum') built.mucosaRegion = { ...MUCOSA_REGIONS.duodenum, count: 4840 };
    if (id === 'caecum') {
      built.geometry.dispose();
      built.geometry = invertSurface(orientSurface(buildCaecumGeometry()));
    }
    if (id === 'stomach') {
      const g = built.geometry,
        pos = g.attributes.position,
        uv = g.attributes.uv;
      for (const hole of surfacePorts(g)) {
        const definition = options.stomachPorts.reduce((a, b) =>
          a.center.distanceToSquared(hole.center) < b.center.distanceToSquared(hole.center) ? a : b,
        );
        const cu = definition.name === 'cardia' ? 0.14 : 0.58,
          cv = definition.name === 'cardia' ? 0.03 : 0;
        const du = stomachPoint(cu + 0.001, cv).distanceTo(stomachPoint(cu - 0.001, cv)) / 0.002;
        const dv = stomachPoint(cu, cv + 0.001).distanceTo(stomachPoint(cu, cv - 0.001)) / 0.002;
        const ru = definition.radius / du,
          rv = definition.radius / dv;
        const angles = hole.indices.map((k) => {
          let v = uv.getX(k) - cv;
          v -= Math.round(v);
          return Math.atan2((uv.getY(k) - cu) / ru, v / rv);
        });
        let orientation = 0;
        for (let i = 0; i < angles.length; i++) {
          let d = angles[(i + 1) % angles.length] - angles[i];
          d = Math.atan2(Math.sin(d), Math.cos(d));
          orientation += d;
        }
        hole.indices.forEach((k, i) => {
          const a = angles[0] + ((Math.sign(orientation) * i) / angles.length) * Math.PI * 2;
          const p = stomachPoint(cu + ru * Math.sin(a), cv + rv * Math.cos(a));
          // UV seam aliases must receive exactly the same replacement.
          const old = new T.Vector3().fromBufferAttribute(pos, k);
          for (let j = 0; j < pos.count; j++)
            if (new T.Vector3().fromBufferAttribute(pos, j).distanceToSquared(old) < 1e-10)
              pos.setXYZ(j, p.x, p.y, p.z);
        });
      }
      g.computeVertexNormals();
    }
    const ports = surfacePorts(built.geometry);
    if (ports.length !== 2)
      throw Error(`${id}: expected two main-channel openings, found ${ports.length}`);
    let inlet, outlet;
    if (id === 'stomach') {
      inlet = closestPort(ports, options.stomachPorts[0].center);
      outlet = ports.find((p) => p !== inlet);
      built.path = curve([
        inlet.center.toArray(),
        [0.2, 1, -6.6],
        [-0.5, -0.3, -5.6],
        [1, -1, -6.4],
        [3.8, -2, -6.8],
        outlet.center.toArray(),
      ]);
    } else if (id === 'caecum') {
      inlet = closestPort(ports, V(built.geometry.userData.branches.ileum.end));
      outlet = ports.find((p) => p !== inlet);
      const branch = built.geometry.userData.branches.ileum.path.slice().reverse();
      built.path = curve([
        inlet.center.toArray(),
        ...branch.slice(1),
        [1.5, 0.9, -6],
        [0.2, 2, -6],
        [0, 5, -6],
        outlet.center.toArray(),
      ]);
    } else {
      inlet = closestPort(ports, built.path.getPointAt(0));
      outlet = ports.find((p) => p !== inlet);
      // Centerline endpoint is exact; corrugated walls need not have a zero mean.
      inlet.center.copy(built.path.getPointAt(0));
      outlet.center.copy(built.path.getPointAt(1));
    }
    const incoming = built.path.getTangentAt(0).negate(),
      outgoing = built.path.getTangentAt(1);
    return {
      id,
      built,
      matrix,
      inverse: matrix.clone().invert(),
      color: color(id),
      inlet: transformPort(inlet, matrix, incoming),
      outlet: transformPort(outlet, matrix, outgoing),
      path: new WorldCurve(built.path, matrix),
    };
  });
  const connections = segments.slice(0, -1).map((s, i) => {
    const next = segments[i + 1],
      a = MUCOSA_REGIONS[s.id],
      b = MUCOSA_REGIONS[next.id];
    const intestinal = Boolean(a),
      length = s.outlet.center.distanceTo(next.inlet.center),
      folds = Math.max(1, Math.round(length * 0.4));
    const fold = intestinal
      ? (u, angle) => {
          const height = a.height * (1 - u) + (b?.height || 0) * u;
          const ridge =
            ((1 + Math.cos((u * folds + 0.025 * Math.sin(angle * 3)) * Math.PI * 2)) * 0.5) ** 4;
          return (
            1 -
            ((Math.sin(Math.PI * u) ** 2 * height) /
              (a.radius * (1 - u) + (b?.radius || 0.8) * u)) *
              ridge
          );
        }
      : null;
    const bridge = bridgePorts(s.outlet, next.inlet, {
      name: JUNCTION_NAMES[i],
      colors: [s.color, next.color],
      fold,
    });
    const mucosaRegion = intestinal
      ? {
          ...a,
          count: Math.max(240, Math.round(length * (s.id === 'ileum' ? 50 : 90))),
          villus: (a.villus + (b?.villus || a.villus)) * 0.5,
        }
      : null;
    return { id: JUNCTION_NAMES[i], from: s.id, to: next.id, mucosaRegion, ...bridge };
  });
  smoothTractNormals(segments, connections);
  const parts = [];
  segments.forEach((s, i) => {
    parts.push({ id: s.id, kind: 'organ', path: s.path });
    if (connections[i])
      parts.push({ id: connections[i].id, kind: 'junction', path: connections[i].path });
  });
  const route = new ArcRoute(parts),
    byId = Object.fromEntries(segments.map((s) => [s.id, s]));
  const stations = {};
  for (const s of segments) {
    const part = parts.find((p) => p.id === s.id);
    const fraction =
      s.id === 'mouth'
        ? 0.35
        : s.id === 'pharynx'
          ? 0.005
          : s.id === 'stomach'
            ? 0.42
            : s.id === 'caecum'
              ? 0.7
              : s.id === 'anal'
                ? 0.94
                : 0.045;
    const distance = part.start + fraction * (part.end - part.start),
      position = route.getPointAt(distance / route.length);
    const look = route.getPointAt(Math.min(1, (distance + 4) / route.length));
    stations[s.id] = {
      distance,
      position,
      look,
      localPosition: position.clone().applyMatrix4(s.inverse),
      localLook: look.clone().applyMatrix4(s.inverse),
    };
  }
  const pharynx = parts.find((p) => p.id === 'pharynx');
  const epiDistance = pharynx.start + 0.015 * (pharynx.end - pharynx.start);
  stations.epiglottis = {
    ...stations.pharynx,
    distance: epiDistance,
    position: route.getPointAt(epiDistance / route.length),
    look: V([0, 0.2, -5]),
    localPosition: route.getPointAt(epiDistance / route.length),
    localLook: V([0, 0.2, -5]),
  };
  stations.pharynx.look = V([0, 0, -4.5]);
  stations.pharynx.localLook = stations.pharynx.look.clone();
  stations.epiglottis.look = V([0, 0, -4.5]);
  stations.epiglottis.localLook = stations.epiglottis.look.clone();
  stations.anus = stations.anal;
  return { segments, connections, route, stations, byId, parts, version: PHYSICAL_ROUTE_VERSION };
}
