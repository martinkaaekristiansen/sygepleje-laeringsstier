import test from 'node:test';
import assert from 'node:assert/strict';
import {
  gasMolecule,
  buildHemoglobin,
  buildFocusErythrocyte,
  CARBON_REACTION,
} from '../public/oxygen-molecules.js';
test('O₂, CO₂ and HCO₃⁻ have distinct, correctly counted atoms and charge', () => {
  for (const kind of ['oxygen', 'carbon-dioxide', 'bicarbonate']) {
    const m = gasMolecule(kind),
      counts = {};
    m.atoms.forEach((a) => (counts[a.userData.element] = (counts[a.userData.element] || 0) + 1));
    assert.deepEqual(counts, m.group.userData.atoms);
    assert.equal(m.group.userData.charge, kind === 'bicarbonate' ? -1 : 0);
  }
  assert.match(CARBON_REACTION.formula, /CO₂ \+ H₂O ⇌ H⁺ \+ HCO₃⁻/);
});
test('hemoglobin has four intact subunits, four hemes and four irons, with a maximum four O₂', () => {
  const h = buildHemoglobin(),
    uuids = h.lobes.map((m) => m.geometry.uuid);
  assert.equal(h.lobes.length, 4);
  assert.equal(h.sites.length, 4);
  for (const f of [0, 0.25, 0.5, 0.75, 1, 2]) {
    const state = h.update(f);
    assert(state.bound <= 4);
    assert.equal(state.hemes, 4);
    assert.equal(state.irons, 4);
    assert(state.intact);
    assert.deepEqual(
      h.lobes.map((m) => m.geometry.uuid),
      uuids,
    );
    assert(!h.sites[0].oxygen.visible, 'primary player oxygen is reused rather than duplicated');
  }
  assert.equal(h.update(0).bound, 0, 'reversible dissociation leaves hemoglobin intact');
});
test('the travelling erythrocyte reuses the existing biconcave geometry and retains its hemoglobin object', () => {
  const cell = buildFocusErythrocyte(),
    id = cell.hb.group.uuid;
  cell.hb.update(1);
  cell.hb.update(0);
  assert.equal(cell.hb.group.uuid, id);
  assert(cell.membrane.geometry.attributes.position.count > 100);
  assert(cell.group.children.includes(cell.hb.group));
});
test('the same carbon survives hydration and dehydration with exactly the visible CO2/HCO3 atoms', async () => {
  const { buildCarbonCarrier } = await import('../public/oxygen-molecules.js');
  const m = buildCarbonCarrier(),
    id = m.carbon.uuid;
  for (const fraction of [0, 0.5, 1, 0.5, 0]) {
    const state = m.update(fraction);
    assert.equal(state.carbonInstance, id);
    if (fraction === 0 || fraction === 1) {
      const actual = {};
      for (const a of m.atoms.filter((a) => a.visible))
        actual[a.userData.element] = (actual[a.userData.element] || 0) + 1;
      assert.deepEqual(actual, fraction === 0 ? { C: 1, O: 2 } : { C: 1, O: 3, H: 1 });
      assert.equal(m.group.userData.charge, fraction === 0 ? 0 : -1);
    }
  }
});
