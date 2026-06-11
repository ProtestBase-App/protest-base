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
import { router, useFocusEffect } from 'expo-router';
import { renderWithProviders, fireEvent, waitFor, act, createMockUser } from '@/test-utils/render';
import MoreScreen from '@/app/(tabs)/(more)/more';
import { logout } from '@/services/auth.service';
import { useAuth } from '@/hooks/useAuth';
import { Routes } from '@/constants/Routes';

/** Presses the destructive button of the logout confirmation alert. */
function confirmLogoutAlert() {
  const confirmCall = (Alert.alert as jest.Mock).mock.calls.find(
    (call) => call[0] === 'more.logoutConfirmTitle'
  );
  expect(confirmCall).toBeTruthy();
  const destructiveButton = confirmCall[2].find(
    (button: { style?: string }) => button.style === 'destructive'
  );
  expect(destructiveButton).toBeTruthy();
  destructiveButton.onPress();
}

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

    it('shows the become organizer hero with CTA and sign-in link', () => {
      const { getByText, getByTestId } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: { isLogged: false },
        },
      });

      expect(getByText('more.becomeOrganizer')).toBeTruthy();
      expect(getByText('more.becomeOrganizerBody')).toBeTruthy();
      expect(getByText('common.getStarted')).toBeTruthy();
      expect(getByTestId('btn-more-sign-in')).toBeTruthy();
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
      const { queryByText, queryByTestId } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: { isLogged: false },
        },
      });

      expect(queryByText('more.createNewEvent')).toBeNull();
      expect(queryByText('more.upcoming')).toBeNull();
      expect(queryByText('more.past')).toBeNull();
      expect(queryByTestId('btn-more-account')).toBeNull();
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
            userEventCounts: { upcoming: 0, past: 0, draft: 0 },
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
            userEventCounts: { upcoming: 0, past: 0, draft: 0 },
          },
        },
      });

      expect(getByText('more.createNewEvent')).toBeTruthy();
    });

    it('shows the identity card linking to the account screen', () => {
      const mockUser = createMockUser();
      const { getByTestId } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 0, past: 0, draft: 0 },
          },
        },
      });

      fireEvent.press(getByTestId('btn-more-account'));

      expect(router.push).toHaveBeenCalledWith(Routes.ACCOUNT);
    });

    it('navigates to create event options from the create button', () => {
      const mockUser = createMockUser();
      const { getByTestId } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 0, past: 0, draft: 0 },
          },
        },
      });

      fireEvent.press(getByTestId('btn-create-event'));

      expect(router.push).toHaveBeenCalledWith(Routes.CREATE_EVENT_OPTIONS);
    });

    it('shows the user name on the identity card when there is no organization', () => {
      const mockUser = createMockUser();
      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 0, past: 0, draft: 0 },
          },
          userOrganizationsContext: {
            userOrganizations: [],
            selectedOrganizationId: null,
            hasOrganizations: false,
          },
        },
      });

      expect(getByText('Test User')).toBeTruthy();
      expect(getByText('more.identitySubtitle')).toBeTruthy();
    });

    it('shows the organization name on the identity card', () => {
      const mockUser = createMockUser();
      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 0, past: 0, draft: 0 },
          },
          userOrganizationsContext: {
            userOrganizations: [{ $id: 'org-1', Name: 'Test Org', role: 'admin' }],
            selectedOrganizationId: 'org-1',
            hasOrganizations: true,
          },
        },
      });

      expect(getByText('Test Org')).toBeTruthy();
      expect(getByText('more.identitySubtitleOrganizer')).toBeTruthy();
    });

    it('shows the four stat tiles', () => {
      const mockUser = createMockUser();
      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 0, past: 0, draft: 0 },
          },
        },
      });

      expect(getByText('more.upcoming')).toBeTruthy();
      expect(getByText('more.past')).toBeTruthy();
      expect(getByText('more.drafts')).toBeTruthy();
      expect(getByText('more.templates')).toBeTruthy();
    });

    it('navigates to the matching list from each stat tile', () => {
      const mockUser = createMockUser();
      const { getByTestId } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 0, past: 0, draft: 0 },
          },
        },
      });

      fireEvent.press(getByTestId('btn-upcoming-events'));
      expect(router.push).toHaveBeenCalledWith(Routes.MY_EVENTS_UPCOMING);

      fireEvent.press(getByTestId('btn-past-events'));
      expect(router.push).toHaveBeenCalledWith(Routes.MY_EVENTS_PAST);

      fireEvent.press(getByTestId('btn-draft-events'));
      expect(router.push).toHaveBeenCalledWith(Routes.DRAFT_EVENTS);

      fireEvent.press(getByTestId('btn-event-templates'));
      expect(router.push).toHaveBeenCalledWith(Routes.EVENT_TEMPLATES);
    });

    it('shows logout option', () => {
      const mockUser = createMockUser();
      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 0, past: 0, draft: 0 },
          },
        },
      });

      expect(getByText('more.logout')).toBeTruthy();
    });

    it('does not show the become organizer hero for logged in users', () => {
      const mockUser = createMockUser();
      const { queryByText, queryByTestId } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 0, past: 0, draft: 0 },
          },
        },
      });

      expect(queryByText('more.becomeOrganizerBody')).toBeNull();
      expect(queryByTestId('btn-more-sign-in')).toBeNull();
    });
  });

  describe('Navigation', () => {
    it('navigates to sign-in when the sign-in link is pressed', () => {
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

      expect(router.push).toHaveBeenCalledWith(Routes.SIGN_IN);
    });

    it('navigates to become organizer from the hero CTA', () => {
      (useAuth as jest.Mock).mockReturnValue({
        isLogged: false,
        loading: false,
      });

      const { getByText } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: { isLogged: false },
        },
      });

      fireEvent.press(getByText('common.getStarted'));

      expect(router.push).toHaveBeenCalledWith(Routes.BECOME_ORGANIZER);
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

      expect(router.push).toHaveBeenCalledWith(Routes.PRIVACY_CENTER);
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

      expect(router.push).toHaveBeenCalledWith(Routes.ABOUT);
    });
  });

  describe('Focus Refresh', () => {
    function renderLoggedInWithRefreshMocks(isStaleValue: boolean) {
      (useAuth as jest.Mock).mockReturnValue({
        isLogged: true,
        loading: false,
      });

      const mockRefreshCounts = jest.fn();
      const mockRefreshTemplates = jest.fn();
      renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: createMockUser(),
            userEventCounts: { upcoming: 0, past: 0, draft: 0 },
            refreshUserEventCounts: mockRefreshCounts,
          },
          userOrganizationsContext: {
            userOrganizations: [{ $id: 'org-1', Name: 'Test Org', role: 'admin' }],
            selectedOrganizationId: 'org-1',
            hasOrganizations: true,
          },
          templatesContext: {
            templates: [],
            isStale: jest.fn(() => isStaleValue),
            refreshTemplates: mockRefreshTemplates,
          },
        },
      });

      return { mockRefreshCounts, mockRefreshTemplates };
    }

    /**
     * The mocked useFocusEffect runs its callback once at render time, which
     * the screen treats as the skipped first focus. Re-invoking the captured
     * callback simulates the user returning to the screen.
     */
    function simulateRefocus() {
      const focusCallback = (useFocusEffect as jest.Mock).mock.calls.at(-1)?.[0];
      act(() => {
        focusCallback();
      });
    }

    it('refreshes counts and stale templates when the screen regains focus', () => {
      const { mockRefreshCounts, mockRefreshTemplates } = renderLoggedInWithRefreshMocks(true);

      expect(mockRefreshCounts).not.toHaveBeenCalled();

      simulateRefocus();

      expect(mockRefreshCounts).toHaveBeenCalledWith(['org-1']);
      expect(mockRefreshTemplates).toHaveBeenCalled();
    });

    it('skips the template refresh on refocus when the cache is fresh', () => {
      const { mockRefreshCounts, mockRefreshTemplates } = renderLoggedInWithRefreshMocks(false);

      simulateRefocus();

      expect(mockRefreshCounts).toHaveBeenCalledWith(['org-1']);
      expect(mockRefreshTemplates).not.toHaveBeenCalled();
    });
  });

  describe('Logout Flow', () => {
    it('asks for confirmation before logging out', () => {
      (useAuth as jest.Mock).mockReturnValue({
        isLogged: true,
        loading: false,
      });

      const mockUser = createMockUser();
      const { getByTestId } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 0, past: 0, draft: 0 },
          },
        },
      });

      fireEvent.press(getByTestId('btn-more-logout'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'more.logoutConfirmTitle',
        'more.logoutConfirmMessage',
        expect.any(Array)
      );
      expect(logout).not.toHaveBeenCalled();
    });

    it('calls logout service when the confirmation is accepted', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        isLogged: true,
        loading: false,
      });

      (logout as jest.Mock).mockResolvedValue(undefined);
      const mockClearAuthState = jest.fn().mockResolvedValue(undefined);
      const mockUser = createMockUser();

      const { getByTestId } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 0, past: 0, draft: 0 },
            clearAuthState: mockClearAuthState,
          },
        },
      });

      fireEvent.press(getByTestId('btn-more-logout'));
      confirmLogoutAlert();

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

      const { getByTestId } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 0, past: 0, draft: 0 },
            clearAuthState: mockClearAuthState,
          },
        },
      });

      fireEvent.press(getByTestId('btn-more-logout'));
      confirmLogoutAlert();

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

      const { getByTestId } = renderWithProviders(<MoreScreen />, {
        providerOverrides: {
          globalContext: {
            isLogged: true,
            user: mockUser,
            userEventCounts: { upcoming: 0, past: 0, draft: 0 },
          },
        },
      });

      fireEvent.press(getByTestId('btn-more-logout'));
      confirmLogoutAlert();

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
    it('displays the upcoming event count on its tile', () => {
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
            userEventCounts: { upcoming: 12, past: 5, draft: 3 },
          },
        },
      });

      expect(getByText('12')).toBeTruthy();
      expect(getByText('5')).toBeTruthy();
      expect(getByText('3')).toBeTruthy();
    });

    it('displays the templates count from the templates cache', () => {
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
            userEventCounts: { upcoming: 0, past: 0, draft: 0 },
          },
          templatesContext: {
            templates: [{ $id: 'tpl-1' }, { $id: 'tpl-2' }],
          },
        },
      });

      expect(getByText('2')).toBeTruthy();
    });
  });
});
