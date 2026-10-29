import { useCopy } from '@sistem/shared';
import { PageHeader } from '../../../../components/common/PageHeader/PageHeader';
import { Toast } from '../../../../components/common/Toast/Toast';
import { useToast } from '../../../../hooks/useToast';
import { PaymentsCard } from '../../components/PaymentsCard/PaymentsCard';
import { SendDefaultsSection } from '../../components/SendDefaultsSection/SendDefaultsSection';
import { coachSettingsCopy } from '../../copy';
import './CoachSettingsPage.css';

/** The coach's settings: what her trainees see about her (default messages, payment links). */
export function CoachSettingsPage() {
  const copy = useCopy(coachSettingsCopy);
  const { toastMessage, showToast } = useToast();
  return (
    <div className="coach-settings-page">
      <PageHeader title={copy.title} subtitle={copy.subtitle} />
      <SendDefaultsSection />
      <PaymentsCard onToast={showToast} />
      <Toast message={toastMessage} />
    </div>
  );
}
