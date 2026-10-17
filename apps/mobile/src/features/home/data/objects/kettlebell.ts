import { type ObjectBuilder, lathe, tube } from './studio';

// Sunday. A matte white bell, a chrome handle and a thin pink band at its widest point.

const BODY: [number, number][] = [
  [0, -1.05], [0.55, -1.05], [0.66, -1.0], [0.92, -0.78], [1.06, -0.45], [1.1, -0.08], [1.05, 0.28],
  [0.9, 0.58], [0.68, 0.8], [0.4, 0.94], [0, 0.98],
];
const HANDLE: [number, number, number][] = [
  [-0.56, 0.66, 0], [-0.66, 1.05, 0], [-0.62, 1.48, 0], [-0.38, 1.74, 0], [0, 1.8, 0], [0.38, 1.74, 0],
  [0.62, 1.48, 0], [0.66, 1.05, 0], [0.56, 0.66, 0],
];

export const buildKettlebell: ObjectBuilder = (THREE, materials) => {
  const group = new THREE.Group();
  group.add(lathe(THREE, BODY, materials.matte));
  group.add(tube(THREE, HANDLE, 0.11, materials.chrome, 140, 32));
  const band = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.03, 12, 120), materials.accent);
  band.rotation.x = Math.PI / 2;
  band.position.y = -0.08;
  group.add(band);
  group.position.y = -0.3;
  return group;
};
