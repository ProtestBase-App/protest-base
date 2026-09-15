// Mocks (must be hoisted before imports)
jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn().mockReturnValue('light') }));

// Keys come back verbatim, with any interpolation params appended, so the
// assertions can see both what was asked for and with which values.
jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key: string, params?: Record<string, unknown>) =>
    params ? `${key}|${JSON.stringify(params)}` : key
  ),
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

// jest-expo resolves IconSymbol to its iOS variant, which renders SymbolView.
jest.mock('expo-symbols', () => ({
  SymbolView: (props: any) => {
    const React = require('react');
    return React.createElement('SymbolView', props);
  },
}));

import React from 'react';
import { Linking, StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { EventWeatherCard } from '@/components/EventWeatherCard';
import { EventWeather, WeatherDay } from '@/types/weather.types';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

// Sunday 20 Sep 2026, 17:00–21:00 Brussels (CEST); sunset 19:32 local.
const rainyEvening: WeatherDay = {
  date: '2026-09-20',
  window_start: '2026-09-20T15:00:00Z',
  window_end: '2026-09-20T19:00:00Z',
  confidence: 'medium',
  condition: 'rain',
  is_night: false,
  temp_min: 14,
  temp_max: 17,
  feels_min: 12,
  feels_max: 16,
  precip_probability_max: 70,
  precip_mm: 2.4,
  gust_max_kmh: 48,
  uv_max: 2.1,
  sunrise: '2026-09-20T05:29:00Z',
  sunset: '2026-09-20T17:32:00Z',
};

const forecast = (
  dayOverrides: Partial<WeatherDay> = {},
  overrides: Partial<EventWeather> = {}
): EventWeather => ({
  status: 'available',
  reason: null,
  available_from: null,
  generated_at: '2026-09-20T08:10:00Z',
  stale: false,
  attribution: 'open-meteo',
  days: [{ ...rainyEvening, ...dayOverrides }],
  ...overrides,
});

const tipTestIds = () =>
  screen
    .getAllByTestId(/^weather-tip-/)
    .map((node) => String(node.props.testID).replace('weather-tip-', ''));

describe('EventWeatherCard', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('renders the title, a condition + temperature headline and the detail metrics', () => {
    render(<EventWeatherCard weather={forecast()} userLanguage="en" />);

    expect(screen.getByText('WEATHER.TITLE')).toBeTruthy();
    expect(
      screen.getByText('weather.conditions.rain, weather.metrics.temp|{"min":"14","max":"17"}')
    ).toBeTruthy();
    // The details line is capitalised, hence the case-insensitive lookups.
    const details = screen.getByText(/weather\.metrics\.feels/i);
    expect(details.props.children).toMatch(/^Weather\.metrics\.feels\|\{"min":"12","max":"16"\}/);
    expect(details.props.children).toContain('weather.metrics.rain|{"value":"70"}');
    expect(details.props.children).toContain('weather.metrics.gusts|{"value":"48"}');
    // The event's date and time live on the calendar card above; none here.
    expect(screen.queryByText(/Sep 20/)).toBeNull();
    expect(t).not.toHaveBeenCalledWith('weather.windowFromNow', expect.anything());
    expect(t).not.toHaveBeenCalledWith('weather.windowForDay', expect.anything());
  });

  it('leaves out metrics the forecast has no value for', () => {
    render(
      <EventWeatherCard
        weather={forecast({ feels_min: null, feels_max: null, gust_max_kmh: null })}
        userLanguage="en"
      />
    );

    expect(screen.queryByText(/weather\.metrics\.feels/i)).toBeNull();
    expect(screen.queryByText(/weather\.metrics\.gusts/i)).toBeNull();
    expect(screen.getByText(/weather\.metrics\.rain/i)).toBeTruthy();
  });

  it('words ranges with a negative bound and uses a real minus sign', () => {
    render(
      <EventWeatherCard
        weather={forecast({ temp_min: -3, temp_max: 0, feels_min: -7, feels_max: -4 })}
        userLanguage="en"
      />
    );

    expect(t).toHaveBeenCalledWith('weather.metrics.tempBelowZero', { min: '\u22123', max: '0' });
    expect(t).toHaveBeenCalledWith('weather.metrics.feelsBelowZero', {
      min: '\u22127',
      max: '\u22124',
    });
  });

  it('shows at most three tips in priority order, serious ones highlighted', () => {
    render(
      <EventWeatherCard
        weather={forecast({ condition: 'thunder', feels_max: 31, uv_max: 7 })}
        userLanguage="en"
      />
    );

    expect(tipTestIds()).toEqual(['thunder_rain', 'heat', 'uv_high']);

    const { warningBg } = getThemeColors('light');
    const serious = StyleSheet.flatten(screen.getByTestId('weather-tip-thunder_rain').props.style);
    const light = StyleSheet.flatten(screen.getByTestId('weather-tip-uv_high').props.style);
    expect(serious.backgroundColor).toBe(warningBg);
    expect(light.backgroundColor).toBeUndefined();
  });

  it('asks for the sunset time in the locale format for the "dark" tip', () => {
    render(<EventWeatherCard weather={forecast()} userLanguage="en" />);
    expect(tipTestIds()).toEqual(['wind_rain', 'dark']);
    expect(t).toHaveBeenCalledWith('weather.tips.dark', {
      time: expect.stringMatching(/^7:32\sPM$/),
    });

    jest.clearAllMocks();
    render(<EventWeatherCard weather={forecast()} userLanguage="fr" />);
    expect(t).toHaveBeenCalledWith('weather.tips.dark', { time: '19:32' });
  });

  it('tags a medium-confidence forecast as one that may still change', () => {
    render(<EventWeatherCard weather={forecast({ confidence: 'medium' })} userLanguage="en" />);
    expect(screen.getByTestId('weather-may-change')).toBeTruthy();
    expect(screen.getByText('weather.mayChange')).toBeTruthy();
  });

  it('shows no tag or caption for a high-confidence, fresh forecast', () => {
    render(<EventWeatherCard weather={forecast({ confidence: 'high' })} userLanguage="en" />);
    expect(screen.queryByTestId('weather-may-change')).toBeNull();
    expect(t).not.toHaveBeenCalledWith('weather.updatedHoursAgo', expect.anything());
  });

  it('says how old a stale forecast is', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-20T13:00:00Z'));

    render(
      <EventWeatherCard
        weather={forecast({ confidence: 'high' }, { stale: true })}
        userLanguage="en"
      />
    );

    expect(t).toHaveBeenCalledWith('weather.updatedHoursAgo', { count: 4 });
    expect(screen.getByText(/weather\.updatedHoursAgo/)).toBeTruthy();
  });

  describe('time note', () => {
    it('says "from now until" when the event is already under way', () => {
      render(
        <EventWeatherCard
          weather={forecast()}
          userLanguage="en"
          eventStart="2026-09-20T14:00:00Z"
          eventEnd="2026-09-20T19:00:00Z"
        />
      );

      expect(t).toHaveBeenCalledWith('weather.windowFromNow', {
        time: expect.stringMatching(/^9:00\sPM$/),
      });
      expect(screen.getByText(/weather\.windowFromNow/)).toBeTruthy();
    });

    it('names the day when the event runs on past the forecast window', () => {
      render(
        <EventWeatherCard
          weather={forecast()}
          userLanguage="en"
          eventStart="2026-09-20T15:00:00Z"
          eventEnd="2026-09-22T19:00:00Z"
        />
      );

      expect(t).toHaveBeenCalledWith('weather.windowForDay', { day: 'Sun, Sep 20' });
    });

    it('stays silent when the forecast covers the whole event', () => {
      render(
        <EventWeatherCard
          weather={forecast()}
          userLanguage="en"
          eventStart="2026-09-20T15:00:00Z"
          eventEnd="2026-09-20T19:00:00Z"
        />
      );

      expect(t).not.toHaveBeenCalledWith('weather.windowFromNow', expect.anything());
      expect(t).not.toHaveBeenCalledWith('weather.windowForDay', expect.anything());
    });
  });

  it('credits Open-Meteo with a link that opens their site', () => {
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    render(<EventWeatherCard weather={forecast()} userLanguage="en" />);

    expect(screen.getByText('weather.attribution')).toBeTruthy();
    fireEvent.press(screen.getByRole('link'));

    expect(openSpy).toHaveBeenCalledWith('https://open-meteo.com/');
    openSpy.mockRestore();
  });

  it('exposes the summary and the link to assistive tech', () => {
    render(<EventWeatherCard weather={forecast()} userLanguage="en" />);

    const summary = screen.getByRole('summary');
    expect(summary.props.accessibilityLabel).toMatch(
      /^weather\.title\. weather\.mayChange\. weather\.conditions\.rain, /
    );
    expect(screen.getByRole('link').props.accessibilityLabel).toBe('weather.attributionLinkA11y');
    expect(screen.getByTestId('weather-tip-wind_rain').props.accessibilityLabel).toBe(
      'weather.tips.wind_rain'
    );
  });

  it('picks the wording from the event start, so it stays put across renders', () => {
    const rainyCold = forecast({ feels_min: 5, gust_max_kmh: 10 });
    const wording = () =>
      (t as jest.Mock).mock.calls
        .map(([key]) => key as string)
        .find((key) => key.startsWith('weather.tips.cold_rain_'));

    render(
      <EventWeatherCard weather={rainyCold} userLanguage="en" eventStart="2026-09-20T15:00:00Z" />
    );
    const first = wording();
    expect(first).toMatch(/^weather\.tips\.cold_rain_[1-8]$/);

    jest.clearAllMocks();
    screen.rerender(
      <EventWeatherCard weather={rainyCold} userLanguage="en" eventStart="2026-09-20T15:00:00Z" />
    );
    expect(wording()).toBe(first);
  });

  it('renders only the first day, whatever the backend sent', () => {
    const secondDay: WeatherDay = {
      ...rainyEvening,
      date: '2026-09-21',
      window_start: '2026-09-21T15:00:00Z',
      window_end: '2026-09-21T19:00:00Z',
      temp_min: 1,
      temp_max: 2,
    };
    render(
      <EventWeatherCard
        weather={forecast({}, { days: [rainyEvening, secondDay] })}
        userLanguage="en"
      />
    );

    expect(screen.getByText(/weather\.metrics\.temp\|\{"min":"14"/)).toBeTruthy();
    expect(screen.queryByText(/"min":"1"/)).toBeNull();
  });

  it('renders nothing without a day', () => {
    render(<EventWeatherCard weather={forecast({}, { days: [] })} userLanguage="en" />);
    expect(screen.toJSON()).toBeNull();
  });
});
