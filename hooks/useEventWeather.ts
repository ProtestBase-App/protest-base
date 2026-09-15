import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Event } from '@/types/event.types';
import { EventWeather } from '@/types/weather.types';
import { getEventWeather } from '@/services/weather.service';
import { getTodayDateKeyInBelgium } from '@/utils/calendarUtils';
import { getWeatherFingerprint, isWeatherEligible } from '@/utils/weatherEligibility';

export interface UseEventWeatherOptions {
  isOffline: boolean;
}

export interface UseEventWeatherResult {
  /** The forecast to render, or null when there is no card to show. */
  weather: EventWeather | null;
  /** Pull-to-refresh: bypasses the memory TTL. Never rejects. */
  refresh: () => Promise<void>;
}

interface WeatherState {
  eventId: string | null;
  weather: EventWeather | null;
}

// Evaluated against the clock at render time; lives outside the hook because
// the eligibility rules are pure and time is an input, not a side effect.
const isEligibleNow = (event: Event): boolean =>
  isWeatherEligible(event, getTodayDateKeyInBelgium(), new Date());

/**
 * The "Protest forecast" for the event on screen.
 *
 * Takes the RAW event (the formatted one has display strings for its times)
 * and the connectivity flag, so it stays free of context. The request only
 * goes out when the client-side pre-check passes; offline, the answer comes
 * from memory or not at all. State is keyed by event id so an id change or an
 * eligibility flip hides the card in the same render, without a reset effect.
 */
export function useEventWeather(
  rawEvent: Event | null,
  { isOffline }: UseEventWeatherOptions
): UseEventWeatherResult {
  const eventId = rawEvent?.$id ?? null;
  // The screen hands over a new event object after every revalidation and
  // counter bump; the verdict only needs re-evaluating for a new object.
  const eligible = useMemo(() => rawEvent !== null && isEligibleNow(rawEvent), [rawEvent]);
  // Window + pin: an organizer's edit changes it, and with it the forecast.
  const fingerprint = rawEvent ? getWeatherFingerprint(rawEvent) : '';

  const [state, setState] = useState<WeatherState>({ eventId: null, weather: null });

  // Latest id / mount flag for the refresh path, which resolves after the
  // user may have moved on to another event or left the screen.
  const eventIdRef = useRef(eventId);
  useEffect(() => {
    eventIdRef.current = eventId;
  });
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Keyed on the id, the eligibility VERDICT and the fingerprint, never on
  // the event object itself.
  useEffect(() => {
    if (!eventId || !eligible) return;
    let active = true;
    getEventWeather(eventId, { cacheOnly: isOffline, fingerprint }).then((weather) => {
      if (active) setState({ eventId, weather });
    });
    return () => {
      active = false;
    };
  }, [eventId, eligible, isOffline, fingerprint]);

  const refresh = useCallback(async () => {
    if (!eventId || !eligible || isOffline) return;
    const weather = await getEventWeather(eventId, { force: true, fingerprint });
    if (mountedRef.current && eventIdRef.current === eventId) {
      setState({ eventId, weather });
    }
  }, [eventId, eligible, isOffline, fingerprint]);

  return {
    weather: eligible && state.eventId === eventId ? state.weather : null,
    refresh,
  };
}
