jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn(() => 'light') }));
jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key: string, options?: { count?: number }) =>
    options?.count === undefined ? key : `${key}:${options.count}`
  ),
}));
jest.mock('@/services/mfa.service', () => ({
  startTotpEnrollment: jest.fn(),
  confirmTotpEnrollment: jest.fn(),
  clearPendingEnrollment: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/services/auth.service', () => ({ storeSession: jest.fn() }));
jest.mock('@/utils/urlSafety', () => ({ openTotpSetupUri: jest.fn() }));

import React from 'react';
import { Alert, Share } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import MfaEnrollmentStep from '@/components/auth/MfaEnrollmentStep';
import { storeSession } from '@/services/auth.service';
import {
  clearPendingEnrollment,
  confirmTotpEnrollment,
  startTotpEnrollment,
} from '@/services/mfa.service';
import type { MfaEnrollment } from '@/types/mfa.types';
import { AuthError } from '@/utils/authError';
import { openTotpSetupUri } from '@/utils/urlSafety';

const mockStart = startTotpEnrollment as jest.Mock;
const mockConfirm = confirmTotpEnrollment as jest.Mock;
const mockClearPending = clearPendingEnrollment as jest.Mock;
const mockStoreSession = storeSession as jest.Mock;
const mockOpen = openTotpSetupUri as jest.Mock;

const enrollment: MfaEnrollment = {
  enrollmentToken: 'e'.repeat(43),
  methods: ['totp'],
  expiresIn: 900,
};
const setup = {
  methodId: 'method-1',
  otpauthUri: 'otpauth://totp/ProtestBase?secret=AAAABBBBCCCCDDDD',
  qrDataUri: 'data:image/png;base64,AAAA',
  manualKey: 'AAAABBBBCCCCDDDD',
};
const user = { $id: 'user-1', email: 'organizer@example.org' };
const signIn = {
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresIn: 900,
  refreshExpiresIn: 259200,
  user,
  session: { $id: 'session-1' },
  secondFactor: 'totp',
  recoveryCodes: ['ABCDE-23456', 'FGHJK-78923'],
};

function renderStep() {
  const onSignedIn = jest.fn();
  const onRestart = jest.fn();
  const onCodesShownChange = jest.fn();
  const onBusyChange = jest.fn();
  render(
    <MfaEnrollmentStep
      enrollment={enrollment}
      onSignedIn={onSignedIn}
      onRestart={onRestart}
      onCodesShownChange={onCodesShownChange}
      onBusyChange={onBusyChange}
    />
  );
  return { onSignedIn, onRestart, onCodesShownChange, onBusyChange };
}

async function confirmWithCode(code = '123456') {
  fireEvent.changeText(await screen.findByTestId('mfa-enroll-input'), code);
  fireEvent.press(screen.getByTestId('mfa-enroll-submit'));
}

describe('MfaEnrollmentStep', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockStart.mockResolvedValue(setup);
    mockStoreSession.mockResolvedValue(user);
  });

  afterEach(() => alertSpy.mockRestore());

  it('shows the setup key unbroken, so press and hold copies all of it', async () => {
    renderStep();

    expect(await screen.findByText('AAAABBBBCCCCDDDD')).toBeTruthy();
    expect(mockStart).toHaveBeenCalledWith(enrollment.enrollmentToken);
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it('lays out the two steps with no QR code, since the authenticator is on this phone', async () => {
    renderStep();

    expect(await screen.findByText('mfa.stepAddTitle')).toBeTruthy();
    expect(screen.getByText('mfa.openAuthenticatorHelp')).toBeTruthy();
    expect(screen.getByText('mfa.manualKeyHelp')).toBeTruthy();
    expect(screen.getByText('mfa.stepCodeTitle')).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).not.toContain(setup.qrDataUri);
  });

  it('forgets the stored setup once a code is accepted, not after a wrong one', async () => {
    mockConfirm
      .mockRejectedValueOnce(
        new AuthError('That code is incorrect or has expired', {
          code: 'INVALID_MFA_CODE',
          status: 400,
          details: { attemptsRemaining: 4 },
        })
      )
      .mockResolvedValueOnce(signIn);
    renderStep();

    await confirmWithCode('111111');
    await screen.findByText('mfa.wrongCode mfa.attemptsLeft:4');
    expect(mockClearPending).not.toHaveBeenCalled();

    await confirmWithCode('123456');
    await screen.findByText('ABCDE-23456');
    expect(mockClearPending).toHaveBeenCalledTimes(1);
  });

  it('opens the setup link in an authenticator app, or explains the setup key', async () => {
    mockOpen.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    renderStep();

    fireEvent.press(await screen.findByTestId('mfa-open-authenticator'));
    await waitFor(() => expect(mockOpen).toHaveBeenCalledWith(setup.otpauthUri));
    expect(alertSpy).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('mfa-open-authenticator'));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'mfa.noAuthenticatorTitle',
        'mfa.noAuthenticatorMessage'
      )
    );
  });

  it('shows the recovery codes and stores the session only once they are saved', async () => {
    mockConfirm.mockResolvedValueOnce(signIn);
    const { onSignedIn, onCodesShownChange } = renderStep();

    await confirmWithCode();

    expect(await screen.findByText('ABCDE-23456')).toBeTruthy();
    expect(screen.getByText('FGHJK-78923')).toBeTruthy();
    expect(mockConfirm).toHaveBeenCalledWith(enrollment.enrollmentToken, 'method-1', '123456');
    expect(onCodesShownChange).toHaveBeenLastCalledWith(true);
    expect(mockStoreSession).not.toHaveBeenCalled();
    expect(screen.queryByTestId('mfa-back-to-sign-in')).toBeNull();

    fireEvent.press(screen.getByTestId('mfa-recovery-codes-saved'));

    await waitFor(() => expect(onSignedIn).toHaveBeenCalledWith(user));
    expect(mockStoreSession).toHaveBeenCalledWith(signIn);
    expect(onCodesShownChange).toHaveBeenLastCalledWith(false);
  });

  it('shares the recovery codes', async () => {
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    mockConfirm.mockResolvedValueOnce(signIn);
    renderStep();

    await confirmWithCode();
    fireEvent.press(await screen.findByTestId('mfa-share-recovery-codes'));

    await waitFor(() =>
      expect(shareSpy).toHaveBeenCalledWith({
        title: 'mfa.recoveryCodesShareTitle',
        message: 'mfa.recoveryCodesShareTitle\n\nABCDE-23456\nFGHJK-78923',
      })
    );
    shareSpy.mockRestore();
  });

  it('keeps the codes on screen when the session cannot be stored', async () => {
    mockConfirm.mockResolvedValueOnce(signIn);
    mockStoreSession.mockRejectedValueOnce(new Error('keychain unavailable'));
    const { onSignedIn } = renderStep();

    await confirmWithCode();
    fireEvent.press(await screen.findByTestId('mfa-recovery-codes-saved'));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('common.error', 'errors.unknownError')
    );
    expect(onSignedIn).not.toHaveBeenCalled();
    expect(screen.getByText('ABCDE-23456')).toBeTruthy();
  });

  it('signs in at once when the answer carries no new codes', async () => {
    mockConfirm.mockResolvedValueOnce({ ...signIn, recoveryCodes: undefined });
    const { onSignedIn, onCodesShownChange } = renderStep();

    await confirmWithCode();

    await waitFor(() => expect(onSignedIn).toHaveBeenCalledWith(user));
    expect(onCodesShownChange).not.toHaveBeenCalledWith(true);
  });

  it('shows a wrong first code next to the field', async () => {
    mockConfirm.mockRejectedValueOnce(
      new AuthError('That code is incorrect or has expired', {
        code: 'INVALID_MFA_CODE',
        status: 400,
        details: { attemptsRemaining: 4 },
      })
    );
    renderStep();

    await confirmWithCode();

    expect(await screen.findByText('mfa.wrongCode mfa.attemptsLeft:4')).toBeTruthy();
  });

  it('offers a retry when the setup cannot be fetched', async () => {
    mockStart.mockRejectedValueOnce(new AuthError('Could not start the setup'));
    renderStep();

    fireEvent.press(await screen.findByTestId('mfa-setup-retry'));

    expect(await screen.findByText('AAAABBBBCCCCDDDD')).toBeTruthy();
    expect(mockStart).toHaveBeenCalledTimes(2);
  });

  it('goes back to the password when another sign-in has finished the setup', async () => {
    mockStart.mockRejectedValueOnce(
      new AuthError('Already set up', { code: 'MFA_ALREADY_ENROLLED', status: 409 })
    );
    const { onRestart } = renderStep();

    await waitFor(() => expect(onRestart).toHaveBeenCalled());
    // Nothing expired: someone else finished the setup, so the title says that, not "expired".
    expect(alertSpy).toHaveBeenCalledWith('mfa.alreadyEnrolledTitle', 'mfa.alreadyEnrolledMessage');
  });

  it('goes back to the password without sending once the enrolment has run out', async () => {
    renderStep();
    await screen.findByTestId('mfa-enroll-input');
    const later = Date.now() + 900_000;
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(later);

    await confirmWithCode();

    expect(mockConfirm).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('mfa.expiredTitle', 'mfa.setupExpiredMessage');
    nowSpy.mockRestore();
  });

  it('says the account is disabled and goes back to the password', async () => {
    mockStart.mockRejectedValueOnce(
      new AuthError('Account is disabled', { code: 'ACCOUNT_DISABLED', status: 403 })
    );
    const { onRestart } = renderStep();

    await waitFor(() => expect(onRestart).toHaveBeenCalled());
    expect(alertSpy).toHaveBeenCalledWith('session.accountDisabled', 'auth.accountDisabledMessage');
  });

  // Once confirmed, the backend has turned the factor on: leaving before the answer arrives
  // would lose the recovery codes.
  it('keeps the way back closed while the first code is being confirmed', async () => {
    let answer: (value: typeof signIn) => void = () => {};
    mockConfirm.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
    const { onRestart, onBusyChange, onCodesShownChange } = renderStep();

    await confirmWithCode();

    expect(onBusyChange).toHaveBeenLastCalledWith(true);
    fireEvent.press(screen.getByTestId('mfa-back-to-sign-in'));
    expect(onRestart).not.toHaveBeenCalled();

    await act(async () => answer(signIn));

    expect(await screen.findByText('ABCDE-23456')).toBeTruthy();
    expect(onCodesShownChange).toHaveBeenLastCalledWith(true);
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
  });
});
