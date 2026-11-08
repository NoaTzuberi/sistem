import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import type { CollisionDetection, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { IconPlus, IconRepeat, IconRoute, IconTrash } from '@tabler/icons-react';
import { cardioKindLabel, cardioSportLabel, fill, useCopy, useI18n } from '@sistem/shared';
import { ROUTES } from '../../../../app/config/routes';
import { StateMessage } from '../../../../components/common/StateMessage/StateMessage';
import { ConfirmSheet } from '../../../../components/common/ConfirmSheet/ConfirmSheet';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { SubScreenHeader } from '../../../profile/components/SubScreenHeader/SubScreenHeader';
import { BuilderSummary } from '../../components/BuilderSummary/BuilderSummary';
import { BuilderBlockRow } from '../../components/BuilderBlockRow/BuilderBlockRow';
import { BuilderRepeat } from '../../components/BuilderRepeat/BuilderRepeat';
import { BuilderAddSheet } from '../../components/BuilderAddSheet/BuilderAddSheet';
import { BuilderBlockMenu } from '../../components/BuilderBlockMenu/BuilderBlockMenu';
import { BuilderTemplates } from '../../components/BuilderTemplates/BuilderTemplates';
import { cardioCopy } from '../../copy';
import { builderSummary } from '../../data/builderSummary';
import { CARDIO_SPORTS, MAX_TITLE_LENGTH, inSameList, removeStep } from '../../data/ownCardioDraft';
import { useOwnCardioBuilder } from '../../hooks/useOwnCardioBuilder';
import { useDocumentSurface } from '../../../../hooks/useDocumentSurface';
import '../../cardioZones.css';
import './OwnCardioBuilderPage.css';

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * "Build a run" (self-guided, redesign 2026-11-03): name + type, a sticky summary with the session's profile
 * (tap a bar = its block), the blocks as a timeline (one open at a time, drag to reorder, ⋯ = duplicate /
 * delete), repeat sets as groups, "+ קטע" presets / "+ סט חוזר", starter templates for a new workout.
 * Saved as HER workout (no coach, no plan); the same player runs it.
 */
export function OwnCardioBuilderPage() {
  useDocumentSurface('soft');
  const { id = null } = useParams();
  const copy = useCopy(cardioCopy);
  const { language } = useI18n();
  const builder = useOwnCardioBuilder(id);
  const [isAdding, setIsAdding] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const summary = useMemo(() => builderSummary(builder.steps), [builder.steps]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const menuBlock = menuFor ? builder.steps.flatMap((step) => (step.type === 'block' ? [step] : step.blocks)).find((block) => block.id === menuFor) : null;
  const menuRepeat = menuFor ? builder.steps.find((step) => step.type === 'repeat' && step.id === menuFor) : undefined;
  // A workout keeps at least one block: delete only when something would remain.
  const canDelete = menuFor !== null && removeStep(builder.steps, menuFor).length > 0;

  function openFromChart(blockId: string) {
    builder.open(blockId);
    // After the row has opened: bring it into view below the sticky summary.
    window.requestAnimationFrame(() =>
      document.getElementById(`cb-row-${blockId}`)?.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' }),
    );
  }

  // Only the rows of the dragged row's own list are drop targets (a set's blocks stay in their set).
  const collision: CollisionDetection = (args) =>
    closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter((container) => inSameList(builder.steps, String(args.active.id), String(container.id))),
    });

  function handleDragEnd(event: DragEndEvent) {
    if (event.over && event.active.id !== event.over.id) builder.reorder(String(event.active.id), String(event.over.id));
  }

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
            <div className="sg-builder-sports" role="radiogroup" aria-label={copy.builder.sport}>
              {CARDIO_SPORTS.map((sport) => (
                <button key={sport} type="button" role="radio" aria-checked={builder.sport === sport} className="sg-builder-sport" onClick={() => builder.setSport(sport)}>
                  {cardioSportLabel(sport, language)}
                </button>
              ))}
            </div>
          </section>

          <BuilderSummary summary={summary} selectedId={builder.selectedId} onSelect={openFromChart} />

          {!id && !builder.isDirty && <BuilderTemplates onPick={builder.applyTemplate} />}

          <DndContext sensors={sensors} collisionDetection={collision} onDragEnd={handleDragEnd}>
            <SortableContext items={builder.steps.map((step) => step.id)} strategy={verticalListSortingStrategy}>
              <div className="sg-builder-steps" aria-label={copy.builder.blocks}>
                {builder.steps.map((step) =>
                  step.type === 'block' ? (
                    <BuilderBlockRow
                      key={step.id}
                      block={step}
                      isOpen={builder.selectedId === step.id}
                      onToggle={() => builder.select(step.id)}
                      onChange={(patch) => builder.changeBlock(step.id, patch)}
                      onMore={() => setMenuFor(step.id)}
                    />
                  ) : (
                    <BuilderRepeat
                      key={step.id}
                      repeat={step}
                      selectedId={builder.selectedId}
                      onToggle={builder.select}
                      onChange={builder.changeBlock}
                      onTimes={(times) => builder.changeTimes(step.id, times)}
                      onMore={setMenuFor}
                      onAdd={() => builder.addToRepeat(step.id)}
                    />
                  ),
                )}
              </div>
            </SortableContext>
          </DndContext>

          <div className="sg-builder-adds">
            <button type="button" className="sg-builder-add" onClick={() => setIsAdding(true)} disabled={!builder.canAdd}>
              <IconPlus size={16} stroke={2.4} aria-hidden="true" />
              {copy.builder.addBlockShort}
            </button>
            <button type="button" className="sg-builder-add sg-builder-add-repeat" onClick={builder.addRepeat} disabled={!builder.canAdd}>
              <IconRepeat size={16} aria-hidden="true" />
              {copy.builder.addRepeatShort}
            </button>
          </div>

          {id && (
            <button type="button" className="sg-builder-delete" onClick={() => setConfirmDelete(true)}>
              {copy.builder.delete}
            </button>
          )}

          <div className="sg-builder-actions">
            <p className="sg-builder-error" role="alert">
              {builder.error ?? ''}
            </p>
            <div className="sg-builder-actions-row">
              <PillButton variant="soft" className="sg-builder-preview" disabled={builder.isSaving} onClick={() => void builder.saveAndPreview()}>
                {copy.builder.previewButton}
              </PillButton>
              <PillButton type="submit" className="sg-builder-save" loading={builder.isSaving}>
                {copy.builder.save}
              </PillButton>
            </div>
          </div>
        </form>
      )}

      <BuilderAddSheet
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        onPick={(preset) => {
          setIsAdding(false);
          builder.addPreset(preset);
        }}
      />
      <BuilderBlockMenu
        isOpen={menuFor !== null}
        title={
          menuBlock
            ? cardioKindLabel(menuBlock.kind, language)
            : menuRepeat?.type === 'repeat'
              ? fill(copy.builder.repeatTitle, { times: menuRepeat.times })
              : copy.builder.blocks
        }
        canDelete={canDelete}
        onClose={() => setMenuFor(null)}
        onDuplicate={() => {
          if (menuFor) builder.duplicate(menuFor);
          setMenuFor(null);
        }}
        onDelete={() => {
          if (menuFor) builder.removeStep(menuFor);
          setMenuFor(null);
        }}
      />
      <ConfirmSheet
        isOpen={confirmDelete}
        tone="destructive"
        icon={<IconTrash size={22} />}
        title={copy.builder.delete}
        message={copy.builder.deleteQuestion}
        confirmLabel={copy.builder.deleteYes}
        cancelLabel={copy.builder.cancel}
        isWorking={builder.isSaving}
        onConfirm={() => void builder.deleteWorkout()}
        onCancel={() => setConfirmDelete(false)}
      />
      <ConfirmSheet
        isOpen={builder.pendingSport !== null}
        icon={<IconRoute size={22} />}
        title={copy.builder.replaceTitle}
        message={builder.pendingSport ? fill(copy.builder.replaceMessage, { type: cardioSportLabel(builder.pendingSport, language) }) : undefined}
        confirmLabel={copy.builder.replaceYes}
        secondary={{ label: copy.builder.replaceKeep, onClick: builder.keepStructure }}
        hideCancel
        onConfirm={builder.replaceStructure}
        onCancel={builder.cancelSportChange}
      />
    </main>
  );
}
