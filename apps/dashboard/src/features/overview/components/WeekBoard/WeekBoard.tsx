import type { CoachBoardCell, CoachStats, CoachTraineeSummary } from '@sistem/types';
import { addDaysToDate, useCopy, useLanguage, weekdayName } from '@sistem/shared';
import { ROUTES } from '../../../../app/config/routes';
import { Avatar } from '../../../../components/common/Avatar/Avatar';
import { Icon } from '../../../../components/common/Icon/Icon';
import { RoundButton } from '../../../../components/common/RoundButton/RoundButton';
import { WidgetCard } from '../../../../components/common/WidgetCard/WidgetCard';
import { overviewCopy } from '../../copy';
import { weekdayOf } from '../../data/overviewFormat';
import './WeekBoard.css';

interface WeekBoardProps {
  stats: CoachStats;
  trainees: CoachTraineeSummary[];
  onOpen: (traineeId: string) => void;
  className?: string;
}

const DAYS = 7;
const MAX_ROWS = 6;

/**
 * The last 7 days × the trainees who had something on them: done = a pink check pill,
 * planned = a dashed pill, missed = grey. Every cell is decided by the server; a thin line
 * marks today's column.
 */
export function WeekBoard({ stats, trainees, onOpen, className }: WeekBoardProps) {
  const language = useLanguage();
  const copy = useCopy(overviewCopy);
  const dates = Array.from({ length: DAYS }, (_, index) => addDaysToDate(stats.today, index - (DAYS - 1)));
  const cellLabels: Record<CoachBoardCell, string> = { done: copy.board.done, planned: copy.board.planned, missed: copy.board.missed };

  // The most relevant: whoever has something on these days, the latest activity first.
  const rows = stats.trainees
    .flatMap((week) => {
      const trainee = trainees.find((item) => item.id === week.traineeId);
      return trainee && week.days.some((day) => day.cell) ? [{ trainee, week }] : [];
    })
    .sort((a, b) => (b.trainee.lastActivityAt ?? '').localeCompare(a.trainee.lastActivityAt ?? ''))
    .slice(0, MAX_ROWS);

  return (
    <WidgetCard
      className={className}
      title={copy.board.title}
      subtitle={copy.board.subtitle}
      action={
        <RoundButton variant="outline" label={copy.board.allTrainees} to={ROUTES.TRAINEES}>
          <Icon name="arrowOut" size="sm" flip />
        </RoundButton>
      }
    >
      {rows.length === 0 ? (
        <p className="week-board-empty">{copy.board.empty}</p>
      ) : (
        <div className="week-board-scroll">
          <table className="week-board">
            <thead>
              <tr>
                {/* table-layout: fixed reads the column widths from this first row. */}
                <td className="week-board-who" />
                {dates.map((date) => (
                  <th key={date} scope="col" className={date === stats.today ? 'week-board-day week-board-today' : 'week-board-day'}>
                    {/* Hebrew: the letter ("ד׳"), as in the design; English single letters repeat (T, S), so "Wed". */}
                    {date === stats.today ? copy.board.today : weekdayName(weekdayOf(date), language, language === 'he' ? 'narrow' : 'short')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ trainee, week }) => (
                <tr key={trainee.id}>
                  <th scope="row" className="week-board-who">
                    <button className="week-board-name" type="button" aria-haspopup="dialog" onClick={() => onOpen(trainee.id)}>
                      <Avatar name={trainee.name} seed={trainee.id} size="sm" />
                      <span className="week-board-name-text" dir="auto">
                        {trainee.name}
                      </span>
                    </button>
                  </th>
                  {dates.map((date) => {
                    const cell = week.days.find((day) => day.date === date)?.cell ?? null;
                    return (
                      <td key={date} className={date === stats.today ? 'week-board-cell week-board-cell-today' : 'week-board-cell'}>
                        {cell && (
                          <span className={`week-board-pill week-board-pill-${cell}`} title={cellLabels[cell]}>
                            {cell === 'done' && <Icon name="check" size="sm" />}
                            {cell === 'missed' && <span aria-hidden="true">—</span>}
                            <span className={cell === 'planned' ? undefined : 'visually-hidden'}>{cellLabels[cell]}</span>
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WidgetCard>
  );
}
