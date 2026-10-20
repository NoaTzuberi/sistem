import { titleRuns } from '../../data/cardioText';
import './CardioTitle.css';

interface CardioTitleProps {
  title: string;
  /** The heading level and size come from the caller. */
  as?: 'h1' | 'p';
  className?: string;
}

/** A Karantina title whose Latin / number runs ("1:1") are set in Barlow italic (bidi-isolated). */
export function CardioTitle({ title, as: Tag = 'h1', className }: CardioTitleProps) {
  return (
    <Tag className={['cp-title', className].filter(Boolean).join(' ')} dir="auto">
      {titleRuns(title).map((run, index) =>
        run.latin ? (
          <bdi key={index} className="cp-title-latin" dir="ltr">
            {run.text}
          </bdi>
        ) : (
          <span key={index}>{run.text}</span>
        ),
      )}
    </Tag>
  );
}
