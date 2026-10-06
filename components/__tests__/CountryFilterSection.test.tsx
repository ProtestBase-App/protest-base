jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn().mockReturnValue('light') }));
jest.mock('@/utils/i18n', () => ({ t: jest.fn((key) => key) }));
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CountryFilterSection } from '@/components/CountryFilterSection';

describe('CountryFilterSection', () => {
  // Sheet content renders in the BottomSheetModalProvider portal, above every
  // app context provider, so the row must render with none of them mounted.
  it('renders without any app context provider', () => {
    const { getByLabelText } = render(
      <CountryFilterSection selected={null} onSelect={jest.fn()} userLanguage="fr" />
    );

    expect(getByLabelText('filters.countryAll').props.accessibilityState.selected).toBe(true);
    expect(getByLabelText('Belgique')).toBeTruthy();
    expect(getByLabelText('Pays-Bas')).toBeTruthy();
  });

  it('reports the tapped country, and null for All', () => {
    const onSelect = jest.fn();
    const { getByLabelText } = render(
      <CountryFilterSection selected="belgium" onSelect={onSelect} userLanguage="en" />
    );

    expect(getByLabelText('Belgium').props.accessibilityState.selected).toBe(true);

    fireEvent.press(getByLabelText('Netherlands'));
    fireEvent.press(getByLabelText('filters.countryAll'));

    expect(onSelect).toHaveBeenNthCalledWith(1, 'netherlands');
    expect(onSelect).toHaveBeenNthCalledWith(2, null);
  });
});
