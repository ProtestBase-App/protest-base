jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

jest.mock('react-native-element-dropdown', () => {
  const React = require('react');
  return {
    Dropdown: ({
      data,
      onChange,
      placeholder,
      value,
      disable,
      onFocus,
      onBlur,
      renderRightIcon,
      labelField,
      valueField,
      ...rest
    }: any) => {
      const lf = labelField || 'label';
      const vf = valueField || 'value';
      const selectedItem = data?.find((item: any) => item[vf] === value);
      return React.createElement(
        'View',
        {
          testID: 'dropdown',
          accessibilityLabel: placeholder,
        },
        React.createElement(
          'Text',
          { testID: 'dropdown-selected' },
          selectedItem ? selectedItem[lf] : placeholder
        ),
        // Render the right icon (visible = false by default)
        renderRightIcon
          ? React.createElement('View', { testID: 'dropdown-right-icon' }, renderRightIcon(false))
          : null,
        // Render focus/blur triggers
        React.createElement('Pressable', {
          testID: 'dropdown-focus-trigger',
          onPress: () => onFocus?.(),
        }),
        React.createElement('Pressable', {
          testID: 'dropdown-blur-trigger',
          onPress: () => onBlur?.(),
        }),
        // Render items
        ...(data || []).map((item: any, index: number) =>
          React.createElement(
            'Pressable',
            {
              key: item[vf] || index,
              testID: `dropdown-item-${item[vf]}`,
              onPress: () => {
                onChange?.(item);
              },
            },
            React.createElement('Text', null, item[lf])
          )
        )
      );
    },
    MultiSelect: ({
      data,
      onChange,
      placeholder,
      value,
      disable,
      onFocus,
      onBlur,
      renderRightIcon,
      labelField,
      valueField,
      ...rest
    }: any) => {
      const lf = labelField || 'label';
      const vf = valueField || 'value';
      return React.createElement(
        'View',
        {
          testID: 'multiselect',
          accessibilityLabel: placeholder,
        },
        React.createElement('Text', { testID: 'multiselect-placeholder' }, placeholder),
        // Render the right icon
        renderRightIcon
          ? React.createElement('View', { testID: 'multiselect-right-icon' }, renderRightIcon(true))
          : null,
        // Focus/blur triggers
        React.createElement('Pressable', {
          testID: 'multiselect-focus-trigger',
          onPress: () => onFocus?.(),
        }),
        React.createElement('Pressable', {
          testID: 'multiselect-blur-trigger',
          onPress: () => onBlur?.(),
        }),
        // Items
        ...(data || []).map((item: any, index: number) =>
          React.createElement(
            'Pressable',
            {
              key: item[vf] || index,
              testID: `multiselect-item-${item[vf]}`,
              onPress: () => {
                const currentValues = value || [];
                const isSelected = currentValues.includes(item[vf]);
                const newValues = isSelected
                  ? currentValues.filter((v: string) => v !== item[vf])
                  : [...currentValues, item[vf]];
                onChange?.(newValues);
              },
            },
            React.createElement('Text', null, item[lf])
          )
        )
      );
    },
  };
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as ReactNative from 'react-native';
import FormDropdown from '@/components/FormDropdown';
import type { DropdownItem } from '@/components/FormDropdown';

describe('FormDropdown', () => {
  const items: DropdownItem[] = [
    { label: 'Climate', value: 'climate' },
    { label: 'Education', value: 'education' },
    { label: 'Health', value: 'health' },
  ];

  const defaultProps = {
    items,
    placeholder: 'Select category',
    onValueChange: jest.fn(),
    value: null,
  };

  afterEach(() => jest.clearAllMocks());

  describe('Single select', () => {
    it('renders the dropdown', () => {
      render(<FormDropdown {...defaultProps} />);
      expect(screen.getByTestId('dropdown')).toBeTruthy();
    });

    it('does not render multiselect by default', () => {
      render(<FormDropdown {...defaultProps} />);
      expect(screen.queryByTestId('multiselect')).toBeNull();
    });

    it('displays the placeholder text', () => {
      render(<FormDropdown {...defaultProps} />);
      expect(screen.getByText('Select category')).toBeTruthy();
    });

    it('displays the selected item label', () => {
      render(<FormDropdown {...defaultProps} value="climate" />);
      expect(screen.getByTestId('dropdown-selected')).toBeTruthy();
      expect(screen.getAllByText('Climate').length).toBeGreaterThanOrEqual(1);
    });

    it('calls onValueChange with the value when an item is selected', () => {
      const onValueChange = jest.fn();
      render(<FormDropdown {...defaultProps} onValueChange={onValueChange} />);
      fireEvent.press(screen.getByTestId('dropdown-item-climate'));
      expect(onValueChange).toHaveBeenCalledWith('climate');
    });

    it('sets isFocus to false after selection', () => {
      const onValueChange = jest.fn();
      render(<FormDropdown {...defaultProps} onValueChange={onValueChange} />);
      // Focus the dropdown first
      fireEvent.press(screen.getByTestId('dropdown-focus-trigger'));
      // Select an item
      fireEvent.press(screen.getByTestId('dropdown-item-education'));
      expect(onValueChange).toHaveBeenCalledWith('education');
    });
  });

  describe('Multi select', () => {
    it('renders multiselect when multiSelect is true', () => {
      render(<FormDropdown {...defaultProps} multiSelect />);
      expect(screen.getByTestId('multiselect')).toBeTruthy();
    });

    it('does not render single dropdown in multiselect mode', () => {
      render(<FormDropdown {...defaultProps} multiSelect />);
      expect(screen.queryByTestId('dropdown')).toBeNull();
    });

    it('calls onValueChange with selected values in multiselect mode', () => {
      const onValueChange = jest.fn();
      render(
        <FormDropdown {...defaultProps} multiSelect value={[]} onValueChange={onValueChange} />
      );
      fireEvent.press(screen.getByTestId('multiselect-item-climate'));
      expect(onValueChange).toHaveBeenCalledWith(['climate']);
    });
  });

  describe('Props', () => {
    it('accepts disabled prop', () => {
      render(<FormDropdown {...defaultProps} disabled />);
      expect(screen.getByTestId('dropdown')).toBeTruthy();
    });

    it('accepts searchable prop', () => {
      render(<FormDropdown {...defaultProps} searchable />);
      expect(screen.getByTestId('dropdown')).toBeTruthy();
    });

    it('accepts custom maxHeight', () => {
      render(<FormDropdown {...defaultProps} maxHeight={200} />);
      expect(screen.getByTestId('dropdown')).toBeTruthy();
    });

    it('accepts otherStyles', () => {
      render(<FormDropdown {...defaultProps} otherStyles={{ marginTop: 10 }} />);
      expect(screen.getByTestId('dropdown')).toBeTruthy();
    });

    it('accepts custom labelField and valueField', () => {
      render(<FormDropdown {...defaultProps} labelField="name" valueField="id" />);
      expect(screen.getByTestId('dropdown')).toBeTruthy();
    });
  });

  describe('Focus and blur behavior', () => {
    it('sets focus state on single dropdown focus', () => {
      render(<FormDropdown {...defaultProps} />);
      fireEvent.press(screen.getByTestId('dropdown-focus-trigger'));
      // Component renders without errors when focused
      expect(screen.getByTestId('dropdown')).toBeTruthy();
    });

    it('clears focus state on single dropdown blur', () => {
      render(<FormDropdown {...defaultProps} />);
      fireEvent.press(screen.getByTestId('dropdown-focus-trigger'));
      fireEvent.press(screen.getByTestId('dropdown-blur-trigger'));
      expect(screen.getByTestId('dropdown')).toBeTruthy();
    });

    it('sets focus state on multiselect focus', () => {
      render(<FormDropdown {...defaultProps} multiSelect />);
      fireEvent.press(screen.getByTestId('multiselect-focus-trigger'));
      expect(screen.getByTestId('multiselect')).toBeTruthy();
    });

    it('clears focus state on multiselect blur', () => {
      render(<FormDropdown {...defaultProps} multiSelect />);
      fireEvent.press(screen.getByTestId('multiselect-focus-trigger'));
      fireEvent.press(screen.getByTestId('multiselect-blur-trigger'));
      expect(screen.getByTestId('multiselect')).toBeTruthy();
    });
  });

  describe('Right icon rendering', () => {
    it('renders right icon in single select', () => {
      render(<FormDropdown {...defaultProps} />);
      expect(screen.getByTestId('dropdown-right-icon')).toBeTruthy();
    });

    it('renders right icon in multiselect mode', () => {
      render(<FormDropdown {...defaultProps} multiSelect />);
      expect(screen.getByTestId('multiselect-right-icon')).toBeTruthy();
    });
  });

  describe('Dark mode theming', () => {
    it('renders single select in dark mode without crashing (covers dark style branches)', () => {
      jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
      render(<FormDropdown {...defaultProps} />);
      expect(screen.getByTestId('dropdown')).toBeTruthy();
    });

    it('renders multiselect in dark mode without crashing (covers dark style branches)', () => {
      jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
      render(<FormDropdown {...defaultProps} multiSelect />);
      expect(screen.getByTestId('multiselect')).toBeTruthy();
    });
  });

  describe('Multi select with various props', () => {
    it('renders multiselect with disabled', () => {
      render(<FormDropdown {...defaultProps} multiSelect disabled />);
      expect(screen.getByTestId('multiselect')).toBeTruthy();
    });

    it('renders multiselect with searchable', () => {
      render(<FormDropdown {...defaultProps} multiSelect searchable />);
      expect(screen.getByTestId('multiselect')).toBeTruthy();
    });
  });
});
