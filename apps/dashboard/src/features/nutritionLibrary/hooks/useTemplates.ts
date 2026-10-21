import { useCallback, useMemo } from 'react';
import type { NutritionTemplate } from '@sistem/types';
import { fill, getActiveLanguage, useCopy, useLoad } from '@sistem/shared';
import { deleteNutritionTemplate, listNutritionTemplates, renameNutritionTemplate } from '../../../services/coach/coachService';
import { errorText } from '../data/errorText';
import type { FoodActionResult } from './useFoods';
import { useHiddenItems } from '../../../hooks/useHiddenItems';
import { nutritionLibraryCopy } from '../copy';

/** The coach's nutrition templates. Saving one and starting a plan from one happen in a trainee's builder. */
export function useTemplates() {
  const copy = useCopy(nutritionLibraryCopy);
  const { data, error, isLoading, reload } = useLoad(listNutritionTemplates, copy.templatesLoadError);
  // A delete waiting for its "Undo" hides the template at once (useUndoToast).
  const { hidden, hide, show, markDone } = useHiddenItems(data);
  const templates = useMemo(() => data?.filter((template) => !hidden.has(template.id)), [data, hidden]);

  const rename = useCallback(
    async (template: NutritionTemplate, name: string): Promise<FoodActionResult> => {
      const text = nutritionLibraryCopy[getActiveLanguage()];
      try {
        await renameNutritionTemplate(template.id, { name });
        reload();
        return { ok: true, message: text.renamed };
      } catch (failure) {
        return { ok: false, message: errorText(failure, text.renameError) };
      }
    },
    [reload],
  );

  const remove = useCallback(
    async (template: NutritionTemplate): Promise<FoodActionResult> => {
      const text = nutritionLibraryCopy[getActiveLanguage()];
      try {
        await deleteNutritionTemplate(template.id);
        markDone(template.id);
        reload();
        return { ok: true, message: fill(text.deleted, { name: template.name }) };
      } catch (failure) {
        show(template.id);
        return { ok: false, message: errorText(failure, text.deleteError) };
      }
    },
    [reload, markDone, show],
  );

  return { templates, error: data ? undefined : error, isLoading, reload, rename, remove, hide, show };
}
