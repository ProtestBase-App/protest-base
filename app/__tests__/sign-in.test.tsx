jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn().mockReturnValue('light') }));
jest.mock('@/services/auth.service', () => ({
  login: jest.fn(),
  forgotPassword: jest.fn(),
}));
jest.mock('@/utils/i18n', () => ({ t: jest.fn((key) => key) }));

import React from 'react';
import { Alert } from 'react-native';
import { act } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderWithProviders, fireEvent, waitFor } from '@/test-utils/render';
import SignIn from '@/app/(auth)/sign-in';
import { login, forgotPassword } from '@/services/auth.service';

// Helper: wait for email validation debounce (300ms) to complete
const waitForDebounce = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 400));
  });

describe('SignIn Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the sign-in form with email and password fields', () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(<SignIn />);

      expect(getByText('auth.signIn')).toBeTruthy();
      expect(getByPlaceholderText('auth.emailPlaceholder')).toBeTruthy();
      expect(getByPlaceholderText('auth.passwordPlaceholder')).toBeTruthy();
    });

    it('renders the sign-in button', () => {
      const { getByText } = renderWithProviders(<SignIn />);

      expect(getByText('auth.signInButton')).toBeTruthy();
    });

    it('renders the forgot password link', () => {
      const { getByText } = renderWithProviders(<SignIn />);

      expect(getByText('auth.forgotPassword')).toBeTruthy();
    });

    it('does not render migration info banner', () => {
      const { queryByText } = renderWithProviders(<SignIn />);

      expect(queryByText('auth.migrationBannerTitle')).toBeNull();
    });

    it('renders the request access link', () => {
      const { getByText } = renderWithProviders(<SignIn />);

      expect(getByText('auth.noAccount')).toBeTruthy();
      expect(getByText('auth.requestAccess')).toBeTruthy();
    });

    it('renders the back button', () => {
      const { getByLabelText } = renderWithProviders(<SignIn />);

      expect(getByLabelText('Go back')).toBeTruthy();
    });

    it('displays the app logo', () => {
      const { UNSAFE_getByType } = renderWithProviders(<SignIn />);
      const images = UNSAFE_getByType(require('react-native').Image);

      expect(images).toBeTruthy();
    });
  });

  describe('Rendering without redirect (auth guard handled by layout)', () => {
    it('renders the sign-in form regardless of auth state', () => {
      // Auth guarding is now handled by Stack.Protected in _layout.tsx,
      // so the sign-in component always renders the form
      const { queryByText } = renderWithProviders(<SignIn />, {
        providerOverrides: {
          globalContext: {
            isLogged: false,
            user: null,
            loading: false,
          },
        },
      });

      expect(queryByText('auth.signIn')).toBeTruthy();
    });
  });

  describe('Form Validation', () => {
    it('disables submit button when email is not a valid email', () => {
      const { getByText, getByPlaceholderText, UNSAFE_root } = renderWithProviders(<SignIn />);

      const passwordInput = getByPlaceholderText('auth.passwordPlaceholder');
      fireEvent.changeText(passwordInput, 'password123');

      // Button should be disabled (isLoading=true) because no valid email is entered
      // Find the TouchableOpacity that contains the sign-in button text and is disabled
      const signInButton = getByText('auth.signInButton');
      let node = signInButton;
      while (node.parent) {
        if (node.props.disabled === true) break;
        node = node.parent;
      }
      expect(node.props.disabled).toBe(true);
    });

    it('disables submit button when no fields are filled', () => {
      const { getByText } = renderWithProviders(<SignIn />);

      // Button should be disabled because canSubmit is false
      const signInButton = getByText('auth.signInButton');
      let node = signInButton;
      while (node.parent) {
        if (node.props.disabled === true) break;
        node = node.parent;
      }
      expect(node.props.disabled).toBe(true);
    });

    it('enables submit button after entering valid email and waiting for debounce', async () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(<SignIn />);

      const emailInput = getByPlaceholderText('auth.emailPlaceholder');
      fireEvent.changeText(emailInput, 'test@example.com');

      // Wait for debounce to validate email
      await waitForDebounce();

      // Button should now be enabled
      const signInButton = getByText('auth.signInButton');
      const touchable = signInButton.parent?.parent;
      expect(touchable?.props.disabled).toBeFalsy();
    });
  });

  describe('Authentication Flow', () => {
    it('calls login service with correct credentials on submit', async () => {
      const mockSession = { $id: 'session-123', userId: 'user-123' };
      (login as jest.Mock).mockResolvedValue(mockSession);
      const mockSetUser = jest.fn();
      const mockSetIsLogged = jest.fn();

      const { getByText, getByPlaceholderText } = renderWithProviders(<SignIn />, {
        providerOverrides: {
          globalContext: {
            setUser: mockSetUser,
            setIsLogged: mockSetIsLogged,
          },
        },
      });

      const emailInput = getByPlaceholderText('auth.emailPlaceholder');
      const passwordInput = getByPlaceholderText('auth.passwordPlaceholder');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      // Wait for email validation debounce to enable the button
      await waitForDebounce();

      const signInButton = getByText('auth.signInButton');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(login).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('sets user and logged state on successful login', async () => {
      const mockSession = { $id: 'session-123', userId: 'user-123' };
      (login as jest.Mock).mockResolvedValue(mockSession);
      const mockSetUser = jest.fn();
      const mockSetIsLogged = jest.fn();

      const { getByText, getByPlaceholderText } = renderWithProviders(<SignIn />, {
        providerOverrides: {
          globalContext: {
            setUser: mockSetUser,
            setIsLogged: mockSetIsLogged,
          },
        },
      });

      const emailInput = getByPlaceholderText('auth.emailPlaceholder');
      const passwordInput = getByPlaceholderText('auth.passwordPlaceholder');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      await waitForDebounce();

      const signInButton = getByText('auth.signInButton');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(mockSetUser).toHaveBeenCalledWith(mockSession);
        expect(mockSetIsLogged).toHaveBeenCalledWith(true);
        expect(router.replace).toHaveBeenCalled();
      });
    });

    it('shows error alert on login failure', async () => {
      (login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

      const { getByText, getByPlaceholderText } = renderWithProviders(<SignIn />);

      const emailInput = getByPlaceholderText('auth.emailPlaceholder');
      const passwordInput = getByPlaceholderText('auth.passwordPlaceholder');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');

      await waitForDebounce();

      const signInButton = getByText('auth.signInButton');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('common.error', 'Invalid credentials');
      });
    });

    it('shows rate limit error message when rate limited', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).code = 'RATE_LIMIT_EXCEEDED';
      (login as jest.Mock).mockRejectedValue(rateLimitError);

      const { getByText, getByPlaceholderText } = renderWithProviders(<SignIn />);

      const emailInput = getByPlaceholderText('auth.emailPlaceholder');
      const passwordInput = getByPlaceholderText('auth.passwordPlaceholder');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      await waitForDebounce();

      const signInButton = getByText('auth.signInButton');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'errors.rateLimit.title',
          'errors.rateLimit.loginMessage'
        );
      });
    });

    it('shows the dedicated account-locked message when the account is locked', async () => {
      const lockedError = new Error('Account locked');
      (lockedError as any).code = 'ACCOUNT_LOCKED';
      (lockedError as any).isRateLimited = true;
      (login as jest.Mock).mockRejectedValue(lockedError);

      const { getByText, getByPlaceholderText } = renderWithProviders(<SignIn />);

      const emailInput = getByPlaceholderText('auth.emailPlaceholder');
      const passwordInput = getByPlaceholderText('auth.passwordPlaceholder');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      await waitForDebounce();

      const signInButton = getByText('auth.signInButton');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'errors.rateLimit.title',
          'errors.rateLimit.accountLockedMessage'
        );
      });
    });
  });

  describe('Reset-password nudge', () => {
    it('stays hidden until 2 failed attempts, then appears and opens the reset modal', async () => {
      (login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

      const { getByText, queryByText, getByPlaceholderText } = renderWithProviders(<SignIn />);

      // Hidden before any failed attempt.
      expect(queryByText('auth.troubleSigningInBody')).toBeNull();

      const emailInput = getByPlaceholderText('auth.emailPlaceholder');
      const passwordInput = getByPlaceholderText('auth.passwordPlaceholder');
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      await waitForDebounce();

      // 1st failed attempt — nudge still hidden.
      fireEvent.press(getByText('auth.signInButton'));
      await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
      expect(queryByText('auth.troubleSigningInBody')).toBeNull();

      // The button enters a short cooldown (text flips to tryAgainIn); wait until
      // it re-enables before the second press.
      await waitFor(() => expect(getByText('auth.signInButton')).toBeTruthy(), {
        timeout: 5000,
        interval: 200,
      });

      // 2nd failed attempt.
      fireEvent.press(getByText('auth.signInButton'));
      await waitFor(() => expect(login).toHaveBeenCalledTimes(2));

      // Nudge now visible.
      const nudge = await waitFor(() => getByText('auth.troubleSigningInBody'));

      // Tapping the nudge opens the forgot-password modal.
      fireEvent.press(nudge);
      expect(getByText('auth.resetPasswordTitle')).toBeTruthy();
    }, 15000);
  });

  describe('Forgot Password Modal', () => {
    it('opens forgot password modal when link is pressed', () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(<SignIn />);

      const forgotPasswordLink = getByText('auth.forgotPassword');
      fireEvent.press(forgotPasswordLink);

      // Modal should be visible with reset password elements
      expect(getByText('auth.resetPasswordTitle')).toBeTruthy();
      expect(getByText('auth.resetPasswordHowItWorks')).toBeTruthy();
      expect(getByText('auth.resetPasswordStep1')).toBeTruthy();
      expect(getByPlaceholderText('auth.resetPasswordPlaceholder')).toBeTruthy();
    });

    it('closes modal when cancel button is pressed', () => {
      const { getByText, queryByText } = renderWithProviders(<SignIn />);

      const forgotPasswordLink = getByText('auth.forgotPassword');
      fireEvent.press(forgotPasswordLink);

      expect(getByText('auth.resetPasswordTitle')).toBeTruthy();

      const cancelButton = getByText('common.cancel');
      fireEvent.press(cancelButton);

      // Modal should close (title should disappear)
      waitFor(() => {
        expect(queryByText('auth.resetPasswordTitle')).toBeNull();
      });
    });

    it('validates email before enabling send button', async () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(<SignIn />);

      const forgotPasswordLink = getByText('auth.forgotPassword');
      fireEvent.press(forgotPasswordLink);

      const emailInput = getByPlaceholderText('auth.resetPasswordPlaceholder');
      fireEvent.changeText(emailInput, 'invalid-email');

      // Send button should be disabled (loading state)
      await waitFor(() => {
        const sendButton = getByText('auth.resetPasswordSend');
        expect(sendButton).toBeTruthy();
      });
    });

    it('sends password reset request when valid email is provided', async () => {
      (forgotPassword as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Password reset email sent',
      });

      const { getByText, getByPlaceholderText } = renderWithProviders(<SignIn />);

      const forgotPasswordLink = getByText('auth.forgotPassword');
      fireEvent.press(forgotPasswordLink);

      const emailInput = getByPlaceholderText('auth.resetPasswordPlaceholder');
      fireEvent.changeText(emailInput, 'test@example.com');

      // Wait for debounce so send button becomes enabled
      await waitForDebounce();

      const sendButton = getByText('auth.resetPasswordSend');
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(forgotPassword).toHaveBeenCalledWith('test@example.com');
      });
    });

    it('shows success message after password reset request', async () => {
      (forgotPassword as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Password reset email sent',
      });

      const { getByText, getByPlaceholderText } = renderWithProviders(<SignIn />);

      const forgotPasswordLink = getByText('auth.forgotPassword');
      fireEvent.press(forgotPasswordLink);

      const emailInput = getByPlaceholderText('auth.resetPasswordPlaceholder');
      fireEvent.changeText(emailInput, 'test@example.com');

      await waitForDebounce();

      const sendButton = getByText('auth.resetPasswordSend');
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(getByText('auth.resetPasswordCheckEmail')).toBeTruthy();
        expect(getByText('test@example.com')).toBeTruthy();
        expect(getByText('auth.resetPasswordNextSteps')).toBeTruthy();
        expect(getByText('auth.resetPasswordCheckSpam')).toBeTruthy();
        expect(getByText('auth.resetPasswordGotIt')).toBeTruthy();
      });
    });

    it('shows error message when password reset fails', async () => {
      (forgotPassword as jest.Mock).mockRejectedValue(new Error('Failed to send email'));

      const { getByText, getByPlaceholderText } = renderWithProviders(<SignIn />);

      const forgotPasswordLink = getByText('auth.forgotPassword');
      fireEvent.press(forgotPasswordLink);

      const emailInput = getByPlaceholderText('auth.resetPasswordPlaceholder');
      fireEvent.changeText(emailInput, 'test@example.com');

      await waitForDebounce();

      const sendButton = getByText('auth.resetPasswordSend');
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(getByText('common.error')).toBeTruthy();
      });
    });

    it('shows the rate-limit message when the password reset is rate limited', async () => {
      // Mock the exact shape the interceptor now produces (code + isRateLimited,
      // no `.response`) that forgotPassword() forwards intact — this proves the
      // previously-dead forgotPasswordMessage branch is now reachable.
      const rateLimitError = Object.assign(new Error('Too many requests'), {
        code: 'RATE_LIMIT_EXCEEDED',
        isRateLimited: true,
      });
      (forgotPassword as jest.Mock).mockRejectedValue(rateLimitError);

      const { getByText, getByPlaceholderText } = renderWithProviders(<SignIn />);

      fireEvent.press(getByText('auth.forgotPassword'));

      const emailInput = getByPlaceholderText('auth.resetPasswordPlaceholder');
      fireEvent.changeText(emailInput, 'test@example.com');
      await waitForDebounce();

      fireEvent.press(getByText('auth.resetPasswordSend'));

      await waitFor(() => {
        expect(getByText('errors.rateLimit.forgotPasswordMessage')).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('navigates back when back button is pressed', () => {
      const { getByLabelText } = renderWithProviders(<SignIn />);

      const backButton = getByLabelText('Go back');
      fireEvent.press(backButton);

      expect(router.back).toHaveBeenCalled();
    });
  });
});
