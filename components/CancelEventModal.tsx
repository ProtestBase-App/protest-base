import React from 'react';

import SeriesScopeDialog from '@/components/SeriesScopeDialog';
import ConfirmDialogShell from '@/components/ui/ConfirmDialogShell';
import type { SeriesScope } from '@/types/eventSeries.types';
import { t } from '@/utils/i18n';

interface CancelEventModalProps {
  visible: boolean;
  onDismiss: () => void;
  /** Confirm the cancellation, of this event alone unless the series was chosen. */
  onConfirm: (scope: SeriesScope) => Promise<void> | void;
  /** When true, the confirm button shows a spinner and is disabled. */
  submitting?: boolean;
  /** One date of a recurring series: offers "this and all following events" too. */
  inSeries?: boolean;
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
  inSeries = false,
}: CancelEventModalProps) {
  if (inSeries) {
    return (
      <SeriesScopeDialog
        visible={visible}
        title={t('events.cancelConfirmTitle')}
        message={t('events.cancelConfirmMessage')}
        followingHint={t('series.dialogs.cancelFollowingHint')}
        dismissLabel={t('events.keepActive')}
        onDismiss={onDismiss}
        confirmLabel={t('events.cancelAction')}
        onConfirm={onConfirm}
        destructive
        submitting={submitting}
        testID="cancel-event-dialog"
      />
    );
  }

  return (
    <ConfirmDialogShell
      visible={visible}
      title={t('events.cancelConfirmTitle')}
      message={t('events.cancelConfirmMessage')}
      dismissLabel={t('events.keepActive')}
      onDismiss={onDismiss}
      confirmLabel={t('events.cancelAction')}
      onConfirm={() => {
        onConfirm('only');
      }}
      destructive
      submitting={submitting}
      testID="cancel-event-dialog"
    />
  );
}
