import React from 'react';
import { act } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { PlacardLoader } from '@/components/ui/loaders/PlacardLoader';
import { PLACARD_WORDS } from '@/components/ui/loaders/placardWords';
import { renderWithProviders } from '@/test-utils/render';

const mockUseReducedMotion = useReducedMotion as jest.Mock;

describe('PlacardLoader', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUseReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the words of the given locale', () => {
    const { getByText } = renderWithProviders(<PlacardLoader locale="fr" />);

    expect(getByText(PLACARD_WORDS.fr[0])).toBeTruthy();
  });

  it('falls back to the app language', () => {
    const { getByText } = renderWithProviders(<PlacardLoader />, {
      providerOverrides: { globalContext: { userLanguage: 'nl' } },
    });

    expect(getByText(PLACARD_WORDS.nl[0])).toBeTruthy();
  });

  it('cycles through the words and wraps around', () => {
    const { getByText } = renderWithProviders(
      <PlacardLoader words={['ONE', 'TWO']} wordDurationMs={500} />
    );
    expect(getByText('ONE')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(getByText('TWO')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(getByText('ONE')).toBeTruthy();
  });

  it('keeps the first word when motion is reduced', () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { getByText } = renderWithProviders(
      <PlacardLoader words={['ONE', 'TWO']} wordDurationMs={500} />
    );

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(getByText('ONE')).toBeTruthy();
  });

  it.each([
    ['RISE', 22],
    ['UNITE', 20],
    ['OPSTAAN', 17],
    ['SOLIDARITY', 15],
  ])('sizes the text for %s', (word, fontSize) => {
    const { getByText } = renderWithProviders(<PlacardLoader words={[word]} />);

    expect(getByText(word)).toHaveStyle({ fontSize });
  });

  it('announces itself as a busy progress bar', () => {
    const { getByTestId } = renderWithProviders(<PlacardLoader testID="loader" words={['ACT']} />);

    const loader = getByTestId('loader');
    expect(loader.props.accessibilityRole).toBe('progressbar');
    expect(loader.props.accessibilityState).toEqual({ busy: true });
  });
});
