import type { ObjectBuilder } from './studio';

// Monday. A hex dumbbell: white heads with pink end caps, a chrome bar with an ink grip.

export const buildDumbbell: ObjectBuilder = (THREE, materials) => {
  const group = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 2.2, 32), materials.chrome);
  bar.rotation.z = Math.PI / 2;
  group.add(bar);
  for (const side of [-1, 1]) {
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.62, 6), materials.matte);
    head.rotation.z = Math.PI / 2;
    head.rotation.x = Math.PI / 6;
    head.position.x = side * 1.25;
    group.add(head);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.64, 32), materials.accent);
    cap.rotation.z = Math.PI / 2;
    cap.position.x = side * 1.25;
    group.add(cap);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 32), materials.chrome);
    collar.rotation.z = Math.PI / 2;
    collar.position.x = side * 0.87;
    group.add(collar);
  }
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 1.2, 32, 1, true), materials.ink);
  grip.rotation.z = Math.PI / 2;
  group.add(grip);
  group.rotation.z = 0.12;
  group.scale.setScalar(1.05);
  return group;
};
