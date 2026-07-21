jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

// Mock the service so nothing hits the network. The error class MUST be defined
// inline in the factory: jest.mock is hoisted above any outer class declaration,
// so referencing an out-of-scope class here yields `undefined` (breaking the
// component's `instanceof AddressSearchError` check).
jest.mock('@/services/address.service', () => ({
  searchAddress: jest.fn(),
  AddressSearchError: class AddressSearchError extends Error {
    kind: string;
    constructor(kind: string, message: string) {
      super(message);
      this.name = 'AddressSearchError';
      this.kind = kind;
    }
  },
}));

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import AddressAutocompleteField from '@/components/AddressAutocompleteField';
import { searchAddress, AddressSearchError } from '@/services/address.service';

const mockSearchAddress = searchAddress as jest.Mock;

const SUGGESTION = {
  street_address: 'Rue de la Loi 16',
  postal_code: '1000',
  city: 'Brussels',
  region: 'Brussels-Capital',
  country: 'belgium',
  lat: 50.8467,
  lng: 4.3625,
  label: 'Rue de la Loi 16, 1000, Brussels',
};

function renderField(
  overrides: Partial<React.ComponentProps<typeof AddressAutocompleteField>> = {}
) {
  const onSelect = jest.fn();
  const onClear = jest.fn();
  const onEdit = jest.fn();
  const utils = render(
    <AddressAutocompleteField
      value=""
      countryCode="be"
      lang="en"
      onSelect={onSelect}
      onClear={onClear}
      onEdit={onEdit}
      title="Street Address"
      placeholder="Search for an address…"
      searchingText="Searching…"
      noResultsText="No matching addresses found"
      errorText="Could not search addresses."
      unavailableText="Address search is unavailable."
      clearAccessibilityLabel="Clear street address"
      testID="street-input"
      {...overrides}
    />
  );
  return { onSelect, onClear, onEdit, ...utils };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('AddressAutocompleteField', () => {
  afterEach(() => jest.clearAllMocks());

  it('seeds the input with the accepted value and does not search on mount', async () => {
    renderField({ value: 'Legacy Street 7' });
    await act(async () => {
      await flush();
    });
    expect(screen.getByDisplayValue('Legacy Street 7')).toBeTruthy();
    expect(mockSearchAddress).not.toHaveBeenCalled();
  });

  it('searches (debounced) once the user types ≥3 chars and renders suggestion rows', async () => {
    mockSearchAddress.mockResolvedValue([SUGGESTION]);
    renderField();

    fireEvent.changeText(screen.getByTestId('street-input'), 'rue de la loi');

    const row = await screen.findByTestId('address-suggestion-0');
    expect(row).toBeTruthy();
    expect(mockSearchAddress).toHaveBeenCalledWith(
      'rue de la loi',
      'be',
      'en',
      undefined,
      expect.anything()
    );
  });

  it('forwards the postalCode hint to searchAddress when one is provided', async () => {
    mockSearchAddress.mockResolvedValue([SUGGESTION]);
    renderField({ postalCode: '1040' });

    fireEvent.changeText(screen.getByTestId('street-input'), 'avenue des casernes');
    await screen.findByTestId('address-suggestion-0');

    expect(mockSearchAddress).toHaveBeenCalledWith(
      'avenue des casernes',
      'be',
      'en',
      '1040',
      expect.anything()
    );
  });

  it('does not search when fewer than 3 chars are typed', async () => {
    mockSearchAddress.mockResolvedValue([]);
    renderField();

    fireEvent.changeText(screen.getByTestId('street-input'), 'ru');
    await act(async () => {
      await flush();
      await flush();
    });

    expect(mockSearchAddress).not.toHaveBeenCalled();
  });

  it('calls onSelect with the chosen suggestion', async () => {
    mockSearchAddress.mockResolvedValue([SUGGESTION]);
    const { onSelect } = renderField();

    fireEvent.changeText(screen.getByTestId('street-input'), 'rue de la loi');
    const row = await screen.findByTestId('address-suggestion-0');
    await act(async () => {
      fireEvent.press(row);
    });

    expect(onSelect).toHaveBeenCalledWith(SUGGESTION);
  });

  it('calls onClear when the clear button is pressed', async () => {
    const { onClear } = renderField({ value: 'Some Street 1' });
    await act(async () => {
      await flush();
    });

    fireEvent.press(screen.getByLabelText('Clear street address'));
    expect(onClear).toHaveBeenCalled();
  });

  it('shows the error message when the search fails generically', async () => {
    mockSearchAddress.mockRejectedValue(new AddressSearchError('generic', 'boom'));
    renderField();

    fireEvent.changeText(screen.getByTestId('street-input'), 'rue de la loi');
    expect(await screen.findByText('Could not search addresses.')).toBeTruthy();
  });

  it('shows the "unavailable" message on a 503/network failure', async () => {
    mockSearchAddress.mockRejectedValue(new AddressSearchError('unavailable', 'down'));
    renderField();

    fireEvent.changeText(screen.getByTestId('street-input'), 'rue de la loi');
    expect(await screen.findByText('Address search is unavailable.')).toBeTruthy();
  });

  it('shows "no results" on an empty array', async () => {
    mockSearchAddress.mockResolvedValue([]);
    renderField();

    fireEvent.changeText(screen.getByTestId('street-input'), 'zzzzz');
    expect(await screen.findByText('No matching addresses found')).toBeTruthy();
  });

  it('re-syncs the displayed value when the accepted value changes upstream', async () => {
    const { rerender } = renderField({ value: '' });
    rerender(
      <AddressAutocompleteField
        value="Newly Loaded Street 9"
        countryCode="be"
        lang="en"
        onSelect={jest.fn()}
        onClear={jest.fn()}
        title="Street Address"
        placeholder="Search for an address…"
        searchingText="Searching…"
        noResultsText="No matching addresses found"
        errorText="Could not search addresses."
        unavailableText="Address search is unavailable."
        clearAccessibilityLabel="Clear street address"
        testID="street-input"
      />
    );
    await act(async () => {
      await flush();
    });
    expect(screen.getByDisplayValue('Newly Loaded Street 9')).toBeTruthy();
  });

  it('is not editable when no country is selected', async () => {
    renderField({ countryCode: null });
    const input = screen.getByTestId('street-input');
    expect(input.props.editable).toBe(false);
  });

  it('fires onEdit when the user types (text diverges from the accepted value)', async () => {
    mockSearchAddress.mockResolvedValue([]);
    const { onEdit } = renderField();

    fireEvent.changeText(screen.getByTestId('street-input'), 'rue');

    expect(onEdit).toHaveBeenCalled();
  });

  it('does not fire onEdit on mount or on an upstream value re-sync', async () => {
    const onEdit = jest.fn();
    const { rerender } = renderField({ value: '', onEdit });
    await act(async () => {
      await flush();
    });
    // Mount alone never signals an edit.
    expect(onEdit).not.toHaveBeenCalled();

    rerender(
      <AddressAutocompleteField
        value="Loaded From Draft 3"
        countryCode="be"
        lang="en"
        onSelect={jest.fn()}
        onClear={jest.fn()}
        onEdit={onEdit}
        title="Street Address"
        placeholder="Search for an address…"
        searchingText="Searching…"
        noResultsText="No matching addresses found"
        errorText="Could not search addresses."
        unavailableText="Address search is unavailable."
        clearAccessibilityLabel="Clear street address"
        testID="street-input"
      />
    );
    await act(async () => {
      await flush();
    });
    // A programmatic re-sync (draft/legacy load) is not a user edit.
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('does not fire onEdit when a suggestion is selected', async () => {
    mockSearchAddress.mockResolvedValue([SUGGESTION]);
    const { onEdit } = renderField();

    fireEvent.changeText(screen.getByTestId('street-input'), 'rue de la loi');
    const row = await screen.findByTestId('address-suggestion-0');
    onEdit.mockClear(); // ignore the typing that surfaced the row
    await act(async () => {
      fireEvent.press(row);
    });

    expect(onEdit).not.toHaveBeenCalled();
  });
});

describe('AddressAutocompleteField — keyboard-host focus signal', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('signals focus immediately and blur only after the tap-grace delay', () => {
    jest.useFakeTimers();
    const onFocusChange = jest.fn();
    renderField({ onFocusChange });
    const input = screen.getByTestId('street-input');

    fireEvent(input, 'focus');
    expect(onFocusChange).toHaveBeenLastCalledWith(true);

    fireEvent(input, 'blur');
    // Not yet — a suggestion tap must land before the reserved band collapses.
    expect(onFocusChange).toHaveBeenLastCalledWith(true);

    act(() => {
      jest.advanceTimersByTime(120);
    });
    expect(onFocusChange).toHaveBeenLastCalledWith(false);
  });

  it('cancels the pending blur signal when the input is refocused within the grace window', () => {
    jest.useFakeTimers();
    const onFocusChange = jest.fn();
    renderField({ onFocusChange });
    const input = screen.getByTestId('street-input');

    fireEvent(input, 'focus');
    fireEvent(input, 'blur');
    act(() => {
      jest.advanceTimersByTime(50);
    });
    fireEvent(input, 'focus');
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // The stale blur never fires: the host keeps the headroom reserved.
    expect(onFocusChange.mock.calls.map((c) => c[0])).toEqual([true, true]);
  });

  it('releases the signal when unmounted while focused (e.g. country deselected)', () => {
    const onFocusChange = jest.fn();
    const { unmount } = renderField({ onFocusChange });

    fireEvent(screen.getByTestId('street-input'), 'focus');
    expect(onFocusChange).toHaveBeenLastCalledWith(true);

    unmount();
    expect(onFocusChange).toHaveBeenLastCalledWith(false);
  });

  it('does not signal on mount when never focused', () => {
    const onFocusChange = jest.fn();
    const { unmount } = renderField({ onFocusChange });
    expect(onFocusChange).not.toHaveBeenCalled();
    // Unmount without focus stays silent too — nothing was reserved.
    unmount();
    expect(onFocusChange).not.toHaveBeenCalled();
  });
});
