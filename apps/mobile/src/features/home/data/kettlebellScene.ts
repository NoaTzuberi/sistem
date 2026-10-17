import type * as Three from 'three';

// The Home stage's cast-iron kettlebell (docs/design/trainee-home-b.html), procedural — no model or
// texture files. three.js is passed in: the module is loaded lazily (dynamic import) after first
// paint, so it stays out of the main bundle. Colors come from the design tokens (read by the hook).

type ThreeModule = typeof Three;

export interface KettlebellColors {
  /** The pink print on the iron (--color-kettlebell-label). */
  label: string;
  /** The iron under the print (--color-kettlebell-iron). */
  iron: string;
  /** The handle (--color-kettlebell-grip). */
  grip: string;
  /** The contact shadow's tint (--color-kettlebell-shadow). */
  shadow: string;
  /** The studio's pink bounce card = the stage behind it (--color-stage). */
  bounce: string;
  /** The softboxes (--color-on-stage). */
  softbox: string;
}

export interface KettlebellSceneOptions {
  width: number;
  height: number;
  /** ≤ 2 — sharper is not worth the fill rate on a phone. */
  pixelRatio: number;
  /** "12 KG" */
  labelText: string;
  colors: KettlebellColors;
  /** Draw into a buffer that survives the frame (only the PNG export needs it). */
  preserveDrawingBuffer?: boolean;
}

export interface KettlebellScene {
  canvas: HTMLCanvasElement;
  /** Seconds since start, the drag rotation (radians) and whether to float / sway. */
  update(timeSec: number, rotationY: number, animate: boolean): void;
  render(): void;
  setSize(width: number, height: number): void;
  /** Redraws the label once its font has loaded (the first draw may use a fallback face). */
  redrawLabel(): void;
  dispose(): void;
}

// The body's silhouette (radius, height), turned on a lathe.
const PROFILE: [number, number][] = [
  [0, -1.1], [0.6, -1.1], [0.7, -1.08], [0.78, -1.02], [0.98, -0.82], [1.13, -0.5], [1.19, -0.12],
  [1.15, 0.26], [1.0, 0.6], [0.8, 0.84], [0.56, 0.99], [0.3, 1.05], [0, 1.07],
];
// The handle's center line, from horn to horn.
const HANDLE_PATH: [number, number][] = [
  [-0.62, 0.72], [-0.74, 1.12], [-0.72, 1.6], [-0.46, 1.9], [0, 1.98], [0.46, 1.9], [0.72, 1.6], [0.74, 1.12], [0.62, 0.72],
];
const LABEL_FONT = 'italic 800 170px "Barlow Condensed", Rubik, sans-serif';
const BASE_TILT = { x: 0.06, y: 0.35, z: 0.05 };
const SWAY = 0.4;
const SWAY_SPEED = 0.6;
const FLOAT_SPEED = 1.3;
const FLOAT_HEIGHT = 0.06;

/** A seeded grey noise canvas: the iron's grain (roughness / bump maps). */
function noiseCanvas(width: number, height: number, base: number, amplitude: number, seed: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  let state = seed;
  const random = () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
  const image = context.createImageData(width, height);
  for (let pixel = 0; pixel < width * height; pixel++) {
    const value = base + (random() - 0.5) * amplitude;
    image.data[pixel * 4] = image.data[pixel * 4 + 1] = image.data[pixel * 4 + 2] = value;
    image.data[pixel * 4 + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  // Casting pits: soft light and dark blots.
  for (let blot = 0; blot < 260; blot++) {
    const light = random() > 0.5;
    context.globalAlpha = 0.04 + random() * 0.06;
    context.fillStyle = light ? '#ffffff' : '#000000';
    context.beginPath();
    context.arc(random() * width, random() * height, 2 + random() * 10, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
  return canvas;
}

function drawLabel(canvas: HTMLCanvasElement, text: string, colors: KettlebellColors): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  const { width, height } = canvas;
  context.fillStyle = colors.iron;
  context.fillRect(0, 0, width, height);
  context.globalAlpha = 0.18;
  context.drawImage(noiseCanvas(512, 256, 120, 90, 29), 0, 0, width, height);
  context.globalAlpha = 1;
  context.fillStyle = colors.label;
  context.font = LABEL_FONT;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.save();
  context.translate(width / 2, height * 0.508);
  context.scale(0.62, 1);
  context.fillText(text, 0, 0);
  context.restore();
  // The underline.
  context.fillRect(width / 2 - 140, height * 0.605, 280, 8);
}

/** The studio the iron reflects: a dark gradient room, two white softboxes, a pink bounce card, a warm kicker. */
function buildEnvironment(THREE: ThreeModule, colors: KettlebellColors): Three.Scene {
  const scene = new THREE.Scene();
  const roomGeometry = new THREE.SphereGeometry(20, 32, 16);
  const position = roomGeometry.attributes.position;
  const vertexColors: number[] = [];
  for (let index = 0; index < position.count; index++) {
    const up = Math.max(0, position.getY(index) / 20);
    vertexColors.push(0.1 + 0.25 * up, 0.08 + 0.22 * up, 0.1 + 0.24 * up);
  }
  roomGeometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
  scene.add(new THREE.Mesh(roomGeometry, new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true })));
  const card = (width: number, height: number, color: Three.ColorRepresentation, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    mesh.position.set(x, y, z);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  };
  card(10, 6, colors.softbox, -6, 7, 8);
  card(4, 10, colors.softbox, 9, 2, 3);
  card(14, 6, colors.bounce, 0, -4, 10);
  card(6, 4, new THREE.Color(1, 0.82, 0.69), 2, 6, -9);
  return scene;
}

function shadowCanvas(color: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  // The token is opaque: globalAlpha sets the darkest point under the bell.
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'transparent');
  context.globalAlpha = 0.55;
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  return canvas;
}

export function createKettlebellScene(THREE: ThreeModule, options: KettlebellSceneOptions): KettlebellScene {
  const { colors } = options;
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: options.preserveDrawingBuffer ?? false,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(options.pixelRatio);
  renderer.setSize(options.width, options.height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, options.width / options.height, 0.1, 50);
  camera.position.set(0, 0.35, 9.4);
  camera.lookAt(0, 0.25, 0);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentScene = buildEnvironment(THREE, colors);
  const environment = pmrem.fromScene(environmentScene, 0.02);
  scene.environment = environment.texture;

  const roughness = new THREE.CanvasTexture(noiseCanvas(512, 256, 150, 70, 7));
  const bump = new THREE.CanvasTexture(noiseCanvas(512, 256, 128, 120, 13));
  for (const texture of [roughness, bump]) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 2);
  }
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 2048;
  labelCanvas.height = 1024;
  drawLabel(labelCanvas, options.labelText, colors);
  const label = new THREE.CanvasTexture(labelCanvas);
  label.colorSpace = THREE.SRGBColorSpace;
  label.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

  const iron = new THREE.MeshPhysicalMaterial({
    map: label,
    roughness: 0.62,
    roughnessMap: roughness,
    metalness: 0.55,
    bumpMap: bump,
    bumpScale: 0.012,
    clearcoat: 0.35,
    clearcoatRoughness: 0.45,
    envMapIntensity: 1.1,
  });
  // The handle: smoother and glossier, polished by hands.
  const grip = new THREE.MeshPhysicalMaterial({
    color: colors.grip,
    roughness: 0.34,
    metalness: 0.7,
    bumpMap: bump,
    bumpScale: 0.006,
    clearcoat: 0.6,
    clearcoatRoughness: 0.25,
    envMapIntensity: 1.3,
  });

  const group = new THREE.Group();
  scene.add(group);
  // phiStart = π: the label's middle (u = 0.5) faces the camera.
  const bodyGeometry = new THREE.LatheGeometry(
    PROFILE.map(([x, y]) => new THREE.Vector2(x, y)),
    128,
    Math.PI,
    Math.PI * 2,
  );
  group.add(new THREE.Mesh(bodyGeometry, iron));
  const handleGeometry = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(HANDLE_PATH.map(([x, y]) => new THREE.Vector3(x, y, 0))),
    160,
    0.155,
    40,
    false,
  );
  group.add(new THREE.Mesh(handleGeometry, grip));
  const hornGeometry = new THREE.SphereGeometry(0.22, 32, 24);
  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(hornGeometry, iron);
    horn.position.set(side * 0.6, 0.74, 0);
    horn.scale.set(1, 0.8, 1);
    group.add(horn);
  }

  const key = new THREE.DirectionalLight(colors.softbox, 2.2);
  key.position.set(-3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(new THREE.Color(1, 0.77, 0.63), 1.6);
  rim.position.set(4, 2, -3);
  scene.add(rim);

  const shadowTexture = new THREE.CanvasTexture(shadowCanvas(colors.shadow));
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false });
  const shadowGeometry = new THREE.PlaneGeometry(3.4, 3.4);
  const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.12;
  scene.add(shadow);

  group.rotation.set(BASE_TILT.x, BASE_TILT.y, BASE_TILT.z);

  return {
    canvas: renderer.domElement,
    update(timeSec, rotationY, animate) {
      group.rotation.y = BASE_TILT.y + rotationY + (animate ? Math.sin(timeSec * SWAY_SPEED) * SWAY : 0);
      const lift = animate ? (Math.sin(timeSec * FLOAT_SPEED) + 1) * FLOAT_HEIGHT : 0;
      group.position.y = lift;
      // The shadow shrinks and fades as it rises.
      shadowMaterial.opacity = 1 - lift * 2.5;
      shadow.scale.setScalar(1 - lift * 0.8);
    },
    render() {
      renderer.render(scene, camera);
    },
    setSize(width, height) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    redrawLabel() {
      drawLabel(labelCanvas, options.labelText, colors);
      label.needsUpdate = true;
    },
    dispose() {
      for (const geometry of [bodyGeometry, handleGeometry, hornGeometry, shadowGeometry]) geometry.dispose();
      for (const material of [iron, grip, shadowMaterial]) material.dispose();
      for (const texture of [roughness, bump, label, shadowTexture]) texture.dispose();
      environmentScene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          (object.material as Three.Material).dispose();
        }
      });
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      // Home remounts on every visit: give the GL context back right away (browsers cap them).
      renderer.forceContextLoss();
    },
  };
}

/** The font the label is printed in, so the hook can wait for it. */
export const KETTLEBELL_LABEL_FONT = LABEL_FONT;
