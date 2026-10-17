import type { ObjectBuilder } from './studio';

// Wednesday. A blush ball with two white seams and a pink equator.

export const buildMedicineBall: ObjectBuilder = (THREE, materials) => {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.SphereGeometry(1.15, 64, 48), materials.blush));
  for (const angle of [0, Math.PI / 2]) {
    const seam = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.035, 12, 140), materials.matte);
    seam.rotation.y = angle;
    group.add(seam);
  }
  const equator = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.06, 12, 140), materials.accent);
  equator.rotation.x = Math.PI / 2;
  group.add(equator);
  group.rotation.set(0.35, 0.3, 0.2);
  return group;
};
