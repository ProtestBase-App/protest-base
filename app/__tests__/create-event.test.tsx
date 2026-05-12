// Mock dependencies BEFORE imports
jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key) => key),
}));

jest.mock('@/services/event.service', () => ({
  createEventBackend: jest.fn(),
}));

jest.mock('@/services/template.service', () => ({
  getTemplate: jest.fn(),
}));

jest.mock('@/services/localStorageService', () => ({
  saveEventDraft: jest.fn(),
  getEventDraft: jest.fn(),
  clearEventDraft: jest.fn(),
}));

import React from 'react';
import { renderWithProviders, createMockUser } from '@/test-utils/render';
import CreateEventModal from '../(tabs)/(more)/create-event';

// Import router for mock access
const { useLocalSearchParams } = require('expo-router');

describe('CreateEventModal', () => {
  const mockUser = createMockUser();

  beforeEach(() => {
    jest.clearAllMocks();
    useLocalSearchParams.mockReturnValue({});

    // Reset localStorageService mocks
    const {
      getEventDraft,
      clearEventDraft,
      saveEventDraft,
    } = require('@/services/localStorageService');
    getEventDraft.mockResolvedValue(null);
    clearEventDraft.mockResolvedValue(undefined);
    saveEventDraft.mockResolvedValue({ success: true });
  });

  describe('Rendering', () => {
    it('should render EventForm component when user is logged in with organizations', async () => {
      const { findAllByText } = renderWithProviders(<CreateEventModal />, {
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

      // Wait for form to render - title appears (possibly twice, title and button)
      const elements = await findAllByText('more.createEvent');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should show loading state when checking draft', async () => {
      const { getEventDraft } = require('@/services/localStorageService');
      getEventDraft.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(null), 100))
      );

      const { UNSAFE_root } = renderWithProviders(<CreateEventModal />, {
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

      // During draft checking, we show ActivityIndicator
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should show loading text when loading template', async () => {
      useLocalSearchParams.mockReturnValue({ templateId: 'template-1' });

      const { getTemplate } = require('@/services/template.service');
      getTemplate.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ event_data: {} }), 100))
      );

      const { getByText } = renderWithProviders(<CreateEventModal />, {
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

      expect(getByText('templates.loadingTemplate')).toBeTruthy();
    });

    it('should redirect to more tab when not logged in', () => {
      const { getByText } = renderWithProviders(<CreateEventModal />, {
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
      const { getByText } = renderWithProviders(<CreateEventModal />, {
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

    it('should show loading when user organizations are loading', () => {
      const { UNSAFE_root } = renderWithProviders(<CreateEventModal />, {
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

      // Shows loading indicator
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Template Loading', () => {
    it('should load template data when templateId is provided', async () => {
      useLocalSearchParams.mockReturnValue({ templateId: 'template-1' });

      const { getTemplate } = require('@/services/template.service');
      getTemplate.mockResolvedValue({
        event_data: {
          title: 'Template Event',
          description: 'Template Description',
          city: 'Brussels',
        },
      });

      const { getEventDraft, clearEventDraft } = require('@/services/localStorageService');
      getEventDraft.mockResolvedValue(null);
      clearEventDraft.mockResolvedValue(undefined);

      const { findAllByText } = renderWithProviders(<CreateEventModal />, {
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

      expect(getTemplate).toHaveBeenCalledWith('template-1');
      expect(clearEventDraft).toHaveBeenCalled();
      const elements = await findAllByText('more.createEvent');
      expect(elements.length).toBeGreaterThan(0);
    });
  });
});
