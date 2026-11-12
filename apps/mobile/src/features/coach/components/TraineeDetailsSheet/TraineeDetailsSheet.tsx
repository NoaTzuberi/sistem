import { type ReactNode, useId } from 'react';
import type { CoachTraineeDetail } from '@sistem/types';
import {
  IconBandage,
  IconBarbell,
  IconCake,
  IconCalendarEvent,
  IconCalendarWeek,
  IconChevronRight,
  IconCopy,
  IconMail,
  IconRuler2,
  IconSalad,
  IconScale,
  IconStairsUp,
  IconTag,
  IconTarget,
} from '@tabler/icons-react';
import { fill, sharedCopy, traineeStatusLabel, useCopy, useLanguage } from '@sistem/shared';
import { BottomSheet } from '../../../../components/common/BottomSheet/BottomSheet';
import { coachCopy } from '../../copy';
import { type DetailRow, coachingRows, formatCoachingDate, goalRows, personalRows } from '../../data/traineeDetails';
import type { TraineeDetailsSheetState } from '../../hooks/useTraineeDetailsSheet';
import { CoachAvatar } from '../CoachAvatar/CoachAvatar';
import './TraineeDetailsSheet.css';

const ICON_SIZE = 18;

const ROW_ICONS: Record<DetailRow['id'], ReactNode> = {
  age: <IconCake size={ICON_SIZE} />,
  height: <IconRuler2 size={ICON_SIZE} />,
  startWeight: <IconScale size={ICON_SIZE} />,
  goal: <IconTarget size={ICON_SIZE} />,
  days: <IconCalendarWeek size={ICON_SIZE} />,
  experience: <IconStairsUp size={ICON_SIZE} />,
  limitations: <IconBandage size={ICON_SIZE} />,
  nutrition: <IconSalad size={ICON_SIZE} />,
  coachingStart: <IconCalendarEvent size={ICON_SIZE} />,
  discipline: <IconTag size={ICON_SIZE} />,
  plan: <IconBarbell size={ICON_SIZE} />,
};

interface TraineeDetailsSheetProps {
  trainee: CoachTraineeDetail;
  /** Today in her zone ('YYYY-MM-DD') — her age. */
  today: string;
  sheet: TraineeDetailsSheetState;
  /** "לשאלון המלא": her page opens the questionnaire (Body tab). */
  onOpenQuestionnaire: () => void;
  /** "סיום ליווי": the existing confirm sheet. */
  onEndCoaching: () => void;
}

/** Her personal details, goals and coaching in one read-only sheet; "סיום ליווי" at the bottom, set apart. */
export function TraineeDetailsSheet({ trainee, today, sheet, onOpenQuestionnaire, onEndCoaching }: TraineeDetailsSheetProps) {
  const copy = useCopy(coachCopy).details;
  const shared = useCopy(sharedCopy);
  const language = useLanguage();
  const titleId = useId();
  const personal = personalRows(trainee, today, copy, language);
  const goals = goalRows(trainee, copy, language);

  return (
    <BottomSheet isOpen={sheet.isOpen} onClose={sheet.close} labelledBy={titleId} className="ch-sheet tds-sheet">
      <header className="tds-head">
        <CoachAvatar name={trainee.name} seed={trainee.id} photoUrl={trainee.avatar?.url} size="sheet" />
        <h2 className="tds-name display-title" id={titleId}>
          <bdi>{trainee.name}</bdi>
        </h2>
        <span className={`tds-status tds-status-${trainee.status}`}>
          <span className="tds-status-dot" aria-hidden="true" />
          {traineeStatusLabel(trainee.status, language)}
        </span>
        <p className="tds-since">{fill(copy.traineeSince, { date: formatCoachingDate(trainee.coachingStartedAt, trainee.timezone, language) })}</p>
      </header>

      <DetailsGroup title={copy.personal}>
        <li className="tds-row">
          <a className="tds-row-main tds-row-link" href={`mailto:${trainee.email}`} aria-label={`${copy.sendEmail}: ${trainee.email}`}>
            <span className="tds-tile" aria-hidden="true">
              <IconMail size={ICON_SIZE} />
            </span>
            <span className="tds-row-text">
              <span className="tds-row-label">{copy.email}</span>
              <span className="tds-row-value" dir="ltr">
                {trainee.email}
              </span>
            </span>
          </a>
          <button type="button" className="tds-row-action" aria-label={copy.copyEmail} onClick={() => void sheet.copyEmail(trainee.email)}>
            <IconCopy size={ICON_SIZE} aria-hidden="true" />
          </button>
        </li>
        {personal.map((row) => (
          <DetailsRow key={row.id} row={row} />
        ))}
      </DetailsGroup>

      {trainee.onboarding && (
        <DetailsGroup title={copy.goalsTitle}>
          {goals.map((row) => (
            <DetailsRow key={row.id} row={row} />
          ))}
          <li className="tds-row">
            <button
              type="button"
              className="tds-row-main tds-row-link tds-row-more"
              onClick={() => {
                sheet.close();
                onOpenQuestionnaire();
              }}
            >
              <span className="tds-row-label">{copy.fullQuestionnaire}</span>
              <IconChevronRight className="flip-rtl tds-row-chevron" size={ICON_SIZE} aria-hidden="true" />
            </button>
          </li>
        </DetailsGroup>
      )}

      <DetailsGroup title={copy.coachingTitle}>
        {coachingRows(trainee, copy, language).map((row) => (
          <DetailsRow key={row.id} row={row} />
        ))}
      </DetailsGroup>

      <div className="tds-end">
        <button
          type="button"
          className="tds-end-button"
          onClick={() => {
            sheet.close();
            onEndCoaching();
          }}
        >
          {shared.coach.endCoaching.action}
        </button>
      </div>
    </BottomSheet>
  );
}

function DetailsGroup({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className="tds-group" aria-labelledby={id}>
      <h3 className="tds-group-title" id={id}>
        {title}
      </h3>
      <ul className="tds-list">{children}</ul>
    </section>
  );
}

function DetailsRow({ row }: { row: DetailRow }) {
  return (
    <li className="tds-row">
      <div className="tds-row-main">
        <span className="tds-tile" aria-hidden="true">
          {ROW_ICONS[row.id]}
        </span>
        <span className="tds-row-text">
          <span className="tds-row-label">{row.label}</span>
          {/* Her own words and the coach's discipline keep their direction. */}
          <span className="tds-row-value" dir="auto">
            {row.value}
          </span>
          {row.sub && <span className="tds-row-sub">{row.sub}</span>}
        </span>
      </div>
    </li>
  );
}
