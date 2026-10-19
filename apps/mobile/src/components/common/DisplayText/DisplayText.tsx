import { splitNumbers } from './splitNumbers';
import './DisplayText.css';

interface DisplayTextProps {
  text: string;
}

/**
 * A display heading's text with its numbers set in Barlow Condensed italic 800 and the words in the
 * heading's own face (Karantina in Hebrew): "25 אימונים", "אוקטובר 2026". Goes INSIDE one heading element.
 * Each number is a left-to-right isolate, so "11–17" never flips and the Hebrew order around it holds.
 */
export function DisplayText({ text }: DisplayTextProps) {
  return (
    <>
      {splitNumbers(text).map((run, index) =>
        run.isNumber ? (
          <bdi key={index} className="display-number" dir="ltr">
            {run.text}
          </bdi>
        ) : (
          run.text
        ),
      )}
    </>
  );
}
