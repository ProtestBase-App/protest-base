import React from 'react';
import { renderWithProviders } from '@/test-utils/render';
import { LoadingState } from '@/components/ui/LoadingState';

jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

describe('LoadingState', () => {
  it('renders ActivityIndicator', () => {
    const { getByLabelText } = renderWithProviders(<LoadingState />);

    const container = getByLabelText('Loading content');
    expect(container.props.accessibilityRole).toBe('progressbar');
  });

  it('default accessibility label is "Loading content"', () => {
    const { getByLabelText } = renderWithProviders(<LoadingState />);

    expect(getByLabelText('Loading content')).toBeTruthy();
  });

  it('custom accessibility label', () => {
    const { getByLabelText } = renderWithProviders(
      <LoadingState accessibilityLabel="Loading events" />
    );

    expect(getByLabelText('Loading events')).toBeTruthy();
  });

  it('applies containerStyles', () => {
    const customStyle = { marginVertical: 30 };
    const { getByLabelText } = renderWithProviders(<LoadingState containerStyles={customStyle} />);

    const container = getByLabelText('Loading content');
    expect(container).toBeTruthy();
  });

  it('has progressbar role', () => {
    const { getByLabelText } = renderWithProviders(<LoadingState />);

    const progressbar = getByLabelText('Loading content');
    expect(progressbar).toBeTruthy();
    expect(progressbar.props.accessibilityRole).toBe('progressbar');
    expect(progressbar.props.accessibilityState).toEqual({ busy: true });
  });
});
