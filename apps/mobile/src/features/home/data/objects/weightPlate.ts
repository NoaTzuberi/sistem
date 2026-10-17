import { type ObjectBuilder, lathe } from './studio';

// Tuesday. A white bumper plate (raised rim, recessed face), a pink ring and a chrome hub.

const PLATE: [number, number][] = [
  [0.22, -0.2], [1.5, -0.2], [1.6, -0.12], [1.6, 0.12], [1.5, 0.2], [1.3, 0.2], [1.25, 0.12], [0.7, 0.12],
  [0.62, 0.2], [0.22, 0.2],
];
const HUB: [number, number][] = [[0.2, -0.24], [0.34, -0.24], [0.34, 0.24], [0.2, 0.24]];

export const buildWeightPlate: ObjectBuilder = (THREE, materials) => {
  const group = new THREE.Group();
  const plate = lathe(THREE, PLATE, materials.matte, 128);
  plate.rotation.x = Math.PI / 2;
  group.add(plate);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.97, 0.05, 12, 120), materials.accent);
  ring.position.z = 0.13;
  group.add(ring);
  const hub = lathe(THREE, HUB, materials.chrome, 64);
  hub.rotation.x = Math.PI / 2;
  group.add(hub);
  group.rotation.set(-0.25, 0, 0.05);
  return group;
};
