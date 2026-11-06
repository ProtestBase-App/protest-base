jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn().mockReturnValue('light') }));
jest.mock('@/services/auth.service', () => ({
  login: jest.fn(),
  forgotPassword: jest.fn(),
  storeSession: jest.fn(),
}));
jest.mock('@/services/mfa.service', () => ({
  verifyMfaCode: jest.fn(),
  startTotpEnrollment: jest.fn(),
  confirmTotpEnrollment: jest.fn(),
  savePendingEnrollment: jest.fn(() => Promise.resolve()),
  loadPendingEnrollment: jest.fn(() => Promise.resolve(null)),
  clearPendingEnrollment: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/utils/i18n', () => ({ t: jest.fn((key) => key) }));

import React from 'react';
import { Alert } from 'react-native';
import { act } from '@testing-library/react-native';
import { router, useNavigation } from 'expo-router';
import { renderWithProviders, fireEvent, waitFor } from '@/test-utils/render';
import { spyOnBackHandler } from '@/test-utils/backHandler';
import SignIn from '@/app/(auth)/sign-in';
import { login, forgotPassword, storeSession } from '@/services/auth.service';
import {
  clearPendingEnrollment,
  confirmTotpEnrollment,
  loadPendingEnrollment,
  savePendingEnrollment,
  startTotpEnrollment,
  verifyMfaCode,
} from '@/services/mfa.service';
import { AuthError } from '@/utils/authError';

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

    it('explains a disabled account without a cooldown or the reset-password nudge', async () => {
      const disabledError = Object.assign(new Error('Account is disabled'), {
        code: 'ACCOUNT_DISABLED',
      });
      (login as jest.Mock).mockRejectedValue(disabledError);

      const { getByText, queryByText, getByPlaceholderText } = renderWithProviders(<SignIn />);
      fireEvent.changeText(getByPlaceholderText('auth.emailPlaceholder'), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText('auth.passwordPlaceholder'), 'password123');
      await waitForDebounce();

      fireEvent.press(getByText('auth.signInButton'));
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'session.accountDisabled',
          'auth.accountDisabledMessage'
        );
      });

      // Not a wrong password: the button stays available and no nudge appears, even twice.
      expect(queryByText('auth.tryAgainIn')).toBeNull();
      fireEvent.press(getByText('auth.signInButton'));
      await waitFor(() => expect(login).toHaveBeenCalledTimes(2));
      expect(queryByText('auth.troubleSigningInBody')).toBeNull();
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

      // The button enters a short cooldown (text flips to tryAgainIn); wait for it
      // to start — the label reads signInButton for a render before the cooldown
      // ticks — then until it re-enables before the second press.
      await waitFor(() => expect(getByText('auth.tryAgainIn')).toBeTruthy());
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

  describe('Second step', () => {
    const user = { $id: 'user-1', email: 'organizer@example.org' };

    const secondStepError = (code: string, mfa: Record<string, unknown>) =>
      new AuthError('A second verification step is required.', {
        code,
        status: 403,
        details: { mfa },
      });

    const challengeError = () =>
      secondStepError('MFA_REQUIRED', {
        challengeId: 'c'.repeat(43),
        methods: ['totp'],
        expiresIn: 300,
      });

    function renderSignIn() {
      const setUser = jest.fn();
      const setIsLogged = jest.fn();
      const utils = renderWithProviders(<SignIn />, {
        providerOverrides: { globalContext: { setUser, setIsLogged } },
      });
      return { ...utils, setUser, setIsLogged };
    }

    async function submitPassword(utils: ReturnType<typeof renderSignIn>) {
      fireEvent.changeText(
        utils.getByPlaceholderText('auth.emailPlaceholder'),
        'organizer@example.org'
      );
      fireEvent.changeText(utils.getByPlaceholderText('auth.passwordPlaceholder'), 'password123');
      await waitForDebounce();
      fireEvent.press(utils.getByText('auth.signInButton'));
    }

    it('asks for the code after a correct password and signs in with it', async () => {
      (login as jest.Mock).mockRejectedValue(challengeError());
      (verifyMfaCode as jest.Mock).mockResolvedValue({ user });
      const utils = renderSignIn();

      await submitPassword(utils);

      expect(await utils.findByText('mfa.challengeTitle')).toBeTruthy();
      expect(utils.queryByText('auth.signInButton')).toBeNull();
      expect(utils.queryByLabelText('Go back')).toBeNull();

      fireEvent.changeText(utils.getByTestId('mfa-challenge-input'), '123456');
      fireEvent.press(utils.getByTestId('mfa-challenge-submit'));

      await waitFor(() => expect(utils.setIsLogged).toHaveBeenCalledWith(true));
      expect(utils.setUser).toHaveBeenCalledWith(user);
      expect(router.replace).toHaveBeenCalled();
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('warns when few recovery codes are left', async () => {
      (login as jest.Mock).mockRejectedValue(challengeError());
      (verifyMfaCode as jest.Mock).mockResolvedValue({ user, recoveryCodesRemaining: 1 });
      const utils = renderSignIn();

      await submitPassword(utils);
      fireEvent.press(await utils.findByTestId('mfa-challenge-switch'));
      fireEvent.changeText(utils.getByTestId('mfa-challenge-input'), 'ABCDE-23456');
      fireEvent.press(utils.getByTestId('mfa-challenge-submit'));

      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith(
          'mfa.recoveryCodesLowTitle',
          'mfa.recoveryCodesLow'
        )
      );
      expect(utils.setIsLogged).toHaveBeenCalledWith(true);
    });

    it('goes back to an empty password with no cooldown or nudge', async () => {
      (login as jest.Mock).mockRejectedValue(challengeError());
      const utils = renderSignIn();

      await submitPassword(utils);
      await backToPassword(utils);

      expect(utils.getByPlaceholderText('auth.passwordPlaceholder').props.value).toBe('');
      expect(utils.queryByText('auth.tryAgainIn')).toBeNull();
      expect(utils.queryByText('auth.troubleSigningInBody')).toBeNull();
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    async function backToPassword(utils: ReturnType<typeof renderSignIn>) {
      fireEvent.press(await utils.findByTestId('mfa-back-to-sign-in'));
      expect(utils.getByText('auth.signInButton')).toBeTruthy();
    }

    it('returns from the code to the password on Android back', async () => {
      const backHandler = spyOnBackHandler();
      (login as jest.Mock).mockRejectedValue(challengeError());
      const utils = renderSignIn();

      expect(backHandler.pressBack()).toBe(false);
      await submitPassword(utils);
      await utils.findByText('mfa.challengeTitle');

      expect(backHandler.pressBack()).toBe(true);
      expect(await utils.findByText('auth.signInButton')).toBeTruthy();
      expect(backHandler.pressBack()).toBe(false);
      backHandler.restore();
    });

    it('keeps the user on new recovery codes until they are saved, then signs in', async () => {
      const parent = { setOptions: jest.fn() };
      const navigation = jest.mocked(useNavigation);
      const defaultNavigation = navigation.getMockImplementation();
      navigation.mockReturnValue({ setOptions: jest.fn(), getParent: () => parent } as never);
      const backHandler = spyOnBackHandler();
      (login as jest.Mock).mockRejectedValue(
        secondStepError('MFA_ENROLLMENT_REQUIRED', {
          enrollmentToken: 'e'.repeat(43),
          methods: ['totp'],
          expiresIn: 900,
        })
      );
      (startTotpEnrollment as jest.Mock).mockResolvedValue({
        methodId: 'method-1',
        otpauthUri: 'otpauth://totp/ProtestBase?secret=AAAABBBBCCCCDDDD',
        qrDataUri: 'data:image/png;base64,AAAA',
        manualKey: 'AAAABBBBCCCCDDDD',
      });
      const signIn = {
        accessToken: 'access',
        refreshToken: 'refresh',
        user,
        session: { $id: 'session-1' },
        secondFactor: 'totp',
        recoveryCodes: ['ABCDE-23456'],
      };
      (confirmTotpEnrollment as jest.Mock).mockResolvedValue(signIn);
      (storeSession as jest.Mock).mockResolvedValue(user);
      const utils = renderSignIn();

      await submitPassword(utils);
      fireEvent.changeText(await utils.findByTestId('mfa-enroll-input'), '123456');
      fireEvent.press(utils.getByTestId('mfa-enroll-submit'));

      expect(await utils.findByText('ABCDE-23456')).toBeTruthy();
      expect(parent.setOptions).toHaveBeenLastCalledWith({ gestureEnabled: false });
      expect(backHandler.pressBack()).toBe(true);
      expect(utils.getByText('ABCDE-23456')).toBeTruthy();
      expect(storeSession).not.toHaveBeenCalled();
      expect(utils.setIsLogged).not.toHaveBeenCalled();

      fireEvent.press(utils.getByTestId('mfa-recovery-codes-saved'));

      await waitFor(() => expect(utils.setIsLogged).toHaveBeenCalledWith(true));
      expect(storeSession).toHaveBeenCalledWith(signIn);
      expect(utils.setUser).toHaveBeenCalledWith(user);
      expect(parent.setOptions).toHaveBeenLastCalledWith({ gestureEnabled: true });

      backHandler.restore();
      if (defaultNavigation) navigation.mockImplementation(defaultNavigation);
    });

    describe('setup interrupted by a restart', () => {
      const enrollment = { enrollmentToken: 'e'.repeat(43), methods: ['totp'], expiresIn: 900 };
      const resumed = { enrollmentToken: 'r'.repeat(43), methods: ['totp'], expiresIn: 600 };

      beforeEach(() => {
        (startTotpEnrollment as jest.Mock).mockResolvedValue({
          methodId: 'method-1',
          otpauthUri: 'otpauth://totp/ProtestBase?secret=AAAABBBBCCCCDDDD',
          qrDataUri: 'data:image/png;base64,AAAA',
          manualKey: 'AAAABBBBCCCCDDDD',
        });
      });

      it('keeps the setup demanded at sign-in', async () => {
        (login as jest.Mock).mockRejectedValue(
          secondStepError('MFA_ENROLLMENT_REQUIRED', enrollment)
        );
        const utils = renderSignIn();

        await submitPassword(utils);

        expect(await utils.findByText('mfa.enrollTitle')).toBeTruthy();
        expect(savePendingEnrollment).toHaveBeenCalledWith(enrollment);
      });

      it('does not keep a code step, whose key never changes', async () => {
        (login as jest.Mock).mockRejectedValue(challengeError());
        const utils = renderSignIn();

        await submitPassword(utils);

        expect(await utils.findByText('mfa.challengeTitle')).toBeTruthy();
        expect(savePendingEnrollment).not.toHaveBeenCalled();
      });

      it('resumes a stored setup with its own token when the screen opens', async () => {
        (loadPendingEnrollment as jest.Mock).mockResolvedValueOnce(resumed);
        const utils = renderSignIn();

        expect(await utils.findByText('AAAABBBBCCCCDDDD')).toBeTruthy();
        expect(startTotpEnrollment).toHaveBeenCalledWith(resumed.enrollmentToken);
        expect(utils.queryByText('auth.signInButton')).toBeNull();
        expect(login).not.toHaveBeenCalled();
      });

      it('forgets the stored setup when the user goes back to the password', async () => {
        (loadPendingEnrollment as jest.Mock).mockResolvedValueOnce(resumed);
        const utils = renderSignIn();

        fireEvent.press(await utils.findByTestId('mfa-back-to-sign-in'));

        expect(await utils.findByText('auth.signInButton')).toBeTruthy();
        expect(clearPendingEnrollment).toHaveBeenCalled();
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
