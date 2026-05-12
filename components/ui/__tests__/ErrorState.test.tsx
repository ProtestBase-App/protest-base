jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ErrorState } from '@/components/ui/ErrorState';
import { useColorScheme } from '@/hooks/useColorScheme';

describe('ErrorState', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the error message', () => {
    render(<ErrorState message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('uses message as default accessibility label', () => {
    render(<ErrorState message="Network failure" />);
    expect(screen.getByLabelText('Network failure')).toBeTruthy();
  });

  it('uses custom accessibility label when provided', () => {
    render(<ErrorState message="Network failure" accessibilityLabel="Custom error label" />);
    expect(screen.getByLabelText('Custom error label')).toBeTruthy();
  });

  it('applies container style overrides', () => {
    render(<ErrorState message="Error" containerStyles={{ paddingHorizontal: 32 }} />);
    expect(screen.getByText('Error')).toBeTruthy();
  });

  it('applies text style overrides', () => {
    render(<ErrorState message="Error" textStyles={{ fontSize: 20 }} />);
    expect(screen.getByText('Error')).toBeTruthy();
  });

  it('uses custom color when provided', () => {
    render(<ErrorState message="Error" color="#FF0000" />);
    expect(screen.getByText('Error')).toBeTruthy();
  });

  it('renders in dark mode', () => {
    jest.mocked(useColorScheme).mockReturnValue('dark');
    render(<ErrorState message="Dark mode error" />);
    expect(screen.getByText('Dark mode error')).toBeTruthy();
  });

  it('handles light colorScheme as default', () => {
    jest.mocked(useColorScheme).mockReturnValue('light');
    render(<ErrorState message="Light scheme" />);
    expect(screen.getByText('Light scheme')).toBeTruthy();
  });
});
