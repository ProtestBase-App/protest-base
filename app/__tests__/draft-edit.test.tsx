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
const { getDraftEventPreview, publishDraft, deleteEvent } = require('@/services/event.service');

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
});
