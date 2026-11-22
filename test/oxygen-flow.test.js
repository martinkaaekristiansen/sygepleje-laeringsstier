import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/three.module.min.js';
import { createOxygenNetwork, alveolarLandmarks } from '../public/oxygen-network.js';
import { buildAirwayPart } from '../public/oxygen-anatomy.js';
import { buildBloodStream, buildCounterDiffusion } from '../public/oxygen-flow.js';
import { cellGeometry } from '../public/journey-3d-geometry.js';
import { nasalClearancePart, mucusParticleAt } from '../public/oxygen-mucociliary.js';
import { gasMolecule, buildHemoglobin } from '../public/oxygen-molecules.js';
import { newOxygenProgress, validOxygenProgress, newOxygenRun } from '../public/oxygen-engine.js';
const n = createOxygenNetwork();
test('nasal mucus follows the posterior route toward pharynx rather than the nostrils', () => {
  const part = nasalClearancePart(n.parts.get('nose'));
  const start = mucusParticleAt(part, 0, { initialU: 0.7 }),
    later = mucusParticleAt(part, 5, { initialU: 0.7 }),
    pharynx = n.parts.get('nose').path.getPointAt(1);
  assert(later.point.distanceTo(pharynx) < start.point.distanceTo(pharynx));
  assert.equal(part.ciliaRange[0], 0.35);
});
test('open alveolar buds begin in respiratory bronchioles, not terminal bronchioles; no distal cilia or cartilage', () => {
  for (const kind of ['terminal', 'respiratory', 'duct', 'sac']) {
    const c = buildAirwayPart(n.parts.get('right:' + kind)),
      buds = c.group.getObjectByName('open-alveolar-buds-' + kind);
    assert.equal(!!buds, kind !== 'terminal');
    if (buds) assert(buds.children.every((m) => m.geometry.parameters.thetaStart > 0));
    if (kind !== 'terminal') assert.equal(c.field, null);
  }
});
test('biconcave RBC LOD preserves outline with fewer triangles and shares the existing shape equation', () => {
  const near = cellGeometry('low'),
    far = cellGeometry('distant');
  for (const g of [near, far]) {
    g.computeBoundingBox();
    assert(Math.abs(g.boundingBox.max.x - 1) < 1e-5);
    assert(Math.abs(g.boundingBox.min.x + 1) < 1e-5);
    assert(g.boundingBox.max.z < 0.35 && g.boundingBox.max.z > 0.1);
  }
  assert(far.index.count < near.index.count / 4);
  const stream = buildBloodStream(n.parts.get('systemic-capillary').path, 0.52, {
    kind: 'capillary',
  });
  assert.equal(stream.near.count, stream.far.count);
  const camera = new T.PerspectiveCamera();
  camera.position.set(-34, 16, 9);
  stream.group.updateMatrixWorld();
  stream.update(5, camera);
  assert(stream.snapshot().biconcave);
});
test('alveolar background diffusion always carries O2 to blood and CO2 to air', () => {
  for (const side of ['left', 'right']) {
    const c = buildCounterDiffusion(alveolarLandmarks(side));
    c.update(3);
    const s = c.snapshot();
    assert.equal(s.oxygen, 'alveolus-to-blood');
    assert.equal(s.carbonDioxide, 'blood-to-alveolus');
    assert.equal(c.group.children.length, 3);
    assert(c.group.children.every((m) => m.isInstancedMesh));
  }
});
test('oxygen double bonds stay atom-sized and dissociation leaves three other occupied hemes intact', () => {
  const o = gasMolecule();
  for (const m of o.group.children.filter((c) => !c.userData.element))
    assert(m.geometry.parameters.height < 0.2);
  const hb = buildHemoglobin();
  assert.equal(hb.update(1, { releasePrimary: true }).bound, 3);
  assert.equal(hb.sites.filter((s) => s.oxygen.visible).length, 3);
});
test('malformed optional checkpoints, review answers and assessment records are rejected without throwing', () => {
  const d = newOxygenProgress();
  d.active = newOxygenRun();
  for (const change of [
    { assessments: [] },
    { assessments: { easy: [null] } },
    { assessmentDraft: 5 },
    { reviewDraft: 3 },
    { active: { ...d.active, mode: 'missing' } },
    { active: { ...d.active, mucusOrigin: -1 } },
    { active: { ...d.active, phase: 'question', index: 28 } },
  ])
    assert.equal(validOxygenProgress({ ...structuredClone(d), ...change }), false);
});
test('minor CO2 transport binds globin rather than heme iron, with most illustrative carbon in plasma bicarbonate', async () => {
  const { buildCarbonTransportForms } = await import('../public/oxygen-molecules.js');
  const f = buildCarbonTransportForms(),
    s = f.snapshot();
  assert(s.bicarbonate > s.dissolved + s.globinBound);
  assert.equal(s.boundToHemeIron, false);
  assert(f.group.children.every((m) => m.isInstancedMesh));
  assert.equal(
    f.group.children.reduce((n, m) => n + m.count, 0),
    49,
  );
});
