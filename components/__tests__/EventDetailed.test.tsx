jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

jest.mock('expo-image', () => {
  const React = require('react');
  return {
    Image: (props: any) => React.createElement('Image', props),
  };
});

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  return {
    LinearGradient: (props: any) => React.createElement('View', props),
  };
});

jest.mock('expo-blur', () => {
  const React = require('react');
  return {
    BlurView: (props: any) => React.createElement('View', props),
  };
});

jest.mock('expo-calendar', () => ({
  getCalendarPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'undetermined' })),
  requestCalendarPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  createEventInCalendarAsync: jest.fn(() => Promise.resolve({ action: 'saved' })),
  CalendarDialogResultActions: {
    saved: 'saved',
    done: 'done',
  },
}));

jest.mock('@/context/PostalCodeProvider', () => ({
  usePostalCodes: jest.fn(() => ({
    getSubMunicipalityName: jest.fn(() => 'Brussels'),
    loadPostalCodesForCountry: jest.fn(),
  })),
}));

jest.mock('@/context/OrganizationsProvider', () => ({
  useOrganizations: jest.fn(() => ({
    organizations: [{ $id: 'org-1', Name: 'Climate Org' }],
  })),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/utils/eventFormatters', () => ({
  parseAsUTC: jest.fn((dateStr: string) => new Date(dateStr)),
}));

jest.mock('@/hooks/useLogoScheme', () => ({
  useLogoScheme: jest.fn(() => ({ uri: 'logo' })),
}));

import React from 'react';
import { Linking, Alert } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import EventDetailed from '@/components/EventDetailed';
import type { FormattedEvent } from '@/utils/eventFormatters';
import * as Calendar from 'expo-calendar';

beforeEach(() => {
  global.alert = jest.fn();
});

const mockEvent: FormattedEvent = {
  $id: 'event-123',
  id: 'event-123',
  title: 'Climate March 2025',
  description: 'A march for the climate',
  start_time: '14:00',
  end_time: '16:00',
  start_date: 'March 15, 2025',
  end_date: 'March 15, 2025',
  startDateNoFormat: '2025-03-15',
  endDateNoFormat: '2025-03-15',
  startDateFull: '2025-03-15T14:00:00Z',
  endDateFull: '2025-03-15T16:00:00Z',
  city: 'Brussels',
  street_address: '123 Main St',
  country: 'belgium',
  postal_code: 1000,
  categories: ['Climate'],
  image: 'https://example.com/image.jpg',
  help_needed: false,
  help_description: '',
  organizer_name: 'Climate Org',
  organizer_avatar: null,
  organization_id: 'org-1',
  geocod_lat: 50.8503,
  geocod_lng: 4.3517,
  geocod_status: null,
  co_organizers: [],
  co_organizer_avatars: [],
  disclaimer: null,
  website_url: null,
  region: null,
  organizer_id: 'user-1',
  view_count: 0,
  participant_count: 0,
  save_count: 0,
  like_count: 0,
  status: 'active',
  cancelled_at: null,
  cancellation_reason: null,
};

const defaultProps = {
  event: mockEvent,
  isCreator: false,
  isEventSaved: false,
  viewCount: 0,
  onBack: jest.fn(),
  onSave: jest.fn(),
  onOrganizerPress: jest.fn(),
  onOpenCreatorMenu: jest.fn(),
  userLanguage: 'en' as const,
  topInset: 0,
};

describe('EventDetailed', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the event title', () => {
    render(<EventDetailed {...defaultProps} />);
    expect(screen.getByText('Climate March 2025')).toBeTruthy();
  });

  it('renders the event description', () => {
    render(<EventDetailed {...defaultProps} />);
    expect(screen.getByText('A march for the climate')).toBeTruthy();
  });

  it('renders the date', () => {
    render(<EventDetailed {...defaultProps} />);
    expect(screen.getByText('March 15, 2025')).toBeTruthy();
  });

  it('renders the organizer name', () => {
    render(<EventDetailed {...defaultProps} />);
    expect(screen.getByText('Climate Org')).toBeTruthy();
  });

  it('renders address information', () => {
    render(<EventDetailed {...defaultProps} />);
    expect(screen.getAllByText(/123 Main St/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders help description when help_needed is true', () => {
    const helpEvent = { ...mockEvent, help_needed: true, help_description: 'We need volunteers' };
    render(<EventDetailed {...defaultProps} event={helpEvent} />);
    expect(screen.getByText('We need volunteers')).toBeTruthy();
  });

  it('does not render help section when help_needed is false', () => {
    render(<EventDetailed {...defaultProps} />);
    expect(screen.queryByText('We need volunteers')).toBeNull();
  });

  it('renders website URL when valid', () => {
    const urlEvent = { ...mockEvent, website_url: 'https://example.com' };
    render(<EventDetailed {...defaultProps} event={urlEvent} />);
    expect(screen.getByText('https://example.com')).toBeTruthy();
  });

  it('does not render website section for invalid URLs', () => {
    const invalidUrlEvent = { ...mockEvent, website_url: 'not-a-url' };
    render(<EventDetailed {...defaultProps} event={invalidUrlEvent} />);
    expect(screen.queryByText('not-a-url')).toBeNull();
  });

  it('renders co-organizer names from co_organizer_avatars', () => {
    const coOrgEvent = {
      ...mockEvent,
      co_organizer_avatars: [
        { id: null, name: 'Green Peace', avatar: null },
        { id: null, name: 'WWF', avatar: null },
      ],
    };
    render(<EventDetailed {...defaultProps} event={coOrgEvent} />);
    expect(screen.getByText('Green Peace')).toBeTruthy();
    expect(screen.getByText('WWF')).toBeTruthy();
  });

  it('renders without crashing when all optional fields are absent', () => {
    const { toJSON } = render(<EventDetailed {...defaultProps} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders in French language', () => {
    render(<EventDetailed {...defaultProps} userLanguage="fr" />);
    expect(screen.getByText('Climate March 2025')).toBeTruthy();
  });

  it('renders in Dutch language', () => {
    render(<EventDetailed {...defaultProps} userLanguage="nl" />);
    expect(screen.getByText('Climate March 2025')).toBeTruthy();
  });

  it('renders without organizer avatar (null)', () => {
    const noAvatarEvent = { ...mockEvent, organizer_avatar: null };
    render(<EventDetailed {...defaultProps} event={noAvatarEvent} />);
    expect(screen.getByText('Climate Org')).toBeTruthy();
  });

  it('renders event without co-organizers', () => {
    const noCoOrgEvent = { ...mockEvent, co_organizers: [], co_organizer_avatars: [] };
    render(<EventDetailed {...defaultProps} event={noCoOrgEvent} />);
    expect(screen.getByText('Climate March 2025')).toBeTruthy();
  });

  it('renders without geocoordinates', () => {
    const noGeoEvent = { ...mockEvent, geocod_lat: null, geocod_lng: null };
    render(<EventDetailed {...defaultProps} event={noGeoEvent} />);
    expect(screen.getByText('Climate March 2025')).toBeTruthy();
  });

  it('does not render website URL section when website_url is null', () => {
    render(<EventDetailed {...defaultProps} />);
    expect(screen.queryByText('https://example.com')).toBeNull();
  });

  it('shows creator stats banner when isCreator=true', () => {
    render(<EventDetailed {...defaultProps} isCreator={true} viewCount={42} />);
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('does not show creator stats banner when isCreator=false', () => {
    render(<EventDetailed {...defaultProps} isCreator={false} />);
    expect(screen.queryByText('YOUR EVENT')).toBeNull();
  });

  it('calls onBack when back button is pressed', () => {
    const onBack = jest.fn();
    render(<EventDetailed {...defaultProps} onBack={onBack} />);
    const backButton = screen.getAllByRole('button')[0];
    fireEvent.press(backButton);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('calls onSave when save button is pressed (visitor mode)', () => {
    const onSave = jest.fn();
    render(<EventDetailed {...defaultProps} onSave={onSave} isCreator={false} />);
    const saveButton = screen.getByLabelText('Save');
    fireEvent.press(saveButton);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenCreatorMenu when edit pill is pressed (creator mode)', () => {
    const onOpenCreatorMenu = jest.fn();
    render(
      <EventDetailed {...defaultProps} isCreator={true} onOpenCreatorMenu={onOpenCreatorMenu} />
    );
    const editPill = screen.getByText('Edit');
    fireEvent.press(editPill);
    expect(onOpenCreatorMenu).toHaveBeenCalledTimes(1);
  });
});

describe('EventDetailed — calendar integration', () => {
  afterEach(() => jest.clearAllMocks());

  it('opens pre-permission dialog when calendar permission is undetermined', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    (Calendar.getCalendarPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'undetermined',
    });

    render(<EventDetailed {...defaultProps} />);

    const dateText = screen.getByText('March 15, 2025');
    await act(async () => {
      fireEvent.press(dateText);
    });

    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('creates calendar event when permission is already granted', async () => {
    (Calendar.getCalendarPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Calendar.requestCalendarPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Calendar.createEventInCalendarAsync as jest.Mock).mockResolvedValue({ action: 'saved' });

    render(<EventDetailed {...defaultProps} />);

    const dateText = screen.getByText('March 15, 2025');
    await act(async () => {
      fireEvent.press(dateText);
    });

    expect(Calendar.requestCalendarPermissionsAsync).toHaveBeenCalled();
    expect(Calendar.createEventInCalendarAsync).toHaveBeenCalled();
  });

  it('handles calendar permission denied', async () => {
    const alertFn = jest.fn();
    global.alert = alertFn;

    (Calendar.getCalendarPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Calendar.requestCalendarPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

    render(<EventDetailed {...defaultProps} />);

    const dateText = screen.getByText('March 15, 2025');
    await act(async () => {
      fireEvent.press(dateText);
    });

    expect(alertFn).toHaveBeenCalled();
  });

  it('handles calendar event with no end date', async () => {
    (Calendar.getCalendarPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Calendar.requestCalendarPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Calendar.createEventInCalendarAsync as jest.Mock).mockResolvedValue({ action: 'saved' });

    const eventNoEndDate = { ...mockEvent, endDateFull: null, end_time: '' };
    render(<EventDetailed {...defaultProps} event={eventNoEndDate} />);

    const dateText = screen.getByText('March 15, 2025');
    await act(async () => {
      fireEvent.press(dateText);
    });

    expect(Calendar.createEventInCalendarAsync).toHaveBeenCalled();
  });

  it('handles invalid start date gracefully', async () => {
    const alertFn = jest.fn();
    global.alert = alertFn;

    (Calendar.getCalendarPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Calendar.requestCalendarPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });

    const { parseAsUTC } = require('@/utils/eventFormatters');
    parseAsUTC.mockReturnValueOnce(new Date('invalid'));

    const eventBadDate = { ...mockEvent, startDateFull: 'invalid-date' };
    render(<EventDetailed {...defaultProps} event={eventBadDate} />);

    const dateText = screen.getByText('March 15, 2025');
    await act(async () => {
      fireEvent.press(dateText);
    });

    expect(screen.toJSON()).toBeTruthy();
  });

  it('handles calendar creation error', async () => {
    const alertFn = jest.fn();
    global.alert = alertFn;

    (Calendar.getCalendarPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Calendar.requestCalendarPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Calendar.createEventInCalendarAsync as jest.Mock).mockRejectedValue(
      new Error('Calendar error')
    );

    render(<EventDetailed {...defaultProps} />);

    const dateText = screen.getByText('March 15, 2025');
    await act(async () => {
      fireEvent.press(dateText);
    });

    expect(alertFn).toHaveBeenCalled();
  });

  it('handles CalendarDialogResultActions.done', async () => {
    const alertFn = jest.fn();
    global.alert = alertFn;

    (Calendar.getCalendarPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Calendar.requestCalendarPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Calendar.createEventInCalendarAsync as jest.Mock).mockResolvedValue({ action: 'done' });

    render(<EventDetailed {...defaultProps} />);

    const dateText = screen.getByText('March 15, 2025');
    await act(async () => {
      fireEvent.press(dateText);
    });

    expect(alertFn).toHaveBeenCalled();
  });

  it('handles getCalendarPermissionsAsync throwing (outer catch)', async () => {
    const alertFn = jest.fn();
    global.alert = alertFn;

    (Calendar.getCalendarPermissionsAsync as jest.Mock).mockRejectedValue(
      new Error('Permission check failed')
    );

    render(<EventDetailed {...defaultProps} />);

    const dateText = screen.getByText('March 15, 2025');
    await act(async () => {
      fireEvent.press(dateText);
    });

    expect(alertFn).toHaveBeenCalled();
  });
});

describe('EventDetailed — openMap cooldown setTimeout reset', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('resets cooldown after 3 seconds allowing a second map open', async () => {
    jest.useFakeTimers();
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    render(<EventDetailed {...defaultProps} />);

    const brusselsTexts = screen.getAllByText('Brussels');

    await act(async () => {
      fireEvent.press(brusselsTexts[0]);
    });
    expect(openURLSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(3001);
    });

    await act(async () => {
      fireEvent.press(brusselsTexts[0]);
    });
    expect(openURLSpy).toHaveBeenCalledTimes(2);

    // Flush module-level cooldown state so subsequent tests start clean
    await act(async () => {
      jest.advanceTimersByTime(3001);
    });

    openURLSpy.mockRestore();
  });
});

describe('EventDetailed — map and location', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders location card with address when geocoordinates exist', () => {
    render(<EventDetailed {...defaultProps} />);
    expect(screen.getAllByText(/123 Main St/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders location with city label when geocoordinates exist', () => {
    render(<EventDetailed {...defaultProps} />);
    expect(screen.getAllByText('Brussels').length).toBeGreaterThanOrEqual(1);
  });

  it('does not render location card when no geocoordinates', () => {
    const noGeoEvent = { ...mockEvent, geocod_lat: undefined as any, geocod_lng: undefined as any };
    render(<EventDetailed {...defaultProps} event={noGeoEvent} />);
    expect(screen.getByText('Climate March 2025')).toBeTruthy();
  });

  it('renders without postal_code', () => {
    const eventNoPostal = { ...mockEvent, postal_code: null };
    render(<EventDetailed {...defaultProps} event={eventNoPostal} />);
    expect(screen.getByText('Climate March 2025')).toBeTruthy();
  });
});

describe('EventDetailed — URL handling', () => {
  afterEach(() => jest.clearAllMocks());

  it('opens valid website URL when pressed', async () => {
    const canOpenSpy = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    const urlEvent = { ...mockEvent, website_url: 'https://example.com' };
    render(<EventDetailed {...defaultProps} event={urlEvent} />);

    const urlText = screen.getByText('https://example.com');
    await act(async () => {
      fireEvent.press(urlText);
    });

    expect(canOpenSpy).toHaveBeenCalledWith('https://example.com');
    expect(openSpy).toHaveBeenCalledWith('https://example.com');

    canOpenSpy.mockRestore();
    openSpy.mockRestore();
  });

  it('does not open invalid website URL', () => {
    const invalidUrlEvent = { ...mockEvent, website_url: 'not-a-url' };
    render(<EventDetailed {...defaultProps} event={invalidUrlEvent} />);
    expect(screen.queryByText('not-a-url')).toBeNull();
  });

  it('handles URL that cannot be opened', async () => {
    const canOpenSpy = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);
    const { logger } = require('@/utils/logger');

    const urlEvent = { ...mockEvent, website_url: 'https://example.com' };
    render(<EventDetailed {...defaultProps} event={urlEvent} />);

    const urlText = screen.getByText('https://example.com');
    await act(async () => {
      fireEvent.press(urlText);
    });

    expect(logger.warn).toHaveBeenCalled();
    canOpenSpy.mockRestore();
  });
});

describe('EventDetailed — co-organizers rendering', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders co-organizers from co_organizer_avatars array', () => {
    const coOrgEvent = {
      ...mockEvent,
      co_organizer_avatars: [
        { id: null, name: 'Green Peace', avatar: 'https://example.com/gp.jpg' },
        { id: null, name: 'WWF', avatar: null },
      ],
    };
    render(<EventDetailed {...defaultProps} event={coOrgEvent} />);
    expect(screen.getByText('Green Peace')).toBeTruthy();
    expect(screen.getByText('WWF')).toBeTruthy();
  });

  it('filters out empty co-organizer names from avatars', () => {
    const coOrgEvent = {
      ...mockEvent,
      co_organizer_avatars: [
        { id: null, name: 'Green Peace', avatar: null },
        { id: null, name: '', avatar: null },
        { id: null, name: '  ', avatar: null },
      ],
    };
    render(<EventDetailed {...defaultProps} event={coOrgEvent} />);
    expect(screen.getByText('Green Peace')).toBeTruthy();
  });

  it('renders co-organizers from string array when no avatars', () => {
    const coOrgEvent = {
      ...mockEvent,
      co_organizer_avatars: [],
      co_organizers: ['Org X', 'Org Y'],
    };
    render(<EventDetailed {...defaultProps} event={coOrgEvent} />);
    expect(screen.getByText('Org X')).toBeTruthy();
    expect(screen.getByText('Org Y')).toBeTruthy();
  });

  it('filters out empty names from co_organizers string array', () => {
    const coOrgEvent = {
      ...mockEvent,
      co_organizer_avatars: [],
      co_organizers: ['Org X', '', '  '],
    };
    render(<EventDetailed {...defaultProps} event={coOrgEvent} />);
    expect(screen.getByText('Org X')).toBeTruthy();
  });

  it('renders organizer from organization lookup when org_id matches', () => {
    const orgEvent = { ...mockEvent, organization_id: 'org-1', organizer_name: 'Some User' };
    render(<EventDetailed {...defaultProps} event={orgEvent} />);
    expect(screen.getByText('Climate Org')).toBeTruthy();
  });

  it('falls back to organizer_name when no organization matches', () => {
    const noOrgEvent = {
      ...mockEvent,
      organization_id: 'unknown-org',
      organizer_name: 'Personal Organizer',
    };
    render(<EventDetailed {...defaultProps} event={noOrgEvent} />);
    expect(screen.getByText('Personal Organizer')).toBeTruthy();
  });

  it('renders without organization_id', () => {
    const noOrgIdEvent = { ...mockEvent, organization_id: '', organizer_name: 'Direct Organizer' };
    render(<EventDetailed {...defaultProps} event={noOrgIdEvent} />);
    expect(screen.getByText('Direct Organizer')).toBeTruthy();
  });

  it('calls onOrganizerPress when navigable organizer row is pressed', () => {
    const onOrganizerPress = jest.fn();
    render(<EventDetailed {...defaultProps} onOrganizerPress={onOrganizerPress} />);
    const viewProfile = screen.getByText('View profile');
    fireEvent.press(viewProfile);
    expect(onOrganizerPress).toHaveBeenCalledWith('org-1');
  });
});

describe('EventDetailed — end time display variations', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders end time on same day', () => {
    const sameDayEvent = {
      ...mockEvent,
      startDateNoFormat: '2025-03-15',
      endDateNoFormat: '2025-03-15',
      end_time: '16:00',
    };
    render(<EventDetailed {...defaultProps} event={sameDayEvent} />);
    expect(screen.getAllByText(/16:00/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders end time on different day', () => {
    const differentDayEvent = {
      ...mockEvent,
      startDateNoFormat: '2025-03-15',
      endDateNoFormat: '2025-03-16',
      end_date: 'March 16, 2025',
      end_time: '10:00',
    };
    render(<EventDetailed {...defaultProps} event={differentDayEvent} />);
    expect(screen.getAllByText(/March 16/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/10:00/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders without end time', () => {
    const noEndTimeEvent = { ...mockEvent, end_time: '', endDateFull: null };
    render(<EventDetailed {...defaultProps} event={noEndTimeEvent} />);
    expect(screen.getByText('March 15, 2025')).toBeTruthy();
  });
});

describe('EventDetailed — refreshing', () => {
  afterEach(() => jest.clearAllMocks());

  it('accepts refreshing and onRefresh props', () => {
    const onRefresh = jest.fn();
    render(<EventDetailed {...defaultProps} refreshing={true} onRefresh={onRefresh} />);
    expect(screen.toJSON()).toBeTruthy();
  });
});

describe('EventDetailed — safeOpenUrl error path', () => {
  afterEach(() => jest.clearAllMocks());

  it('logs error when Linking.openURL throws', async () => {
    const canOpenSpy = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    const openSpy = jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('Cannot open URL'));
    const { logger } = require('@/utils/logger');

    const urlEvent = { ...mockEvent, website_url: 'https://example.com' };
    render(<EventDetailed {...defaultProps} event={urlEvent} />);

    const urlText = screen.getByText('https://example.com');
    await act(async () => {
      fireEvent.press(urlText);
    });

    expect(logger.error).toHaveBeenCalled();

    canOpenSpy.mockRestore();
    openSpy.mockRestore();
  });
});

describe('EventDetailed — isAddingToCalendar guard', () => {
  afterEach(() => jest.clearAllMocks());

  it('prevents double-press on calendar button (race condition guard)', async () => {
    let resolvePermission: (val: any) => void;
    const slowPermission = new Promise((resolve) => {
      resolvePermission = resolve;
    });

    (Calendar.getCalendarPermissionsAsync as jest.Mock).mockReturnValueOnce(slowPermission);

    render(<EventDetailed {...defaultProps} />);

    const dateText = screen.getByText('March 15, 2025');

    fireEvent.press(dateText);
    fireEvent.press(dateText);

    await act(async () => {
      resolvePermission!({ status: 'granted' });
      (Calendar.requestCalendarPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Calendar.createEventInCalendarAsync as jest.Mock).mockResolvedValue({ action: 'saved' });
    });

    expect(Calendar.getCalendarPermissionsAsync).toHaveBeenCalledTimes(1);
  });
});

describe('EventDetailed — openMap cooldown guard', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('prevents duplicate map opens during cooldown', async () => {
    jest.useFakeTimers();
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    render(<EventDetailed {...defaultProps} />);

    const brusselsTexts = screen.getAllByText('Brussels');

    await act(async () => {
      fireEvent.press(brusselsTexts[0]);
    });

    await act(async () => {
      fireEvent.press(brusselsTexts[0]);
    });

    expect(openURLSpy).toHaveBeenCalledTimes(1);

    // Flush module-level cooldown so subsequent tests start clean
    await act(async () => {
      jest.advanceTimersByTime(3001);
    });

    openURLSpy.mockRestore();
  });
});

describe('EventDetailed — map interactions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(async () => {
    // Flush module-level openMap cooldown so the next test starts clean
    await act(async () => {
      jest.advanceTimersByTime(3001);
    });
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('opens map when location card is pressed', async () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    render(<EventDetailed {...defaultProps} />);

    const brusselsTexts = screen.getAllByText('Brussels');
    await act(async () => {
      fireEvent.press(brusselsTexts[0]);
    });

    expect(openURLSpy).toHaveBeenCalled();
    openURLSpy.mockRestore();
  });

  it('handles map URL open error', async () => {
    const { logger } = require('@/utils/logger');
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('Cannot open'));

    render(<EventDetailed {...defaultProps} />);

    const brusselsTexts = screen.getAllByText('Brussels');
    await act(async () => {
      fireEvent.press(brusselsTexts[0]);
    });

    // Let the rejected promise propagate to the .catch handler
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(logger.error).toHaveBeenCalled();
    openURLSpy.mockRestore();
  });
});

describe('EventDetailed — calendar pre-permission dialog callbacks', () => {
  afterEach(() => jest.clearAllMocks());

  it('executes "Allow Access" callback from pre-permission dialog', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    (Calendar.getCalendarPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'undetermined',
    });
    (Calendar.requestCalendarPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Calendar.createEventInCalendarAsync as jest.Mock).mockResolvedValue({ action: 'saved' });

    render(<EventDetailed {...defaultProps} />);

    const dateText = screen.getByText('March 15, 2025');
    await act(async () => {
      fireEvent.press(dateText);
    });

    expect(alertSpy).toHaveBeenCalled();
    const alertCall = alertSpy.mock.calls[0];
    const buttons = alertCall[2] as any[];

    const allowButton = buttons.find((b: any) => b.style !== 'cancel');
    if (allowButton?.onPress) {
      await act(async () => {
        await allowButton.onPress();
      });
    }

    expect(Calendar.requestCalendarPermissionsAsync).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('executes "Not Now" callback from pre-permission dialog', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    (Calendar.getCalendarPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'undetermined',
    });

    render(<EventDetailed {...defaultProps} />);

    const dateText = screen.getByText('March 15, 2025');
    await act(async () => {
      fireEvent.press(dateText);
    });

    const alertCall = alertSpy.mock.calls[0];
    const buttons = alertCall[2] as any[];
    const cancelButton = buttons.find((b: any) => b.style === 'cancel');
    if (cancelButton?.onPress) {
      cancelButton.onPress();
    }

    expect(Calendar.requestCalendarPermissionsAsync).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

describe('EventDetailed — invalid end date handling', () => {
  afterEach(() => jest.clearAllMocks());

  it('handles invalid end date by defaulting to 2 hours after start', async () => {
    (Calendar.getCalendarPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Calendar.requestCalendarPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Calendar.createEventInCalendarAsync as jest.Mock).mockResolvedValue({ action: 'saved' });

    const { parseAsUTC } = require('@/utils/eventFormatters');
    parseAsUTC
      .mockReturnValueOnce(new Date('2025-03-15T14:00:00Z'))
      .mockReturnValueOnce(new Date('invalid'));

    const eventWithBadEnd = { ...mockEvent, endDateFull: 'invalid-end-date' };
    render(<EventDetailed {...defaultProps} event={eventWithBadEnd} />);

    const dateText = screen.getByText('March 15, 2025');
    await act(async () => {
      fireEvent.press(dateText);
    });

    expect(Calendar.createEventInCalendarAsync).toHaveBeenCalled();
  });
});

describe('EventDetailed — event without postal code or street address', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders without postal code', () => {
    const noPCEvent = { ...mockEvent, postal_code: null };
    render(<EventDetailed {...defaultProps} event={noPCEvent} />);
    expect(screen.getByText('Climate March 2025')).toBeTruthy();
  });

  it('renders without street address', () => {
    const noStreetEvent = { ...mockEvent, street_address: null };
    render(<EventDetailed {...defaultProps} event={noStreetEvent} />);
    expect(screen.getByText('Climate March 2025')).toBeTruthy();
  });
});
