jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

jest.mock('@/services/auth.service', () => ({
  storeSession: jest.fn(),
}));

import { AxiosError, AxiosHeaders } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { SECURE_STORE_KEYS } from '@/constants/StorageConfig';
import api from '@/services/api';
import { storeSession } from '@/services/auth.service';
import {
  clearPendingEnrollment,
  confirmTotpEnrollment,
  loadPendingEnrollment,
  reauthenticate,
  savePendingEnrollment,
  startTotpEnrollment,
  verifyMfaCode,
} from '@/services/mfa.service';
import type { User } from '@/types/auth.types';
import { AuthError } from '@/utils/authError';
import { logger } from '@/utils/logger';
import { SECURE_STORE_OPTIONS } from '@/utils/secureStoreOptions';

const mockPost = api.post as jest.Mock;
const mockStoreSession = storeSession as jest.Mock;
const mockGetItem = SecureStore.getItemAsync as jest.Mock;
const mockSetItem = SecureStore.setItemAsync as jest.Mock;
const mockDeleteItem = SecureStore.deleteItemAsync as jest.Mock;

const CHALLENGE_ID = 'c'.repeat(43);
const ENROLLMENT_TOKEN = 'e'.repeat(43);

const user: User = {
  $id: 'user-1',
  email: 'organizer@example.org',
  name: 'Organizer',
  emailVerification: true,
  status: true,
  registration: '2026-01-01T00:00:00Z',
};

const signInData = {
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresIn: 900,
  refreshExpiresIn: 259200,
  user,
  session: { $id: 'session-1' },
  secondFactor: 'totp',
};

const httpError = (status: number, data: Record<string, unknown>) => ({
  response: { status, data: { success: false, ...data } },
});

describe('mfa.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreSession.mockResolvedValue(user);
  });

  describe('verifyMfaCode', () => {
    it('stores the session the code unlocks', async () => {
      mockPost.mockResolvedValueOnce({
        data: { success: true, data: { ...signInData, recoveryCodesRemaining: 2 } },
      });

      const result = await verifyMfaCode(CHALLENGE_ID, 'recovery', 'ABCDE23456');

      expect(mockPost).toHaveBeenCalledWith('/auth/mfa/verify', {
        challengeId: CHALLENGE_ID,
        method: 'recovery',
        code: 'ABCDE23456',
      });
      expect(mockStoreSession).toHaveBeenCalledWith(
        expect.objectContaining({ accessToken: 'access', session: { $id: 'session-1' } })
      );
      expect(result).toEqual({ user, recoveryCodesRemaining: 2 });
    });

    it('keeps the code and attempts of a wrong code', async () => {
      mockPost.mockRejectedValueOnce(
        httpError(401, {
          code: 'INVALID_MFA_CODE',
          error: 'That code is incorrect or has expired',
          attemptsRemaining: 3,
        })
      );

      const error = await verifyMfaCode(CHALLENGE_ID, 'totp', '123456').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AuthError);
      expect(error).toMatchObject({
        code: 'INVALID_MFA_CODE',
        status: 401,
        details: { attemptsRemaining: 3 },
      });
      expect(mockStoreSession).not.toHaveBeenCalled();
    });

    it("passes the interceptor's MFA_LOCKED error and network failures through as they are", async () => {
      const locked = Object.assign(new Error('Too many requests.'), {
        code: 'MFA_LOCKED',
        isRateLimited: true,
        retryAfter: 900,
      });
      const offline = new AxiosError('Network Error', 'ERR_NETWORK', {
        headers: new AxiosHeaders(),
      });
      mockPost.mockRejectedValueOnce(locked).mockRejectedValueOnce(offline);

      await expect(verifyMfaCode(CHALLENGE_ID, 'totp', '123456')).rejects.toBe(locked);
      await expect(verifyMfaCode(CHALLENGE_ID, 'totp', '123456')).rejects.toBe(offline);
    });
  });

  describe('startTotpEnrollment', () => {
    it('returns the authenticator to add', async () => {
      const setup = {
        methodId: 'method-1',
        otpauthUri: 'otpauth://totp/ProtestBase?secret=AAAABBBB',
        qrDataUri: 'data:image/png;base64,AAAA',
        manualKey: 'AAAABBBB',
      };
      mockPost.mockResolvedValueOnce({ data: { success: true, data: setup } });

      await expect(startTotpEnrollment(ENROLLMENT_TOKEN)).resolves.toEqual(setup);
      expect(mockPost).toHaveBeenCalledWith('/auth/mfa/enroll/totp/setup', {
        enrollmentToken: ENROLLMENT_TOKEN,
      });
    });

    it('rejects an incomplete answer', async () => {
      mockPost.mockResolvedValueOnce({ data: { success: true, data: { methodId: 'method-1' } } });

      await expect(startTotpEnrollment(ENROLLMENT_TOKEN)).rejects.toThrow(
        'Could not start the setup'
      );
    });

    it('keeps MFA_ALREADY_ENROLLED', async () => {
      mockPost.mockRejectedValueOnce(httpError(409, { code: 'MFA_ALREADY_ENROLLED', error: 'x' }));

      await expect(startTotpEnrollment(ENROLLMENT_TOKEN)).rejects.toMatchObject({
        code: 'MFA_ALREADY_ENROLLED',
      });
    });
  });

  describe('confirmTotpEnrollment', () => {
    it('returns the sign-in with its recovery codes, without storing it', async () => {
      const data = { ...signInData, recoveryCodes: ['ABCDE-23456', 'FGHJK-78923'] };
      mockPost.mockResolvedValueOnce({ data: { success: true, data } });

      await expect(confirmTotpEnrollment(ENROLLMENT_TOKEN, 'method-1', '123456')).resolves.toEqual(
        data
      );
      expect(mockPost).toHaveBeenCalledWith('/auth/mfa/enroll/totp/confirm', {
        enrollmentToken: ENROLLMENT_TOKEN,
        methodId: 'method-1',
        code: '123456',
      });
      expect(mockStoreSession).not.toHaveBeenCalled();
    });

    it('rejects an answer without a session', async () => {
      mockPost.mockResolvedValueOnce({
        data: { success: true, data: { ...signInData, accessToken: undefined } },
      });

      await expect(confirmTotpEnrollment(ENROLLMENT_TOKEN, 'method-1', '123456')).rejects.toThrow(
        'Verification failed'
      );
    });

    it('keeps the 400 INVALID_MFA_CODE of the confirm endpoint', async () => {
      mockPost.mockRejectedValueOnce(
        httpError(400, { code: 'INVALID_MFA_CODE', error: 'x', attemptsRemaining: 4 })
      );

      await expect(
        confirmTotpEnrollment(ENROLLMENT_TOKEN, 'method-1', '123456')
      ).rejects.toMatchObject({ code: 'INVALID_MFA_CODE', details: { attemptsRemaining: 4 } });
    });
  });

  describe('reauthenticate', () => {
    it('returns the single-use proof', async () => {
      mockPost.mockResolvedValueOnce({
        data: { success: true, data: { reauthToken: 'proof', expiresIn: 300 } },
      });

      await expect(reauthenticate('pw', 'totp', '123456')).resolves.toBe('proof');
      expect(mockPost).toHaveBeenCalledWith('/auth/reauth', {
        password: 'pw',
        method: 'totp',
        code: '123456',
      });
    });

    it('keeps INVALID_CREDENTIALS for a password that stopped working', async () => {
      mockPost.mockRejectedValueOnce(httpError(401, { code: 'INVALID_CREDENTIALS', error: 'x' }));

      await expect(reauthenticate('pw', 'totp', '123456')).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
      });
    });

    it('rejects an answer without a proof', async () => {
      mockPost.mockResolvedValueOnce({ data: { success: true, data: {} } });

      await expect(reauthenticate('pw', 'totp', '123456')).rejects.toThrow('Verification failed');
    });
  });

  describe('pending setup', () => {
    const NOW = 1_800_000_000_000;
    const KEY = SECURE_STORE_KEYS.PENDING_MFA_ENROLLMENT;
    const storedRecord = (record: unknown) =>
      mockGetItem.mockResolvedValueOnce(JSON.stringify(record));

    it('keeps the token and when it runs out, on this device only', async () => {
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW);

      await savePendingEnrollment({
        enrollmentToken: ENROLLMENT_TOKEN,
        methods: ['totp'],
        expiresIn: 900,
      });

      expect(mockSetItem).toHaveBeenCalledWith(
        KEY,
        JSON.stringify({ enrollmentToken: ENROLLMENT_TOKEN, expiresAt: NOW + 900_000 }),
        SECURE_STORE_OPTIONS
      );
      nowSpy.mockRestore();
    });

    it('gives back the setup with the time it has left', async () => {
      storedRecord({ enrollmentToken: ENROLLMENT_TOKEN, expiresAt: NOW + 600_000 });

      await expect(loadPendingEnrollment(NOW)).resolves.toEqual({
        enrollmentToken: ENROLLMENT_TOKEN,
        methods: ['totp'],
        expiresIn: 600,
      });
      expect(mockDeleteItem).not.toHaveBeenCalled();
    });

    it('has nothing to resume when nothing is stored', async () => {
      mockGetItem.mockResolvedValueOnce(null);

      await expect(loadPendingEnrollment(NOW)).resolves.toBeNull();
      expect(mockDeleteItem).not.toHaveBeenCalled();
    });

    it.each([
      ['has run out', { enrollmentToken: ENROLLMENT_TOKEN, expiresAt: NOW - 1 }],
      ['has too little time left', { enrollmentToken: ENROLLMENT_TOKEN, expiresAt: NOW + 29_000 }],
      ['has no token', { expiresAt: NOW + 600_000 }],
    ])('drops a record that %s', async (_label, record) => {
      storedRecord(record);

      await expect(loadPendingEnrollment(NOW)).resolves.toBeNull();
      expect(mockDeleteItem).toHaveBeenCalledWith(KEY);
    });

    it('drops a record that is not JSON without logging what it holds', async () => {
      const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      mockGetItem.mockResolvedValueOnce(`{${ENROLLMENT_TOKEN}`);

      await expect(loadPendingEnrollment(NOW)).resolves.toBeNull();

      expect(mockDeleteItem).toHaveBeenCalledWith(KEY);
      expect(warn).toHaveBeenCalled();
      expect(JSON.stringify(warn.mock.calls)).not.toContain(ENROLLMENT_TOKEN);
      warn.mockRestore();
    });

    it('never throws when the secure store fails', async () => {
      const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      mockGetItem.mockRejectedValueOnce(new Error('Could not decrypt'));
      mockSetItem.mockRejectedValueOnce(new Error('Could not encrypt'));
      mockDeleteItem
        .mockRejectedValueOnce(new Error('Could not delete'))
        .mockRejectedValueOnce(new Error('Could not delete'));

      await expect(loadPendingEnrollment(NOW)).resolves.toBeNull();
      await expect(
        savePendingEnrollment({
          enrollmentToken: ENROLLMENT_TOKEN,
          methods: ['totp'],
          expiresIn: 900,
        })
      ).resolves.toBeUndefined();
      await expect(clearPendingEnrollment()).resolves.toBeUndefined();

      expect(JSON.stringify(warn.mock.calls)).not.toContain(ENROLLMENT_TOKEN);
      warn.mockRestore();
    });
  });
});
