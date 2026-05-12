// Mock dependencies BEFORE imports
jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key) => key),
}));

jest.mock('@/utils/templateUtils', () => ({
  extractTemplateData: jest.fn(),
  formatPastEventDate: jest.fn((date) => date),
}));

jest.mock('@/hooks/useThemeColor', () => ({
  useThemeColor: jest.fn(() => '#000000'),
}));

import React from 'react';
import { renderWithProviders } from '@/test-utils/render';
import EventTemplatesScreen from '../(tabs)/(more)/event-templates';
import { fireEvent } from '@testing-library/react-native';

// Import router for mock access
const { useLocalSearchParams, router } = require('expo-router');

describe('EventTemplatesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLocalSearchParams.mockReturnValue({});
  });

  describe('Template List Display', () => {
    it('should render template list when templates exist', () => {
      const mockTemplates = [
        {
          $id: 'template-1',
          name: 'Test Template 1',
          description: 'Description 1',
          organization_id: 'org-1',
          event_data: { title: 'Event 1' },
          $createdAt: '2025-01-01',
          $updatedAt: '2025-01-01',
        },
        {
          $id: 'template-2',
          name: 'Test Template 2',
          description: 'Description 2',
          organization_id: 'org-2',
          event_data: { title: 'Event 2' },
          $createdAt: '2025-01-02',
          $updatedAt: '2025-01-02',
        },
      ];

      const { getByText } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          templatesContext: {
            templates: mockTemplates,
            loading: false,
            error: null,
            refreshTemplates: jest.fn(),
            addTemplate: jest.fn(),
            editTemplate: jest.fn(),
            removeTemplate: jest.fn(),
            isStale: jest.fn().mockReturnValue(false),
          },
          pastEventsContext: {
            pastEvents: [],
            loading: false,
            refreshPastEvents: jest.fn(),
            isStale: jest.fn().mockReturnValue(false),
          },
        },
      });

      expect(getByText('Test Template 1')).toBeTruthy();
      expect(getByText('Test Template 2')).toBeTruthy();
    });

    it('should render loading state when loading templates', () => {
      const { getByLabelText } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          templatesContext: {
            templates: [],
            loading: true,
            error: null,
            refreshTemplates: jest.fn(),
            addTemplate: jest.fn(),
            editTemplate: jest.fn(),
            removeTemplate: jest.fn(),
            isStale: jest.fn().mockReturnValue(false),
          },
          pastEventsContext: {
            pastEvents: [],
            loading: false,
            refreshPastEvents: jest.fn(),
            isStale: jest.fn().mockReturnValue(false),
          },
        },
      });

      expect(getByLabelText('templates.loadingTemplates')).toBeTruthy();
    });

    it('should render error state when templates fail to load', () => {
      const { getByText } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          templatesContext: {
            templates: [],
            loading: false,
            error: 'Failed to load templates',
            refreshTemplates: jest.fn(),
            addTemplate: jest.fn(),
            editTemplate: jest.fn(),
            removeTemplate: jest.fn(),
            isStale: jest.fn().mockReturnValue(false),
          },
          pastEventsContext: {
            pastEvents: [],
            loading: false,
            refreshPastEvents: jest.fn(),
            isStale: jest.fn().mockReturnValue(false),
          },
        },
      });

      expect(getByText('Failed to load templates')).toBeTruthy();
    });

    it('should render empty state when no templates exist', () => {
      const { getByText } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          templatesContext: {
            templates: [],
            loading: false,
            error: null,
            refreshTemplates: jest.fn(),
            addTemplate: jest.fn(),
            editTemplate: jest.fn(),
            removeTemplate: jest.fn(),
            isStale: jest.fn().mockReturnValue(false),
          },
          pastEventsContext: {
            pastEvents: [],
            loading: false,
            refreshPastEvents: jest.fn(),
            isStale: jest.fn().mockReturnValue(false),
          },
        },
      });

      // Check for empty state message from EmptyTemplateState component
      expect(getByText('templates.emptyTitle')).toBeTruthy();
    });
  });

  describe('Selection Mode', () => {
    beforeEach(() => {
      useLocalSearchParams.mockReturnValue({ mode: 'selection' });
    });

    it('should render selection mode empty state when no templates', () => {
      const { getByText } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          templatesContext: {
            templates: [],
            loading: false,
            error: null,
            refreshTemplates: jest.fn(),
            addTemplate: jest.fn(),
            editTemplate: jest.fn(),
            removeTemplate: jest.fn(),
            isStale: jest.fn().mockReturnValue(false),
          },
          pastEventsContext: {
            pastEvents: [],
            loading: false,
            refreshPastEvents: jest.fn(),
            isStale: jest.fn().mockReturnValue(false),
          },
        },
      });

      expect(getByText('templates.noTemplatesAvailable')).toBeTruthy();
      expect(getByText('templates.selectionEmptyDescription')).toBeTruthy();
    });

    it('should navigate back when back button pressed in selection mode empty state', () => {
      const { getByText } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          templatesContext: {
            templates: [],
            loading: false,
            error: null,
            refreshTemplates: jest.fn(),
            addTemplate: jest.fn(),
            editTemplate: jest.fn(),
            removeTemplate: jest.fn(),
            isStale: jest.fn().mockReturnValue(false),
          },
          pastEventsContext: {
            pastEvents: [],
            loading: false,
            refreshPastEvents: jest.fn(),
            isStale: jest.fn().mockReturnValue(false),
          },
        },
      });

      const backButton = getByText('common.goBack');
      fireEvent.press(backButton);

      expect(router.back).toHaveBeenCalled();
    });

    it('should navigate to create template when create button pressed in selection mode', () => {
      const { getByText } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          templatesContext: {
            templates: [],
            loading: false,
            error: null,
            refreshTemplates: jest.fn(),
            addTemplate: jest.fn(),
            editTemplate: jest.fn(),
            removeTemplate: jest.fn(),
            isStale: jest.fn().mockReturnValue(false),
          },
          pastEventsContext: {
            pastEvents: [],
            loading: false,
            refreshPastEvents: jest.fn(),
            isStale: jest.fn().mockReturnValue(false),
          },
        },
      });

      const createButton = getByText('templates.createNewTemplate');
      fireEvent.press(createButton);

      expect(router.push).toHaveBeenCalledWith(expect.stringContaining('create-template'));
    });
  });

  describe('Navigation', () => {
    it('should navigate to edit template when template pressed in management mode', () => {
      const mockTemplate = {
        $id: 'template-1',
        name: 'Test Template',
        description: 'Description',
        organization_id: 'org-1',
        event_data: { title: 'Event 1' },
        $createdAt: '2025-01-01',
        $updatedAt: '2025-01-01',
      };

      const { getByLabelText } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          templatesContext: {
            templates: [mockTemplate],
            loading: false,
            error: null,
            refreshTemplates: jest.fn(),
            addTemplate: jest.fn(),
            editTemplate: jest.fn(),
            removeTemplate: jest.fn(),
            isStale: jest.fn().mockReturnValue(false),
          },
          pastEventsContext: {
            pastEvents: [],
            loading: false,
            refreshPastEvents: jest.fn(),
            isStale: jest.fn().mockReturnValue(false),
          },
        },
      });

      const templateCard = getByLabelText('Template: Test Template, Description');
      fireEvent.press(templateCard);

      expect(router.push).toHaveBeenCalledWith({
        pathname: '/edit-template/[id]',
        params: { id: 'template-1' },
      });
    });

    it('should navigate to create event when template pressed in selection mode', () => {
      useLocalSearchParams.mockReturnValue({ mode: 'selection' });

      const mockTemplate = {
        $id: 'template-1',
        name: 'Test Template',
        description: 'Description',
        organization_id: 'org-1',
        event_data: { title: 'Event 1' },
        $createdAt: '2025-01-01',
        $updatedAt: '2025-01-01',
      };

      const { getByLabelText } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          templatesContext: {
            templates: [mockTemplate],
            loading: false,
            error: null,
            refreshTemplates: jest.fn(),
            addTemplate: jest.fn(),
            editTemplate: jest.fn(),
            removeTemplate: jest.fn(),
            isStale: jest.fn().mockReturnValue(false),
          },
          pastEventsContext: {
            pastEvents: [],
            loading: false,
            refreshPastEvents: jest.fn(),
            isStale: jest.fn().mockReturnValue(false),
          },
        },
      });

      const templateCard = getByLabelText('Template: Test Template, Description');
      fireEvent.press(templateCard);

      expect(router.push).toHaveBeenCalledWith({
        pathname: expect.stringContaining('create-event'),
        params: {
          templateId: 'template-1',
          source: 'template',
        },
      });
    });

    it('should navigate to create template when create button pressed', () => {
      const mockTemplates = [
        {
          $id: 'template-1',
          name: 'Test Template 1',
          description: 'Description 1',
          organization_id: 'org-1',
          event_data: { title: 'Event 1' },
          $createdAt: '2025-01-01',
          $updatedAt: '2025-01-01',
        },
      ];

      const { getByLabelText } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          templatesContext: {
            templates: mockTemplates,
            loading: false,
            error: null,
            refreshTemplates: jest.fn(),
            addTemplate: jest.fn(),
            editTemplate: jest.fn(),
            removeTemplate: jest.fn(),
            isStale: jest.fn().mockReturnValue(false),
          },
          pastEventsContext: {
            pastEvents: [],
            loading: false,
            refreshPastEvents: jest.fn(),
            isStale: jest.fn().mockReturnValue(false),
          },
        },
      });

      const createButton = getByLabelText('Create new template');
      fireEvent.press(createButton);

      expect(router.push).toHaveBeenCalledWith(expect.stringContaining('create-template'));
    });
  });

  describe('Refresh', () => {
    it('should call retry when error retry button pressed', () => {
      const mockRefreshTemplates = jest.fn();

      const { getByText } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          templatesContext: {
            templates: [],
            loading: false,
            error: 'Failed to load templates',
            refreshTemplates: mockRefreshTemplates,
            addTemplate: jest.fn(),
            editTemplate: jest.fn(),
            removeTemplate: jest.fn(),
            isStale: jest.fn().mockReturnValue(false),
          },
          pastEventsContext: {
            pastEvents: [],
            loading: false,
            refreshPastEvents: jest.fn(),
            isStale: jest.fn().mockReturnValue(false),
          },
        },
      });

      const retryButton = getByText('common.tryAgain');
      fireEvent.press(retryButton);

      expect(mockRefreshTemplates).toHaveBeenCalled();
    });
  });
});
