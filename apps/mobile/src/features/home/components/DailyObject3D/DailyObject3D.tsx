import { useRef, useState } from 'react';
import { IconArrowsHorizontal } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { useDailyObjectScene } from '../../hooks/useDailyObjectScene';
import { objectOfDay } from '../../data/objects/objectOfDay';
import { OBJECT_RENDERS } from '../../data/objects/objectRenders';
import { homeCopy } from '../../copy';
import './DailyObject3D.css';

/**
 * The live "object of the day" on the Home stage — a different training object for each day of the
 * week (her device's day). Decorative: hidden from screen readers. The object's static render shows
 * while three.js loads, and stays when WebGL is not available.
 */
export function DailyObject3D() {
  const copy = useCopy(homeCopy);
  const containerRef = useRef<HTMLDivElement>(null);
  // Picked once per visit: Home remounts on every visit, so a new day shows the next time she opens it.
  const [objectId] = useState(objectOfDay);
  const status = useDailyObjectScene(containerRef, objectId);

  return (
    <div className={`daily-object daily-object-${status}`} ref={containerRef} aria-hidden="true">
      {status !== 'ready' && <img className="daily-object-fallback" src={OBJECT_RENDERS[objectId]} alt="" draggable={false} />}
      <span className="daily-object-label">
        <IconArrowsHorizontal className="daily-object-drag-icon" size={14} stroke={2} />
        <span>
          {copy.stage.objectToday} <b className="daily-object-name">{copy.stage.objects[objectId]}</b>
        </span>
      </span>
    </div>
  );
}
