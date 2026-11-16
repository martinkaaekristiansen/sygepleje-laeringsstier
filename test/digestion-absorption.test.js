import test from 'node:test';
import assert from 'node:assert/strict';
import { absorptionPoint, ABSORPTION_ANCHORS as a } from '../public/digestion-absorption.js';
import { moleculeIcon, productForm, originIcon } from '../public/digestion-presentation.js';
test('uptake crosses from lumen through an epithelial barrier, then reaches blood or lymph', () => {
  for (const id of ['stanley', 'poul', 'trine']) {
    assert.equal(absorptionPoint(id, 'absorb', 0).compartment, 'lumen');
    assert.equal(absorptionPoint(id, 'absorb', 5).compartment, 'epithelium');
    assert.equal(absorptionPoint(id, 'transport', 0).compartment, 'epithelium');
    assert.equal(
      absorptionPoint(id, 'transport', 5).compartment,
      id === 'trine' ? 'lymph' : 'blood',
    );
    const end = absorptionPoint(id, 'transport', 100, 1).position;
    assert.deepEqual(end, id === 'trine' ? a.lymph : a.blood);
  }
  assert.equal(absorptionPoint('trine', 'transport', 1).compartment, 'epithelium');
});
test('visible product hypotheses have different, labelled structures and origins have organ illustrations', () => {
  assert.notEqual(moleculeIcon('maltose'), moleculeIcon('glucose'));
  assert.notEqual(moleculeIcon('protein'), moleculeIcon('amino-acid'));
  assert.notEqual(moleculeIcon('triglyceride'), moleculeIcon('lipid-products'));
  assert.equal(productForm('To glukosemolekyler'), 'glucose-pair');
  assert.equal(productForm('Monoglycerider og frie fedtsyrer'), 'lipid-products');
  assert.match(originIcon('Bugspytkirtlen'), /svg/);
  assert.match(moleculeIcon('glucose', '<glukose>'), /&lt;glukose&gt;/);
});
