import { fill, useCopy, useLoad } from '@sistem/shared';
import { getPayment } from '../../../../services/coach/coachService';
import { openExternal } from '../../../../services/external/openExternal';
import { coachCopy } from '../../copy';
import { dashboardLinks } from '../../data/dashboardLinks';
import { CoachCard } from '../CoachCard/CoachCard';

// The provider names are brands, the same in every language.
const PAYBOX = 'PayBox';
const BIT = 'Bit';

/** "תשלומים": which payment details her trainees see; "עריכה" opens the dashboard's Settings. */
export function PaymentsCard() {
  const copy = useCopy(coachCopy).profile;
  const { data } = useLoad(getPayment, '');
  const settings = dashboardLinks.settings();
  const methods = data ? [data.payboxUrl ? PAYBOX : null, data.bitPhone ? BIT : null].filter(Boolean) : [];

  return (
    <CoachCard
      title={copy.payments}
      action={
        settings && (
          <button type="button" className="coach-link" onClick={() => openExternal(settings)}>
            {copy.edit}
          </button>
        )
      }
    >
      <p className="coach-card-text">
        {copy.paymentsText}
        {data && (
          <>
            <br />
            {methods.length > 0 ? fill(copy.paymentsSet, { methods: methods.join(' · ') }) : copy.paymentsNone}
          </>
        )}
      </p>
    </CoachCard>
  );
}
