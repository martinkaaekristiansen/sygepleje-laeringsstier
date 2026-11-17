import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/three.module.min.js';
import { buildVilli, MUCOSA_REGIONS } from '../public/digestion-mucosa.js';
import { buildOrganSurface } from '../public/digestion-anatomy.js';
import { viewPose } from '../public/digestion-camera.js';
import { ROUTE } from '../public/digestion-data.js';
import { renderBudget } from '../public/digestion-performance.js';

test('spatial villus batches preserve every distinct root and conservative bounds at both budgets', () => {
  for (const id of ['duodenum', 'jejunum', 'ileum']) {
    const built = buildOrganSurface(ROUTE.find((stage) => stage.id === id));
    const villi = buildVilli(id, built, null);
    const roots = new Set();
    const matrix = new T.Matrix4();
    const point = new T.Vector3();
    for (const mesh of villi.meshes) {
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix);
        roots.add(matrix.elements.slice(12, 15).join(','));
        // The bounds must cover every vertex, including shader sway. Otherwise
        // a section could disappear at the edge of the screen during animation.
        for (const geometry of mesh.userData.geometryLods) {
          const vertices = geometry.attributes.position;
          for (let j = 0; j < vertices.count; j++) {
            point.fromBufferAttribute(vertices, j).applyMatrix4(matrix);
            assert.ok(
              point.distanceTo(mesh.boundingSphere.center) + 0.03 <= mesh.boundingSphere.radius,
            );
          }
        }
      }
      const [high, low] = mesh.userData.geometryLods;
      high.computeBoundingBox();
      low.computeBoundingBox();
      assert.ok(Math.abs(high.boundingBox.min.y - low.boundingBox.min.y) < 1e-6);
      assert.ok(Math.abs(high.boundingBox.max.y - low.boundingBox.max.y) < 1e-6);
      // Polygon sampling changes width slightly; the anatomical radius/height
      // and cap profile stay fixed, rather than thinning distant villi.
      assert.ok(high.boundingBox.min.distanceTo(low.boundingBox.min) < 0.006);
      assert.ok(high.boundingBox.max.distanceTo(low.boundingBox.max) < 0.006);
    }
    assert.equal(roots.size, MUCOSA_REGIONS[id].count);
    for (const ratio of [1, 0.8, 1]) {
      villi.setBudget(ratio);
      assert.equal(
        villi.meshes.reduce((n, mesh) => n + mesh.count, 0),
        MUCOSA_REGIONS[id].count,
      );
    }
    // Rotate through a complete circle: culling never rejects a batch that has
    // a root inside the view. No visibility decision is tied to the initial yaw.
    const camera = new T.PerspectiveCamera(74, 390 / 844, 0.03, 180);
    const pose = viewPose(id);
    camera.position.copy(pose.position);
    villi.mesh.updateMatrixWorld();
    const frustum = new T.Frustum();
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      camera.lookAt(pose.look);
      camera.rotateY(angle);
      camera.updateMatrixWorld();
      frustum.setFromProjectionMatrix(
        new T.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
      );
      for (const mesh of villi.meshes) {
        if (frustum.intersectsObject(mesh)) continue;
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, matrix);
          point.setFromMatrixPosition(matrix);
          assert.equal(frustum.containsPoint(point), false, `${id}: visible root was culled`);
        }
      }
    }
    built.geometry.dispose();
    for (const mesh of villi.meshes) {
      mesh.userData.geometryLods.forEach((geometry) => geometry.dispose());
      mesh.material.dispose();
      mesh.dispose();
    }
  }
});

test('automatic quality adaptation retains the existing 0.8 resolution floor and can recover', () => {
  const budget = renderBudget(2);
  for (let i = 0; i < 1000; i++) budget.sample(100);
  assert.equal(budget.ratio, 0.8);
  for (let i = 0; i < 10000; i++) budget.sample(16);
  assert.equal(budget.ratio, 2);
});

test('small-bowel backface culling preserves the nearest visible wall in every viewing direction', () => {
  for (const id of ['duodenum', 'jejunum', 'ileum']) {
    const built = buildOrganSurface(ROUTE.find((stage) => stage.id === id));
    const material = new T.MeshBasicMaterial({ side: T.DoubleSide });
    const mesh = new T.Mesh(built.geometry, material);
    mesh.updateMatrixWorld();
    const origin = viewPose(id).position;
    // Uniformly cover the sphere, including the open ends and backward views.
    for (let i = 0; i < 384; i++) {
      const y = 1 - ((i + 0.5) / 384) * 2;
      const radius = Math.sqrt(1 - y * y);
      const angle = i * 2.3999632297;
      const direction = new T.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      const ray = new T.Raycaster(origin, direction, 0.03, 180);
      material.side = T.DoubleSide;
      const both = ray.intersectObject(mesh)[0];
      material.side = T.FrontSide;
      const inward = ray.intersectObject(mesh)[0];
      assert.equal(Boolean(inward), Boolean(both), `${id}: a wall disappeared`);
      if (both)
        assert.ok(
          Math.abs(inward.distance - both.distance) < 1e-7,
          `${id}: a nearer fold disappeared`,
        );
    }
    built.geometry.dispose();
    material.dispose();
  }
});
