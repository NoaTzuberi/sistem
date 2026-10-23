import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { IconCamera, IconPhoto } from '@tabler/icons-react';
import './PhotoSourceTiles.css';

interface PhotoSourceTilesProps {
  labels: { camera: string; cameraHint: string; gallery: string; galleryHint: string };
  onPick: (file: File) => void;
  disabled?: boolean;
}

/**
 * The two big photo sources (meal photos, progress photos): "Camera" (ink, opens the camera) and
 * "Gallery" (soft, an existing photo). Real file inputs behind the tiles; the caller compresses.
 */
export function PhotoSourceTiles({ labels, onPick, disabled }: PhotoSourceTilesProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onPick(file);
  }

  return (
    <div className="photo-tiles">
      <button type="button" className="photo-tile" data-tone="camera" onClick={() => cameraRef.current?.click()} disabled={disabled}>
        <span className="photo-tile-icon" aria-hidden="true">
          <IconCamera size={22} />
        </span>
        <span className="photo-tile-text">
          <span className="photo-tile-title">{labels.camera}</span>
          <small className="photo-tile-hint">{labels.cameraHint}</small>
        </span>
      </button>
      <button type="button" className="photo-tile" data-tone="gallery" onClick={() => galleryRef.current?.click()} disabled={disabled}>
        <span className="photo-tile-icon" aria-hidden="true">
          <IconPhoto size={22} />
        </span>
        <span className="photo-tile-text">
          <span className="photo-tile-title">{labels.gallery}</span>
          <small className="photo-tile-hint">{labels.galleryHint}</small>
        </span>
      </button>
      {/* `capture` opens the camera directly; without it the phone offers its photo library. */}
      <input ref={cameraRef} className="photo-tiles-input" type="file" accept="image/*" capture="environment" onChange={handleChange} tabIndex={-1} aria-hidden="true" />
      <input ref={galleryRef} className="photo-tiles-input" type="file" accept="image/*" onChange={handleChange} tabIndex={-1} aria-hidden="true" />
    </div>
  );
}
