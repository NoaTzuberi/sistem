import type * as Three from 'three';
import type { DailyObjectId } from './objects/objectOfDay';
import {
  type ObjectBuilder,
  type StudioColors,
  type ThreeModule,
  addLights,
  buildEnvironment,
  createContactShadow,
  createMaterials,
  disposeTree,
} from './objects/studio';
import { buildKettlebell } from './objects/kettlebell';
import { buildDumbbell } from './objects/dumbbell';
import { buildWeightPlate } from './objects/weightPlate';
import { buildMedicineBall } from './objects/medicineBall';
import { buildJumpRope } from './objects/jumpRope';
import { buildShakerBottle } from './objects/shakerBottle';
import { buildStopwatch } from './objects/stopwatch';

// The Home stage's "object of the day" (docs/design/trainee-home-b.html), procedural — no model or
// texture files. This module is imported together with three.js after first paint (its own chunk);
// three is passed in.

const BUILDERS: Record<DailyObjectId, ObjectBuilder> = {
  kettlebell: buildKettlebell,
  dumbbell: buildDumbbell,
  weightPlate: buildWeightPlate,
  medicineBall: buildMedicineBall,
  jumpRope: buildJumpRope,
  shakerBottle: buildShakerBottle,
  stopwatch: buildStopwatch,
};

export interface DailyObjectSceneOptions {
  width: number;
  height: number;
  /** ≤ 2 — sharper is not worth the fill rate on a phone. */
  pixelRatio: number;
  objectId: DailyObjectId;
  colors: StudioColors;
  /** Draw into a buffer that survives the frame (only the PNG export needs it). */
  preserveDrawingBuffer?: boolean;
}

export interface DailyObjectScene {
  canvas: HTMLCanvasElement;
  /** Seconds since start, the drag rotation (radians) and whether to float / sway. */
  update(timeSec: number, rotationY: number, animate: boolean): void;
  render(): void;
  setSize(width: number, height: number): void;
  dispose(): void;
}

/** Every object is drawn at this scale (the design's smaller, quieter stage). */
const OBJECT_SCALE = 0.82;
const BASE_ROTATION = 0.4;
const SWAY = 0.35;
const SWAY_SPEED = 0.55;
const FLOAT_SPEED = 1.3;
const FLOAT_HEIGHT = 0.06;
const FLOOR_Y = -1.25;

export function createDailyObjectScene(THREE: ThreeModule, options: DailyObjectSceneOptions): DailyObjectScene {
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
  renderer.toneMappingExposure = 1;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, options.width / options.height, 0.1, 50);
  camera.position.set(0, 0.6, 11);
  camera.lookAt(0, 0.1, 0);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentScene = buildEnvironment(THREE, colors);
  const environment = pmrem.fromScene(environmentScene, 0.03);
  scene.environment = environment.texture;
  addLights(THREE, scene, colors);

  const materials = createMaterials(THREE, colors);
  const holder = new THREE.Group();
  holder.scale.setScalar(OBJECT_SCALE);
  holder.add(BUILDERS[options.objectId](THREE, materials));
  scene.add(holder);

  const shadow = createContactShadow(THREE, colors.shadow);
  shadow.position.y = FLOOR_Y;
  scene.add(shadow);

  return {
    canvas: renderer.domElement,
    update(timeSec, rotationY, animate) {
      holder.rotation.y = BASE_ROTATION + rotationY + (animate ? Math.sin(timeSec * SWAY_SPEED) * SWAY : 0);
      const lift = animate ? (Math.sin(timeSec * FLOAT_SPEED) + 1) * FLOAT_HEIGHT : 0;
      holder.position.y = lift;
      // The shadow shrinks and fades as it rises.
      shadow.material.opacity = 1 - lift * 2.5;
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
    dispose() {
      disposeTree(THREE, scene);
      // Today's object may not use every material of the palette (disposing twice is harmless).
      for (const material of Object.values(materials) as Three.Material[]) material.dispose();
      disposeTree(THREE, environmentScene);
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      // Home remounts on every visit: give the GL context back right away (browsers cap them).
      renderer.forceContextLoss();
    },
  };
}
