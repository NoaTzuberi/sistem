import type { ReactNode } from 'react';
import { formatPortionCount } from '@sistem/shared';
import './PortionNumber.css';

interface PortionNumberProps {
  value: number;
  /** "eaten/goal": the goal follows, smaller (the parent styles .tn-portion-goal). */
  goal?: number;
  /** Between the value and the goal ('/' by default; ' / ' on the day total). */
  separator?: string;
  /** A sign in front ('+' on the "over" chip). */
  sign?: string;
  className?: string;
}

/**
 * THE way a portion count is drawn: '4½', '1/4½', '+1'. One left-to-right unit (<bdi dir="ltr">), so a
 * fraction never splits or flips inside Hebrew text. The number itself comes from formatPortionCount.
 */
export function PortionNumber({ value, goal, separator = '/', sign = '', className }: PortionNumberProps) {
  return (
    <bdi dir="ltr" className={'tn-portion-number' + (className ? ` ${className}` : '')}>
      {sign}
      {formatPortionCount(value)}
      {goal !== undefined && (
        <small className="tn-portion-goal">
          {separator}
          {formatPortionCount(goal)}
        </small>
      )}
    </bdi>
  );
}

interface TextWithNumberProps {
  /** A copy text with one {n}. */
  text: string;
  number: ReactNode;
}

/** A sentence with its {n} drawn by a node (a PortionNumber), e.g. "נשארו <3½> מנות". */
export function TextWithNumber({ text, number }: TextWithNumberProps) {
  const [before, after = ''] = text.split('{n}');
  return (
    <>
      {before}
      {number}
      {after}
    </>
  );
}
