jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn().mockReturnValue('light') }));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import {
  SheetSearchMultiSelect,
  SheetSearchMultiSelectOption,
} from '@/components/SheetSearchMultiSelect';

const OPTIONS: SheetSearchMultiSelectOption[] = [
  { value: 'opt-brussels', label: 'Brussels', searchText: 'brussels 1000' },
  { value: 'opt-bruges', label: 'Bruges', searchText: 'bruges 8000', sublabel: 'West Flanders' },
  { value: 'opt-antwerp', label: 'Antwerp', searchText: 'antwerp 2000' },
];

const LABELS: Record<string, string> = {
  'opt-brussels': 'Brussels',
  'opt-bruges': 'Bruges',
  'opt-antwerp': 'Antwerp',
};

const PLACEHOLDER = 'filters.searchPlaceholder';

describe('SheetSearchMultiSelect', () => {
  const defaultProps = {
    options: OPTIONS,
    selected: [] as string[],
    onChange: jest.fn(),
    placeholder: PLACEHOLDER,
    resolveSelectedLabel: (value: string) => LABELS[value] ?? value,
    leadingIconName: 'mappin.and.ellipse' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    jest.setSystemTime(new Date('2026-05-12T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function getInput() {
    return screen.getByPlaceholderText(PLACEHOLDER);
  }

  describe('Selected chips', () => {
    it('renders a chip for each selected value via resolveSelectedLabel', () => {
      render(
        <SheetSearchMultiSelect {...defaultProps} selected={['opt-brussels', 'opt-bruges']} />
      );

      expect(screen.getByText('Brussels')).toBeTruthy();
      expect(screen.getByText('Bruges')).toBeTruthy();
      expect(screen.getByLabelText('Remove Brussels')).toBeTruthy();
      expect(screen.getByLabelText('Remove Bruges')).toBeTruthy();
    });

    it('removes the value when its chip is tapped', () => {
      const onChange = jest.fn();
      render(
        <SheetSearchMultiSelect
          {...defaultProps}
          selected={['opt-brussels', 'opt-bruges']}
          onChange={onChange}
        />
      );

      fireEvent.press(screen.getByLabelText('Remove Brussels'));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(['opt-bruges']);
    });

    it('renders no chips when nothing is selected', () => {
      render(<SheetSearchMultiSelect {...defaultProps} selected={[]} />);

      expect(screen.queryByText('Brussels')).toBeNull();
    });
  });

  describe('Search dropdown', () => {
    it('shows matching options once the query reaches minSearchLength', () => {
      render(<SheetSearchMultiSelect {...defaultProps} minSearchLength={2} />);

      fireEvent(getInput(), 'focus');
      fireEvent.changeText(getInput(), 'bru');

      expect(screen.getByLabelText('Brussels')).toBeTruthy();
      expect(screen.getByLabelText('Bruges')).toBeTruthy();
      expect(screen.queryByLabelText('Antwerp')).toBeNull();
    });

    it('shows no options for a query shorter than minSearchLength', () => {
      render(<SheetSearchMultiSelect {...defaultProps} minSearchLength={2} />);

      fireEvent(getInput(), 'focus');
      fireEvent.changeText(getInput(), 'b');

      expect(screen.queryByLabelText('Brussels')).toBeNull();
      expect(screen.queryByLabelText('Bruges')).toBeNull();
    });

    it('excludes already-selected values from the dropdown', () => {
      render(
        <SheetSearchMultiSelect {...defaultProps} selected={['opt-brussels']} minSearchLength={2} />
      );

      fireEvent(getInput(), 'focus');
      fireEvent.changeText(getInput(), 'bru');

      // Option rows are labelled with the plain option label; the selected
      // chip uses "Remove Brussels", so an exact "Brussels" match means a row.
      expect(screen.queryByLabelText('Brussels')).toBeNull();
      expect(screen.getByLabelText('Bruges')).toBeTruthy();
    });

    it('shows all unselected options on focus when minSearchLength is 0', () => {
      render(<SheetSearchMultiSelect {...defaultProps} minSearchLength={0} />);

      fireEvent(getInput(), 'focus');

      expect(screen.getByLabelText('Brussels')).toBeTruthy();
      expect(screen.getByLabelText('Bruges')).toBeTruthy();
      expect(screen.getByLabelText('Antwerp')).toBeTruthy();
    });

    it('does not show options before the input is focused', () => {
      render(<SheetSearchMultiSelect {...defaultProps} minSearchLength={0} />);

      expect(screen.queryByLabelText('Brussels')).toBeNull();
    });

    it('renders option sublabels in the dropdown', () => {
      render(<SheetSearchMultiSelect {...defaultProps} minSearchLength={2} />);

      fireEvent(getInput(), 'focus');
      fireEvent.changeText(getInput(), 'bruges');

      expect(screen.getByText('West Flanders')).toBeTruthy();
    });
  });

  describe('Selecting an option', () => {
    it('appends the value to the selection and clears the query', () => {
      const onChange = jest.fn();
      render(
        <SheetSearchMultiSelect
          {...defaultProps}
          selected={['opt-brussels']}
          onChange={onChange}
          minSearchLength={2}
        />
      );

      fireEvent(getInput(), 'focus');
      fireEvent.changeText(getInput(), 'ant');
      fireEvent.press(screen.getByLabelText('Antwerp'));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(['opt-brussels', 'opt-antwerp']);
      expect(getInput().props.value).toBe('');
    });
  });

  describe('Clear query button', () => {
    it('clears the query when the clear button is pressed', () => {
      render(<SheetSearchMultiSelect {...defaultProps} minSearchLength={2} />);

      fireEvent(getInput(), 'focus');
      fireEvent.changeText(getInput(), 'bru');
      fireEvent.press(screen.getByLabelText('Clear search'));

      expect(getInput().props.value).toBe('');
      expect(screen.queryByLabelText('Brussels')).toBeNull();
    });
  });

  describe('Single-select mode', () => {
    it('replaces the selection instead of appending', () => {
      const onChange = jest.fn();
      render(
        <SheetSearchMultiSelect
          {...defaultProps}
          singleSelect
          selected={['opt-brussels']}
          onChange={onChange}
          minSearchLength={2}
        />
      );

      fireEvent(getInput(), 'focus');
      fireEvent.changeText(getInput(), 'ant');
      fireEvent.press(screen.getByLabelText('Antwerp'));

      // Single-select replaces the prior value rather than adding to it.
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(['opt-antwerp']);
    });

    it('still renders the chosen value as a removable chip', () => {
      render(<SheetSearchMultiSelect {...defaultProps} singleSelect selected={['opt-brussels']} />);

      expect(screen.getByText('Brussels')).toBeTruthy();
      expect(screen.getByLabelText('Remove Brussels')).toBeTruthy();
    });
  });

  describe('Max selection cap', () => {
    it('offers options while below maxSelected', () => {
      render(
        <SheetSearchMultiSelect {...defaultProps} maxSelected={2} selected={['opt-brussels']} />
      );

      fireEvent(getInput(), 'focus');

      expect(screen.getByLabelText('Bruges')).toBeTruthy();
      expect(screen.getByLabelText('Antwerp')).toBeTruthy();
    });

    it('offers no addable options once maxSelected is reached', () => {
      render(
        <SheetSearchMultiSelect
          {...defaultProps}
          maxSelected={2}
          selected={['opt-brussels', 'opt-bruges']}
        />
      );

      fireEvent(getInput(), 'focus');

      // At the cap, the remaining unselected option is not offered.
      expect(screen.queryByLabelText('Antwerp')).toBeNull();
    });

    it('renders the maxSelectedHint when the cap is reached', () => {
      render(
        <SheetSearchMultiSelect
          {...defaultProps}
          maxSelected={2}
          maxSelectedHint="Max 2 reached"
          selected={['opt-brussels', 'opt-bruges']}
        />
      );

      expect(screen.getByText('Max 2 reached')).toBeTruthy();
    });

    it('does not cap single-select mode', () => {
      render(
        <SheetSearchMultiSelect
          {...defaultProps}
          singleSelect
          maxSelected={1}
          selected={['opt-brussels']}
          minSearchLength={2}
        />
      );

      fireEvent(getInput(), 'focus');
      fireEvent.changeText(getInput(), 'ant');

      // singleSelect replaces its value, so the cap is ignored and the option shows.
      expect(screen.getByLabelText('Antwerp')).toBeTruthy();
    });
  });

  describe('searchText fallback', () => {
    it('matches on label when option has no searchText property', () => {
      // The option is built without searchText (production path for org options).
      const optionsWithFallback: SheetSearchMultiSelectOption[] = [
        ...OPTIONS,
        { value: 'opt-xa', label: 'Xanadu' },
      ];

      render(
        <SheetSearchMultiSelect
          {...defaultProps}
          options={optionsWithFallback}
          minSearchLength={1}
        />
      );

      fireEvent(getInput(), 'focus');
      fireEvent.changeText(getInput(), 'xan');

      // Xanadu has no searchText so the match falls back to label.toLowerCase()
      expect(screen.getByLabelText('Xanadu')).toBeTruthy();
      // Other options should not appear
      expect(screen.queryByLabelText('Brussels')).toBeNull();
      expect(screen.queryByLabelText('Bruges')).toBeNull();
      expect(screen.queryByLabelText('Antwerp')).toBeNull();
    });
  });

  describe('maxVisibleOptions slicing', () => {
    it('shows only maxVisibleOptions rows when more options match', () => {
      const manyOptions: SheetSearchMultiSelectOption[] = [
        { value: 'opt-a', label: 'Alpha' },
        { value: 'opt-b', label: 'Beta' },
        { value: 'opt-c', label: 'Gamma' },
        { value: 'opt-d', label: 'Delta' },
        { value: 'opt-e', label: 'Epsilon' },
        { value: 'opt-f', label: 'Zeta' },
      ];
      // All options will match an empty query (minSearchLength=0).
      // With maxVisibleOptions=2 only the first 2 should render.
      render(
        <SheetSearchMultiSelect
          {...defaultProps}
          options={manyOptions}
          minSearchLength={0}
          maxVisibleOptions={2}
        />
      );

      fireEvent(getInput(), 'focus');

      // Only the first 2 options (Alpha, Beta) should appear.
      expect(screen.getByLabelText('Alpha')).toBeTruthy();
      expect(screen.getByLabelText('Beta')).toBeTruthy();
      // Options beyond the cap must not render.
      expect(screen.queryByLabelText('Gamma')).toBeNull();
      expect(screen.queryByLabelText('Delta')).toBeNull();
      expect(screen.queryByLabelText('Epsilon')).toBeNull();
      expect(screen.queryByLabelText('Zeta')).toBeNull();
    });
  });

  describe('Blur 120 ms timeout', () => {
    it('keeps the dropdown open for <120 ms after blur', () => {
      render(<SheetSearchMultiSelect {...defaultProps} minSearchLength={0} />);

      fireEvent(getInput(), 'focus');
      // Dropdown is open
      expect(screen.getByLabelText('Brussels')).toBeTruthy();

      fireEvent(getInput(), 'blur');

      // Before the 120 ms window elapses, the dropdown should still be visible
      jest.advanceTimersByTime(119);
      expect(screen.getByLabelText('Brussels')).toBeTruthy();
    });

    it('closes the dropdown after the 120 ms timeout elapses', () => {
      render(<SheetSearchMultiSelect {...defaultProps} minSearchLength={0} />);

      fireEvent(getInput(), 'focus');
      expect(screen.getByLabelText('Brussels')).toBeTruthy();

      fireEvent(getInput(), 'blur');

      // After >=120 ms the timeout fires and focused -> false collapses the dropdown.
      // Wrap in act so the resulting state update (setFocused) is flushed synchronously.
      act(() => {
        jest.advanceTimersByTime(120);
      });
      expect(screen.queryByLabelText('Brussels')).toBeNull();
    });

    it('cancels the pending close when the input is re-focused within 120 ms', () => {
      render(<SheetSearchMultiSelect {...defaultProps} minSearchLength={0} />);

      fireEvent(getInput(), 'focus');
      expect(screen.getByLabelText('Brussels')).toBeTruthy();

      // Blur starts the 120 ms countdown
      fireEvent(getInput(), 'blur');
      jest.advanceTimersByTime(50);

      // Re-focusing before the timeout fires should cancel the close
      fireEvent(getInput(), 'focus');

      // Advance well past 120 ms — the cancelled timeout must not fire
      jest.advanceTimersByTime(200);
      expect(screen.getByLabelText('Brussels')).toBeTruthy();
    });
  });

  describe('Disabled (locked) state', () => {
    it('renders the selected value but makes the input non-editable', () => {
      render(<SheetSearchMultiSelect {...defaultProps} disabled selected={['opt-brussels']} />);

      // The locked value is still shown...
      expect(screen.getByText('Brussels')).toBeTruthy();
      // ...but the search input cannot be typed into.
      expect(getInput().props.editable).toBe(false);
    });

    it('does not open the dropdown on focus when disabled', () => {
      render(<SheetSearchMultiSelect {...defaultProps} disabled minSearchLength={0} />);

      fireEvent(getInput(), 'focus');

      // No options offered while locked.
      expect(screen.queryByLabelText('Brussels')).toBeNull();
      expect(screen.queryByLabelText('Bruges')).toBeNull();
      expect(screen.queryByLabelText('Antwerp')).toBeNull();
    });

    it('marks the selected chip non-interactive (not removable) when disabled', () => {
      const onChange = jest.fn();
      render(
        <SheetSearchMultiSelect
          {...defaultProps}
          disabled
          selected={['opt-brussels']}
          onChange={onChange}
        />
      );

      const chip = screen.getByLabelText('Remove Brussels');
      expect(chip.props.accessibilityState.disabled).toBe(true);
    });
  });
});
