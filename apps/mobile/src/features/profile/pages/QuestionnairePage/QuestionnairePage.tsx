import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconSalad } from '@tabler/icons-react';
import { describeNutritionPreferences, describeWeightGoal, fill, getActiveLanguage, sharedCopy, useCopy, useI18n } from '@sistem/shared';
import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { GlassCard } from '../../../../components/common/GlassCard/GlassCard';
import { Spinner } from '../../../../components/common/Spinner/Spinner';
import { FlagIcon, CalendarIcon, CompassIcon, DumbbellIcon, EditIcon } from '../../components/icons';
import { SubPageHeader } from '../../components/SubPageHeader/SubPageHeader';
import { ACTIVITIES } from '../../../onboarding/data/activities';
import type { OnboardingStepId } from '../../../onboarding/data/stepVideoMap';
import { getMyProfile } from '../../../../services/users/usersService';
import type { MyProfileResponse } from '../../../../services/users/usersService';
import { useStaggerReveal } from '../../../../hooks/useStaggerReveal';
import { ROUTES, onboardingEditPath } from '../../../../app/config/routes';
import { profileCopy } from '../../copy';
import { useMyUnits } from '../../hooks/useMyBody';
import './QuestionnairePage.css';

const ACTIVITIES_BY_ID = new Map<string, (typeof ACTIVITIES)[number]>(ACTIVITIES.map((activity) => [activity.id, activity]));

// Her answers are option ids; the labels are the questionnaire's own (shared copy), in the language on screen.
function BadgeList({
  ids,
  labels,
  variant,
}: {
  ids: string[];
  labels: Readonly<Record<string, string>>;
  variant: 'accent' | 'neutral';
}) {
  const copy = useCopy(profileCopy);
  if (ids.length === 0) {
    return <span className="profile-summary-empty">{copy.notSetYet}</span>;
  }
  return (
    <div className="profile-summary-badges">
      {ids.map((id) => (
        <span key={id} className={`profile-tag profile-tag-${variant}`}>
          {labels[id] ?? id}
        </span>
      ))}
    </div>
  );
}

function ActivityBadgeList({ ids }: { ids: string[] }) {
  const copy = useCopy(profileCopy);
  const labels: Readonly<Record<string, string>> = useCopy(sharedCopy).onboardingOptions.activities;
  if (ids.length === 0) {
    return <span className="profile-summary-empty">{copy.notSetYet}</span>;
  }
  return (
    <div className="profile-summary-badges">
      {ids.map((id) => {
        const activity = ACTIVITIES_BY_ID.get(id);
        return (
          <span key={id} className="profile-tag profile-tag-success">
            {activity?.emoji && <span aria-hidden="true">{activity.emoji}</span>}
            {labels[id] ?? id}
          </span>
        );
      })}
    </div>
  );
}

type TrainingAccent = 'orange' | 'blue' | 'teal' | 'gray';

interface TrainingBlockProps {
  icon: React.ReactNode;
  title: string;
  accent: TrainingAccent;
  className?: string;
  editStep?: OnboardingStepId;
  children: React.ReactNode;
}

function TrainingBlock({ icon, title, accent, className, editStep, children }: TrainingBlockProps) {
  const copy = useCopy(profileCopy);
  return (
    <GlassCard
      variant="flat"
      className={['training-block', `training-block-${accent}`, className].filter(Boolean).join(' ')}
    >
      <div className="training-block-header">
        <span className={`training-block-icon training-block-icon-${accent}`} aria-hidden="true">
          {icon}
        </span>
        <h3 className="training-block-title">{title}</h3>
        {editStep && (
          <Link to={onboardingEditPath(editStep)} className="training-block-edit" aria-label={fill(copy.editLabel, { title })}>
            <EditIcon />
          </Link>
        )}
      </div>
      {children}
    </GlassCard>
  );
}

function FrequencyStrip({ minDays, maxDays }: { minDays: number; maxDays: number }) {
  const segments = Array.from({ length: 7 }, (_, index) => {
    if (index < minDays) return 'filled';
    if (index < maxDays) return 'tinted';
    return 'neutral';
  });

  return (
    <div className="frequency-strip" aria-hidden="true">
      {segments.map((state, index) => (
        <span key={index} className={`frequency-segment frequency-segment-${state}`} />
      ))}
    </div>
  );
}

// Her onboarding answers — what her coach sees (PRD §5.5 "editable where it makes sense"): each block
// opens its onboarding step. Moved here from the Profile screen in the profile redesign; unchanged.
export function QuestionnairePage() {
  const copy = useCopy(profileCopy);
  const { language } = useI18n();
  const options = useCopy(sharedCopy).onboardingOptions;
  const [profile, setProfile] = useState<MyProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const trainingBlocksRef = useStaggerReveal<HTMLDivElement>([profile]);
  const { units } = useMyUnits();

  useEffect(() => {
    getMyProfile()
      .then(setProfile)
      .catch((error) => {
        setLoadError((error instanceof Error && error.message) || profileCopy[getActiveLanguage()].loadError);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const frequency = profile?.profile?.trainingFrequency;

  return (
    <AppShell>
      <div className="questionnaire-page">
        <SubPageHeader title={copy.questionnaireTitle} fallbackPath={ROUTES.PROFILE} />
        {isLoading && (
          <div className="profile-loading-inline">
            <Spinner size="md" />
          </div>
        )}

        {!isLoading && loadError && <p className="profile-error">{loadError}</p>}

        {!isLoading && !loadError && (
          <div className="training-block-grid" ref={trainingBlocksRef}>
            <TrainingBlock
              icon={<FlagIcon />}
              title={copy.goals}
              accent="orange"
              className="training-block-goals"
              editStep="goals"
            >
              <BadgeList ids={profile?.profile?.goals ?? []} labels={options.goals} variant="accent" />
            </TrainingBlock>

            <TrainingBlock
              icon={<CalendarIcon />}
              title={copy.trainingFrequency}
              accent="blue"
              className="training-block-frequency"
              editStep="frequency"
            >
              {frequency ? (
                <>
                  <FrequencyStrip minDays={frequency.minDays} maxDays={frequency.maxDays} />
                  <span className="training-block-caption">
                    {fill(copy.daysPerWeek, { min: frequency.minDays, max: frequency.maxDays })}
                    {frequency.flexibleSchedule && copy.flexibleSchedule}
                  </span>
                </>
              ) : (
                <span className="profile-summary-empty">{copy.notSetYet}</span>
              )}
            </TrainingBlock>

            <TrainingBlock
              icon={<CompassIcon />}
              title={copy.preferredActivities}
              accent="teal"
              className="training-block-activities"
              editStep="activities"
            >
              <ActivityBadgeList ids={profile?.profile?.preferredActivities ?? []} />
            </TrainingBlock>

            <TrainingBlock
              icon={<DumbbellIcon />}
              title={copy.equipment}
              accent="gray"
              className="training-block-equipment"
              editStep="equipment"
            >
              <BadgeList ids={profile?.profile?.equipment ?? []} labels={options.equipment} variant="neutral" />
            </TrainingBlock>

            <TrainingBlock
              icon={<IconSalad size={20} />}
              title={copy.nutritionPreferencesTitle}
              accent="teal"
              className="training-block-nutrition"
              editStep="nutrition_preferences"
            >
              {profile?.profile?.nutritionPreferences || profile?.profile?.weightGoal ? (
                <dl className="training-block-rows">
                  {[
                    ...(profile.profile.weightGoal
                      ? [{ label: copy.weightGoalLabel, value: describeWeightGoal(profile.profile.weightGoal, units.weight, language) }]
                      : []),
                    ...(profile.profile.nutritionPreferences ? describeNutritionPreferences(profile.profile.nutritionPreferences, language) : []),
                  ].map((row) => (
                    <div key={row.label} className="training-block-row">
                      <dt>{row.label}</dt>
                      <dd dir="auto">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <span className="profile-summary-empty">{copy.notSetYet}</span>
              )}
            </TrainingBlock>
          </div>
        )}

        <Link to={ROUTES.ONBOARDING} className="profile-redo-onboarding-link">
          {copy.redoOnboarding}
        </Link>
      </div>
    </AppShell>
  );
}
