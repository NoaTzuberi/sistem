import type { DailyObjectId } from './objectOfDay';
import kettlebell from '../../assets/objects/kettlebell.png';
import dumbbell from '../../assets/objects/dumbbell.png';
import weightPlate from '../../assets/objects/weightPlate.png';
import medicineBall from '../../assets/objects/medicineBall.png';
import jumpRope from '../../assets/objects/jumpRope.png';
import shakerBottle from '../../assets/objects/shakerBottle.png';
import stopwatch from '../../assets/objects/stopwatch.png';

// The static render of each object: the live scene's first frame (same code, same framing), shown
// while three.js loads and when WebGL is not available. These are URLs: only today's file is fetched.
export const OBJECT_RENDERS: Record<DailyObjectId, string> = {
  kettlebell,
  dumbbell,
  weightPlate,
  medicineBall,
  jumpRope,
  shakerBottle,
  stopwatch,
};
