import type { ApiError } from '@/types/auth.types';

interface AuthErrorOptions {
  code?: string;
  status?: number;
  details?: Partial<ApiError>;
}

/**
 * A failed auth request that keeps the backend's `code` and the rest of its error body, so a
 * screen can tell a second sign-in step or a disabled account from a wrong password.
 */
export class AuthError extends Error {
  readonly code?: string;
  readonly status?: number;
  /** The backend's error body: `mfa`, `attemptsRemaining`, `retryAfter` and the like. */
  readonly details: Partial<ApiError>;

  constructor(message: string, { code, status, details }: AuthErrorOptions = {}) {
    super(message);
    // Transpiled subclasses of Error lose their prototype, which breaks `instanceof`.
    Object.setPrototypeOf(this, AuthError.prototype);
    this.name = 'AuthError';
    this.code = code;
    this.status = status;
    this.details = details ?? {};
  }
}

/** Builds an AuthError from an axios error; the backend's text is the message when it has one. */
export function toAuthError(error: unknown, fallbackMessage: string): AuthError {
  const response = (error as { response?: { status?: number; data?: Partial<ApiError> } })
    ?.response;
  const body = response?.data ?? {};
  return new AuthError(body.error || fallbackMessage, {
    code: typeof body.code === 'string' ? body.code : undefined,
    status: response?.status,
    details: body,
  });
}
