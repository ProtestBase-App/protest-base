import type { User } from '@/types/auth.types';

/** The ways this app can answer a second-factor challenge (passkeys come later). */
export type MfaCodeMethod = 'totp' | 'recovery';

/** 403 MFA_REQUIRED at login: the account has a factor, so the password was only the first step. */
export interface MfaChallenge {
  challengeId: string;
  /** The account's confirmed factors: 'totp' and/or 'webauthn'. Recovery codes work for every account. */
  methods: string[];
  /** Seconds the challenge stays valid. */
  expiresIn: number;
}

/** 403 MFA_ENROLLMENT_REQUIRED at login: the policy requires a factor this account doesn't have yet. */
export interface MfaEnrollment {
  enrollmentToken: string;
  methods: string[];
  /** Seconds the enrolment stays valid. */
  expiresIn: number;
}

export type MfaSecondStep =
  { kind: 'challenge'; challenge: MfaChallenge } | { kind: 'enroll'; enrollment: MfaEnrollment };

/** POST /auth/mfa/enroll/totp/setup. Holds the secret: never log any of it. */
export interface TotpSetup {
  methodId: string;
  /** otpauth://totp/… */
  otpauthUri: string;
  /** The QR code of otpauthUri as a PNG data URI, for scanning with another device. */
  qrDataUri: string;
  /** The secret in base32, for typing into an authenticator by hand. */
  manualKey: string;
}

/** What /auth/mfa/verify and the enrolment confirm sign in with: the login payload plus the factor. */
export interface MfaSignInData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  user: User;
  session: { $id: string };
  secondFactor: 'totp' | 'recovery' | 'webauthn';
  /** After a recovery code: how many unused codes are left. */
  recoveryCodesRemaining?: number;
  /** After enrolment: the recovery codes, shown once. */
  recoveryCodes?: string[];
}

export interface MfaSignInResponse {
  success: true;
  data: MfaSignInData;
  message?: string;
}

export interface TotpSetupResponse {
  success: true;
  data: TotpSetup;
}

/** POST /auth/reauth: a single-use proof for one sensitive action, such as deleting the account. */
export interface ReauthResponse {
  success: true;
  data: { reauthToken: string; expiresIn: number };
}
