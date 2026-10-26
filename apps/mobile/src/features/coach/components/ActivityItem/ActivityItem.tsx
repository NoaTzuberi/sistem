import { type ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconBarbell, IconCamera, IconPlus, IconRuler2, IconRun, IconTrophy } from '@tabler/icons-react';
import type { CoachActivityTrainee } from '@sistem/types';
import { useCopy } from '@sistem/shared';
import { coachTraineePath } from '../../../../app/config/routes';
import { coachCopy } from '../../copy';
import type { ActivityChip, ActivityKind } from '../../data/activityDisplay';
import type { TraineeTab } from '../../data/traineeTabs';
import { CoachAvatar } from '../CoachAvatar/CoachAvatar';
import { NameInSentence } from '../NameInSentence/NameInSentence';
import './ActivityItem.css';

const TYPE_ICONS: Record<ActivityKind, ReactNode> = {
  workout: <IconBarbell size={11} stroke={2.4} />,
  cardio: <IconRun size={11} stroke={2.4} />,
  photo: <IconCamera size={11} stroke={2.4} />,
  measurements: <IconRuler2 size={11} stroke={2.4} />,
  joined: <IconPlus size={11} stroke={2.6} />,
};

interface ActivityItemProps {
  trainee: CoachActivityTrainee;
  /** null = no type badge (the attention card). */
  kind: ActivityKind | null;
  sentence: string;
  time: string;
  /** ISO, for <time>. */
  at?: string;
  chips?: ActivityChip[];
  photos?: string[];
  tab: TraineeTab;
  /** The amber attention card. */
  alert?: boolean;
  /** A link button under the line (e.g. "צפייה בשאלון"). */
  cta?: { label: string; tab: TraineeTab };
}

/** One feed card: her avatar + type badge, the line (a link to her screen), the time, chips and blurred photos. */
export function ActivityItem({ trainee, kind, sentence, time, at, chips = [], photos = [], tab, alert = false, cta }: ActivityItemProps) {
  const copy = useCopy(coachCopy);
  const [brokenPhotos, setBrokenPhotos] = useState<string[]>([]);
  const visiblePhotos = photos.filter((url) => !brokenPhotos.includes(url)).slice(0, 3);

  return (
    <article className={'activity-item' + (alert ? ' activity-item-alert' : '')}>
      <span className="activity-item-avatar">
        <CoachAvatar name={trainee.name} seed={trainee.id} photoUrl={trainee.avatar?.url} />
        {kind && (
          <span className={`activity-item-type activity-item-type-${kind}`} role="img" aria-label={copy.feed.types[kind]}>
            {TYPE_ICONS[kind]}
          </span>
        )}
      </span>
      <div className="activity-item-body">
        <Link className="activity-item-line" to={coachTraineePath(trainee.id, tab === 'overview' ? null : tab)}>
          <NameInSentence sentence={sentence} name={trainee.name} />
        </Link>
        <time className="activity-item-time" dateTime={at}>
          {time}
        </time>
        {chips.length > 0 && (
          <ul className="activity-item-chips">
            {chips.map((chip) => (
              <li key={chip.id} className={'activity-item-chip' + (chip.record ? ' activity-item-chip-record' : '')}>
                {chip.record && <IconTrophy size={12} aria-hidden="true" />}
                <bdi>{chip.text}</bdi>
              </li>
            ))}
          </ul>
        )}
        {visiblePhotos.length > 0 && (
          // Blurred on purpose: the photos open only on her screen (signed links, private).
          <div className="activity-item-photos" role="img" aria-label={copy.feed.photosPrivate}>
            {visiblePhotos.map((url) => (
              <span key={url} className="activity-item-photo">
                <img src={url} alt="" loading="lazy" decoding="async" onError={() => setBrokenPhotos((list) => [...list, url])} />
              </span>
            ))}
          </div>
        )}
        {cta && (
          <div className="activity-item-actions">
            <Link className="activity-item-cta" to={coachTraineePath(trainee.id, cta.tab)}>
              {cta.label}
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
