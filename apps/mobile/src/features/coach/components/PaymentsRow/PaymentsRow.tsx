import { IconChevronLeft, IconCreditCard } from '@tabler/icons-react';
import { fill, useCopy, useLoad } from '@sistem/shared';
import { getPayment } from '../../../../services/coach/coachService';
import { openExternal } from '../../../../services/external/openExternal';
import { coachCopy } from '../../copy';
import { dashboardLinks } from '../../data/dashboardLinks';
import { ProfileRow } from '../ProfileRow/ProfileRow';
import './PaymentsRow.css';

// The provider names are brands, the same in every language.
const PAYBOX = 'PayBox';
const BIT = 'Bit';

/** "קישורי תשלום": which payment details her trainees see; the row opens the dashboard's Settings to edit them. */
export function PaymentsRow() {
  const copy = useCopy(coachCopy).profile;
  const { data } = useLoad(getPayment, '');
  const settings = dashboardLinks.settings();
  const methods = data ? [data.payboxUrl ? PAYBOX : null, data.bitPhone ? BIT : null].filter(Boolean) : [];
  const sub = !data ? null : methods.length > 0 ? (
    fill(copy.paymentsSet, { methods: methods.join(' · ') })
  ) : (
    <>
      <bdi dir="ltr">{`${PAYBOX} / ${BIT}`}</bdi> · {copy.paymentsNone}
    </>
  );

  return (
    <ProfileRow
      icon={<IconCreditCard size={20} />}
      label={copy.paymentsRow}
      sub={sub}
      onClick={settings ? () => openExternal(settings) : undefined}
      trailing={
        settings && (
          <span className="cp-trail">
            {copy.edit}
            <IconChevronLeft className="flip-rtl" size={16} aria-hidden="true" />
          </span>
        )
      }
    />
  );
}
