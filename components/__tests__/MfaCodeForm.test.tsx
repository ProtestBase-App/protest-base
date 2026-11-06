jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn(() => 'light') }));
jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key: string, options?: { count?: number }) =>
    options?.count === undefined ? key : `${key}:${options.count}`
  ),
}));

import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import MfaCodeForm, { type MfaCodeFormProps } from '@/components/auth/MfaCodeForm';

function renderForm(props: Partial<MfaCodeFormProps> = {}) {
  const onSubmit = jest.fn();
  const onEdit = jest.fn();
  const utils = render(
    <MfaCodeForm
      allowAuthenticator
      allowRecovery
      submitLabel="Verify"
      submitting={false}
      failure={null}
      onSubmit={onSubmit}
      onEdit={onEdit}
      testID="form"
      {...props}
    />
  );
  return { ...utils, onSubmit, onEdit };
}

describe('MfaCodeForm', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('sends a well-formed authenticator code without its spaces', () => {
    const { onSubmit } = renderForm();

    fireEvent.changeText(screen.getByTestId('form-input'), '123 456');
    fireEvent.press(screen.getByTestId('form-submit'));

    expect(onSubmit).toHaveBeenCalledWith('totp', '123456');
  });

  it("explains a malformed code instead of spending one of the account's attempts", () => {
    const { onSubmit } = renderForm();

    fireEvent.changeText(screen.getByTestId('form-input'), '12345');
    fireEvent.press(screen.getByTestId('form-submit'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('mfa.invalidCodeFormat')).toBeTruthy();
  });

  it('switches to a recovery code and sends it normalized', () => {
    const { onSubmit, onEdit } = renderForm();

    fireEvent.press(screen.getByTestId('form-switch'));
    expect(onEdit).toHaveBeenCalled();
    expect(screen.getByText('mfa.recoveryCodeLabel')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('form-input'), 'abcde-23456');
    fireEvent.press(screen.getByTestId('form-submit'));

    expect(onSubmit).toHaveBeenCalledWith('recovery', 'ABCDE23456');
  });

  it('asks only for a recovery code when the authenticator is not an option', () => {
    const { onSubmit } = renderForm({ allowAuthenticator: false });

    expect(screen.queryByTestId('form-switch')).toBeNull();
    expect(screen.getByText('mfa.recoveryCodeLabel')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('form-input'), '123456');
    fireEvent.press(screen.getByTestId('form-submit'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('mfa.invalidRecoveryFormat')).toBeTruthy();
  });

  it('offers no recovery code while confirming a new authenticator', () => {
    renderForm({ allowRecovery: false });

    expect(screen.queryByTestId('form-switch')).toBeNull();
  });

  it('shows the intro for the kind of code asked', () => {
    renderForm({ intro: { totp: 'Enter the app code', recovery: 'Enter a recovery code' } });

    expect(screen.getByText('Enter the app code')).toBeTruthy();
    fireEvent.press(screen.getByTestId('form-switch'));
    expect(screen.getByText('Enter a recovery code')).toBeTruthy();
  });

  it('says how many attempts are left after a wrong code, and announces it', () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    renderForm({ failure: { kind: 'wrongCode', attemptsRemaining: 3 } });

    expect(screen.getByText('mfa.wrongCode mfa.attemptsLeft:3')).toBeTruthy();
    expect(announce).toHaveBeenCalledWith('mfa.wrongCode mfa.attemptsLeft:3');
  });

  it('stops taking codes once no attempt is left', () => {
    const { onSubmit } = renderForm({ failure: { kind: 'wrongCode', attemptsRemaining: 0 } });

    expect(screen.getByText('mfa.blocked')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('form-input'), '123456');
    fireEvent.press(screen.getByTestId('form-submit'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('counts the lock down in minutes and takes codes again once it ends', () => {
    jest.useFakeTimers({ now: 1_000_000 });
    const { onSubmit } = renderForm({ failure: { kind: 'locked', until: 1_000_000 + 600_000 } });
    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(screen.getByText('mfa.lockedFor:10')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(300_000);
    });
    expect(screen.getByText('mfa.lockedFor:5')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(300_000);
    });
    expect(screen.queryByText(/mfa.lockedFor/)).toBeNull();
    fireEvent.changeText(screen.getByTestId('form-input'), '123456');
    fireEvent.press(screen.getByTestId('form-submit'));
    expect(onSubmit).toHaveBeenCalledWith('totp', '123456');
  });

  it('says "later" for a lock of unknown length', () => {
    renderForm({ failure: { kind: 'locked', until: null } });

    expect(screen.getByText('mfa.blocked')).toBeTruthy();
  });

  it.each([
    [{ kind: 'rateLimited' } as const, 'errors.rateLimit.message'],
    [{ kind: 'network' } as const, 'errors.network'],
    [{ kind: 'other', message: 'Verification failed' } as const, 'Verification failed'],
    [{ kind: 'other', message: null } as const, 'errors.unknownError'],
  ])('explains %o', (failure, text) => {
    renderForm({ failure });

    expect(screen.getByText(text)).toBeTruthy();
  });

  it('does not send while a code is on its way', () => {
    const { onSubmit } = renderForm({ submitting: true });

    fireEvent.changeText(screen.getByTestId('form-input'), '123456');
    fireEvent(screen.getByTestId('form-input'), 'submitEditing');

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
