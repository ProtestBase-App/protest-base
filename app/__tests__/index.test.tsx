jest.mock('@/utils/i18n', () => ({ t: jest.fn((key) => key) }));
jest.mock('expo-notifications', () => ({
  getLastNotificationResponse: jest.fn(() => null),
  clearLastNotificationResponse: jest.fn(),
}));
jest.mock('@/services/notifications.service', () => ({
  handleNotificationResponse: jest.fn(() => false),
}));

import React from 'react';
import { Linking } from 'react-native';
import { renderWithProviders, waitFor, flushPromises } from '@/test-utils/render';
import Index from '@/app/index';
import { router } from 'expo-router';
import { Routes } from '@/constants/Routes';

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
});
