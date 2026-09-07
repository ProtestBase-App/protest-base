import React from 'react';

import ConfirmDialogShell from '@/components/ui/ConfirmDialogShell';
import { t } from '@/utils/i18n';

interface CancelEventModalProps {
  visible: boolean;
  onDismiss: () => void;
  /** Confirm the cancellation. */
  onConfirm: () => Promise<void> | void;
  /** When true, the confirm button shows a spinner and is disabled. */
  submitting?: boolean;
}

/**
 * Confirmation dialog for cancelling an event.
 *
 * Kept deliberately simple — a centered card, not a full-screen route, so the
 * parent can handle the 409 "already cancelled" path without stacking
 * navigation state.
 */
export default function CancelEventModal({
  visible,
  onDismiss,
  onConfirm,
  submitting,
}: CancelEventModalProps) {
  return (
    <ConfirmDialogShell
      visible={visible}
      title={t('events.cancelConfirmTitle')}
      message={t('events.cancelConfirmMessage')}
      dismissLabel={t('events.keepActive')}
      onDismiss={onDismiss}
      confirmLabel={t('events.cancelAction')}
      onConfirm={() => {
        onConfirm();
      }}
      destructive
      submitting={submitting}
    />
  );
}
