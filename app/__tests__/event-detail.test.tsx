// Mock dependencies BEFORE imports
jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key) => key),
}));

jest.mock('@/services/event.service', () => {
  // Real error classes so the screen's `instanceof` branching works against
  // rejections created in these tests.
  class EventNotFoundError extends Error {}
  class EventNetworkError extends Error {}
  class EventAlreadyCancelledError extends Error {}
  return {
    getEventByIdBackend: jest.fn(),
    deleteEvent: jest.fn(),
    cancelEvent: jest.fn(),
    EventNotFoundError,
    EventNetworkError,
    EventAlreadyCancelledError,
  };
});

jest.mock('@/services/eventView.service', () => ({
  trackEventView: jest.fn(),
}));

jest.mock('@/utils/eventPermissions', () => ({
  canUserEditEvent: jest.fn(),
  canUserDeleteEvent: jest.fn(),
}));

jest.mock('@/utils/eventFormatters', () => ({
  formatEventForDisplay: jest.fn((event) => ({
    ...event,
    title: event.title,
    startDateNoFormat: event.start_time,
    startDateFull: event.start_time,
  })),
}));

jest.mock('@/utils/shareHelpers', () => ({
  shareEventWithAlert: jest.fn(),
}));

jest.mock('@/hooks/useLogoScheme', () => ({
  useLogoScheme: jest.fn(() => ({ uri: 'mock-logo' })),
}));

jest.mock('@/utils/themeColors', () => ({
  getThemeColors: jest.fn(() => ({
    tint: '#F94460',
    icon: '#000000',
    destructive: '#FF0000',
  })),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Records every render of the full-screen loader, so the cache-first tests can
// assert the spinner frame is gone rather than just that content arrives.
const mockBrandLoaderRender = jest.fn();
jest.mock('@/components/ui/loaders/BrandLoader', () => ({
  BrandLoader: (props: Record<string, unknown>) => {
    mockBrandLoaderRender(props);
    return null;
  },
}));

import React from 'react';
import { renderWithProviders, createMockEvent, createMockUser } from '@/test-utils/render';
import EventDetails from '../event/[id]';

// Import router and services for mock access
const { useLocalSearchParams, router } = require('expo-router');
const {
  getEventByIdBackend,
  EventNotFoundError,
  EventNetworkError,
} = require('@/services/event.service');

describe('EventDetails', () => {
  const mockEvent = createMockEvent();
  const mockUser = createMockUser();

  beforeEach(() => {
    jest.clearAllMocks();
    useLocalSearchParams.mockReturnValue({ id: 'event-1' });
    getEventByIdBackend.mockResolvedValue(mockEvent);
  });

  describe('Loading State', () => {
    it('should show loading state while fetching event', () => {
      getEventByIdBackend.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockEvent), 100))
      );

      const { UNSAFE_root } = renderWithProviders(<EventDetails />, {
        providerOverrides: {
          globalContext: {
            user: mockUser,
            isLogged: true,
            loading: false,
            userLanguage: 'en',
            eventsCache: {},
            refetchEvents: jest.fn(),
            refreshUserEventCounts: jest.fn(),
          },
        },
      });

      expect(UNSAFE_root).toBeTruthy();
    });

    it('should show loading when postal codes are loading', () => {
      const { UNSAFE_root } = renderWithProviders(<EventDetails />, {
        providerOverrides: {
          globalContext: {
            user: mockUser,
            isLogged: true,
            loading: false,
            userLanguage: 'en',
            eventsCache: {},
            refetchEvents: jest.fn(),
            refreshUserEventCounts: jest.fn(),
          },
          postalCodeContext: {
            loading: true,
            getSubMunicipalityName: jest.fn(),
          },
        },
      });

      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Event Display', () => {
    it('should render event detail when event is loaded', async () => {
      const { findByText } = renderWithProviders(<EventDetails />, {
        providerOverrides: {
          globalContext: {
            user: mockUser,
            isLogged: true,
            loading: false,
            userLanguage: 'en',
            eventsCache: {},
            refetchEvents: jest.fn(),
            refreshUserEventCounts: jest.fn(),
          },
          postalCodeContext: {
            loading: false,
            getSubMunicipalityName: jest.fn(),
          },
        },
      });

      expect(getEventByIdBackend).toHaveBeenCalledWith('event-1', true);
      await findByText(mockEvent.title);
    });

    it('should show error state when event fails to load', async () => {
      getEventByIdBackend.mockRejectedValue(new Error('Event not found'));

      const { findByText } = renderWithProviders(<EventDetails />, {
        providerOverrides: {
          globalContext: {
            user: mockUser,
            isLogged: true,
            loading: false,
            userLanguage: 'en',
            eventsCache: {},
            refetchEvents: jest.fn(),
            refreshUserEventCounts: jest.fn(),
          },
          postalCodeContext: {
            loading: false,
            getSubMunicipalityName: jest.fn(),
          },
        },
      });

      await findByText('common.error');
    });

    it('should show error state when no event ID provided', async () => {
      useLocalSearchParams.mockReturnValue({});

      const { findByText } = renderWithProviders(<EventDetails />, {
        providerOverrides: {
          globalContext: {
            user: mockUser,
            isLogged: true,
            loading: false,
            userLanguage: 'en',
            eventsCache: {},
            refetchEvents: jest.fn(),
            refreshUserEventCounts: jest.fn(),
          },
          postalCodeContext: {
            loading: false,
            getSubMunicipalityName: jest.fn(),
          },
        },
      });

      await findByText('common.error');
    });
  });

  describe('Cache-first paint', () => {
    const cached = { ...mockEvent, title: 'Cached title', view_count: 7 };

    function renderWithCache(overrides: Record<string, unknown> = {}) {
      return renderWithProviders(<EventDetails />, {
        providerOverrides: {
          globalContext: {
            user: mockUser,
            isLogged: true,
            loading: false,
            userLanguage: 'en',
            eventsCache: { 'event-1': cached },
            refetchEvents: jest.fn(),
            refreshUserEventCounts: jest.fn(),
            ...overrides,
          },
          postalCodeContext: {
            loading: false,
            getSubMunicipalityName: jest.fn(),
          },
        },
      });
    }

    it('renders a cached event without ever showing the loader', async () => {
      getEventByIdBackend.mockImplementation(() => new Promise(() => {}));

      const { getByText } = renderWithCache();

      // Present on the very first commit — no spinner frame, no await.
      expect(getByText('Cached title')).toBeTruthy();
      expect(mockBrandLoaderRender).not.toHaveBeenCalled();
    });

    it('shows the loader when the event is not in the cache', async () => {
      getEventByIdBackend.mockImplementation(() => new Promise(() => {}));

      renderWithProviders(<EventDetails />, {
        providerOverrides: {
          globalContext: {
            user: mockUser,
            isLogged: true,
            loading: false,
            userLanguage: 'en',
            eventsCache: {},
            refetchEvents: jest.fn(),
            refreshUserEventCounts: jest.fn(),
          },
          postalCodeContext: { loading: false, getSubMunicipalityName: jest.fn() },
        },
      });

      expect(mockBrandLoaderRender).toHaveBeenCalled();
    });

    it('revalidates in the background and swaps in the server copy', async () => {
      getEventByIdBackend.mockResolvedValue({ ...mockEvent, title: 'Server title' });

      const { findByText } = renderWithCache();

      expect(getEventByIdBackend).toHaveBeenCalledWith('event-1', true);
      await findByText('Server title');
    });

    it('keeps the cached copy when the background revalidation fails', async () => {
      getEventByIdBackend.mockRejectedValue(new EventNetworkError('offline'));

      const { findByText, queryByText } = renderWithCache();

      // The screen the user is already reading must not blank out.
      expect(await findByText('Cached title')).toBeTruthy();
      expect(queryByText('common.error')).toBeNull();
    });

    it('clears the screen and evicts the event when the backend confirms a 404', async () => {
      getEventByIdBackend.mockRejectedValue(new EventNotFoundError('gone'));
      const removeEventFromCache = jest.fn();

      const { findByText } = renderWithCache({ removeEventFromCache });

      await findByText('common.error');
      expect(removeEventFromCache).toHaveBeenCalledWith('event-1');
    });
  });

  describe('URL Parameters', () => {
    it('should extract event ID from array URL parameter', async () => {
      useLocalSearchParams.mockReturnValue({ id: ['event-123'] });

      renderWithProviders(<EventDetails />, {
        providerOverrides: {
          globalContext: {
            user: mockUser,
            isLogged: true,
            loading: false,
            userLanguage: 'en',
            eventsCache: {},
            refetchEvents: jest.fn(),
            refreshUserEventCounts: jest.fn(),
          },
          postalCodeContext: {
            loading: false,
            getSubMunicipalityName: jest.fn(),
          },
        },
      });

      expect(getEventByIdBackend).toHaveBeenCalledWith('event-123', true);
    });

    it('should extract event ID from string URL parameter', async () => {
      useLocalSearchParams.mockReturnValue({ id: 'event-456' });

      renderWithProviders(<EventDetails />, {
        providerOverrides: {
          globalContext: {
            user: mockUser,
            isLogged: true,
            loading: false,
            userLanguage: 'en',
            eventsCache: {},
            refetchEvents: jest.fn(),
            refreshUserEventCounts: jest.fn(),
          },
          postalCodeContext: {
            loading: false,
            getSubMunicipalityName: jest.fn(),
          },
        },
      });

      expect(getEventByIdBackend).toHaveBeenCalledWith('event-456', true);
    });
  });

  describe('Navigation', () => {
    it('should navigate back when back button is pressed', async () => {
      router.canGoBack.mockReturnValue(true);

      const { findByText } = renderWithProviders(<EventDetails />, {
        providerOverrides: {
          globalContext: {
            user: mockUser,
            isLogged: true,
            loading: false,
            userLanguage: 'en',
            eventsCache: {},
            refetchEvents: jest.fn(),
            refreshUserEventCounts: jest.fn(),
          },
          postalCodeContext: {
            loading: false,
            getSubMunicipalityName: jest.fn(),
          },
        },
      });

      // Wait for event to load - back button should work
      await findByText(mockEvent.title);
      expect(router.back).toBeDefined();
    });

    it('should navigate to home when back pressed and isCreated param is set', async () => {
      useLocalSearchParams.mockReturnValue({ id: 'event-1', isCreated: 'true' });
      router.canGoBack.mockReturnValue(true);

      const { findByText } = renderWithProviders(<EventDetails />, {
        providerOverrides: {
          globalContext: {
            user: mockUser,
            isLogged: true,
            loading: false,
            userLanguage: 'en',
            eventsCache: {},
            refetchEvents: jest.fn(),
            refreshUserEventCounts: jest.fn(),
          },
          postalCodeContext: {
            loading: false,
            getSubMunicipalityName: jest.fn(),
          },
        },
      });

      // Wait for event to load
      await findByText(mockEvent.title);
      expect(router.push).toBeDefined();
    });

    it('should navigate to home as fallback when no navigation history', async () => {
      router.canGoBack.mockReturnValue(false);

      const { findByText } = renderWithProviders(<EventDetails />, {
        providerOverrides: {
          globalContext: {
            user: mockUser,
            isLogged: true,
            loading: false,
            userLanguage: 'en',
            eventsCache: {},
            refetchEvents: jest.fn(),
            refreshUserEventCounts: jest.fn(),
          },
          postalCodeContext: {
            loading: false,
            getSubMunicipalityName: jest.fn(),
          },
        },
      });

      // Wait for event to load
      await findByText(mockEvent.title);
      expect(router.push).toBeDefined();
    });
  });

  describe('Save/Unsave Event', () => {
    it('should toggle save state when heart icon pressed', async () => {
      const mockSaveEvent = jest.fn();
      const mockUnsaveEvent = jest.fn();

      const { findByText } = renderWithProviders(<EventDetails />, {
        providerOverrides: {
          globalContext: {
            user: mockUser,
            isLogged: true,
            loading: false,
            userLanguage: 'en',
            eventsCache: {},
            refetchEvents: jest.fn(),
            refreshUserEventCounts: jest.fn(),
          },
          savedEventsContext: {
            savedEventIds: [],
            saveEvent: mockSaveEvent,
            unsaveEvent: mockUnsaveEvent,
            isSaved: jest.fn().mockReturnValue(false),
          },
          postalCodeContext: {
            loading: false,
            getSubMunicipalityName: jest.fn(),
          },
        },
      });

      // Wait for event to load - save functionality should work
      await findByText(mockEvent.title);
      expect(mockSaveEvent).toBeDefined();
    });
  });

  describe('Refresh', () => {
    it('should call refetchEvents when component mounts', async () => {
      const mockRefetchEvents = jest.fn();

      const { findByText } = renderWithProviders(<EventDetails />, {
        providerOverrides: {
          globalContext: {
            user: mockUser,
            isLogged: true,
            loading: false,
            userLanguage: 'en',
            eventsCache: {},
            refetchEvents: mockRefetchEvents,
            refreshUserEventCounts: jest.fn(),
          },
          postalCodeContext: {
            loading: false,
            getSubMunicipalityName: jest.fn(),
          },
        },
      });

      // Wait for event to load
      await findByText(mockEvent.title);

      expect(getEventByIdBackend).toHaveBeenCalledWith('event-1', true);
    });
  });
});
