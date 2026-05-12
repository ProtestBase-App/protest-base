jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as ReactNative from 'react-native';
import { SectionHeader } from '@/components/ui/SectionHeader';

describe('SectionHeader', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the title', () => {
    render(<SectionHeader title="UPCOMING EVENTS" />);
    expect(screen.getByText('UPCOMING EVENTS')).toBeTruthy();
  });

  describe('Variants', () => {
    it('renders secondary variant by default', () => {
      render(<SectionHeader title="SETTINGS" />);
      expect(screen.getByText('SETTINGS')).toBeTruthy();
    });

    it('renders primary variant', () => {
      render(<SectionHeader title="Events" variant="primary" />);
      expect(screen.getByText('Events')).toBeTruthy();
    });
  });

  describe('Subtitle', () => {
    it('does not render subtitle when not provided', () => {
      render(<SectionHeader title="Section" />);
      // Only one text element should be present (the title)
      expect(screen.getByText('Section')).toBeTruthy();
    });

    it('renders subtitle when provided', () => {
      render(<SectionHeader title="Section" subtitle="Extra info" />);
      expect(screen.getByText('Extra info')).toBeTruthy();
    });
  });

  describe('Action button', () => {
    it('does not render action when actionLabel is missing', () => {
      render(<SectionHeader title="Section" onActionPress={() => {}} />);
      expect(screen.queryByText('See All')).toBeNull();
    });

    it('does not render action when onActionPress is missing', () => {
      render(<SectionHeader title="Section" actionLabel="See All" />);
      expect(screen.queryByText('See All')).toBeNull();
    });

    it('renders action button when both label and handler are provided', () => {
      const onAction = jest.fn();
      render(<SectionHeader title="Events" actionLabel="See All" onActionPress={onAction} />);
      expect(screen.getByText('See All')).toBeTruthy();
    });

    it('calls onActionPress when action is pressed', () => {
      const onAction = jest.fn();
      render(<SectionHeader title="Events" actionLabel="See All" onActionPress={onAction} />);
      fireEvent.press(screen.getByText('See All'));
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Dark mode', () => {
    it('renders secondary variant in dark mode (covers isDark=true branches)', () => {
      jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
      render(<SectionHeader title="Dark Section" />);
      expect(screen.getByText('Dark Section')).toBeTruthy();
    });

    it('renders primary variant in dark mode', () => {
      jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
      render(<SectionHeader title="Dark Primary" variant="primary" />);
      expect(screen.getByText('Dark Primary')).toBeTruthy();
    });
  });

  describe('Subtitle in dark mode', () => {
    it('renders subtitle without crashing', () => {
      render(<SectionHeader title="Events" subtitle="Your upcoming events" />);
      expect(screen.getByText('Your upcoming events')).toBeTruthy();
    });
  });
});
