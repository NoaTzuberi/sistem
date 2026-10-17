import type { ObjectBuilder } from './studio';

// Saturday. A white stopwatch: chrome bezel, ink face with white ticks, a pink arc and hand, pink crown.

const HOUR_TICKS = 12;

export const buildStopwatch: ObjectBuilder = (THREE, materials) => {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.38, 96), materials.matte);
  body.rotation.x = Math.PI / 2;
  group.add(body);
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.07, 16, 120), materials.chrome);
  bezel.position.z = 0.19;
  group.add(bezel);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.84, 96), materials.ink);
  face.position.z = 0.192;
  group.add(face);
  for (let index = 0; index < HOUR_TICKS; index++) {
    // Every third tick (12, 3, 6, 9) is long.
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.035, index % 3 ? 0.08 : 0.16, 0.01), materials.matte);
    const angle = (index / HOUR_TICKS) * Math.PI * 2;
    tick.position.set(Math.sin(angle) * 0.7, Math.cos(angle) * 0.7, 0.2);
    tick.rotation.z = -angle;
    group.add(tick);
  }
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.035, 8, 80, Math.PI * 1.5), materials.accent);
  arc.position.z = 0.2;
  arc.rotation.z = Math.PI / 2;
  group.add(arc);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.62, 0.02), materials.accent);
  hand.position.set(0.22, 0.22, 0.21);
  hand.rotation.z = -Math.PI / 4;
  group.add(hand);
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 24), materials.chrome);
  pin.rotation.x = Math.PI / 2;
  pin.position.z = 0.22;
  group.add(pin);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.22, 32), materials.chrome);
  stem.position.y = 1.1;
  group.add(stem);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 32), materials.accent);
  crown.position.y = 1.26;
  group.add(crown);
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.2, 24), materials.chrome);
  button.position.set(0.72, 0.8, 0);
  button.rotation.z = -Math.PI / 4;
  group.add(button);
  group.rotation.set(-0.05, 0, 0.06);
  group.position.y = -0.1;
  return group;
};
