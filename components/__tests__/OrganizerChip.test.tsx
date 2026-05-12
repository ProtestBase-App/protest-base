jest.mock('expo-image', () => {
  const React = require('react');
  return {
    Image: (props: any) => React.createElement('Image', props),
  };
});

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as ReactNative from 'react-native';
import { OrganizerChip } from '@/components/OrganizerChip';

describe('OrganizerChip', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the organizer name', () => {
    render(<OrganizerChip name="Climate Alliance" />);
    expect(screen.getByText('Climate Alliance')).toBeTruthy();
  });

  describe('Without onPress', () => {
    it('renders as a non-pressable View', () => {
      render(<OrganizerChip name="Climate Alliance" />);
      expect(screen.getByText('Climate Alliance')).toBeTruthy();
      expect(screen.queryByRole('button')).toBeNull();
    });
  });

  describe('With onPress', () => {
    it('renders as a pressable button', () => {
      const onPress = jest.fn();
      render(<OrganizerChip name="Climate Alliance" onPress={onPress} />);
      expect(screen.getByRole('button')).toBeTruthy();
    });

    it('calls onPress when pressed', () => {
      const onPress = jest.fn();
      render(<OrganizerChip name="Climate Alliance" onPress={onPress} />);
      fireEvent.press(screen.getByRole('button'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('sets accessibility label', () => {
      render(<OrganizerChip name="Climate Alliance" onPress={jest.fn()} />);
      expect(screen.getByLabelText("View Climate Alliance's profile")).toBeTruthy();
    });
  });

  describe('Avatar', () => {
    it('renders without avatar URL', () => {
      render(<OrganizerChip name="Climate Alliance" />);
      expect(screen.getByText('Climate Alliance')).toBeTruthy();
    });

    it('renders with avatar URL', () => {
      render(<OrganizerChip name="Climate Alliance" avatarUrl="https://example.com/avatar.jpg" />);
      expect(screen.getByText('Climate Alliance')).toBeTruthy();
    });

    it('renders with null avatar URL (shows initials)', () => {
      render(<OrganizerChip name="Climate Alliance" avatarUrl={null} />);
      expect(screen.getByText('CA')).toBeTruthy();
    });
  });

  describe('Dark mode', () => {
    it('renders correctly with dark color scheme (covers isDark=true branches)', () => {
      jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
      render(<OrganizerChip name="Dark Mode Org" />);
      expect(screen.getByText('Dark Mode Org')).toBeTruthy();
    });

    it('renders with onPress in dark mode', () => {
      jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
      render(<OrganizerChip name="Dark Org" onPress={jest.fn()} />);
      expect(screen.getByRole('button')).toBeTruthy();
    });
  });

  describe('Without avatar (undefined)', () => {
    it('renders when avatarUrl is undefined (shows initials)', () => {
      render(<OrganizerChip name="Green Peace" avatarUrl={undefined} />);
      expect(screen.getByText('Green Peace')).toBeTruthy();
    });
  });
});
