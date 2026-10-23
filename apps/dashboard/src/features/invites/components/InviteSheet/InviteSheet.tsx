import { useState } from 'react';
import type { FormEvent } from 'react';
import { dateFormat, fill, isolateAuto, useCopy, useI18n } from '@sistem/shared';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog/ConfirmDialog';
import { PillButton } from '../../../../components/common/PillButton/PillButton';
import { SideSheet } from '../../../../components/common/SideSheet/SideSheet';
import { StateLine } from '../../../../components/common/StateLine/StateLine';
import { invitesCopy } from '../../copy';
import { useInvites } from '../../hooks/useInvites';
import { LinkRow } from '../LinkRow/LinkRow';
import { QrCode } from '../QrCode/QrCode';
import './InviteSheet.css';

interface InviteSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

/** "+ Invite a trainee": her permanent link (+ QR, copy / share, regenerate, uses) and single-use personal links. */
export function InviteSheet({ isOpen, onClose }: InviteSheetProps) {
  const copy = useCopy(invitesCopy);
  const { language, plural } = useI18n();
  const invites = useInvites(isOpen);
  const [email, setEmail] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const until = (iso: string) => dateFormat(language, { dateStyle: 'medium' }).format(new Date(iso));

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await invites.createPersonal(email)) setEmail('');
  }

  return (
    <>
      <SideSheet
        isOpen={isOpen}
        onClose={onClose}
        title={copy.title}
        subtitle={copy.subtitle}
        footer={
          <PillButton variant="dark" onClick={onClose}>
            {copy.done}
          </PillButton>
        }
      >
        {invites.error ? (
          <StateLine error={invites.error} onRetry={invites.reload} />
        ) : !invites.permanent ? (
          <StateLine />
        ) : (
          <div className="invite-sheet">
            <section className="invite-section">
              <h3 className="invite-title">{copy.permanentTitle}</h3>
              <p className="invite-hint">{copy.permanentHint}</p>
              <div className="invite-permanent">
                <QrCode url={invites.permanent.url} label={copy.qrAlt} />
                <div className="invite-permanent-side">
                  <LinkRow url={invites.permanent.url} />
                  {invites.permanent.shortCode && (
                    <p className="invite-code">
                      <span>{copy.shortCode}</span>
                      <b className="invite-code-value" dir="ltr">
                        {invites.permanent.shortCode}
                      </b>
                    </p>
                  )}
                  <p className="invite-hint">
                    {invites.permanent.uses > 0 ? plural(copy.uses, invites.permanent.uses) : copy.noUses}
                  </p>
                  <PillButton size="sm" disabled={invites.isBusy} onClick={() => setIsConfirming(true)}>
                    {copy.regenerate}
                  </PillButton>
                </div>
              </div>
            </section>

            <section className="invite-section">
              <h3 className="invite-title">{copy.personalTitle}</h3>
              <p className="invite-hint">{copy.personalHint}</p>
              <form className="invite-personal-form" onSubmit={handleCreate} noValidate>
                <input
                  className="invite-email"
                  type="email"
                  dir="ltr"
                  autoComplete="off"
                  aria-label={copy.personalEmail}
                  placeholder={copy.personalEmail}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <PillButton variant="primary" size="sm" type="submit" disabled={invites.isBusy}>
                  {copy.personalCreate}
                </PillButton>
              </form>

              {invites.personal.length > 0 && (
                <ul className="invite-list" aria-label={copy.openLinks}>
                  {invites.personal.map((invite) => (
                    <li className="invite-item" key={invite.id}>
                      <p className="invite-item-meta">
                        <span>
                          {invite.targetEmail ? (
                            fill(copy.forEmail, { email: isolateAuto(invite.targetEmail) })
                          ) : (
                            copy.anyone
                          )}
                        </span>
                        {invite.expiresAt && <span className="invite-hint">{fill(copy.expires, { date: until(invite.expiresAt) })}</span>}
                      </p>
                      <LinkRow url={invite.url}>
                        <PillButton size="sm" variant="danger" disabled={invites.isBusy} onClick={() => invites.revoke(invite.id)}>
                          {copy.revoke}
                        </PillButton>
                      </LinkRow>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {invites.actionError && (
              <p className="invite-error" role="alert">
                {invites.actionError}
              </p>
            )}
          </div>
        )}
      </SideSheet>

      <ConfirmDialog
        isOpen={isConfirming}
        title={copy.regenerateTitle}
        text={copy.regenerateText}
        confirmLabel={copy.regenerate}
        cancelLabel={copy.cancel}
        onConfirm={() => {
          setIsConfirming(false);
          void invites.regenerate();
        }}
        onCancel={() => setIsConfirming(false)}
      />
    </>
  );
}
