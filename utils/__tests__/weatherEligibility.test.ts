import { createMockEvent } from '@/test-utils/render';
import {
  getWeatherFingerprint,
  hasUsableWeatherLocation,
  isWeatherEligible,
} from '@/utils/weatherEligibility';
import { WEATHER_NO_LOCATION_SENTINEL } from '@/constants/WeatherConfig';

// 14:00 Brussels (CEST) on TODAY_KEY.
const TODAY_KEY = '2026-06-10';
const NOW = new Date('2026-06-10T12:00:00.000Z');

function geocodedEvent(overrides: Parameters<typeof createMockEvent>[0] = {}) {
  return createMockEvent({
    geocod_status: 'OK',
    geocod_lat: 50.8466,
    geocod_lng: 4.3528,
    // Tomorrow 14:00–17:00 Brussels.
    start_time: '2026-06-11T12:00:00.000Z',
    end_time: '2026-06-11T15:00:00.000Z',
    ...overrides,
  });
}

describe('hasUsableWeatherLocation', () => {
  it('accepts a confirmed geocode with real coordinates', () => {
    expect(hasUsableWeatherLocation(geocodedEvent())).toBe(true);
  });

  it.each([null, undefined, 'ZERO_RESULTS', 'ERROR'])('rejects geocod_status %s', (status) => {
    expect(hasUsableWeatherLocation(geocodedEvent({ geocod_status: status }))).toBe(false);
  });

  it('rejects missing or non-finite coordinates even when the geocode is OK', () => {
    expect(hasUsableWeatherLocation(geocodedEvent({ geocod_lat: undefined }))).toBe(false);
    expect(hasUsableWeatherLocation(geocodedEvent({ geocod_lng: null }))).toBe(false);
    expect(hasUsableWeatherLocation(geocodedEvent({ geocod_lat: Number.NaN }))).toBe(false);
  });

  it("rejects the geocoder's Brussels-Central sentinel, exact or within float noise", () => {
    const { lat, lng } = WEATHER_NO_LOCATION_SENTINEL;
    expect(hasUsableWeatherLocation(geocodedEvent({ geocod_lat: lat, geocod_lng: lng }))).toBe(
      false
    );
    expect(
      hasUsableWeatherLocation(geocodedEvent({ geocod_lat: lat + 1e-9, geocod_lng: lng - 1e-9 }))
    ).toBe(false);
  });

  it('accepts a real Brussels pin that merely sits near the sentinel', () => {
    const { lat, lng } = WEATHER_NO_LOCATION_SENTINEL;
    expect(
      hasUsableWeatherLocation(geocodedEvent({ geocod_lat: lat + 0.01, geocod_lng: lng }))
    ).toBe(true);
  });
});

describe('isWeatherEligible', () => {
  it('is eligible for an active, geocoded event within the horizon', () => {
    expect(isWeatherEligible(geocodedEvent(), TODAY_KEY, NOW)).toBe(true);
  });

  it('treats a missing status as active (older cache entries omit it)', () => {
    expect(isWeatherEligible(geocodedEvent({ status: undefined }), TODAY_KEY, NOW)).toBe(true);
  });

  it.each(['cancelled', 'past', 'draft'] as const)(
    'is not eligible when status is %s',
    (status) => {
      expect(isWeatherEligible(geocodedEvent({ status }), TODAY_KEY, NOW)).toBe(false);
    }
  );

  it('is not eligible once the event has ended', () => {
    expect(
      isWeatherEligible(
        geocodedEvent({
          start_time: '2026-06-10T08:00:00.000Z',
          end_time: '2026-06-10T10:00:00.000Z',
        }),
        TODAY_KEY,
        NOW
      )
    ).toBe(false);
  });

  it('applies the default 2 h duration when there is no end time', () => {
    // Started 09:00Z → ended 11:00Z, before NOW.
    expect(
      isWeatherEligible(
        geocodedEvent({ start_time: '2026-06-10T09:00:00.000Z', end_time: undefined }),
        TODAY_KEY,
        NOW
      )
    ).toBe(false);
    // Started 11:00Z → ends 13:00Z, still on.
    expect(
      isWeatherEligible(
        geocodedEvent({ start_time: '2026-06-10T11:00:00.000Z', end_time: undefined }),
        TODAY_KEY,
        NOW
      )
    ).toBe(true);
  });

  it('is eligible for an ongoing event', () => {
    expect(
      isWeatherEligible(
        geocodedEvent({
          start_time: '2026-06-10T10:00:00.000Z',
          end_time: '2026-06-10T14:00:00.000Z',
        }),
        TODAY_KEY,
        NOW
      )
    ).toBe(true);
  });

  it('requires a usable location', () => {
    expect(isWeatherEligible(geocodedEvent({ geocod_status: null }), TODAY_KEY, NOW)).toBe(false);
    const { lat, lng } = WEATHER_NO_LOCATION_SENTINEL;
    expect(
      isWeatherEligible(geocodedEvent({ geocod_lat: lat, geocod_lng: lng }), TODAY_KEY, NOW)
    ).toBe(false);
  });

  it('includes an event starting on today + 7 (Brussels) and excludes today + 8', () => {
    expect(
      isWeatherEligible(
        geocodedEvent({ start_time: '2026-06-17T12:00:00.000Z', end_time: undefined }),
        TODAY_KEY,
        NOW
      )
    ).toBe(true);
    expect(
      isWeatherEligible(
        geocodedEvent({ start_time: '2026-06-18T12:00:00.000Z', end_time: undefined }),
        TODAY_KEY,
        NOW
      )
    ).toBe(false);
  });

  it('uses the Brussels date for the horizon, not the UTC one', () => {
    // 22:30Z on the 17th is 00:30 on the 18th in Brussels (CEST) → day + 8.
    expect(
      isWeatherEligible(
        geocodedEvent({ start_time: '2026-06-17T22:30:00.000Z', end_time: undefined }),
        TODAY_KEY,
        NOW
      )
    ).toBe(false);
  });

  it('handles month and year rollovers in the horizon', () => {
    expect(
      isWeatherEligible(
        geocodedEvent({ start_time: '2026-07-04T10:00:00.000Z', end_time: undefined }),
        '2026-06-27',
        new Date('2026-06-27T12:00:00.000Z')
      )
    ).toBe(true);
    expect(
      isWeatherEligible(
        geocodedEvent({ start_time: '2026-07-05T10:00:00.000Z', end_time: undefined }),
        '2026-06-27',
        new Date('2026-06-27T12:00:00.000Z')
      )
    ).toBe(false);
    expect(
      isWeatherEligible(
        geocodedEvent({ start_time: '2027-01-04T10:00:00.000Z', end_time: undefined }),
        '2026-12-28',
        new Date('2026-12-28T12:00:00.000Z')
      )
    ).toBe(true);
  });

  it('is not eligible, and does not throw, for an unparseable start time', () => {
    expect(() =>
      isWeatherEligible(geocodedEvent({ start_time: 'not-a-date' }), TODAY_KEY, NOW)
    ).not.toThrow();
    expect(isWeatherEligible(geocodedEvent({ start_time: 'not-a-date' }), TODAY_KEY, NOW)).toBe(
      false
    );
    expect(isWeatherEligible(geocodedEvent({ start_time: '' }), TODAY_KEY, NOW)).toBe(false);
  });

  it('reads an end that is not after the start as the default 2 h, like the backend', () => {
    // end === start, checked 1 h in → still on.
    expect(
      isWeatherEligible(
        geocodedEvent({
          start_time: '2026-06-10T11:00:00.000Z',
          end_time: '2026-06-10T11:00:00.000Z',
        }),
        TODAY_KEY,
        NOW
      )
    ).toBe(true);
    // end before start, checked 3 h in → over.
    expect(
      isWeatherEligible(
        geocodedEvent({
          start_time: '2026-06-10T09:00:00.000Z',
          end_time: '2026-06-10T08:00:00.000Z',
        }),
        TODAY_KEY,
        NOW
      )
    ).toBe(false);
  });
});

describe('getWeatherFingerprint', () => {
  it('is stable for the same window and pin, whatever else changed', () => {
    expect(getWeatherFingerprint(geocodedEvent())).toBe(
      getWeatherFingerprint(geocodedEvent({ title: 'Renamed', save_count: 9 }))
    );
  });

  it('changes with the time or the pin', () => {
    const base = getWeatherFingerprint(geocodedEvent());
    expect(
      getWeatherFingerprint(geocodedEvent({ start_time: '2026-06-11T13:00:00.000Z' }))
    ).not.toBe(base);
    expect(getWeatherFingerprint(geocodedEvent({ end_time: undefined }))).not.toBe(base);
    expect(getWeatherFingerprint(geocodedEvent({ geocod_lng: 4.4 }))).not.toBe(base);
  });
});
