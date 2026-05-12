jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';

describe('ThemedView', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders children content', () => {
    render(
      <ThemedView>
        <Text>Child content</Text>
      </ThemedView>
    );
    expect(screen.getByText('Child content')).toBeTruthy();
  });

  it('applies custom style', () => {
    render(
      <ThemedView style={{ padding: 20 }}>
        <Text>Styled view</Text>
      </ThemedView>
    );
    expect(screen.getByText('Styled view')).toBeTruthy();
  });

  it('renders in light mode', () => {
    jest.mocked(useColorScheme).mockReturnValue('light');
    render(
      <ThemedView>
        <Text>Light mode</Text>
      </ThemedView>
    );
    expect(screen.getByText('Light mode')).toBeTruthy();
  });

  it('renders in dark mode', () => {
    jest.mocked(useColorScheme).mockReturnValue('dark');
    render(
      <ThemedView>
        <Text>Dark mode</Text>
      </ThemedView>
    );
    expect(screen.getByText('Dark mode')).toBeTruthy();
  });

  it('accepts lightColor override', () => {
    render(
      <ThemedView lightColor="#FFFFFF">
        <Text>Custom light bg</Text>
      </ThemedView>
    );
    expect(screen.getByText('Custom light bg')).toBeTruthy();
  });

  it('accepts darkColor override', () => {
    jest.mocked(useColorScheme).mockReturnValue('dark');
    render(
      <ThemedView darkColor="#000000">
        <Text>Custom dark bg</Text>
      </ThemedView>
    );
    expect(screen.getByText('Custom dark bg')).toBeTruthy();
  });

  it('passes other props through', () => {
    render(
      <ThemedView testID="themed-container">
        <Text>Passthrough</Text>
      </ThemedView>
    );
    expect(screen.getByTestId('themed-container')).toBeTruthy();
  });

  it('passes accessibility props', () => {
    render(
      <ThemedView accessibilityLabel="Container">
        <Text>Accessible</Text>
      </ThemedView>
    );
    expect(screen.getByLabelText('Container')).toBeTruthy();
  });
});
