export interface User {
  $id: string;
  email: string;
  name: string;
  emailVerification: boolean;
  status: boolean;
  registration: string;
}

/**
 * Codes the backend's auth layer answers with.
 *
 * The login-security codes below must never join FORCE_LOGOUT_CODES (services/api.ts): they
 * reach screens that have to explain them, and a force-logout would wipe local data and leave
 * the sign-in screen waiting on a request that never settles.
 *
 * | Code                     | Status | Sent by                                                       |
 * | ------------------------ | ------ | ------------------------------------------------------------- |
 * | MFA_REQUIRED             | 403    | /auth/login, with `mfa: { challengeId, methods, expiresIn }`  |
 * | MFA_ENROLLMENT_REQUIRED  | 403    | /auth/login, with `mfa: { enrollmentToken, methods, … }`      |
 * | MFA_CHALLENGE_INVALID    | 401    | /auth/mfa/verify: the challenge is gone, sign in again        |
 * | INVALID_MFA_CODE         | 401    | verify and reauth, with `attemptsRemaining`                   |
 * |                          | 400    | the enrolment `confirm` endpoints, with `attemptsRemaining`   |
 * | MFA_LOCKED               | 429    | too many wrong codes, with `retryAfter` (seconds)             |
 * | MFA_ALREADY_ENROLLED     | 409    | enrolment: another sign-in finished it first                  |
 * | MFA_METHOD_NOT_FOUND     | 404    | enrolment confirm: the authenticator being set up is gone     |
 * | MFA_CODE_REQUIRED        | 400    | /auth/reauth without a code, for an account with a factor     |
 * | REAUTH_REQUIRED          | 403    | DELETE /auth/account and other step-up actions                |
 * | MFA_LAST_FACTOR_REQUIRED | 409    | removing the only factor while the policy requires one        |
 * | ACCOUNT_DISABLED         | 403    | login, token refresh, and every authenticated request         |
 */
export type AuthErrorCode =
  | 'TOKEN_EXPIRED'
  | 'INVALID_TOKEN'
  | 'REFRESH_TOKEN_EXPIRED'
  | 'TOKEN_REUSE_DETECTED'
  | 'SESSION_INVALID'
  | 'SESSION_REPLACED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'NO_TOKEN'
  | 'REFRESH_TOKEN_REVOKED'
  | 'SESSION_EXPIRED'
  | 'INVALID_REFRESH_TOKEN'
  | 'ACCOUNT_LOCKED'
  | 'INVALID_CREDENTIALS'
  | 'PASSWORD_TOO_LONG'
  | 'SUSPICIOUS_CONTENT'
  | 'VALIDATION_ERROR'
  | 'MFA_REQUIRED'
  | 'MFA_ENROLLMENT_REQUIRED'
  | 'MFA_CHALLENGE_INVALID'
  | 'INVALID_MFA_CODE'
  | 'MFA_LOCKED'
  | 'MFA_ALREADY_ENROLLED'
  | 'MFA_METHOD_NOT_FOUND'
  | 'MFA_CODE_REQUIRED'
  | 'REAUTH_REQUIRED'
  | 'MFA_LAST_FACTOR_REQUIRED'
  | 'ACCOUNT_DISABLED';

export interface LoginResponse {
  success: true;
  data: {
    /** Legacy token kept for backward compatibility. */
    token: string;
    /** Use for API calls (expires in 15 min). */
    accessToken: string;
    /** Use to obtain new access tokens (expires in 3 days). */
    refreshToken: string;
    /** Access token expiry in seconds (900). */
    expiresIn: number;
    /** Refresh token expiry in seconds (259200). */
    refreshExpiresIn: number;
    user: User;
    session: { $id: string };
  };
  message: string;
}

export interface RefreshTokenResponse {
  success: true;
  data: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
  };
}

/**
 * Error body of every API endpoint. The backend merges an error's extra fields into this
 * object, so the login-security fields arrive at the top level.
 */
export interface ApiError {
  success: false;
  error: string;
  code?: AuthErrorCode | string;
  statusCode?: number;
  /** MFA_REQUIRED / MFA_ENROLLMENT_REQUIRED: what the second step needs. */
  mfa?: Record<string, unknown>;
  /** INVALID_MFA_CODE: wrong codes left before MFA_LOCKED. */
  attemptsRemaining?: number;
  /** MFA_LOCKED: seconds until codes are accepted again. */
  retryAfter?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface Session {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  userId: string;
  expire: string;
  provider: string;
  providerUid: string;
  clientName: string | null;
  clientVersion: string | null;
  current: boolean;
  factors: string[];
}

export interface SessionData {
  total: number;
  session: Session[];
}

export type SessionResponse = ApiResponse<SessionData>;
