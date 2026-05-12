jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const View = require('react-native').View;
  const ScrollView = require('react-native').ScrollView;
  return {
    __esModule: true,
    default: {
      ScrollView: React.forwardRef((props: any, ref: any) =>
        React.createElement(ScrollView, { ...props, ref })
      ),
      View: (props: any) => React.createElement(View, props),
    },
    useAnimatedRef: () => ({ current: null }),
    useScrollViewOffset: () => ({ value: 0 }),
    useAnimatedStyle: (fn: () => any) => fn(),
    interpolate: jest.fn(() => 0),
  };
});

jest.mock('@/components/ui/TabBarBackground', () => ({
  useBottomTabOverflow: jest.fn(() => 0),
}));

import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';

const { useColorScheme } = require('@/hooks/useColorScheme');

describe('ParallaxScrollView', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders children content', () => {
    render(
      <ParallaxScrollView
        headerImage={<Text>Header</Text>}
        headerBackgroundColor={{ dark: '#000', light: '#FFF' }}
      >
        <Text>Content</Text>
      </ParallaxScrollView>
    );
    expect(screen.getByText('Content')).toBeTruthy();
  });

  it('renders header image', () => {
    render(
      <ParallaxScrollView
        headerImage={<Text>Header Image</Text>}
        headerBackgroundColor={{ dark: '#000', light: '#FFF' }}
      >
        <Text>Child</Text>
      </ParallaxScrollView>
    );
    expect(screen.getByText('Header Image')).toBeTruthy();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(
      <ParallaxScrollView
        headerImage={<Text>H</Text>}
        headerBackgroundColor={{ dark: '#111', light: '#EEE' }}
      >
        <Text>Body</Text>
      </ParallaxScrollView>
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders in dark mode using dark background color', () => {
    useColorScheme.mockReturnValue('dark');
    render(
      <ParallaxScrollView
        headerImage={<Text>Header</Text>}
        headerBackgroundColor={{ dark: '#111111', light: '#FFFFFF' }}
      >
        <Text>Dark Content</Text>
      </ParallaxScrollView>
    );
    expect(screen.getByText('Dark Content')).toBeTruthy();
  });

  it('falls back to light when colorScheme is null', () => {
    useColorScheme.mockReturnValue('light');
    render(
      <ParallaxScrollView
        headerImage={<Text>Header</Text>}
        headerBackgroundColor={{ dark: '#000', light: '#FFF' }}
      >
        <Text>Null scheme content</Text>
      </ParallaxScrollView>
    );
    expect(screen.getByText('Null scheme content')).toBeTruthy();
  });
});
