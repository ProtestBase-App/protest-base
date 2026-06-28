/**
 * OfflineBanner Tests
 *
 * The banner renders nothing while online (so it never intercepts touches), the
 * offline message while offline, and auto-dismisses when connectivity returns.
 */
import React from 'react';
import { renderWithProviders } from '@/test-utils/render';
import { OfflineBanner } from '@/components/connection/OfflineBanner';
import { useConnectivity } from '@/context/ConnectivityProvider';
import { t } from '@/utils/i18n';

describe('OfflineBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when online', () => {
    const { queryByText } = renderWithProviders(<OfflineBanner />, {
      providerOverrides: { connectivityContext: { isOffline: false } },
    });

    expect(queryByText(t('connectivity.banner'))).toBeNull();
  });

  it('renders the offline message when offline', () => {
    const { getByText } = renderWithProviders(<OfflineBanner />, {
      providerOverrides: { connectivityContext: { isOffline: true } },
    });

    expect(getByText(t('connectivity.banner'))).toBeTruthy();
  });

  it('auto-dismisses when connectivity is restored', () => {
    const { queryByText, rerender } = renderWithProviders(<OfflineBanner />, {
      providerOverrides: { connectivityContext: { isOffline: true } },
    });

    expect(queryByText(t('connectivity.banner'))).toBeTruthy();

    // Reconnect: flip the mocked hook to online and re-render in place.
    (useConnectivity as jest.Mock).mockReturnValue({
      isOffline: false,
      isConnected: true,
      isInternetReachable: true,
    });
    rerender(<OfflineBanner />);

    expect(queryByText(t('connectivity.banner'))).toBeNull();
  });
});
