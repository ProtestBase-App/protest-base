import type { MfaCodeMethod, MfaSecondStep } from '@/types/mfa.types';
import { isNetworkError } from '@/utils/networkError';

// The backend's defaults, used only if an answer leaves them out.
const DEFAULT_CHALLENGE_SECONDS = 300;
const DEFAULT_ENROLLMENT_SECONDS = 900;

const TOTP_CODE = /^\d{6}$/;
// 10 characters from the backend's alphabet (no I, O, 0 or 1), shown as XXXXX-XXXXX.
const RECOVERY_CODE = /^[A-HJ-NP-Z2-9]{10}$/;

/** What the backend compares: no spaces in an authenticator code, no dashes or case in a recovery code. */
export function normalizeMfaCode(method: MfaCodeMethod, input: string): string {
  return method === 'totp'
    ? input.replace(/\s+/g, '')
    : input.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

/** Checked before sending, so a typo doesn't cost one of the account's limited attempts. */
export function isWellFormedMfaCode(method: MfaCodeMethod, input: string): boolean {
  const code = normalizeMfaCode(method, input);
  return method === 'totp' ? TOTP_CODE.test(code) : RECOVERY_CODE.test(code);
}

/** Whether the authenticator code can answer: a passkey-only account has only its recovery codes here. */
export function acceptsAuthenticatorCode(methods: string[]): boolean {
  return methods.includes('totp');
}

/** The second sign-in step a login error asks for, or null when it isn't one. */
export function secondStepFromError(error: unknown): MfaSecondStep | null {
  const { code, details } = (error ?? {}) as { code?: unknown; details?: { mfa?: unknown } };
  const mfa = details?.mfa;
  if (!mfa || typeof mfa !== 'object') return null;

  const payload = mfa as Record<string, unknown>;
  const methods = Array.isArray(payload.methods)
    ? payload.methods.filter((method): method is string => typeof method === 'string')
    : [];
  const expiresIn = (fallback: number) =>
    typeof payload.expiresIn === 'number' && payload.expiresIn > 0 ? payload.expiresIn : fallback;

  if (code === 'MFA_REQUIRED' && typeof payload.challengeId === 'string' && payload.challengeId) {
    return {
      kind: 'challenge',
      challenge: {
        challengeId: payload.challengeId,
        methods,
        expiresIn: expiresIn(DEFAULT_CHALLENGE_SECONDS),
      },
    };
  }
  if (
    code === 'MFA_ENROLLMENT_REQUIRED' &&
    typeof payload.enrollmentToken === 'string' &&
    payload.enrollmentToken
  ) {
    return {
      kind: 'enroll',
      enrollment: {
        enrollmentToken: payload.enrollmentToken,
        methods,
        expiresIn: expiresIn(DEFAULT_ENROLLMENT_SECONDS),
      },
    };
  }
  return null;
}

/** Why a code wasn't accepted, in the terms the screen shows it. */
export type MfaFailure =
  | { kind: 'wrongCode'; attemptsRemaining: number | null }
  /** `until` is a timestamp in ms, or null when the backend didn't say how long. */
  | { kind: 'locked'; until: number | null }
  /** The step can't go on: start again from the password. */
  | { kind: 'restart'; reason: 'expired' | 'alreadyEnrolled' }
  | { kind: 'rateLimited' }
  | { kind: 'network' }
  | { kind: 'other'; message: string | null };

export function describeMfaFailure(error: unknown, now: number = Date.now()): MfaFailure {
  const failure = (error ?? {}) as {
    code?: unknown;
    isRateLimited?: unknown;
    retryAfter?: unknown;
    message?: unknown;
    details?: { attemptsRemaining?: unknown };
  };

  switch (failure.code) {
    case 'INVALID_MFA_CODE': {
      const left = failure.details?.attemptsRemaining;
      return {
        kind: 'wrongCode',
        attemptsRemaining: typeof left === 'number' && left >= 0 ? left : null,
      };
    }
    case 'MFA_LOCKED': {
      const seconds =
        typeof failure.retryAfter === 'number' && failure.retryAfter > 0
          ? failure.retryAfter
          : null;
      return { kind: 'locked', until: seconds === null ? null : now + seconds * 1000 };
    }
    case 'MFA_CHALLENGE_INVALID':
    case 'MFA_METHOD_NOT_FOUND':
      return { kind: 'restart', reason: 'expired' };
    case 'MFA_ALREADY_ENROLLED':
      return { kind: 'restart', reason: 'alreadyEnrolled' };
  }

  if (failure.isRateLimited === true || failure.code === 'RATE_LIMIT_EXCEEDED') {
    return { kind: 'rateLimited' };
  }
  if (isNetworkError(error)) return { kind: 'network' };
  return { kind: 'other', message: typeof failure.message === 'string' ? failure.message : null };
}

/** True while no code can be accepted: locked, or out of attempts (the lock has started). */
export function isMfaBlocked(failure: MfaFailure | null, now: number = Date.now()): boolean {
  if (!failure) return false;
  if (failure.kind === 'wrongCode') return failure.attemptsRemaining === 0;
  if (failure.kind === 'locked') return failure.until === null || now < failure.until;
  return false;
}
