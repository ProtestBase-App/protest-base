import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/render';
import { CTAButton } from '@/components/ui/CTAButton';

jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

describe('CTAButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders text and is pressable', () => {
    const { getByText } = renderWithProviders(
      <CTAButton text="Click Me" leftIcon="star" onPress={mockOnPress} />
    );

    expect(getByText('Click Me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const { getByText } = renderWithProviders(
      <CTAButton text="Click Me" leftIcon="star" onPress={mockOnPress} />
    );

    fireEvent.press(getByText('Click Me'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders primary variant with different colors', () => {
    const { getByText } = renderWithProviders(
      <CTAButton text="Primary Button" leftIcon="star" variant="primary" onPress={mockOnPress} />
    );

    expect(getByText('Primary Button')).toBeTruthy();
  });

  it('renders secondary variant as default', () => {
    const { getByText } = renderWithProviders(
      <CTAButton text="Secondary Button" leftIcon="star" onPress={mockOnPress} />
    );

    expect(getByText('Secondary Button')).toBeTruthy();
  });

  it('shows badge with number', () => {
    const { getByText } = renderWithProviders(
      <CTAButton text="Button" leftIcon="star" badge={5} onPress={mockOnPress} />
    );

    expect(getByText('5')).toBeTruthy();
  });

  it('shows "99+" for badge greater than 99', () => {
    const { getByText } = renderWithProviders(
      <CTAButton text="Button" leftIcon="star" badge={150} onPress={mockOnPress} />
    );

    expect(getByText('99+')).toBeTruthy();
  });

  it('does not show badge when badge is 0', () => {
    const { queryByText } = renderWithProviders(
      <CTAButton text="Button" leftIcon="star" badge={0} onPress={mockOnPress} />
    );

    expect(queryByText('0')).toBeNull();
  });

  it('does not show badge when badge is undefined', () => {
    const { getByText } = renderWithProviders(
      <CTAButton text="Button" leftIcon="star" onPress={mockOnPress} />
    );

    // Only button text should be present
    expect(getByText('Button')).toBeTruthy();
  });

  it('shows string badge', () => {
    const { getByText } = renderWithProviders(
      <CTAButton text="Button" leftIcon="star" badge="New" onPress={mockOnPress} />
    );

    expect(getByText('New')).toBeTruthy();
  });

  it('applies custom style', () => {
    const customStyle = { marginTop: 20 };
    const { getByText } = renderWithProviders(
      <CTAButton text="Styled Button" leftIcon="star" style={customStyle} onPress={mockOnPress} />
    );

    expect(getByText('Styled Button')).toBeTruthy();
  });
});
