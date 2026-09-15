// Mocks (must be hoisted before imports)
const mockGetEventWeather = jest.fn();

jest.mock('@/services/weather.service', () => ({
  getEventWeather: (...args: unknown[]) => mockGetEventWeather(...args),
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createMockEvent } from '@/test-utils/render';
import { useEventWeather } from '@/hooks/useEventWeather';
import { Event } from '@/types/event.types';
import { EventWeather } from '@/types/weather.types';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Eligibility runs against the real clock, so fixtures are relative to now —
// fixed once, so two fixtures describe the same window (same fingerprint).
const START_MS = Date.now() + DAY_MS;
const START = new Date(START_MS).toISOString();
const END = new Date(START_MS + 3 * HOUR_MS).toISOString();

function geocodedEvent(overrides: Partial<Event> = {}): Event {
  return createMockEvent({
    $id: 'event-1',
    status: 'active',
    geocod_status: 'OK',
    geocod_lat: 50.8466,
    geocod_lng: 4.3528,
    start_time: START,
    end_time: END,
    ...overrides,
  });
}

const forecast = (overrides: Partial<EventWeather> = {}): EventWeather => ({
  status: 'available',
  reason: null,
  available_from: null,
  generated_at: '2026-09-13T14:10:00Z',
  stale: false,
  attribution: 'open-meteo',
  days: [
    {
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
    },
  ],
  ...overrides,
});

type HookProps = { event: Event | null; isOffline: boolean };

const renderWeather = (initial: HookProps) =>
  renderHook(({ event, isOffline }: HookProps) => useEventWeather(event, { isOffline }), {
    initialProps: initial,
  });

const anyFingerprint = expect.any(String);

describe('useEventWeather', () => {
  beforeEach(() => {
    mockGetEventWeather.mockReset();
    mockGetEventWeather.mockResolvedValue(forecast());
  });

  it('fetches once for an eligible event and exposes the forecast', async () => {
    const { result } = renderWeather({ event: geocodedEvent(), isOffline: false });

    await waitFor(() => expect(result.current.weather).not.toBeNull());

    expect(mockGetEventWeather).toHaveBeenCalledTimes(1);
    expect(mockGetEventWeather).toHaveBeenCalledWith('event-1', {
      cacheOnly: false,
      fingerprint: anyFingerprint,
    });
    expect(result.current.weather?.status).toBe('available');
  });

  it.each([
    ['no event', null],
    ['no geocode', geocodedEvent({ geocod_status: null })],
    ['cancelled', geocodedEvent({ status: 'cancelled' })],
    [
      'beyond the horizon',
      geocodedEvent({
        start_time: new Date(Date.now() + 10 * DAY_MS).toISOString(),
        end_time: new Date(Date.now() + 10 * DAY_MS + HOUR_MS).toISOString(),
      }),
    ],
  ])('makes no request when ineligible (%s)', async (_name, event) => {
    const { result } = renderWeather({ event, isOffline: false });

    await act(async () => {});

    expect(mockGetEventWeather).not.toHaveBeenCalled();
    expect(result.current.weather).toBeNull();
  });

  it('answers from memory only while offline, then refetches when back online', async () => {
    mockGetEventWeather.mockResolvedValueOnce(null);
    const { result, rerender } = renderWeather({ event: geocodedEvent(), isOffline: true });

    await act(async () => {});
    expect(mockGetEventWeather).toHaveBeenCalledWith('event-1', {
      cacheOnly: true,
      fingerprint: anyFingerprint,
    });
    expect(result.current.weather).toBeNull();

    rerender({ event: geocodedEvent(), isOffline: false });

    await waitFor(() => expect(result.current.weather).not.toBeNull());
    expect(mockGetEventWeather).toHaveBeenLastCalledWith('event-1', {
      cacheOnly: false,
      fingerprint: anyFingerprint,
    });
  });

  it('does not refetch when the event object changes but nothing relevant did', async () => {
    const { result, rerender } = renderWeather({ event: geocodedEvent(), isOffline: false });
    await waitFor(() => expect(result.current.weather).not.toBeNull());

    rerender({ event: geocodedEvent({ save_count: 5 }), isOffline: false });
    await act(async () => {});

    expect(mockGetEventWeather).toHaveBeenCalledTimes(1);
    expect(result.current.weather).not.toBeNull();
  });

  it('refetches with a new fingerprint when the window or pin changes', async () => {
    const { result, rerender } = renderWeather({ event: geocodedEvent(), isOffline: false });
    await waitFor(() => expect(result.current.weather).not.toBeNull());
    const [, firstOptions] = mockGetEventWeather.mock.calls[0];

    rerender({
      event: geocodedEvent({ end_time: new Date(START_MS + 5 * HOUR_MS).toISOString() }),
      isOffline: false,
    });
    await act(async () => {});

    expect(mockGetEventWeather).toHaveBeenCalledTimes(2);
    const [, secondOptions] = mockGetEventWeather.mock.calls[1];
    expect(secondOptions.fingerprint).not.toBe(firstOptions.fingerprint);
  });

  it('drops a result for a previous event when the id changes mid-flight', async () => {
    let resolveFirst: (value: EventWeather | null) => void = () => {};
    mockGetEventWeather.mockReturnValueOnce(
      new Promise<EventWeather | null>((resolve) => {
        resolveFirst = resolve;
      })
    );
    const second = forecast({ generated_at: '2026-09-13T15:00:00Z' });
    mockGetEventWeather.mockResolvedValueOnce(second);

    const { result, rerender } = renderWeather({ event: geocodedEvent(), isOffline: false });
    rerender({ event: geocodedEvent({ $id: 'event-2' }), isOffline: false });

    await waitFor(() => expect(result.current.weather?.generated_at).toBe(second.generated_at));

    await act(async () => {
      resolveFirst(forecast({ generated_at: 'first' }));
    });

    expect(result.current.weather?.generated_at).toBe(second.generated_at);
    expect(mockGetEventWeather).toHaveBeenCalledWith('event-2', {
      cacheOnly: false,
      fingerprint: anyFingerprint,
    });
  });

  it('hides the forecast in the same render when the event stops being eligible', async () => {
    const { result, rerender } = renderWeather({ event: geocodedEvent(), isOffline: false });
    await waitFor(() => expect(result.current.weather).not.toBeNull());

    rerender({ event: geocodedEvent({ status: 'cancelled' }), isOffline: false });

    expect(result.current.weather).toBeNull();
    expect(mockGetEventWeather).toHaveBeenCalledTimes(1);
  });

  it('ignores a response that lands after unmount', async () => {
    let resolveRequest: (value: EventWeather | null) => void = () => {};
    mockGetEventWeather.mockReturnValueOnce(
      new Promise<EventWeather | null>((resolve) => {
        resolveRequest = resolve;
      })
    );
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount } = renderWeather({ event: geocodedEvent(), isOffline: false });
    unmount();
    await act(async () => {
      resolveRequest(forecast());
    });

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  describe('refresh', () => {
    it('forces a refetch and updates the forecast', async () => {
      const { result } = renderWeather({ event: geocodedEvent(), isOffline: false });
      await waitFor(() => expect(result.current.weather).not.toBeNull());

      const refreshed = forecast({ stale: true });
      mockGetEventWeather.mockResolvedValueOnce(refreshed);
      await act(async () => {
        await result.current.refresh();
      });

      expect(mockGetEventWeather).toHaveBeenLastCalledWith('event-1', {
        force: true,
        fingerprint: anyFingerprint,
      });
      expect(result.current.weather?.stale).toBe(true);
    });

    it('is a no-op while ineligible or offline', async () => {
      const ineligible = renderWeather({
        event: geocodedEvent({ status: 'cancelled' }),
        isOffline: false,
      });
      await act(async () => {
        await ineligible.result.current.refresh();
      });

      const offline = renderWeather({ event: geocodedEvent(), isOffline: true });
      await act(async () => {});
      mockGetEventWeather.mockClear();
      await act(async () => {
        await offline.result.current.refresh();
      });

      expect(mockGetEventWeather).not.toHaveBeenCalled();
    });

    it('never rejects, even when the service has nothing', async () => {
      const { result } = renderWeather({ event: geocodedEvent(), isOffline: false });
      await waitFor(() => expect(result.current.weather).not.toBeNull());

      mockGetEventWeather.mockResolvedValueOnce(null);
      await act(async () => {
        await expect(result.current.refresh()).resolves.toBeUndefined();
      });

      expect(result.current.weather).toBeNull();
    });
  });
});
