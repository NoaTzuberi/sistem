import type { FoodGroup } from '@sistem/types';

// The portion groups' glyphs (protein = molecule, carbs = wheat, fat = drop, snack = cookie) — the same drawings
// as the trainee app's portion bars (apps/mobile/src/features/nutrition/components/groupIcons.tsx). Drawn in
// currentColor — the parent sets the color. Vegetables have none.

export function ProteinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 8.5L7.5 15M12 8.5L16.5 15M8.6 17H15.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="6" r="2.6" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="6" cy="17.5" r="2.6" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="17.5" r="2.6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function CarbIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 6C11 5 11 3.2 12 2C13 3.2 13 5 12 6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path
        d="M12 10.5C9.6 10.5 8 8.9 8 6.5C10.4 6.5 12 8.1 12 10.5ZM12 10.5C14.4 10.5 16 8.9 16 6.5C13.6 6.5 12 8.1 12 10.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 15C9.6 15 8 13.4 8 11C10.4 11 12 12.6 12 15ZM12 15C14.4 15 16 13.4 16 11C13.6 11 12 12.6 12 15Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 19.5C9.6 19.5 8 17.9 8 15.5C10.4 15.5 12 17.1 12 19.5ZM12 19.5C14.4 19.5 16 17.9 16 15.5C13.6 15.5 12 17.1 12 19.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3C15.5 7.5 18 10.8 18 14A6 6 0 0 1 6 14C6 10.8 8.5 7.5 12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9.5 14.5A2.5 2.5 0 0 0 12 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function SnackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20.5 12.5A8.5 8.5 0 1 1 11.5 3.5A3 3 0 0 0 15.5 7.5A3 3 0 0 0 20.5 12.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="10" r="1.2" fill="currentColor" />
      <circle cx="14" cy="15" r="1.2" fill="currentColor" />
      <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

const GROUP_ICONS: Partial<Record<FoodGroup, () => React.JSX.Element>> = {
  protein: ProteinIcon,
  carb: CarbIcon,
  fat: FatIcon,
  snack: SnackIcon,
};

/** The group's glyph, or nothing (vegetables). */
export function GroupIcon({ group }: { group: FoodGroup }) {
  const Icon = GROUP_ICONS[group];
  return Icon ? <Icon /> : null;
}
