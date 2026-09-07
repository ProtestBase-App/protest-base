// Mock dependencies BEFORE imports
jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key) => key),
}));

jest.mock('@/services/event.service', () => ({
  createEventBackend: jest.fn(),
  createDraftEvent: jest.fn(),
  // The screen branches on `instanceof DuplicateEventError`; without it in this
  // factory the import is undefined and `instanceof` throws a TypeError.
  DuplicateEventError: class DuplicateEventError extends Error {
    code = 'DUPLICATE_EVENT';
    duplicates: unknown[];
    canOverride: boolean;
    constructor(message = 'duplicate', duplicates: unknown[] = [], canOverride = true) {
      super(message);
      this.name = 'DuplicateEventError';
      this.duplicates = duplicates;
      this.canOverride = canOverride;
    }
  },
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
import { Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
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
  // The backend's duplicate guard in block mode: create is refused with 409
  // DUPLICATE_EVENT before anything is geocoded or uploaded, so "Create anyway"
  // simply re-sends the same form (images included) with the override.
  describe('duplicate-event guard', () => {
    const {
      DuplicateEventError,
      createEventBackend,
      createDraftEvent,
    } = require('@/services/event.service');

    const duplicate = {
      id: 'dup-1',
      title: 'Existing March',
      start_time: '2099-01-02T10:00:00.000Z',
      city: 'Brussels',
      status: 'active',
      organization_id: 'org-1',
      relationship: 'other_org',
      reason: 'fuzzy',
      strength: 'weak',
      similarity: 0.79,
    };

    const filledDraft = {
      organization_id: 'org-1',
      title: 'Climate March',
      description: 'A march for the climate',
      // A picked file, not a URL: the refused create uploaded nothing, so the
      // override retry has to carry the same file part again.
      images: [{ uri: 'file:///a.jpg', mimeType: 'image/jpeg', fileName: 'a.jpg' }],
      street_address: 'Rue de la Loi 1',
      city: 'Brussels',
      region: '',
      country: 'belgium',
      start_time: '2099-01-02T10:00:00.000Z',
      end_time: '',
      organizer_name: 'Test Org',
      website_url: '',
      categories: 'Protest',
      disclaimer: '',
      postal_code: 1000,
      co_organizers: [],
      help_needed: false,
      help_description: '',
      geocod_lat: null,
      geocod_lng: null,
    };

    const providerOverrides = {
      globalContext: {
        user: mockUser,
        isLogged: true,
        loading: false,
        userLanguage: 'en',
        eventsCache: {},
        refetchEvents: jest.fn(),
        refreshUserEventCounts: jest.fn(),
        upsertEventInCache: jest.fn(),
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
    };

    /**
     * Renders the screen with a complete form by resuming the local autosave —
     * far less brittle than driving every field through the UI, and it is the
     * same FormState the submit handler reads either way.
     */
    const renderWithFilledForm = async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const { getEventDraft } = require('@/services/localStorageService');
      getEventDraft.mockResolvedValue({ formData: filledDraft });

      const utils = renderWithProviders(<CreateEventModal />, { providerOverrides });

      // The resume prompt fires on mount; take the "resume" branch.
      await waitFor(() =>
        expect(alertSpy.mock.calls.some((c) => c[0] === 'draft.resumeTitle')).toBe(true)
      );
      const resume = alertSpy.mock.calls.find((c) => c[0] === 'draft.resumeTitle');
      const buttons = (resume?.[2] ?? []) as { text?: string; onPress?: () => void }[];
      await act(async () => {
        buttons.find((b) => b.text === 'draft.resumeDraft')?.onPress?.();
      });

      return { ...utils, alertSpy };
    };

    const submit = async (getByTestId: (id: string) => any) => {
      await act(async () => {
        fireEvent.press(getByTestId('btn-create-event-submit'));
      });
    };

    it('shows the matches instead of a bare error alert', async () => {
      createEventBackend.mockRejectedValue(new DuplicateEventError('dup', [duplicate], true));

      const { getByTestId, findByText, alertSpy } = await renderWithFilledForm();
      alertSpy.mockClear();
      await submit(getByTestId);

      expect(await findByText('duplicates.createTitle')).toBeTruthy();
      expect(await findByText('Existing March')).toBeTruthy();
      expect(await findByText('duplicates.relationshipOtherOrg')).toBeTruthy();
      // The generic error alert must NOT fire for a duplicate.
      expect(alertSpy).not.toHaveBeenCalledWith('common.error', expect.anything());

      alertSpy.mockRestore();
    });

    it('re-sends the same submission with duplicate_override on "Create anyway"', async () => {
      createEventBackend.mockRejectedValueOnce(new DuplicateEventError('dup', [duplicate], true));

      const { getByTestId, findByText, alertSpy } = await renderWithFilledForm();
      await submit(getByTestId);

      createEventBackend.mockResolvedValueOnce({ $id: 'evt-new', title: 'Climate March' });
      await act(async () => {
        fireEvent.press(await findByText('duplicates.createAnyway'));
      });

      expect(createEventBackend).toHaveBeenCalledTimes(2);
      const [firstPayload, firstOptions] = createEventBackend.mock.calls[0];
      const [secondPayload, secondOptions] = createEventBackend.mock.calls[1];
      expect(firstOptions).toMatchObject({ duplicateOverride: false });
      expect(secondOptions).toMatchObject({ duplicateOverride: true });
      // The identical submission, re-sent — nothing was uploaded by the refused
      // one, so the picked image file has to go along again.
      expect(secondPayload).toEqual(firstPayload);
      expect(secondPayload.images).toEqual([
        { uri: 'file:///a.jpg', mimeType: 'image/jpeg', fileName: 'a.jpg' },
      ]);

      alertSpy.mockRestore();
    });

    it('does not retry when the organizer backs out', async () => {
      createEventBackend.mockRejectedValue(new DuplicateEventError('dup', [duplicate], true));

      const { getByTestId, findByText, queryByText, alertSpy } = await renderWithFilledForm();
      await submit(getByTestId);

      await act(async () => {
        fireEvent.press(await findByText('common.goBack'));
      });

      expect(createEventBackend).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(queryByText('duplicates.createTitle')).toBeNull());

      alertSpy.mockRestore();
    });

    // "Save as draft" runs the same guard (it is a create). The prompt records
    // WHICH button was pressed, so the override must go back to createDraftEvent
    // — routing it to createEventBackend would publish an event the organizer
    // only meant to save.
    it('re-sends a refused DRAFT save through createDraftEvent, not the event create', async () => {
      createDraftEvent.mockRejectedValueOnce(new DuplicateEventError('dup', [duplicate], true));

      const { getByTestId, findByText, alertSpy } = await renderWithFilledForm();
      await act(async () => {
        fireEvent.press(getByTestId('btn-create-event-draft'));
      });

      expect(await findByText('duplicates.createTitle')).toBeTruthy();

      createDraftEvent.mockResolvedValueOnce({ $id: 'draft-new' });
      await act(async () => {
        fireEvent.press(await findByText('duplicates.createAnyway'));
      });

      expect(createDraftEvent).toHaveBeenCalledTimes(2);
      expect(createDraftEvent.mock.calls[1][1]).toMatchObject({ duplicateOverride: true });
      expect(createEventBackend).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    });

    // Warn mode (production today): the event is created, with a note attached.
    it('appends the warning note to the success alert', async () => {
      createEventBackend.mockImplementation(async (_data: unknown, options: any) => {
        options.report.possibleDuplicates = [duplicate];
        return { $id: 'evt-new', title: 'Climate March' };
      });

      const { getByTestId, alertSpy } = await renderWithFilledForm();
      alertSpy.mockClear();
      await submit(getByTestId);

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith(
          'common.success',
          expect.stringContaining('duplicates.warningNote'),
          expect.any(Array)
        )
      );

      alertSpy.mockRestore();
    });

    // The "behaves exactly as today" clause: a plain 201 with no warnings.
    it('shows the unchanged success alert when there are no warnings', async () => {
      createEventBackend.mockResolvedValue({ $id: 'evt-new', title: 'Climate March' });

      const { getByTestId, alertSpy } = await renderWithFilledForm();
      alertSpy.mockClear();
      await submit(getByTestId);

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('common.success', 'alerts.eventCreated')
      );

      alertSpy.mockRestore();
    });
  });
});
