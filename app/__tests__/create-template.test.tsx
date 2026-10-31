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

jest.mock('@/services/storage.service', () => ({
  resolveImageUrls: jest.fn(),
}));

import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';
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

  describe('Validation', () => {
    const addTemplate = jest.fn();
    let alertSpy: jest.SpyInstance;
    const { resolveImageUrls } = require('@/services/storage.service');

    const renderForm = (userOrganizationsContext: Record<string, unknown> = {}) =>
      renderWithProviders(<CreateTemplateScreen />, {
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
            userOrganizations: [{ $id: 'org-1', name: 'Test Org' }],
            loading: false,
            ...userOrganizationsContext,
          },
          templatesContext: { addTemplate },
          organizationsContext: { dropdownItems: [] },
        },
      });

    const submit = async (getByTestId: (id: string) => any) => {
      await act(async () => {
        fireEvent.press(getByTestId('btn-template-submit'));
      });
    };

    beforeEach(() => {
      alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      resolveImageUrls.mockResolvedValue([]);
    });

    afterEach(() => {
      alertSpy.mockRestore();
    });

    it('refuses a missing organization', async () => {
      const { getByTestId } = renderForm({ selectedOrganizationId: null });

      await submit(getByTestId);

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'createEvent.organizationRequired');
      expect(addTemplate).not.toHaveBeenCalled();
    });

    it('refuses a missing template name', async () => {
      const { getByTestId } = renderForm();

      await submit(getByTestId);

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'template.nameMissing');
      expect(addTemplate).not.toHaveBeenCalled();
    });

    it('refuses volunteers with no text', async () => {
      const { getByTestId } = renderForm();

      fireEvent.changeText(getByTestId('input-template-name'), 'Monthly vigil');
      fireEvent.press(getByTestId('checkbox-event-help-needed'));
      await submit(getByTestId);

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'template.volunteerDescMissing');
      expect(addTemplate).not.toHaveBeenCalled();
    });

    it('refuses a disclaimer an event could not use', async () => {
      const { getByTestId } = renderForm();

      fireEvent.changeText(getByTestId('input-template-name'), 'Monthly vigil');
      fireEvent.changeText(getByTestId('input-event-disclaimer'), 'x'.repeat(501));
      await submit(getByTestId);

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'createEvent.disclaimerTooLong');
      expect(addTemplate).not.toHaveBeenCalled();
    });

    it('refuses event details past the server size limit', async () => {
      const { getByTestId } = renderForm();

      fireEvent.changeText(getByTestId('input-template-name'), 'Monthly vigil');
      fireEvent.changeText(getByTestId('input-event-description'), '\n'.repeat(8000));
      await submit(getByTestId);

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'template.dataTooLong');
      expect(addTemplate).not.toHaveBeenCalled();
    });

    it('allows a template with no category', async () => {
      addTemplate.mockResolvedValue(undefined);
      const { getByTestId } = renderForm();

      fireEvent.changeText(getByTestId('input-template-name'), 'Monthly vigil');
      await submit(getByTestId);

      expect(addTemplate).toHaveBeenCalledTimes(1);
    });
  });
});
