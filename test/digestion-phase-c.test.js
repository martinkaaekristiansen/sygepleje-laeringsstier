import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/three.module.min.js';
import { ROUTE } from '../public/digestion-data.js';
import { buildOrganSurface } from '../public/digestion-anatomy.js';
import { buildVilli, MUCOSA_REGIONS } from '../public/digestion-mucosa.js';
import {
  createMotility,
  MOTILITY,
  motionScale,
  motionParameters,
  motionWeights,
  flowProgress,
} from '../public/digestion-motility.js';
import { epithelialTimeline } from '../public/digestion-epithelium.js';
import { defecationPose, NUTRIENT_ENDINGS } from '../public/digestion-finale.js';
import { newDigestion, validDigestion } from '../public/digestion-engine.js';

test('oesophageal contraction advances behind the bolus and does not contract the entire tube at once', () => {
  const locations = [];
  for (const time of [1.8, 3.6, 5.4]) {
    const weights = motionWeights('oesophagus', time);
    const values = Array.from({ length: 101 }, (_, i) =>
      motionScale(motionParameters('oesophagus', i / 100), weights),
    );
    const location = values.indexOf(Math.min(...values)) / 100;
    locations.push(location);
    assert.ok(Math.abs(location - weights[0]) < 0.02);
    assert.ok(location < weights[0] + 0.09, 'bolus lies downstream of contraction');
    assert.ok(values[5] > 0.99 && values[95] > 0.99, 'distant wall stays relaxed');
  }
  assert.ok(locations[0] < locations[1] && locations[1] < locations[2]);
});

test('regional motility mixes neighbouring small-bowel segments and keeps contraction strengths bounded', () => {
  assert.ok(
    flowProgress('jejunum', 6, 0) < flowProgress('jejunum', 4, 0),
    'segmentation includes backward mixing',
  );
  assert.notEqual(MOTILITY.stomach.kind, MOTILITY.jejunum.kind);
  assert.notEqual(MOTILITY.jejunum.kind, MOTILITY.ascending.kind);
  assert.ok(MOTILITY.ileum.period > MOTILITY.jejunum.period);
  assert.ok(MOTILITY.ascending.period > MOTILITY.jejunum.period);
  for (const id of Object.keys(MOTILITY))
    for (const time of [0, 2, 5, 11, 19, 33]) {
      const weights = motionWeights(id, time);
      const values = Array.from({ length: 101 }, (_, i) =>
        motionScale(motionParameters(id, i / 100), weights),
      );
      assert.ok(
        values.every((scale) => scale >= 0.6 && scale <= 1.02),
        id,
      );
      assert.ok(Math.max(...values) - Math.min(...values) > 0.005, id + ': contractions are local');
      assert.equal(motionScale(motionParameters(id, 0.5), motionWeights(id, time, false)), 1);
    }
});

test('every villus follows the same deformed curved fold at all LODs without losing roots', () => {
  for (const id of ['duodenum', 'jejunum', 'ileum']) {
    const built = buildOrganSurface(ROUTE.find((s) => s.id === id));
    const motion = createMotility(id, built);
    const villi = buildVilli(id, built, null, motion);
    const matrix = new T.Matrix4();
    for (const t of [1, 4, 9]) {
      motion.update(t);
      let count = 0;
      for (const mesh of villi.meshes) {
        const p = mesh.geometry.attributes.digestParams,
          axes = mesh.geometry.attributes.digestAxis;
        assert.equal(p.count, mesh.count);
        assert.equal(axes.count, mesh.count);
        for (let i = 0; i < mesh.count; i += 37) {
          mesh.getMatrixAt(i, matrix);
          const root = new T.Vector3().setFromMatrixPosition(matrix),
            axis = new T.Vector3().fromBufferAttribute(axes, i);
          const u = p.getX(i),
            params = [p.getX(i), p.getY(i), p.getZ(i), p.getW(i)];
          const shaderPoint = root
            .clone()
            .sub(axis)
            .multiplyScalar(motionScale(params, motion.clock.value.toArray()))
            .add(axis);
          assert.ok(shaderPoint.distanceTo(motion.point(root, u, axis)) < 1e-5);
        }
        count += mesh.count;
      }
      assert.equal(count, MUCOSA_REGIONS[id].count);
      villi.setBudget(0.8);
      villi.setBudget(1);
    }
    built.geometry.dispose();
    villi.meshes.forEach((m) => {
      m.userData.geometryLods.forEach((g) => g.dispose());
      m.material.dispose();
      m.dispose();
    });
  }
});

test('uptake excludes intact proteins/triglycerides and micelle shells; peptides hydrolyse inside cells', () => {
  for (const id of ['stanley', 'poul', 'trine']) {
    const start = epithelialTimeline(id, 'absorb', 0),
      end = epithelialTimeline(id, 'absorb', 8);
    assert.equal(start.compartment, 'lumen');
    assert.equal(end.compartment, 'epithelium');
    for (const time of [0, 2, 4, 7, 12])
      for (const mode of ['absorb', 'transport']) {
        const point = epithelialTimeline(id, mode, time);
        assert.equal(point.micelleCrosses, false);
        assert.equal(point.intactProteinCrosses, false);
        assert.equal(point.intactTriglycerideCrosses, false);
        assert.ok(point.position.every(Number.isFinite));
      }
  }
  const micelleCargo = epithelialTimeline('trine', 'absorb', 2.5);
  assert.deepEqual(micelleCargo.position, [-0.7, 0.3, 1.1]);
  assert.equal(micelleCargo.compartment, 'lumen');
  const peptides = epithelialTimeline('poul', 'absorb', 1),
    hydrolysed = epithelialTimeline('poul', 'absorb', 5);
  assert.equal(peptides.hydrolysed, false);
  assert.equal(hydrolysed.hydrolysed, true);
  assert.equal(hydrolysed.compartment, 'epithelium');
});

test('fat is reesterified and packaged before lymph transport; portal blood and lymph have different destinations', () => {
  assert.equal(epithelialTimeline('trine', 'transport', 0.5).phase, 'reesterification');
  assert.equal(epithelialTimeline('trine', 'transport', 3).phase, 'chylomicron-assembly');
  assert.equal(epithelialTimeline('trine', 'transport', 5).compartment, 'lymph');
  assert.equal(
    epithelialTimeline('trine', 'transport', 10).destination,
    'systemic-blood-via-lymph',
  );
  for (const id of ['stanley', 'poul']) {
    assert.equal(epithelialTimeline(id, 'transport', 3).compartment, 'blood');
    assert.equal(epithelialTimeline(id, 'transport', 10).destination, 'liver-via-portal-blood');
  }
});

test('defecation relaxes both sphincters before the residue falls, with the camera above the water', () => {
  const rest = defecationPose(0),
    release = defecationPose(2.4),
    impact = defecationPose(4.8);
  assert.equal(rest.fall, 0);
  assert.equal(release.fall, 0);
  assert.ok(
    release.internalSphincter > rest.internalSphincter &&
      release.externalSphincter > rest.externalSphincter,
  );
  assert.equal(impact.impact, true);
  assert.ok(Math.abs(impact.residueY - impact.waterY) < 0.1);
  assert.ok(impact.camera[1] > impact.waterY && impact.look[1] < impact.camera[1]);
  assert.match(NUTRIENT_ENDINGS.stanley, /glukose/i);
  assert.match(NUTRIENT_ENDINGS.poul, /tripeptider/);
  assert.match(NUTRIENT_ENDINGS.trine, /venstre venevinkel/);
});

test('animation checkpoints validate without invalidating older progress records', () => {
  const run = newDigestion('stanley'),
    data = { results: {}, active: run };
  assert.ok(validDigestion(data));
  run.animation = { stage: 'jejunum', mode: 'absorb', age: 3.5 };
  assert.ok(validDigestion(data));
  run.animation.age = Infinity;
  assert.equal(validDigestion(data), false);
  run.animation.age = 2;
  run.animation.mode = 'unknown';
  assert.equal(validDigestion(data), false);
});
