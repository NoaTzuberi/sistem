import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { Container } from '../../../../components/layout/Container/Container';
import { Section } from '../../../../components/layout/Section/Section';
import { GlassCard } from '../../../../components/common/GlassCard/GlassCard';
import { Spinner } from '../../../../components/common/Spinner/Spinner';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { LogoutButton } from '../../../../components/common/LogoutButton/LogoutButton';
import { FlagIcon, CalendarIcon, CompassIcon, DumbbellIcon, EditIcon } from '../../components/icons';
import { ACTIVITIES } from '../../../onboarding/data/activities';
import type { OnboardingStepId } from '../../../onboarding/data/stepVideoMap';
import { getMyProfile } from '../../../../services/users/usersService';
import type { MyProfileResponse } from '../../../../services/users/usersService';
import { StreakSummary } from '../../../achievements/components/StreakSummary/StreakSummary';
import { ProgressStats } from '../../../achievements/components/ProgressStats/ProgressStats';
import { useMyAchievements } from '../../../achievements/hooks/useMyAchievements';
import { achievementCopy } from '../../../achievements/copy';
import { useAuth } from '../../../../services/auth/AuthContext';
import { useStaggerReveal } from '../../../../hooks/useStaggerReveal';
import { ROUTES, onboardingEditPath } from '../../../../app/config/routes';
import { IconChevronRight, IconSalad, IconSettings, IconTrophy } from '@tabler/icons-react';
import { describeNutritionPreferences, describeWeightGoal, fill, sharedCopy, useCopy, useI18n, getActiveLanguage } from '@sistem/shared';
import { BodySummary } from '../../components/BodySummary/BodySummary';
import { profileCopy } from '../../copy';
import { useMyBodyMetrics, useMyUnits } from '../../hooks/useMyBody';
import './ProfilePage.css';

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

function buildSummaryLine(
  profile: MyProfileResponse | null,
  copy: (typeof profileCopy)['he'],
  equipmentLabels: Readonly<Record<string, string>>,
  pluralize: ReturnType<typeof useI18n>['plural'],
): string {
  if (!profile?.profile) return '';
  const parts: string[] = [];

  const goalsCount = profile.profile.goals.length;
  if (goalsCount > 0) {
    parts.push(pluralize(copy.summaryGoals, goalsCount));
  }

  const frequency = profile.profile.trainingFrequency;
  if (frequency) {
    parts.push(
      frequency.flexibleSchedule
        ? copy.summaryFlexible
        : fill(copy.summaryDays, { min: frequency.minDays, max: frequency.maxDays }),
    );
  }

  const equipment = profile.profile.equipment;
  if (equipment.includes('full_gym')) {
    parts.push(copy.summaryFullGym);
  } else if (equipment.includes('home_equipment')) {
    parts.push(copy.summaryHomeEquipment);
  } else if (equipment.includes('bodyweight_only') || equipment.includes('no_equipment')) {
    parts.push(copy.summaryBodyweight);
  } else if (equipment.length > 0) {
    parts.push(equipmentLabels[equipment[0]] ?? equipment[0]);
  }

  return parts.join(' · ');
}

export function ProfilePage() {
  const achievementText = useCopy(achievementCopy);
  const copy = useCopy(profileCopy);
  const { user } = useAuth();
  const { language, plural } = useI18n();
  const options = useCopy(sharedCopy).onboardingOptions;
  const [profile, setProfile] = useState<MyProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  // Her streak and numbers (Phase 11). Secondary: if it can't load, the card says so
  // and the rest of the profile still works.
  const { data: progress, error: progressError, reload: reloadProgress } = useMyAchievements();
  const trainingBlocksRef = useStaggerReveal<HTMLDivElement>([profile]);
  const layoutRef = useStaggerReveal<HTMLDivElement>([profile, progress]);
  const body = useMyBodyMetrics();
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
  const initial = user?.name?.trim().charAt(0).toUpperCase() ?? '?';
  const summaryLine = buildSummaryLine(profile, copy, options.equipment, plural);

  return (
    <AppShell>
      <Section className="profile-page">
        <Container>
          <div className="profile-layout" ref={layoutRef}>
            <div className="profile-main-column">
              {!isLoading && !loadError && (
                <GlassCard
                  variant="flat"
                  className="profile-header-card"
                >
                  <div className="profile-header-banner">
                    <span className="profile-header-avatar" aria-hidden="true">
                      {initial}
                    </span>
                    <div className="profile-header-text">
                      <span className="profile-header-name display-title" dir="auto">{user?.name}</span>
                      {summaryLine && <span className="profile-header-summary">{summaryLine}</span>}
                    </div>
                  </div>

                  <div className="profile-header-footer">
                    <div className="profile-account-row">
                      <span className="text-label">{copy.email}</span>
                      <span>{user?.email}</span>
                    </div>
                  </div>
                </GlassCard>
              )}

              <GlassCard variant="flat" className="profile-section-card profile-body-card">
                <h2 className="display-title">{copy.bodyTitle}</h2>
                <BodySummary list={body.list} error={body.error} units={units} onRetry={body.reload} />
              </GlassCard>

              <GlassCard variant="flat" className="profile-section-card profile-training-card">
                <h2 className="display-title">{copy.trainingProfile}</h2>

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
              </GlassCard>
            </div>

            <div className="profile-side-column">
              <GlassCard variant="flat" className="profile-section-card profile-stats-card">
                <h2 className="display-title">{achievementText.statsTitle}</h2>

                {!progress && !progressError && (
                  <div className="profile-loading-inline">
                    <Spinner size="sm" />
                  </div>
                )}
                {!progress && progressError && (
                  <StateMessage onRetry={reloadProgress}>{progressError}</StateMessage>
                )}

                {progress && (
                  <div className="profile-progress">
                    <StreakSummary streak={progress.streak} />
                    <ProgressStats overview={progress} />
                  </div>
                )}

                <Link to={ROUTES.PROFILE_ACHIEVEMENTS} className="profile-settings-link">
                  <IconTrophy size={20} aria-hidden="true" />
                  <span>{achievementText.allTitle}</span>
                  <IconChevronRight className="flip-rtl" size={20} aria-hidden="true" />
                </Link>
                <Link to={ROUTES.SETTINGS} className="profile-settings-link">
                  <IconSettings size={20} aria-hidden="true" />
                  <span>{copy.settings}</span>
                  <IconChevronRight className="flip-rtl" size={20} aria-hidden="true" />
                </Link>
                <LogoutButton />
              </GlassCard>
            </div>
          </div>
        </Container>
      </Section>
    </AppShell>
  );
}
