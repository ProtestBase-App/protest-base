/**
 * Pure rules turning a `WeatherDay` summary into the "Protest forecast" card's
 * content: tips (keys into `weather.tips.*`), the condition glyph, the metric
 * lines and the optional time note. Copy lives in the locale files.
 */

import { WeatherDay } from '@/types/weather.types';
import {
  WEATHER_MAX_TIPS,
  WEATHER_TIP_THRESHOLDS,
  WEATHER_UPDATED_AGO_MAX_HOURS,
} from '@/constants/WeatherConfig';
import {
  EVENT_TIMEZONE,
  formatEventTime,
  getDateFormatter,
  parseAsUTC,
} from '@/utils/eventFormatters';

export type WeatherTipKey =
  | 'thunder'
  | 'thunder_rain'
  | 'heat'
  | 'freezing'
  | 'wind_strong'
  | 'cold_rain'
  | 'wind_rain'
  | 'sun_rain'
  | 'rain'
  | 'showers'
  | 'uv_high'
  | 'sunny_warm'
  | 'warm'
  | 'wind'
  | 'cold'
  | 'dark'
  | 'sunny'
  | 'perfect';

/**
 * Situations with several wordings, stored as `weather.tips.<key>_1` … `_N`.
 * Every other key has a single `weather.tips.<key>`.
 */
export const WEATHER_TIP_VARIANTS: Partial<Record<WeatherTipKey, number>> = {
  thunder_rain: 2,
  heat: 3,
  freezing: 4,
  cold_rain: 8,
  sun_rain: 2,
  rain: 3,
  sunny_warm: 4,
  wind: 3,
  cold: 3,
  sunny: 3,
};

/**
 * SF Symbol names the card may use. Declared here rather than imported from
 * `components/ui/IconSymbol` so utils never depend on components; the
 * compiler still checks each one against the IconSymbol mapping at the call
 * site.
 */
export type WeatherIconName =
  | 'sun.max.fill'
  | 'moon.stars.fill'
  | 'cloud.sun.fill'
  | 'cloud.moon.fill'
  | 'cloud.fog.fill'
  | 'cloud.drizzle.fill'
  | 'cloud.rain.fill'
  | 'cloud.snow.fill'
  | 'cloud.bolt.rain.fill'
  | 'thermometer.medium'
  | 'thermometer.sun.fill'
  | 'thermometer.snowflake'
  | 'wind'
  | 'umbrella.fill'
  | 'drop.fill'
  | 'thermometer.low'
  | 'sunset.fill'
  | 'sparkles';

export interface WeatherTip {
  key: WeatherTipKey;
  /** The locale key under `weather.tips`: `key`, or `key_N` for the wording picked. */
  textKey: string;
  /** Plain, non-playful wording and the warning colour. */
  serious: boolean;
  icon: WeatherIconName;
  params?: { time: string };
}

export interface WeatherConditionMeta {
  icon: WeatherIconName;
  labelKey: string;
}

export type WeatherMetricKey =
  | 'temp'
  | 'tempSingle'
  | 'tempBelowZero'
  | 'feels'
  | 'feelsSingle'
  | 'feelsBelowZero'
  | 'rain'
  | 'gusts';

/** Params are pre-formatted strings so negatives carry a real minus sign. */
export interface WeatherMetricItem {
  key: WeatherMetricKey;
  params: Record<string, string>;
}

export interface WeatherMetrics {
  /** Goes in the headline next to the condition. */
  temperature: WeatherMetricItem | null;
  /** The secondary line, in display order. */
  details: WeatherMetricItem[];
}

/** A time is shown only when the forecast does not cover the whole event. */
export type WeatherWindowNote =
  { key: 'fromNow'; params: { time: string } } | { key: 'forDay'; params: { day: string } };

const LOCALE_MAP: Record<string, string> = { en: 'en-US', fr: 'fr-FR', nl: 'nl-NL' };
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

// `Math.round(-0.4)` is -0, which template literals render as "0" but toFixed
// would render as "-0"; normalise so no formatter can ever see it.
const whole = (value: number): number => {
  const rounded = Math.round(value);
  return Object.is(rounded, -0) ? 0 : rounded;
};

// A hyphen-minus next to the range dash reads as "−7––4"; use the real sign.
const signed = (value: number): string => (value < 0 ? `\u2212${Math.abs(value)}` : String(value));

const parseInstant = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const date = parseAsUTC(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};

const resolveLocale = (locale: string): string => LOCALE_MAP[locale] || 'en-US';

const capitalise = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

// en-CA outputs YYYY-MM-DD; the Brussels calendar date, like calendarUtils.
const brusselsDateKey = (date: Date): string =>
  getDateFormatter('en-CA', {
    timeZone: EVENT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

/**
 * Sunset when it falls strictly inside the window — the moment the crowd
 * will actually watch the light go. A window that starts after dark gets no
 * "it gets dark at…" (they already know), one that ends before it neither.
 */
function sunsetInsideWindow(day: WeatherDay): Date | null {
  const sunset = parseInstant(day.sunset);
  const start = parseInstant(day.window_start);
  const end = parseInstant(day.window_end);
  if (!sunset || !start || !end) return null;
  return start < sunset && sunset < end ? sunset : null;
}

// A stable pick, so the wording never changes between renders or refreshes
// but differs from one event to the next.
const pickVariant = (seed: string, count: number): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return (hash % count) + 1;
};

/**
 * Up to WEATHER_MAX_TIPS tips, highest priority first. Rain is judged on
 * probability and amount, never on `condition` alone: the probability comes
 * from a coarser model and can legitimately disagree with the weather code.
 * Feels-like falls back to the air temperature so a hot day with a missing
 * apparent temperature still gets its heat tip.
 *
 * `seed` picks among a situation's wordings (the event start is a good one);
 * it defaults to the forecast date.
 */
export function getWeatherTips(
  day: WeatherDay,
  locale: string,
  seed?: string | null
): WeatherTip[] {
  const T = WEATHER_TIP_THRESHOLDS;
  const feelsMax = num(day.feels_max) ?? num(day.temp_max);
  const feelsMin = num(day.feels_min) ?? num(day.temp_min);
  const gust = num(day.gust_max_kmh);
  const probability = num(day.precip_probability_max);
  const mm = num(day.precip_mm);
  const uv = num(day.uv_max);
  const variantSeed = seed || day.date;

  const tips: WeatherTip[] = [];
  const add = (
    key: WeatherTipKey,
    serious: boolean,
    icon: WeatherIconName,
    params?: WeatherTip['params']
  ) => {
    const count = WEATHER_TIP_VARIANTS[key];
    const textKey = count ? `${key}_${pickVariant(`${variantSeed}|${key}`, count)}` : key;
    tips.push(params ? { key, textKey, serious, icon, params } : { key, textKey, serious, icon });
  };

  // "clear" covers mainly-clear skies too; "cloudy" includes overcast, so it never counts as sunny.
  const sunnyDay = day.condition === 'clear' && !day.is_night;
  const rain =
    (probability !== null && probability >= T.RAIN_PROBABILITY_PCT) ||
    (mm !== null && mm >= T.RAIN_MM);
  const showers = !rain && probability !== null && probability >= T.SHOWERS_PROBABILITY_PCT;
  const hot = feelsMax !== null && feelsMax >= T.HEAT_FEELS_C;
  const freezing =
    (feelsMin !== null && feelsMin <= T.FREEZING_FEELS_C) || day.condition === 'snow';
  const strongWind = gust !== null && gust >= T.WIND_STRONG_KMH;
  const windy = !strongWind && gust !== null && gust >= T.WIND_KMH;
  const cold = !freezing && feelsMin !== null && feelsMin <= T.COLD_FEELS_C;
  const warm = !hot && feelsMax !== null && feelsMax >= T.WARM_FEELS_C;

  // A combined wording replaces both of its rows, so the card never says "rain" twice.
  const thunderRain = day.condition === 'thunder' && rain;
  const coldRain = !thunderRain && cold && rain;
  const windRain = !thunderRain && !coldRain && windy && rain;

  if (day.condition === 'thunder') {
    add(thunderRain ? 'thunder_rain' : 'thunder', true, 'cloud.bolt.rain.fill');
  }
  if (hot) add('heat', true, 'thermometer.sun.fill');
  if (freezing) add('freezing', true, 'thermometer.snowflake');
  if (strongWind) add('wind_strong', true, 'wind');

  if (coldRain) add('cold_rain', false, 'cloud.rain.fill');
  else if (windRain) add('wind_rain', false, 'wind');
  else if (!thunderRain && sunnyDay && (rain || showers)) add('sun_rain', false, 'umbrella.fill');
  else if (!thunderRain && rain) add('rain', false, 'umbrella.fill');
  else if (showers) add('showers', false, 'cloud.drizzle.fill');

  // The sunny-and-warm wordings already cover sun protection.
  if (uv !== null && uv >= T.UV_HIGH && !(warm && sunnyDay)) add('uv_high', false, 'sun.max.fill');
  if (warm) add(sunnyDay ? 'sunny_warm' : 'warm', false, sunnyDay ? 'sun.max.fill' : 'drop.fill');
  if (windy && !windRain) add('wind', false, 'wind');
  if (cold && !coldRain) add('cold', false, 'thermometer.low');

  if (sunsetInsideWindow(day) && day.sunset) {
    add('dark', false, 'sunset.fill', { time: formatEventTime(day.sunset, locale) });
  }

  if (tips.length === 0)
    add(sunnyDay ? 'sunny' : 'perfect', false, sunnyDay ? 'sun.max.fill' : 'sparkles');
  return tips.slice(0, WEATHER_MAX_TIPS);
}

/** Glyph and label for the header. Unknown values (a future condition) get a neutral thermometer. */
export function getWeatherConditionMeta(
  condition: string | null,
  isNight: boolean
): WeatherConditionMeta {
  switch (condition) {
    case 'clear':
      return isNight
        ? { icon: 'moon.stars.fill', labelKey: 'weather.conditions.clearNight' }
        : { icon: 'sun.max.fill', labelKey: 'weather.conditions.clear' };
    case 'cloudy':
      return {
        icon: isNight ? 'cloud.moon.fill' : 'cloud.sun.fill',
        labelKey: 'weather.conditions.cloudy',
      };
    case 'fog':
      return { icon: 'cloud.fog.fill', labelKey: 'weather.conditions.fog' };
    case 'drizzle':
      return { icon: 'cloud.drizzle.fill', labelKey: 'weather.conditions.drizzle' };
    case 'rain':
      return { icon: 'cloud.rain.fill', labelKey: 'weather.conditions.rain' };
    case 'snow':
      return { icon: 'cloud.snow.fill', labelKey: 'weather.conditions.snow' };
    case 'thunder':
      return { icon: 'cloud.bolt.rain.fill', labelKey: 'weather.conditions.thunder' };
    default:
      return { icon: 'thermometer.medium', labelKey: 'weather.conditions.unknown' };
  }
}

type RangeKeys = { range: WeatherMetricKey; single: WeatherMetricKey; belowZero: WeatherMetricKey };

// "16–18" reads fine; "−7–−4" does not, so a range with a negative bound gets
// the worded form ("−7 to −4").
function rangeItem(min: number, max: number, keys: RangeKeys): WeatherMetricItem {
  const low = whole(min);
  const high = whole(max);
  if (low === high) return { key: keys.single, params: { value: signed(low) } };
  return {
    key: low < 0 || high < 0 ? keys.belowZero : keys.range,
    params: { min: signed(low), max: signed(high) },
  };
}

/** The headline temperature and the detail metrics; anything without a value is left out. */
export function buildWeatherMetrics(day: WeatherDay): WeatherMetrics {
  const tempMin = num(day.temp_min);
  const tempMax = num(day.temp_max);
  const temperature =
    tempMin !== null && tempMax !== null
      ? rangeItem(tempMin, tempMax, {
          range: 'temp',
          single: 'tempSingle',
          belowZero: 'tempBelowZero',
        })
      : null;

  const details: WeatherMetricItem[] = [];
  const feelsMin = num(day.feels_min);
  const feelsMax = num(day.feels_max);
  if (feelsMin !== null && feelsMax !== null) {
    details.push(
      rangeItem(feelsMin, feelsMax, {
        range: 'feels',
        single: 'feelsSingle',
        belowZero: 'feelsBelowZero',
      })
    );
  }
  const probability = num(day.precip_probability_max);
  if (probability !== null)
    details.push({ key: 'rain', params: { value: String(whole(probability)) } });
  const gust = num(day.gust_max_kmh);
  if (gust !== null) details.push({ key: 'gusts', params: { value: String(whole(gust)) } });

  return { temperature, details };
}

/** "Fri, Sep 18" (en) / "Ven. 18 sept." (fr) / "Vr 18 sep" (nl): the Brussels date the window starts on. */
export function formatWeatherWindowDay(day: WeatherDay, locale: string): string {
  const start = parseInstant(day.window_start);
  if (!start) return '';
  return capitalise(
    getDateFormatter(resolveLocale(locale), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: EVENT_TIMEZONE,
    }).format(start)
  );
}

/**
 * The calendar card already shows the event's date and time, so the card
 * mentions a time only when the forecast covers less than the event: the
 * window starts after the event did (it is under way → "from now until …"),
 * or the event runs on past the window's day (multi-day → "forecast for <day>").
 */
export function getWeatherWindowNote(
  day: WeatherDay,
  eventStart: string | null | undefined,
  eventEnd: string | null | undefined,
  locale: string
): WeatherWindowNote | null {
  const windowStart = parseInstant(day.window_start);
  const windowEnd = parseInstant(day.window_end);
  const start = parseInstant(eventStart);
  if (!windowStart || !windowEnd || !start) return null;

  if (windowStart.getTime() - start.getTime() > MINUTE_MS) {
    return { key: 'fromNow', params: { time: formatEventTime(day.window_end, locale) } };
  }

  const end = parseInstant(eventEnd);
  if (
    end &&
    end.getTime() - windowEnd.getTime() > HOUR_MS &&
    brusselsDateKey(end) > brusselsDateKey(windowEnd)
  ) {
    return { key: 'forDay', params: { day: formatWeatherWindowDay(day, locale) } };
  }
  return null;
}

/**
 * Whole hours since the forecast was fetched, at least 1, for the "Updated
 * N h ago" caption on a stale card. null when unknown or in the future (clock
 * skew). Clamped to what the backend would ever serve: the copy keeps ageing
 * in memory after that, and the caption matters most then.
 */
export function getWeatherUpdatedHoursAgo(generatedAt: string | null, now: Date): number | null {
  const generated = parseInstant(generatedAt);
  if (!generated) return null;
  const ageMs = now.getTime() - generated.getTime();
  if (ageMs < 0) return null;
  const hours = Math.max(1, Math.floor(ageMs / HOUR_MS));
  return Math.min(hours, WEATHER_UPDATED_AGO_MAX_HOURS);
}
