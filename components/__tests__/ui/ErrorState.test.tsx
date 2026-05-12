import React from 'react';
import { renderWithProviders } from '@/test-utils/render';
import { ErrorState } from '@/components/ui/ErrorState';

jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

describe('ErrorState', () => {
  it('renders error message', () => {
    const { getByText } = renderWithProviders(<ErrorState message="Something went wrong" />);

    expect(getByText('Something went wrong')).toBeTruthy();
  });

  it('uses accessibilityRole alert', () => {
    const { getByLabelText } = renderWithProviders(<ErrorState message="Error occurred" />);

    const container = getByLabelText('Error occurred');
    expect(container.props.accessibilityRole).toBe('alert');
  });

  it('uses custom accessibilityLabel when provided', () => {
    const { getByLabelText } = renderWithProviders(
      <ErrorState message="Error" accessibilityLabel="Custom error label" />
    );

    expect(getByLabelText('Custom error label')).toBeTruthy();
  });

  it('defaults accessibilityLabel to message', () => {
    const { getByLabelText } = renderWithProviders(<ErrorState message="Default label test" />);

    expect(getByLabelText('Default label test')).toBeTruthy();
  });

  it('applies containerStyles', () => {
    const customStyle = { marginTop: 20, padding: 10 };
    const { getByLabelText } = renderWithProviders(
      <ErrorState message="Error" containerStyles={customStyle} />
    );

    const container = getByLabelText('Error');
    expect(container).toBeTruthy();
  });

  it('applies textStyles', () => {
    const customTextStyle = { fontSize: 18 };
    const { getByText } = renderWithProviders(
      <ErrorState message="Styled error" textStyles={customTextStyle} />
    );

    const text = getByText('Styled error');
    expect(text).toBeTruthy();
  });
});
