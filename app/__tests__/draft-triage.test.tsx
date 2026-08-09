// Mock dependencies BEFORE imports

jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key: string) => key),
}));

jest.mock('@/services/event.service', () => ({
  getDraftEventsForOrganizations: jest.fn(),
  publishDraft: jest.fn(),
  patchEvent: jest.fn(),
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
}));

jest.mock('@/utils/themeColors', () => ({
  getThemeColors: jest.fn(() => ({
    tint: '#F94460',
    text: '#000000',
    background: '#FAFAFA',
    secondaryText: '#666666',
    subtleText: '#999999',
    placeholder: '#AAAAAA',
    cardBackground: '#FFFFFF',
    cardBorder: '#E5E5E5',
    surfaceBackground: '#F5F5F5',
    surfaceAltBackground: '#ECECEC',
    badgeBg: '#F0F0F0',
    categoryBadgeBg: '#FDECEF',
    destructive: '#EF4444',
    warning: '#F59E0B',
    warningBg: 'rgba(245,158,11,0.15)',
    live: '#3DBE7B',
    liveBg: 'rgba(61,190,123,0.14)',
    liveText: '#2E9C63',
    modalBackdrop: '#F1F1F4',
    separator: '#E5E5E5',
    border: '#E5E5E5',
  })),
}));

jest.mock('@/utils/logger', () => ({
  logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders, createMockEvent, createMockUser } from '@/test-utils/render';
import DraftTriageScreen from '../draft-triage';

const {
  getDraftEventsForOrganizations,
  publishDraft,
  patchEvent,
  deleteEvent,
  EventNotDraftError,
} = require('@/services/event.service');

const providerOverrides = {
  globalContext: {
    user: createMockUser(),
    isLogged: true,
    loading: false,
    userLanguage: 'en',
    refetchEvents: jest.fn().mockResolvedValue(undefined),
    refreshUserEventCounts: jest.fn().mockResolvedValue(undefined),
  },
  userOrganizationsContext: {
    userOrganizations: [{ $id: 'org-1', name: 'Org One' }],
    hasOrganizations: true,
    hasSingleOrganization: true,
  },
};

const PAST = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

/** A past-dated draft: in the queue, and the reschedule variant of the card. */
function staleDraft(id: string, overrides: Record<string, unknown> = {}) {
  return createMockEvent({
    $id: id,
    title: `Stale ${id}`,
    description: 'Has a description',
    categories: ['Strike'],
    start_time: PAST,
    ...overrides,
  });
}

function queueOf(events: unknown[]) {
  getDraftEventsForOrganizations.mockResolvedValue({ events, total: events.length });
}

describe('DraftTriageScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    publishDraft.mockResolvedValue({ $id: 'x', status: 'active' });
    patchEvent.mockResolvedValue({});
    deleteEvent.mockResolvedValue(undefined);
  });

  it('renders the first card of the queue with its progress counter', async () => {
    queueOf([staleDraft('a'), staleDraft('b')]);

    const { findByTestId, getByText } = renderWithProviders(<DraftTriageScreen />, {
      providerOverrides,
    });

    expect(await findByTestId('triage-card-a')).toBeTruthy();
    expect(getByText('0 / 2')).toBeTruthy();
  });

  // Ready drafts need no decision and are one tap from the list, so padding the
  // deck with them would defeat the point of the queue.
  it('excludes ready drafts from the queue', async () => {
    const ready = createMockEvent({
      $id: 'ready',
      title: 'Ready',
      description: 'Complete',
      categories: ['Strike'],
      start_time: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    });
    queueOf([ready, staleDraft('a')]);

    const { findByTestId, queryByTestId } = renderWithProviders(<DraftTriageScreen />, {
      providerOverrides,
    });

    await findByTestId('triage-card-a');
    expect(queryByTestId('triage-card-ready')).toBeNull();
  });

  it('shows the reschedule shortcuts on a past-dated card', async () => {
    queueOf([staleDraft('a')]);

    const { findByTestId, getByTestId } = renderWithProviders(<DraftTriageScreen />, {
      providerOverrides,
    });

    await findByTestId('triage-card-a');
    expect(getByTestId('triage-pick-date')).toBeTruthy();
  });

  describe('publishing', () => {
    it('publishes and advances to the next card', async () => {
      queueOf([staleDraft('a'), staleDraft('b')]);

      const { findByTestId, getByTestId } = renderWithProviders(<DraftTriageScreen />, {
        providerOverrides,
      });

      await findByTestId('triage-card-a');
      await act(async () => {
        fireEvent.press(getByTestId('triage-publish'));
      });

      expect(publishDraft).toHaveBeenCalledWith('a');
      await waitFor(() => expect(getByTestId('triage-card-b')).toBeTruthy());
    });

    // The date has to be persisted BEFORE publishing, or the backend publishes
    // the stale past date straight into `past`.
    it('saves a rescheduled date before publishing', async () => {
      queueOf([staleDraft('a')]);

      const { findByTestId, getByTestId, UNSAFE_getAllByProps } = renderWithProviders(
        <DraftTriageScreen />,
        { providerOverrides }
      );

      await findByTestId('triage-card-a');
      // Tap the first weekday shortcut.
      const shortcut = UNSAFE_getAllByProps({ accessibilityRole: 'button' }).find(
        (node: { props: { testID?: string } }) =>
          node.props.testID?.startsWith('triage-reschedule-')
      );
      if (!shortcut) throw new Error('no reschedule shortcut rendered');
      await act(async () => {
        fireEvent.press(shortcut);
      });

      await act(async () => {
        fireEvent.press(getByTestId('triage-publish'));
      });

      expect(patchEvent).toHaveBeenCalledTimes(1);
      const [, payload] = patchEvent.mock.calls[0];
      expect(payload.start_time).toBeTruthy();
      expect(publishDraft).toHaveBeenCalledWith('a');
      // Publish must come after the patch resolves.
      expect(patchEvent.mock.invocationCallOrder[0]).toBeLessThan(
        publishDraft.mock.invocationCallOrder[0]
      );
    });

    it('advances silently when the draft was already published elsewhere', async () => {
      queueOf([staleDraft('a'), staleDraft('b')]);
      publishDraft.mockRejectedValue(new EventNotDraftError());

      const { findByTestId, getByTestId } = renderWithProviders(<DraftTriageScreen />, {
        providerOverrides,
      });

      await findByTestId('triage-card-a');
      await act(async () => {
        fireEvent.press(getByTestId('triage-publish'));
      });

      // No alert, no error on the card — just the next decision.
      await waitFor(() => expect(getByTestId('triage-card-b')).toBeTruthy());
    });

    it('keeps the card up and shows the error inline when publishing fails', async () => {
      queueOf([staleDraft('a')]);
      publishDraft.mockRejectedValue(new Error('Server exploded'));

      const { findByTestId, getByTestId, findByText } = renderWithProviders(<DraftTriageScreen />, {
        providerOverrides,
      });

      await findByTestId('triage-card-a');
      await act(async () => {
        fireEvent.press(getByTestId('triage-publish'));
      });

      expect(await findByText('Server exploded')).toBeTruthy();
      expect(getByTestId('triage-card-a')).toBeTruthy();
    });
  });

  // Fake timers are confined to this block. Installing them inline per test let
  // them leak into React Native Testing Library's auto-cleanup, which then hung
  // the following test in its afterEach hook rather than failing honestly.
  /**
   * Deliberately NO fake timers anywhere in this file. Installing them made
   * React Native Testing Library's auto-cleanup hang in its afterEach hook, and
   * a hook timeout poisons every subsequent test — one red test became a suite
   * that stalls. Both risky behaviours are reachable on real timers:
   *
   *  - nothing is sent while the window is open (assert the negative), and
   *  - unmount flushes the pending delete (no waiting required — the flush is
   *    synchronous on unmount).
   *
   * The one part that genuinely needs to travel through 5s of time — the timer
   * firing on its own — runs the same `flushPendingDelete` these cover, and the
   * queue semantics behind it are unit-tested in utils/__tests__/triageQueue.
   */
  describe('deferred delete', () => {
    it('removes the card but sends nothing while the undo window is open', async () => {
      queueOf([staleDraft('a'), staleDraft('b')]);

      const { findByTestId, getByTestId } = renderWithProviders(<DraftTriageScreen />, {
        providerOverrides,
      });

      await findByTestId('triage-card-a');
      await act(async () => {
        fireEvent.press(getByTestId('triage-delete'));
      });

      // The toast appearing means the decision was committed locally...
      await waitFor(() => expect(getByTestId('triage-undo-toast')).toBeTruthy());
      // ...while the DELETE has deliberately not been sent.
      expect(deleteEvent).not.toHaveBeenCalled();
      expect(getByTestId('triage-card-b')).toBeTruthy();
    });

    // A pending delete must never die with the screen.
    it('flushes a pending delete when the screen unmounts', async () => {
      queueOf([staleDraft('a'), staleDraft('b')]);

      const { findByTestId, getByTestId, unmount } = renderWithProviders(<DraftTriageScreen />, {
        providerOverrides,
      });

      await findByTestId('triage-card-a');
      await act(async () => {
        fireEvent.press(getByTestId('triage-delete'));
      });
      await waitFor(() => expect(getByTestId('triage-undo-toast')).toBeTruthy());
      expect(deleteEvent).not.toHaveBeenCalled();

      unmount();

      expect(deleteEvent).toHaveBeenCalledWith('a');
    });
  });

  // Real timers on purpose: the assertion is that undo lands INSIDE the window,
  // so there is no need to travel through it. (The reducer's own tests cover
  // reinsertion at the original index and the counter stepping back.)
  it('undo cancels the pending DELETE and puts the card back', async () => {
    queueOf([staleDraft('a'), staleDraft('b')]);

    const { findByTestId, getByTestId, queryByTestId } = renderWithProviders(
      <DraftTriageScreen />,
      { providerOverrides }
    );

    await findByTestId('triage-card-a');
    await act(async () => {
      fireEvent.press(getByTestId('triage-delete'));
    });
    await waitFor(() => expect(getByTestId('triage-card-b')).toBeTruthy());
    expect(getByTestId('triage-undo-toast')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('triage-undo-toast-action'));
    });

    expect(getByTestId('triage-card-a')).toBeTruthy();
    expect(queryByTestId('triage-undo-toast')).toBeNull();
    // Nothing was ever sent — undo cancelled the timer, it did not restore.
    expect(deleteEvent).not.toHaveBeenCalled();
  });

  describe('end of queue', () => {
    it('shows the receipt once every card has a decision', async () => {
      queueOf([staleDraft('a')]);

      const { findByTestId, getByTestId, getByText } = renderWithProviders(<DraftTriageScreen />, {
        providerOverrides,
      });

      await findByTestId('triage-card-a');
      await act(async () => {
        fireEvent.press(getByTestId('triage-publish'));
      });

      expect(await findByTestId('triage-receipt')).toBeTruthy();
      expect(getByText('1 / 1')).toBeTruthy();
      expect(getByText('drafts.summaryPublished')).toBeTruthy();
    });

    it('renders the receipt immediately for an empty queue', async () => {
      queueOf([]);

      const { findByTestId } = renderWithProviders(<DraftTriageScreen />, { providerOverrides });

      expect(await findByTestId('triage-receipt')).toBeTruthy();
    });
  });

  it('redirects when not logged in', () => {
    queueOf([]);

    const { getByText } = renderWithProviders(<DraftTriageScreen />, {
      providerOverrides: {
        ...providerOverrides,
        globalContext: { ...providerOverrides.globalContext, user: null, isLogged: false },
      },
    });

    expect(getByText(/Redirect to.*more/)).toBeTruthy();
  });
});
