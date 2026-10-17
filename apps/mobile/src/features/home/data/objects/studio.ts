import type * as Three from 'three';

// The shared look of the Home stage's "object of the day" (docs/design/trainee-home-b.html): the
// soft-touch materials every builder paints with, the studio they reflect (PMREM), the lights and the
// contact shadow. three.js is passed in — this module is loaded with it, lazily, after first paint.

export type ThreeModule = typeof Three;

/** Read from the design tokens by the hook (plain hex values: three parses them as sRGB). */
export interface StudioColors {
  /** Soft-touch matte white (--color-object-matte). */
  matte: string;
  blush: string;
  ink: string;
  /** Satin chrome details. */
  chrome: string;
  /** The pink accents. */
  accent: string;
  /** The contact shadow's tint (drawn into a canvas). */
  shadow: string;
  /** The studio room the objects reflect. */
  room: string;
  /** The white softboxes + the key light. */
  softbox: string;
  /** The pink bounce card under the object. */
  bounce: string;
  /** The warm card behind it. */
  warm: string;
  /** The warm rim light. */
  rim: string;
}

export interface StudioMaterials {
  matte: Three.MeshPhysicalMaterial;
  blush: Three.MeshPhysicalMaterial;
  ink: Three.MeshPhysicalMaterial;
  chrome: Three.MeshPhysicalMaterial;
  accent: Three.MeshPhysicalMaterial;
}

/** Each object module exports one of these: a group centered on the origin, about 2.4 units tall. */
export type ObjectBuilder = (THREE: ThreeModule, materials: StudioMaterials) => Three.Group;

export function createMaterials(THREE: ThreeModule, colors: StudioColors): StudioMaterials {
  return {
    matte: new THREE.MeshPhysicalMaterial({ color: colors.matte, roughness: 0.42, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.35 }),
    blush: new THREE.MeshPhysicalMaterial({ color: colors.blush, roughness: 0.45, metalness: 0, clearcoat: 0.4, clearcoatRoughness: 0.4 }),
    ink: new THREE.MeshPhysicalMaterial({ color: colors.ink, roughness: 0.4, metalness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
    chrome: new THREE.MeshPhysicalMaterial({ color: colors.chrome, roughness: 0.18, metalness: 1, envMapIntensity: 1.2 }),
    accent: new THREE.MeshPhysicalMaterial({ color: colors.accent, roughness: 0.35, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
  };
}

/** A silhouette [radius, height][] turned around the y axis. */
export function lathe(
  THREE: ThreeModule,
  points: [number, number][],
  material: Three.Material,
  segments = 96,
): Three.Mesh {
  return new THREE.Mesh(new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segments), material);
}

/** A smooth tube through 3D points. */
export function tube(
  THREE: ThreeModule,
  points: [number, number, number][],
  radius: number,
  material: Three.Material,
  segments: number,
  radialSegments: number,
): Three.Mesh {
  const path = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  return new THREE.Mesh(new THREE.TubeGeometry(path, segments, radius, radialSegments, false), material);
}

/** The studio the objects reflect: a grey room, two softboxes, a pink bounce card, a warm card behind. */
export function buildEnvironment(THREE: ThreeModule, colors: StudioColors): Three.Scene {
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, color: colors.room })));
  const card = (width: number, height: number, color: string, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    mesh.position.set(x, y, z);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  };
  card(12, 7, colors.softbox, -6, 7, 8);
  card(5, 12, colors.softbox, 9, 2, 3);
  card(16, 6, colors.bounce, 0, -5, 10);
  card(7, 5, colors.warm, 2, 7, -9);
  return scene;
}

export function addLights(THREE: ThreeModule, scene: Three.Scene, colors: StudioColors): void {
  const key = new THREE.DirectionalLight(colors.softbox, 1.6);
  key.position.set(-3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(colors.rim, 1.2);
  rim.position.set(4, 2, -3);
  scene.add(rim);
}

/** '#5a0028' + 0.4 → 'rgba(90, 0, 40, 0.4)' (the token is an opaque hex). */
function withAlpha(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function shadowCanvas(color: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, withAlpha(color, 0.4));
  gradient.addColorStop(0.5, withAlpha(color, 0.16));
  gradient.addColorStop(1, withAlpha(color, 0));
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  return canvas;
}

/** A soft blot on the floor under the object (no shadow maps: cheaper, and softer). */
export function createContactShadow(THREE: ThreeModule, color: string): Three.Mesh<Three.PlaneGeometry, Three.MeshBasicMaterial> {
  const material = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas(color)), transparent: true, depthWrite: false });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), material);
  shadow.rotation.x = -Math.PI / 2;
  return shadow;
}

/** Disposes every geometry, material and texture under `root` (shared ones once). */
export function disposeTree(THREE: ThreeModule, root: Three.Object3D): void {
  const geometries = new Set<Three.BufferGeometry>();
  const materials = new Set<Three.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of [object.material].flat() as Three.Material[]) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) {
    if ('map' in material && material.map instanceof THREE.Texture) material.map.dispose();
    material.dispose();
  }
}
