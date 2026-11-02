/**
 * Tests for components/DraftListRow.tsx
 *
 * The row has no visible buttons, so the accessibility actions ARE the publish
 * and delete affordances for screen-reader users — losing them is a silent
 * regression that no snapshot would catch, and the a11y lint rules don't check
 * for them. Same for the swipe-right underlay, which must not exist on a draft
 * that cannot be published.
 */

jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key: string) => key),
}));

jest.mock('@/utils/themeColors', () => ({
  getThemeColors: jest.fn(() => ({
    tint: '#F94460',
    text: '#000000',
    secondaryText: '#666666',
    subtleText: '#999999',
    placeholder: '#AAAAAA',
    cardBackground: '#FFFFFF',
    cardBorder: '#E5E5E5',
    badgeBg: '#F0F0F0',
    categoryBadgeBg: '#FDECEF',
    destructive: '#EF4444',
    warning: '#F59E0B',
    live: '#3DBE7B',
    liveText: '#2E9C63',
  })),
}));

// Captures what the swipe wrapper is asked to render so the tests can assert on
// the underlays without a real gesture. ReanimatedSwipeable also cannot render
// under react-test-renderer.
let lastSwipeProps: Record<string, unknown> = {};
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      lastSwipeProps = props;
      return ReactModule.createElement(View, null, props.children as React.ReactNode);
    },
  };
});

import React from 'react';
import { render } from '@testing-library/react-native';
import { fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import DraftListRow from '@/components/DraftListRow';
import { DynamicRoutes } from '@/constants/Routes';
import { Event } from '@/types/event.types';
import { DraftStatus } from '@/utils/draftStatusUtils';

const NOW = new Date('2026-08-08T12:00:00.000Z');

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    $id: 'draft-1',
    title: 'A draft',
    organizer_name: 'Org',
    categories: ['Strike'],
    start_time: '2026-09-05T14:00:00.000Z',
    ...overrides,
  } as Event;
}

const READY: DraftStatus = { kind: 'ready', missingFieldKeys: [] };
const MISSING: DraftStatus = { kind: 'missing', missingFieldKeys: ['drafts.fieldDescription'] };
const PAST: DraftStatus = { kind: 'pastDate', missingFieldKeys: [] };

function renderRow(status: DraftStatus, event = makeEvent(), extraProps = {}) {
  const onPublish = jest.fn();
  const onDelete = jest.fn();
  const onEdit = jest.fn();
  const utils = render(
    <DraftListRow
      event={event}
      status={status}
      editedLabel="drafts.editedYesterday"
      userLanguage="en"
      now={NOW}
      onEdit={onEdit}
      onPublish={onPublish}
      onDelete={onDelete}
      {...extraProps}
    />
  );
  return { ...utils, onPublish, onDelete, onEdit };
}

describe('DraftListRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastSwipeProps = {};
  });

  describe('accessibility actions', () => {
    it('exposes both publish and delete on a ready draft', () => {
      const { getByTestId } = renderRow(READY);

      const row = getByTestId('draft-row-draft-1');
      expect(row.props.accessibilityActions).toEqual([
        { name: 'publish', label: 'drafts.accessibilityPublish' },
        { name: 'delete', label: 'drafts.delete' },
      ]);
      expect(row.props.accessibilityHint).toBe('drafts.accessibilityRowHint');
    });

    it('omits publish when the draft is not ready', () => {
      const { getByTestId } = renderRow(MISSING);

      const row = getByTestId('draft-row-draft-1');
      expect(row.props.accessibilityActions).toEqual([{ name: 'delete', label: 'drafts.delete' }]);
      expect(row.props.accessibilityHint).toBe('drafts.accessibilityRowHintNotReady');
    });

    it('routes the actions to the matching handlers', () => {
      const { getByTestId, onPublish, onDelete } = renderRow(READY);
      const row = getByTestId('draft-row-draft-1');

      row.props.onAccessibilityAction({ nativeEvent: { actionName: 'publish' } });
      expect(onPublish).toHaveBeenCalledTimes(1);

      row.props.onAccessibilityAction({ nativeEvent: { actionName: 'delete' } });
      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('never publishes a non-ready draft, even if the action is invoked', () => {
      const { getByTestId, onPublish } = renderRow(PAST);
      const row = getByTestId('draft-row-draft-1');

      row.props.onAccessibilityAction({ nativeEvent: { actionName: 'publish' } });

      expect(onPublish).not.toHaveBeenCalled();
    });

    it('ignores actions while a mutation is in flight', () => {
      const { getByTestId, onPublish, onDelete } = renderRow(READY, makeEvent(), { busy: true });
      const row = getByTestId('draft-row-draft-1');

      row.props.onAccessibilityAction({ nativeEvent: { actionName: 'publish' } });
      row.props.onAccessibilityAction({ nativeEvent: { actionName: 'delete' } });

      expect(onPublish).not.toHaveBeenCalled();
      expect(onDelete).not.toHaveBeenCalled();
    });
  });

  describe('swipe underlays', () => {
    it('renders a publish underlay for a ready draft', () => {
      renderRow(READY);
      expect(lastSwipeProps.renderLeftActions).toBeInstanceOf(Function);
      expect(lastSwipeProps.renderRightActions).toBeInstanceOf(Function);
    });

    // Returning undefined (rather than an empty view) means the gesture simply
    // has nothing to reveal on a draft that cannot be published.
    it('has NO publish underlay for a draft that is not ready', () => {
      renderRow(MISSING);
      expect(lastSwipeProps.renderLeftActions).toBeUndefined();
      expect(lastSwipeProps.renderRightActions).toBeInstanceOf(Function);
    });

    it('has no publish underlay for a past-dated draft', () => {
      renderRow(PAST);
      expect(lastSwipeProps.renderLeftActions).toBeUndefined();
    });
  });

  describe('content', () => {
    it('labels an automation draft and suppresses the New badge for it', () => {
      const { queryByText } = renderRow(
        READY,
        makeEvent({ created_via: 'automation', $createdAt: NOW.toISOString() })
      );

      expect(queryByText('drafts.sourceAutomation')).toBeTruthy();
      // A pipeline drop would otherwise light up every row at once.
      expect(queryByText('drafts.badgeNew')).toBeNull();
    });

    it('shows the New badge on a fresh human-made draft', () => {
      const { queryByText } = renderRow(
        READY,
        makeEvent({ created_via: 'user', $createdAt: '2026-08-07T12:00:00.000Z' })
      );

      expect(queryByText('drafts.badgeNew')).toBeTruthy();
    });

    it('renders confidence only when a score exists', () => {
      expect(
        renderRow(READY, makeEvent({ confidence_score: 88 })).queryByTestId(
          'draft-confidence-draft-1'
        )
      ).toBeTruthy();
      expect(
        renderRow(READY, makeEvent({ confidence_score: 0 })).queryByTestId(
          'draft-confidence-draft-1'
        )
      ).toBeTruthy();
      expect(
        renderRow(READY, makeEvent({ confidence_score: null })).queryByTestId(
          'draft-confidence-draft-1'
        )
      ).toBeNull();
    });

    it('replaces the date line with the past-date sentence', () => {
      const { queryByText } = renderRow(PAST);
      expect(queryByText('drafts.pastDateShort')).toBeTruthy();
    });

    it('lists what is missing on an incomplete draft', () => {
      const { queryByText } = renderRow(MISSING);
      expect(queryByText('drafts.missingFields')).toBeTruthy();
    });
  });

  describe('series badge', () => {
    let flag: jest.SpyInstance;
    let membership: jest.SpyInstance;
    const setFlag = (enabled: boolean, isMember = true) => {
      flag = jest
        .spyOn(require('@/context/VersionCheckProvider'), 'useRecurringEventsEnabled')
        .mockReturnValue(enabled);
      membership = jest
        .spyOn(require('@/context/UserOrganizationsProvider'), 'useIsOrganizationMember')
        .mockReturnValue(isMember);
    };

    afterEach(() => {
      flag?.mockRestore();
      membership?.mockRestore();
    });

    it('marks a draft that is a date of a series while the feature is on', () => {
      setFlag(true);

      const { getByTestId, getByText } = renderRow(READY, makeEvent({ series_id: 'series-1' }));

      expect(getByTestId('draft-series-draft-1')).toBeTruthy();
      expect(getByText('series.badge.generic')).toBeTruthy();
    });

    it('shows nothing while the feature is off', () => {
      setFlag(false);

      const { queryByTestId, queryByText } = renderRow(READY, makeEvent({ series_id: 'series-1' }));

      expect(queryByTestId('draft-series-draft-1')).toBeNull();
      expect(queryByText('series.badge.generic')).toBeNull();
    });

    it('shows nothing for a draft that is not in a series', () => {
      setFlag(true);

      expect(
        renderRow(READY, makeEvent({ series_id: null })).queryByTestId('draft-series-draft-1')
      ).toBeNull();
      expect(
        renderRow(READY, makeEvent({ series_id: undefined })).queryByTestId('draft-series-draft-1')
      ).toBeNull();
    });

    it('marks a draft in every state, since a whole series can be saved as drafts', () => {
      setFlag(true);

      for (const status of [READY, MISSING, PAST]) {
        const { getByTestId, unmount } = renderRow(status, makeEvent({ series_id: 'series-1' }));
        expect(getByTestId('draft-series-draft-1')).toBeTruthy();
        unmount();
      }
    });

    it('opens the series, not the draft editor, when it is pressed', () => {
      setFlag(true);
      const { getByTestId, onEdit } = renderRow(READY, makeEvent({ series_id: 'series-1' }));

      fireEvent.press(getByTestId('draft-series-draft-1'), { stopPropagation: jest.fn() });

      expect(router.push).toHaveBeenCalledWith(DynamicRoutes.series('series-1'));
      expect(onEdit).not.toHaveBeenCalled();
    });
  });
});
