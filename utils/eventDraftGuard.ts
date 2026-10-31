import { Alert } from 'react-native';

import { clearEventDraft, getEventDraft } from '@/services/localStorageService';
import { t } from '@/utils/i18n';

/**
 * Runs `proceed` once the local draft may be replaced. There is one slot, and a new
 * form would autosave over it, so anything but Resume asks first.
 */
export async function confirmReplaceDraft(proceed: () => void): Promise<void> {
  const draft = await getEventDraft();
  if (!draft) {
    proceed();
    return;
  }

  Alert.alert(t('draft.replaceTitle'), t('draft.replaceMessage'), [
    { text: t('common.cancel'), style: 'cancel' },
    {
      text: t('draft.replaceConfirm'),
      style: 'destructive',
      onPress: async () => {
        await clearEventDraft();
        proceed();
      },
    },
  ]);
}
