jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn().mockReturnValue('light') }));
jest.mock('@/utils/i18n', () => ({ t: jest.fn((key) => key) }));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

jest.mock('@/services/event.service', () => ({
  getEventsForLocations: jest.fn(),
}));

import React from 'react';
import { renderWithProviders, fireEvent, act } from '@/test-utils/render';
import { ExploreFiltersSheet } from '@/components/ExploreFiltersSheet';
import { DEFAULT_EXPLORE_FILTERS } from '@/context/ExploreTabProvider';
import { getEventsForLocations } from '@/services/event.service';
import type { LocationFilterOption } from '@/utils/locationFilterOptions';

const mockGetEventsForLocations = getEventsForLocations as jest.MockedFunction<
  typeof getEventsForLocations
>;

const countResponse = (total: number) => ({ events: [], total, limit: 1, offset: 0 });

const SECTION_LABEL_KEYS = [
  'filters.category',
  'filters.date',
  'filters.country',
  'filters.location',
  'filters.organization',
];

/** Flush the 400ms count debounce and settle the count request promise. */
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
    mockGetEventsForLocations.mockResolvedValue(countResponse(7));
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

    it('renders the title and every section label when visible', () => {
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

  describe('Country chips (single-select)', () => {
    const BRUSSELS: LocationFilterOption = {
      value: 'r:be:brussels',
      label: 'Brussels-Capital',
      tier: 'region',
      count: 37,
      provinceLabel: '',
      searchText: 'brussels-capital',
    };
    const AMSTERDAM: LocationFilterOption = {
      value: 'm:nl:1011',
      label: 'Amsterdam',
      tier: 'municipality',
      count: 80,
      provinceLabel: 'Noord-Holland',
      searchText: 'amsterdam noord-holland 1011',
    };
    const locationOverrides = {
      providerOverrides: {
        postalCodeContext: {
          locationFilterOptions: [BRUSSELS, AMSTERDAM],
          resolveLocationLabel: jest.fn((v: string) => v),
          isLocationSelectionTooBroad: jest.fn().mockReturnValue(false),
        },
      },
    };

    it('renders All plus Belgium and the Netherlands, with All active by default', () => {
      const { getByLabelText, queryByLabelText } = renderWithProviders(
        <ExploreFiltersSheet {...defaultProps} />
      );

      expect(getByLabelText('filters.countryAll').props.accessibilityState.selected).toBe(true);
      expect(getByLabelText('Belgium').props.accessibilityState.selected).toBe(false);
      expect(getByLabelText('Netherlands').props.accessibilityState.selected).toBe(false);
      expect(getByLabelText('Luxembourg')).toBeTruthy();
    });

    it('labels countries in the user language', () => {
      const { getByLabelText } = renderWithProviders(<ExploreFiltersSheet {...defaultProps} />, {
        providerOverrides: { globalContext: { userLanguage: 'fr' } },
      });

      expect(getByLabelText('Belgique')).toBeTruthy();
      expect(getByLabelText('Pays-Bas')).toBeTruthy();
    });

    it('applies the selected country', () => {
      const onApply = jest.fn();
      const { getByLabelText, getByText } = renderWithProviders(
        <ExploreFiltersSheet {...defaultProps} onApply={onApply} />
      );

      fireEvent.press(getByLabelText('Netherlands'));

      expect(getByLabelText('Netherlands').props.accessibilityState.selected).toBe(true);
      expect(getByLabelText('filters.countryAll').props.accessibilityState.selected).toBe(false);

      fireEvent.press(getByText('filters.confirmFilters'));

      expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ country: 'netherlands' }));
    });

    it('clears the country when the active chip or All is tapped', () => {
      const onApply = jest.fn();
      const { getByLabelText, getByText } = renderWithProviders(
        <ExploreFiltersSheet
          {...defaultProps}
          initialFilters={{ ...DEFAULT_EXPLORE_FILTERS, country: 'belgium' }}
          onApply={onApply}
        />
      );

      fireEvent.press(getByLabelText('Belgium'));
      expect(getByLabelText('filters.countryAll').props.accessibilityState.selected).toBe(true);

      fireEvent.press(getByLabelText('Netherlands'));
      fireEvent.press(getByLabelText('filters.countryAll'));
      fireEvent.press(getByText('filters.confirmFilters'));

      expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ country: null }));
    });

    it('drops location areas outside the selected country but keeps raw postal codes', () => {
      const onApply = jest.fn();
      const { getByLabelText, getByText } = renderWithProviders(
        <ExploreFiltersSheet
          {...defaultProps}
          initialFilters={{
            ...DEFAULT_EXPLORE_FILTERS,
            locations: ['r:be:brussels', 'm:nl:1011', '1000'],
          }}
          onApply={onApply}
        />,
        locationOverrides
      );

      fireEvent.press(getByLabelText('Netherlands'));
      fireEvent.press(getByText('filters.confirmFilters'));

      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({ country: 'netherlands', locations: ['m:nl:1011', '1000'] })
      );
    });

    it('keeps the location selection when the country is cleared', () => {
      const onApply = jest.fn();
      const { getByLabelText, getByText } = renderWithProviders(
        <ExploreFiltersSheet
          {...defaultProps}
          initialFilters={{
            ...DEFAULT_EXPLORE_FILTERS,
            country: 'belgium',
            locations: ['r:be:brussels'],
          }}
          onApply={onApply}
        />,
        locationOverrides
      );

      fireEvent.press(getByLabelText('filters.countryAll'));
      fireEvent.press(getByText('filters.confirmFilters'));

      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({ country: null, locations: ['r:be:brussels'] })
      );
    });

    it('scopes the location options to the selected country', () => {
      const { getByLabelText, getByPlaceholderText, queryByLabelText } = renderWithProviders(
        <ExploreFiltersSheet {...defaultProps} />,
        locationOverrides
      );

      const locationInput = getByPlaceholderText('filters.searchPlaceholder');
      fireEvent(locationInput, 'focus');
      fireEvent.changeText(locationInput, 'am');
      expect(getByLabelText('Amsterdam')).toBeTruthy();

      fireEvent.press(getByLabelText('Belgium'));
      fireEvent(locationInput, 'focus');
      fireEvent.changeText(locationInput, 'am');
      expect(queryByLabelText('Amsterdam')).toBeNull();

      fireEvent.changeText(locationInput, 'brus');
      expect(getByLabelText('Brussels-Capital')).toBeTruthy();
    });

    it('sends the country with the count request', async () => {
      const { getByLabelText } = renderWithProviders(<ExploreFiltersSheet {...defaultProps} />);

      fireEvent.press(getByLabelText('Belgium'));
      await settleCount();

      expect(mockGetEventsForLocations).toHaveBeenCalledWith(
        { limit: 1, offset: 0, includeEnded: false, country: 'belgium' },
        [],
        expect.any(Function)
      );
    });

    it('enables Reset for a country-only draft and clears it', () => {
      const onApply = jest.fn();
      const { getByLabelText, getByText } = renderWithProviders(
        <ExploreFiltersSheet {...defaultProps} onApply={onApply} />
      );

      fireEvent.press(getByLabelText('Belgium'));
      const resetButton = getByLabelText('common.reset');
      expect(resetButton.props.accessibilityState.disabled).toBe(false);

      fireEvent.press(resetButton);
      fireEvent.press(getByText('filters.confirmFilters'));

      expect(onApply).toHaveBeenCalledWith(DEFAULT_EXPLORE_FILTERS);
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
      mockGetEventsForLocations.mockResolvedValue(countResponse(0));
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

      expect(mockGetEventsForLocations).toHaveBeenCalledTimes(1);
      expect(mockGetEventsForLocations).toHaveBeenCalledWith(
        { limit: 1, offset: 0, includeEnded: false, category: 'Protest', search: 'rally' },
        [],
        expect.any(Function)
      );
    });

    it('coalesces rapid draft changes into a single debounced request', async () => {
      const { getByText } = renderWithProviders(<ExploreFiltersSheet {...defaultProps} />);

      fireEvent.press(getByText('categories.protest'));
      fireEvent.press(getByText('categories.strike'));

      expect(mockGetEventsForLocations).not.toHaveBeenCalled();

      await settleCount();

      expect(mockGetEventsForLocations).toHaveBeenCalledTimes(1);
      expect(mockGetEventsForLocations).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'Strike' }),
        [],
        expect.any(Function)
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

  describe('Too-broad location selection', () => {
    it('shows warning banner, keeps Apply disabled, and skips the count fetch', async () => {
      const onApply = jest.fn();
      const { getByText } = renderWithProviders(
        <ExploreFiltersSheet {...defaultProps} onApply={onApply} />,
        {
          providerOverrides: {
            postalCodeContext: {
              isLocationSelectionTooBroad: jest.fn().mockReturnValue(true),
            },
          },
        }
      );

      // Warning banner must be visible.
      expect(getByText('filters.selectionTooBroad')).toBeTruthy();

      // Advance past the debounce — the effect must have early-returned without
      // calling the backend.
      await settleCount();
      expect(mockGetEventsForLocations).not.toHaveBeenCalled();

      // Apply Pressable is disabled when tooBroad — pressing it is a silent
      // no-op so onApply is never called.
      fireEvent.press(getByText('filters.confirmFilters'));
      expect(onApply).not.toHaveBeenCalled();
    });
  });

  describe('Location selection → count request', () => {
    it('passes the selected locations to the count request', async () => {
      const { getByPlaceholderText, getByLabelText } = renderWithProviders(
        <ExploreFiltersSheet {...defaultProps} />,
        {
          providerOverrides: {
            postalCodeContext: {
              locationFilterOptions: [
                {
                  value: 'be-1000',
                  label: 'Brussels',
                  tier: 'municipality',
                  count: 1,
                  provinceLabel: 'Brussels-Capital',
                  searchText: 'brussels 1000',
                },
              ],
              expandLocationTokens: jest
                .fn()
                .mockReturnValue({ codes: ['1000'], truncated: false }),
              resolveLocationLabel: jest.fn((v: string) => v),
              isLocationSelectionTooBroad: jest.fn().mockReturnValue(false),
            },
          },
        }
      );

      const locationInput = getByPlaceholderText('filters.searchPlaceholder');
      fireEvent(locationInput, 'focus');
      fireEvent.changeText(locationInput, 'brus');
      fireEvent.press(getByLabelText('Brussels'));

      await settleCount();

      // The selection itself goes to the service, which sends it as `areas`.
      expect(mockGetEventsForLocations).toHaveBeenCalledWith(
        expect.not.objectContaining({ postalCodes: expect.anything() }),
        ['be-1000'],
        expect.any(Function)
      );
    });
  });

  describe('Organization selection → count request', () => {
    it('includes the selected organizer in the count request', async () => {
      const { getByPlaceholderText, getByLabelText } = renderWithProviders(
        <ExploreFiltersSheet {...defaultProps} />,
        {
          providerOverrides: {
            organizationsContext: {
              dropdownItems: [{ value: 'org-1', label: 'Org One' }],
            },
          },
        }
      );

      // minSearchLength=0 — shows all options immediately on focus.
      const orgInput = getByPlaceholderText('filters.searchOrganizations');
      fireEvent(orgInput, 'focus');
      fireEvent.press(getByLabelText('Org One'));

      await settleCount();

      expect(mockGetEventsForLocations).toHaveBeenCalledWith(
        expect.objectContaining({ organizers: ['org-1'] }),
        [],
        expect.any(Function)
      );
    });
  });

  describe('Count fetch error path', () => {
    it('handles a rejected count fetch gracefully and keeps the fallback label', async () => {
      mockGetEventsForLocations.mockRejectedValue(new Error('boom'));

      const { getByText, queryByText } = renderWithProviders(
        <ExploreFiltersSheet {...defaultProps} />
      );

      // Trigger a draft change so the count effect fires with the rejection mock.
      fireEvent.press(getByText('categories.protest'));

      // Must not throw; matchCount stays null after the failed fetch.
      await settleCount();

      // Apply label stays on the fallback (matchCount=null → 'filters.confirmFilters').
      expect(getByText('filters.confirmFilters')).toBeTruthy();
      expect(queryByText('home.filterApplyCount')).toBeNull();
    });
  });
});
