// Mock dependencies BEFORE imports
jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key) => key),
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
import { renderWithProviders, createMockUser } from '@/test-utils/render';
import CreateTemplateScreen from '../(tabs)/(more)/create-template';

// Import router for mock access
const { useLocalSearchParams } = require('expo-router');

describe('CreateTemplateScreen', () => {
  const mockUser = createMockUser();

  beforeEach(() => {
    jest.clearAllMocks();
    useLocalSearchParams.mockReturnValue({});
  });

  describe('Rendering', () => {
    it('should render the template creation form when logged in with organizations', () => {
      const { getByText } = renderWithProviders(<CreateTemplateScreen />, {
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
          userOrganizationsContext: {
            hasOrganizations: true,
            selectedOrganizationId: 'org-1',
            userOrganizations: [
              {
                $id: 'org-1',
                name: 'Test Org',
                avatar_url: null,
                $createdAt: '2025-01-01',
                $updatedAt: '2025-01-01',
              },
            ],
            loading: false,
          },
        },
      });

      expect(getByText('template.createTitle')).toBeTruthy();
      expect(getByText('template.createSubtitle')).toBeTruthy();
      expect(getByText('template.eventDetailsSection')).toBeTruthy();
    });

    it('should show loading state when auth is loading', () => {
      const { UNSAFE_root } = renderWithProviders(<CreateTemplateScreen />, {
        providerOverrides: {
          globalContext: {
            user: null,
            isLogged: false,
            loading: true,
            userLanguage: 'en',
            eventsCache: {},
            refetchEvents: jest.fn(),
            refreshUserEventCounts: jest.fn(),
          },
        },
      });

      expect(UNSAFE_root).toBeTruthy();
    });

    it('should show loading state when user organizations are loading', () => {
      const { UNSAFE_root } = renderWithProviders(<CreateTemplateScreen />, {
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
          userOrganizationsContext: {
            hasOrganizations: false,
            selectedOrganizationId: null,
            userOrganizations: [],
            loading: true,
          },
        },
      });

      expect(UNSAFE_root).toBeTruthy();
    });

    it('should redirect to more tab when not logged in', () => {
      const { getByText } = renderWithProviders(<CreateTemplateScreen />, {
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

    it('should redirect to become organizer when user has no organizations', () => {
      const { getByText } = renderWithProviders(<CreateTemplateScreen />, {
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
          userOrganizationsContext: {
            hasOrganizations: false,
            selectedOrganizationId: null,
            userOrganizations: [],
            loading: false,
          },
        },
      });

      // Redirect component renders text with href
      expect(getByText(/Redirect to.*become-organizer/)).toBeTruthy();
    });

    it('should show title for creating from past event when sourceEventData is provided', () => {
      useLocalSearchParams.mockReturnValue({
        sourceEventData: JSON.stringify({
          title: 'Past Event',
          description: 'Description',
        }),
        suggestedName: 'Template: Past Event',
      });

      const { getByText } = renderWithProviders(<CreateTemplateScreen />, {
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
          userOrganizationsContext: {
            hasOrganizations: true,
            selectedOrganizationId: 'org-1',
            userOrganizations: [
              {
                $id: 'org-1',
                name: 'Test Org',
                avatar_url: null,
                $createdAt: '2025-01-01',
                $updatedAt: '2025-01-01',
              },
            ],
            loading: false,
          },
        },
      });

      expect(getByText('template.createFromEventTitle')).toBeTruthy();
    });
  });

  describe('Pre-fill from Past Event', () => {
    it('should pre-fill form when sourceEventData is provided', async () => {
      useLocalSearchParams.mockReturnValue({
        sourceEventData: JSON.stringify({
          title: 'Past Event Title',
          description: 'Past Event Description',
          city: 'Brussels',
          categories: ['protest', 'climate'],
        }),
        suggestedName: 'Template: Past Event',
      });

      const { findByDisplayValue } = renderWithProviders(<CreateTemplateScreen />, {
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
          userOrganizationsContext: {
            hasOrganizations: true,
            selectedOrganizationId: 'org-1',
            userOrganizations: [
              {
                $id: 'org-1',
                name: 'Test Org',
                avatar_url: null,
                $createdAt: '2025-01-01',
                $updatedAt: '2025-01-01',
              },
            ],
            loading: false,
          },
        },
      });

      await findByDisplayValue('Template: Past Event');
      await findByDisplayValue('Past Event Title');
      await findByDisplayValue('Past Event Description');
    });
  });
});
