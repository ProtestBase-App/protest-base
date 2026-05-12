jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn().mockReturnValue('light') }));
jest.mock('@/utils/i18n', () => ({ t: jest.fn((key) => key) }));

import React from 'react';
import { router } from 'expo-router';
import { renderWithProviders, fireEvent } from '@/test-utils/render';
import AccountScreen from '@/app/(tabs)/(more)/account';

describe('Account Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the account info button', () => {
      const { getByText } = renderWithProviders(<AccountScreen />);

      expect(getByText('more.accountInfo')).toBeTruthy();
    });

    it('renders the delete account button', () => {
      const { getByText } = renderWithProviders(<AccountScreen />);

      expect(getByText('more.deleteAccount')).toBeTruthy();
    });

    it('renders both navigation buttons', () => {
      const { UNSAFE_getAllByType } = renderWithProviders(<AccountScreen />);

      const CTAButton = require('@/components/ui/CTAButton').CTAButton;
      const buttons = UNSAFE_getAllByType(CTAButton);

      expect(buttons).toHaveLength(2);
    });
  });

  describe('Navigation', () => {
    it('navigates to account info screen when account info button is pressed', () => {
      const { getByText } = renderWithProviders(<AccountScreen />);

      const accountInfoButton = getByText('more.accountInfo');
      fireEvent.press(accountInfoButton);

      expect(router.push).toHaveBeenCalled();
    });

    it('navigates to delete account screen when delete account button is pressed', () => {
      const { getByText } = renderWithProviders(<AccountScreen />);

      const deleteAccountButton = getByText('more.deleteAccount');
      fireEvent.press(deleteAccountButton);

      expect(router.push).toHaveBeenCalled();
    });
  });
});
