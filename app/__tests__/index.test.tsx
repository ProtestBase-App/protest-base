jest.mock('@/utils/i18n', () => ({ t: jest.fn((key) => key) }));
jest.mock('expo-notifications', () => ({
  getLastNotificationResponse: jest.fn(() => null),
  clearLastNotificationResponse: jest.fn(),
}));
jest.mock('@/services/notifications.service', () => ({
  handleNotificationResponse: jest.fn(() => false),
}));
jest.mock('@/services/mfa.service', () => ({
  loadPendingEnrollment: jest.fn(() => Promise.resolve(null)),
  clearPendingEnrollment: jest.fn(() => Promise.resolve()),
}));

import React from 'react';
import { Linking } from 'react-native';
import { renderWithProviders, waitFor, flushPromises } from '@/test-utils/render';
import Index from '@/app/index';
import { router } from 'expo-router';
import { Routes } from '@/constants/Routes';
import { clearPendingEnrollment, loadPendingEnrollment } from '@/services/mfa.service';

describe('Index redirect gate (#1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // No pending cold-start deep link.
    (Linking.getInitialURL as any) = jest.fn().mockResolvedValue(null);
  });

  it('redirects to Explore without waiting for the events cache (eventsLoading ignored)', async () => {
    renderWithProviders(<Index />, {
      providerOverrides: {
        // Cache is still filling, but session/saved/postal are ready.
        globalContext: { loading: false, eventsLoading: true },
        savedEventsContext: { loading: false },
        postalCodeContext: { loading: false },
      },
    });

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith(Routes.EXPLORE);
    });
  });

  it('does not redirect while the session is still validating', async () => {
    renderWithProviders(<Index />, {
      providerOverrides: {
        globalContext: { loading: true, eventsLoading: false },
        savedEventsContext: { loading: false },
        postalCodeContext: { loading: false },
      },
    });

    await flushPromises();

    expect(router.replace).not.toHaveBeenCalled();
  });

  describe('authenticator setup interrupted by a restart', () => {
    const pendingEnrollment = {
      enrollmentToken: 'e'.repeat(43),
      methods: ['totp'],
      expiresIn: 600,
    };

    const renderReady = (isLogged: boolean) =>
      renderWithProviders(<Index />, {
        providerOverrides: {
          globalContext: { loading: false, eventsLoading: false, isLogged },
          savedEventsContext: { loading: false },
          postalCodeContext: { loading: false },
        },
      });

    it('resumes on the sign-in screen, opened over Explore', async () => {
      jest.mocked(loadPendingEnrollment).mockResolvedValueOnce(pendingEnrollment);

      renderReady(false);

      await waitFor(() => expect(router.push).toHaveBeenCalledWith(Routes.SIGN_IN));
      expect(router.replace).toHaveBeenCalledWith(Routes.EXPLORE);
      expect(jest.mocked(router.replace).mock.invocationCallOrder[0]).toBeLessThan(
        jest.mocked(router.push).mock.invocationCallOrder[0]
      );
    });

    it('drops a stored setup when the user is already signed in', async () => {
      jest.mocked(loadPendingEnrollment).mockResolvedValueOnce(pendingEnrollment);

      renderReady(true);

      await waitFor(() => expect(router.replace).toHaveBeenCalledWith(Routes.EXPLORE));
      expect(router.push).not.toHaveBeenCalled();
      expect(clearPendingEnrollment).toHaveBeenCalled();
    });

    it('still lands on Explore when the check fails', async () => {
      jest.mocked(loadPendingEnrollment).mockRejectedValueOnce(new Error('keystore'));

      renderReady(false);

      await waitFor(() => expect(router.replace).toHaveBeenCalledWith(Routes.EXPLORE));
      expect(router.push).not.toHaveBeenCalled();
    });
  });
});
