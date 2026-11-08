jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn().mockReturnValue('light') }));

import React from 'react';
import { Linking } from 'react-native';
import { openBrowserAsync } from 'expo-web-browser';
import { renderWithProviders, fireEvent, waitFor } from '@/test-utils/render';
import TermsAndConditionsScreen from '@/app/(tabs)/(more)/terms-and-conditions';
import { setLocale, t } from '@/utils/i18n';
import { logger } from '@/utils/logger';

const mockOpenBrowser = openBrowserAsync as jest.Mock;

describe('Terms and Conditions screen', () => {
  let openURL: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    openURL.mockRestore();
    setLocale('en');
  });

  // The website's privacy policy (8 November 2026) says what guests' requests do reveal.
  it('agrees with the privacy policy and is dated unambiguously', () => {
    setLocale('en');
    const { getByText, queryByText } = renderWithProviders(<TermsAndConditionsScreen />);

    expect(getByText('Last Updated: 8 November 2026')).toBeTruthy();
    expect(getByText(/You don't need an account, and we don't ask for your name/)).toBeTruthy();
    expect(
      getByText(/The protests you save, like or follow are stored on your device/)
    ).toBeTruthy();
    expect(getByText(/To check that your organisation is legitimate/)).toBeTruthy();
    expect(queryByText(/We do not collect any personal data/)).toBeNull();
    expect(queryByText(/Unlike guest users/)).toBeNull();
  });

  // The in-app report screen isn't built yet, so the terms can't promise it.
  it('sends reports to the contact address instead of promising an in-app report', () => {
    setLocale('en');
    const { getByText, queryByText } = renderWithProviders(<TermsAndConditionsScreen />);

    expect(getByText(/you can report it to us by e-mail at:/)).toBeTruthy();
    expect(queryByText(/directly through the App/)).toBeNull();
  });

  it.each([
    ['fr', 'https://protestbase.be/privacy/'],
    ['en', 'https://protestbase.be/en/privacy/'],
    ['nl', 'https://protestbase.be/nl/privacy/'],
  ] as const)(
    'opens the privacy policy in the app language (%s) from both data privacy sections',
    async (locale, url) => {
      setLocale(locale);
      const { getAllByText } = renderWithProviders(<TermsAndConditionsScreen />);

      const links = getAllByText(t('termsAndConditions.privacyPolicyLink'));
      expect(links).toHaveLength(2);
      for (const link of links) {
        expect(link.props.accessibilityRole).toBe('link');
        expect(link.props.accessibilityHint).toBe(t('a11y.hints.openPrivacyPolicy'));
        await fireEvent(link, 'press', { preventDefault: jest.fn() });
      }

      expect(mockOpenBrowser).toHaveBeenCalledTimes(2);
      expect(mockOpenBrowser).toHaveBeenNthCalledWith(1, url);
      expect(mockOpenBrowser).toHaveBeenNthCalledWith(2, url);
    }
  );

  it('opens an e-mail to the contact address from the reporting section and from Contact Us', () => {
    const { getAllByText } = renderWithProviders(<TermsAndConditionsScreen />);

    const addresses = getAllByText('info@protestbase.be');
    expect(addresses).toHaveLength(2);
    for (const address of addresses) {
      expect(address.props.accessibilityRole).toBe('link');
      expect(address.props.accessibilityHint).toBe(t('a11y.hints.sendEmail'));
      fireEvent.press(address);
    }

    expect(openURL).toHaveBeenCalledTimes(2);
    expect(openURL).toHaveBeenCalledWith('mailto:info@protestbase.be');
  });

  it('logs instead of failing when no e-mail app can open the address', async () => {
    openURL.mockRejectedValueOnce(new Error('No e-mail app'));
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    const { getAllByText } = renderWithProviders(<TermsAndConditionsScreen />);

    fireEvent.press(getAllByText('info@protestbase.be')[0]);

    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith('[Terms] Could not open an e-mail app', {
        error: 'No e-mail app',
      })
    );
    warn.mockRestore();
  });
});
