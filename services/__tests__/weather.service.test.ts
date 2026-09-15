// Mock dependencies before imports
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { AxiosError } from 'axios';
import api from '@/services/api';
import { logger } from '@/utils/logger';
import { clearEventWeatherCache, getEventWeather } from '@/services/weather.service';
import { WEATHER_MEMORY_TTL_MS } from '@/constants/WeatherConfig';

const mockApi = api as jest.Mocked<typeof api>;

const day = {
  date: '2026-09-20',
  window_start: '2026-09-20T12:00:00Z',
  window_end: '2026-09-20T15:00:00Z',
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

const available = {
  status: 'available',
  reason: null,
  available_from: null,
  generated_at: '2026-09-13T14:10:00Z',
  stale: false,
  attribution: 'open-meteo',
  days: [day],
};

const withoutForecast = (status: string, reason: string | null) => ({
  status,
  reason,
  available_from: null,
  generated_at: null,
  stale: false,
  attribution: 'open-meteo',
  days: [],
});

const respondWith = (data: unknown) => mockApi.get.mockResolvedValueOnce({ data });
const FP = 'start|end|50.85|4.35';

describe('weather.service', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-13T15:00:00Z'));
  });

  afterEach(() => {
    clearEventWeatherCache();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('request', () => {
    it('asks for the event weather without the JWT', async () => {
      respondWith({ success: true, data: available });

      await getEventWeather('event-1');

      expect(mockApi.get).toHaveBeenCalledWith('/events/event-1/weather', { skipAuth: true });
    });

    it('returns an available forecast trimmed to its first day', async () => {
      const secondDay = { ...day, date: '2026-09-21' };
      respondWith({ success: true, data: { ...available, days: [day, secondDay] } });

      const weather = await getEventWeather('event-1');

      expect(weather).toEqual({ ...available, days: [day] });
    });

    it('sanitises the fields the card branches on instead of trusting them', async () => {
      respondWith({
        success: true,
        data: {
          ...available,
          generated_at: 'whenever',
          stale: 'yes',
          days: [
            {
              ...day,
              condition: 42,
              confidence: 'banana',
              is_night: 'yes',
              feels_min: 'x',
              uv_max: Number.NaN,
              sunset: 'later',
            },
          ],
        },
      });

      const weather = await getEventWeather('event-1');

      expect(weather?.generated_at).toBeNull();
      expect(weather?.stale).toBe(false);
      expect(weather?.days[0]).toEqual({
        ...day,
        condition: null,
        confidence: 'medium',
        is_night: false,
        feels_min: null,
        uv_max: null,
        sunset: null,
      });
    });

    it.each([
      ['too_early', null],
      ['too_early', 'beyond_forecast'],
      ['not_applicable', 'category'],
      ['unavailable', 'no_location'],
      ['unavailable', 'disabled'],
      ['something_new', null],
    ])('answers null for status %s / %s and remembers it', async (status, reason) => {
      respondWith({ success: true, data: withoutForecast(status, reason) });

      expect(await getEventWeather('event-1')).toBeNull();
      expect(await getEventWeather('event-1')).toBeNull();
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('memory cache', () => {
    it('serves a forecast from memory within the TTL', async () => {
      respondWith({ success: true, data: available });
      await getEventWeather('event-1');

      jest.advanceTimersByTime(WEATHER_MEMORY_TTL_MS - 60 * 1000);
      const weather = await getEventWeather('event-1');

      expect(weather).toEqual({ ...available, days: [day] });
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });

    it('refetches once the TTL has passed', async () => {
      respondWith({ success: true, data: available });
      await getEventWeather('event-1');

      jest.advanceTimersByTime(WEATHER_MEMORY_TTL_MS + 60 * 1000);
      respondWith({ success: true, data: { ...available, stale: true } });
      const weather = await getEventWeather('event-1');

      expect(mockApi.get).toHaveBeenCalledTimes(2);
      expect(weather?.stale).toBe(true);
    });

    it('caches per event', async () => {
      respondWith({ success: true, data: available });
      respondWith({ success: true, data: withoutForecast('too_early', null) });

      expect(await getEventWeather('event-1')).not.toBeNull();
      expect(await getEventWeather('event-2')).toBeNull();
      expect(mockApi.get).toHaveBeenCalledTimes(2);
    });

    it('reuses a copy only for the same window and pin', async () => {
      respondWith({ success: true, data: available });
      await getEventWeather('event-1', { fingerprint: FP });
      expect(await getEventWeather('event-1', { fingerprint: FP })).not.toBeNull();
      expect(mockApi.get).toHaveBeenCalledTimes(1);

      // The organizer moved the event: the old answer must not be shown.
      respondWith({ success: true, data: withoutForecast('too_early', null) });
      expect(await getEventWeather('event-1', { fingerprint: 'moved|end|50.85|4.35' })).toBeNull();
      expect(mockApi.get).toHaveBeenCalledTimes(2);
    });

    it('refetches on force even when fresh', async () => {
      respondWith({ success: true, data: available });
      await getEventWeather('event-1');

      respondWith({ success: true, data: available });
      await getEventWeather('event-1', { force: true });

      expect(mockApi.get).toHaveBeenCalledTimes(2);
    });

    it('never touches the network with cacheOnly, serving whatever it has at any age', async () => {
      expect(await getEventWeather('event-1', { cacheOnly: true })).toBeNull();
      expect(mockApi.get).not.toHaveBeenCalled();

      respondWith({ success: true, data: available });
      await getEventWeather('event-1');
      jest.advanceTimersByTime(5 * WEATHER_MEMORY_TTL_MS);

      expect(await getEventWeather('event-1', { cacheOnly: true })).toEqual({
        ...available,
        days: [day],
      });
      expect(
        await getEventWeather('event-1', { cacheOnly: true, fingerprint: 'other' })
      ).toBeNull();
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });

    it('lets cacheOnly join a request that is already on its way', async () => {
      let resolveRequest: (value: unknown) => void = () => {};
      mockApi.get.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveRequest = resolve;
        }) as never
      );

      const online = getEventWeather('event-1');
      const offline = getEventWeather('event-1', { cacheOnly: true });
      resolveRequest({ data: { success: true, data: available } });

      expect((await offline)?.status).toBe('available');
      expect((await online)?.status).toBe('available');
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });

    it('shares one request between concurrent callers, force included', async () => {
      let resolveRequest: (value: unknown) => void = () => {};
      mockApi.get.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveRequest = resolve;
        }) as never
      );

      const first = getEventWeather('event-1');
      const second = getEventWeather('event-1');
      const forced = getEventWeather('event-1', { force: true });
      resolveRequest({ data: { success: true, data: available } });

      const results = await Promise.all([first, second, forced]);

      expect(mockApi.get).toHaveBeenCalledTimes(1);
      expect(results.every((weather) => weather?.status === 'available')).toBe(true);
    });
  });

  describe('failures never throw and are never cached', () => {
    it.each([404, 503])('hides the card quietly on a %s', async (status) => {
      mockApi.get.mockRejectedValueOnce({
        response: {
          status,
          data: { code: status === 404 ? 'EVENT_NOT_FOUND' : 'WEATHER_UNAVAILABLE' },
        },
        message: `Request failed with status code ${status}`,
      });

      expect(await getEventWeather('event-1')).toBeNull();
      expect(logger.info).toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();

      respondWith({ success: true, data: available });
      expect(await getEventWeather('event-1')).not.toBeNull();
    });

    it('keeps the last good forecast when a refresh fails', async () => {
      respondWith({ success: true, data: available });
      await getEventWeather('event-1', { fingerprint: FP });

      mockApi.get.mockRejectedValueOnce({
        response: { status: 503, data: { code: 'WEATHER_UNAVAILABLE' } },
        message: 'Request failed with status code 503',
      });
      expect(await getEventWeather('event-1', { force: true, fingerprint: FP })).toEqual({
        ...available,
        days: [day],
      });

      respondWith({ success: true, data: { ...available, days: 'x' } });
      expect(await getEventWeather('event-1', { force: true, fingerprint: FP })).toEqual({
        ...available,
        days: [day],
      });

      // …but not for a different window or pin.
      mockApi.get.mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'));
      expect(await getEventWeather('event-1', { fingerprint: 'moved' })).toBeNull();
    });

    it('handles the rewritten rate-limit error, which has no response', async () => {
      mockApi.get.mockRejectedValueOnce(
        Object.assign(new Error('Too many requests'), {
          code: 'RATE_LIMIT_EXCEEDED',
          isRateLimited: true,
        })
      );

      await expect(getEventWeather('event-1')).resolves.toBeNull();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('treats a network error as "nothing to show"', async () => {
      mockApi.get.mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'));

      await expect(getEventWeather('event-1')).resolves.toBeNull();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it.each([400, 500])('warns on an unexpected %s', async (status) => {
      mockApi.get.mockRejectedValueOnce({
        response: { status, data: { code: 'X' } },
        message: `Request failed with status code ${status}`,
      });

      await expect(getEventWeather('event-1')).resolves.toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        '[Weather] Forecast request failed',
        expect.objectContaining({ eventId: 'event-1', status })
      );
    });

    it.each([
      ['success false', { success: false, data: available }],
      ['data not an object', { success: true, data: 'x' }],
      ['days not an array', { success: true, data: { ...available, days: 'x' } }],
      ['available without days', { success: true, data: { ...available, days: [] } }],
      [
        'day without temperatures',
        { success: true, data: { ...available, days: [{ ...day, temp_min: null }] } },
      ],
      [
        'day with an unparseable window',
        { success: true, data: { ...available, days: [{ ...day, window_start: 'soon' }] } },
      ],
    ])('warns on a malformed body (%s) and does not remember it', async (_name, body) => {
      respondWith(body);

      await expect(getEventWeather('event-1')).resolves.toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        '[Weather] Unexpected response shape',
        expect.objectContaining({ eventId: 'event-1' })
      );

      respondWith({ success: true, data: available });
      expect(await getEventWeather('event-1')).not.toBeNull();
      expect(mockApi.get).toHaveBeenCalledTimes(2);
    });

    it('never throws even when the error is not an object', async () => {
      mockApi.get.mockRejectedValueOnce(undefined);

      await expect(getEventWeather('event-1')).resolves.toBeNull();
    });
  });
});
