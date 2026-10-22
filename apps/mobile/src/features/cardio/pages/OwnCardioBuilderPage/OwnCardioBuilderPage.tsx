import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IconPlus, IconRepeat } from '@tabler/icons-react';
import { cardioSportLabel, cardioTimeline, cardioTotals, fill, useCopy, useI18n } from '@sistem/shared';
import { ROUTES } from '../../../../app/config/routes';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { SubScreenHeader } from '../../../profile/components/SubScreenHeader/SubScreenHeader';
import { CardioGraph } from '../../components/CardioGraph/CardioGraph';
import { OwnCardioBlockEditor } from '../../components/OwnCardioBlockEditor/OwnCardioBlockEditor';
import { SgStepper } from '../../components/SgStepper/SgStepper';
import { cardioCopy } from '../../copy';
import { CARDIO_SPORTS, MAX_TIMES, MAX_TITLE_LENGTH, MIN_TIMES } from '../../data/ownCardioDraft';
import { useOwnCardioBuilder } from '../../hooks/useOwnCardioBuilder';
import '../../cardioZones.css';
import './OwnCardioBuilderPage.css';

/**
 * "Build a run" (self-guided): a simplified version of the coach's cardio builder — the type, blocks
 * and repeat sets, with the shape drawn live. Saved as HER workout (no coach, no plan); the same player runs it.
 */
export function OwnCardioBuilderPage() {
  const { id = null } = useParams();
  const copy = useCopy(cardioCopy);
  const { language } = useI18n();
  const builder = useOwnCardioBuilder(id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const frames = useMemo(() => cardioTimeline(builder.steps), [builder.steps]);
  const totals = useMemo(() => cardioTotals(builder.steps), [builder.steps]);
  const canRemoveTopBlock = builder.steps.length > 1;

  return (
    <main className="sg-builder">
      <SubScreenHeader title={id ? copy.builder.titleEdit : copy.builder.titleNew} fallbackPath={ROUTES.WORKOUTS} />
      {builder.isLoading ? (
        <StateMessage>{copy.loading}</StateMessage>
      ) : (
        <form
          className="sg-builder-form"
          onSubmit={(event) => {
            event.preventDefault();
            void builder.save();
          }}
        >
          <section className="sg-builder-card">
            <label className="sg-builder-label" htmlFor="sg-builder-name">
              {copy.builder.name}
            </label>
            <input
              id="sg-builder-name"
              className="sg-builder-input"
              value={builder.title}
              maxLength={MAX_TITLE_LENGTH}
              placeholder={copy.builder.namePlaceholder}
              dir="auto"
              onChange={(event) => builder.setTitle(event.target.value)}
            />
            <span className="sg-builder-label" id="sg-builder-sport">
              {copy.builder.sport}
            </span>
            <div className="sg-builder-sports" role="radiogroup" aria-labelledby="sg-builder-sport">
              {CARDIO_SPORTS.map((sport) => (
                <button key={sport} type="button" role="radio" aria-checked={builder.sport === sport} className="sg-builder-sport" onClick={() => builder.setSport(sport)}>
                  {cardioSportLabel(sport, language)}
                </button>
              ))}
            </div>
          </section>

          <section className="sg-builder-preview" aria-label={copy.builder.preview}>
            <CardioGraph frames={frames} totalSec={Math.max(1, totals.totalSec)} />
          </section>

          <h2 className="sg-builder-section">{copy.builder.blocks}</h2>
          <ol className="sg-builder-steps">
            {builder.steps.map((step) =>
              step.type === 'block' ? (
                <li key={step.id}>
                  <OwnCardioBlockEditor
                    block={step}
                    onChange={(patch) => builder.changeBlock(step.id, patch)}
                    onRemove={canRemoveTopBlock ? () => builder.removeStep(step.id) : null}
                  />
                </li>
              ) : (
                <li key={step.id} className="sg-builder-repeat">
                  <div className="sg-builder-repeat-head">
                    <IconRepeat size={18} aria-hidden="true" />
                    <SgStepper
                      label={copy.builder.times}
                      display={`× ${step.times}`}
                      onDecrease={() => builder.changeTimes(step.id, step.times - 1)}
                      onIncrease={() => builder.changeTimes(step.id, step.times + 1)}
                      canDecrease={step.times > MIN_TIMES}
                      canIncrease={step.times < MAX_TIMES}
                    />
                  </div>
                  <ol className="sg-builder-steps">
                    {step.blocks.map((block) => (
                      <li key={block.id}>
                        <OwnCardioBlockEditor
                          block={block}
                          onChange={(patch) => builder.changeBlock(block.id, patch)}
                          onRemove={builder.steps.length > 1 || step.blocks.length > 1 ? () => builder.removeStep(block.id) : null}
                        />
                      </li>
                    ))}
                  </ol>
                  <button type="button" className="sg-builder-add sg-builder-add-quiet" onClick={() => builder.addToRepeat(step.id)}>
                    <IconPlus size={16} aria-hidden="true" />
                    {copy.builder.addToRepeat}
                  </button>
                </li>
              ),
            )}
          </ol>

          <div className="sg-builder-adds">
            <button type="button" className="sg-builder-add" onClick={builder.addBlock} disabled={!builder.canAdd}>
              <IconPlus size={16} aria-hidden="true" />
              {copy.builder.addBlock}
            </button>
            <button type="button" className="sg-builder-add" onClick={builder.addRepeat} disabled={!builder.canAdd}>
              <IconRepeat size={16} aria-hidden="true" />
              {copy.builder.addRepeat}
            </button>
          </div>

          <p className="sg-builder-error" role="alert">
            {builder.error ?? ''}
          </p>
          <button type="submit" className="sg-builder-save" disabled={builder.isSaving}>
            {builder.isSaving ? copy.builder.saving : copy.builder.save}
          </button>
          {id &&
            (confirmDelete ? (
              <div className="sg-builder-delete-confirm">
                <p>{copy.builder.deleteQuestion}</p>
                <button type="button" className="sg-builder-delete" onClick={() => void builder.remove()} disabled={builder.isSaving}>
                  {copy.builder.deleteYes}
                </button>
                <button type="button" className="sg-builder-cancel" onClick={() => setConfirmDelete(false)}>
                  {copy.builder.cancel}
                </button>
              </div>
            ) : (
              <button type="button" className="sg-builder-delete" onClick={() => setConfirmDelete(true)}>
                {copy.builder.delete}
              </button>
            ))}
          <p className="sg-builder-total">{fill(copy.builder.total, { minutes: Math.round(totals.totalSec / 60) })}</p>
        </form>
      )}
    </main>
  );
}
