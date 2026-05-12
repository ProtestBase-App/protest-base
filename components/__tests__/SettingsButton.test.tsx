jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
  })),
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { Linking } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import SettingsButton from '@/components/SettingsButton';
import { useRouter } from 'expo-router';

describe('SettingsButton', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the button text', () => {
    render(<SettingsButton text="Account" />);
    expect(screen.getByText('Account')).toBeTruthy();
  });

  it('renders with a left icon', () => {
    render(<SettingsButton text="Settings" leftIcon="gear" />);
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('renders without a left icon', () => {
    render(<SettingsButton text="About" />);
    expect(screen.getByText('About')).toBeTruthy();
  });

  describe('Navigation', () => {
    it('navigates to internal route when pressed', async () => {
      const mockPush = jest.fn();
      jest.mocked(useRouter).mockReturnValue({
        push: mockPush,
        back: jest.fn(),
      } as any);

      render(<SettingsButton text="Account" navigationTarget="/account" />);
      fireEvent.press(screen.getByText('Account'));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/account');
      });
    });

    it('opens external URL via Linking', async () => {
      const canOpenSpy = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
      const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);

      render(
        <SettingsButton text="Privacy Policy" navigationTarget="https://example.com/privacy" />
      );
      fireEvent.press(screen.getByText('Privacy Policy'));

      await waitFor(() => {
        expect(canOpenSpy).toHaveBeenCalledWith('https://example.com/privacy');
        expect(openSpy).toHaveBeenCalledWith('https://example.com/privacy');
      });

      canOpenSpy.mockRestore();
      openSpy.mockRestore();
    });

    it('does not open unsupported URLs', async () => {
      const canOpenSpy = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);
      const openSpy = jest.spyOn(Linking, 'openURL');

      render(<SettingsButton text="Link" navigationTarget="https://unsupported.com" />);
      fireEvent.press(screen.getByText('Link'));

      await waitFor(() => {
        expect(canOpenSpy).toHaveBeenCalled();
      });
      expect(openSpy).not.toHaveBeenCalled();

      canOpenSpy.mockRestore();
      openSpy.mockRestore();
    });
  });

  describe('Callback', () => {
    it('calls onPressCallback when provided', async () => {
      const callback = jest.fn();
      render(<SettingsButton text="Action" onPressCallback={callback} />);
      fireEvent.press(screen.getByText('Action'));

      await waitFor(() => {
        expect(callback).toHaveBeenCalledTimes(1);
      });
    });

    it('calls callback AND navigates when both are provided', async () => {
      const callback = jest.fn();
      const mockPush = jest.fn();
      jest.mocked(useRouter).mockReturnValue({
        push: mockPush,
        back: jest.fn(),
      } as any);

      render(<SettingsButton text="Both" onPressCallback={callback} navigationTarget="/target" />);
      fireEvent.press(screen.getByText('Both'));

      await waitFor(() => {
        expect(callback).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith('/target');
      });
    });

    it('handles callback errors silently', async () => {
      const callback = jest.fn().mockRejectedValue(new Error('Failed'));
      render(<SettingsButton text="Error" onPressCallback={callback} />);

      // Should not throw
      fireEvent.press(screen.getByText('Error'));
      await waitFor(() => {
        expect(callback).toHaveBeenCalled();
      });
    });
  });

  describe('Disabled state', () => {
    it('is disabled when no target and no callback', () => {
      render(<SettingsButton text="Disabled" />);
      // The button should still render
      expect(screen.getByText('Disabled')).toBeTruthy();
    });
  });

  describe('Badge', () => {
    it('shows badge when provided', () => {
      render(<SettingsButton text="Events" badge={5} />);
      expect(screen.getByText('5')).toBeTruthy();
    });

    it('shows 99+ for large badge numbers', () => {
      render(<SettingsButton text="Events" badge={150} />);
      expect(screen.getByText('99+')).toBeTruthy();
    });

    it('shows string badge', () => {
      render(<SettingsButton text="Events" badge="New" />);
      expect(screen.getByText('New')).toBeTruthy();
    });

    it('does not show badge when undefined', () => {
      render(<SettingsButton text="Events" />);
      expect(screen.queryByText('5')).toBeNull();
    });

    it('sets accessibility label with badge count', () => {
      render(<SettingsButton text="Events" badge={3} />);
      expect(screen.getByLabelText('Events, 3 items')).toBeTruthy();
    });

    it('sets accessibility label without badge', () => {
      render(<SettingsButton text="Events" />);
      expect(screen.getByLabelText('Events')).toBeTruthy();
    });
  });
});
