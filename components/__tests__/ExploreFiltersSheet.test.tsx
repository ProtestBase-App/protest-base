jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn().mockReturnValue('light') }));
jest.mock('@/utils/i18n', () => ({ t: jest.fn((key) => key) }));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

jest.mock('@/services/event.service', () => ({
  getEventsBackend: jest.fn(),
}));

import React from 'react';
import { renderWithProviders, fireEvent, act } from '@/test-utils/render';
import { ExploreFiltersSheet } from '@/components/ExploreFiltersSheet';
import { DEFAULT_EXPLORE_FILTERS } from '@/context/ExploreTabProvider';
import { getEventsBackend } from '@/services/event.service';

const mockGetEventsBackend = getEventsBackend as jest.MockedFunction<typeof getEventsBackend>;

const countResponse = (total: number) => ({ events: [], total, limit: 1, offset: 0 });

const SECTION_LABEL_KEYS = [
  'filters.category',
  'filters.date',
  'filters.location',
  'filters.organization',
];

/** Flush the 400ms count debounce and settle the getEventsBackend promise. */
async function settleCount() {
  act(() => {
    jest.advanceTimersByTime(400);
  });
  await act(async () => {});
}

describe('ExploreFiltersSheet', () => {
  const defaultProps = {
    visible: true,
    initialFilters: DEFAULT_EXPLORE_FILTERS,
    searchQuery: '',
    onApply: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    jest.setSystemTime(new Date('2026-05-12T10:00:00Z'));
    mockGetEventsBackend.mockResolvedValue(countResponse(7));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Visibility', () => {
    it('renders nothing when not visible', () => {
      const { queryByText } = renderWithProviders(
        <ExploreFiltersSheet {...defaultProps} visible={false} />
      );

      expect(queryByText('filters.title')).toBeNull();
      SECTION_LABEL_KEYS.forEach((key) => {
        expect(queryByText(key)).toBeNull();
      });
    });

    it('renders the title and the four section labels when visible', () => {
      const { getByText } = renderWithProviders(<ExploreFiltersSheet {...defaultProps} />);

      expect(getByText('filters.title')).toBeTruthy();
      SECTION_LABEL_KEYS.forEach((key) => {
        expect(getByText(key)).toBeTruthy();
      });
    });
  });

  describe('Category chips (single-select)', () => {
    it('keeps only the most recently tapped category', () => {
      const onApply = jest.fn();
      const { getByText, getByLabelText } = renderWithProviders(
        <ExploreFiltersSheet {...defaultProps} onApply={onApply} />
      );

      fireEvent.press(getByText('categories.protest'));
      fireEvent.press(getByText('categories.strike'));

      expect(getByLabelText('categories.protest').props.accessibilityState.selected).toBe(false);
      expect(getByLabelText('categories.strike').props.accessibilityState.selected).toBe(true);

      fireEvent.press(getByText('filters.confirmFilters'));

      expect(onApply).toHaveBeenCalledTimes(1);
      expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ category: 'Strike' }));
    });

    it('clears the category when the active chip is tapped again', () => {
      const onApply = jest.fn();
      const { getByText } = renderWithProviders(
        <ExploreFiltersSheet {...defaultProps} onApply={onApply} />
      );

      fireEvent.press(getByText('categories.protest'));
      fireEvent.press(getByText('categories.protest'));
      fireEvent.press(getByText('filters.confirmFilters'));

      expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ category: null }));
    });
  });

  describe('Date preset chips (single-select)', () => {
    it('renders all five date presets', () => {
      const { getByText } = renderWithProviders(<ExploreFiltersSheet {...defaultProps} />);

      for (const key of [
        'filters.today',
        'filters.tomorrow',
        'filters.thisWeek',
        'filters.thisWeekend',
        'filters.thisMonth',
      ]) {
        expect(getByText(key)).toBeTruthy();
      }
    });

    it('applies thisMonth when its chip is selected', () => {
      const onApply = jest.fn();
      const { getByText } = renderWithProviders(
        <ExploreFiltersSheet {...defaultProps} onApply={onApply} />
      );

      fireEvent.press(getByText('filters.thisMonth'));
      fireEvent.press(getByText('filters.confirmFilters'));

      expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ dateFilter: 'thisMonth' }));
    });

    it('keeps only the most recently tapped date preset', () => {
      const onApply = jest.fn();
      const { getByText, getByLabelText } = renderWithProviders(
        <ExploreFiltersSheet {...defaultProps} onApply={onApply} />
      );

      fireEvent.press(getByText('filters.tomorrow'));
      fireEvent.press(getByText('filters.today'));

      expect(getByLabelText('filters.tomorrow').props.accessibilityState.selected).toBe(false);
      expect(getByLabelText('filters.today').props.accessibilityState.selected).toBe(true);

      fireEvent.press(getByText('filters.confirmFilters'));

      expect(onApply).toHaveBeenCalledTimes(1);
      expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ dateFilter: 'today' }));
    });

    it('clears the date preset when the active chip is tapped again', () => {
      const onApply = jest.fn();
      const { getByText } = renderWithProviders(
        <ExploreFiltersSheet {...defaultProps} onApply={onApply} />
      );

      fireEvent.press(getByText('filters.today'));
      fireEvent.press(getByText('filters.today'));
      fireEvent.press(getByText('filters.confirmFilters'));

      expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ dateFilter: null }));
    });
  });

  describe('Apply button label', () => {
    it('shows the confirm label before the debounce resolves, then the count label', async () => {
      const { getByText, queryByText } = renderWithProviders(
        <ExploreFiltersSheet {...defaultProps} />
      );

      expect(getByText('filters.confirmFilters')).toBeTruthy();

      await settleCount();

      expect(getByText('home.filterApplyCount')).toBeTruthy();
      expect(queryByText('filters.confirmFilters')).toBeNull();
    });

    it('shows the no-matches label when the count resolves to 0', async () => {
      mockGetEventsBackend.mockResolvedValue(countResponse(0));
      const { getByText, queryByText } = renderWithProviders(
        <ExploreFiltersSheet {...defaultProps} />
      );

      await settleCount();

      expect(getByText('home.filterApplyNone')).toBeTruthy();
      expect(queryByText('home.filterApplyCount')).toBeNull();
    });

    it('falls back to the confirm label immediately after a draft change', async () => {
      const { getByText, queryByText } = renderWithProviders(
        <ExploreFiltersSheet {...defaultProps} />
      );

      await settleCount();
      expect(getByText('home.filterApplyCount')).toBeTruthy();

      fireEvent.press(getByText('categories.protest'));

      expect(getByText('filters.confirmFilters')).toBeTruthy();
      expect(queryByText('home.filterApplyCount')).toBeNull();
    });
  });

  describe('Count request parameters', () => {
    it('requests a limit-1 count with the draft params and trimmed search query', async () => {
      const { getByText } = renderWithProviders(
        <ExploreFiltersSheet {...defaultProps} searchQuery="  rally " />
      );

      fireEvent.press(getByText('categories.protest'));
      await settleCount();

      expect(mockGetEventsBackend).toHaveBeenCalledTimes(1);
      expect(mockGetEventsBackend).toHaveBeenCalledWith({
        limit: 1,
        offset: 0,
        includeEnded: false,
        category: 'Protest',
        search: 'rally',
      });
    });

    it('coalesces rapid draft changes into a single debounced request', async () => {
      const { getByText } = renderWithProviders(<ExploreFiltersSheet {...defaultProps} />);

      fireEvent.press(getByText('categories.protest'));
      fireEvent.press(getByText('categories.strike'));

      expect(mockGetEventsBackend).not.toHaveBeenCalled();

      await settleCount();

      expect(mockGetEventsBackend).toHaveBeenCalledTimes(1);
      expect(mockGetEventsBackend).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'Strike' })
      );
    });
  });

  describe('Reset button', () => {
    it('is disabled while the draft matches the defaults', () => {
      const { getByLabelText } = renderWithProviders(<ExploreFiltersSheet {...defaultProps} />);

      expect(getByLabelText('common.reset').props.accessibilityState.disabled).toBe(true);
    });

    it('becomes enabled after a change and restores the defaults when pressed', () => {
      const onApply = jest.fn();
      const { getByText, getByLabelText } = renderWithProviders(
        <ExploreFiltersSheet {...defaultProps} onApply={onApply} />
      );

      fireEvent.press(getByText('categories.protest'));
      const resetButton = getByLabelText('common.reset');
      expect(resetButton.props.accessibilityState.disabled).toBe(false);

      fireEvent.press(resetButton);
      fireEvent.press(getByText('filters.confirmFilters'));

      expect(onApply).toHaveBeenCalledWith(DEFAULT_EXPLORE_FILTERS);
    });
  });

  describe('Closing without applying', () => {
    it('discards draft changes on close — reopening resets to the initial filters', () => {
      const onApply = jest.fn();
      const { getByText, rerender } = renderWithProviders(
        <ExploreFiltersSheet {...defaultProps} onApply={onApply} />
      );

      // Edit the draft, then close without applying.
      fireEvent.press(getByText('categories.protest'));
      rerender(<ExploreFiltersSheet {...defaultProps} visible={false} onApply={onApply} />);

      // Reopen and apply immediately — the draft must be back to the initial filters.
      rerender(<ExploreFiltersSheet {...defaultProps} visible={true} onApply={onApply} />);
      fireEvent.press(getByText('filters.confirmFilters'));

      expect(onApply).toHaveBeenCalledTimes(1);
      expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ category: null }));
    });

    it('calls onClose (and not onApply) when the close button is pressed', () => {
      const onApply = jest.fn();
      const onClose = jest.fn();
      const { getByLabelText } = renderWithProviders(
        <ExploreFiltersSheet {...defaultProps} onApply={onApply} onClose={onClose} />
      );

      fireEvent.press(getByLabelText('common.close'));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onApply).not.toHaveBeenCalled();
    });
  });
});
