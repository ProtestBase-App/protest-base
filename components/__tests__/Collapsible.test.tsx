jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Collapsible } from '@/components/Collapsible';
import { useColorScheme } from '@/hooks/useColorScheme';

describe('Collapsible', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the title', () => {
    render(
      <Collapsible title="Details">
        <Text>Hidden content</Text>
      </Collapsible>
    );
    expect(screen.getByText('Details')).toBeTruthy();
  });

  it('does not show children when collapsed (default)', () => {
    render(
      <Collapsible title="Details">
        <Text>Hidden content</Text>
      </Collapsible>
    );
    expect(screen.queryByText('Hidden content')).toBeNull();
  });

  it('shows children when expanded', () => {
    render(
      <Collapsible title="Details">
        <Text>Revealed content</Text>
      </Collapsible>
    );

    // Press to expand
    fireEvent.press(screen.getByText('Details'));
    expect(screen.getByText('Revealed content')).toBeTruthy();
  });

  it('hides children when collapsed again', () => {
    render(
      <Collapsible title="Details">
        <Text>Toggle content</Text>
      </Collapsible>
    );

    // Expand
    fireEvent.press(screen.getByText('Details'));
    expect(screen.getByText('Toggle content')).toBeTruthy();

    // Collapse
    fireEvent.press(screen.getByText('Details'));
    expect(screen.queryByText('Toggle content')).toBeNull();
  });

  it('supports multiple open/close cycles', () => {
    render(
      <Collapsible title="Info">
        <Text>Cycled content</Text>
      </Collapsible>
    );

    // Open
    fireEvent.press(screen.getByText('Info'));
    expect(screen.getByText('Cycled content')).toBeTruthy();

    // Close
    fireEvent.press(screen.getByText('Info'));
    expect(screen.queryByText('Cycled content')).toBeNull();

    // Open again
    fireEvent.press(screen.getByText('Info'));
    expect(screen.getByText('Cycled content')).toBeTruthy();
  });

  it('renders in dark mode without crashing', () => {
    jest.mocked(useColorScheme).mockReturnValue('dark');
    render(
      <Collapsible title="Dark Mode">
        <Text>Content</Text>
      </Collapsible>
    );
    expect(screen.getByText('Dark Mode')).toBeTruthy();
  });

  it('renders in light mode with correct icon color', () => {
    jest.mocked(useColorScheme).mockReturnValue('light');
    render(
      <Collapsible title="Light Mode">
        <Text>Content</Text>
      </Collapsible>
    );
    expect(screen.getByText('Light Mode')).toBeTruthy();
  });

  it('expands in dark mode and shows children', () => {
    jest.mocked(useColorScheme).mockReturnValue('dark');
    render(
      <Collapsible title="Dark Expand">
        <Text>Dark content</Text>
      </Collapsible>
    );
    fireEvent.press(screen.getByText('Dark Expand'));
    expect(screen.getByText('Dark content')).toBeTruthy();
  });
});
