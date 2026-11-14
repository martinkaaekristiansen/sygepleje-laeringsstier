import * as T from './three.module.min.js';
import { CHARACTERS } from './digestion-data.js';
import { reactionState } from './digestion-engine.js';
// Units and connecting bonds are independent objects. Only the selected chemical
// bonds disappear; intact product fragments move together, never as loose atoms.
export function nutrientModel(
  id,
  form = { stanley: 'polysaccharide', trine: 'triglyceride', poul: 'protein' }[id],
) {
  const group = new T.Group(),
    units = [],
    links = [];
  const color = CHARACTERS[id].color;
  const sphere = (r, c) =>
    new T.Mesh(
      new T.SphereGeometry(r, 12, 8),
      new T.MeshStandardMaterial({ color: c, roughness: 0.5 }),
    );
  const unit = (p, index) => {
    const g = new T.Group();
    const bead =
      id === 'stanley'
        ? new T.Mesh(new T.TorusGeometry(0.15, 0.045, 6, 6), new T.MeshStandardMaterial({ color }))
        : sphere(0.14, color);
    g.add(bead);
    g.position.fromArray(p);
    g.userData = { home: g.position.clone(), index };
    group.add(g);
    units.push(g);
    return g;
  };
  const link = (a, b, type) => {
    const line = new T.Mesh(
      new T.CylinderGeometry(0.035, 0.035, 1, 7),
      new T.MeshStandardMaterial({ color: type === 'alpha-1,6' ? 0xe49a9a : 0xf4dfbb }),
    );
    line.userData = { a, b, type };
    links.push(line);
    group.add(line);
  };
  if (id === 'trine') {
    for (let i = 0; i < 3; i++) unit([-0.75, (i - 1) * 0.55, 0], i);
    link(0, 1, 'glycerol');
    link(1, 2, 'glycerol');
    for (let i = 0; i < 3; i++) {
      const tail = unit([-0.2, (i - 1) * 0.55, 0], 3 + i);
      for (let j = 1; j < 6; j++) {
        const bead = sphere(0.11, color);
        bead.position.set(j * 0.28, Math.sin(j * 2) * 0.09, 0);
        tail.add(bead);
        const bond = new T.Mesh(
          new T.CylinderGeometry(0.025, 0.025, 0.3, 6),
          new T.MeshStandardMaterial({ color }),
        );
        bond.rotation.z = Math.PI / 2;
        bond.position.set(j * 0.28 - 0.14, 0, 0);
        tail.add(bond);
      }
      link(i, 3 + i, 'ester-' + (i + 1));
    }
  } else {
    const count =
      {
        polysaccharide: 12,
        'short-chain': 4,
        maltose: 2,
        glucose: 1,
        protein: 12,
        peptide: 4,
        'small-peptide': 2,
        'amino-acid': 1,
      }[form] || 12;
    for (let i = 0; i < count; i++) {
      const p =
        id === 'poul' && form === 'protein'
          ? [Math.cos(i * 0.85) * 0.6, Math.sin(i * 0.85) * 0.6, (i - 6) * 0.11]
          : [(i - (count - 1) / 2) * 0.3, Math.sin(i * 0.7) * 0.17, 0];
      unit(p, i);
      if (i) link(i - 1, i, id === 'poul' ? 'peptide' : 'alpha-1,4');
    }
    if (id === 'stanley' && form === 'polysaccharide') {
      unit([-0.3, 0.65, 0], 12);
      unit([0, 0.8, 0], 13);
      link(5, 12, 'alpha-1,6');
      link(12, 13, 'alpha-1,4');
    }
  }
  function update(t, organ) {
    const state = reactionState(t, id, organ),
      p = state.progress;
    units.forEach((u, i) => {
      u.position.copy(u.userData.home);
      if (id === 'poul' && form === 'protein' && organ === 'stomach' && t > 0) {
        const f = Math.min(1, t / 2);
        u.position.lerp(new T.Vector3((i - 6) * 0.24, Math.sin(i * 0.4) * 0.1, 0), f);
      }
      if (state.cut || form === 'lipid-products') {
        if (id === 'trine') {
          if (
            i === 3 ||
            (i === 5 && organ === 'duodenum') ||
            (form === 'lipid-products' && (i === 3 || i === 5))
          )
            u.position.add(
              new T.Vector3(
                (form === 'lipid-products' ? 1 : p) * 0.8,
                (i === 3 ? -1 : 1) * (form === 'lipid-products' ? 1 : p) * 0.55,
                0,
              ),
            );
        } else {
          const fragment =
            organ === 'jejunum'
              ? i
              : ['short-chain', 'peptide'].includes(form)
                ? Math.floor(i / 2)
                : i < 4
                  ? 0
                  : i < 8 || i >= 12
                    ? 1
                    : 2;
          u.position.add(
            new T.Vector3((fragment - 1) * p * 0.55, (fragment === 1 ? 0.2 : -0.15) * p, 0),
          );
        }
      }
    });
    links.forEach((l) => {
      const { a, b, type } = l.userData;
      const cut =
        id === 'trine'
          ? type === 'ester-1' ||
            ((organ === 'duodenum' || form === 'lipid-products') && type === 'ester-3')
          : type !== 'alpha-1,6' &&
            (organ === 'jejunum' ||
              (['short-chain', 'peptide'].includes(form) ? a % 2 === 1 : a === 3 || a === 7));
      l.visible = !((state.cut || form === 'lipid-products') && cut);
      const start = units[a].position,
        end = units[b].position,
        d = end.clone().sub(start);
      l.position.copy(start).addScaledVector(d, 0.5);
      l.scale.y = d.length();
      l.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
      l.material.color.setHex(
        cut && t >= 2 && t < 4 ? 0xffef7f : type === 'alpha-1,6' ? 0xe49a9a : 0xf4dfbb,
      );
    });
    return state;
  }
  update(-1, 'mouth');
  group.userData = { units, links, update, form };
  return group;
}
