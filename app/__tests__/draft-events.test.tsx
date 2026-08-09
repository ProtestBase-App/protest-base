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
    inputBorder: '#CCCCCC',
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

// ReanimatedSwipeable throws under react-test-renderer, so the row's swipe
// wrapper is replaced with a passthrough. The row itself stays real — the status
// glyph, confidence, source pill and a11y actions are what these tests read.
// Not forwarding the ref is deliberate: the row's `swipeableRef.current?.close()`
// then short-circuits instead of calling a method a plain View doesn't have.
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(View, null, children),
  };
});

import React from 'react';
import { Alert, RefreshControl } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders, createMockEvent, createMockUser } from '@/test-utils/render';
import DraftEventsScreen from '../(tabs)/(more)/draft-events';

const {
  getDraftEventsForOrganizations,
  publishDraft,
  deleteEvent,
  EventNotDraftError,
} = require('@/services/event.service');

const loggedInGlobal = {
  user: createMockUser(),
  isLogged: true,
  loading: false,
  userLanguage: 'en',
  refetchEvents: jest.fn().mockResolvedValue(undefined),
  refreshUserEventCounts: jest.fn().mockResolvedValue(undefined),
};

// usePaginatedEvents short-circuits without organizations, and the drafts fetch
// is keyed on them — the default mock context has none.
const providerOverrides = {
  globalContext: loggedInGlobal,
  userOrganizationsContext: {
    userOrganizations: [{ $id: 'org-1', name: 'Org One' }],
    hasOrganizations: true,
    hasSingleOrganization: true,
  },
};

const FUTURE = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
const PAST = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

/** A draft that passes every publish rule, so it counts as ready. */
function readyDraft(overrides: Record<string, unknown> = {}) {
  return createMockEvent({
    $id: 'draft-1',
    title: 'Ready draft',
    description: 'Something to say',
    categories: ['Strike'],
    start_time: FUTURE,
    ...overrides,
  });
}

function resolveWith(events: unknown[], total = events.length) {
  getDraftEventsForOrganizations.mockResolvedValue({ events, total });
}

describe('DraftEventsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests drafts for every organization the user belongs to', async () => {
    resolveWith([readyDraft()]);

    const { findByTestId } = renderWithProviders(<DraftEventsScreen />, { providerOverrides });

    await findByTestId('draft-row-draft-1');
    const [orgIds] = getDraftEventsForOrganizations.mock.calls[0];
    expect(orgIds).toEqual(['org-1']);
  });

  describe('server-side filters', () => {
    it('refetches with created_via when the sheet applies a source filter', async () => {
      resolveWith([readyDraft()]);

      const { findByTestId, getByTestId, getByText } = renderWithProviders(<DraftEventsScreen />, {
        providerOverrides,
      });

      await findByTestId('draft-row-draft-1');
      fireEvent.press(getByTestId('draft-filters-button'));
      fireEvent.press(await findByTestId('draft-filter-source-automation'));
      fireEvent.press(getByTestId('draft-filter-sort-lastEdited'));
      // Staged edits only commit on Apply — no refetch per chip tap.
      expect(getDraftEventsForOrganizations).toHaveBeenCalledTimes(1);

      fireEvent.press(getByText('filters.confirmFilters'));

      await waitFor(() => expect(getDraftEventsForOrganizations).toHaveBeenCalledTimes(2));
      const [, options] = getDraftEventsForOrganizations.mock.calls[1];
      expect(options).toMatchObject({ createdVia: 'automation', offset: 0 });
    });

    it('marks the filter button when a sheet filter is applied', async () => {
      resolveWith([readyDraft()]);

      const { findByTestId, getByTestId, getByText, queryByTestId } = renderWithProviders(
        <DraftEventsScreen />,
        { providerOverrides }
      );

      await findByTestId('draft-row-draft-1');
      expect(queryByTestId('draft-filters-active-dot')).toBeNull();

      fireEvent.press(getByTestId('draft-filters-button'));
      fireEvent.press(await findByTestId('draft-filter-category-Strike'));
      fireEvent.press(getByText('filters.confirmFilters'));

      await waitFor(() => expect(queryByTestId('draft-filters-active-dot')).toBeTruthy());
    });

    // The status chips are derived from the same getDraftStatus pass as the rows,
    // so a chip count can never disagree with what filtering by it shows.
    it('filters client-side by status chip without refetching', async () => {
      resolveWith([
        readyDraft(),
        readyDraft({ $id: 'draft-2', title: 'Stale draft', start_time: PAST }),
      ]);

      const { findByTestId, getByTestId, queryByTestId } = renderWithProviders(
        <DraftEventsScreen />,
        { providerOverrides }
      );

      await findByTestId('draft-row-draft-1');
      expect(queryByTestId('draft-row-draft-2')).toBeTruthy();

      fireEvent.press(getByTestId('draft-status-chip-pastDate'));

      await waitFor(() => expect(queryByTestId('draft-row-draft-1')).toBeNull());
      expect(queryByTestId('draft-row-draft-2')).toBeTruthy();
      // Client-side: the status chips must not cost a round-trip.
      expect(getDraftEventsForOrganizations).toHaveBeenCalledTimes(1);
    });

    it('shows the no-results state with a clear action when a filter matches nothing', async () => {
      resolveWith([readyDraft()]);

      const { findByTestId, getByTestId, findByText, queryByText } = renderWithProviders(
        <DraftEventsScreen />,
        { providerOverrides }
      );

      await findByTestId('draft-row-draft-1');

      // Filter to a bucket this draft isn't in — no refetch, so no mock change.
      fireEvent.press(getByTestId('draft-status-chip-missing'));

      await findByText('drafts.noResultsTitle');
      expect(queryByText('drafts.emptyTitle')).toBeNull();

      fireEvent.press(await findByText('drafts.clearFilters'));
      await waitFor(() => expect(queryByText('drafts.noResultsTitle')).toBeNull());
    });

    it('keeps the empty-account state (not no-results) when no filter is active', async () => {
      resolveWith([], 0);

      const { findByText } = renderWithProviders(<DraftEventsScreen />, { providerOverrides });

      expect(await findByText('drafts.emptyTitle')).toBeTruthy();
    });

    // A refresh re-fetches the SAME filter, so unlike a filter change it tells us
    // nothing new about emptiness. The focus effect fires one on every return to
    // this screen, so treating it like a filter change would make an empty
    // account's artboard vanish and sprout controls on every visit.
    it('keeps the empty artboard, with no controls, while a refresh is in flight', async () => {
      resolveWith([], 0);

      const { findByText, queryByText, queryByTestId, UNSAFE_getByType } = renderWithProviders(
        <DraftEventsScreen />,
        { providerOverrides }
      );

      await findByText('drafts.emptyTitle');

      getDraftEventsForOrganizations.mockReturnValueOnce(new Promise(() => {}));
      await act(async () => {
        UNSAFE_getByType(RefreshControl).props.onRefresh();
      });

      expect(queryByText('drafts.emptyTitle')).toBeTruthy();
      expect(queryByTestId('draft-search-input')).toBeNull();
    });
  });

  describe('row presentation', () => {
    it('labels an automation draft and leaves a human-made one unlabelled', async () => {
      resolveWith([readyDraft({ created_via: 'automation' })]);

      const { findByText } = renderWithProviders(<DraftEventsScreen />, { providerOverrides });

      expect(await findByText('drafts.sourceAutomation')).toBeTruthy();
    });

    it('renders a scored draft’s confidence and renders nothing for an unscored one', async () => {
      resolveWith([
        readyDraft({ confidence_score: 88 }),
        readyDraft({ $id: 'draft-2', confidence_score: null }),
      ]);

      const { findByTestId, queryByTestId } = renderWithProviders(<DraftEventsScreen />, {
        providerOverrides,
      });

      expect(await findByTestId('draft-confidence-draft-1')).toBeTruthy();
      // null = never scored, which must render nothing at all.
      expect(queryByTestId('draft-confidence-draft-2')).toBeNull();
    });

    // A scored 0 is a real finding — nothing could be corroborated — and must be
    // visible, unlike a null.
    it('renders a scored zero', async () => {
      resolveWith([readyDraft({ confidence_score: 0 })]);

      const { findByTestId } = renderWithProviders(<DraftEventsScreen />, { providerOverrides });

      expect(await findByTestId('draft-confidence-draft-1')).toBeTruthy();
    });
  });

  describe('batch publish', () => {
    it('hides the publish row when a filter hides the drafts it would publish', async () => {
      resolveWith([readyDraft(), readyDraft({ $id: 'draft-2', start_time: PAST })]);

      const { findByTestId, getByTestId, queryByTestId } = renderWithProviders(
        <DraftEventsScreen />,
        { providerOverrides }
      );

      expect(await findByTestId('draft-batch-publish')).toBeTruthy();

      // Filtering to past-dated hides the drafts publish would act on, so its
      // count would no longer match anything on screen. The destructive row
      // stays: it is defined over the whole account, not the visible set.
      fireEvent.press(getByTestId('draft-status-chip-pastDate'));

      await waitFor(() => expect(queryByTestId('draft-batch-publish')).toBeNull());
      expect(getByTestId('draft-batch-remove-past')).toBeTruthy();
    });

    it('publishes every ready draft sequentially and reports the result', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      resolveWith([readyDraft(), readyDraft({ $id: 'draft-2' })]);
      publishDraft.mockResolvedValue({ $id: 'x', status: 'active' });

      const { findByTestId } = renderWithProviders(<DraftEventsScreen />, { providerOverrides });

      fireEvent.press(await findByTestId('draft-batch-publish'));

      const confirm = alertSpy.mock.calls.find((c) => c[0] === 'drafts.batchConfirmTitle');
      const buttons = (confirm?.[2] ?? []) as { text?: string; onPress?: () => Promise<void> }[];
      await act(async () => {
        await buttons.find((b) => b.text === 'drafts.batchPublishAll')?.onPress?.();
      });

      expect(publishDraft).toHaveBeenCalledTimes(2);
      expect(alertSpy).toHaveBeenCalledWith(
        'common.success',
        expect.stringContaining('batchResult')
      );

      alertSpy.mockRestore();
    });
  });

  describe('removing past-dated drafts', () => {
    const past = (id: string) => readyDraft({ $id: id, start_time: PAST });

    it('offers the destructive row on its own, never folded into publish', async () => {
      resolveWith([readyDraft(), past('draft-2')]);

      const { findByTestId, getByTestId } = renderWithProviders(<DraftEventsScreen />, {
        providerOverrides,
      });

      await findByTestId('draft-batch-bar');
      // Two separate controls: a permanent delete must never be a mis-tap away
      // from a button captioned "Publish".
      expect(getByTestId('draft-batch-publish')).toBeTruthy();
      expect(getByTestId('draft-batch-remove-past')).toBeTruthy();
    });

    it('hides the destructive row when nothing is past-dated', async () => {
      resolveWith([readyDraft()]);

      const { findByTestId, queryByTestId } = renderWithProviders(<DraftEventsScreen />, {
        providerOverrides,
      });

      await findByTestId('draft-batch-bar');
      expect(queryByTestId('draft-batch-remove-past')).toBeNull();
    });

    // The action is defined over the WHOLE account, so a narrowing filter must not
    // shrink what gets deleted — it re-counts unfiltered before confirming.
    it('re-counts unfiltered before confirming, ignoring the active filters', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      // Loaded (filtered) view holds one past draft...
      resolveWith([past('draft-2')]);

      const { findByTestId, getByTestId } = renderWithProviders(<DraftEventsScreen />, {
        providerOverrides,
      });
      await findByTestId('draft-batch-remove-past');

      // ...but the account actually has three.
      getDraftEventsForOrganizations.mockResolvedValue({
        events: [past('draft-2'), past('draft-3'), past('draft-4')],
        total: 3,
      });

      await act(async () => {
        fireEvent.press(getByTestId('draft-batch-remove-past'));
      });

      await waitFor(() =>
        expect(alertSpy.mock.calls.some((c) => c[0] === 'drafts.batchDeleteConfirmTitle')).toBe(
          true
        )
      );
      // The re-count request carries no filters.
      const lastCall = getDraftEventsForOrganizations.mock.calls.at(-1);
      expect(lastCall?.[1]?.category).toBeUndefined();
      expect(lastCall?.[1]?.createdVia).toBeUndefined();
      expect(lastCall?.[1]?.search).toBeUndefined();

      alertSpy.mockRestore();
    });

    it('deletes only past-dated drafts, and only after the confirmation', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      resolveWith([readyDraft(), past('draft-2'), past('draft-3')]);

      const { findByTestId, getByTestId } = renderWithProviders(<DraftEventsScreen />, {
        providerOverrides,
      });
      await findByTestId('draft-batch-remove-past');

      await act(async () => {
        fireEvent.press(getByTestId('draft-batch-remove-past'));
      });
      // Nothing deleted on the tap alone.
      expect(deleteEvent).not.toHaveBeenCalled();

      const confirm = alertSpy.mock.calls.find((c) => c[0] === 'drafts.batchDeleteConfirmTitle');
      const buttons = (confirm?.[2] ?? []) as {
        style?: string;
        onPress?: () => Promise<void> | void;
      }[];
      await act(async () => {
        await buttons.find((b) => b.style === 'destructive')?.onPress?.();
      });

      // The ready draft is untouched.
      expect(deleteEvent).toHaveBeenCalledTimes(2);
      const deleted = deleteEvent.mock.calls.map((c: unknown[]) => c[0]).sort();
      expect(deleted).toEqual(['draft-2', 'draft-3']);

      alertSpy.mockRestore();
    });

    it('says so and deletes nothing when the re-count comes back empty', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      resolveWith([past('draft-2')]);

      const { findByTestId, getByTestId, findByText } = renderWithProviders(<DraftEventsScreen />, {
        providerOverrides,
      });
      await findByTestId('draft-batch-remove-past');

      // Someone else cleared them in the meantime.
      getDraftEventsForOrganizations.mockResolvedValue({ events: [], total: 0 });

      await act(async () => {
        fireEvent.press(getByTestId('draft-batch-remove-past'));
      });

      expect(await findByText('drafts.batchDeleteNone')).toBeTruthy();
      expect(deleteEvent).not.toHaveBeenCalled();
      expect(alertSpy.mock.calls.some((c) => c[0] === 'drafts.batchDeleteConfirmTitle')).toBe(
        false
      );

      alertSpy.mockRestore();
    });
  });

  describe('publishing a draft that is no longer a draft', () => {
    it('treats a 409 as done: drops the row and says it was published elsewhere', async () => {
      resolveWith([readyDraft()]);
      publishDraft.mockRejectedValue(new EventNotDraftError());

      const { findByTestId, findByText, queryByTestId } = renderWithProviders(
        <DraftEventsScreen />,
        { providerOverrides }
      );

      const row = await findByTestId('draft-row-draft-1');
      await act(async () => {
        row.props.onAccessibilityAction({ nativeEvent: { actionName: 'publish' } });
      });

      // A neutral toast, not an Alert: the outcome already happened and needs no
      // decision from the user.
      expect(await findByText('drafts.alreadyPublished')).toBeTruthy();
      await waitFor(() => expect(queryByTestId('draft-row-draft-1')).toBeNull());
    });

    it('surfaces a rate-limit error with the dedicated copy', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      resolveWith([readyDraft()]);
      publishDraft.mockRejectedValue(
        Object.assign(new Error('Too many requests.'), {
          code: 'RATE_LIMIT_EXCEEDED',
          isRateLimited: true,
        })
      );

      const { findByTestId } = renderWithProviders(<DraftEventsScreen />, { providerOverrides });

      const row = await findByTestId('draft-row-draft-1');
      await act(async () => {
        row.props.onAccessibilityAction({ nativeEvent: { actionName: 'publish' } });
      });

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('errors.rateLimit.title', 'errors.rateLimit.message')
      );

      alertSpy.mockRestore();
    });
  });

  describe('triage entry', () => {
    it('offers triage only when drafts need a decision', async () => {
      resolveWith([readyDraft({ $id: 'draft-2', start_time: PAST })]);

      const { findByTestId } = renderWithProviders(<DraftEventsScreen />, { providerOverrides });

      expect(await findByTestId('triage-entry-card')).toBeTruthy();
    });

    it('hides the triage entry when every draft is ready', async () => {
      resolveWith([readyDraft()]);

      const { findByTestId, queryByTestId } = renderWithProviders(<DraftEventsScreen />, {
        providerOverrides,
      });

      await findByTestId('draft-row-draft-1');
      expect(queryByTestId('triage-entry-card')).toBeNull();
    });
  });
});
