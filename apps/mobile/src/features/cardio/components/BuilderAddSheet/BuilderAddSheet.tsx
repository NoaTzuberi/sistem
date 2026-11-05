import { cardioKindLabel, intensityZone, useCopy, useI18n } from '@sistem/shared';
import { BottomSheet } from '../../../../components/common/BottomSheet/BottomSheet';
import { BLOCK_PRESETS } from '../../data/ownCardioDraft';
import type { BlockPresetId } from '../../data/ownCardioDraft';
import { cardioCopy } from '../../copy';
import './BuilderAddSheet.css';

interface BuilderAddSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onPick: (preset: BlockPresetId) => void;
}

/** "+ קטע": quick presets (חימום 5′ · Z1 …) or an empty block. */
export function BuilderAddSheet({ isOpen, onClose, onPick }: BuilderAddSheetProps) {
  const copy = useCopy(cardioCopy).builder;
  const { language } = useI18n();
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} labelledBy="cb-add-title" className="confirm-sheet">
      <h2 className="cb-add-title display-title" id="cb-add-title">
        {copy.presetsTitle}
      </h2>
      <div className="cb-add-list">
        {BLOCK_PRESETS.map((preset) => {
          const isEmpty = preset.id === 'empty';
          return (
            <button
              key={preset.id}
              type="button"
              className={isEmpty ? 'cb-add-preset cb-add-preset-empty' : 'cb-add-preset cp-zone'}
              data-zone={isEmpty ? undefined : intensityZone(preset.intensity)}
              onClick={() => onPick(preset.id)}
            >
              <span className="cb-add-name">{isEmpty ? copy.presetEmpty : cardioKindLabel(preset.kind, language)}</span>
              {!isEmpty && (
                <span className="cb-add-meta">
                  <bdi dir="ltr">{preset.durationSec / 60}′</bdi> · <bdi dir="ltr">Z{intensityZone(preset.intensity)}</bdi>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
