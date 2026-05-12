export interface User {
  $id: string;
  email: string;
  name: string;
  emailVerification: boolean;
  status: boolean;
  registration: string;
}

export type AuthErrorCode =
  | 'TOKEN_EXPIRED'
  | 'INVALID_TOKEN'
  | 'REFRESH_TOKEN_EXPIRED'
  | 'TOKEN_REUSE_DETECTED'
  | 'SESSION_INVALID'
  | 'RATE_LIMIT_EXCEEDED'
  | 'NO_TOKEN'
  | 'REFRESH_TOKEN_REVOKED'
  | 'SESSION_EXPIRED'
  | 'INVALID_REFRESH_TOKEN'
  | 'ACCOUNT_LOCKED'
  | 'INVALID_CREDENTIALS'
  | 'PASSWORD_TOO_LONG'
  | 'SUSPICIOUS_CONTENT'
  | 'VALIDATION_ERROR';

export interface LoginResponse {
  success: true;
  data: {
    /** Legacy token kept for backward compatibility. */
    token: string;
    /** Use for API calls (expires in 15 min). */
    accessToken: string;
    /** Use to obtain new access tokens (expires in 7 days). */
    refreshToken: string;
    /** Access token expiry in seconds (900). */
    expiresIn: number;
    /** Refresh token expiry in seconds (604800). */
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

export interface ApiError {
  success: false;
  error: string;
  code?: AuthErrorCode | string;
  statusCode?: number;
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
