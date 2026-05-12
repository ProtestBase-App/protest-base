jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { LoadingState } from '@/components/ui/LoadingState';
import { useColorScheme } from '@/hooks/useColorScheme';

describe('LoadingState', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders with default accessibility label', () => {
    render(<LoadingState />);
    expect(screen.getByLabelText('Loading content')).toBeTruthy();
  });

  it('uses custom accessibility label', () => {
    render(<LoadingState accessibilityLabel="Fetching events" />);
    expect(screen.getByLabelText('Fetching events')).toBeTruthy();
  });

  it('applies container style overrides', () => {
    render(<LoadingState containerStyles={{ backgroundColor: 'transparent' }} />);
    expect(screen.getByLabelText('Loading content')).toBeTruthy();
  });

  it('accepts custom color prop without crashing', () => {
    render(<LoadingState color="#FF0000" />);
    expect(screen.getByLabelText('Loading content')).toBeTruthy();
  });

  it('accepts small size prop', () => {
    render(<LoadingState size="small" />);
    expect(screen.getByLabelText('Loading content')).toBeTruthy();
  });

  it('renders in dark mode', () => {
    jest.mocked(useColorScheme).mockReturnValue('dark');
    render(<LoadingState />);
    expect(screen.getByLabelText('Loading content')).toBeTruthy();
  });

  it('handles light colorScheme as default', () => {
    jest.mocked(useColorScheme).mockReturnValue('light');
    render(<LoadingState />);
    expect(screen.getByLabelText('Loading content')).toBeTruthy();
  });
});
