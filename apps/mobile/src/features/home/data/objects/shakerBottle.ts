import { type ObjectBuilder, lathe } from './studio';

// Friday. A blush shaker with a white lid, a pink spout, a carry loop and white measuring ticks.

const CUP: [number, number][] = [[0, -1.1], [0.62, -1.1], [0.68, -1.04], [0.7, 0.55], [0.66, 0.62], [0, 0.62]];
const LID: [number, number][] = [[0, 0.6], [0.72, 0.6], [0.74, 0.66], [0.74, 0.92], [0.62, 1.02], [0.3, 1.04], [0, 1.04]];
const SPOUT: [number, number][] = [[0, 1.0], [0.18, 1.0], [0.15, 1.32], [0.1, 1.36], [0, 1.36]];
const TICKS = 4;

export const buildShakerBottle: ObjectBuilder = (THREE, materials) => {
  const group = new THREE.Group();
  group.add(lathe(THREE, CUP, materials.blush));
  group.add(lathe(THREE, LID, materials.matte));
  const spout = lathe(THREE, SPOUT, materials.accent, 48);
  spout.position.x = 0.28;
  group.add(spout);
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 12, 48), materials.matte);
  loop.position.set(-0.4, 1.12, 0);
  group.add(loop);
  for (let index = 0; index < TICKS; index++) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.02), materials.matte);
    tick.position.set(0, -0.75 + index * 0.3, 0.705);
    group.add(tick);
  }
  group.rotation.set(0.12, 0, -0.08);
  group.position.y = -0.05;
  return group;
};
