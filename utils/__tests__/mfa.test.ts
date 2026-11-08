import { AxiosError, AxiosHeaders } from 'axios';
import { AuthError } from '@/utils/authError';
import {
  acceptsAuthenticatorCode,
  describeMfaFailure,
  isMfaBlocked,
  isWellFormedMfaCode,
  normalizeMfaCode,
  secondStepFromError,
} from '@/utils/mfa';

const CHALLENGE_ID = 'c'.repeat(43);
const ENROLLMENT_TOKEN = 'e'.repeat(43);

describe('normalizeMfaCode', () => {
  it('drops the spaces of an authenticator code', () => {
    expect(normalizeMfaCode('totp', ' 123 456 ')).toBe('123456');
  });

  it('drops dashes, spaces and case from a recovery code', () => {
    expect(normalizeMfaCode('recovery', 'abcde - 23456')).toBe('ABCDE23456');
  });
});

describe('isWellFormedMfaCode', () => {
  it.each([
    ['totp', '123456', true],
    ['totp', '123 456', true],
    ['totp', '12345', false],
    ['totp', '1234567', false],
    ['totp', '12345a', false],
    ['recovery', 'ABCDE-23456', true],
    ['recovery', 'abcde23456', true],
    ['recovery', 'ABCDE-2345', false],
    // The backend's alphabet has no 0, 1, I or O, so these can never match.
    ['recovery', 'ABCDE-23450', false],
    ['recovery', 'ABCDI-23456', false],
  ] as const)('%s %s → %s', (method, input, expected) => {
    expect(isWellFormedMfaCode(method, input)).toBe(expected);
  });
});

describe('acceptsAuthenticatorCode', () => {
  it('is true only when the account has an authenticator', () => {
    expect(acceptsAuthenticatorCode(['totp'])).toBe(true);
    expect(acceptsAuthenticatorCode(['totp', 'webauthn'])).toBe(true);
    expect(acceptsAuthenticatorCode(['webauthn'])).toBe(false);
    expect(acceptsAuthenticatorCode([])).toBe(false);
  });
});

describe('secondStepFromError', () => {
  const loginError = (code: string, mfa: unknown) =>
    new AuthError('A second verification step is required.', {
      code,
      status: 403,
      details: { mfa } as never,
    });

  it('reads a challenge from 403 MFA_REQUIRED', () => {
    const error = loginError('MFA_REQUIRED', {
      challengeId: CHALLENGE_ID,
      methods: ['totp', 'webauthn', 42],
      expiresIn: 300,
    });

    expect(secondStepFromError(error)).toEqual({
      kind: 'challenge',
      challenge: { challengeId: CHALLENGE_ID, methods: ['totp', 'webauthn'], expiresIn: 300 },
    });
  });

  it('reads an enrolment from 403 MFA_ENROLLMENT_REQUIRED', () => {
    const error = loginError('MFA_ENROLLMENT_REQUIRED', {
      enrollmentToken: ENROLLMENT_TOKEN,
      methods: ['totp'],
      expiresIn: 900,
    });

    expect(secondStepFromError(error)).toEqual({
      kind: 'enroll',
      enrollment: { enrollmentToken: ENROLLMENT_TOKEN, methods: ['totp'], expiresIn: 900 },
    });
  });

  it("falls back to the backend's lifetimes when the answer leaves them out", () => {
    expect(
      secondStepFromError(loginError('MFA_REQUIRED', { challengeId: CHALLENGE_ID }))
    ).toMatchObject({ challenge: { methods: [], expiresIn: 300 } });
    expect(
      secondStepFromError(loginError('MFA_ENROLLMENT_REQUIRED', { enrollmentToken: 'x' }))
    ).toMatchObject({ enrollment: { expiresIn: 900 } });
  });

  it('is null for anything else', () => {
    expect(secondStepFromError(null)).toBeNull();
    expect(secondStepFromError(new Error('Login failed'))).toBeNull();
    expect(secondStepFromError(loginError('INVALID_CREDENTIALS', undefined))).toBeNull();
    expect(secondStepFromError(loginError('MFA_REQUIRED', { methods: ['totp'] }))).toBeNull();
    expect(
      secondStepFromError(loginError('MFA_REQUIRED', { enrollmentToken: ENROLLMENT_TOKEN }))
    ).toBeNull();
  });
});

// With passkeys configured, the backend lists "webauthn" next to "totp" in both 403 answers. The
// app only offers the authenticator, so the extra method must change nothing.
describe('a backend that also offers passkeys', () => {
  const loginError = (code: string, mfa: unknown) =>
    new AuthError('A second verification step is required.', {
      code,
      status: 403,
      details: { mfa } as never,
    });

  // The step's own fields, whichever kind it is.
  const stepOf = (error: AuthError) => {
    const step = secondStepFromError(error);
    if (!step) return null;
    return step.kind === 'challenge' ? step.challenge : step.enrollment;
  };

  it.each([
    ['MFA_REQUIRED', { challengeId: CHALLENGE_ID, expiresIn: 300 }],
    ['MFA_ENROLLMENT_REQUIRED', { enrollmentToken: ENROLLMENT_TOKEN, expiresIn: 900 }],
  ])('reads %s with ["totp", "webauthn"] exactly like ["totp"]', (code, fields) => {
    const totpOnly = loginError(code, { ...fields, methods: ['totp'] });
    const withPasskeys = loginError(code, { ...fields, methods: ['totp', 'webauthn'] });

    expect(secondStepFromError(withPasskeys)?.kind).toBe(secondStepFromError(totpOnly)?.kind);
    expect({ ...stepOf(withPasskeys), methods: undefined }).toEqual({
      ...stepOf(totpOnly),
      methods: undefined,
    });
    expect(acceptsAuthenticatorCode(stepOf(withPasskeys)?.methods ?? [])).toBe(true);
  });

  it('ignores methods it does not know, without crashing', () => {
    const error = loginError('MFA_ENROLLMENT_REQUIRED', {
      enrollmentToken: ENROLLMENT_TOKEN,
      methods: ['totp', 'webauthn', 'sms', 7, null, { kind: 'push' }],
      expiresIn: 900,
    });

    expect(stepOf(error)?.methods).toEqual(['totp', 'webauthn', 'sms']);
    expect(acceptsAuthenticatorCode(stepOf(error)?.methods ?? [])).toBe(true);
  });
});

describe('describeMfaFailure', () => {
  const NOW = 1_000_000;

  it('reads the attempts left from a wrong code', () => {
    const error = new AuthError('That code is incorrect or has expired', {
      code: 'INVALID_MFA_CODE',
      status: 401,
      details: { attemptsRemaining: 2 },
    });

    expect(describeMfaFailure(error, NOW)).toEqual({ kind: 'wrongCode', attemptsRemaining: 2 });
    expect(
      describeMfaFailure(new AuthError('x', { code: 'INVALID_MFA_CODE', details: {} }), NOW)
    ).toEqual({ kind: 'wrongCode', attemptsRemaining: null });
  });

  it('turns the rate-limit error of MFA_LOCKED into the end of the lock', () => {
    const locked = Object.assign(new Error('Too many requests.'), {
      code: 'MFA_LOCKED',
      isRateLimited: true,
      retryAfter: 900,
    });

    expect(describeMfaFailure(locked, NOW)).toEqual({ kind: 'locked', until: NOW + 900_000 });
    expect(describeMfaFailure(Object.assign(new Error('x'), { code: 'MFA_LOCKED' }), NOW)).toEqual({
      kind: 'locked',
      until: null,
    });
  });

  it.each([
    ['MFA_CHALLENGE_INVALID', 'expired'],
    ['MFA_METHOD_NOT_FOUND', 'expired'],
    ['MFA_ALREADY_ENROLLED', 'alreadyEnrolled'],
  ])('sends %s back to the password step', (code, reason) => {
    expect(describeMfaFailure(new AuthError('x', { code }), NOW)).toEqual({
      kind: 'restart',
      reason,
    });
  });

  it('tells a rate limit from a network failure from anything else', () => {
    const rateLimited = Object.assign(new Error('Too many requests.'), {
      code: 'RATE_LIMIT_EXCEEDED',
      isRateLimited: true,
    });
    const offline = new AxiosError('Network Error', 'ERR_NETWORK', {
      headers: new AxiosHeaders(),
    });

    expect(describeMfaFailure(rateLimited, NOW)).toEqual({ kind: 'rateLimited' });
    expect(describeMfaFailure(offline, NOW)).toEqual({ kind: 'network' });
    expect(describeMfaFailure(new AuthError('Verification failed'), NOW)).toEqual({
      kind: 'other',
      message: 'Verification failed',
    });
    expect(describeMfaFailure(undefined, NOW)).toEqual({ kind: 'other', message: null });
  });
});

describe('isMfaBlocked', () => {
  const NOW = 1_000_000;

  it('blocks once no attempt is left, or while the lock lasts', () => {
    expect(isMfaBlocked(null, NOW)).toBe(false);
    expect(isMfaBlocked({ kind: 'wrongCode', attemptsRemaining: 1 }, NOW)).toBe(false);
    expect(isMfaBlocked({ kind: 'wrongCode', attemptsRemaining: 0 }, NOW)).toBe(true);
    expect(isMfaBlocked({ kind: 'locked', until: null }, NOW)).toBe(true);
    expect(isMfaBlocked({ kind: 'locked', until: NOW + 1 }, NOW)).toBe(true);
    expect(isMfaBlocked({ kind: 'locked', until: NOW }, NOW)).toBe(false);
    expect(isMfaBlocked({ kind: 'network' }, NOW)).toBe(false);
  });
});
