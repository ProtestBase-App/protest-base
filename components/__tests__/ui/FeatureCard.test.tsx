import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/render';
import { FeatureCard } from '@/components/ui/FeatureCard';

jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

describe('FeatureCard', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and description', () => {
    const { getByText } = renderWithProviders(
      <FeatureCard
        title="Feature Title"
        description="Feature description here"
        icon="calendar"
        onPress={mockOnPress}
      />
    );

    expect(getByText('Feature Title')).toBeTruthy();
    expect(getByText('Feature description here')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const { getByText } = renderWithProviders(
      <FeatureCard
        title="Pressable Feature"
        description="Press me"
        icon="map"
        onPress={mockOnPress}
      />
    );

    fireEvent.press(getByText('Pressable Feature'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('has button accessibility role', () => {
    const { getByRole } = renderWithProviders(
      <FeatureCard title="Feature" description="Description" icon="star" onPress={mockOnPress} />
    );

    expect(getByRole('button')).toBeTruthy();
  });

  it('has correct accessibility label with description', () => {
    const { getByLabelText } = renderWithProviders(
      <FeatureCard
        title="My Feature"
        description="Feature details"
        icon="info"
        onPress={mockOnPress}
      />
    );

    expect(getByLabelText('My Feature: Feature details')).toBeTruthy();
  });

  it('renders icon', () => {
    const { getByText } = renderWithProviders(
      <FeatureCard
        title="Icon Feature"
        description="Has icon"
        icon="checkmark.circle.fill"
        onPress={mockOnPress}
      />
    );

    // Icon is rendered via IconSymbol, verify component renders without crash
    expect(getByText('Icon Feature')).toBeTruthy();
  });
});
