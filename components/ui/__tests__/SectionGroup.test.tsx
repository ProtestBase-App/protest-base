jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import * as ReactNative from 'react-native';
import { SectionGroup } from '@/components/ui/SectionGroup';

describe('SectionGroup', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the title via SectionHeader', () => {
    render(
      <SectionGroup title="MY SETTINGS">
        <Text>Content</Text>
      </SectionGroup>
    );
    expect(screen.getByText('MY SETTINGS')).toBeTruthy();
  });

  it('renders children content', () => {
    render(
      <SectionGroup title="Section">
        <Text>Child element</Text>
      </SectionGroup>
    );
    expect(screen.getByText('Child element')).toBeTruthy();
  });

  it('renders with default variant', () => {
    render(
      <SectionGroup title="Default" variant="default">
        <Text>Default variant</Text>
      </SectionGroup>
    );
    expect(screen.getByText('Default variant')).toBeTruthy();
  });

  it('renders with highlight variant', () => {
    render(
      <SectionGroup title="Highlight" variant="highlight">
        <Text>Highlighted content</Text>
      </SectionGroup>
    );
    expect(screen.getByText('Highlighted content')).toBeTruthy();
  });

  it('renders with multiple children', () => {
    render(
      <SectionGroup title="Multi">
        <Text>Child One</Text>
        <Text>Child Two</Text>
      </SectionGroup>
    );
    expect(screen.getByText('Child One')).toBeTruthy();
    expect(screen.getByText('Child Two')).toBeTruthy();
  });

  it('renders highlight variant in dark mode (covers isDarkMode=true branches)', () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
    render(
      <SectionGroup title="Dark Highlight" variant="highlight">
        <Text>Dark mode content</Text>
      </SectionGroup>
    );
    expect(screen.getByText('Dark mode content')).toBeTruthy();
  });

  it('variant defaults to "default" when not provided', () => {
    render(
      <SectionGroup title="No variant">
        <Text>Default variant content</Text>
      </SectionGroup>
    );
    expect(screen.getByText('Default variant content')).toBeTruthy();
  });
});
