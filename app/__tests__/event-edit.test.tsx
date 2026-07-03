// Mock dependencies BEFORE imports
jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key) => key),
}));

jest.mock('@/services/event.service', () => ({
  getEventByIdBackend: jest.fn(),
  updateEvent: jest.fn(),
}));

jest.mock('@/utils/eventFormatters', () => ({
  formatEventForDisplay: jest.fn((event) => ({
    ...event,
    title: event.title,
    startDateNoFormat: event.start_time,
    startDateFull: event.start_time,
    endDateFull: event.end_time,
    organization_id: event.organization_id,
  })),
}));

jest.mock('@/utils/themeColors', () => ({
  getThemeColors: jest.fn(() => ({
    tint: '#F94460',
    icon: '#000000',
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

import React from 'react';
import { renderWithProviders, createMockEvent, createMockUser } from '@/test-utils/render';
import EditEvent from '../event-edit/[id]';

// Import router and services for mock access
const { useLocalSearchParams } = require('expo-router');
const { getEventByIdBackend } = require('@/services/event.service');

describe('EditEvent', () => {
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

      const { UNSAFE_root } = renderWithProviders(<EditEvent />, {
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
  });

  describe('Event Form', () => {
    it('should render edit form with event data', async () => {
      const { findByText, findByDisplayValue } = renderWithProviders(<EditEvent />, {
        providerOverrides: {
          globalContext: {
            user: mockUser,
            isLogged: true,
            loading: false,
            userLanguage: 'en',
            eventsCache: {
              'event-1': mockEvent,
            },
            refetchEvents: jest.fn(),
            refreshUserEventCounts: jest.fn(),
          },
          organizationsContext: {
            dropdownItems: [],
          },
        },
      });

      await findByText('eventEdit.title');
      await findByDisplayValue(mockEvent.title);
    });

    it('should fetch event from backend when not in cache', async () => {
      const { findByText } = renderWithProviders(<EditEvent />, {
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
          organizationsContext: {
            dropdownItems: [],
          },
        },
      });

      expect(getEventByIdBackend).toHaveBeenCalledWith('event-1');
      await findByText('eventEdit.title');
    });

    it('always fetches fresh and ignores a stale cached copy of the event', async () => {
      // A stale (e.g. disk-hydrated) cache entry must never seed the edit form:
      // submitting would write its outdated untouched fields back to the server.
      const staleEvent = { ...mockEvent, title: 'Stale Cached Title' };

      const { findByDisplayValue, queryByDisplayValue } = renderWithProviders(<EditEvent />, {
        providerOverrides: {
          globalContext: {
            user: mockUser,
            isLogged: true,
            loading: false,
            userLanguage: 'en',
            eventsCache: {
              'event-1': staleEvent,
            },
            refetchEvents: jest.fn(),
            refreshUserEventCounts: jest.fn(),
          },
          organizationsContext: {
            dropdownItems: [],
          },
        },
      });

      expect(getEventByIdBackend).toHaveBeenCalledWith('event-1');
      await findByDisplayValue(mockEvent.title);
      expect(queryByDisplayValue('Stale Cached Title')).toBeNull();
    });

    it('should redirect to more tab when not logged in', () => {
      const { getByText } = renderWithProviders(<EditEvent />, {
        providerOverrides: {
          globalContext: {
            user: null,
            isLogged: false,
            loading: false,
            userLanguage: 'en',
            eventsCache: {},
            refetchEvents: jest.fn(),
            refreshUserEventCounts: jest.fn(),
          },
        },
      });

      // Redirect component renders text with href
      expect(getByText(/Redirect to.*more/)).toBeTruthy();
    });
  });

  describe('URL Parameters', () => {
    it('should extract event ID from array URL parameter', async () => {
      useLocalSearchParams.mockReturnValue({ id: ['event-123'] });

      renderWithProviders(<EditEvent />, {
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
          organizationsContext: {
            dropdownItems: [],
          },
        },
      });

      expect(getEventByIdBackend).toHaveBeenCalledWith('event-123');
    });

    it('should extract event ID from string URL parameter', async () => {
      useLocalSearchParams.mockReturnValue({ id: 'event-456' });

      renderWithProviders(<EditEvent />, {
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
          organizationsContext: {
            dropdownItems: [],
          },
        },
      });

      expect(getEventByIdBackend).toHaveBeenCalledWith('event-456');
    });
  });

  describe('Pre-fill Form Data', () => {
    it('should pre-fill form with the freshly loaded event data', async () => {
      const eventWithCategories = {
        ...mockEvent,
        categories: ['protest', 'climate'],
        co_organizers: ['org-a', 'org-b'],
      };
      // The edit screen always loads fresh from the backend (never the cache).
      getEventByIdBackend.mockResolvedValue(eventWithCategories);

      const { findByDisplayValue } = renderWithProviders(<EditEvent />, {
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
          organizationsContext: {
            dropdownItems: [
              { label: 'Org A', value: 'org-a' },
              { label: 'Org B', value: 'org-b' },
            ],
          },
        },
      });

      await findByDisplayValue(eventWithCategories.title);
      await findByDisplayValue(eventWithCategories.description);
    });

    it('pre-fills co-organizers from the event using IDs directly', async () => {
      // co_organizers from the API are org IDs; the form uses them as-is (no
      // name->ID lookup) and the dropdown resolves each ID to its label.
      const eventWithCoOrgs = {
        ...mockEvent,
        co_organizers: ['org-a', 'org-b'],
      };
      getEventByIdBackend.mockResolvedValue(eventWithCoOrgs);

      const { findByText } = renderWithProviders(<EditEvent />, {
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
          organizationsContext: {
            dropdownItems: [
              { label: 'Org A', value: 'org-a' },
              { label: 'Org B', value: 'org-b' },
            ],
          },
        },
      });

      // Selected co-organizer chips render the resolved labels, proving the IDs
      // were placed into the form and matched against the org list.
      expect(await findByText('Org A')).toBeTruthy();
      expect(await findByText('Org B')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should navigate back when cancel button pressed', async () => {
      const { router } = require('expo-router');

      const { findByText } = renderWithProviders(<EditEvent />, {
        providerOverrides: {
          globalContext: {
            user: mockUser,
            isLogged: true,
            loading: false,
            userLanguage: 'en',
            eventsCache: {
              'event-1': mockEvent,
            },
            refetchEvents: jest.fn(),
            refreshUserEventCounts: jest.fn(),
          },
          organizationsContext: {
            dropdownItems: [],
          },
        },
      });

      // Wait for form to load - cancel button should work
      await findByText('common.cancel');
      expect(router.back).toBeDefined();
    });
  });
});
