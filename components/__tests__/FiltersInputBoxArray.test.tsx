jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import FiltersInputBoxArray from '@/components/ExploreFiltersInputBoxArray';
import { useColorScheme } from '@/hooks/useColorScheme';

describe('FiltersInputBoxArray', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders with empty value', () => {
    render(<FiltersInputBoxArray />);
    expect(screen.toJSON()).toBeTruthy();
  });

  it('displays formatted array values', () => {
    render(<FiltersInputBoxArray value={['Brussels', 'Antwerp']} />);
    expect(screen.getByDisplayValue('Brussels, Antwerp')).toBeTruthy();
  });

  it('uses defaultValue when value is empty', () => {
    render(<FiltersInputBoxArray value={[]} defaultValue={['Climate']} />);
    expect(screen.getByDisplayValue('Climate')).toBeTruthy();
  });

  it('shows placeholder text', () => {
    render(<FiltersInputBoxArray placeholderText="Select locations" />);
    expect(screen.getByPlaceholderText('Select locations')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<FiltersInputBoxArray onPress={onPress} placeholderText="Press me" />);
    fireEvent.press(screen.getByPlaceholderText('Press me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('input is not editable', () => {
    render(<FiltersInputBoxArray value={['Test']} />);
    const input = screen.getByDisplayValue('Test');
    expect(input.props.editable).toBe(false);
  });

  it('renders in dark mode', () => {
    jest.mocked(useColorScheme).mockReturnValue('dark');
    render(<FiltersInputBoxArray value={['Dark']} />);
    expect(screen.getByDisplayValue('Dark')).toBeTruthy();
  });

  it('handles null or empty array in formatting', () => {
    render(<FiltersInputBoxArray value={[]} defaultValue={[]} />);
    expect(screen.toJSON()).toBeTruthy();
  });
});
