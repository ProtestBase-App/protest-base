/**
 * Tests for utils/offlineGuard.ts
 *
 * The guard is the single guarantee that mutation handlers don't fire a doomed
 * request while offline: it alerts and returns false offline, true online.
 */

import { Alert } from 'react-native';
import { assertOnlineOrAlert } from '@/utils/offlineGuard';
import { t } from '@/utils/i18n';

describe('assertOnlineOrAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false and shows an alert when offline', () => {
    const result = assertOnlineOrAlert(true);

    expect(result).toBe(false);
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(Alert.alert).toHaveBeenCalledWith(
      t('common.error'),
      t('connectivity.actionUnavailableOffline')
    );
  });

  it('returns true and shows no alert when online', () => {
    const result = assertOnlineOrAlert(false);

    expect(result).toBe(true);
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});
