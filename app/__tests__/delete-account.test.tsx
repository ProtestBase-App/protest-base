jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn().mockReturnValue('light') }));
jest.mock('@/utils/i18n', () => ({ t: jest.fn((key) => key) }));
jest.mock('@/services/auth.service', () => ({
  deleteAccount: jest.fn(),
}));
jest.mock('@/services/mfa.service', () => ({
  reauthenticate: jest.fn(),
}));
jest.mock('@/services/organizer.service', () => ({
  ...jest.requireActual('@/services/organizer.service'),
  getOrganizationMemberCount: jest.fn(),
}));

import React from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { isHiddenFromAccessibility } from '@testing-library/react-native';
import { act, renderWithProviders, fireEvent, waitFor, createMockUser } from '@/test-utils/render';
import DeleteAccountScreen from '@/app/(tabs)/(more)/delete-account';
import { deleteAccount } from '@/services/auth.service';
import { reauthenticate } from '@/services/mfa.service';
import { getOrganizationMemberCount } from '@/services/organizer.service';
import { AuthError } from '@/utils/authError';
import { t } from '@/utils/i18n';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';

const mockMemberCount = getOrganizationMemberCount as jest.Mock;
// What axios rejects with when the request never reaches the server.
const networkError = () =>
  Object.assign(new Error('Network Error'), { isAxiosError: true, code: 'ERR_NETWORK' });

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

    it('renders all warning items', async () => {
      const mockUser = createMockUser();
      const { getByText, findByText } = renderWithProviders(<DeleteAccountScreen />, {
        providerOverrides: {
          globalContext: { user: mockUser },
        },
      });

      expect(getByText(/account.deleteWarningItems.loginInfo/)).toBeTruthy();
      expect(getByText(/account.deleteWarningItems.accountInfo/)).toBeTruthy();
      expect(await findByText(/account.deleteImpact.ownContent/)).toBeTruthy();
    });

    it('sets each bullet glyph apart from its text, hidden from screen readers', () => {
      const mockUser = createMockUser();
      const { getByText, getAllByText } = renderWithProviders(<DeleteAccountScreen />, {
        providerOverrides: {
          globalContext: { user: mockUser },
        },
      });

      // Its own element, so wrapped lines align under the text, not the glyph.
      const text = getByText('account.deleteWarningItems.loginInfo');
      expect(isHiddenFromAccessibility(text)).toBe(false);
      const glyphs = getAllByText('•', { includeHiddenElements: true });
      expect(glyphs.length).toBeGreaterThanOrEqual(2);
      glyphs.forEach((glyph) => expect(isHiddenFromAccessibility(glyph)).toBe(true));
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
        expect(deleteAccount).toHaveBeenCalledWith('testpassword', undefined);
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
        expect(deleteAccount).toHaveBeenCalledWith('mypassword123', undefined);
      });
    });

    it('accepts the email in another case and with surrounding spaces', async () => {
      // Sign-in ignores case, so "Test@…" must confirm an account stored as "test@…".
      const mockUser = createMockUser({ email: 'test@example.com' });
      (deleteAccount as jest.Mock).mockResolvedValue(undefined);

      const { getByText, getByPlaceholderText } = renderWithProviders(<DeleteAccountScreen />, {
        providerOverrides: {
          globalContext: { user: mockUser },
        },
      });

      fireEvent.changeText(getByPlaceholderText('account.email'), ' Test@Example.COM ');
      fireEvent.changeText(getByPlaceholderText('auth.password'), 'mypassword123');
      fireEvent.press(getByText('account.confirmButton'));

      await waitFor(() => {
        expect(deleteAccount).toHaveBeenCalledWith('mypassword123', undefined);
      });
      expect(Alert.alert).not.toHaveBeenCalledWith('common.error', 'account.incorrectEmail');
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

    it("says the server wasn't reached when the deletion fails on the network", async () => {
      (deleteAccount as jest.Mock).mockRejectedValueOnce(networkError());
      const utils = renderWithProviders(<DeleteAccountScreen />, {
        providerOverrides: {
          globalContext: { user: createMockUser({ email: 'test@example.com' }) },
        },
      });
      fireEvent.changeText(utils.getByPlaceholderText('account.email'), 'test@example.com');
      fireEvent.changeText(utils.getByPlaceholderText('auth.password'), 'mypassword123');
      fireEvent.press(utils.getByText('account.confirmButton'));

      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith('common.error', 'errors.network')
      );
    });
  });

  describe('Second factor', () => {
    const reauthRequired = () =>
      new AuthError('Confirm your password first', { code: 'REAUTH_REQUIRED', status: 403 });

    async function reachCodeStep(clearAuthState = jest.fn().mockResolvedValue(undefined)) {
      const utils = renderWithProviders(<DeleteAccountScreen />, {
        providerOverrides: {
          globalContext: {
            user: createMockUser({ email: 'test@example.com' }),
            clearAuthState,
          },
        },
      });
      fireEvent.changeText(utils.getByPlaceholderText('account.email'), 'test@example.com');
      fireEvent.changeText(utils.getByPlaceholderText('auth.password'), 'mypassword123');
      fireEvent.press(utils.getByText('account.confirmButton'));
      await utils.findByText('mfa.reauthTitle');
      return { ...utils, clearAuthState };
    }

    function enterCode(
      utils: Pick<ReturnType<typeof renderWithProviders>, 'getByTestId'>,
      code = '123456'
    ) {
      fireEvent.changeText(utils.getByTestId('mfa-reauth-input'), code);
      fireEvent.press(utils.getByTestId('mfa-reauth-submit'));
    }

    it('asks for a code when the account has a second factor, then deletes with the proof', async () => {
      (deleteAccount as jest.Mock)
        .mockRejectedValueOnce(reauthRequired())
        .mockResolvedValueOnce(undefined);
      (reauthenticate as jest.Mock).mockResolvedValue('proof-token');
      const utils = await reachCodeStep();

      expect(utils.queryByPlaceholderText('auth.password')).toBeNull();
      expect(Alert.alert).not.toHaveBeenCalled();
      enterCode(utils);

      await waitFor(() => expect(utils.clearAuthState).toHaveBeenCalled());
      expect(reauthenticate).toHaveBeenCalledWith('mypassword123', 'totp', '123456');
      expect(deleteAccount).toHaveBeenLastCalledWith('mypassword123', 'proof-token');
      expect(Alert.alert).toHaveBeenCalledWith(
        'common.success',
        'account.deleteSuccess',
        expect.any(Array)
      );
    });

    // The backend takes a code from any app on the account; a recovery code is the other way.
    it('deletes with a recovery code instead of an app code', async () => {
      (deleteAccount as jest.Mock)
        .mockRejectedValueOnce(reauthRequired())
        .mockResolvedValueOnce(undefined);
      (reauthenticate as jest.Mock).mockResolvedValue('proof-token');
      const utils = await reachCodeStep();

      fireEvent.press(utils.getByTestId('mfa-reauth-switch'));
      enterCode(utils, 'abcde-23456');

      await waitFor(() => expect(utils.clearAuthState).toHaveBeenCalled());
      expect(reauthenticate).toHaveBeenCalledWith('mypassword123', 'recovery', 'ABCDE23456');
      expect(deleteAccount).toHaveBeenLastCalledWith('mypassword123', 'proof-token');
    });

    it('shows a wrong code next to the field and deletes nothing', async () => {
      (deleteAccount as jest.Mock).mockRejectedValueOnce(reauthRequired());
      (reauthenticate as jest.Mock).mockRejectedValue(
        new AuthError('That code is incorrect or has expired', {
          code: 'INVALID_MFA_CODE',
          status: 401,
          details: { attemptsRemaining: 2 },
        })
      );
      const utils = await reachCodeStep();

      enterCode(utils);

      expect(await utils.findByText(/mfa\.wrongCode/)).toBeTruthy();
      expect(deleteAccount).toHaveBeenCalledTimes(1);
      expect(utils.clearAuthState).not.toHaveBeenCalled();
    });

    it('asks for a new code when the proof expired before the deletion', async () => {
      (deleteAccount as jest.Mock)
        .mockRejectedValueOnce(reauthRequired())
        .mockRejectedValueOnce(reauthRequired());
      (reauthenticate as jest.Mock).mockResolvedValue('proof-token');
      const utils = await reachCodeStep();

      enterCode(utils);

      expect(await utils.findByText('mfa.reauthExpired')).toBeTruthy();
      expect(utils.clearAuthState).not.toHaveBeenCalled();
    });

    it('goes back to the password when it stopped working', async () => {
      (deleteAccount as jest.Mock).mockRejectedValueOnce(reauthRequired());
      (reauthenticate as jest.Mock).mockRejectedValue(
        new AuthError('Invalid credentials', { code: 'INVALID_CREDENTIALS', status: 401 })
      );
      const utils = await reachCodeStep();

      enterCode(utils);

      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith('common.error', 'account.incorrectPassword')
      );
      expect(utils.getByPlaceholderText('auth.password')).toBeTruthy();
    });

    it('returns to the password step on cancel', async () => {
      (deleteAccount as jest.Mock).mockRejectedValueOnce(reauthRequired());
      const utils = await reachCodeStep();

      fireEvent.press(utils.getByTestId('mfa-reauth-cancel'));

      expect(utils.getByPlaceholderText('auth.password')).toBeTruthy();
      expect(reauthenticate).not.toHaveBeenCalled();
    });

    // The delete didn't use the proof up, and the same code typed again counts as a wrong one.
    it('retries with the same proof after a network failure, without a new code', async () => {
      (deleteAccount as jest.Mock)
        .mockRejectedValueOnce(reauthRequired())
        .mockRejectedValueOnce(networkError())
        .mockResolvedValueOnce(undefined);
      (reauthenticate as jest.Mock).mockResolvedValue('proof-token');
      const utils = await reachCodeStep();

      enterCode(utils);
      expect(await utils.findByText('errors.network')).toBeTruthy();
      fireEvent.press(utils.getByTestId('mfa-reauth-submit'));

      await waitFor(() => expect(utils.clearAuthState).toHaveBeenCalled());
      expect(reauthenticate).toHaveBeenCalledTimes(1);
      expect(deleteAccount).toHaveBeenCalledTimes(3);
      expect(deleteAccount).toHaveBeenLastCalledWith('mypassword123', 'proof-token');
    });

    it('keeps the proof for the password step after cancel', async () => {
      (deleteAccount as jest.Mock)
        .mockRejectedValueOnce(reauthRequired())
        .mockRejectedValueOnce(networkError())
        .mockResolvedValueOnce(undefined);
      (reauthenticate as jest.Mock).mockResolvedValue('proof-token');
      const utils = await reachCodeStep();

      enterCode(utils);
      expect(await utils.findByText('errors.network')).toBeTruthy();
      fireEvent.press(utils.getByTestId('mfa-reauth-cancel'));
      fireEvent.press(utils.getByText('account.confirmButton'));

      await waitFor(() => expect(utils.clearAuthState).toHaveBeenCalled());
      expect(reauthenticate).toHaveBeenCalledTimes(1);
      expect(deleteAccount).toHaveBeenLastCalledWith('mypassword123', 'proof-token');
    });

    it('asks for a new code once the proof is used up', async () => {
      (deleteAccount as jest.Mock)
        .mockRejectedValueOnce(reauthRequired())
        .mockRejectedValueOnce(reauthRequired())
        .mockResolvedValueOnce(undefined);
      (reauthenticate as jest.Mock)
        .mockResolvedValueOnce('proof-1')
        .mockResolvedValueOnce('proof-2');
      const utils = await reachCodeStep();

      enterCode(utils);
      expect(await utils.findByText('mfa.reauthExpired')).toBeTruthy();
      enterCode(utils, '654321');

      await waitFor(() => expect(utils.clearAuthState).toHaveBeenCalled());
      expect(reauthenticate).toHaveBeenLastCalledWith('mypassword123', 'totp', '654321');
      expect(deleteAccount).toHaveBeenLastCalledWith('mypassword123', 'proof-2');
    });

    // Cancel can't stop a deletion already sent, so it would end in "Account deleted".
    it('keeps Cancel closed while the code is being checked', async () => {
      let answer: (token: string) => void = () => {};
      (deleteAccount as jest.Mock)
        .mockRejectedValueOnce(reauthRequired())
        .mockResolvedValueOnce(undefined);
      (reauthenticate as jest.Mock).mockReturnValueOnce(
        new Promise((resolve) => (answer = resolve))
      );
      const utils = await reachCodeStep();

      enterCode(utils);
      fireEvent.press(utils.getByTestId('mfa-reauth-cancel'));
      expect(utils.queryByPlaceholderText('auth.password')).toBeNull();

      await act(async () => answer('proof-token'));
      await waitFor(() => expect(utils.clearAuthState).toHaveBeenCalled());
    });
  });

  describe('Offline guard', () => {
    it('blocks deletion and alerts when offline (mutation never fires)', async () => {
      const mockUser = createMockUser({ email: 'test@example.com' });
      const { getByText, getByPlaceholderText } = renderWithProviders(<DeleteAccountScreen />, {
        providerOverrides: {
          globalContext: { user: mockUser },
          connectivityContext: { isOffline: true },
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
          'common.error',
          'connectivity.actionUnavailableOffline'
        );
      });
      expect(deleteAccount).not.toHaveBeenCalled();
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

  // The backend keeps an organization that has other members, with all its content, and
  // deletes one whose last member leaves. The list must say which, never more.
  describe('What happens to the organization', () => {
    const organization = (role: string) => ({ $id: 'org-1', Name: 'Astro', role });

    function renderWith(userOrganizationsContext: Record<string, unknown>) {
      return renderWithProviders(<DeleteAccountScreen />, {
        providerOverrides: {
          globalContext: { user: createMockUser() },
          userOrganizationsContext,
        },
      });
    }

    it('says the organization goes with its content when the user is its last member', async () => {
      mockMemberCount.mockResolvedValueOnce(1);
      const utils = renderWith({ userOrganizations: [organization('owner')] });

      expect(await utils.findByText(/account.deleteImpact.orgDeleted/)).toBeTruthy();
      expect(t).toHaveBeenCalledWith('account.deleteImpact.orgDeleted', { name: 'Astro' });
      expect(mockMemberCount).toHaveBeenCalledWith('org-1');
      expect(utils.queryByText(/account.deleteImpact.orgKept/)).toBeNull();
      expect(utils.queryByText(/account.deleteImpact.sharedHint/)).toBeNull();
    });

    it('says the organization stays, and who becomes owner, when its owner leaves others behind', async () => {
      mockMemberCount.mockResolvedValueOnce(2);
      const utils = renderWith({ userOrganizations: [organization('owner')] });

      expect(await utils.findByText(/account.deleteImpact.orgKept/)).toBeTruthy();
      expect(utils.getByText(/account.deleteImpact.nameReplaced/)).toBeTruthy();
      expect(utils.getByText(/account.deleteImpact.ownerTransfer/)).toBeTruthy();
      expect(utils.getByText(/account.deleteImpact.sharedHint/)).toBeTruthy();
      expect(t).toHaveBeenCalledWith('account.deleteImpact.ownerTransfer', { name: 'Astro' });
      expect(utils.queryByText(/account.deleteImpact.orgDeleted/)).toBeNull();
    });

    it('leaves out the owner line for a member who is not the owner', async () => {
      mockMemberCount.mockResolvedValueOnce(3);
      const utils = renderWith({ userOrganizations: [organization('member')] });

      expect(await utils.findByText(/account.deleteImpact.orgKept/)).toBeTruthy();
      expect(utils.getByText(/account.deleteImpact.sharedHint/)).toBeTruthy();
      expect(utils.queryByText(/account.deleteImpact.ownerTransfer/)).toBeNull();
    });

    it('says what it can when the members cannot be read, without promising either outcome', async () => {
      mockMemberCount.mockRejectedValueOnce(new Error('Network Error'));
      const utils = renderWith({ userOrganizations: [organization('owner')] });

      expect(await utils.findByText(/account.deleteImpact.orgUnknown/)).toBeTruthy();
      expect(utils.queryByText(/account.deleteImpact.orgDeleted/)).toBeNull();
      expect(utils.queryByText(/account.deleteImpact.ownContent/)).toBeNull();
    });

    it('does not read a failed organization lookup as having no organization', async () => {
      const utils = renderWith({
        userOrganizations: [],
        error: 'Failed to fetch user organizations',
      });

      expect(await utils.findByText(/account.deleteImpact.orgUnknown/)).toBeTruthy();
      expect(utils.queryByText(/account.deleteImpact.ownContent/)).toBeNull();
      expect(mockMemberCount).not.toHaveBeenCalled();
    });

    it('waits for the organizations, and keeps the delete button usable meanwhile', () => {
      const utils = renderWith({ userOrganizations: [], loading: true });

      expect(utils.getByTestId('delete-account-impact-loading')).toBeTruthy();
      expect(utils.queryByText(/account.deleteImpact.ownContent/)).toBeNull();
      expect(utils.getByTestId('btn-delete-account-confirm')).toBeTruthy();
    });
  });
});
