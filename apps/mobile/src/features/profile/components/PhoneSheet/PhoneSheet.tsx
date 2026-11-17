import { IconPhone } from '@tabler/icons-react';
import { useCopy } from '@sistem/shared';
import { ConfirmSheet } from '../../../../components/common/ConfirmSheet/ConfirmSheet';
import { Input } from '../../../../components/common/Input/Input';
import type { PhoneSetting } from '../../hooks/usePhoneSetting';
import { profileCopy } from '../../copy';
import './PhoneSheet.css';

/** Settings → טלפון: one field, Save, and "remove the number" when one is saved. */
export function PhoneSheet({ setting }: { setting: PhoneSetting }) {
  const copy = useCopy(profileCopy).phone;
  return (
    <ConfirmSheet
      isOpen={setting.isOpen}
      icon={<IconPhone size={22} />}
      title={copy.title}
      message={copy.hint}
      confirmLabel={copy.save}
      onConfirm={() => void setting.save()}
      onCancel={setting.close}
      isWorking={setting.isSaving}
      secondary={setting.phone ? { label: copy.clear, onClick: () => void setting.clear(), tone: 'destructive' } : undefined}
    >
      <div className="phone-sheet-field">
        <Input
          label={copy.label}
          type="tel"
          inputMode="tel"
          dir="ltr"
          autoComplete="tel"
          enterKeyHint="done"
          value={setting.draft}
          error={setting.error}
          onChange={(event) => setting.setDraft(event.target.value)}
        />
      </div>
    </ConfirmSheet>
  );
}
