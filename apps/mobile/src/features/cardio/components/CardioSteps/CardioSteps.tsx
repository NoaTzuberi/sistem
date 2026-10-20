import type { CardioBlock, CardioMetric, CardioStep } from '@sistem/types';
import { cardioKindLabel, cardioTip, describeCardioTarget, formatClock, formatPlural, intensityZone, useCopy, useLanguage } from '@sistem/shared';
import { Eyebrow } from '../../../../components/common/Eyebrow/Eyebrow';
import { cardioCopy } from '../../copy';
import './CardioSteps.css';

interface CardioStepsProps {
  steps: CardioStep[];
  metric: CardioMetric;
}

/** The session's structure: each block with its zone bar, name, target and tip, and time; repeat sets in a soft box. */
export function CardioSteps({ steps, metric }: CardioStepsProps) {
  const copy = useCopy(cardioCopy);
  const language = useLanguage();

  function row(block: CardioBlock) {
    const target = describeCardioTarget(block.intensity, metric, language);
    const tip = cardioTip(block.kind, language);
    return (
      <li key={block.id} className="cp-step cp-zone" data-zone={intensityZone(block.intensity)}>
        <i className="cp-step-bar" aria-hidden="true" />
        <div className="cp-step-text">
          <b className="cp-step-name">{cardioKindLabel(block.kind, language)}</b>
          <small className="cp-step-target">
            {target.label} <bdi dir="ltr">{target.value}</bdi>
            {tip && ` · ${tip}`}
          </small>
        </div>
        <span className="cp-step-time">
          <bdi dir="ltr">{formatClock(block.durationSec)}</bdi>
        </span>
      </li>
    );
  }

  return (
    <section className="cp-steps" aria-labelledby="cp-steps-title">
      <h2 className="cp-steps-title" id="cp-steps-title">
        <Eyebrow>{copy.eyebrowSteps}</Eyebrow>
        {copy.steps}
      </h2>
      <ul className="cp-steps-list">
        {steps.map((step) =>
          step.type === 'repeat' ? (
            <li key={step.id} className="cp-repeat">
              <p className="cp-repeat-head">{formatPlural(language, copy.roundsBox, step.times)}</p>
              <ul className="cp-steps-list">{step.blocks.map(row)}</ul>
            </li>
          ) : (
            row(step)
          ),
        )}
      </ul>
    </section>
  );
}
