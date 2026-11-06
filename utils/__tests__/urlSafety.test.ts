jest.mock('react-native', () => ({
  Linking: {
    openURL: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { Linking } from 'react-native';
import { logger } from '@/utils/logger';
import {
  isSafeHttpUrl,
  isAllowedStoreUrl,
  isTotpSetupUri,
  openExternalUrlSafely,
  openStoreUrlSafely,
  openTotpSetupUri,
} from '@/utils/urlSafety';

const mockOpen = Linking.openURL as jest.Mock;

describe('isSafeHttpUrl', () => {
  it('accepts http and https', () => {
    expect(isSafeHttpUrl('https://protestbase.be')).toBe(true);
    expect(isSafeHttpUrl('http://example.org/page')).toBe(true);
  });

  it('rejects dangerous and non-web schemes', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('file:///etc/passwd')).toBe(false);
    expect(isSafeHttpUrl('data:text/html,<script>1</script>')).toBe(false);
    expect(isSafeHttpUrl('tel:+3212345678')).toBe(false);
    expect(isSafeHttpUrl('mailto:a@b.com')).toBe(false);
    expect(isSafeHttpUrl('intent://x#Intent;end')).toBe(false);
    expect(isSafeHttpUrl('market://details?id=com.evil')).toBe(false);
  });

  it('rejects empty / nullish / malformed input', () => {
    expect(isSafeHttpUrl('')).toBe(false);
    expect(isSafeHttpUrl(null)).toBe(false);
    expect(isSafeHttpUrl(undefined)).toBe(false);
    expect(isSafeHttpUrl('not a url')).toBe(false);
  });
});

describe('isAllowedStoreUrl', () => {
  it('accepts known store hosts over https', () => {
    expect(isAllowedStoreUrl('https://apps.apple.com/app/id123')).toBe(true);
    expect(isAllowedStoreUrl('https://itunes.apple.com/app/id123')).toBe(true);
    expect(
      isAllowedStoreUrl('https://play.google.com/store/apps/details?id=be.protestbase.app')
    ).toBe(true);
  });

  it('accepts store-app schemes', () => {
    expect(isAllowedStoreUrl('market://details?id=be.protestbase.app')).toBe(true);
    expect(isAllowedStoreUrl('itms-apps://itunes.apple.com/app/id123')).toBe(true);
    expect(isAllowedStoreUrl('itms-appss://itunes.apple.com/app/id123')).toBe(true);
  });

  it('rejects phishing and look-alike hosts', () => {
    expect(isAllowedStoreUrl('https://evil.example/update')).toBe(false);
    expect(isAllowedStoreUrl('https://play.google.com.evil.example/x')).toBe(false);
    expect(isAllowedStoreUrl('http://apps.apple.com/app/id123')).toBe(false); // not https
    expect(isAllowedStoreUrl('javascript:alert(1)')).toBe(false);
    expect(isAllowedStoreUrl('')).toBe(false);
    expect(isAllowedStoreUrl(null)).toBe(false);
  });
});

describe('openExternalUrlSafely', () => {
  beforeEach(() => jest.clearAllMocks());

  it('opens a valid http(s) url and reports success', async () => {
    await expect(openExternalUrlSafely('https://protestbase.be')).resolves.toBe(true);
    expect(mockOpen).toHaveBeenCalledWith('https://protestbase.be');
  });

  it('refuses non-http(s) urls without calling Linking', async () => {
    await expect(openExternalUrlSafely('tel:+3212345678')).resolves.toBe(false);
    await expect(openExternalUrlSafely('javascript:alert(1)')).resolves.toBe(false);
    expect(mockOpen).not.toHaveBeenCalled();
  });

  it('handles Linking rejection gracefully', async () => {
    mockOpen.mockRejectedValueOnce(new Error('cannot open'));
    await expect(openExternalUrlSafely('https://protestbase.be')).resolves.toBe(false);
  });
});

describe('openStoreUrlSafely', () => {
  beforeEach(() => jest.clearAllMocks());

  it('opens an allowed store url and reports success', async () => {
    await expect(openStoreUrlSafely('https://apps.apple.com/app/id123')).resolves.toBe(true);
    expect(mockOpen).toHaveBeenCalledWith('https://apps.apple.com/app/id123');
  });

  it('refuses a non-store https url (forced-update phishing) without calling Linking', async () => {
    await expect(openStoreUrlSafely('https://evil.example/update')).resolves.toBe(false);
    expect(mockOpen).not.toHaveBeenCalled();
  });

  it('refuses empty url', async () => {
    await expect(openStoreUrlSafely('')).resolves.toBe(false);
    expect(mockOpen).not.toHaveBeenCalled();
  });
});

describe('isTotpSetupUri', () => {
  it('accepts an authenticator setup link', () => {
    expect(isTotpSetupUri('otpauth://totp/ProtestBase:me%40example.org?secret=AAAABBBB')).toBe(
      true
    );
    expect(isTotpSetupUri('OTPAUTH://TOTP/ProtestBase?secret=AAAABBBB')).toBe(true);
  });

  it('rejects every other link', () => {
    expect(isTotpSetupUri('otpauth://hotp/ProtestBase?secret=AAAABBBB')).toBe(false);
    expect(isTotpSetupUri('https://protestbase.be/totp')).toBe(false);
    expect(isTotpSetupUri('intent://totp/#Intent;scheme=otpauth;end')).toBe(false);
    expect(isTotpSetupUri('')).toBe(false);
    expect(isTotpSetupUri(null)).toBe(false);
  });
});

describe('openTotpSetupUri', () => {
  const SETUP_URI = 'otpauth://totp/ProtestBase:me%40example.org?secret=AAAABBBBCCCCDDDD';

  beforeEach(() => jest.clearAllMocks());

  it('hands the link to the app that handles it', async () => {
    await expect(openTotpSetupUri(SETUP_URI)).resolves.toBe(true);
    expect(mockOpen).toHaveBeenCalledWith(SETUP_URI);
  });

  it('refuses another scheme without calling Linking', async () => {
    await expect(openTotpSetupUri('tel:123')).resolves.toBe(false);
    expect(mockOpen).not.toHaveBeenCalled();
  });

  it('reports no app without ever logging the secret', async () => {
    mockOpen.mockRejectedValueOnce(new Error(`Could not open URL '${SETUP_URI}'`));

    await expect(openTotpSetupUri(SETUP_URI)).resolves.toBe(false);
    const logged = JSON.stringify((logger.warn as jest.Mock).mock.calls);
    expect(logged).not.toContain('AAAABBBBCCCCDDDD');
  });
});
