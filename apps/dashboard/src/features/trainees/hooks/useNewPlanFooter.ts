import { fill, formatPlural, formatWeekSpan, useCopy, useLanguage } from '@sistem/shared';
import type { Language } from '@sistem/types';
import { rangeWeeks } from '../data/newPlanConflicts';
import { traineesCopy } from '../copy';
import type { NewPlanPopoverState } from './useNewPlanPopover';

export interface FooterAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface NewPlanFooter {
  /** The pink pill. */
  primary: FooterAction;
  /** The soft pill under it: start over instead of the draft(s) — it asks first. */
  replace: FooterAction | null;
  /** The orange notice line above the buttons. */
  note: string | null;
  /** Stacked footer (primary, soft pill, small text "ביטול") instead of the create row. */
  isStacked: boolean;
  /** The start-method cards: off only when the week opens a plan that can't be replaced. */
  methodsDisabled: boolean;
  /** "הבחירה תשמש אם תבחרי להתחיל מחדש" under the start methods. */
  showChoiceHint: boolean;
  /** The weeks a multi-week plan covers (their cards get an outline); empty for a weekly plan. */
  rangeWeeks: Set<string>;
}

/** '15–21 בנוב׳ ו־22–28 בנוב׳' — the weeks of the drafts, as one phrase. */
export function listWeekSpans(weeks: string[], language: Language): string {
  return new Intl.ListFormat(language, { type: 'conjunction' }).format(weeks.map((week) => formatWeekSpan(week, language)));
}

/**
 * The popover's footer for the chosen week (+ length), from the conflicts the server listed
 * (newPlanSituation): create · open the draft / start over instead · open the published plan ·
 * multi-week over drafts (pick another start / replace them) · multi-week over a published week.
 */
export function useNewPlanFooter(popover: NewPlanPopoverState): NewPlanFooter {
  const language = useLanguage();
  const copy = useCopy(traineesCopy);
  const text = copy.newPlanFooter;
  const { situation, method, week, length, blockWeeks } = popover;
  const isBlock = length === 'block';
  const busy = popover.isCreating;
  const needsSource = method === 'duplicate' && !popover.source;
  const createLabel = isBlock ? formatPlural(language, text.createBlock, blockWeeks) : text.create;
  const create: FooterAction = { label: createLabel, onClick: () => void popover.confirm(), disabled: !week || busy || needsSource };
  const covered = new Set(isBlock && week ? rangeWeeks(week.weekStartDate, length, blockWeeks) : []);
  const base = { replace: null, note: null, isStacked: false, methodsDisabled: false, showChoiceHint: false, rangeWeeks: covered };

  switch (situation.kind) {
    case 'none':
      return { ...base, primary: { ...create, disabled: true } };
    case 'create':
      return { ...base, primary: create };
    case 'draft':
      return {
        ...base,
        primary: { label: text.openDraft, onClick: popover.openExisting, disabled: busy },
        replace: situation.canReplace ? { label: text.replaceWith[method], onClick: popover.askReplace, disabled: busy || needsSource } : null,
        note: situation.canReplace ? text.draftNote : text.fixedDraftNote,
        isStacked: true,
        methodsDisabled: !situation.canReplace,
        showChoiceHint: situation.canReplace,
      };
    case 'published':
      return {
        ...base,
        primary: { label: text.openPublished, onClick: popover.openExisting, disabled: busy },
        note: text.publishedNote,
        methodsDisabled: true,
      };
    case 'blockDrafts':
      return {
        ...base,
        primary: { label: text.pickOtherStart, onClick: popover.focusWeeks, disabled: busy },
        replace: { label: formatPlural(language, text.replaceDrafts, situation.weeks.length), onClick: popover.askReplace, disabled: busy || needsSource },
        note: fill(formatPlural(language, text.blockDraftsNote, situation.weeks.length), { weeks: listWeekSpans(situation.weeks, language) }),
        isStacked: true,
      };
    case 'blockTaken':
      return {
        ...base,
        primary: { ...create, disabled: true },
        note: fill(situation.isPublished ? text.blockPublishedNote : text.blockTakenNote, { week: formatWeekSpan(situation.weekStartDate, language) }),
      };
  }
}
