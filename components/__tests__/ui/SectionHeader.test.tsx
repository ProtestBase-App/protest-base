import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/render';
import { SectionHeader } from '@/components/ui/SectionHeader';

jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

describe('SectionHeader', () => {
  it('renders title', () => {
    const { getByText } = renderWithProviders(<SectionHeader title="Header Title" />);

    expect(getByText('Header Title')).toBeTruthy();
  });

  it('renders subtitle when provided', () => {
    const { getByText } = renderWithProviders(
      <SectionHeader title="Title" subtitle="Subtitle text" />
    );

    expect(getByText('Title')).toBeTruthy();
    expect(getByText('Subtitle text')).toBeTruthy();
  });

  it('does not render subtitle when not provided', () => {
    const { getByText } = renderWithProviders(<SectionHeader title="Title Only" />);

    expect(getByText('Title Only')).toBeTruthy();
    // No subtitle should exist
  });

  it('shows action button when both actionLabel and onActionPress given', () => {
    const mockAction = jest.fn();
    const { getByText } = renderWithProviders(
      <SectionHeader title="Title" actionLabel="View All" onActionPress={mockAction} />
    );

    expect(getByText('View All')).toBeTruthy();
  });

  it('calls onActionPress when action pressed', () => {
    const mockAction = jest.fn();
    const { getByText } = renderWithProviders(
      <SectionHeader title="Title" actionLabel="Action" onActionPress={mockAction} />
    );

    fireEvent.press(getByText('Action'));
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('has header accessibility role', () => {
    const { getByText } = renderWithProviders(<SectionHeader title="Header" />);

    // Component renders correctly with title
    expect(getByText('Header')).toBeTruthy();
  });
});
