import { useCallback, useEffect, useId, useState } from 'react';
import type { ReactNode, Ref } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Logo } from '../../../../components/common/Logo/Logo';
import { Spinner } from '../../../../components/common/Spinner/Spinner';
import { CardDeck } from '../../components/CardDeck/CardDeck';
import { DeckActions } from '../../components/DeckActions/DeckActions';
import { DeckButton } from '../../components/DeckButton/DeckButton';
import { OnboardingBackground } from '../../components/OnboardingBackground/OnboardingBackground';
import { QuestionCard } from '../../components/QuestionCard/QuestionCard';
import { StepHeading } from '../../components/StepHeading/StepHeading';
import { WelcomeStep } from '../../steps/WelcomeStep/WelcomeStep';
import { useJoiningCoach } from '../../../firstRun/hooks/useJoiningCoach';
import { BasicProfileStep } from '../../steps/BasicProfileStep/BasicProfileStep';
import { GoalsStep } from '../../steps/GoalsStep/GoalsStep';
import { FrequencyStep } from '../../steps/FrequencyStep/FrequencyStep';
import { ActivitiesStep } from '../../steps/ActivitiesStep/ActivitiesStep';
import { ExercisePreferencesStep } from '../../steps/ExercisePreferencesStep/ExercisePreferencesStep';
import { RecoveryStep } from '../../steps/RecoveryStep/RecoveryStep';
import { EquipmentStep } from '../../steps/EquipmentStep/EquipmentStep';
import { NutritionPreferencesStep } from '../../steps/NutritionPreferencesStep/NutritionPreferencesStep';
import { ReviewStep } from '../../steps/ReviewStep/ReviewStep';
import { StartingPhotoStep } from '../../steps/StartingPhotoStep/StartingPhotoStep';
import { INITIAL_ONBOARDING_STATE } from '../../types';
import type { OnboardingFormState, OnboardingMedia } from '../../types';
import { todayInTimezone, useCopy } from '@sistem/shared';
import { extractErrorMessage } from '@sistem/api-client';
import {
  completeOnboarding,
  getMyOnboarding,
  saveOnboardingStep,
  skipOnboardingStep,
} from '../../../../services/onboarding/onboardingService';
import { isNutritionStepValid } from '../../data/nutritionForm';
import { mapOnboardingToFormState } from '../../data/formState';
import { onboardingCopy } from '../../copy';
import { useAuth } from '../../../../services/auth/AuthContext';
import { ROUTES } from '../../../../app/config/routes';
import { landingPath } from '../../../../app/router/landingPath';
import { STEP_VIDEO_MAP } from '../../data/stepVideoMap';
import type { OnboardingStepId } from '../../data/stepVideoMap';
import { ACTIVITY_VIDEO_MAP } from '../../data/activityVideoMap';
import { ACTIVITIES } from '../../data/activities';
import { useDeckTransition } from '../../hooks/useDeckTransition';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { useKeyboardInset } from '../../../../hooks/useKeyboardInset';
import './OnboardingPage.css';

const STEP_COUNT = 11;
const EXERCISE_PREFERENCES_STEP_INDEX = 5;
const ACTIVITIES_STEP_INDEX = 4;
const NUTRITION_STEP_INDEX = 8;
// The wheel passes many activities on a swipe: a clip is fetched only for one it rests on.
const ACTIVITY_VIDEO_SETTLE_MS = 180;

// Each step is its own browser-history entry, so the system back gesture / Android
// back button goes to the previous step instead of leaving onboarding.
// `resumed` marks the entry created when resuming mid-way: there is no earlier
// step entry to pop, so Back replaces it with the previous step instead.
interface OnboardingHistoryState {
  onboardingStep?: number;
  resumed?: boolean;
}

const STEP_IDS: OnboardingStepId[] = [
  'welcome',
  'basic_profile',
  'goals',
  'frequency',
  'activities',
  'exercise_preferences',
  'recovery',
  'equipment',
  'nutrition_preferences',
  'review',
  'starting_photo',
];

function isStepValid(index: number, state: OnboardingFormState): boolean {
  switch (index) {
    case 1:
      return (
        state.name.trim().length > 0 &&
        state.birthDate !== '' &&
        state.height !== '' &&
        state.weight !== ''
      );
    case 2:
      return state.goals.length > 0;
    case 4:
      return state.preferredActivities.length > 0;
    case 7:
      return state.equipment.length > 0;
    case NUTRITION_STEP_INDEX:
      return isNutritionStepValid(state);
    default:
      return true;
  }
}

// 'welcome' and 'review' are bookend screens with no data of their own — not
// valid targets for the Profile page's "edit just this step" deep link.
const NON_EDITABLE_STEP_IDS = new Set<OnboardingStepId>(['welcome', 'review', 'starting_photo']);

function isEditableStepId(value: string | undefined): value is OnboardingStepId {
  return (
    value !== undefined &&
    (STEP_IDS as string[]).includes(value) &&
    !NON_EDITABLE_STEP_IDS.has(value as OnboardingStepId)
  );
}

// Saved answers can be incomplete (e.g. an older save, or a step that was skipped),
// so never show a step past the first one that still needs an answer.
function clampToFirstInvalidStep(requestedIndex: number, state: OnboardingFormState): number {
  for (let index = 0; index < requestedIndex; index += 1) {
    if (!isStepValid(index, state)) return index;
  }
  return requestedIndex;
}

type OnboardingCopy = (typeof onboardingCopy)['he'];

/** Each step's question and its small helper lines — all from the existing copy. */
function stepHeadingText(stepId: OnboardingStepId, copy: OnboardingCopy): { title: string; hints: string[] } {
  switch (stepId) {
    case 'welcome':
      return { title: copy.welcome.title, hints: [] };
    case 'basic_profile':
      return { title: copy.basicProfile.title, hints: [] };
    case 'goals':
      return { title: copy.goals.title, hints: [copy.chooseAll] };
    case 'frequency':
      return { title: copy.frequency.title, hints: [] };
    case 'activities':
      return { title: copy.activities.title, hints: [copy.chooseAll, copy.activities.wheelHint] };
    case 'exercise_preferences':
      return { title: copy.exercisePreferences.title, hints: [copy.exercisePreferences.hint] };
    case 'recovery':
      return { title: copy.recovery.title, hints: [copy.recovery.hint] };
    case 'equipment':
      return { title: copy.equipment.title, hints: [copy.chooseAll] };
    case 'nutrition_preferences':
      return { title: copy.nutrition.title, hints: [copy.nutrition.intro] };
    case 'review':
      return { title: copy.review.title, hints: [] };
    case 'starting_photo':
      return { title: copy.startingPhoto.title, hints: [] };
  }
}

/** The clips to get ready around the centered activity: its two neighbours on the wheel. */
function neighbourMedia(activityId: string): OnboardingMedia[] {
  const index = ACTIVITIES.findIndex((activity) => activity.id === activityId);
  if (index === -1) return [];
  return [ACTIVITIES[index - 1], ACTIVITIES[index + 1]]
    .map((activity) => (activity ? ACTIVITY_VIDEO_MAP[activity.id] : undefined))
    .filter((media): media is OnboardingMedia => media !== undefined);
}

interface OnboardingScreenProps {
  media?: OnboardingMedia;
  preload?: OnboardingMedia[];
  /** The activities wheel fills exactly one screen; card steps scroll with the page. */
  isWheel?: boolean;
  /** True while a step is leaving: nothing on it can be tapped. */
  isMoving?: boolean;
  stageRef?: Ref<HTMLElement>;
  children: ReactNode;
}

// Full-screen phone layout: the pink gradient (or an activity video) behind, the logo mark on
// top, and the step — a card on its deck, or the wheel — on the stage.
function OnboardingScreen({ media, preload, isWheel = false, isMoving = false, stageRef, children }: OnboardingScreenProps) {
  useKeyboardInset();

  return (
    <div
      className={
        'onboarding-screen' + (isWheel ? ' onboarding-screen-wheel' : '') + (media ? ' onboarding-screen-video' : '')
      }
    >
      <OnboardingBackground media={media} preload={preload} />
      <div className="onboarding-mark">
        <Logo variant="mark" />
      </div>
      <main ref={stageRef} className="onboarding-stage" inert={isMoving}>
        {children}
      </main>
    </div>
  );
}

export function OnboardingPage() {
  const copy = useCopy(onboardingCopy);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser } = useAuth();
  // The intro line names her coach (a link at sign-up, or a code in the first run).
  const joiningCoach = useJoiningCoach(user?.coachingStatus != null);
  const params = useParams<{ step?: string }>();
  const editStepId = isEditableStepId(params.step) ? params.step : undefined;
  const isEditMode = params.step !== undefined;
  const isValidEditStep = editStepId !== undefined;

  const historyState = location.state as OnboardingHistoryState | null;
  const historyStep = historyState?.onboardingStep ?? 0;
  const [formState, setFormState] = useState<OnboardingFormState>(() => ({
    ...INITIAL_ONBOARDING_STATE,
    name: user?.name ?? '',
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startingPhotoSaved, setStartingPhotoSaved] = useState(false);
  const [isStartingPhotoBusy, setIsStartingPhotoBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  // The activity at the center of the wheel; its video follows once the wheel rests on it.
  const [centerActivityId, setCenterActivityId] = useState<string | null>(null);
  const settledActivityId = useDebouncedValue(centerActivityId, ACTIVITY_VIDEO_SETTLE_MS);
  const titleId = useId();
  const startingPhotoDate = todayInTimezone(user?.timezone ?? 'UTC');
  // Both modes start from the answers saved on the server.
  const [isLoadingAnswers, setIsLoadingAnswers] = useState(true);
  const [answersLoadError, setAnswersLoadError] = useState<string>();
  const [loadAttempt, setLoadAttempt] = useState(0);
  // The load ends by writing the step to resume at into the history entry; that lands a moment
  // after the answers. Until it has, the first step would show and be tossed away at once.
  const isPlacingStep = !isEditMode && !answersLoadError && historyState?.onboardingStep === undefined;
  const isStepReady = !isLoadingAnswers && !isPlacingStep;

  const stepIndex = editStepId
    ? STEP_IDS.indexOf(editStepId)
    : clampToFirstInvalidStep(Math.min(historyStep, STEP_COUNT - 1), formState);

  // Answers are saved after every step, so a fresh mount (a reload, another device)
  // restores them and resumes after the last saved step. Edit mode only needs the
  // answers. Re-runs when the user retries a failed load.
  useEffect(() => {
    if (isEditMode && !isValidEditStep) return;
    let cancelled = false;
    setIsLoadingAnswers(true);
    setAnswersLoadError(undefined);

    getMyOnboarding()
      .then((onboarding) => {
        if (cancelled) return;
        setFormState(mapOnboardingToFormState(onboarding, user?.name ?? ''));
        if (!isEditMode) {
          const resumeStep = onboarding.lastStep
            ? Math.min(STEP_IDS.indexOf(onboarding.lastStep) + 1, STEP_COUNT - 1)
            : 0;
          const state: OnboardingHistoryState = { onboardingStep: resumeStep, resumed: resumeStep > 0 };
          navigate(location.pathname, { replace: true, state });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setAnswersLoadError((error instanceof Error && error.message) || copy.flow.loadError);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAnswers(false);
      });

    return () => {
      cancelled = true;
    };
    // Mount, a different edit step, or a retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editStepId, loadAttempt]);

  // The step on screen follows `stepIndex` once the old one has left (useDeckTransition);
  // everything drawn below reads `shownIndex`.
  const { stageRef, shownIndex, isMoving } = useDeckTransition<HTMLElement>(stepIndex, isStepReady);

  // A new step starts at the top of the screen.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [shownIndex]);

  // Invalid/unknown :step (or 'welcome'/'review', which aren't data steps) —
  // bounce back to Profile rather than rendering a broken edit screen.
  useEffect(() => {
    if (isEditMode && !isValidEditStep) {
      navigate(ROUTES.PROFILE, { replace: true });
    }
  }, [isEditMode, isValidEditStep, navigate]);

  const currentStepId = STEP_IDS[stepIndex];
  const shownStepId = STEP_IDS[shownIndex];
  const isWheelStep = shownIndex === ACTIVITIES_STEP_INDEX;
  // Leaving the step hides the video at once; "other" has no clip, so it fades back to the gradient.
  const activityId = isWheelStep ? settledActivityId : null;
  const media = (activityId ? ACTIVITY_VIDEO_MAP[activityId] : undefined) ?? STEP_VIDEO_MAP[shownStepId];
  const preload = activityId ? neighbourMedia(activityId) : [];

  function updateFormState(patch: Partial<OnboardingFormState>) {
    setFormState((prev) => ({ ...prev, ...patch }));
  }

  async function handleContinue() {
    setSubmitError(undefined);
    setIsSubmitting(true);
    try {
      if (stepIndex === STEP_COUNT - 1) {
        const { user: savedUser } = await completeOnboarding(formState);
        updateUser(savedUser);
        // The server decides where a finished onboarding lands (the waiting screen).
        navigate(landingPath(savedUser.appState), { replace: true });
        return;
      }

      // Saved before moving on, so onboarding resumes here on any device.
      const { user: savedUser } = await saveOnboardingStep(currentStepId, formState);
      updateUser(savedUser);
      goToStep(stepIndex + 1);
    } catch (error) {
      // The server's own message (e.g. the weight range in her unit); generic when it sent none.
      setSubmitError(extractErrorMessage(error, copy.flow.saveError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function finishOnboarding() {
    setSubmitError(undefined);
    setIsSubmitting(true);
    try {
      const { user: savedUser } = await completeOnboarding(formState);
      updateUser(savedUser);
      navigate(landingPath(savedUser.appState), { replace: true });
    } catch (error) {
      setSubmitError(extractErrorMessage(error, copy.flow.saveError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSkipStartingPhoto() {
    setSubmitError(undefined);
    setIsSubmitting(true);
    try {
      const { user: savedUser } = await skipOnboardingStep('starting_photo');
      updateUser(savedUser);
      const result = await completeOnboarding(formState);
      updateUser(result.user);
      navigate(landingPath(result.user.appState), { replace: true });
    } catch (error) {
      setSubmitError(extractErrorMessage(error, copy.flow.saveError));
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleStartingPhotoSaved = useCallback(() => setStartingPhotoSaved(true), []);
  const handleStartingPhotoBusyChange = useCallback((busy: boolean) => setIsStartingPhotoBusy(busy), []);

  function goToStep(index: number) {
    const state: OnboardingHistoryState = { onboardingStep: index };
    navigate(location.pathname, { state });
  }

  // Same as the system back gesture: pop this step's history entry. A resumed step
  // has no earlier entry, so it is swapped for the previous step in place.
  function handleBack() {
    setSubmitError(undefined);
    if (historyState?.resumed) {
      const state: OnboardingHistoryState = { onboardingStep: stepIndex - 1, resumed: stepIndex - 1 > 0 };
      navigate(location.pathname, { replace: true, state });
      return;
    }
    navigate(-1);
  }

  // Skipping still saves the step (with whatever is filled in), so resume moves past it.
  function handleSkip() {
    void handleContinue();
  }

  // "Nutrition & goal" is optional as a whole: Skip saves none of it (only that she passed it).
  async function handleSkipNutrition() {
    setSubmitError(undefined);
    setIsSubmitting(true);
    try {
      const { user: savedUser } = await skipOnboardingStep(currentStepId);
      updateUser(savedUser);
      goToStep(stepIndex + 1);
    } catch (error) {
      setSubmitError(extractErrorMessage(error, copy.flow.saveError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancelEdit() {
    navigate(ROUTES.PROFILE);
  }

  async function handleSaveEdit() {
    if (!editStepId) return;
    setSubmitError(undefined);
    setIsSubmitting(true);
    try {
      const { user: savedUser } = await saveOnboardingStep(editStepId, formState);
      updateUser(savedUser);
      navigate(ROUTES.PROFILE);
    } catch (error) {
      setSubmitError(extractErrorMessage(error, copy.flow.profileSaveError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isEditMode && !isValidEditStep) {
    // Redirecting via the effect above — render nothing in the meantime.
    return null;
  }

  if (!isStepReady) {
    return (
      <div className="onboarding-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  const isFirstStep = shownIndex === 0;
  const isLastStep = shownIndex === STEP_COUNT - 1;
  const isStartingPhotoStep = shownStepId === 'starting_photo';
  const showSkip = shownIndex === EXERCISE_PREFERENCES_STEP_INDEX;
  const continueLabel = isFirstStep ? copy.flow.start : isLastStep ? copy.flow.createProfile : copy.flow.continue;

  const actions = isEditMode ? (
    <DeckActions
      start={
        <DeckButton variant="quiet" onClick={handleCancelEdit} disabled={isSubmitting}>
          {copy.flow.cancel}
        </DeckButton>
      }
    >
      <DeckButton
        onClick={handleSaveEdit}
        loading={isSubmitting}
        disabled={Boolean(answersLoadError) || !isStepValid(shownIndex, formState)}
      >
        {copy.flow.saveChanges}
      </DeckButton>
    </DeckActions>
  ) : (
    <DeckActions
      start={
        !isFirstStep && (
          <DeckButton variant="quiet" onClick={handleBack} disabled={isSubmitting}>
            {copy.flow.back}
          </DeckButton>
        )
      }
    >
      {showSkip && (
        <DeckButton variant="quiet" onClick={handleSkip} disabled={isSubmitting}>
          {copy.flow.skipForNow}
        </DeckButton>
      )}
      {shownIndex === NUTRITION_STEP_INDEX && (
        <DeckButton variant="quiet" onClick={handleSkipNutrition} disabled={isSubmitting}>
          {copy.nutrition.skip}
        </DeckButton>
      )}
      {isStartingPhotoStep ? (
        startingPhotoSaved ? (
          <DeckButton onClick={finishOnboarding} loading={isSubmitting}>
            {copy.flow.createProfile}
          </DeckButton>
        ) : (
          <DeckButton variant="quiet" onClick={handleSkipStartingPhoto} disabled={isSubmitting || isStartingPhotoBusy}>
            {copy.startingPhoto.skip}
          </DeckButton>
        )
      ) : (
        <DeckButton onClick={handleContinue} loading={isSubmitting} disabled={!isStepValid(shownIndex, formState)}>
          {continueLabel}
        </DeckButton>
      )}
    </DeckActions>
  );

  if (answersLoadError) {
    return (
      <OnboardingScreen>
        <CardDeck>
          <QuestionCard
            error={answersLoadError}
            actions={
              isEditMode ? (
                actions
              ) : (
                <DeckActions>
                  <DeckButton onClick={() => setLoadAttempt((attempt) => attempt + 1)}>{copy.flow.tryAgain}</DeckButton>
                </DeckActions>
              )
            }
          />
        </CardDeck>
      </OnboardingScreen>
    );
  }

  const headingText = stepHeadingText(shownStepId, copy);
  const heading = (
    <StepHeading
      // One step edited on its own (from Profile) has no place in the flow.
      progress={isEditMode ? undefined : { current: shownIndex + 1, total: STEP_COUNT }}
      title={headingText.title}
      titleId={titleId}
      hints={headingText.hints}
    />
  );

  if (isWheelStep) {
    return (
      <OnboardingScreen media={media} preload={preload} isWheel isMoving={isMoving} stageRef={stageRef}>
        <ActivitiesStep
          formState={formState}
          updateFormState={updateFormState}
          onPreviewActivity={setCenterActivityId}
          heading={heading}
          titleId={titleId}
          error={submitError}
          actions={actions}
        />
      </OnboardingScreen>
    );
  }

  const cardSteps: Partial<Record<OnboardingStepId, ReactNode>> = {
    welcome: <WelcomeStep hasCoach={user?.coachingStatus != null} coachName={joiningCoach} />,
    basic_profile: <BasicProfileStep formState={formState} updateFormState={updateFormState} />,
    goals: <GoalsStep formState={formState} updateFormState={updateFormState} />,
    frequency: <FrequencyStep formState={formState} updateFormState={updateFormState} />,
    exercise_preferences: <ExercisePreferencesStep formState={formState} updateFormState={updateFormState} />,
    recovery: <RecoveryStep formState={formState} updateFormState={updateFormState} />,
    equipment: <EquipmentStep formState={formState} updateFormState={updateFormState} />,
    nutrition_preferences: <NutritionPreferencesStep formState={formState} updateFormState={updateFormState} />,
    review: <ReviewStep formState={formState} />,
    starting_photo: (
      <StartingPhotoStep
        date={startingPhotoDate}
        onPhotoSaved={handleStartingPhotoSaved}
        onBusyChange={handleStartingPhotoBusyChange}
      />
    ),
  };

  return (
    <OnboardingScreen media={media} isMoving={isMoving} stageRef={stageRef}>
      <CardDeck>
        <QuestionCard heading={heading} error={submitError} actions={actions}>
          {cardSteps[shownStepId]}
        </QuestionCard>
      </CardDeck>
    </OnboardingScreen>
  );
}
