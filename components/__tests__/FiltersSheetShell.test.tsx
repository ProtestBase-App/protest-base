jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn().mockReturnValue('light') }));
jest.mock('@/utils/i18n', () => ({ t: jest.fn((key) => key) }));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { Text } from 'react-native';
import { renderWithProviders, fireEvent } from '@/test-utils/render';
import { FiltersSheetShell, FiltersSheetSectionLabel } from '@/components/FiltersSheetShell';

describe('FiltersSheetShell', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    title: 'Sheet Title',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not present the sheet body while visible is false', () => {
    // BottomSheetModal is imperative: with visible=false the shell never calls
    // present(), so nothing mounts.
    const { queryByText } = renderWithProviders(
      <FiltersSheetShell {...defaultProps} visible={false}>
        <Text>Sheet body</Text>
      </FiltersSheetShell>
    );

    expect(queryByText('Sheet Title')).toBeNull();
    expect(queryByText('Sheet body')).toBeNull();
  });

  it('does not fire onClose on first mount when never presented', () => {
    // The presentedRef guard means dismiss() is only called if present() was
    // called first. Mounting with visible=false must not trigger dismiss() →
    // onDismiss → onClose, even though the effect runs on mount.
    const onClose = jest.fn();
    const { queryByText } = renderWithProviders(
      <FiltersSheetShell visible={false} onClose={onClose} title="Sheet Title">
        <Text>Sheet body</Text>
      </FiltersSheetShell>
    );

    expect(onClose).not.toHaveBeenCalled();
    expect(queryByText('Sheet body')).toBeNull();
  });

  it('presents the title and children when visible is true', () => {
    const { getByText } = renderWithProviders(
      <FiltersSheetShell {...defaultProps}>
        <Text>Sheet body</Text>
      </FiltersSheetShell>
    );

    expect(getByText('Sheet Title')).toBeTruthy();
    expect(getByText('Sheet body')).toBeTruthy();
  });

  it('dismisses the sheet and funnels onClose when visible flips to false', () => {
    // Flipping visible→false drives dismiss(); the sheet hides and the dismissal
    // funnels back through onDismiss → onClose — the same path swipe-down /
    // backdrop-tap / hardware-back take at runtime. The shell never calls
    // onClose itself on hide, so this proves the onDismiss wiring.
    const onClose = jest.fn();
    const { getByText, queryByText, rerender } = renderWithProviders(
      <FiltersSheetShell {...defaultProps} onClose={onClose}>
        <Text>Sheet body</Text>
      </FiltersSheetShell>
    );

    expect(getByText('Sheet Title')).toBeTruthy();

    rerender(
      <FiltersSheetShell {...defaultProps} visible={false} onClose={onClose}>
        <Text>Sheet body</Text>
      </FiltersSheetShell>
    );

    expect(queryByText('Sheet Title')).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close button is pressed', () => {
    const onClose = jest.fn();
    const { getByLabelText } = renderWithProviders(
      <FiltersSheetShell {...defaultProps} onClose={onClose}>
        <Text>Sheet body</Text>
      </FiltersSheetShell>
    );

    fireEvent.press(getByLabelText('common.close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('FiltersSheetSectionLabel', () => {
  it('renders the label text', () => {
    const { getByText } = renderWithProviders(
      <FiltersSheetSectionLabel label="filters.category" />
    );

    expect(getByText('filters.category')).toBeTruthy();
  });
});
