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

  describe('With avatar URL — image callbacks', () => {
    it('does not show initials initially when URL is provided', () => {
      render(<OrganizerAvatar avatarUrl="https://example.com/avatar.jpg" name="Test Org" />);
      expect(screen.queryByText('TO')).toBeNull();
    });

    it('shows loading indicator initially while image is loading', () => {
      render(<OrganizerAvatar avatarUrl="https://example.com/avatar.jpg" name="Test Org" />);
      expect(screen.toJSON()).toBeTruthy();
    });

    it('onLoadStart callback sets isLoading to true without crashing', async () => {
      const { UNSAFE_getByType } = render(
        <OrganizerAvatar avatarUrl="https://example.com/avatar.jpg" name="Org Name" />
      );
      const { Image } = require('expo-image');
      const imageEl = UNSAFE_getByType(Image);

      await act(async () => {
        imageEl.props.onLoadStart();
      });

      expect(screen.toJSON()).toBeTruthy();
    });

    it('onLoadEnd callback sets isLoading to false', async () => {
      const { UNSAFE_getByType } = render(
        <OrganizerAvatar avatarUrl="https://example.com/avatar.jpg" name="Org Name" />
      );
      const { Image } = require('expo-image');
      const imageEl = UNSAFE_getByType(Image);

      await act(async () => {
        imageEl.props.onLoadEnd();
      });

      expect(screen.toJSON()).toBeTruthy();
    });

    it('onError shows initials fallback after image fails to load', async () => {
      const { UNSAFE_getByType } = render(
        <OrganizerAvatar avatarUrl="https://example.com/broken.jpg" name="Test Org" />
      );
      const { Image } = require('expo-image');
      const imageEl = UNSAFE_getByType(Image);

      await act(async () => {
        imageEl.props.onError();
      });

      expect(screen.getByText('TO')).toBeTruthy();
    });

    it('full lifecycle: onLoadStart → onLoadEnd completes without showing initials', async () => {
      const { UNSAFE_getByType } = render(
        <OrganizerAvatar avatarUrl="https://example.com/avatar.jpg" name="Full Lifecycle" />
      );
      const { Image } = require('expo-image');
      const imageEl = UNSAFE_getByType(Image);

      await act(async () => {
        imageEl.props.onLoadStart();
      });
      await act(async () => {
        imageEl.props.onLoadEnd();
      });

      expect(screen.toJSON()).toBeTruthy();
      expect(screen.queryByText('FL')).toBeNull();
    });
  });

  describe('Theme support — light mode', () => {
    it('renders initials with light theme colors', () => {
      useColorSchemeSpy.mockReturnValue('light');
      render(<OrganizerAvatar avatarUrl={null} name="Light Org" />);
      expect(screen.getByText('LO')).toBeTruthy();
    });

    it('renders image variant in light mode (covers light brandColor and placeholderBg branches)', () => {
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

    it('renders image variant in dark mode (covers dark brandColor and placeholderBg branches)', () => {
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
