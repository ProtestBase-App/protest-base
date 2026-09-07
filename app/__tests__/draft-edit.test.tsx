// Mock dependencies BEFORE imports
jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key) => key),
}));

jest.mock('@/services/event.service', () => ({
  getDraftEventPreview: jest.fn(),
  patchEvent: jest.fn(),
  publishDraft: jest.fn(),
  deleteEvent: jest.fn(),
  EventIncompleteError: class EventIncompleteError extends Error {
    fields: string[];
    constructor(fields: string[] = []) {
      super('incomplete');
      this.name = 'EventIncompleteError';
      this.fields = fields;
    }
  },
  EventNotDraftError: class EventNotDraftError extends Error {
    code = 'EVENT_NOT_DRAFT';
    constructor() {
      super('already published');
      this.name = 'EventNotDraftError';
    }
  },
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

// Use the REAL readiness util so the publish-gating logic is genuinely exercised.

jest.mock('@/utils/themeColors', () => ({
  getThemeColors: jest.fn(() => ({
    tint: '#F94460',
    icon: '#000000',
    destructive: '#FF3B30',
    subtleText: '#888888',
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
import {
  renderWithProviders,
  createMockEvent,
  createMockUser,
  fireEvent,
  act,
} from '@/test-utils/render';
import DraftEdit from '../draft-edit/[id]';

const { useLocalSearchParams } = require('expo-router');
const {
  getDraftEventPreview,
  patchEvent,
  publishDraft,
  deleteEvent,
  DuplicateEventError,
} = require('@/services/event.service');

const loggedInGlobal = {
  user: createMockUser(),
  isLogged: true,
  loading: false,
  userLanguage: 'en',
};

const orgOverrides = { organizationsContext: { dropdownItems: [] } };

describe('DraftEdit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLocalSearchParams.mockReturnValue({ id: 'draft-1' });
  });

  it('loads the draft via the preview endpoint', async () => {
    getDraftEventPreview.mockResolvedValue(createMockEvent({ $id: 'draft-1' }));

    const { findByText } = renderWithProviders(<DraftEdit />, {
      providerOverrides: { globalContext: loggedInGlobal, ...orgOverrides },
    });

    await findByText('drafts.editTitle');
    expect(getDraftEventPreview).toHaveBeenCalledWith('draft-1');
  });

  it('renders an incomplete draft with an empty start_time without crashing', async () => {
    getDraftEventPreview.mockResolvedValue(
      createMockEvent({
        $id: 'draft-1',
        start_time: '',
        description: '',
        categories: [],
        city: '',
        street_address: '',
      })
    );

    const { findByText } = renderWithProviders(<DraftEdit />, {
      providerOverrides: { globalContext: loggedInGlobal, ...orgOverrides },
    });

    expect(await findByText('drafts.editTitle')).toBeTruthy();
  });

  it('blocks publishing an incomplete draft and never calls the publish API', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    getDraftEventPreview.mockResolvedValue(
      createMockEvent({
        $id: 'draft-1',
        start_time: '',
        description: '',
        categories: [],
        city: '',
        street_address: '',
      })
    );

    const { findByTestId } = renderWithProviders(<DraftEdit />, {
      providerOverrides: { globalContext: loggedInGlobal, ...orgOverrides },
    });

    const publishButton = await findByTestId('btn-draft-publish');
    fireEvent.press(publishButton);

    expect(publishDraft).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('drafts.publishIssuesTitle', expect.any(String));

    alertSpy.mockRestore();
  });

  it('deletes the draft and shows a success message after confirming', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    getDraftEventPreview.mockResolvedValue(createMockEvent({ $id: 'draft-1' }));

    const { findByTestId } = renderWithProviders(<DraftEdit />, {
      providerOverrides: { globalContext: loggedInGlobal, ...orgOverrides },
    });

    // Open the delete confirmation dialog.
    fireEvent.press(await findByTestId('btn-draft-delete'));

    // Invoke the destructive "delete" button from the confirmation alert.
    const confirmCall = alertSpy.mock.calls.find((c) => c[0] === 'drafts.deleteConfirmTitle');
    const buttons = (confirmCall?.[2] ?? []) as {
      style?: string;
      onPress?: () => void | Promise<void>;
    }[];
    const destructive = buttons.find((b) => b.style === 'destructive');
    await act(async () => {
      await destructive?.onPress?.();
    });

    expect(deleteEvent).toHaveBeenCalledWith('draft-1');
    expect(alertSpy).toHaveBeenCalledWith('common.success', 'drafts.deleted');

    alertSpy.mockRestore();
  });

  describe('Unsaved changes guard', () => {
    it('prompts before closing when the draft has unsaved edits', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const { router } = require('expo-router');
      const draft = createMockEvent({ $id: 'draft-1' });
      getDraftEventPreview.mockResolvedValue(draft);

      const { findByDisplayValue, getByTestId } = renderWithProviders(<DraftEdit />, {
        providerOverrides: { globalContext: loggedInGlobal, ...orgOverrides },
      });

      const titleInput = await findByDisplayValue(draft.title);
      fireEvent.changeText(titleInput, 'A different title');
      fireEvent.press(getByTestId('btn-draft-close'));

      expect(alertSpy).toHaveBeenCalledWith(
        'eventEdit.discardTitle',
        'eventEdit.discardMessage',
        expect.any(Array)
      );
      // Still on the editor until the user confirms the discard.
      expect(router.back).not.toHaveBeenCalled();

      const discardCall = alertSpy.mock.calls.find((c) => c[0] === 'eventEdit.discardTitle');
      const buttons = (discardCall?.[2] ?? []) as {
        style?: string;
        onPress?: () => void;
      }[];
      buttons.find((b) => b.style === 'destructive')?.onPress?.();
      expect(router.back).toHaveBeenCalled();

      alertSpy.mockRestore();
    });

    it('closes immediately without a prompt when nothing was edited', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const { router } = require('expo-router');
      const draft = createMockEvent({ $id: 'draft-1' });
      getDraftEventPreview.mockResolvedValue(draft);

      const { findByDisplayValue, getByTestId } = renderWithProviders(<DraftEdit />, {
        providerOverrides: { globalContext: loggedInGlobal, ...orgOverrides },
      });

      await findByDisplayValue(draft.title);
      fireEvent.press(getByTestId('btn-draft-close'));

      expect(alertSpy).not.toHaveBeenCalled();
      expect(router.back).toHaveBeenCalled();

      alertSpy.mockRestore();
    });

    // Drafts are incomplete by definition, and EventForm's address/postal-code
    // effects derive fields on mount. If any of them wrote to the form after the
    // baseline snapshot, every user closing an untouched incomplete draft would
    // get a spurious discard prompt — which is worse than no guard at all.
    it('does not prompt on an untouched INCOMPLETE draft', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const { router } = require('expo-router');
      const draft = createMockEvent({
        $id: 'draft-1',
        start_time: '',
        description: '',
        categories: [],
        city: '',
        street_address: '',
        postal_code: undefined,
      });
      getDraftEventPreview.mockResolvedValue(draft);

      const { findByDisplayValue, getByTestId } = renderWithProviders(<DraftEdit />, {
        providerOverrides: { globalContext: loggedInGlobal, ...orgOverrides },
      });

      await findByDisplayValue(draft.title);
      fireEvent.press(getByTestId('btn-draft-close'));

      expect(alertSpy).not.toHaveBeenCalled();
      expect(router.back).toHaveBeenCalled();

      alertSpy.mockRestore();
    });
  });

  it('redirects to the more tab when not logged in', () => {
    getDraftEventPreview.mockResolvedValue(createMockEvent({ $id: 'draft-1' }));

    const { getByText } = renderWithProviders(<DraftEdit />, {
      providerOverrides: {
        globalContext: { ...loggedInGlobal, user: null, isLogged: false },
      },
    });

    expect(getByText(/Redirect to.*more/)).toBeTruthy();
  });

  it('extracts the draft id from an array url parameter', () => {
    useLocalSearchParams.mockReturnValue({ id: ['draft-42'] });
    getDraftEventPreview.mockResolvedValue(createMockEvent({ $id: 'draft-42' }));

    renderWithProviders(<DraftEdit />, {
      providerOverrides: { globalContext: loggedInGlobal, ...orgOverrides },
    });

    expect(getDraftEventPreview).toHaveBeenCalledWith('draft-42');
  });
  // The backend's duplicate guard in block mode. This screen SAVES then
  // PUBLISHES, so the retry must re-send only the publish — the patch already
  // committed, and re-running it would be a redundant write.
  describe('duplicate-event guard', () => {
    const duplicate = {
      id: 'dup-1',
      title: 'Existing March',
      start_time: '2099-01-02T10:00:00.000Z',
      city: 'Brussels',
      status: 'active',
      organization_id: 'org-1',
      relationship: 'own',
      reason: 'content',
      strength: 'strong',
    };

    const publishableDraft = () =>
      createMockEvent({
        $id: 'draft-1',
        description: 'A long enough description',
        categories: ['Protest'],
        city: 'Brussels',
        street_address: 'Rue de la Loi 1',
      });

    const renderAndPublish = async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      getDraftEventPreview.mockResolvedValue(publishableDraft());
      patchEvent.mockResolvedValue(publishableDraft());

      const utils = renderWithProviders(<DraftEdit />, {
        providerOverrides: { globalContext: loggedInGlobal, ...orgOverrides },
      });

      // Await the load OUTSIDE act (the screen shows the loader until the
      // preview resolves), then press inside it.
      const publishButton = await utils.findByTestId('btn-draft-publish');
      await act(async () => {
        fireEvent.press(publishButton);
      });

      return { ...utils, alertSpy };
    };

    it('shows the matches and does not report the draft as published', async () => {
      publishDraft.mockRejectedValue(new DuplicateEventError('dup', [duplicate], true));

      const { findByText, alertSpy } = await renderAndPublish();

      expect(await findByText('duplicates.publishTitle')).toBeTruthy();
      expect(await findByText('Existing March')).toBeTruthy();
      // The old "any 409 means already published" mapping would have fired this.
      expect(alertSpy).not.toHaveBeenCalledWith('common.success', expect.anything());

      alertSpy.mockRestore();
    });

    it('re-sends only the publish on "Publish anyway" — never the patch again', async () => {
      publishDraft.mockRejectedValueOnce(new DuplicateEventError('dup', [duplicate], true));

      const { findByText, alertSpy } = await renderAndPublish();

      expect(patchEvent).toHaveBeenCalledTimes(1);

      publishDraft.mockResolvedValueOnce({ $id: 'draft-1', status: 'active' });
      await act(async () => {
        fireEvent.press(await findByText('duplicates.publishAnyway'));
      });

      expect(publishDraft).toHaveBeenCalledTimes(2);
      expect(publishDraft.mock.calls[1][1]).toMatchObject({ duplicateOverride: true });
      // The edits were already committed by the first attempt.
      expect(patchEvent).toHaveBeenCalledTimes(1);
      expect(alertSpy).toHaveBeenCalledWith('common.success', 'drafts.published');

      alertSpy.mockRestore();
    });
  });
});
