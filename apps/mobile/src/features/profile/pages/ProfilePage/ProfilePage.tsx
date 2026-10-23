import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { directionOf, getActiveLanguage, poseLabel, useCopy, useI18n } from '@sistem/shared';
import { IconLock } from '@tabler/icons-react';
import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { Toast } from '../../../../components/common/Toast/Toast';
import { useToast } from '../../../../hooks/useToast';
import { ROUTES } from '../../../../app/config/routes';
import { SegmentedTabs } from '../../../workouts/components/SegmentedTabs/SegmentedTabs';
import { achievementCopy } from '../../../achievements/copy';
import { bodyCopy } from '../../../bodyTracking/copy';
import { ProfileHero } from '../../components/ProfileHero/ProfileHero';
import { useMyCommunities } from '../../hooks/useMyCommunities';
import { WeightCard } from '../../components/WeightCard/WeightCard';
import { MeasurementList } from '../../components/MeasurementList/MeasurementList';
import { MeasurementSheet } from '../../components/MeasurementSheet/MeasurementSheet';
import { PhotoCompareFrame } from '../../components/PhotoCompareFrame/PhotoCompareFrame';
import { PhotoGrid } from '../../components/PhotoGrid/PhotoGrid';
import { AchievementsTab } from '../../../achievements/components/AchievementsTab/AchievementsTab';
import { CoachCard } from '../../components/CoachCard/CoachCard';
import { JoinCoachRow } from '../../components/JoinCoachRow/JoinCoachRow';
import { useActiveCoachings } from '../../../../hooks/useActiveCoachings';
import { initialsOf } from '../../data/profileDisplay';
import { ProfileSettings } from '../../components/ProfileSettings/ProfileSettings';
import { ProfilePhotoSheet } from '../../components/ProfilePhotoSheet/ProfilePhotoSheet';
import { useAvatarUpload } from '../../hooks/useAvatarUpload';
import { memberWeek } from '../../data/profileDisplay';
import { useProfile } from '../../hooks/useProfile';
import { useProfileTab } from '../../hooks/useProfileTab';
import type { ProfileTab } from '../../hooks/useProfileTab';
import { useMeasurements } from '../../hooks/useMeasurements';
import { usePhotoCompare, useProfilePhotos } from '../../hooks/usePhotoCompare';
import type { ProfilePhoto } from '../../hooks/usePhotoCompare';
import { useMyUnits } from '../../hooks/useMyBody';
import { profileCopy } from '../../copy';
import './ProfilePage.css';

const panelId = (tab: ProfileTab) => `pf-panel-${tab}`;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Scrolls a section into view and moves focus to it (the header's settings button, the coach chip). */
function jumpTo(element: HTMLElement | null) {
  if (!element) return;
  element.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  element.focus({ preventScroll: true });
}

/**
 * Profile (PRD §5.5, docs/design/trainee-profile.html): who she is + her numbers, then three tabs —
 * Body (weight + measurements), Photos (before / after + every photo), Achievements (the hero, the
 * filter, every badge by category + its modal) — her coach and the settings. The tab lives in the URL (?tab=).
 */
export function ProfilePage() {
  const navigate = useNavigate();
  const copy = useCopy(profileCopy);
  const achievementText = useCopy(achievementCopy);
  const bodyText = useCopy(bodyCopy);
  const { language, plural } = useI18n();
  const rtl = directionOf(language) === 'rtl';
  const profile = useProfile();
  const communities = useMyCommunities();
  const { units } = useMyUnits();
  const { tab, selectTab } = useProfileTab();
  const body = useMeasurements(units, profile.today);
  const timezone = profile.user?.timezone ?? 'UTC';
  const photos = useProfilePhotos(body.list?.items, timezone, copy.photosLoadError);
  const compare = usePhotoCompare(photos.photos, rtl);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const avatar = useAvatarUpload();
  const { toastMessage, showToast } = useToast();
  // Her current coaching's card (photo, status, payment links) — the server sends only her own.
  const { coachings } = useActiveCoachings(profile.user?.coachingStatus != null);
  const coaching = coachings[0] ?? null;
  const coachRef = useRef<HTMLElement>(null);
  const settingsRef = useRef<HTMLHeadingElement>(null);

  const weekOf = (date: string) => (profile.joinDate ? memberWeek(profile.joinDate, date) : 1);
  const describePhoto = (photo: ProfilePhoto) =>
    photo.kind === 'starting' ? copy.startingPhoto : photo.kind === 'pump' ? copy.pumpPhoto : poseLabel(photo.pose ?? 'front', language);
  const refreshPhotos = () => {
    body.reload();
    photos.reloadLogs();
  };

  // The sheet is closed by now: the avatar shows a spinner, then the new photo — or a toast and the old one.
  function saveAvatar(photo: Blob) {
    const text = profileCopy[getActiveLanguage()].photoSheet;
    avatar.save(photo).then(
      () => showToast(text.saved),
      () => showToast(text.saveError),
    );
  }

  function removeAvatar() {
    const text = profileCopy[getActiveLanguage()].photoSheet;
    avatar.remove().then(
      () => showToast(text.removed),
      () => showToast(text.removeError),
    );
  }

  const tabs = [
    { id: 'body' as const, label: copy.tabs.body },
    { id: 'photos' as const, label: copy.tabs.photos },
    { id: 'achievements' as const, label: copy.tabs.achievements },
  ];

  const overview = profile.overview;

  return (
    <AppShell bleed>
      <div className="pf-screen">
        <ProfileHero
          name={profile.name}
          initials={profile.initials}
          joinDate={profile.joinDate}
          coach={profile.coach}
          communities={communities}
          overview={overview}
          avatarUrl={avatar.avatarUrl}
          isUploading={avatar.isUploading}
          onAvatarExpired={avatar.refreshExpired}
          onOpenPhoto={() => setPhotoSheetOpen(true)}
          onOpenSettings={() => jumpTo(settingsRef.current)}
          onOpenCoach={() => jumpTo(coachRef.current)}
        />

        <div className="pf-tabs-bar">
          <SegmentedTabs className="pf-tabs" tabs={tabs} selected={tab} onSelect={selectTab} label={copy.tabsLabel} panelId={panelId} />
        </div>

        <div className="pf-body">
          <section className="pf-panel" id={panelId(tab)} role="tabpanel" aria-labelledby={`tab-${tab}`}>
            {tab === 'body' &&
              (!body.list ? (
                <StateMessage onRetry={body.error ? body.reload : undefined}>{body.error ?? bodyText.loading}</StateMessage>
              ) : (
                <>
                  <WeightCard
                    weight={body.weight}
                    unit={units.weight}
                    range={body.range}
                    onRangeChange={body.setRange}
                    joinDate={profile.joinDate}
                    onUpdate={() => setSheetOpen(true)}
                  />
                  <MeasurementList rows={body.measurements} unit={units.length} />
                </>
              ))}

            {tab === 'photos' &&
              (!photos.isReady ? (
                <StateMessage onRetry={body.error ? body.reload : undefined}>{body.error ?? bodyText.loading}</StateMessage>
              ) : (
                <>
                  {compare.canCompare ? (
                    <PhotoCompareFrame compare={compare} weekOf={weekOf} onLinkExpired={refreshPhotos} describe={describePhoto} />
                  ) : (
                    <p className="pf-empty">{photos.photos.length === 0 ? copy.noPhotos : copy.compareNeedsTwo}</p>
                  )}
                  <p className="pf-lock">
                    <IconLock size={13} aria-hidden="true" />
                    {copy.privacy}
                  </p>
                  <div className="pf-section-head">
                    <h2 className="pf-section-title">
                      <Eyebrow>{copy.eyebrow.progress}</Eyebrow>
                      {copy.allPhotos}
                    </h2>
                    <span className="pf-section-note">
                      {plural(copy.photoCount, photos.photos.length)}
                      <Link className="pf-section-link" to={ROUTES.PROFILE_PHOTOS}>
                        {copy.editPhotos}
                      </Link>
                    </span>
                  </div>
                  <PhotoGrid
                    photos={photos.photos}
                    selectedKey={compare.canCompare ? (compare.after?.key ?? null) : null}
                    onSelect={compare.choose}
                    weekOf={weekOf}
                    describe={describePhoto}
                    onLinkExpired={refreshPhotos}
                  />
                </>
              ))}

            {tab === 'achievements' &&
              (!overview ? (
                <StateMessage onRetry={profile.achievementsError ? profile.reloadAchievements : undefined}>
                  {profile.achievementsError ?? achievementText.loading}
                </StateMessage>
              ) : (
                <AchievementsTab overview={overview} />
              ))}
          </section>

          {/* Self-guided: "Join a coach" in place of the coach card. */}
          {profile.user?.coachingStatus == null ? (
            <JoinCoachRow onOpen={() => navigate(ROUTES.JOIN_COACH_CODE)} />
          ) : (
            (coaching || profile.coach) && (
              <CoachCard
                ref={coachRef}
                coach={coaching ? { name: coaching.coachName, initials: initialsOf(coaching.coachName) } : profile.coach!}
                avatar={coaching?.coachAvatar ?? null}
                status={coaching?.status ?? null}
                payment={coaching?.payment ?? null}
                onToast={showToast}
              />
            )
          )}
          <ProfileSettings ref={settingsRef} />
        </div>

        <MeasurementSheet
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          units={units}
          measurementIds={body.measurementIds}
          lastValues={body.lastValues}
          onSave={body.saveEntry}
          onSaved={() => showToast(copy.saved)}
        />
        <ProfilePhotoSheet
          isOpen={photoSheetOpen}
          onClose={() => setPhotoSheetOpen(false)}
          hasPhoto={avatar.hasAvatar}
          onSave={saveAvatar}
          onRemove={removeAvatar}
        />
        <Toast message={toastMessage} />
      </div>
    </AppShell>
  );
}
