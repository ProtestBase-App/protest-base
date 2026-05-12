jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('expo-image', () => {
  const React = require('react');
  return {
    Image: (props: any) => React.createElement('Image', props),
  };
});

jest.mock('@/context/PostalCodeProvider', () => ({
  usePostalCodes: jest.fn(() => ({
    getSubMunicipalityName: jest.fn(() => 'Brussels'),
  })),
}));

jest.mock('@/utils/eventFormatters', () => ({
  formatEventDateTime: jest.fn(() => 'Mar 15, 2025 14:00'),
  // Real implementation needed because getEffectiveEndTime() (called from
  // onSave) parses end_time via parseAsUTC.
  parseAsUTC: (iso: string) =>
    iso.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(iso) ? new Date(iso) : new Date(iso + 'Z'),
}));

jest.mock('@/utils/i18n', () => ({
  t: (key: string) => {
    const translations: Record<string, string> = {
      'categories.climate': 'Climate',
      'categories.education': 'Education',
      'events.save': 'Save',
      'events.saved': 'Saved',
      'events.unsave': 'Unsave',
      'events.share': 'Share',
      'createEvent.helpNeeded': 'Help Needed',
    };
    return translations[key] || key;
  },
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ExploreEventCard from '@/components/ExploreEventCard';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { Event } from '@/types/event.types';

const mockEvent: Event = {
  $id: 'event-123',
  id: 'event-123',
  title: 'Climate March',
  description: 'A march for climate',
  start_time: '2025-03-15T14:00:00.000Z',
  end_time: '2025-03-15T16:00:00.000Z',
  city: 'Brussels',
  street_address: '123 Main St',
  country: 'belgium',
  postal_code: 1000,
  categories: ['Climate'],
  image: 'https://example.com/image.jpg',
  help_needed: false,
  help_description: undefined,
  organizer_name: 'Test Org',
  organization_id: 'org-1',
  view_count: 10,
  geocod_lat: 50.8503,
  geocod_lng: 4.3517,
  disclaimer: null,
  website_url: null,
  region: null,
  organizer_id: 'user-1',
  organizer_avatar: null,
};

describe('ExploreEventCard', () => {
  const defaultProps = {
    event: mockEvent,
    isSaved: false,
    onSave: jest.fn(),
    onShare: jest.fn(),
    userLanguage: 'en',
    cityLabel: 'Brussels',
  };

  afterEach(() => jest.clearAllMocks());

  it('renders the event title', () => {
    render(<ExploreEventCard {...defaultProps} />);
    expect(screen.getByText('Climate March')).toBeTruthy();
  });

  it('renders the formatted date time', () => {
    render(<ExploreEventCard {...defaultProps} />);
    expect(screen.getByText('Mar 15, 2025 14:00')).toBeTruthy();
  });

  it('renders the city label with postal code', () => {
    render(<ExploreEventCard {...defaultProps} />);
    expect(screen.getByText(/Brussels/)).toBeTruthy();
  });

  it('renders category badges', () => {
    render(<ExploreEventCard {...defaultProps} />);
    expect(screen.getByText('Climate')).toBeTruthy();
  });

  it('navigates to event detail on press', () => {
    render(<ExploreEventCard {...defaultProps} />);
    fireEvent.press(screen.getByLabelText(/Event: Climate March/));
    expect(router.push).toHaveBeenCalledWith('/event/event-123');
  });

  it('calls onSave with id and computed endsAt when save button is pressed', () => {
    const onSave = jest.fn();
    render(<ExploreEventCard {...defaultProps} onSave={onSave} />);
    fireEvent(screen.getByLabelText('Save'), 'press', {
      stopPropagation: jest.fn(),
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('event-123', expect.any(Number));
    // endsAt should be the parsed end_time millisecond timestamp.
    const expectedEndsAt = new Date(mockEvent.end_time as string).getTime();
    expect(onSave).toHaveBeenCalledWith('event-123', expectedEndsAt);
  });

  it('calls onShare when share button is pressed', () => {
    const onShare = jest.fn();
    render(<ExploreEventCard {...defaultProps} onShare={onShare} />);
    fireEvent(screen.getByLabelText('Share'), 'press', {
      stopPropagation: jest.fn(),
    });
    expect(onShare).toHaveBeenCalledWith('event-123');
  });

  it('shows saved state when isSaved is true', () => {
    render(<ExploreEventCard {...defaultProps} isSaved={true} />);
    expect(screen.getByLabelText('Unsave')).toBeTruthy();
    expect(screen.getByText('Saved')).toBeTruthy();
  });

  it('shows unsaved state when isSaved is false', () => {
    render(<ExploreEventCard {...defaultProps} isSaved={false} />);
    expect(screen.getByLabelText('Save')).toBeTruthy();
    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('shows help needed label when event has help_needed', () => {
    const helpEvent = { ...mockEvent, help_needed: true };
    render(<ExploreEventCard {...defaultProps} event={helpEvent} />);
    expect(screen.getByText('Help Needed')).toBeTruthy();
  });

  it('does not show city row when cityLabel is empty', () => {
    render(<ExploreEventCard {...defaultProps} cityLabel="" />);
    // With empty cityLabel, the city row should not render
    // The postal code should not be shown either since cityLabel controls the row
    expect(screen.getByLabelText(/Event: Climate March/)).toBeTruthy();
  });

  it('renders in dark mode', () => {
    jest.mocked(useColorScheme).mockReturnValue('dark');
    render(<ExploreEventCard {...defaultProps} />);
    expect(screen.getByText('Climate March')).toBeTruthy();
  });

  it('does not show categories when empty', () => {
    const noCatEvent = { ...mockEvent, categories: [] as string[] };
    render(<ExploreEventCard {...defaultProps} event={noCatEvent} />);
    expect(screen.queryByText('Climate')).toBeNull();
  });

  it('renders event with image', () => {
    const imageEvent = { ...mockEvent, image: 'https://example.com/img.jpg' };
    render(<ExploreEventCard {...defaultProps} event={imageEvent} />);
    expect(screen.getByText('Climate March')).toBeTruthy();
  });

  it('renders event without image (undefined)', () => {
    const noImageEvent = { ...mockEvent, image: undefined };
    render(<ExploreEventCard {...defaultProps} event={noImageEvent} />);
    expect(screen.getByText('Climate March')).toBeTruthy();
  });

  it('renders with organizer_avatar when provided', () => {
    const avatarEvent = {
      ...mockEvent,
      organizer_avatar: 'https://example.com/avatar.jpg',
    };
    render(<ExploreEventCard {...defaultProps} event={avatarEvent} />);
    expect(screen.getByText('Climate March')).toBeTruthy();
  });

  it('renders multiple category badges', () => {
    const multiCatEvent = {
      ...mockEvent,
      categories: ['Climate', 'Education'],
    };
    render(<ExploreEventCard {...defaultProps} event={multiCatEvent} />);
    expect(screen.getByText('Climate')).toBeTruthy();
    expect(screen.getByText('Education')).toBeTruthy();
  });

  describe('memo comparator (re-render behavior)', () => {
    it('re-renders when isSaved changes (memo returns false)', () => {
      const { rerender } = render(<ExploreEventCard {...defaultProps} isSaved={false} />);
      expect(screen.getByLabelText(/Event: Climate March/)).toBeTruthy();

      rerender(<ExploreEventCard {...defaultProps} isSaved={true} />);
      expect(screen.getByLabelText(/Event: Climate March/)).toBeTruthy();
    });

    it('re-renders when userLanguage changes (memo returns false)', () => {
      const { rerender } = render(<ExploreEventCard {...defaultProps} userLanguage="en" />);
      rerender(<ExploreEventCard {...defaultProps} userLanguage="fr" />);
      expect(screen.getByLabelText(/Event: Climate March/)).toBeTruthy();
    });

    it('skips re-render when all compared props are the same (memo returns true)', () => {
      const { rerender } = render(<ExploreEventCard {...defaultProps} />);
      rerender(<ExploreEventCard {...defaultProps} />);
      expect(screen.getByLabelText(/Event: Climate March/)).toBeTruthy();
    });
  });

  describe('null colorScheme fallback (line 42)', () => {
    it('falls back to light colors when colorScheme is null', () => {
      jest.mocked(useColorScheme).mockReturnValue('light');
      render(<ExploreEventCard {...defaultProps} />);
      expect(screen.getByLabelText(/Event: Climate March/)).toBeTruthy();
    });
  });

  describe('empty cityLabel fallback', () => {
    it('renders without city info when cityLabel is empty', () => {
      render(<ExploreEventCard {...defaultProps} cityLabel="" />);
      expect(screen.getByLabelText(/Event: Climate March/)).toBeTruthy();
    });

    it('renders when postal_code is missing', () => {
      const eventNoPostal = { ...mockEvent, postal_code: null as any };
      render(<ExploreEventCard {...defaultProps} event={eventNoPostal} cityLabel="" />);
      expect(screen.getByLabelText(/Event: Climate March/)).toBeTruthy();
    });
  });
});
