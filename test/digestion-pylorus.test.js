import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pyloricRadius,
  pyloricAperture,
  PYLORIC_OUTER_RADIUS,
} from '../public/digestion-pylorus.js';
test('pyloric sphincter changes its lumen without pulling the outer collar off the real wall', () => {
  for (const a of [0.3, 0.4, 0.54]) {
    assert.equal(pyloricRadius(0.54, a), a);
    assert.equal(pyloricRadius(PYLORIC_OUTER_RADIUS, a), PYLORIC_OUTER_RADIUS);
  }
});
test('pylorus doses contents and opens for the continuous first-person passage', () => {
  assert.equal(pyloricAperture(0.5), 0.3);
  assert(pyloricAperture(0.9) > 0.3);
  assert.equal(pyloricAperture(0.5, 0), 0.54);
  for (let p = 0; p < 1; p += 0.01) assert(pyloricAperture(p) >= 0.3 && pyloricAperture(p) <= 0.54);
});
