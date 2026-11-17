import { sharedCopy, useCopy } from '@sistem/shared';
import { onboardingCopy } from '../../copy';
import { Input } from '../../../../components/common/Input/Input';
import { SelectableChip } from '../../components/SelectableChip/SelectableChip';
import type { OnboardingFormState } from '../../types';
import './BasicProfileStep.css';

const GENDER_IDS = ['male', 'female', 'other'] as const;

interface BasicProfileStepProps {
  formState: OnboardingFormState;
  updateFormState: (patch: Partial<OnboardingFormState>) => void;
}

export function BasicProfileStep({ formState, updateFormState }: BasicProfileStepProps) {
  const copy = useCopy(onboardingCopy).basicProfile;
  const shared = useCopy(sharedCopy);
  return (
    <>
      <div className="basic-profile-fields">
        <Input
          label={copy.name}
          dir="auto"
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="next"
          value={formState.name}
          onChange={(event) => updateFormState({ name: event.target.value })}
        />
        <Input
          label={copy.birthDate}
          type="date"
          autoComplete="bday"
          value={formState.birthDate}
          onChange={(event) => updateFormState({ birthDate: event.target.value })}
        />
        <Input
          label={copy.height}
          type="number"
          inputMode="decimal"
          enterKeyHint="next"
          value={formState.height}
          onChange={(event) => updateFormState({ height: event.target.value })}
        />
        <Input
          label={copy.weight}
          type="number"
          inputMode="decimal"
          enterKeyHint="next"
          value={formState.weight}
          onChange={(event) => updateFormState({ weight: event.target.value })}
        />
        <Input
          label={copy.phone}
          type="tel"
          inputMode="tel"
          dir="ltr"
          autoComplete="tel"
          enterKeyHint="done"
          helperText={copy.phoneHint}
          value={formState.phone}
          onChange={(event) => updateFormState({ phone: event.target.value })}
        />
      </div>

      {/* Chips, not a native dropdown: its popup opened in the wrong place on the moving card. */}
      <div className="basic-profile-group" role="group" aria-label={copy.gender}>
        <span className="text-label">{copy.gender}</span>
        <div className="basic-profile-chips">
          {GENDER_IDS.map((gender) => (
            <SelectableChip
              key={gender}
              label={shared.onboardingOptions.gender[gender]}
              selected={formState.gender === gender}
              // Optional: tapping the chosen one clears it.
              onClick={() => updateFormState({ gender: formState.gender === gender ? '' : gender })}
            />
          ))}
        </div>
      </div>

      <div className="basic-profile-group">
        <span className="text-label">{copy.preferredUnits}</span>
        <div className="basic-profile-chips">
          <SelectableChip
            label={shared.units.kg}
            selected={formState.units.weight === 'kg'}
            onClick={() => updateFormState({ units: { ...formState.units, weight: 'kg' } })}
          />
          <SelectableChip
            label={shared.units.lb}
            selected={formState.units.weight === 'lb'}
            onClick={() => updateFormState({ units: { ...formState.units, weight: 'lb' } })}
          />
          <SelectableChip
            label={shared.units.km}
            selected={formState.units.distance === 'km'}
            onClick={() => updateFormState({ units: { ...formState.units, distance: 'km' } })}
          />
          <SelectableChip
            label={shared.units.miles}
            selected={formState.units.distance === 'miles'}
            onClick={() => updateFormState({ units: { ...formState.units, distance: 'miles' } })}
          />
        </div>
      </div>
    </>
  );
}
