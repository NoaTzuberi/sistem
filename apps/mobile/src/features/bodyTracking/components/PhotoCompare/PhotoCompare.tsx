import type { BodyMetric, WeightUnit } from '@sistem/types';
import { IconChevronDown, IconColumns2, IconPlus } from '@tabler/icons-react';
import { directionOf, fill, formatDateOnly, formatDateShort, formatPlural, formatWeight, poseLabel, PROGRESS_PHOTO_POSES, useCopy, useLanguage } from '@sistem/shared';
import { PrivatePhoto } from '../../../../components/common/PrivatePhoto/PrivatePhoto';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { SegmentedControl } from '../../../profile/components/SegmentedControl/SegmentedControl';
import { PhotoCompareFrame } from '../../../profile/components/PhotoCompareFrame/PhotoCompareFrame';
import { usePhotoCompare } from '../../../profile/hooks/usePhotoCompare';
import type { ProfilePhoto } from '../../../profile/hooks/usePhotoCompare';
import { usePhotoComparison } from '../../hooks/usePhotoComparison';
import type { CompareMode } from '../../hooks/usePhotoComparison';
import { bodyCopy } from '../../copy';
import './PhotoCompare.css';

interface PhotoCompareProps {
  metrics: BodyMetric[];
  weightUnit: WeightUnit;
  onLinkExpired: () => void;
  /** Her own screen: the empty state offers "הוספת תמונה" (the coach's read-only view passes nothing). */
  onAdd?: () => void;
}

/**
 * One pose on two days (direction B): pose chips, the two days as soft pills, the days between them, and the
 * photos side by side or in the slider (the Profile's before / after frame). Photos are signed links only.
 */
export function PhotoCompare({ metrics, weightUnit, onLinkExpired, onAdd }: PhotoCompareProps) {
  const language = useLanguage();
  const copy = useCopy(bodyCopy);
  const compare = usePhotoComparison(metrics);
  const { before, after } = compare;
  const options = compare.dates.map((date) => ({ value: date, label: formatDateShort(date, language) }));
  const toFrame = (side: typeof before): ProfilePhoto[] =>
    side.photo ? [{ key: `pose:${side.date}:${compare.pose}`, date: side.date, kind: 'pose', pose: compare.pose, photo: side.photo }] : [];
  const slider = usePhotoCompare([...toFrame(before), ...toFrame(after)], directionOf(language) === 'rtl');
  const alt = (date: string) => fill(copy.photoAlt, { pose: poseLabel(compare.pose, language), date: formatDateOnly(date, language) });

  function datePill(label: string, side: typeof before, onChange: (date: string) => void) {
    return (
      <label className="pc-date">
        <span className="pc-date-text">{fill(copy.compareDate, { side: label, date: formatDateShort(side.date, language) })}</span>
        <IconChevronDown size={16} aria-hidden="true" />
        {/* The native list opens the phone's picker; the pill shows the choice. */}
        <select className="pc-date-select" aria-label={label} value={side.date} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  function sidePhoto(label: string, side: typeof before) {
    return (
      <div className="pc-photo">
        {side.photo && (
          <PrivatePhoto
            photo={side.photo}
            thumbnail
            alt={alt(side.date)}
            openLabel={fill(copy.openPhoto, { pose: poseLabel(compare.pose, language) })}
            closeLabel={copy.close}
            onLinkExpired={onLinkExpired}
          />
        )}
        <span className="pc-tag pc-tag-side">{label}</span>
        {side.metric?.weight !== undefined && <span className="pc-tag pc-tag-weight">{formatWeight(side.metric.weight, weightUnit, language)}</span>}
      </div>
    );
  }

  return (
    <div className="pc">
      <div className="pc-chips" role="group" aria-label={copy.comparePose}>
        {PROGRESS_PHOTO_POSES.map((option) => (
          <button
            key={option}
            type="button"
            className={option === compare.pose ? 'pc-chip pc-chip-selected' : 'pc-chip'}
            aria-pressed={option === compare.pose}
            onClick={() => compare.changePose(option)}
          >
            {poseLabel(option, language)}
          </button>
        ))}
      </div>

      {!compare.canCompare ? (
        <div className="pc-empty">
          <span className="pc-empty-icon" aria-hidden="true">
            <IconColumns2 size={26} />
          </span>
          <p className="pc-empty-text">{copy.compareEmpty}</p>
          {onAdd && (
            <PillButton className="pc-empty-add" icon={<IconPlus size={16} stroke={2.6} />} onClick={onAdd}>
              {copy.compareAdd}
            </PillButton>
          )}
        </div>
      ) : (
        <>
          <div className="pc-dates">
            {datePill(copy.before, before, compare.setBefore)}
            {datePill(copy.after, after, compare.setAfter)}
          </div>
          <div className="pc-meta">
            <span className="pc-days">{formatPlural(language, copy.compareDays, compare.daysBetween)}</span>
          </div>
          <SegmentedControl<CompareMode>
            block
            label={copy.compareMode}
            options={[
              { value: 'side', label: copy.compareSide },
              { value: 'slide', label: copy.compareSlide },
            ]}
            value={compare.mode}
            onChange={compare.setMode}
          />
          {compare.mode === 'side' ? (
            <div className="pc-pair">
              {sidePhoto(copy.before, before)}
              {sidePhoto(copy.after, after)}
            </div>
          ) : (
            <div className="pc-frame">
              <PhotoCompareFrame
                compare={slider}
                weekOf={() => 1}
                onLinkExpired={onLinkExpired}
                describe={() => poseLabel(compare.pose, language)}
                labels={{ before: copy.before, after: copy.after }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
