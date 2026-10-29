import { useEffect, useMemo, useState } from 'react';
import type { AiNutritionRecommendation, CoachNutritionPlanResponse, NutritionTemplate, PortionCounts } from '@sistem/types';
import { describePortion, fill, formatDateTime, formatKcal, formatNumber, formatPlural, formatPortionCountLtr, isolateLtr, nutritionGoalLabel, PORTION_GROUPS, useCopy, useI18n } from '@sistem/shared';
import { PublishModal } from '../../../../components/common/PublishModal/PublishModal';
import type { PublishSummary } from '../../../../components/common/PublishModal/PublishModal';
import { appCopy } from '../../../../copy';
import { usePublishFlow } from '../../../../hooks/usePublishFlow';
import { saveNutritionTemplate } from '../../../../services/coach/coachService';
import { useNavigate } from 'react-router-dom';
import { traineePath } from '../../../../app/config/routes';
import { useLatestAiDraft } from '../../../aiDraft/hooks/useLatestAiDraft';
import { draftMealsFromAi } from '../../../aiDraft/aiDraftToNutrition';
import { aiDraftCopy } from '../../../aiDraft/copy';
import { nutritionCopy } from '../../copy';
import { scrollToSection } from '../../data/scrollToSection';
import { useNutritionCalc } from '../../hooks/useNutritionCalc';
import { useNutritionEditor } from '../../hooks/useNutritionEditor';
import { useTemplateHandoff } from '../../hooks/useTemplateHandoff';
import { draftDayPortions, portionsKcal, usePortionBudget } from '../../hooks/usePortionBudget';
import { usePublishChecklist } from '../../hooks/usePublishChecklist';
import { useActiveSection } from '../../hooks/useActiveSection';
import type { NutritionDraft } from '../../nutritionDraft';
import { NutritionAiRationale } from '../../../aiDraft/components/NutritionAiRationale/NutritionAiRationale';
import { useAiDraftBanner } from '../../hooks/useAiDraftBanner';
import { AiDraftBanner } from '../AiDraftBanner/AiDraftBanner';
import { AiDraftCompact } from '../AiDraftCompact/AiDraftCompact';
import { BuilderHeader } from '../BuilderHeader/BuilderHeader';
import { CalorieTargetSection } from '../CalorieTargetSection/CalorieTargetSection';
import { IssueList } from '../IssueList/IssueList';
import { MealsSection } from '../MealsSection/MealsSection';
import { MessageTipsSection } from '../MessageTipsSection/MessageTipsSection';
import { PortionBudgetCard } from '../PortionBudgetCard/PortionBudgetCard';
import { PreferencesCard } from '../PreferencesCard/PreferencesCard';
import { PublishChecklist } from '../PublishChecklist/PublishChecklist';
import { SaveTemplateCard } from '../SaveTemplateCard/SaveTemplateCard';
import { StepNav } from '../StepNav/StepNav';
import './NutritionEditor.css';

// The server's publish errors the checklist shows as its own items.
const CHECKLIST_CODES = new Set(['target_missing', 'floor_unconfirmed', 'no_meals']);

interface NutritionEditorProps {
  traineeId: string;
  traineeName: string;
  initial: CoachNutritionPlanResponse;
  templates: NutritionTemplate[];
}

/**
 * The nutrition plan builder (PRD §5.6) in three steps — calorie target, meals, message and tips —
 * with a live portion budget and "before publish" beside them. Autosaves; the server computes the
 * calculation, the day's portions and the publish issues.
 */
export function NutritionEditor({ traineeId, traineeName, initial, templates }: NutritionEditorProps) {
  const { language, plural } = useI18n();
  const aiDraftText = useCopy(aiDraftCopy);
  const copy = useCopy(nutritionCopy);
  const b = copy.builder;
  const editor = useNutritionEditor(traineeId, initial);
  const { response, draft, updateDraft, saveStatus, isDirty } = editor;
  const [message, setMessage] = useState<string>();
  const navigate = useNavigate();
  const appText = useCopy(appCopy);
  // Publishing goes through the designed modal (confirm → the existing publish call → celebration).
  const publishFlow = usePublishFlow(editor.publish);
  const isPublishing = publishFlow.step === 'publishing';
  const ai = useLatestAiDraft(traineeId, 'nutrition_plan');
  const { suggestion, requestError } = useNutritionCalc(traineeId, draft.target);
  const { groupKcal, floorKcal, goalAdjustments } = response.config;
  const readyDraft = ai.ready;
  const banner = useAiDraftBanner(traineeId, readyDraft?.id ?? null);
  // Meals with anything in them: replacing them asks first.
  const hasMealContent = draft.meals.some((meal) => meal.options.length > 0 || PORTION_GROUPS.some((group) => meal.portions[group] > 0));

  const foodsById = useMemo(() => new Map(response.foods.map((food) => [food.id, food])), [response.foods]);
  const plan = response.plan;
  const kcal = draft.target.kcal;

  // The day's recommended portions for the target: the live calculation's when the target is its
  // suggestion, else the server's for the saved target (a typed target is split after the next save).
  let targetPortions: PortionCounts | null = null;
  let targetPortionsKcal: number | null = null;
  if (kcal !== undefined && suggestion?.kcal === kcal && suggestion.portions) {
    targetPortions = suggestion.portions;
    targetPortionsKcal = suggestion.portionsKcal;
  } else if (kcal !== undefined && plan?.calorieTarget.kcal === kcal && plan.targetPortions) {
    targetPortions = plan.targetPortions;
    targetPortionsKcal = portionsKcal(plan.targetPortions, groupKcal);
  }
  // What she gets per day in this mode: the daily portions, or the meals summed.
  const dayPortions = useMemo(() => draftDayPortions(draft), [draft]);
  const budget = usePortionBudget(dayPortions, kcal, targetPortions, groupKcal);
  const isPortionsMode = draft.mode === 'portions';

  // The target starts as the recommendation (owner, 2026-10-20): marked "as suggested", one press back to
  // it after a change — so the budget works from the first moment. Only while no target was ever set.
  const suggestedKcal = suggestion?.status === 'ok' ? suggestion.kcal : null;
  useEffect(() => {
    if (suggestedKcal === null || draft.target.kcal !== undefined) return;
    updateDraft((current) =>
      current.target.kcal === undefined ? { ...current, target: { ...current.target, kcal: suggestedKcal, source: 'suggested', confirmBelowFloor: false } } : current,
    );
  }, [suggestedKcal, draft.target.kcal, updateDraft]);

  // Portions mode with no daily portions yet: start from the target's split (the calculation never adds snack).
  const dailyEmpty = PORTION_GROUPS.every((group) => draft.dailyPortions[group] === 0);
  useEffect(() => {
    if (!targetPortions || draft.mode !== 'portions' || !dailyEmpty) return;
    updateDraft((current) => ({ ...current, dailyPortions: { ...targetPortions } }));
  }, [targetPortions, draft.mode, dailyEmpty, updateDraft]);
  const publishSummary: PublishSummary = {
    kind: 'nutrition',
    title: kcal !== undefined ? fill(appText.publish.nutritionTitle, { kcal: formatKcal(kcal, language) }) : b.title,
    chips: [
      ...(isPortionsMode ? [] : [{ id: 'meals', label: formatPlural(language, appText.publish.meals, draft.meals.length) }]),
      ...(['protein', 'carb', 'fat'] as const)
        .filter((group) => budget.allocated[group] > 0)
        .map((group) => ({ id: group, label: describePortion(group, budget.allocated[group], language) })),
    ],
  };
  const activeSection = useActiveSection();
  const checklist = usePublishChecklist(draft, response.issues, budget, floorKcal);

  const isPublished = plan !== null && plan.publishedVersion > 0;
  const nothingNew = isPublished && !plan.changedSincePublish && !isDirty;
  const stateOf = (id: string) => checklist.items.find((item) => item.id === id)?.state;

  function setTarget(patch: Partial<NutritionDraft['target']>) {
    updateDraft((current) => ({ ...current, target: { ...current.target, ...patch } }));
  }

  /**
   * The AI draft's meals replace hers in the editable working copy (autosaved like any edit,
   * never published by this). Target, message and tips stay; a plan without a target takes
   * the one the draft was built for.
   */
  function handleLoadAiDraft(recommendation: AiNutritionRecommendation) {
    const output = recommendation.output;
    if (!output) return;
    if (hasMealContent && !window.confirm(aiDraftText.nutrition.replaceConfirm)) return;
    banner.rememberBefore(recommendation.id, { meals: draft.meals, aiRecommendationId: draft.aiRecommendationId, target: draft.target });
    updateDraft((current) => ({
      ...current,
      meals: draftMealsFromAi(output),
      // An AI draft is a menu: its meals are what she gets.
      mode: 'menu',
      aiRecommendationId: recommendation.id,
      target: current.target.kcal === undefined ? { ...current.target, kcal: output.kcal, source: 'suggested' } : current.target,
    }));
  }

  /** Puts the plan back as it was right before the draft was applied (this visit only). */
  function handleUndoAiDraft(id: string) {
    const before = banner.undoFor(id);
    if (!before) return;
    updateDraft((current) => ({ ...current, ...before }));
    banner.clearUndo();
  }

  function handlePublish() {
    setMessage(undefined);
    publishFlow.open();
  }

  async function handleApplyTemplate(templateId: string): Promise<boolean> {
    if (hasMealContent && !window.confirm(copy.templateReplaceConfirm)) return false;
    return editor.applyTemplate(templateId);
  }

  useTemplateHandoff(handleApplyTemplate);

  async function handleSaveTemplate(name: string): Promise<boolean> {
    setMessage(undefined);
    try {
      if (!(await editor.save())) return false;
      const template = await saveNutritionTemplate(traineeId, { name });
      setMessage(fill(copy.templateSaved, { name: template.name }));
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.templateSaveError);
      return false;
    }
  }

  // A step is done when every checklist item of its section is (optional ones aside).
  const sectionDone = (section: 'target' | 'meals') =>
    checklist.items.filter((item) => item.section === section && item.state !== 'optional').every((item) => item.state === 'ok');
  const step2Done = sectionDone('meals');
  const goalPercent = goalAdjustments[draft.target.goal];
  const targetSummary = [
    kcal !== undefined ? formatKcal(kcal, language) : b.noTargetYet,
    `${nutritionGoalLabel(draft.target.goal, language)} ${isolateLtr(`${formatNumber(goalPercent, language, { signDisplay: 'exceptZero' })}%`)}`,
    ...(targetPortions
      ? [`${isolateLtr((['protein', 'carb', 'fat'] as const).map((group) => formatPortionCountLtr(targetPortions[group])).join(' / '))} ${copy.tab.portionsUnit}`]
      : []),
  ].join(' · ');

  const steps = [
    { section: 'target' as const, number: 1, label: b.step1, detail: kcal !== undefined ? formatKcal(kcal, language) : b.noTargetYet, done: stateOf('target') === 'ok' },
    {
      section: 'meals' as const,
      number: 2,
      label: b.step2,
      detail: isPortionsMode
        ? fill(b.stepDaily, { count: formatPortionCountLtr(PORTION_GROUPS.reduce((sum, group) => sum + draft.dailyPortions[group], 0)) })
        : plural(b.stepMenu, draft.meals.length),
      done: step2Done,
    },
    {
      section: 'message' as const,
      number: 3,
      label: b.step3,
      detail: plural(b.tipCount, draft.tips.filter((tip) => tip.text.trim()).length),
      done: draft.introMessage.trim().length > 0,
    },
  ];

  return (
    <div className="nb-builder">
      <BuilderHeader
        traineeName={traineeName}
        backTo={traineePath(traineeId, 'nutrition')}
        status={isPublished && !plan.changedSincePublish && !isDirty ? 'live' : 'draft'}
        meta={isPublished && plan.publishedAt ? fill(copy.statusPublished, { version: plan.publishedVersion, date: formatDateTime(plan.publishedAt, language) }) : b.neverPublished}
        saveStatus={saveStatus}
        onRetry={editor.retry}
        publishLabel={isPublished ? copy.publishUpdate : copy.publish}
        blockers={checklist.blockers}
        publishDisabled={nothingNew || isPublishing}
        onPublish={handlePublish}
        onBlockedPublish={() => checklist.firstBlocker && scrollToSection(checklist.firstBlocker.section)}
      />
      <StepNav label={b.stepsLabel} steps={steps} active={activeSection} onGo={scrollToSection} />

      {editor.error && (
        <div className="nb-alert" role="alert">
          <p>{editor.error}</p>
          <IssueList issues={editor.saveIssues} />
        </div>
      )}
      {nothingNew && <p className="nb-status-line">{copy.nothingToPublish}</p>}
      {message && (
        <p className="nb-status-line" role="status">
          {message}
        </p>
      )}

      <div className="nb-layout">
        <div className="nb-main">
          {readyDraft && !banner.isDismissed && (
            <AiDraftBanner
              draft={readyDraft}
              targetKcal={kcal}
              applied={draft.aiRecommendationId === readyDraft.id}
              canUndo={banner.undoFor(readyDraft.id) !== null}
              regenerateDisabled={ai.running || ai.isStarting || ai.unavailableReason !== null}
              onApply={() => handleLoadAiDraft(readyDraft)}
              onUndo={() => handleUndoAiDraft(readyDraft.id)}
              onRegenerate={() => void ai.generate()}
              onDismiss={banner.dismiss}
            />
          )}
          <CalorieTargetSection
            target={draft.target}
            onChange={setTarget}
            suggestion={suggestion}
            requestError={requestError}
            floorKcal={floorKcal}
            goalAdjustments={goalAdjustments}
            portions={targetPortions}
            portionsKcal={targetPortionsKcal}
            isDone={sectionDone('target')}
            summary={targetSummary}
            startCollapsed={plan !== null && plan.calorieTarget.kcal !== null}
          />
          <MealsSection
            mode={draft.mode}
            onModeChange={(mode) => updateDraft((current) => ({ ...current, mode }))}
            dailyPortions={draft.dailyPortions}
            recommended={targetPortions}
            onDailyChange={(group, value) => updateDraft((current) => ({ ...current, dailyPortions: { ...current.dailyPortions, [group]: value } }))}
            vegetablesFree={draft.vegetablesFree}
            onVegetablesChange={(vegetablesFree) => updateDraft((current) => ({ ...current, vegetablesFree }))}
            proteinGramsTarget={draft.proteinGramsTarget}
            onProteinChange={(proteinGramsTarget) => updateDraft((current) => ({ ...current, proteinGramsTarget }))}
            isDone={step2Done}
            meals={draft.meals}
            onMealsChange={(update) => updateDraft((current) => ({ ...current, meals: update(current.meals) }))}
            groupKcal={groupKcal}
            foods={response.foods}
            recentFoodIds={response.recentFoodIds}
            foodsById={foodsById}
            issues={response.issues}
            templates={templates}
            onApplyTemplate={handleApplyTemplate}
          />
          <MessageTipsSection
            message={draft.introMessage}
            onMessageChange={(introMessage) => updateDraft((current) => ({ ...current, introMessage }))}
            tips={draft.tips}
            onTipsChange={(tips) => updateDraft((current) => ({ ...current, tips }))}
          />
        </div>

        <aside className="nb-side">
          <PortionBudgetCard budget={budget} title={isPortionsMode ? b.dailyTitle : b.budgetTitle} isDaily={isPortionsMode} />
          <PublishChecklist
            items={checklist.items}
            issues={response.issues.filter((issue) => issue.mealIndex === undefined && !CHECKLIST_CODES.has(issue.code))}
            onGo={scrollToSection}
          />
          {(!readyDraft || banner.isDismissed || ai.running) && <AiDraftCompact ai={ai} hiddenDraft={readyDraft !== null && banner.isDismissed} onShow={banner.show} />}
          {draft.aiRecommendationId && (
            <NutritionAiRationale traineeId={traineeId} recommendationId={draft.aiRecommendationId} recommendation={ai.latest} />
          )}
          <PreferencesCard preferences={response.preferences} />
          <SaveTemplateCard disabled={draft.meals.length === 0} onSave={handleSaveTemplate} />
        </aside>
      </div>
      <PublishModal
        flow={publishFlow}
        traineeName={traineeName}
        summary={publishSummary}
        onOpenProfile={() => {
          publishFlow.close();
          navigate(traineePath(traineeId, 'nutrition'));
        }}
      />
    </div>
  );
}
