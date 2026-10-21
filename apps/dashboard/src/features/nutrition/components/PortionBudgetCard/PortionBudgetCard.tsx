import type { CSSProperties } from 'react';
import type { Language } from '@sistem/types';
import { describePortion, fill, formatNumber, formatPortionCount, formatPortionCountLtr, isolateLtr, sharedCopy, useCopy, useLanguage } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { nutritionCopy } from '../../copy';
import type { BudgetLine, PortionBudget } from '../../hooks/usePortionBudget';
import './PortionBudgetCard.css';

const SIZE = 84;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;

/** "2 protein portions, 1½ carb portions" — what is missing (or over), in the shared portion wording. */
function describeLines(lines: BudgetLine[], language: Language): string {
  return lines.map((line) => isolateLtr(describePortion(line.group, Math.abs(line.diff), language))).join(', ');
}

/** The live budget: the day's kcal (given to meals, or the daily portions in portions mode) against the target, what is missing or over, and each group. */
export function PortionBudgetCard({ budget, title, isDaily }: { budget: PortionBudget; title: string; isDaily: boolean }) {
  const language = useLanguage();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(nutritionCopy);
  const b = copy.builder;
  const fill01 = Math.max(0, Math.min(1, budget.fraction));
  const missing = budget.lines.filter((line) => line.state === 'missing');
  const over = budget.lines.filter((line) => line.state === 'over');
  const hasTarget = budget.targetKcal !== null;

  return (
    <section className="nb-side-card nb-budget" aria-labelledby="nb-budget-title" aria-live="polite">
      <h3 className="nb-side-title" id="nb-budget-title">
        {title}
      </h3>
      <div className="nb-budget-top">
        <span className="nb-budget-ring">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
            <circle className="nb-budget-track" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} />
            {fill01 > 0 && (
              <circle
                className="nb-budget-value"
                data-over={budget.fraction > 1 || undefined}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                pathLength={100}
                strokeDasharray={`${(fill01 * 100).toFixed(1)} 100`}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              />
            )}
          </svg>
          <b className="nb-budget-pct">{hasTarget ? isolateLtr(`${formatNumber(Math.round(budget.fraction * 100), language)}%`) : '—'}</b>
        </span>
        <p className="nb-budget-text">
          {hasTarget ? (
            fill(isDaily ? b.budgetDaily : b.budgetAllocated, { amount: isolateLtr(`${formatNumber(budget.allocatedKcal, language)} / ${formatNumber(budget.targetKcal ?? 0, language)}`) })
          ) : (
            b.budgetNoTarget
          )}
        </p>
      </div>

      {budget.state === 'pending' && <p className="nb-note">{b.budgetPending}</p>}
      {budget.state === 'missing' && (
        <p className="nb-budget-alert" data-tone="missing">
          <Icon name="alert" size="sm" />
          {fill(b.budgetMissing, { list: describeLines(missing, language) })}
          {over.length > 0 && ` · ${fill(b.budgetOver, { list: describeLines(over, language) })}`}
        </p>
      )}
      {budget.state === 'over' && (
        <p className="nb-budget-alert" data-tone="over">
          <Icon name="alert" size="sm" />
          {fill(b.budgetOver, { list: describeLines(over, language) })}
        </p>
      )}
      {budget.state === 'exact' && (
        <p className="nb-budget-alert" data-tone="exact">
          <Icon name="check" size="sm" />
          {isDaily ? b.budgetDailyExact : b.budgetExact}
        </p>
      )}

      {(budget.state === 'missing' || budget.state === 'over' || budget.state === 'exact') && (
        <ul className="nb-budget-lines">
          {budget.lines.map((line) => {
            const share = line.target > 0 ? Math.min(1, line.allocated / line.target) : line.allocated > 0 ? 1 : 0;
            return (
              <li key={line.group} className="nb-budget-line" data-group={line.group}>
                <span className="nb-budget-line-top">
                  <span className="nb-budget-dot" aria-hidden="true" />
                  <span className="nb-budget-name">{shared.nutrition.groups[line.group]}</span>
                  <b className="nb-budget-count">{isolateLtr(`${formatPortionCount(line.allocated)} / ${formatPortionCount(line.target)}`)}</b>
                  <em className="nb-budget-state" data-state={line.state}>
                    {line.state === 'missing' ? b.statusMissing : line.state === 'over' ? b.statusOver : '✓'}
                  </em>
                </span>
                {/* A computed value: how full the group's bar is. */}
                <span className="nb-budget-bar" data-over={line.state === 'over' || undefined} style={{ '--nb-share': `${share * 100}%` } as CSSProperties}>
                  <span className="nb-budget-fill" />
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <p className="nb-budget-snack">
        <span>{shared.nutrition.groups.snack}</span>
        <b>
          <bdi>{`${formatPortionCountLtr(budget.snack.portions)} · ${formatNumber(budget.snack.kcal, language)} ${shared.units.kcal}`}</bdi>
        </b>
      </p>
    </section>
  );
}
