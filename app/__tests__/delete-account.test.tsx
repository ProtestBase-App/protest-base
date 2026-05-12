jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn().mockReturnValue('light') }));
jest.mock('@/utils/i18n', () => ({ t: jest.fn((key) => key) }));
jest.mock('@/services/auth.service', () => ({
  deleteAccount: jest.fn(),
}));

import React from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { renderWithProviders, fireEvent, waitFor, createMockUser } from '@/test-utils/render';
import DeleteAccountScreen from '@/app/(tabs)/(more)/delete-account';
import { deleteAccount } from '@/services/auth.service';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';

describe('Delete Account Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the page title', () => {
      const mockUser = createMockUser({ email: 'test@example.com' });
      const { getByText } = renderWithProviders(<DeleteAccountScreen />, {
        providerOverrides: {
          globalContext: { user: mockUser },
        },
      });

      expect(getByText('account.deleteTitle')).toBeTruthy();
    });

    it('renders the warning icon and message', () => {
      const mockUser = createMockUser();
      const { getByText } = renderWithProviders(<DeleteAccountScreen />, {
        providerOverrides: {
          globalContext: { user: mockUser },
        },
      });

      expect(getByText('account.deleteWarning')).toBeTruthy();
    });

    it('renders all warning items', () => {
      const mockUser = createMockUser();
      const { getByText } = renderWithProviders(<DeleteAccountScreen />, {
        providerOverrides: {
          globalContext: { user: mockUser },
        },
      });

      expect(getByText(/account.deleteWarningItems.loginInfo/)).toBeTruthy();
      expect(getByText(/account.deleteWarningItems.accountInfo/)).toBeTruthy();
      expect(getByText(/account.deleteWarningItems.eventsData/)).toBeTruthy();
      expect(getByText(/account.deleteWarningItems.images/)).toBeTruthy();
    });

    it('renders the email confirmation field', () => {
      const mockUser = createMockUser();
      const { getByText, getByPlaceholderText } = renderWithProviders(<DeleteAccountScreen />, {
        providerOverrides: {
          globalContext: { user: mockUser },
        },
      });

      expect(getByText('account.deleteConfirmation')).toBeTruthy();
      expect(getByPlaceholderText('account.email')).toBeTruthy();
    });

    it('renders the password confirmation field', () => {
      const mockUser = createMockUser();
      const { getByText } = renderWithProviders(<DeleteAccountScreen />, {
        providerOverrides: {
          globalContext: { user: mockUser },
        },
      });

      expect(getByText('account.deletePasswordConfirmation')).toBeTruthy();
    });

    it('renders the confirm button', () => {
      const mockUser = createMockUser();
      const { getByText } = renderWithProviders(<DeleteAccountScreen />, {
        providerOverrides: {
          globalContext: { user: mockUser },
        },
      });

      expect(getByText('account.confirmButton')).toBeTruthy();
    });

    it('renders the close button', () => {
      const mockUser = createMockUser();
      const { UNSAFE_getAllByType } = renderWithProviders(<DeleteAccountScreen />, {
        providerOverrides: {
          globalContext: { user: mockUser },
        },
      });

      const touchables = UNSAFE_getAllByType(require('react-native').TouchableOpacity);
      expect(touchables.length).toBeGreaterThan(0);
    });
  });

  describe('Form Validation', () => {
    it('shows error alert when email field is empty', async () => {
      const mockUser = createMockUser({ email: 'test@example.com' });
      const { getByText } = renderWithProviders(<DeleteAccountScreen />, {
        providerOverrides: {
          globalContext: { user: mockUser },
        },
      });

      const confirmButton = getByText('account.confirmButton');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('common.error', 'account.enterEmailConfirm');
      });
    });

    it('shows error when password field is empty', async () => {
      const mockUser = createMockUser({ email: 'test@example.com' });
      const { getByText, getByPlaceholderText } = renderWithProviders(<DeleteAccountScreen />, {
        providerOverrides: {
          globalContext: { user: mockUser },
        },
      });

      const emailInput = getByPlaceholderText('account.email');
      fireEvent.changeText(emailInput, 'test@example.com');

      const confirmButton = getByText('account.confirmButton');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('common.error', 'account.passwordRequired');
      });
    });

    it('shows error alert when email does not match user email', async () => {
      const mockUser = createMockUser({ email: 'test@example.com' });
      const { getByText, getByPlaceholderText } = renderWithProviders(<DeleteAccountScreen />, {
        providerOverrides: {
          globalContext: { user: mockUser },
        },
      });

      const emailInput = getByPlaceholderText('account.email');
      fireEvent.changeText(emailInput, 'wrong@example.com');

      const passwordInput = getByPlaceholderText('auth.password');
      fireEvent.changeText(passwordInput, 'somepassword');

      const confirmButton = getByText('account.confirmButton');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('common.error', 'account.incorrectEmail');
      });
    });

    it('validates email matches before proceeding', async () => {
      const mockUser = createMockUser({ email: 'test@example.com' });
      (deleteAccount as jest.Mock).mockResolvedValue(undefined);

      const { getByText, getByPlaceholderText } = renderWithProviders(<DeleteAccountScreen />, {
        providerOverrides: {
          globalContext: { user: mockUser },
        },
      });

      const emailInput = getByPlaceholderText('account.email');
      fireEvent.changeText(emailInput, 'test@example.com');

      const passwordInput = getByPlaceholderText('auth.password');
      fireEvent.changeText(passwordInput, 'testpassword');

      const confirmButton = getByText('account.confirmButton');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(deleteAccount).toHaveBeenCalledWith('testpassword');
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator while deleting account', async () => {
      const mockUser = createMockUser({ email: 'test@example.com' });
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      (deleteAccount as jest.Mock).mockReturnValue(deletePromise);

      const { getByText, getByPlaceholderText, UNSAFE_queryByType } = renderWithProviders(
        <DeleteAccountScreen />,
        {
          providerOverrides: {
            globalContext: { user: mockUser },
          },
        }
      );

      const emailInput = getByPlaceholderText('account.email');
      fireEvent.changeText(emailInput, 'test@example.com');

      const passwordInput = getByPlaceholderText('auth.password');
      fireEvent.changeText(passwordInput, 'testpassword');

      const confirmButton = getByText('account.confirmButton');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        const loader = UNSAFE_queryByType(BrandLoader);
        expect(loader).toBeTruthy();
      });

      // Cleanup
      resolveDelete!();
    });
  });

  describe('Account Deletion Flow', () => {
    it('calls deleteAccount service with password when valid email is confirmed', async () => {
      const mockUser = createMockUser({ email: 'test@example.com' });
      (deleteAccount as jest.Mock).mockResolvedValue(undefined);

      const { getByText, getByPlaceholderText } = renderWithProviders(<DeleteAccountScreen />, {
        providerOverrides: {
          globalContext: { user: mockUser },
        },
      });

      const emailInput = getByPlaceholderText('account.email');
      fireEvent.changeText(emailInput, 'test@example.com');
      const passwordInput = getByPlaceholderText('auth.password');
      fireEvent.changeText(passwordInput, 'mypassword123');

      const confirmButton = getByText('account.confirmButton');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(deleteAccount).toHaveBeenCalledWith('mypassword123');
      });
    });

    it('clears auth state after account deletion', async () => {
      const mockUser = createMockUser({ email: 'test@example.com' });
      const mockClearAuthState = jest.fn().mockResolvedValue(undefined);
      (deleteAccount as jest.Mock).mockResolvedValue(undefined);

      const { getByText, getByPlaceholderText } = renderWithProviders(<DeleteAccountScreen />, {
        providerOverrides: {
          globalContext: {
            user: mockUser,
            clearAuthState: mockClearAuthState,
          },
        },
      });

      const emailInput = getByPlaceholderText('account.email');
      fireEvent.changeText(emailInput, 'test@example.com');
      const passwordInput = getByPlaceholderText('auth.password');
      fireEvent.changeText(passwordInput, 'mypassword123');

      const confirmButton = getByText('account.confirmButton');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockClearAuthState).toHaveBeenCalled();
      });
    });

    it('shows success alert after successful account deletion', async () => {
      const mockUser = createMockUser({ email: 'test@example.com' });
      (deleteAccount as jest.Mock).mockResolvedValue(undefined);

      const { getByText, getByPlaceholderText } = renderWithProviders(<DeleteAccountScreen />, {
        providerOverrides: {
          globalContext: { user: mockUser },
        },
      });

      const emailInput = getByPlaceholderText('account.email');
      fireEvent.changeText(emailInput, 'test@example.com');
      const passwordInput = getByPlaceholderText('auth.password');
      fireEvent.changeText(passwordInput, 'mypassword123');

      const confirmButton = getByText('account.confirmButton');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'common.success',
          'account.deleteSuccess',
          expect.any(Array)
        );
      });
    });

    it('navigates to root after successful deletion confirmation', async () => {
      const mockUser = createMockUser({ email: 'test@example.com' });
      (deleteAccount as jest.Mock).mockResolvedValue(undefined);

      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        if (buttons && buttons[0]?.onPress) {
          buttons[0].onPress();
        }
      });

      const { getByText, getByPlaceholderText } = renderWithProviders(<DeleteAccountScreen />, {
        providerOverrides: {
          globalContext: { user: mockUser },
        },
      });

      const emailInput = getByPlaceholderText('account.email');
      fireEvent.changeText(emailInput, 'test@example.com');
      const passwordInput = getByPlaceholderText('auth.password');
      fireEvent.changeText(passwordInput, 'mypassword123');

      const confirmButton = getByText('account.confirmButton');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
        expect(router.replace).toHaveBeenCalled();
      });
    });

    it('shows error alert when account deletion fails', async () => {
      const mockUser = createMockUser({ email: 'test@example.com' });
      (deleteAccount as jest.Mock).mockRejectedValue(new Error('Deletion failed'));

      const { getByText, getByPlaceholderText } = renderWithProviders(<DeleteAccountScreen />, {
        providerOverrides: {
          globalContext: { user: mockUser },
        },
      });

      const emailInput = getByPlaceholderText('account.email');
      fireEvent.changeText(emailInput, 'test@example.com');
      const passwordInput = getByPlaceholderText('auth.password');
      fireEvent.changeText(passwordInput, 'mypassword123');

      const confirmButton = getByText('account.confirmButton');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('common.error', 'Deletion failed');
      });
    });

    it('shows incorrect password error for INVALID_CREDENTIALS', async () => {
      const mockUser = createMockUser({ email: 'test@example.com' });
      (deleteAccount as jest.Mock).mockRejectedValue(new Error('INVALID_CREDENTIALS'));

      const { getByText, getByPlaceholderText } = renderWithProviders(<DeleteAccountScreen />, {
        providerOverrides: {
          globalContext: { user: mockUser },
        },
      });

      const emailInput = getByPlaceholderText('account.email');
      fireEvent.changeText(emailInput, 'test@example.com');
      const passwordInput = getByPlaceholderText('auth.password');
      fireEvent.changeText(passwordInput, 'wrongpassword');

      const confirmButton = getByText('account.confirmButton');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('common.error', 'account.incorrectPassword');
      });
    });

    it('shows rate limit error message when rate limited', async () => {
      const mockUser = createMockUser({ email: 'test@example.com' });
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).code = 'RATE_LIMIT_EXCEEDED';
      (deleteAccount as jest.Mock).mockRejectedValue(rateLimitError);

      const { getByText, getByPlaceholderText } = renderWithProviders(<DeleteAccountScreen />, {
        providerOverrides: {
          globalContext: { user: mockUser },
        },
      });

      const emailInput = getByPlaceholderText('account.email');
      fireEvent.changeText(emailInput, 'test@example.com');
      const passwordInput = getByPlaceholderText('auth.password');
      fireEvent.changeText(passwordInput, 'mypassword123');

      const confirmButton = getByText('account.confirmButton');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'errors.rateLimit.title',
          'errors.rateLimit.deleteAccountMessage'
        );
      });
    });
  });

  describe('Navigation', () => {
    it('navigates back when close button is pressed', () => {
      const mockUser = createMockUser();
      const { UNSAFE_getAllByType } = renderWithProviders(<DeleteAccountScreen />, {
        providerOverrides: {
          globalContext: { user: mockUser },
        },
      });

      const touchables = UNSAFE_getAllByType(require('react-native').TouchableOpacity);
      const closeButton = touchables[0]; // First TouchableOpacity is the close button

      fireEvent.press(closeButton);

      expect(router.back).toHaveBeenCalled();
    });
  });
});
