import { type ObjectBuilder, lathe, tube } from './studio';

// Thursday. A pink rope hanging between two white handles (blush grips, chrome caps).

const ROPE: [number, number, number][] = [
  [-0.95, 0.55, 0], [-1.05, -0.2, 0.25], [-0.6, -0.95, 0.45], [0, -1.12, 0.5], [0.6, -0.95, 0.45],
  [1.05, -0.2, 0.25], [0.95, 0.55, 0],
];
const HANDLE: [number, number][] = [[0, -0.75], [0.12, -0.75], [0.16, -0.6], [0.17, 0.3], [0.13, 0.42], [0, 0.44]];
const CAP: [number, number][] = [[0, 0.4], [0.14, 0.4], [0.15, 0.55], [0.08, 0.62], [0, 0.63]];

export const buildJumpRope: ObjectBuilder = (THREE, materials) => {
  const group = new THREE.Group();
  group.add(tube(THREE, ROPE, 0.05, materials.accent, 160, 16));
  for (const side of [-1, 1]) {
    const handle = new THREE.Group();
    handle.add(lathe(THREE, HANDLE, materials.matte, 48));
    handle.add(lathe(THREE, CAP, materials.chrome, 48));
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.5, 48, 1, true), materials.blush);
    grip.position.y = -0.2;
    handle.add(grip);
    handle.position.set(side * 0.95, 0.95, 0);
    handle.rotation.z = side * -0.25;
    group.add(handle);
  }
  group.rotation.set(0.15, 0, 0);
  group.position.y = -0.05;
  return group;
};
