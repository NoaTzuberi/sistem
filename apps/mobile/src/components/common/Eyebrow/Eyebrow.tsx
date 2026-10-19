import './Eyebrow.css';

interface EyebrowProps {
  /** Latin, uppercase (from appCopy.eyebrow — the same in both languages). */
  children: string;
  /** In English the eyebrow usually repeats its label, so it is hidden there; set this when it adds something (a date). */
  keepInEnglish?: boolean;
}

/**
 * The small mono "eyebrow" next to a Hebrew label (WEEK, COACH, NEXT GOAL…). Decoration only: hidden from
 * screen readers and never the only label — the Hebrew text next to it carries the meaning.
 */
export function Eyebrow({ children, keepInEnglish = false }: EyebrowProps) {
  return (
    <span className={'eyebrow' + (keepInEnglish ? ' eyebrow-keep' : '')} aria-hidden="true">
      {children}
    </span>
  );
}
