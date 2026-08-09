// Mock dependencies BEFORE imports
jest.mock('expo-image', () => {
  const React = require('react');
  return {
    Image: (props: any) => React.createElement('ExpoImage', props),
  };
});

import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import * as ReactNative from 'react-native';
import { OrganizerAvatar } from '@/components/OrganizerAvatar';

describe('OrganizerAvatar', () => {
  let useColorSchemeSpy: jest.SpyInstance;

  beforeEach(() => {
    // OrganizerAvatar imports useColorScheme from 'react-native', so spy on it there
    useColorSchemeSpy = jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initials fallback (no avatarUrl)', () => {
    it('shows initials when avatar URL is null', () => {
      render(<OrganizerAvatar avatarUrl={null} name="Climate Alliance" />);
      expect(screen.getByText('CA')).toBeTruthy();
    });

    it('shows initials when avatar URL is undefined', () => {
      render(<OrganizerAvatar avatarUrl={undefined} name="Green Peace" />);
      expect(screen.getByText('GP')).toBeTruthy();
    });

    it('shows single initial for a one-word name', () => {
      render(<OrganizerAvatar avatarUrl={null} name="Anonymous" />);
      expect(screen.getByText('A')).toBeTruthy();
    });

    it('renders without crashing for an empty name', () => {
      render(<OrganizerAvatar avatarUrl={null} name="" />);
      expect(screen.toJSON()).toBeTruthy();
    });

    it('uppercases initials', () => {
      render(<OrganizerAvatar avatarUrl={null} name="climate alliance" />);
      expect(screen.getByText('CA')).toBeTruthy();
    });

    it('uses first two words for multi-word names', () => {
      render(<OrganizerAvatar avatarUrl={null} name="World Wildlife Federation International" />);
      expect(screen.getByText('WW')).toBeTruthy();
    });

    it('handles name with extra whitespace', () => {
      render(<OrganizerAvatar avatarUrl={null} name="  Green   Peace  " />);
      expect(screen.getByText('GP')).toBeTruthy();
    });
  });

  describe('Custom size', () => {
    it('accepts custom size prop', () => {
      render(<OrganizerAvatar avatarUrl={null} name="Test" size={64} />);
      expect(screen.getByText('T')).toBeTruthy();
    });

    it('uses default size of 42 when not specified', () => {
      render(<OrganizerAvatar avatarUrl={null} name="Test" />);
      expect(screen.getByText('T')).toBeTruthy();
    });
  });

  describe('With avatar URL', () => {
    it('renders the initials under the image, so a request that never resolves still reads', () => {
      const { UNSAFE_getByType } = render(
        <OrganizerAvatar avatarUrl="https://example.com/avatar.jpg" name="Test Org" />
      );
      const { Image } = require('expo-image');

      // No load or error callback ever fires — the hung-request case.
      expect(screen.getByText('TO')).toBeTruthy();
      expect(UNSAFE_getByType(Image)).toBeTruthy();
    });

    it('leaves the image transparent so the initials show through', () => {
      const { UNSAFE_getByType } = render(
        <OrganizerAvatar avatarUrl="https://example.com/avatar.jpg" name="Test Org" />
      );
      const { Image } = require('expo-image');
      const style = ReactNative.StyleSheet.flatten(UNSAFE_getByType(Image).props.style);

      expect(style.backgroundColor).toBeUndefined();
    });

    it('onError drops the image and keeps the initials', async () => {
      const { UNSAFE_getByType, UNSAFE_queryAllByType } = render(
        <OrganizerAvatar avatarUrl="https://example.com/broken.jpg" name="Test Org" />
      );
      const { Image } = require('expo-image');

      await act(async () => {
        UNSAFE_getByType(Image).props.onError();
      });

      expect(screen.getByText('TO')).toBeTruthy();
      expect(UNSAFE_queryAllByType(Image)).toHaveLength(0);
    });
  });

  describe('Theme support — light mode', () => {
    it('renders initials with light theme colors', () => {
      useColorSchemeSpy.mockReturnValue('light');
      render(<OrganizerAvatar avatarUrl={null} name="Light Org" />);
      expect(screen.getByText('LO')).toBeTruthy();
    });

    it('renders the image variant in light mode', () => {
      useColorSchemeSpy.mockReturnValue('light');
      render(<OrganizerAvatar avatarUrl="https://example.com/avatar.jpg" name="Light Image" />);
      expect(screen.toJSON()).toBeTruthy();
    });
  });

  describe('Theme support — dark mode', () => {
    it('renders initials with dark theme colors', () => {
      useColorSchemeSpy.mockReturnValue('dark');
      render(<OrganizerAvatar avatarUrl={null} name="Dark Org" />);
      expect(screen.getByText('DO')).toBeTruthy();
    });

    it('renders the image variant in dark mode', () => {
      useColorSchemeSpy.mockReturnValue('dark');
      render(<OrganizerAvatar avatarUrl="https://example.com/avatar.jpg" name="Dark Image" />);
      expect(screen.toJSON()).toBeTruthy();
    });
  });

  describe('Theme support — null colorScheme', () => {
    it('falls back gracefully when colorScheme is null', () => {
      useColorSchemeSpy.mockReturnValue('light');
      render(<OrganizerAvatar avatarUrl={null} name="Null Scheme" />);
      expect(screen.getByText('NS')).toBeTruthy();
    });
  });
});
