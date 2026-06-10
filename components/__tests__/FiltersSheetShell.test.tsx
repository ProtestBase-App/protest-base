jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn().mockReturnValue('light') }));
jest.mock('@/utils/i18n', () => ({ t: jest.fn((key) => key) }));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { Text } from 'react-native';
import { renderWithProviders, fireEvent } from '@/test-utils/render';
import { FiltersSheetShell, FiltersSheetSectionLabel } from '@/components/FiltersSheetShell';

describe('FiltersSheetShell', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    title: 'Sheet Title',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when not visible', () => {
    const { queryByText } = renderWithProviders(
      <FiltersSheetShell {...defaultProps} visible={false}>
        <Text>Sheet body</Text>
      </FiltersSheetShell>
    );

    expect(queryByText('Sheet Title')).toBeNull();
    expect(queryByText('Sheet body')).toBeNull();
  });

  it('renders the title and children when visible', () => {
    const { getByText } = renderWithProviders(
      <FiltersSheetShell {...defaultProps}>
        <Text>Sheet body</Text>
      </FiltersSheetShell>
    );

    expect(getByText('Sheet Title')).toBeTruthy();
    expect(getByText('Sheet body')).toBeTruthy();
  });

  it('calls onClose when the close button is pressed', () => {
    const onClose = jest.fn();
    const { getByLabelText } = renderWithProviders(
      <FiltersSheetShell {...defaultProps} onClose={onClose}>
        <Text>Sheet body</Text>
      </FiltersSheetShell>
    );

    fireEvent.press(getByLabelText('common.close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('FiltersSheetSectionLabel', () => {
  it('renders the label text', () => {
    const { getByText } = renderWithProviders(
      <FiltersSheetSectionLabel label="filters.category" />
    );

    expect(getByText('filters.category')).toBeTruthy();
  });
});
