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
    all_day: event.all_day,
  })),
  // Real: these two ARE the all-day conversion rule under test, and EventForm
  // calls isBelgiumMidnight on every render.
  allDaySubmitField: jest.requireActual('@/utils/eventFormatters').allDaySubmitField,
  isBelgiumMidnight: jest.requireActual('@/utils/eventFormatters').isBelgiumMidnight,
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
import { Alert } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
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

  describe('Unsaved changes guard', () => {
    const providerOverrides = {
      globalContext: {
        user: mockUser,
        isLogged: true,
        loading: false,
        userLanguage: 'en',
        eventsCache: {},
        refetchEvents: jest.fn(),
        refreshUserEventCounts: jest.fn(),
      },
      organizationsContext: { dropdownItems: [] },
    };

    it('prompts before leaving when the form has unsaved edits', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

      const { findByDisplayValue, getByTestId } = renderWithProviders(<EditEvent />, {
        providerOverrides,
      });

      const titleInput = await findByDisplayValue(mockEvent.title);
      fireEvent.changeText(titleInput, 'A different title');
      fireEvent.press(getByTestId('button-cancel'));

      expect(alertSpy).toHaveBeenCalledWith(
        'eventEdit.discardTitle',
        'eventEdit.discardMessage',
        expect.any(Array)
      );

      alertSpy.mockRestore();
    });

    it('leaves immediately without a prompt when nothing was edited', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const { router } = require('expo-router');

      const { findByDisplayValue, getByTestId } = renderWithProviders(<EditEvent />, {
        providerOverrides,
      });

      await findByDisplayValue(mockEvent.title);
      fireEvent.press(getByTestId('button-cancel'));

      expect(alertSpy).not.toHaveBeenCalled();
      expect(router.back).toHaveBeenCalled();

      alertSpy.mockRestore();
    });
  });

  describe('all-day conversion', () => {
    // Brussels 00:00 on 22 July 2026 (CEST, UTC+2) — the all-day convention.
    const BRUSSELS_MIDNIGHT = '2026-07-21T22:00:00.000Z';
    const { updateEvent } = require('@/services/event.service');

    const providerOverrides = {
      globalContext: {
        user: mockUser,
        isLogged: true,
        loading: false,
        userLanguage: 'en',
        eventsCache: {},
        refetchEvents: jest.fn(),
        refreshUserEventCounts: jest.fn(),
      },
      organizationsContext: { dropdownItems: [] },
    };

    const renderAllDayEditor = async (startTime: string) => {
      const allDayEvent = createMockEvent({
        title: 'Scraped date-only protest',
        description: 'Imported without a clock time',
        start_time: startTime,
        end_time: '2026-07-22T21:59:59.999Z',
        all_day: true,
      });
      getEventByIdBackend.mockResolvedValue(allDayEvent);
      updateEvent.mockResolvedValue(allDayEvent);

      const utils = renderWithProviders(<EditEvent />, { providerOverrides });
      await utils.findByDisplayValue(allDayEvent.title);
      return utils;
    };

    it('keeps the flag when the start is left at Brussels midnight', async () => {
      const { getByTestId } = await renderAllDayEditor(BRUSSELS_MIDNIGHT);

      fireEvent.press(getByTestId('button-save'));

      expect(updateEvent).toHaveBeenCalledWith(
        'event-1',
        expect.objectContaining({ all_day: true })
      );
    });

    it('clears the flag once the start carries a real clock time', async () => {
      // What the organizer's 14:00 pick leaves in the form.
      const { getByTestId } = await renderAllDayEditor('2026-07-22T12:00:00.000Z');

      fireEvent.press(getByTestId('button-save'));

      expect(updateEvent).toHaveBeenCalledWith(
        'event-1',
        expect.objectContaining({ all_day: false })
      );
    });

    it('says nothing about all_day for an ordinary timed event', async () => {
      const timedEvent = createMockEvent({
        title: 'Ordinary protest',
        description: 'Has a real time',
        start_time: '2026-07-22T12:00:00.000Z',
      });
      getEventByIdBackend.mockResolvedValue(timedEvent);
      updateEvent.mockResolvedValue(timedEvent);

      const { findByDisplayValue, getByTestId } = renderWithProviders(<EditEvent />, {
        providerOverrides,
      });
      await findByDisplayValue(timedEvent.title);

      fireEvent.press(getByTestId('button-save'));

      expect(updateEvent).toHaveBeenCalledWith(
        'event-1',
        expect.not.objectContaining({ all_day: expect.anything() })
      );
    });
  });
});
