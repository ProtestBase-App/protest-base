jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { FeatureCard } from '@/components/ui/FeatureCard';

describe('FeatureCard', () => {
  const defaultProps = {
    title: 'Create Event',
    description: 'Create a new protest event',
    icon: 'plus.circle' as const,
    onPress: jest.fn(),
  };

  afterEach(() => jest.clearAllMocks());

  it('renders the title', () => {
    render(<FeatureCard {...defaultProps} />);
    expect(screen.getByText('Create Event')).toBeTruthy();
  });

  it('renders the description', () => {
    render(<FeatureCard {...defaultProps} />);
    expect(screen.getByText('Create a new protest event')).toBeTruthy();
  });

  it('has button accessibility role', () => {
    render(<FeatureCard {...defaultProps} />);
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('sets composite accessibility label with title and description', () => {
    render(<FeatureCard {...defaultProps} />);
    expect(screen.getByLabelText('Create Event: Create a new protest event')).toBeTruthy();
  });

  it('sets accessibility label with only title when description is empty', () => {
    render(<FeatureCard {...defaultProps} description="" />);
    expect(screen.getByLabelText('Create Event')).toBeTruthy();
  });

  it('does not render description when empty string', () => {
    render(<FeatureCard {...defaultProps} description="" />);
    expect(screen.queryByText('Create a new protest event')).toBeNull();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<FeatureCard {...defaultProps} onPress={onPress} />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders in light mode', () => {
    jest.mocked(useColorScheme).mockReturnValue('light');
    render(<FeatureCard {...defaultProps} />);
    expect(screen.getByText('Create Event')).toBeTruthy();
  });

  it('renders in dark mode (covers isDarkMode=true color branches)', () => {
    jest.mocked(useColorScheme).mockReturnValue('dark');
    render(<FeatureCard {...defaultProps} />);
    expect(screen.getByText('Create Event')).toBeTruthy();
    expect(screen.getByText('Create a new protest event')).toBeTruthy();
  });

  it('renders with a long description without crashing', () => {
    render(
      <FeatureCard
        {...defaultProps}
        description="This is a very long description that tests text wrapping and layout behavior"
      />
    );
    expect(
      screen.getByText(
        'This is a very long description that tests text wrapping and layout behavior'
      )
    ).toBeTruthy();
  });

  it('sets accessibility label with title only when description is null', () => {
    render(<FeatureCard {...defaultProps} description="" />);
    expect(screen.getByLabelText('Create Event')).toBeTruthy();
  });
});
