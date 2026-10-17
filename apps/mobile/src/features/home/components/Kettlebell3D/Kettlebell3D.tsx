import { useRef } from 'react';
import { IconArrowsHorizontal } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { useKettlebellScene } from '../../hooks/useKettlebellScene';
import { homeCopy } from '../../copy';
import kettlebellRender from '../../assets/kettlebell.png';
import './Kettlebell3D.css';

/** The print on the iron is part of the object (like a real bell's casting), not UI text. */
const LABEL_UNIT = 'KG';

interface Kettlebell3DProps {
  /** kg printed on the bell. */
  weight: number;
}

/**
 * The live cast-iron kettlebell on the Home stage (the brand mark). Decorative: hidden from screen
 * readers. The static render shows while three.js loads, and stays when WebGL is not available.
 */
export function Kettlebell3D({ weight }: Kettlebell3DProps) {
  const copy = useCopy(homeCopy);
  const containerRef = useRef<HTMLDivElement>(null);
  const status = useKettlebellScene(containerRef, `${weight} ${LABEL_UNIT}`);

  return (
    <div className={`kettlebell kettlebell-${status}`} ref={containerRef} aria-hidden="true">
      {status !== 'ready' && <img className="kettlebell-fallback" src={kettlebellRender} alt="" draggable={false} />}
      <span className="kettlebell-hint">
        <IconArrowsHorizontal size={14} stroke={2} />
        {copy.stage.dragToRotate}
      </span>
    </div>
  );
}
