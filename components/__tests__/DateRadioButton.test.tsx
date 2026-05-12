jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import DateRadioButton from '@/components/DateRadioButton';
import { useColorScheme } from '@/hooks/useColorScheme';

describe('DateRadioButton', () => {
  const defaultProps = {
    label: 'This week',
    value: 'this_week',
    onSelectionChange: jest.fn(),
  };

  afterEach(() => jest.clearAllMocks());

  it('renders the label text', () => {
    render(<DateRadioButton {...defaultProps} />);
    expect(screen.getByText('This week')).toBeTruthy();
  });

  it('toggles to checked state on press when unchecked', () => {
    const onSelectionChange = jest.fn();
    render(<DateRadioButton {...defaultProps} onSelectionChange={onSelectionChange} />);
    fireEvent.press(screen.getByText('This week'));
    expect(onSelectionChange).toHaveBeenCalledWith('this_week', true);
  });

  it('toggles to unchecked state on press when checked', () => {
    const onSelectionChange = jest.fn();
    render(
      <DateRadioButton {...defaultProps} isChecked={true} onSelectionChange={onSelectionChange} />
    );
    fireEvent.press(screen.getByText('This week'));
    expect(onSelectionChange).toHaveBeenCalledWith('this_week', false);
  });

  it('renders unchecked by default', () => {
    render(<DateRadioButton {...defaultProps} />);
    expect(screen.getByText('This week')).toBeTruthy();
  });

  it('renders checked state', () => {
    render(<DateRadioButton {...defaultProps} isChecked />);
    expect(screen.getByText('This week')).toBeTruthy();
  });

  it('renders in dark mode', () => {
    jest.mocked(useColorScheme).mockReturnValue('dark');
    render(<DateRadioButton {...defaultProps} />);
    expect(screen.getByText('This week')).toBeTruthy();
  });

  it('renders checked in dark mode', () => {
    jest.mocked(useColorScheme).mockReturnValue('dark');
    render(<DateRadioButton {...defaultProps} isChecked />);
    expect(screen.getByText('This week')).toBeTruthy();
  });
});
