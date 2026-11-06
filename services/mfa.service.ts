import * as SecureStore from 'expo-secure-store';
import { SECURE_STORE_KEYS } from '@/constants/StorageConfig';
import api from '@/services/api';
import { storeSession } from '@/services/auth.service';
import type {
  MfaCodeMethod,
  MfaEnrollment,
  MfaSignInData,
  MfaSignInResponse,
  ReauthResponse,
  TotpSetup,
  TotpSetupResponse,
} from '@/types/mfa.types';
import type { User } from '@/types/auth.types';
import { toAuthError } from '@/utils/authError';
import { logger } from '@/utils/logger';
import { isNetworkError } from '@/utils/networkError';
import { SECURE_STORE_OPTIONS } from '@/utils/secureStoreOptions';

// A resumed setup with less time than this left would run out before the user could finish it.
const MIN_RESUME_SECONDS = 30;

interface PendingEnrollmentRecord {
  enrollmentToken: string;
  expiresAt: number;
}

// The interceptor's rate-limit and lockout errors (MFA_LOCKED with its `retryAfter`) and network
// failures reach the screen as they are; anything else keeps the backend's code and body.
function toMfaError(error: unknown, fallbackMessage: string): unknown {
  if ((error as { isRateLimited?: unknown })?.isRateLimited === true || isNetworkError(error)) {
    return error;
  }
  return toAuthError(error, fallbackMessage);
}

function isSignInData(data: Partial<MfaSignInData> | undefined): data is MfaSignInData {
  return !!(data?.accessToken && data.refreshToken && data.session?.$id && data.user);
}

/** The second step of a sign-in: a code from the authenticator app or a recovery code. */
export async function verifyMfaCode(
  challengeId: string,
  method: MfaCodeMethod,
  code: string
): Promise<{ user: User; recoveryCodesRemaining?: number }> {
  try {
    const response = await api.post<MfaSignInResponse>('/auth/mfa/verify', {
      challengeId,
      method,
      code,
    });
    const data = response.data?.data;
    const user = await storeSession(data);
    return { user, recoveryCodesRemaining: data.recoveryCodesRemaining };
  } catch (error) {
    throw toMfaError(error, 'Verification failed');
  }
}

/** Enrolment demanded at login: creates the authenticator entry to add to an app. */
export async function startTotpEnrollment(enrollmentToken: string): Promise<TotpSetup> {
  try {
    const response = await api.post<TotpSetupResponse>('/auth/mfa/enroll/totp/setup', {
      enrollmentToken,
    });
    const setup = response.data?.data;
    if (!setup?.methodId || !setup.otpauthUri || !setup.manualKey) {
      throw new Error('Invalid setup response from server');
    }
    return setup;
  } catch (error) {
    throw toMfaError(error, 'Could not start the setup');
  }
}

/**
 * Confirms the authenticator with its first code. The answer signs the user in and carries the
 * recovery codes; the caller stores the session (`storeSession`) once the codes are saved.
 */
export async function confirmTotpEnrollment(
  enrollmentToken: string,
  methodId: string,
  code: string
): Promise<MfaSignInData> {
  try {
    const response = await api.post<MfaSignInResponse>('/auth/mfa/enroll/totp/confirm', {
      enrollmentToken,
      methodId,
      code,
    });
    const data = response.data?.data;
    if (!isSignInData(data)) {
      throw new Error('Invalid login response from server');
    }
    return data;
  } catch (error) {
    throw toMfaError(error, 'Verification failed');
  }
}

// Only the error's name: SecureStore messages can quote what they failed on.
function logPendingEnrollmentError(action: 'save' | 'read' | 'clear', error: unknown): void {
  logger.warn('[MFA] Pending setup storage failed', {
    action,
    error: error instanceof Error ? error.name : typeof error,
  });
}

function parsePendingEnrollment(raw: string): PendingEnrollmentRecord | null {
  try {
    const value = JSON.parse(raw) as Partial<PendingEnrollmentRecord>;
    if (
      typeof value.enrollmentToken === 'string' &&
      value.enrollmentToken &&
      typeof value.expiresAt === 'number'
    ) {
      return { enrollmentToken: value.enrollmentToken, expiresAt: value.expiresAt };
    }
  } catch (error) {
    logPendingEnrollmentError('read', error);
  }
  return null;
}

/**
 * Keeps the setup demanded at sign-in across a restart. The setup sends the user to their
 * authenticator app, and Android may close ProtestBase meanwhile; signing in again would make a
 * new key, and the entry just added would stop working. Never throws: losing the record only
 * costs a new sign-in.
 */
export async function savePendingEnrollment(enrollment: MfaEnrollment): Promise<void> {
  const record: PendingEnrollmentRecord = {
    enrollmentToken: enrollment.enrollmentToken,
    expiresAt: Date.now() + enrollment.expiresIn * 1000,
  };
  try {
    await SecureStore.setItemAsync(
      SECURE_STORE_KEYS.PENDING_MFA_ENROLLMENT,
      JSON.stringify(record),
      SECURE_STORE_OPTIONS
    );
  } catch (error) {
    logPendingEnrollmentError('save', error);
  }
}

export async function clearPendingEnrollment(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.PENDING_MFA_ENROLLMENT);
  } catch (error) {
    logPendingEnrollmentError('clear', error);
  }
}

/** The setup to resume, or null. Never throws, and drops a record it can't resume. */
export async function loadPendingEnrollment(now = Date.now()): Promise<MfaEnrollment | null> {
  let raw: string | null;
  try {
    raw = await SecureStore.getItemAsync(SECURE_STORE_KEYS.PENDING_MFA_ENROLLMENT);
  } catch (error) {
    logPendingEnrollmentError('read', error);
    await clearPendingEnrollment();
    return null;
  }
  if (!raw) return null;

  const record = parsePendingEnrollment(raw);
  const secondsLeft = record ? Math.floor((record.expiresAt - now) / 1000) : 0;
  if (!record || secondsLeft < MIN_RESUME_SECONDS) {
    await clearPendingEnrollment();
    return null;
  }
  return { enrollmentToken: record.enrollmentToken, methods: ['totp'], expiresIn: secondsLeft };
}

/** Step-up proof for one sensitive action (deleting the account): the password and a code. */
export async function reauthenticate(
  password: string,
  method: MfaCodeMethod,
  code: string
): Promise<string> {
  try {
    const response = await api.post<ReauthResponse>('/auth/reauth', { password, method, code });
    const reauthToken = response.data?.data?.reauthToken;
    if (!reauthToken) {
      throw new Error('Invalid reauth response from server');
    }
    return reauthToken;
  } catch (error) {
    throw toMfaError(error, 'Verification failed');
  }
}
