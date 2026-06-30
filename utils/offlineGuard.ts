import { Alert } from 'react-native';
import { t } from '@/utils/i18n';

/**
 * Mutation guard for offline state.
 *
 * Call at the TOP of any handler that performs a network mutation
 * (create/edit/delete/publish). When offline it shows a clear Alert and
 * returns `false` so the caller can bail before firing a doomed request:
 *
 * ```ts
 * const { isOffline } = useConnectivity();
 * const handleSave = async () => {
 *   if (!assertOnlineOrAlert(isOffline)) return;
 *   // ...network mutation
 * };
 * ```
 *
 * Browse/read paths and optimistic local writes (saved events) are NOT guarded
 * — they work offline by design.
 */
export function assertOnlineOrAlert(isOffline: boolean): boolean {
  if (isOffline) {
    Alert.alert(t('common.error'), t('connectivity.actionUnavailableOffline'));
    return false;
  }
  return true;
}
