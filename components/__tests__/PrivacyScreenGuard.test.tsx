import { Platform } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import * as ScreenCapture from 'expo-screen-capture';

import { PrivacyScreenGuard } from '@/components/PrivacyScreenGuard';
import { screenCaptureProtectionEnabled } from '@/utils/featureFlags';

jest.mock('@/utils/featureFlags', () => ({
  screenCaptureProtectionEnabled: jest.fn(),
}));

const mockEnabled = screenCaptureProtectionEnabled as jest.Mock;
const mockPrevent = ScreenCapture.preventScreenCaptureAsync as jest.Mock;
const mockAllow = ScreenCapture.allowScreenCaptureAsync as jest.Mock;
const mockEnableSwitcher = ScreenCapture.enableAppSwitcherProtectionAsync as jest.Mock;
const mockIsAvailable = ScreenCapture.isAvailableAsync as jest.Mock;

function setPlatformOS(os: 'ios' | 'android'): void {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

describe('PrivacyScreenGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAvailable.mockResolvedValue(true);
  });

  it('renders nothing', () => {
    mockEnabled.mockReturnValue(false);
    const { toJSON } = render(<PrivacyScreenGuard />);
    expect(toJSON()).toBeNull();
  });

  it('enables protection when the flag is on (Android: no app-switcher call)', async () => {
    setPlatformOS('android');
    mockEnabled.mockReturnValue(true);

    render(<PrivacyScreenGuard />);

    await waitFor(() => expect(mockPrevent).toHaveBeenCalledTimes(1));
    expect(mockEnableSwitcher).not.toHaveBeenCalled();
  });

  it('also enables app-switcher protection on iOS when the flag is on', async () => {
    setPlatformOS('ios');
    mockEnabled.mockReturnValue(true);

    render(<PrivacyScreenGuard />);

    await waitFor(() => expect(mockEnableSwitcher).toHaveBeenCalledTimes(1));
    expect(mockPrevent).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the flag is off', async () => {
    setPlatformOS('ios');
    mockEnabled.mockReturnValue(false);

    render(<PrivacyScreenGuard />);

    await waitFor(() => expect(mockEnabled).toHaveBeenCalled());
    expect(mockPrevent).not.toHaveBeenCalled();
    expect(mockEnableSwitcher).not.toHaveBeenCalled();
  });

  it('reverses protection on unmount when the flag is on', async () => {
    setPlatformOS('ios');
    mockEnabled.mockReturnValue(true);

    const { unmount } = render(<PrivacyScreenGuard />);
    await waitFor(() => expect(mockPrevent).toHaveBeenCalledTimes(1));

    unmount();
    await waitFor(() => expect(mockAllow).toHaveBeenCalledTimes(1));
  });
});
