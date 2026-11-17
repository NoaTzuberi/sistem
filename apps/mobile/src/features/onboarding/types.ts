import type { AllergyId, DietStyleId, DietType, IntoleranceId, ReligiousId, TrainingExperience } from '@sistem/types';

export interface OnboardingFormState {
  name: string;
  /** Optional; saved on her account (the server checks and normalizes it). '' = none. */
  phone: string;
  birthDate: string;
  height: string;
  weight: string;
  gender: string;
  units: {
    weight: 'kg' | 'lb';
    distance: 'km' | 'miles';
  };
  goals: string[];
  trainingFrequency: {
    minDays: number;
    maxDays: number;
    flexibleSchedule: boolean;
  };
  /** Phase 12b (frequency step, optional): null = not answered. */
  trainingExperience: TrainingExperience | null;
  preferredActivities: string[];
  exercisePreferences: {
    favoriteExerciseNotes: string;
    improvementExerciseNotes: string;
    muscleFocus: string[];
  };
  equipment: string[];
  recovery: {
    flags: string[];
    notes: string;
  };
  /** "Nutrition & goal" step (Phase 13a, v2 in 13a+). Starts empty — Continue saves these. */
  nutritionPreferences: {
    dietType: DietType;
    dietTypeDetails: string;
    dietStyles: FormPreferenceItem<DietStyleId>[];
    religious: FormPreferenceItem<ReligiousId>[];
    intolerances: FormPreferenceItem<IntoleranceId>[];
    allergies: FormPreferenceItem<AllergyId>[];
    foodsLoved: string;
    foodsDisliked: string;
    mealsPerDay: number | null;
  };
  /** "My goal" (13a+), typed in her weight unit. Asked only for weight loss / gain goals. */
  weightGoal: {
    targetWeight: string;
    timeframeKind: 'weeks' | 'date' | null;
    weeks: string;
    date: string;
  };
}

/** A chosen option with her own words (an empty string = no details). */
export interface FormPreferenceItem<T extends string> {
  id: T;
  details: string;
}

export const INITIAL_ONBOARDING_STATE: OnboardingFormState = {
  name: '',
  phone: '',
  birthDate: '',
  height: '',
  weight: '',
  gender: '',
  units: {
    weight: 'kg',
    distance: 'km',
  },
  goals: [],
  trainingFrequency: {
    minDays: 1,
    maxDays: 3,
    flexibleSchedule: false,
  },
  trainingExperience: null,
  preferredActivities: [],
  exercisePreferences: {
    favoriteExerciseNotes: '',
    improvementExerciseNotes: '',
    muscleFocus: [],
  },
  equipment: [],
  recovery: {
    flags: [],
    notes: '',
  },
  nutritionPreferences: {
    dietType: 'none',
    dietTypeDetails: '',
    dietStyles: [],
    religious: [],
    intolerances: [],
    allergies: [],
    foodsLoved: '',
    foodsDisliked: '',
    mealsPerDay: null,
  },
  weightGoal: {
    targetWeight: '',
    timeframeKind: null,
    weeks: '',
    date: '',
  },
};

/** A background clip for the onboarding screen, hosted on Cloudinary (Phase 2c). */
export interface OnboardingMedia {
  video: string;
  poster: string;
  /** Seconds to skip at the start of the clip (also on every loop). */
  startAt?: number;
  /** Which side of a wide clip to keep on a tall phone screen (default: the middle). */
  focus?: 'right';
}
