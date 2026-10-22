import { createAuthApi, createTraineeApi } from '@sistem/api-client';
import type { NutritionPreferences, WeightGoal } from '@sistem/types';
import { apiClient } from '../api/apiClient';

export interface MyProfileResponse {
  name: string;
  onboardingCompleted: boolean;
  profile?: {
    birthDate?: string;
    height?: number;
    weight?: number;
    gender?: string;
    goals: string[];
    trainingFrequency?: {
      minDays: number;
      maxDays: number;
      flexibleSchedule: boolean;
    };
    preferredActivities: string[];
    exercisePreferences?: {
      favoriteExerciseNotes?: string;
      improvementExerciseNotes?: string;
      muscleFocus: string[];
    };
    equipment: string[];
    recovery?: {
      flags: string[];
      notes?: string;
    };
    /** Phase 13a; missing = not answered. */
    nutritionPreferences?: NutritionPreferences;
    /** Phase 13a+; missing = not answered. */
    weightGoal?: WeightGoal;
  };
  preferences?: {
    units?: {
      weight?: 'kg' | 'lb';
      distance?: 'km' | 'miles';
    };
  };
}

export async function getMyProfile(): Promise<MyProfileResponse> {
  const { data } = await apiClient.get<{ user: MyProfileResponse }>('/users/profile');
  return data.user;
}

// Her display units (Settings, Phase 10), UI language (Phase 15) and profile photo.
export const { updatePreferences, uploadAvatar, removeAvatar, fetchAvatar } = createAuthApi(apiClient);

// First run: "on my own" (remembered on the server; resumes in the questionnaire).
export const { chooseSelfGuided } = createTraineeApi(apiClient);
