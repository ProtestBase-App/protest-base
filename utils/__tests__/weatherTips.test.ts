import { en } from '@/constants/locales/en';
import { fr } from '@/constants/locales/fr';
import { nl } from '@/constants/locales/nl';
import { WeatherDay } from '@/types/weather.types';
import {
  buildWeatherMetrics,
  formatWeatherWindowDay,
  getWeatherConditionMeta,
  getWeatherTips,
  getWeatherUpdatedHoursAgo,
  getWeatherWindowNote,
  WEATHER_TIP_VARIANTS,
  WeatherTipKey,
} from '@/utils/weatherTips';

// A mild, grey June afternoon in Brussels (CEST): 14:00–17:00 local, sunset 21:50 local.
function day(overrides: Partial<WeatherDay> = {}): WeatherDay {
  return {
    date: '2026-06-11',
    window_start: '2026-06-11T12:00:00Z',
    window_end: '2026-06-11T15:00:00Z',
    confidence: 'high',
    condition: 'cloudy',
    is_night: false,
    temp_min: 18,
    temp_max: 22,
    feels_min: 17,
    feels_max: 21,
    precip_probability_max: 10,
    precip_mm: 0,
    gust_max_kmh: 15,
    uv_max: 3,
    sunrise: '2026-06-11T03:30:00Z',
    sunset: '2026-06-11T19:50:00Z',
    ...overrides,
  };
}

const keys = (d: WeatherDay, locale = 'en') => getWeatherTips(d, locale).map((tip) => tip.key);

describe('getWeatherTips', () => {
  it('answers "perfect" when nothing else applies', () => {
    expect(keys(day())).toEqual(['perfect']);
    expect(getWeatherTips(day(), 'en')[0]).toEqual({
      key: 'perfect',
      textKey: 'perfect',
      serious: false,
      icon: 'sparkles',
    });
  });

  it('answers "perfect" when every optional metric is missing', () => {
    expect(
      keys(
        day({
          condition: null,
          feels_min: null,
          feels_max: null,
          precip_probability_max: null,
          precip_mm: null,
          gust_max_kmh: null,
          uv_max: null,
          sunset: null,
          temp_min: 15,
          temp_max: 20,
        })
      )
    ).toEqual(['perfect']);
  });

  describe('thresholds', () => {
    it('heat at feels-like 30 and warm from 25 up to 29', () => {
      expect(keys(day({ feels_max: 30 }))).toEqual(['heat']);
      expect(keys(day({ feels_max: 29 }))).toEqual(['warm']);
      expect(keys(day({ feels_max: 25 }))).toEqual(['warm']);
      expect(keys(day({ feels_max: 24 }))).toEqual(['perfect']);
    });

    it('freezing at feels-like 0 or snow, cold from 8 down to 1', () => {
      expect(keys(day({ feels_min: 0 }))).toEqual(['freezing']);
      expect(keys(day({ feels_min: 1 }))).toEqual(['cold']);
      expect(keys(day({ feels_min: 8 }))).toEqual(['cold']);
      expect(keys(day({ feels_min: 9 }))).toEqual(['perfect']);
      expect(keys(day({ condition: 'snow', feels_min: 5 }))).toEqual(['freezing']);
    });

    it('strong wind at 60 km/h gusts, breezy from 40 to 59', () => {
      expect(keys(day({ gust_max_kmh: 60 }))).toEqual(['wind_strong']);
      expect(keys(day({ gust_max_kmh: 59 }))).toEqual(['wind']);
      expect(keys(day({ gust_max_kmh: 40 }))).toEqual(['wind']);
      expect(keys(day({ gust_max_kmh: 39 }))).toEqual(['perfect']);
    });

    it('rain at 60% probability or 1 mm, showers from 30% to 59%', () => {
      expect(keys(day({ precip_probability_max: 60 }))).toEqual(['rain']);
      expect(keys(day({ precip_probability_max: 59 }))).toEqual(['showers']);
      expect(keys(day({ precip_probability_max: 30 }))).toEqual(['showers']);
      expect(keys(day({ precip_probability_max: 29 }))).toEqual(['perfect']);
      expect(keys(day({ precip_probability_max: 10, precip_mm: 1 }))).toEqual(['rain']);
      expect(keys(day({ precip_probability_max: 10, precip_mm: 0.9 }))).toEqual(['perfect']);
    });

    it('judges rain on probability and amount, never on the condition alone', () => {
      expect(keys(day({ condition: 'rain', precip_probability_max: 10, precip_mm: 0 }))).toEqual([
        'perfect',
      ]);
    });

    it('strong sun at UV 6', () => {
      expect(keys(day({ uv_max: 6 }))).toEqual(['uv_high']);
      expect(keys(day({ uv_max: 5.9 }))).toEqual(['perfect']);
    });

    it('thunder comes from the condition', () => {
      expect(keys(day({ condition: 'thunder' }))).toEqual(['thunder']);
    });
  });

  describe('combined situations', () => {
    it('thunder with rain takes one row and drops the rain row', () => {
      expect(keys(day({ condition: 'thunder', precip_probability_max: 80 }))).toEqual([
        'thunder_rain',
      ]);
      // Showers alone are not enough for the combined wording.
      expect(keys(day({ condition: 'thunder', precip_probability_max: 40 }))).toEqual([
        'thunder',
        'showers',
      ]);
    });

    it('cold with rain replaces both rows; freezing keeps its own', () => {
      expect(keys(day({ feels_min: 5, precip_probability_max: 80 }))).toEqual(['cold_rain']);
      expect(keys(day({ feels_min: 5, precip_probability_max: 40 }))).toEqual(['showers', 'cold']);
      expect(keys(day({ feels_min: -2, precip_probability_max: 80 }))).toEqual([
        'freezing',
        'rain',
      ]);
    });

    it('breezy with rain replaces both rows; strong gusts keep their own', () => {
      expect(keys(day({ gust_max_kmh: 45, precip_mm: 3 }))).toEqual(['wind_rain']);
      expect(keys(day({ gust_max_kmh: 70, precip_mm: 3 }))).toEqual(['wind_strong', 'rain']);
    });

    it('prefers cold-and-rain over windy-and-rain, keeping the wind row', () => {
      expect(keys(day({ feels_min: 5, gust_max_kmh: 45, precip_mm: 3 }))).toEqual([
        'cold_rain',
        'wind',
      ]);
    });

    it('sun with rain or showers in daylight', () => {
      expect(keys(day({ condition: 'clear', precip_probability_max: 40 }))).toEqual(['sun_rain']);
      expect(keys(day({ condition: 'clear', precip_probability_max: 80 }))).toEqual(['sun_rain']);
      expect(keys(day({ condition: 'clear', is_night: true, precip_probability_max: 80 }))).toEqual(
        ['rain']
      );
    });
  });

  describe('sunny days', () => {
    it('a calm, clear day gets the sunny wordings; a clear night or grey day does not', () => {
      expect(keys(day({ condition: 'clear' }))).toEqual(['sunny']);
      expect(keys(day({ condition: 'clear', is_night: true }))).toEqual(['perfect']);
      expect(keys(day())).toEqual(['perfect']);
    });

    it('warm and clear becomes "sunny and warm", which already covers strong sun', () => {
      expect(keys(day({ condition: 'clear', feels_max: 27 }))).toEqual(['sunny_warm']);
      expect(keys(day({ condition: 'clear', feels_max: 27, uv_max: 7 }))).toEqual(['sunny_warm']);
      expect(keys(day({ feels_max: 27, uv_max: 7 }))).toEqual(['uv_high', 'warm']);
    });

    it('never adds the sunny wording next to another tip', () => {
      expect(keys(day({ condition: 'clear', gust_max_kmh: 45 }))).toEqual(['wind']);
    });
  });

  describe('wordings', () => {
    const variantKey = /^(.+)_(\d+)$/;

    it('uses the plain key for single-wording situations and key_N for the others', () => {
      const thunder = getWeatherTips(
        day({ condition: 'thunder', precip_probability_max: 10 }),
        'en'
      );
      expect(thunder[0].textKey).toBe('thunder');

      const [cold] = getWeatherTips(day({ feels_min: 5, precip_probability_max: 80 }), 'en');
      const match = cold.textKey.match(variantKey);
      expect(match?.[1]).toBe('cold_rain');
      expect(Number(match?.[2])).toBeGreaterThanOrEqual(1);
      expect(Number(match?.[2])).toBeLessThanOrEqual(WEATHER_TIP_VARIANTS.cold_rain ?? 0);
    });

    it('picks the same wording for the same seed and defaults the seed to the date', () => {
      const rainy = day({ feels_min: 5, precip_probability_max: 80 });
      const first = getWeatherTips(rainy, 'en', '2026-06-11T12:00:00Z')[0].textKey;
      expect(getWeatherTips(rainy, 'en', '2026-06-11T12:00:00Z')[0].textKey).toBe(first);
      expect(getWeatherTips(rainy, 'en')).toEqual(getWeatherTips(rainy, 'en', rainy.date));
    });

    it('varies the wording between seeds', () => {
      const rainy = day({ feels_min: 5, precip_probability_max: 80 });
      const picked = new Set(
        Array.from({ length: 40 }, (_, i) => getWeatherTips(rainy, 'en', `event-${i}`)[0].textKey)
      );
      expect(picked.size).toBeGreaterThan(1);
    });

    it('has every wording in every language', () => {
      const allKeys: WeatherTipKey[] = [
        'thunder',
        'thunder_rain',
        'heat',
        'freezing',
        'wind_strong',
        'cold_rain',
        'wind_rain',
        'sun_rain',
        'rain',
        'showers',
        'uv_high',
        'sunny_warm',
        'warm',
        'wind',
        'cold',
        'dark',
        'sunny',
        'perfect',
      ];
      const textKeys = allKeys.flatMap((key) => {
        const count = WEATHER_TIP_VARIANTS[key];
        return count ? Array.from({ length: count }, (_, i) => `${key}_${i + 1}`) : [key];
      });

      for (const locale of [en, fr, nl]) {
        const tips = locale.weather.tips as Record<string, string>;
        for (const textKey of textKeys) {
          expect([textKey, typeof tips[textKey]]).toEqual([textKey, 'string']);
        }
        // Stricter than locales.test.ts on purpose: these keys are built at runtime,
        // so a missing wording would show the raw key on the card.
        expect(Object.keys(tips).sort()).toEqual([...textKeys].sort());
      }
    });
  });

  it('falls back to the air temperature when feels-like is missing', () => {
    expect(keys(day({ feels_max: null, temp_max: 35 }))).toEqual(['heat']);
    expect(keys(day({ feels_min: null, temp_min: -2 }))).toEqual(['freezing']);
  });

  it('treats NaN like a missing value', () => {
    expect(keys(day({ feels_max: Number.NaN, temp_max: 20, gust_max_kmh: Number.NaN }))).toEqual([
      'perfect',
    ]);
  });

  it('orders tips by priority and caps them at three', () => {
    const tips = getWeatherTips(
      day({ condition: 'thunder', feels_max: 31, precip_probability_max: 80, uv_max: 7 }),
      'en'
    );
    expect(tips.map((tip) => tip.key)).toEqual(['thunder_rain', 'heat', 'uv_high']);
    expect(tips.map((tip) => tip.serious)).toEqual([true, true, false]);
  });

  it('never pairs a serious tip with its milder sibling', () => {
    expect(keys(day({ feels_max: 32 }))).not.toContain('warm');
    expect(keys(day({ feels_min: -3 }))).not.toContain('cold');
    expect(keys(day({ gust_max_kmh: 70 }))).not.toContain('wind');
    expect(keys(day({ precip_probability_max: 90 }))).not.toContain('showers');
  });

  it('never adds "perfect" next to another tip', () => {
    expect(keys(day({ uv_max: 7 }))).toEqual(['uv_high']);
  });

  describe('dark', () => {
    // 19:00–23:00 Brussels crosses the 21:50 sunset.
    const evening = { window_start: '2026-06-11T17:00:00Z', window_end: '2026-06-11T21:00:00Z' };

    it('fires with the sunset time in the locale format when the window crosses sunset', () => {
      const en = getWeatherTips(day(evening), 'en');
      expect(en).toHaveLength(1);
      expect(en[0].key).toBe('dark');
      expect(en[0].icon).toBe('sunset.fill');
      expect(en[0].params?.time).toMatch(/^9:50\sPM$/);

      expect(getWeatherTips(day(evening), 'fr')[0].params?.time).toBe('21:50');
      expect(getWeatherTips(day(evening), 'nl')[0].params?.time).toBe('21:50');
    });

    it('stays silent when the window ends before sunset', () => {
      expect(keys(day())).toEqual(['perfect']);
    });

    it('stays silent when the window starts after sunset', () => {
      expect(
        keys(day({ window_start: '2026-06-11T20:00:00Z', window_end: '2026-06-11T22:00:00Z' }))
      ).toEqual(['perfect']);
    });

    it('stays silent without a sunset or with an unparseable one', () => {
      expect(keys(day({ ...evening, sunset: null }))).toEqual(['perfect']);
      expect(keys(day({ ...evening, sunset: 'later' }))).toEqual(['perfect']);
    });
  });
});

describe('getWeatherConditionMeta', () => {
  it.each([
    ['clear', false, 'sun.max.fill', 'weather.conditions.clear'],
    ['clear', true, 'moon.stars.fill', 'weather.conditions.clearNight'],
    ['cloudy', false, 'cloud.sun.fill', 'weather.conditions.cloudy'],
    ['cloudy', true, 'cloud.moon.fill', 'weather.conditions.cloudy'],
    ['fog', false, 'cloud.fog.fill', 'weather.conditions.fog'],
    ['drizzle', true, 'cloud.drizzle.fill', 'weather.conditions.drizzle'],
    ['rain', false, 'cloud.rain.fill', 'weather.conditions.rain'],
    ['snow', false, 'cloud.snow.fill', 'weather.conditions.snow'],
    ['thunder', true, 'cloud.bolt.rain.fill', 'weather.conditions.thunder'],
  ])('%s (night: %s) → %s', (condition, isNight, icon, labelKey) => {
    expect(getWeatherConditionMeta(condition, isNight)).toEqual({ icon, labelKey });
  });

  it('gives unknown or missing conditions a neutral glyph', () => {
    const neutral = { icon: 'thermometer.medium', labelKey: 'weather.conditions.unknown' };
    expect(getWeatherConditionMeta(null, false)).toEqual(neutral);
    expect(getWeatherConditionMeta('hail', false)).toEqual(neutral);
  });
});

describe('formatWeatherWindowDay', () => {
  it('formats the Brussels date with a capitalised weekday', () => {
    expect(formatWeatherWindowDay(day(), 'en')).toBe('Thu, Jun 11');
    expect(formatWeatherWindowDay(day(), 'fr')).toMatch(/^Jeu\.? 11 juin\.?$/);
    expect(formatWeatherWindowDay(day(), 'nl')).toMatch(/^Do\.? 11 jun\.?$/);
  });

  it('falls back to English for an unknown locale', () => {
    expect(formatWeatherWindowDay(day(), 'de')).toBe('Thu, Jun 11');
  });

  it('uses the Brussels date, not the UTC one', () => {
    // 22:30Z on the 11th is 00:30 on the 12th in Brussels.
    expect(formatWeatherWindowDay(day({ window_start: '2026-06-11T22:30:00Z' }), 'en')).toBe(
      'Fri, Jun 12'
    );
  });

  it('returns an empty label when the window does not parse', () => {
    expect(formatWeatherWindowDay(day({ window_start: 'soon' }), 'en')).toBe('');
  });
});

describe('getWeatherWindowNote', () => {
  // The fixture window is 14:00–17:00 Brussels on Thu 11 June (12:00Z–15:00Z).
  const start = '2026-06-11T12:00:00Z';
  const end = '2026-06-11T15:00:00Z';

  it('is silent when the forecast covers the whole event', () => {
    expect(getWeatherWindowNote(day(), start, end, 'en')).toBeNull();
    expect(getWeatherWindowNote(day(), start, null, 'en')).toBeNull();
  });

  it('is silent without a usable event start', () => {
    expect(getWeatherWindowNote(day(), undefined, undefined, 'en')).toBeNull();
    expect(getWeatherWindowNote(day(), 'later', end, 'en')).toBeNull();
  });

  it('says "from now" when the window starts after the event did', () => {
    const underWay = day({ window_start: '2026-06-11T13:37:00Z' });
    expect(getWeatherWindowNote(underWay, start, end, 'en')).toEqual({
      key: 'fromNow',
      params: { time: expect.stringMatching(/^5:00\sPM$/) },
    });
    expect(getWeatherWindowNote(underWay, start, end, 'fr')).toEqual({
      key: 'fromNow',
      params: { time: '17:00' },
    });
  });

  it('ignores a start difference of less than a minute', () => {
    expect(getWeatherWindowNote(day(), '2026-06-11T11:59:30Z', end, 'en')).toBeNull();
  });

  it('names the day when the event runs on to a later date', () => {
    expect(getWeatherWindowNote(day(), start, '2026-06-13T15:00:00Z', 'en')).toEqual({
      key: 'forDay',
      params: { day: 'Thu, Jun 11' },
    });
  });

  it('stays silent when the event only ends later the same day (all-day storage)', () => {
    expect(getWeatherWindowNote(day(), start, '2026-06-11T21:59:59Z', 'en')).toBeNull();
  });

  it('prefers "from now" for an ongoing multi-day event', () => {
    expect(
      getWeatherWindowNote(
        day({ window_start: '2026-06-11T13:00:00Z' }),
        start,
        '2026-06-13T15:00:00Z',
        'en'
      )?.key
    ).toBe('fromNow');
  });
});

describe('buildWeatherMetrics', () => {
  it('splits the temperature headline from the detail metrics, in display order', () => {
    expect(buildWeatherMetrics(day({ precip_probability_max: 70, gust_max_kmh: 48 }))).toEqual({
      temperature: { key: 'temp', params: { min: '18', max: '22' } },
      details: [
        { key: 'feels', params: { min: '17', max: '21' } },
        { key: 'rain', params: { value: '70' } },
        { key: 'gusts', params: { value: '48' } },
      ],
    });
  });

  it('leaves out metrics the forecast has no value for', () => {
    expect(
      buildWeatherMetrics(
        day({ feels_min: null, feels_max: null, precip_probability_max: null, gust_max_kmh: null })
      )
    ).toEqual({ temperature: { key: 'temp', params: { min: '18', max: '22' } }, details: [] });
  });

  it('collapses equal ranges to a single value', () => {
    const { temperature, details } = buildWeatherMetrics(
      day({ temp_min: 20, temp_max: 20, feels_min: 19, feels_max: 19 })
    );
    expect(temperature).toEqual({ key: 'tempSingle', params: { value: '20' } });
    expect(details[0]).toEqual({ key: 'feelsSingle', params: { value: '19' } });
  });

  it('words a range with a negative bound and uses a real minus sign', () => {
    const { temperature, details } = buildWeatherMetrics(
      day({ temp_min: -3, temp_max: 0, feels_min: -7, feels_max: -4 })
    );
    expect(temperature).toEqual({ key: 'tempBelowZero', params: { min: '\u22123', max: '0' } });
    expect(details[0]).toEqual({
      key: 'feelsBelowZero',
      params: { min: '\u22127', max: '\u22124' },
    });
  });

  it('never yields negative zero', () => {
    expect(buildWeatherMetrics(day({ temp_min: -0.4, temp_max: 3 })).temperature).toEqual({
      key: 'temp',
      params: { min: '0', max: '3' },
    });
    // -0.4 and 0.4 both round to 0, so the range collapses to one value.
    expect(buildWeatherMetrics(day({ temp_min: -0.4, temp_max: 0.4 })).temperature).toEqual({
      key: 'tempSingle',
      params: { value: '0' },
    });
  });
});

describe('getWeatherUpdatedHoursAgo', () => {
  const now = new Date('2026-06-11T12:00:00Z');

  it('reports at least one hour for a fresh forecast', () => {
    expect(getWeatherUpdatedHoursAgo('2026-06-11T11:40:00Z', now)).toBe(1);
  });

  it('floors to whole hours', () => {
    expect(getWeatherUpdatedHoursAgo('2026-06-11T06:30:00Z', now)).toBe(5);
  });

  it('clamps to the most the backend would ever serve', () => {
    expect(getWeatherUpdatedHoursAgo('2026-06-10T22:00:00Z', now)).toBe(12);
    expect(getWeatherUpdatedHoursAgo('2026-06-01T22:00:00Z', now)).toBe(12);
  });

  it('gives up on future, missing or unparseable timestamps', () => {
    expect(getWeatherUpdatedHoursAgo('2026-06-11T12:30:00Z', now)).toBe(null);
    expect(getWeatherUpdatedHoursAgo(null, now)).toBe(null);
    expect(getWeatherUpdatedHoursAgo('yesterday', now)).toBe(null);
  });
});
