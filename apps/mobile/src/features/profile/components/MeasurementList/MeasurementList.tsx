import { Link } from 'react-router-dom';
import type { LengthUnit } from '@sistem/types';
import { fill, measurementLabel, roundOneDecimal, unitLabel, useCopy, useI18n } from '@sistem/shared';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { measurementsPath } from '../../../../app/config/routes';
import { buildMiniChart, measurementTone } from '../../data/profileDisplay';
import type { MeasurementRow } from '../../hooks/useMeasurements';
import { profileCopy } from '../../copy';
import '../../measurementTones.css';
import './MeasurementList.css';

const SPARK = { width: 64, height: 26 };

interface MeasurementListProps {
  rows: MeasurementRow[];
  unit: LengthUnit;
}

/** A change since the start: down = Cherry, up = purple — identity colors, never good / bad. */
function Change({ value }: { value: number | null }) {
  const copy = useCopy(profileCopy);
  if (value === null) return null;
  const rounded = roundOneDecimal(value);
  const tone = rounded < 0 ? ' pf-measure-change-down' : rounded > 0 ? ' pf-measure-change-up' : '';
  const text = rounded === 0 ? '0' : `${rounded > 0 ? '+' : '−'}${Math.abs(rounded)}`;
  return (
    <span className={'pf-measure-change' + tone}>
      <span className="pf-sr-only">{copy.measurementChange} </span>
      <bdi dir="ltr">{text}</bdi>
    </span>
  );
}

/** "היקפים": one row per measurement she has logged — color bar, name, count, sparkline, value, change. */
export function MeasurementList({ rows, unit }: MeasurementListProps) {
  const copy = useCopy(profileCopy);
  const { language, plural } = useI18n();

  return (
    <section className="pf-measures" aria-labelledby="pf-measures-title">
      <div className="pf-section-head">
        <h2 className="pf-section-title" id="pf-measures-title">
          <Eyebrow>{copy.eyebrow.measurements}</Eyebrow>
          {copy.measurementsTitle}
        </h2>
        <span className="pf-section-note">{fill(copy.measurementsNote, { unit: unitLabel(unit, language) })}</span>
      </div>

      {rows.length === 0 ? (
        <p className="pf-empty">{copy.noMeasurements}</p>
      ) : (
        <ul className="pf-measure-list">
          {rows.map((row) => {
            const spark = buildMiniChart(row.points, SPARK);
            return (
              <li key={row.id}>
                <Link to={measurementsPath(row.id)} className={`pf-measure ${measurementTone(row.id)}`}>
                  <span className="pf-measure-bar" aria-hidden="true" />
                  <span className="pf-measure-text">
                    <span className="pf-measure-name">{measurementLabel(row.id, language)}</span>
                    <span className="pf-measure-count">{plural(copy.measurementCount, row.points.length)}</span>
                  </span>
                  {spark && (
                    <svg className="pf-measure-spark" direction="ltr" viewBox={`0 0 ${SPARK.width} ${SPARK.height}`} aria-hidden="true">
                      <path d={spark.line} />
                      <circle cx={spark.last.x * SPARK.width} cy={spark.last.y * SPARK.height} r="3" />
                    </svg>
                  )}
                  <span className="pf-measure-value">
                    <span className="pf-measure-current">
                      <bdi dir="ltr">{roundOneDecimal(row.current)}</bdi>
                      <span className="pf-sr-only"> {unitLabel(unit, language)}</span>
                    </span>
                    <Change value={row.change} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
