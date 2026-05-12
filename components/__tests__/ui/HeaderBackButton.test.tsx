import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/render';
import { HeaderBackButton } from '@/components/ui/HeaderBackButton';
import { router } from 'expo-router';

jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

describe('HeaderBackButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls router.back when pressed with no onPress', () => {
    const { getByLabelText } = renderWithProviders(<HeaderBackButton />);

    const button = getByLabelText('Go back');
    fireEvent.press(button);

    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('calls custom onPress when provided', () => {
    const mockOnPress = jest.fn();
    const { getByLabelText } = renderWithProviders(<HeaderBackButton onPress={mockOnPress} />);

    const button = getByLabelText('Go back');
    fireEvent.press(button);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('default accessibility label is "Go back"', () => {
    const { getByLabelText } = renderWithProviders(<HeaderBackButton />);

    expect(getByLabelText('Go back')).toBeTruthy();
  });

  it('custom accessibility label', () => {
    const { getByLabelText } = renderWithProviders(
      <HeaderBackButton accessibilityLabel="Return to previous screen" />
    );

    expect(getByLabelText('Return to previous screen')).toBeTruthy();
  });

  it('has button accessibility role', () => {
    const { getByRole } = renderWithProviders(<HeaderBackButton />);

    expect(getByRole('button')).toBeTruthy();
  });

  it('default accessibility hint', () => {
    const { getByLabelText } = renderWithProviders(<HeaderBackButton />);

    const button = getByLabelText('Go back');
    expect(button.props.accessibilityHint).toBe('Navigates to the previous screen');
  });
});
