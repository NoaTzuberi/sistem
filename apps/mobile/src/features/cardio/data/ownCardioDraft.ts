import type { CardioBlock, CardioBlockKind, CardioRepeatSet, CardioSport, CardioStep } from '@sistem/types';

// Her own cardio workout while she builds it (pure). The limits mirror the server's (cardio.constants):
// the server checks them again on save.

export const CARDIO_SPORTS: CardioSport[] = ['run', 'intervals', 'walk', 'bike'];
export const BLOCK_KINDS: CardioBlockKind[] = ['warmup', 'steady', 'work', 'recovery', 'cooldown'];
export const MIN_BLOCK_SEC = 15;
export const MAX_BLOCK_SEC = 90 * 60;
export const MIN_TIMES = 1;
export const MAX_TIMES = 30;
export const MIN_INTENSITY = 1;
export const MAX_INTENSITY = 10;
export const MAX_STEPS = 40;
export const MAX_REPEAT_BLOCKS = 10;
export const MAX_TITLE_LENGTH = 60;

let counter = 0;
function newId(): string {
  counter += 1;
  return `s${Date.now().toString(36)}${counter}`;
}

export function newBlock(kind: CardioBlockKind = 'steady', durationSec = 300, intensity = 5): CardioBlock {
  return { type: 'block', id: newId(), kind, durationSec, intensity };
}

/** A repeat set starts as 4 × (1 min work, 1:30 recovery) — she changes it right away. */
export function newRepeat(): CardioRepeatSet {
  return { type: 'repeat', id: newId(), times: 4, blocks: [newBlock('work', 60, 8), newBlock('recovery', 90, 3)] };
}

/** A new workout: one warm-up block to start from. */
export function initialSteps(): CardioStep[] {
  return [newBlock('warmup', 300, 3)];
}

/** Duration steps: 15 s up to 5 min, then whole minutes. */
export function stepDuration(sec: number, direction: 1 | -1): number {
  const step = sec > 300 || (sec === 300 && direction === 1) ? 60 : 15;
  return Math.min(MAX_BLOCK_SEC, Math.max(MIN_BLOCK_SEC, sec + direction * step));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** A block anywhere (top level or inside a repeat) changed. */
export function updateBlock(steps: CardioStep[], blockId: string, patch: Partial<Omit<CardioBlock, 'type' | 'id'>>): CardioStep[] {
  return steps.map((step) =>
    step.type === 'block'
      ? step.id === blockId
        ? { ...step, ...patch }
        : step
      : { ...step, blocks: step.blocks.map((block) => (block.id === blockId ? { ...block, ...patch } : block)) },
  );
}

/** Removes a step or a block inside a repeat (a repeat left empty goes too). */
export function removeStep(steps: CardioStep[], id: string): CardioStep[] {
  return steps
    .filter((step) => step.id !== id)
    .map((step) => (step.type === 'repeat' ? { ...step, blocks: step.blocks.filter((block) => block.id !== id) } : step))
    .filter((step) => step.type === 'block' || step.blocks.length > 0);
}

export function setTimes(steps: CardioStep[], repeatId: string, times: number): CardioStep[] {
  return steps.map((step) => (step.type === 'repeat' && step.id === repeatId ? { ...step, times: clamp(times, MIN_TIMES, MAX_TIMES) } : step));
}

export function addBlockToRepeat(steps: CardioStep[], repeatId: string): CardioStep[] {
  return steps.map((step) =>
    step.type === 'repeat' && step.id === repeatId && step.blocks.length < MAX_REPEAT_BLOCKS ? { ...step, blocks: [...step.blocks, newBlock('work', 60, 7)] } : step,
  );
}

/** "m:ss" for the duration stepper (always Latin digits, isolated by the caller). */
export function formatDuration(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// The builder's timeline (redesign 2026-11-03): insert after the selected block, duplicate, reorder,
// quick presets, starter templates. All pure; the hook keeps the state.
// ---------------------------------------------------------------------------

/** Where a step / block lives: top level (repeatId null) or inside a repeat set. */
export function locate(steps: CardioStep[], id: string): { repeatId: string | null; index: number } | null {
  const top = steps.findIndex((step) => step.id === id);
  if (top >= 0) return { repeatId: null, index: top };
  for (const step of steps) {
    if (step.type !== 'repeat') continue;
    const inner = step.blocks.findIndex((block) => block.id === id);
    if (inner >= 0) return { repeatId: step.id, index: inner };
  }
  return null;
}

/**
 * Puts a new step right after `afterId` (else at the end). A block after a block inside a repeat set goes
 * into that set (while it has room); a repeat set never nests — it goes after the set.
 */
export function insertStep(steps: CardioStep[], afterId: string | null, step: CardioStep): CardioStep[] {
  const at = afterId ? locate(steps, afterId) : null;
  if (!at) return [...steps, step];
  if (at.repeatId && step.type === 'block') {
    const repeat = steps.find((item) => item.id === at.repeatId);
    if (repeat?.type === 'repeat' && repeat.blocks.length < MAX_REPEAT_BLOCKS) {
      return steps.map((item) =>
        item.id === at.repeatId && item.type === 'repeat'
          ? { ...item, blocks: [...item.blocks.slice(0, at.index + 1), step, ...item.blocks.slice(at.index + 1)] }
          : item,
      );
    }
  }
  const topIndex = at.repeatId ? steps.findIndex((item) => item.id === at.repeatId) : at.index;
  return [...steps.slice(0, topIndex + 1), step, ...steps.slice(topIndex + 1)];
}

function copyBlock(block: CardioBlock): CardioBlock {
  return { ...block, id: newId() };
}

/** A copy (new ids) right after the original. Returns the steps and the copy's id. */
export function duplicateStep(steps: CardioStep[], id: string): { steps: CardioStep[]; copyId: string | null } {
  const at = locate(steps, id);
  if (!at) return { steps, copyId: null };
  if (at.repeatId) {
    const repeat = steps.find((item) => item.id === at.repeatId);
    if (repeat?.type !== 'repeat' || repeat.blocks.length >= MAX_REPEAT_BLOCKS) return { steps, copyId: null };
    const copy = copyBlock(repeat.blocks[at.index]);
    return { steps: insertStep(steps, id, copy), copyId: copy.id };
  }
  const original = steps[at.index];
  const copy: CardioStep = original.type === 'block' ? copyBlock(original) : { ...original, id: newId(), blocks: original.blocks.map(copyBlock) };
  return { steps: insertStep(steps, id, copy), copyId: copy.id };
}

function move<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Both in the same list (the top level, or the same repeat set) — the only moves drag and drop allows. */
export function inSameList(steps: CardioStep[], a: string, b: string): boolean {
  const first = locate(steps, a);
  const second = locate(steps, b);
  return first !== null && second !== null && first.repeatId === second.repeatId;
}

/** Drag and drop: only inside the same list (the top level, or one repeat set). */
export function reorderStep(steps: CardioStep[], activeId: string, overId: string): CardioStep[] {
  const from = locate(steps, activeId);
  const to = locate(steps, overId);
  if (!from || !to || from.repeatId !== to.repeatId || from.index === to.index) return steps;
  if (from.repeatId === null) return move(steps, from.index, to.index);
  return steps.map((step) => (step.id === from.repeatId && step.type === 'repeat' ? { ...step, blocks: move(step.blocks, from.index, to.index) } : step));
}

/** "+ קטע" quick presets: kind, length, effort. "empty" = a plain block to set herself. */
export const BLOCK_PRESETS = [
  { id: 'warmup', kind: 'warmup', durationSec: 300, intensity: 3 },
  { id: 'work', kind: 'work', durationSec: 180, intensity: 8 },
  { id: 'recovery', kind: 'recovery', durationSec: 120, intensity: 3 },
  { id: 'cooldown', kind: 'cooldown', durationSec: 300, intensity: 2 },
  { id: 'empty', kind: 'steady', durationSec: 300, intensity: 5 },
] as const satisfies readonly { id: string; kind: CardioBlockKind; durationSec: number; intensity: number }[];

export type BlockPresetId = (typeof BLOCK_PRESETS)[number]['id'];

export function presetBlock(id: BlockPresetId): CardioBlock {
  const preset = BLOCK_PRESETS.find((item) => item.id === id) ?? BLOCK_PRESETS[4];
  return newBlock(preset.kind, preset.durationSec, preset.intensity);
}

function repeat(times: number, blocks: CardioBlock[]): CardioRepeatSet {
  return { type: 'repeat', id: newId(), times, blocks };
}

/** "התחלה מתבנית" — three starters (a new workout only); she edits them like any blocks. */
export const CARDIO_TEMPLATES = {
  easy: { sport: 'run', build: (): CardioStep[] => [newBlock('warmup', 300, 3), newBlock('steady', 1200, 4), newBlock('cooldown', 300, 2)] },
  intervals: {
    sport: 'intervals',
    build: (): CardioStep[] => [newBlock('warmup', 300, 3), repeat(6, [newBlock('work', 60, 8), newBlock('recovery', 60, 3)]), newBlock('cooldown', 300, 2)],
  },
  tempo: {
    sport: 'run',
    build: (): CardioStep[] => [newBlock('warmup', 300, 3), repeat(3, [newBlock('work', 480, 7), newBlock('recovery', 120, 3)]), newBlock('cooldown', 300, 2)],
  },
} as const satisfies Record<string, { sport: CardioSport; build: () => CardioStep[] }>;

export type CardioTemplateId = keyof typeof CARDIO_TEMPLATES;
export const CARDIO_TEMPLATE_IDS = Object.keys(CARDIO_TEMPLATES) as CardioTemplateId[];

/** The first block of a step (a repeat set opens on its first block). */
export function firstBlockId(step: CardioStep): string {
  return step.type === 'block' ? step.id : (step.blocks[0]?.id ?? step.id);
}
