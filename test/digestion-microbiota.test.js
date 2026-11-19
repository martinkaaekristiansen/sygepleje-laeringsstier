import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/three.module.min.js';
import {
  buildMicrobiota,
  MICROBIOTA_REGIONS,
  MICROBIOTA_INFORMATION,
  microbeSway,
} from '../public/digestion-microbiota.js';
import { buildDigestiveTract } from '../public/digestion-tract.js';
import { createMotility } from '../public/digestion-motility.js';
import { BOSSES } from '../public/digestion-data.js';
const tract = buildDigestiveTract();
test('normal microbiota uses three instanced shapes only in the five requested colonic regions', () => {
  for (const id of ['mouth', 'stomach', 'jejunum', 'rectum'])
    assert.equal(buildMicrobiota(id, tract.byId[id].built), null);
  for (const id of MICROBIOTA_REGIONS) {
    const built = tract.byId[id].built,
      original = built.geometry.attributes.position.array.slice(),
      m = buildMicrobiota(id, built, createMotility(id, built));
    assert.equal(m.count, 96);
    assert.equal(m.meshes.length, 3);
    assert(m.meshes.every((o) => o.isInstancedMesh && o.count === 32));
    assert.deepEqual(
      m.meshes.map((o) => o.userData.microbiotaShape),
      ['rod', 'coccus', 'curved-rod'],
    );
    assert.deepEqual(built.geometry.attributes.position.array, original);
    for (const mesh of m.meshes) {
      const version = mesh.instanceMatrix.version;
      m.clock.value = 15;
      assert.equal(
        mesh.instanceMatrix.version,
        version,
        'motion uses uniforms, not repeated matrix uploads',
      );
    }
  }
});
test('microbiota starts inside the actual joined wall with clearance for its small shapes', () => {
  for (const id of MICROBIOTA_REGIONS) {
    const built = tract.byId[id].built,
      m = buildMicrobiota(id, built),
      wall = new T.Mesh(built.geometry, new T.MeshBasicMaterial({ side: T.DoubleSide }));
    wall.updateMatrixWorld(true);
    for (const a of m.anchors.filter((_, i) => i % 8 === 0)) {
      const origin = new T.Vector3(...a.axis),
        end = new T.Vector3(...a.point),
        delta = end.clone().sub(origin),
        ray = new T.Raycaster(origin, delta.clone().normalize(), 0.001, 30),
        hit = ray.intersectObject(wall)[0];
      assert(hit, id);
      assert(hit.distance > delta.length() + a.radius, id + ' microbe must not intersect mucosa');
    }
  }
});
test('bacterial movement is slow and bounded and the added facts do not add colon questions', () => {
  assert.notDeepEqual(microbeSway(0, 1), microbeSway(5, 1));
  for (let t = 0; t < 150; t += 0.1) assert(microbeSway(t, 2).every((x) => Math.abs(x) <= 0.0181));
  assert.match(MICROBIOTA_INFORMATION.ascending, /egne enzymer ikke kan/);
  assert.match(MICROBIOTA_INFORMATION.transverse, /kortkædede fedtsyrer/);
  assert.match(MICROBIOTA_INFORMATION.descending, /Nogle.*B-vitaminer/);
  assert(Object.values(MICROBIOTA_INFORMATION).every((text) => text.length < 140));
  for (const tasks of Object.values(BOSSES))
    for (const id of MICROBIOTA_REGIONS) assert.equal(tasks[id], undefined);
});
