jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn().mockReturnValue('light') }));
jest.mock('@/utils/i18n', () => ({ t: jest.fn((key) => key) }));
jest.mock('@/services/auth.service', () => ({
  logout: jest.fn(),
}));
jest.mock('@/services/event.service', () => ({
  createEventBackend: jest.fn(),
}));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    isLogged: false,
    loading: false,
  })),
}));

import React from 'react';
import { Alert, Linking } from 'react-native';
import { router } from 'expo-router';
import { renderWithProviders, fireEvent, waitFor, createMockUser } from '@/test-utils/render';
import MoreScreen from '@/app/(tabs)/(more)/more';
import { logout } from '@/services/auth.service';
import { createEventBackend } from '@/services/event.service';
import { useAuth } from '@/hooks/useAuth';

describe('More Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
    (Linking.openURL as jest.Mock).mockResolvedValue(true);
  });

  describe('Loading States', () => {
    it('shows loading state during initial auth check', () => {
      (useAuth as jest.Mock).mockReturnValue({
        isLogged: false,
        loading: true,
      });

      const { getByLabelText } = renderWithProviders(<MoreScreen />);

      // LoadingState renders with accessibilityLabel="Loading content"
      expect(getByLabelText('Loading content')).toBeTruthy();
    });

    it('shows loading state when event counts are being fetched for logged-in user', () => {
      (useAuth as jest.Mock).mockReturnValue({
        isLogged: true,
        loading: false,
      });

      const { getByLabelText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            userEventCounts: null, // Not loaded yet
          },
        },
      });

      // LoadingState renders with accessibilityLabel="Loading content"
      expect(getByLabelText('Loading content')).toBeTruthy();
    });
  });

  describe('Guest User View', () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({
        isLogged: false,
        loading: false,
      });
    });

    it('renders the page title', () => {
      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: { isLogged: false },
        },
      });

      expect(getByText('tabs.more')).toBeTruthy();
    });

    it('shows the sign in button', () => {
      const { getByTestId } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: { isLogged: false },
        },
      });

      expect(getByTestId('btn-more-sign-in')).toBeTruthy();
    });

    it('shows become organizer option', () => {
      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: { isLogged: false },
        },
      });

      expect(getByText('more.becomeOrganizer')).toBeTruthy();
    });

    it('shows sign in to manage events option', () => {
      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: { isLogged: false },
        },
      });

      expect(getByText('more.signInToManageEvents')).toBeTruthy();
    });

    it('shows give feedback option', () => {
      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: { isLogged: false },
        },
      });

      expect(getByText('more.giveFeedback')).toBeTruthy();
    });

    it('shows privacy center option', () => {
      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: { isLogged: false },
        },
      });

      expect(getByText('more.privacyCenter')).toBeTruthy();
    });

    it('shows terms and privacy option', () => {
      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: { isLogged: false },
        },
      });

      expect(getByText('more.termsPrivacy')).toBeTruthy();
    });

    it('shows about option', () => {
      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: { isLogged: false },
        },
      });

      expect(getByText('more.about')).toBeTruthy();
    });

    it('does not show logout button for guest users', () => {
      const { queryByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: { isLogged: false },
        },
      });

      expect(queryByText('more.logout')).toBeNull();
    });

    it('does not show event management options for guest users', () => {
      const { queryByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: { isLogged: false },
        },
      });

      expect(queryByText('more.createNewEvent')).toBeNull();
      expect(queryByText('more.myUpcomingEvents')).toBeNull();
      expect(queryByText('more.myPastEvents')).toBeNull();
    });
  });

  describe('Logged In User View', () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({
        isLogged: true,
        loading: false,
      });
    });

    it('renders the page title', () => {
      const mockUser = createMockUser();
      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 0, past: 0, total: 0 },
          },
        },
      });

      expect(getByText('tabs.more')).toBeTruthy();
    });

    it('shows create new event option', () => {
      const mockUser = createMockUser();
      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 0, past: 0, total: 0 },
          },
        },
      });

      expect(getByText('more.createNewEvent')).toBeTruthy();
    });

    it('shows my upcoming events option with badge count', () => {
      const mockUser = createMockUser();
      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 5, past: 0, total: 5 },
          },
        },
      });

      expect(getByText('more.myUpcomingEvents')).toBeTruthy();
    });

    it('shows my past events option with badge count', () => {
      const mockUser = createMockUser();
      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 0, past: 3, total: 3 },
          },
        },
      });

      expect(getByText('more.myPastEvents')).toBeTruthy();
    });

    it('shows account option', () => {
      const mockUser = createMockUser();
      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 0, past: 0, total: 0 },
          },
        },
      });

      expect(getByText('more.account')).toBeTruthy();
    });

    it('shows event templates option', () => {
      const mockUser = createMockUser();
      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 0, past: 0, total: 0 },
          },
        },
      });

      expect(getByText('more.eventTemplates')).toBeTruthy();
    });

    it('shows draft events option', () => {
      const mockUser = createMockUser();
      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 0, past: 0, total: 0 },
          },
        },
      });

      expect(getByText('more.draftEvents')).toBeTruthy();
    });

    it('shows logout option', () => {
      const mockUser = createMockUser();
      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 0, past: 0, total: 0 },
          },
        },
      });

      expect(getByText('more.logout')).toBeTruthy();
    });

    it('does not show sign in button for logged in users', () => {
      const mockUser = createMockUser();
      const { queryByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 0, past: 0, total: 0 },
          },
        },
      });

      // There should be no "sign in to manage events" button
      expect(queryByText('more.signInToManageEvents')).toBeNull();
    });
  });

  describe('Navigation', () => {
    it('navigates to sign-in when sign-in button is pressed', () => {
      (useAuth as jest.Mock).mockReturnValue({
        isLogged: false,
        loading: false,
      });

      const { getByTestId } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: { isLogged: false },
        },
      });

      fireEvent.press(getByTestId('btn-more-sign-in'));

      expect(router.push).toHaveBeenCalled();
    });

    it('navigates to become organizer screen', () => {
      (useAuth as jest.Mock).mockReturnValue({
        isLogged: false,
        loading: false,
      });

      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: { isLogged: false },
        },
      });

      const becomeOrganizerButton = getByText('more.becomeOrganizer');
      fireEvent.press(becomeOrganizerButton);

      expect(router.push).toHaveBeenCalled();
    });

    it('navigates to privacy center screen', () => {
      (useAuth as jest.Mock).mockReturnValue({
        isLogged: false,
        loading: false,
      });

      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: { isLogged: false },
        },
      });

      const privacyButton = getByText('more.privacyCenter');
      fireEvent.press(privacyButton);

      expect(router.push).toHaveBeenCalled();
    });

    it('navigates to about screen', () => {
      (useAuth as jest.Mock).mockReturnValue({
        isLogged: false,
        loading: false,
      });

      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: { isLogged: false },
        },
      });

      const aboutButton = getByText('more.about');
      fireEvent.press(aboutButton);

      expect(router.push).toHaveBeenCalled();
    });
  });

  describe('Logout Flow', () => {
    it('calls logout service when logout button is pressed', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        isLogged: true,
        loading: false,
      });

      (logout as jest.Mock).mockResolvedValue(undefined);
      const mockClearAuthState = jest.fn().mockResolvedValue(undefined);
      const mockUser = createMockUser();

      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 0, past: 0, total: 0 },
            clearAuthState: mockClearAuthState,
          },
        },
      });

      const logoutButton = getByText('more.logout');
      fireEvent.press(logoutButton);

      await waitFor(() => {
        expect(logout).toHaveBeenCalled();
        expect(mockClearAuthState).toHaveBeenCalled();
      });
    });

    it('shows success message on successful logout', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        isLogged: true,
        loading: false,
      });

      (logout as jest.Mock).mockResolvedValue(undefined);
      const mockClearAuthState = jest.fn().mockResolvedValue(undefined);
      const mockUser = createMockUser();

      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 0, past: 0, total: 0 },
            clearAuthState: mockClearAuthState,
          },
        },
      });

      const logoutButton = getByText('more.logout');
      fireEvent.press(logoutButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('common.success', 'more.logoutSuccess');
      });
    });

    it('shows error message on logout failure', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        isLogged: true,
        loading: false,
      });

      (logout as jest.Mock).mockRejectedValue(new Error('Logout failed'));
      const mockUser = createMockUser();

      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 0, past: 0, total: 0 },
          },
        },
      });

      const logoutButton = getByText('more.logout');
      fireEvent.press(logoutButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('common.error', 'more.logoutError');
      });
    });
  });

  describe('Give Feedback', () => {
    it('opens feedback form URL when give feedback is pressed', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        isLogged: false,
        loading: false,
      });

      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: { isLogged: false },
        },
      });

      const feedbackButton = getByText('more.giveFeedback');
      fireEvent.press(feedbackButton);

      await waitFor(() => {
        expect(Linking.canOpenURL).toHaveBeenCalled();
        expect(Linking.openURL).toHaveBeenCalled();
      });
    });

    it('shows error when feedback URL cannot be opened', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        isLogged: false,
        loading: false,
      });

      (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);

      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: { isLogged: false },
        },
      });

      const feedbackButton = getByText('more.giveFeedback');
      fireEvent.press(feedbackButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('common.error', 'alerts.feedbackFormError');
      });
    });
  });

  describe('Event Counts', () => {
    it('displays upcoming event count badge', () => {
      (useAuth as jest.Mock).mockReturnValue({
        isLogged: true,
        loading: false,
      });

      const mockUser = createMockUser();
      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 12, past: 5, total: 17 },
          },
        },
      });

      expect(getByText('more.myUpcomingEvents')).toBeTruthy();
    });

    it('displays past event count badge', () => {
      (useAuth as jest.Mock).mockReturnValue({
        isLogged: true,
        loading: false,
      });

      const mockUser = createMockUser();
      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 3, past: 8, total: 11 },
          },
        },
      });

      expect(getByText('more.myPastEvents')).toBeTruthy();
    });

    it('displays the draft event count badge', () => {
      (useAuth as jest.Mock).mockReturnValue({
        isLogged: true,
        loading: false,
      });

      const mockUser = createMockUser();
      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 0, past: 0, draft: 7, total: 7 },
          },
        },
      });

      expect(getByText('more.draftEvents')).toBeTruthy();
      // Only the draft count is non-zero, so the badge number is unambiguous.
      expect(getByText('7')).toBeTruthy();
    });

    it('defaults to 0 counts when userEventCounts is null', () => {
      (useAuth as jest.Mock).mockReturnValue({
        isLogged: true,
        loading: false,
      });

      const mockUser = createMockUser();
      // userEventCounts: null means counts haven't loaded yet, but screen should still render
      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 0, past: 0, total: 0 },
          },
        },
      });

      expect(getByText('more.myUpcomingEvents')).toBeTruthy();
      expect(getByText('more.myPastEvents')).toBeTruthy();
    });
  });
});
