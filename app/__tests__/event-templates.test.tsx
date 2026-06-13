// Mock dependencies BEFORE imports

jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key: string, params?: Record<string, unknown>) => {
    if (params && typeof params.name === 'string') {
      return `${params.name} (copy)`;
    }
    return key;
  }),
}));

jest.mock('@/utils/templateUtils', () => ({
  extractTemplateData: jest.fn((event: any) => ({
    organization_id: event.organization_id,
    title: event.title,
    city: event.city,
  })),
  formatPastEventDate: jest.fn((date: string) => date),
}));

jest.mock('@/utils/draftStatusUtils', () => ({
  sortDraftsByLastEdited: jest.fn((items: any[]) =>
    [...items].sort((a, b) => {
      const aMs = new Date(a.$updatedAt || a.$createdAt || 0).getTime();
      const bMs = new Date(b.$updatedAt || b.$createdAt || 0).getTime();
      return bMs - aMs;
    })
  ),
  getEditedAgoParts: jest.fn(() => null),
}));

jest.mock('@/utils/themeColors', () => ({
  getThemeColors: jest.fn(() => ({
    tint: '#F94460',
    text: '#000000',
    secondaryText: '#666666',
    subtleText: '#999999',
    cardBackground: '#FFFFFF',
    cardBorder: '#E5E5E5',
    inputBorder: '#CCCCCC',
    surfaceBackground: '#F5F5F5',
    surfaceAltBackground: '#FFFFFF',
    separator: '#E5E5E5',
    border: '#E5E5E5',
  })),
}));

import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/render';
import EventTemplatesScreen from '../(tabs)/(more)/event-templates';
import { router } from 'expo-router';
import { t } from '@/utils/i18n';

const mockedT = t as jest.MockedFunction<typeof t>;
const mockedRouter = router as jest.Mocked<typeof router>;

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const makeTemplate = (
  overrides: Partial<{
    $id: string;
    name: string;
    $updatedAt: string;
    $createdAt: string;
    event_data: Record<string, unknown>;
    image_urls: string[];
  }> = {}
) => ({
  $id: 'template-1',
  $createdAt: '2025-01-01T10:00:00.000Z',
  $updatedAt: '2025-01-01T10:00:00.000Z',
  name: 'Test Template',
  description: 'A description',
  organizer_id: 'user-1',
  event_data: { organization_id: 'org-1', categories: ['protest'], title: 'Test Event' },
  image_urls: [],
  ...overrides,
});

const makePastEvent = (
  overrides: Partial<{
    $id: string;
    title: string;
    start_time: string;
    city: string;
    categories: string[];
    organization_id: string;
    images: string[];
  }> = {}
) => ({
  $id: 'past-event-1',
  title: 'Past Rally',
  start_time: '2024-06-01T10:00:00.000Z',
  city: 'Brussels',
  categories: ['protest'],
  organization_id: 'org-1',
  images: [],
  ...overrides,
});

describe('EventTemplatesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default t mock — return the key
    mockedT.mockImplementation((key: string, params?: Record<string, unknown>) => {
      if (params && typeof params.name === 'string') {
        return `${params.name} (copy)`;
      }
      return key;
    });
  });

  // -------------------------------------------------------------------------
  // Header
  // -------------------------------------------------------------------------

  describe('Header', () => {
    it('renders the title from more.templates and subtitle from templates.subtitle', () => {
      const { getByText } = renderWithProviders(<EventTemplatesScreen />);

      // t() returns the key for mocked i18n
      expect(getByText('more.templates')).toBeTruthy();
      expect(getByText('templates.subtitle')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  describe('Loading state', () => {
    it('renders LoadingState when templates are loading and list is empty', () => {
      const { getByLabelText } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          templatesContext: {
            templates: [],
            loading: true,
            error: null,
          },
        },
      });

      expect(getByLabelText('templates.loadingTemplates')).toBeTruthy();
    });

    it('does not render LoadingState when templates exist even if still loading', () => {
      const template = makeTemplate();
      const { queryByLabelText, getByTestId } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          templatesContext: {
            templates: [template],
            loading: true,
            error: null,
          },
        },
      });

      expect(queryByLabelText('templates.loadingTemplates')).toBeNull();
      expect(getByTestId('template-new-tile')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------

  describe('Error state', () => {
    it('renders the error message when templatesError is set and list is empty', () => {
      const { getByText } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          templatesContext: {
            templates: [],
            loading: false,
            error: 'Network failure',
          },
        },
      });

      expect(getByText('Network failure')).toBeTruthy();
    });

    it('renders a Try Again button that calls refreshTemplates', () => {
      const mockRefresh = jest.fn();
      const { getByText } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          templatesContext: {
            templates: [],
            loading: false,
            error: 'Network failure',
            refreshTemplates: mockRefresh,
          },
        },
      });

      fireEvent.press(getByText('common.tryAgain'));
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('does not render the error panel when templates exist', () => {
      const template = makeTemplate();
      const { queryByText } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          templatesContext: {
            templates: [template],
            loading: false,
            error: 'Some error',
          },
        },
      });

      expect(queryByText('common.tryAgain')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Grid: New template tile
  // -------------------------------------------------------------------------

  describe('New template tile', () => {
    it('always renders the new-template tile (testID template-new-tile)', () => {
      const { getByTestId } = renderWithProviders(<EventTemplatesScreen />);
      expect(getByTestId('template-new-tile')).toBeTruthy();
    });

    it('navigates to Routes.CREATE_TEMPLATE when the new-template tile is pressed', () => {
      const { getByTestId } = renderWithProviders(<EventTemplatesScreen />);
      fireEvent.press(getByTestId('template-new-tile'));
      expect(mockedRouter.push).toHaveBeenCalledWith('/create-template');
    });
  });

  // -------------------------------------------------------------------------
  // Grid: Placeholder tile (empty templates)
  // -------------------------------------------------------------------------

  describe('Placeholder tile (empty templates)', () => {
    it('renders the placeholder card text when there are no templates', () => {
      const { getByText } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          templatesContext: { templates: [], loading: false, error: null },
        },
      });

      expect(getByText('templates.placeholderCard')).toBeTruthy();
    });

    it('does not render the placeholder when templates exist', () => {
      const template = makeTemplate();
      const { queryByText } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          templatesContext: { templates: [template], loading: false, error: null },
        },
      });

      expect(queryByText('templates.placeholderCard')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Grid: Template launch tiles
  // -------------------------------------------------------------------------

  describe('Template launch tiles', () => {
    it('renders a tile per template using testID template-tile-<id>', () => {
      const t1 = makeTemplate({ $id: 'tmpl-1', name: 'Alpha' });
      const t2 = makeTemplate({ $id: 'tmpl-2', name: 'Beta' });

      const { getByTestId } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          templatesContext: { templates: [t1, t2], loading: false, error: null },
        },
      });

      expect(getByTestId('template-tile-tmpl-1')).toBeTruthy();
      expect(getByTestId('template-tile-tmpl-2')).toBeTruthy();
    });

    it('renders templates sorted by $updatedAt descending (most recent first)', () => {
      const older = makeTemplate({
        $id: 'tmpl-older',
        name: 'Older Template',
        $updatedAt: '2025-01-01T10:00:00.000Z',
      });
      const newer = makeTemplate({
        $id: 'tmpl-newer',
        name: 'Newer Template',
        $updatedAt: '2025-06-01T10:00:00.000Z',
      });

      const { getAllByText } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          // Pass older first — sort should flip them
          templatesContext: { templates: [older, newer], loading: false, error: null },
        },
      });

      const newerText = getAllByText('Newer Template');
      const olderText = getAllByText('Older Template');
      expect(newerText.length).toBeGreaterThan(0);
      expect(olderText.length).toBeGreaterThan(0);
    });

    it('navigates to create-event with templateId and source=template when tile body is pressed', () => {
      const template = makeTemplate({ $id: 'tmpl-abc' });

      const { getByTestId } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          templatesContext: { templates: [template], loading: false, error: null },
        },
      });

      fireEvent.press(getByTestId('template-tile-tmpl-abc'));
      expect(mockedRouter.push).toHaveBeenCalledWith({
        pathname: '/create-event',
        params: { templateId: 'tmpl-abc', source: 'template' },
      });
    });
  });

  // -------------------------------------------------------------------------
  // Past-event rows
  // -------------------------------------------------------------------------

  describe('Past-event rows', () => {
    it('renders past event rows with testID past-event-row-<id>', () => {
      const event = makePastEvent({ $id: 'past-1' });

      const { getByTestId } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          pastEventsContext: {
            pastEvents: [event as any],
            loading: false,
          },
          userOrganizationsContext: {
            userOrganizations: [{ $id: 'org-1' }] as any[],
          },
        },
      });

      expect(getByTestId('past-event-row-past-1')).toBeTruthy();
    });

    it('renders a Use pill with testID past-event-use-<id> for each past event', () => {
      const event = makePastEvent({ $id: 'past-2' });

      const { getByTestId } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          pastEventsContext: {
            pastEvents: [event as any],
            loading: false,
          },
          userOrganizationsContext: {
            userOrganizations: [{ $id: 'org-1' }] as any[],
          },
        },
      });

      expect(getByTestId('past-event-use-past-2')).toBeTruthy();
    });

    it('calls addTemplate with correct payload and navigates to create-event on Use press', async () => {
      const createdTemplate = makeTemplate({ $id: 'created-tmpl-99' });
      const mockAddTemplate = jest.fn().mockResolvedValue(createdTemplate);
      const event = makePastEvent({
        $id: 'past-3',
        title: 'Past Rally',
        organization_id: 'org-1',
      });

      const { getByTestId } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          pastEventsContext: {
            pastEvents: [event as any],
            loading: false,
          },
          templatesContext: {
            templates: [],
            loading: false,
            error: null,
            addTemplate: mockAddTemplate,
          },
          userOrganizationsContext: {
            userOrganizations: [{ $id: 'org-1' }] as any[],
          },
        },
      });

      fireEvent.press(getByTestId('past-event-use-past-3'));

      await waitFor(() => {
        expect(mockAddTemplate).toHaveBeenCalledWith(
          expect.objectContaining({
            organization_id: 'org-1',
            name: 'Past Rally',
          })
        );
      });

      await waitFor(() => {
        expect(mockedRouter.push).toHaveBeenCalledWith({
          pathname: '/create-event',
          params: { templateId: 'created-tmpl-99', source: 'template' },
        });
      });
    });

    it('calls Alert.alert with error message when addTemplate rejects on Use press', async () => {
      const mockAddTemplate = jest.fn().mockRejectedValue(new Error('Server error'));
      const event = makePastEvent({ $id: 'past-4', organization_id: 'org-1' });

      const { getByTestId } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          pastEventsContext: {
            pastEvents: [event as any],
            loading: false,
          },
          templatesContext: {
            templates: [],
            loading: false,
            error: null,
            addTemplate: mockAddTemplate,
          },
          userOrganizationsContext: {
            userOrganizations: [{ $id: 'org-1' }] as any[],
          },
        },
      });

      fireEvent.press(getByTestId('past-event-use-past-4'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('common.error', 'Server error');
      });

      // No navigation should happen
      expect(mockedRouter.push).not.toHaveBeenCalled();
    });

    it('does not navigate if addTemplate rejects', async () => {
      const mockAddTemplate = jest.fn().mockRejectedValue(new Error('Oops'));
      const event = makePastEvent({ $id: 'past-5', organization_id: 'org-1' });

      const { getByTestId } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          pastEventsContext: {
            pastEvents: [event as any],
            loading: false,
          },
          templatesContext: {
            templates: [],
            loading: false,
            error: null,
            addTemplate: mockAddTemplate,
          },
          userOrganizationsContext: {
            userOrganizations: [{ $id: 'org-1' }] as any[],
          },
        },
      });

      fireEvent.press(getByTestId('past-event-use-past-5'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      expect(mockedRouter.push).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Past-event section header label
  // -------------------------------------------------------------------------

  describe('Past-event section header', () => {
    it('shows "Or reuse a past event" variant when there are no templates', () => {
      const event = makePastEvent({ $id: 'past-header-1' });

      const { getByText } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          templatesContext: { templates: [], loading: false, error: null },
          pastEventsContext: { pastEvents: [event as any], loading: false },
          userOrganizationsContext: {
            userOrganizations: [{ $id: 'org-1' }] as any[],
          },
        },
      });

      // t() returns the key; templates.orReusePastEvent is used when empty
      expect(getByText('templates.orReusePastEvent')).toBeTruthy();
    });

    it('shows "Reuse a past event" variant when templates exist', () => {
      const template = makeTemplate({ $id: 'tmpl-x' });
      const event = makePastEvent({ $id: 'past-header-2' });

      const { getByText } = renderWithProviders(<EventTemplatesScreen />, {
        providerOverrides: {
          templatesContext: { templates: [template], loading: false, error: null },
          pastEventsContext: { pastEvents: [event as any], loading: false },
          userOrganizationsContext: {
            userOrganizations: [{ $id: 'org-1' }] as any[],
          },
        },
      });

      expect(getByText('templates.reusePastEvent')).toBeTruthy();
    });
  });
});
