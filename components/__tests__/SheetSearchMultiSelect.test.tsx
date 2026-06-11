jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn().mockReturnValue('light') }));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
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
});
