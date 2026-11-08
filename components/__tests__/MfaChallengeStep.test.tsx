jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn(() => 'light') }));
jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key: string, options?: { count?: number }) =>
    options?.count === undefined ? key : `${key}:${options.count}`
  ),
}));
jest.mock('@/services/mfa.service', () => ({ verifyMfaCode: jest.fn() }));

import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import MfaChallengeStep from '@/components/auth/MfaChallengeStep';
import { verifyMfaCode } from '@/services/mfa.service';
import type { MfaChallenge } from '@/types/mfa.types';
import { AuthError } from '@/utils/authError';

const mockVerify = verifyMfaCode as jest.Mock;

const challenge: MfaChallenge = { challengeId: 'c'.repeat(43), methods: ['totp'], expiresIn: 300 };
const user = { $id: 'user-1', email: 'organizer@example.org' };

function renderStep(overrides: Partial<MfaChallenge> = {}) {
  const onSignedIn = jest.fn();
  const onRestart = jest.fn();
  render(
    <MfaChallengeStep
      challenge={{ ...challenge, ...overrides }}
      onSignedIn={onSignedIn}
      onRestart={onRestart}
    />
  );
  return { onSignedIn, onRestart };
}

function enterCode(code: string) {
  fireEvent.changeText(screen.getByTestId('mfa-challenge-input'), code);
  fireEvent.press(screen.getByTestId('mfa-challenge-submit'));
}

describe('MfaChallengeStep', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
    jest.useRealTimers();
  });

  it('signs in with the code from the authenticator app', async () => {
    mockVerify.mockResolvedValueOnce({ user });
    const { onSignedIn } = renderStep();

    expect(screen.getByText('mfa.challengeTitle')).toBeTruthy();
    enterCode('123456');

    await waitFor(() => expect(onSignedIn).toHaveBeenCalledWith({ user }));
    expect(mockVerify).toHaveBeenCalledWith(challenge.challengeId, 'totp', '123456');
  });

  it('offers the authenticator as with ["totp"] when the backend also lists passkeys', async () => {
    mockVerify.mockResolvedValueOnce({ user });
    const { onSignedIn } = renderStep({ methods: ['totp', 'webauthn'] });

    expect(screen.getByText('mfa.challengeTitle')).toBeTruthy();
    expect(screen.queryByText('mfa.passkeyOnly')).toBeNull();
    // Recovery codes stay one tap away, as with ["totp"].
    expect(screen.getByTestId('mfa-challenge-switch')).toBeTruthy();
    enterCode('123456');

    await waitFor(() => expect(onSignedIn).toHaveBeenCalledWith({ user }));
    expect(mockVerify).toHaveBeenCalledWith(challenge.challengeId, 'totp', '123456');
  });

  it('signs in with a recovery code and passes on how many are left', async () => {
    mockVerify.mockResolvedValueOnce({ user, recoveryCodesRemaining: 1 });
    const { onSignedIn } = renderStep();

    fireEvent.press(screen.getByTestId('mfa-challenge-switch'));
    enterCode('ABCDE-23456');

    await waitFor(() =>
      expect(onSignedIn).toHaveBeenCalledWith({ user, recoveryCodesRemaining: 1 })
    );
    expect(mockVerify).toHaveBeenCalledWith(challenge.challengeId, 'recovery', 'ABCDE23456');
  });

  it('shows a wrong code next to the field and stays', async () => {
    mockVerify.mockRejectedValueOnce(
      new AuthError('That code is incorrect or has expired', {
        code: 'INVALID_MFA_CODE',
        status: 401,
        details: { attemptsRemaining: 4 },
      })
    );
    const { onRestart, onSignedIn } = renderStep();

    enterCode('123456');

    expect(await screen.findByText('mfa.wrongCode mfa.attemptsLeft:4')).toBeTruthy();
    expect(onRestart).not.toHaveBeenCalled();
    expect(onSignedIn).not.toHaveBeenCalled();
  });

  it('goes back to the password when the backend has dropped the challenge', async () => {
    mockVerify.mockRejectedValueOnce(
      new AuthError('This sign-in has expired.', { code: 'MFA_CHALLENGE_INVALID', status: 401 })
    );
    const { onRestart } = renderStep();

    enterCode('123456');

    await waitFor(() => expect(onRestart).toHaveBeenCalled());
    expect(alertSpy).toHaveBeenCalledWith('mfa.expiredTitle', 'mfa.expiredMessage');
  });

  it('goes back to the password without sending once the challenge has run out', () => {
    jest.useFakeTimers({ now: 1_000_000 });
    const { onRestart } = renderStep({ expiresIn: 300 });

    jest.setSystemTime(1_000_000 + 300_000);
    enterCode('123456');

    expect(mockVerify).not.toHaveBeenCalled();
    expect(onRestart).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('mfa.expiredTitle', 'mfa.expiredMessage');
  });

  it('offers only recovery codes to an account that has just a passkey', () => {
    renderStep({ methods: ['webauthn'] });

    expect(screen.getByText('mfa.passkeyOnly')).toBeTruthy();
    expect(screen.getByText('mfa.recoveryCodeLabel')).toBeTruthy();
    expect(screen.queryByTestId('mfa-challenge-switch')).toBeNull();
  });

  it('goes back to the password on request', () => {
    const { onRestart } = renderStep();

    fireEvent.press(screen.getByTestId('mfa-back-to-sign-in'));

    expect(onRestart).toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
