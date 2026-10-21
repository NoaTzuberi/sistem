import { useState } from 'react';
import type { AiNutritionRecommendation } from '@sistem/types';
import { fill, formatDateTime, formatKcal, formatNumber, formatPortionCountLtr, isolateLtr, sharedCopy, useCopy, useI18n } from '@sistem/shared';
import { Icon } from '../../../../components/common/Icon/Icon';
import { aiDraftCopy } from '../../../aiDraft/copy';
import { nutritionCopy } from '../../copy';
import './AiDraftBanner.css';

const GROUPS = ['protein', 'carb', 'fat'] as const;
/** Longer than this, the summary opens with "read more". */
const LONG_SUMMARY = 160;

interface AiDraftBannerProps {
  draft: AiNutritionRecommendation;
  /** The plan's target now, for the difference. */
  targetKcal: number | undefined;
  /** The plan's meals already came from this draft. */
  applied: boolean;
  canUndo: boolean;
  /** A new draft is being made, or cannot be made. */
  regenerateDisabled: boolean;
  onApply: () => void;
  onUndo: () => void;
  onRegenerate: () => void;
  onDismiss: () => void;
}

/** A ready AI nutrition draft, above step 1: its numbers, summary, what to check by hand, and apply — or, once applied, a quiet confirmation. */
export function AiDraftBanner({ draft, targetKcal, applied, canUndo, regenerateDisabled, onApply, onUndo, onRegenerate, onDismiss }: AiDraftBannerProps) {
  const { language, plural } = useI18n();
  const shared = useCopy(sharedCopy);
  const copy = useCopy(nutritionCopy);
  const aiCopy = useCopy(aiDraftCopy);
  const b = copy.builder;
  const [expanded, setExpanded] = useState(false);
  const output = draft.output;
  if (!output) return null;
  const freeText = draft.input?.profile?.freeText ?? [];
  const diff = targetKcal === undefined ? null : output.kcal - targetKcal;
  const isLong = output.summary.length > LONG_SUMMARY;

  if (applied) {
    return (
      <section className="nb-ai-banner" data-applied="" aria-live="polite">
        <span className="nb-ai-banner-icon" aria-hidden="true">
          <Icon name="check" />
        </span>
        <p className="nb-ai-banner-title">{b.aiApplied}</p>
        {canUndo && (
          <button className="nb-pill-button" type="button" onClick={onUndo}>
            {b.aiUndo}
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="nb-ai-banner" aria-labelledby="nb-ai-banner-title">
      <header className="nb-ai-banner-head">
        <span className="nb-ai-banner-icon" aria-hidden="true">
          <Icon name="spark" />
        </span>
        <div className="nb-ai-banner-heading">
          <h2 className="nb-ai-banner-title" id="nb-ai-banner-title">
            {b.aiReady}
          </h2>
          <p className="nb-ai-banner-meta">
            {plural(aiCopy.nutrition.meals, output.meals.length)} · {formatDateTime(draft.completedAt ?? draft.createdAt, language)}
            {draft.model && (
              <>
                {' · '}
                <bdi dir="ltr">{draft.model}</bdi>
              </>
            )}
          </p>
        </div>
        <button className="nb-ai-banner-dismiss" type="button" aria-label={b.aiDismiss} onClick={onDismiss}>
          <Icon name="close" size="sm" />
        </button>
      </header>

      <div className="nb-ai-banner-chips">
        <span className="nb-ai-banner-kcal">
          <b>
            <bdi>{formatKcal(output.kcal, language)}</bdi>
          </b>
          {diff !== null && diff !== 0 && (
            <small>{fill(b.aiKcalDiff, { diff: isolateLtr(`${diff > 0 ? '+' : '−'}${formatNumber(Math.abs(diff), language)}`) })}</small>
          )}
        </span>
        {GROUPS.map((group) => (
          <span key={group} className="nb-portion-chip" data-group={group}>
            <b>{formatPortionCountLtr(output.dailyPortions[group])}</b>
            {shared.nutrition.portionWords[group]}
          </span>
        ))}
      </div>

      <p className="nb-ai-banner-summary" data-expanded={expanded || !isLong || undefined} dir="auto">
        {output.summary}
      </p>
      {isLong && (
        <button className="nb-text-button nb-ai-banner-more" type="button" aria-expanded={expanded} onClick={() => setExpanded((open) => !open)}>
          {expanded ? b.readLess : b.readMore}
        </button>
      )}

      {freeText.length > 0 && (
        <p className="nb-ai-banner-check">
          <Icon name="alert" size="sm" />
          <span>
            {b.checkManually}{' '}
            {freeText.map((item, index) => (
              <span key={item.source}>
                {index > 0 && ' · '}
                <bdi>{item.text}</bdi>
              </span>
            ))}
          </span>
        </p>
      )}

      <div className="nb-ai-banner-actions">
        <button className="nb-ai-banner-apply" type="button" onClick={onApply}>
          {b.aiApply}
        </button>
        <button className="nb-pill-button" type="button" disabled={regenerateDisabled} onClick={onRegenerate}>
          {aiCopy.training.regenerate}
        </button>
      </div>
    </section>
  );
}
