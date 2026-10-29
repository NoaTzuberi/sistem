import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { NutritionTemplate } from '@sistem/types';
import { fill, useCopy } from '@sistem/shared';
import { nutritionBuilderPath } from '../../../../app/config/routes';
import { PageHeader } from '../../../../components/common/PageHeader/PageHeader';
import { StateLine } from '../../../../components/common/StateLine/StateLine';
import { Toast } from '../../../../components/common/Toast/Toast';
import { useToast } from '../../../../hooks/useToast';
import { useUndoToast } from '../../../../hooks/useUndoToast';
import { appCopy } from '../../../../copy';
import { TEMPLATE_STATE_KEY } from '../../data/templateHandoff';
import { TAB_PATHS, libraryTabId, tabFromPath } from '../../data/libraryTabs';
import type { LibraryTab } from '../../data/libraryTabs';
import { useFoods } from '../../hooks/useFoods';
import { useTemplates } from '../../hooks/useTemplates';
import { useNutritionSettings } from '../../hooks/useNutritionSettings';
import { useSettingsPreview } from '../../hooks/useSettingsPreview';
import { usePortionSplit } from '../../hooks/usePortionSplit';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';
import { LibraryTabs } from '../../components/LibraryTabs/LibraryTabs';
import { HowItWorks } from '../../components/HowItWorks/HowItWorks';
import { FoodBankPanel } from '../../components/FoodBankPanel/FoodBankPanel';
import type { HowItWorksItem } from '../../components/HowItWorks/HowItWorks';
import { TemplatesGrid } from '../../components/TemplatesGrid/TemplatesGrid';
import { TraineePickerSheet } from '../../components/TraineePickerSheet/TraineePickerSheet';
import { TemplateRenameSheet } from '../../components/TemplateRenameSheet/TemplateRenameSheet';
import { SettingsKcalPerPortion } from '../../components/SettingsKcalPerPortion/SettingsKcalPerPortion';
import { SettingsGoalAdjustments } from '../../components/SettingsGoalAdjustments/SettingsGoalAdjustments';
import { SettingsActivityMultipliers } from '../../components/SettingsActivityMultipliers/SettingsActivityMultipliers';
import { SettingsSafetyFloor } from '../../components/SettingsSafetyFloor/SettingsSafetyFloor';
import { SettingsMore } from '../../components/SettingsMore/SettingsMore';
import { SettingsLivePreview } from '../../components/SettingsLivePreview/SettingsLivePreview';
import { UnsavedChangesBar } from '../../components/UnsavedChangesBar/UnsavedChangesBar';
import { nutritionLibraryCopy } from '../../copy';
import './FoodLibraryPage.css';

const PANEL_ID = 'nutrition-library-panel';

/** A sheet that opens fresh each time: a new key remounts its form. */
interface SheetState<T> {
  isOpen: boolean;
  subject: T;
  key: number;
}

/**
 * The coach's nutrition library (PRD §5.6): her food list, her templates and the numbers behind every
 * calculation — one page, three tabs, the open tab in the URL. Each tab starts by saying what it is for.
 */
export function FoodLibraryPage() {
  const copy = useCopy(nutritionLibraryCopy);
  const location = useLocation();
  const navigate = useNavigate();
  const tab = tabFromPath(location.pathname);
  const app = useCopy(appCopy);
  const { toastMessage, showToast } = useToast();
  const { undoMessage, offerUndo, undo } = useUndoToast();

  const foods = useFoods();
  const templates = useTemplates();
  const settings = useNutritionSettings();
  const preview = useSettingsPreview(settings.payload);
  const split = usePortionSplit(settings.form);
  useUnsavedChangesGuard(settings.isDirty, copy.leaveConfirm);

  const [picker, setPicker] = useState<SheetState<NutritionTemplate | null>>({ isOpen: false, subject: null, key: 0 });
  const [rename, setRename] = useState<SheetState<NutritionTemplate | null>>({ isOpen: false, subject: null, key: 0 });

  function changeTab(next: LibraryTab) {
    if (next === tab) return;
    if (tab === 'settings' && settings.isDirty) {
      if (!window.confirm(copy.leaveConfirm)) return;
      settings.cancel();
    }
    navigate(TAB_PATHS[next]);
  }

  // --- Templates -----------------------------------------------------------------------------

  const openPicker = (template: NutritionTemplate | null) => setPicker((current) => ({ isOpen: true, subject: template, key: current.key + 1 }));
  const closePicker = () => setPicker((current) => ({ ...current, isOpen: false }));
  const closeRename = () => setRename((current) => ({ ...current, isOpen: false }));

  function pickTrainee(traineeId: string) {
    const template = picker.subject;
    closePicker();
    // Her builder applies the template on arrival (and asks first when her meals have content).
    navigate(nutritionBuilderPath(traineeId), template ? { state: { [TEMPLATE_STATE_KEY]: template.id } } : undefined);
  }

  function deleteTemplate(template: NutritionTemplate) {
    templates.hide(template.id);
    offerUndo({
      message: fill(copy.deleted, { name: template.name }),
      onUndo: () => templates.show(template.id),
      // Success was already said; only a failure needs a line.
      onCommit: () => void templates.remove(template).then((result) => !result.ok && showToast(result.message)),
    });
  }

  async function renameTemplate(name: string): Promise<boolean> {
    if (!rename.subject) return false;
    const result = await templates.rename(rename.subject, name);
    showToast(result.message);
    return result.ok;
  }

  // --- Settings ------------------------------------------------------------------------------

  async function saveSettings() {
    if (!settings.payload) {
      if (split.message) showToast(split.message);
      return;
    }
    const result = await settings.save();
    showToast(result.message);
    // The food list's caps come from these numbers.
    if (result.ok) foods.reload();
  }

  const howFoods: HowItWorksItem[] = [
    { id: 'portion', icon: 'list', tone: 'protein', ...copy.howFoods.portion },
    { id: 'swap', icon: 'swap', tone: 'carb', ...copy.howFoods.swap },
    { id: 'contains', icon: 'filter', tone: 'fat', ...copy.howFoods.contains },
  ];
  const howTemplates: HowItWorksItem[] = [
    { id: 'save', icon: 'download', tone: 'protein', ...copy.howTemplates.save },
    { id: 'start', icon: 'template', tone: 'carb', ...copy.howTemplates.start },
    { id: 'time', icon: 'clock', tone: 'fat', ...copy.howTemplates.time },
  ];

  return (
    <div className="food-library-page">
      <PageHeader title={copy.title} subtitle={copy.subtitle}>
        <LibraryTabs
          value={tab}
          counts={{ foods: foods.isReady ? foods.activeCount : undefined, templates: templates.templates?.length }}
          onChange={changeTab}
          panelId={PANEL_ID}
        />
      </PageHeader>

      <div className="food-library-panel" id={PANEL_ID} role="tabpanel" aria-labelledby={libraryTabId(tab)}>
        {tab === 'foods' && (
          <>
            <HowItWorks label={copy.howLabel} items={howFoods} />
            <FoodBankPanel foods={foods} onToast={showToast} offerUndo={offerUndo} />
          </>
        )}

        {tab === 'templates' && (
          <>
            <HowItWorks label={copy.howLabel} items={howTemplates} />
            {!templates.templates ? (
              <StateLine error={templates.error} onRetry={templates.reload} />
            ) : (
              <TemplatesGrid
                templates={templates.templates}
                onUse={openPicker}
                onRename={(template) => setRename((current) => ({ isOpen: true, subject: template, key: current.key + 1 }))}
                onDelete={deleteTemplate}
                onOpenBuilder={() => openPicker(null)}
              />
            )}
          </>
        )}

        {tab === 'settings' &&
          (!settings.form ? (
            <StateLine error={settings.error} onRetry={settings.reload} />
          ) : (
            <>
              <div className="food-library-settings">
                <div className="food-library-settings-cards">
                  <SettingsKcalPerPortion form={settings.form} errors={settings.errors} update={settings.update} />
                  <SettingsGoalAdjustments form={settings.form} errors={settings.errors} update={settings.update} />
                  <SettingsActivityMultipliers form={settings.form} errors={settings.errors} update={settings.update} />
                  <SettingsSafetyFloor form={settings.form} errors={settings.errors} update={settings.update} />
                  <SettingsMore form={settings.form} errors={settings.errors} update={settings.update} onResetDefaults={settings.resetDefaults} />
                </div>
                <SettingsLivePreview suggestion={preview.suggestion} isInvalid={preview.isInvalid} hasError={preview.hasError} />
              </div>
              {settings.isDirty && (
                <UnsavedChangesBar
                  canSave={settings.payload !== undefined}
                  blockedReason={split.message}
                  isSaving={settings.isSaving}
                  onCancel={settings.cancel}
                  onSave={saveSettings}
                />
              )}
            </>
          ))}
      </div>

      {/* Mounted from the first opening on — its trainee list loads only when it is wanted. */}
      {picker.key > 0 && (
        <TraineePickerSheet
          key={`picker-${picker.key}`}
          isOpen={picker.isOpen}
          templateName={picker.subject?.name ?? null}
          onClose={closePicker}
          onPick={pickTrainee}
        />
      )}
      {rename.subject && (
        <TemplateRenameSheet key={`rename-${rename.key}`} isOpen={rename.isOpen} name={rename.subject.name} onClose={closeRename} onSave={renameTemplate} />
      )}
      {/* One toast at a time: the undo line while it is offered, otherwise the last message. */}
      <Toast message={undoMessage ?? toastMessage} action={undoMessage ? { label: app.shell.undo, onPress: undo } : undefined} />
    </div>
  );
}
