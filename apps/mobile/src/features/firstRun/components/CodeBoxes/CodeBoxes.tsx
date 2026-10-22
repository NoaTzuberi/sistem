import type { ClipboardEvent, KeyboardEvent, MutableRefObject } from 'react';
import { fill, useCopy } from '@sistem/shared';
import { firstRunCopy } from '../../copy';
import './CodeBoxes.css';

interface CodeBoxesProps {
  boxes: string[];
  refs: MutableRefObject<(HTMLInputElement | null)[]>;
  invalid: boolean;
  /** Changes on every refusal: the shake plays again. */
  shakeKey: number;
  errorId: string;
  onChange: (index: number, value: string) => void;
  onKeyDown: (index: number, event: KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (event: ClipboardEvent<HTMLInputElement>) => void;
}

/** The coach code: 6 boxes, always left to right (a Latin code), a labelled group. */
export function CodeBoxes({ boxes, refs, invalid, shakeKey, errorId, onChange, onKeyDown, onPaste }: CodeBoxesProps) {
  const copy = useCopy(firstRunCopy);
  return (
    <div
      key={invalid ? `err-${shakeKey}` : 'ok'}
      className="fr-code"
      role="group"
      aria-label={copy.code.groupLabel}
      aria-describedby={invalid ? errorId : undefined}
      data-invalid={invalid || undefined}
      dir="ltr"
    >
      {boxes.map((value, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          className="fr-code-box"
          value={value}
          inputMode="text"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint={index === boxes.length - 1 ? 'go' : 'next'}
          aria-label={fill(copy.code.charLabel, { n: index + 1 })}
          aria-invalid={invalid || undefined}
          onChange={(event) => onChange(index, event.target.value)}
          onKeyDown={(event) => onKeyDown(index, event)}
          onPaste={onPaste}
          onFocus={(event) => event.target.select()}
        />
      ))}
    </div>
  );
}
