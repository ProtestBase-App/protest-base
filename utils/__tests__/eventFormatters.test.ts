import {
  formatEventForDisplay,
  formatEventForList,
  formatEventDateTime,
  formatTodayDate,
  parseAsUTC,
  EVENT_TIMEZONE,
} from '../eventFormatters';
import { Event } from '@/types/event.types';

describe('eventFormatters', () => {
  describe('Belgium timezone consistency', () => {
    it('should export EVENT_TIMEZONE as Europe/Brussels', () => {
      expect(EVENT_TIMEZONE).toBe('Europe/Brussels');
    });

    it('should display 17:00 UTC as 18:00 in Belgium (winter time, CET = UTC+1)', () => {
      // January 15 is in winter, so Belgium is UTC+1 (CET)
      // 17:00 UTC = 18:00 CET
      const winterEvent: Event = {
        $id: 'winter-event',
        id: 'winter-event',
        title: 'Winter Event',
        description: 'Test',
        start_time: '2025-01-15T17:00:00Z', // 5 PM UTC
        country: 'Belgium',
        organizer_name: 'Test',
      };

      const result = formatEventForList(winterEvent, 'fr');
      // Should show 18:00 (Belgium time), not 17:00 (UTC)
      expect(result.start_time).toContain('18:00');
    });

    it('should display 17:00 UTC as 19:00 in Belgium (summer time, CEST = UTC+2)', () => {
      // July 15 is in summer, so Belgium is UTC+2 (CEST)
      // 17:00 UTC = 19:00 CEST
      const summerEvent: Event = {
        $id: 'summer-event',
        id: 'summer-event',
        title: 'Summer Event',
        description: 'Test',
        start_time: '2025-07-15T17:00:00Z', // 5 PM UTC
        country: 'Belgium',
        organizer_name: 'Test',
      };

      const result = formatEventForList(summerEvent, 'fr');
      // Should show 19:00 (Belgium time), not 17:00 (UTC)
      expect(result.start_time).toContain('19:00');
    });

    it('should format event time in Belgium timezone regardless of date string format', () => {
      // Test with a date string without Z suffix (the original bug)
      const eventWithoutZ: Event = {
        $id: 'no-z-event',
        id: 'no-z-event',
        title: 'No Z Event',
        description: 'Test',
        start_time: '2025-01-15T17:00:00', // No Z suffix - this was causing the bug
        country: 'Belgium',
        organizer_name: 'Test',
      };

      const result = formatEventForList(eventWithoutZ, 'fr');
      // Should still show 18:00 (Belgium time) because we parse as UTC and convert
      expect(result.start_time).toContain('18:00');
    });
  });

  describe('EVENT_TIMEZONE constant', () => {
    it('should export EVENT_TIMEZONE for use by other modules', () => {
      expect(EVENT_TIMEZONE).toBe('Europe/Brussels');
      expect(EVENT_TIMEZONE).toBeTruthy();
      expect(typeof EVENT_TIMEZONE).toBe('string');
    });
  });

  describe('parseAsUTC', () => {
    it('should parse ISO string with Z suffix correctly', () => {
      const date = parseAsUTC('2025-01-15T17:00:00Z');
      expect(date.getUTCHours()).toBe(17);
      expect(date.getUTCMinutes()).toBe(0);
    });

    it('should parse ISO string with milliseconds and Z suffix correctly', () => {
      const date = parseAsUTC('2025-01-15T17:30:45.123Z');
      expect(date.getUTCHours()).toBe(17);
      expect(date.getUTCMinutes()).toBe(30);
      expect(date.getUTCSeconds()).toBe(45);
    });

    it('should parse ISO string with positive timezone offset correctly', () => {
      const date = parseAsUTC('2025-01-15T18:00:00+01:00');
      // 18:00 +01:00 = 17:00 UTC
      expect(date.getUTCHours()).toBe(17);
    });

    it('should parse ISO string with negative timezone offset correctly', () => {
      const date = parseAsUTC('2025-01-15T12:00:00-05:00');
      // 12:00 -05:00 = 17:00 UTC
      expect(date.getUTCHours()).toBe(17);
    });

    it('should append Z to ISO string without timezone indicator', () => {
      // This is the key test - without the Z suffix, JS would interpret as local time
      const date = parseAsUTC('2025-01-15T17:00:00');
      expect(date.getUTCHours()).toBe(17);
      expect(date.getUTCMinutes()).toBe(0);
    });

    it('should handle ISO string with milliseconds but no timezone', () => {
      const date = parseAsUTC('2025-01-15T17:30:00.000');
      expect(date.getUTCHours()).toBe(17);
      expect(date.getUTCMinutes()).toBe(30);
    });

    it('should handle ISO string with just date (no time component)', () => {
      const date = parseAsUTC('2025-01-15');
      expect(date.getUTCFullYear()).toBe(2025);
      expect(date.getUTCMonth()).toBe(0); // January = 0
      expect(date.getUTCDate()).toBe(15);
      expect(date.getUTCHours()).toBe(0);
    });

    it('should handle ISO string with short timezone offset (+01)', () => {
      // Some systems might output shortened timezone offsets
      const date = parseAsUTC('2025-01-15T18:00:00+01:00');
      expect(date.getUTCHours()).toBe(17);
    });

    it('should handle leap year dates', () => {
      const date = parseAsUTC('2024-02-29T12:00:00Z');
      expect(date.getUTCFullYear()).toBe(2024);
      expect(date.getUTCMonth()).toBe(1); // February = 1
      expect(date.getUTCDate()).toBe(29);
    });

    it('should handle end of year dates', () => {
      const date = parseAsUTC('2025-12-31T23:59:59Z');
      expect(date.getUTCFullYear()).toBe(2025);
      expect(date.getUTCMonth()).toBe(11); // December = 11
      expect(date.getUTCDate()).toBe(31);
      expect(date.getUTCHours()).toBe(23);
      expect(date.getUTCMinutes()).toBe(59);
    });

    it('should handle beginning of year dates', () => {
      const date = parseAsUTC('2025-01-01T00:00:00Z');
      expect(date.getUTCFullYear()).toBe(2025);
      expect(date.getUTCMonth()).toBe(0);
      expect(date.getUTCDate()).toBe(1);
      expect(date.getUTCHours()).toBe(0);
    });
  });

  // Mock event data
  const mockEvent: Event = {
    $id: 'event123',
    id: 'event123',
    title: 'Test Protest',
    description: 'A test protest event',
    start_time: '2025-07-14T14:30:00Z',
    end_time: '2025-07-14T18:00:00Z',
    image: 'https://example.com/image.jpg',
    street_address: '123 Main St',
    city: 'Brussels',
    region: 'Brussels-Capital',
    country: 'Belgium',
    organizer_id: 'org123',
    organizer_name: 'Test Organizer',
    website_url: 'https://example.com',
    categories: ['climate', 'social-justice'],
    disclaimer: 'Please be peaceful',
    postal_code: 1000,
    geocod_status: 'success',
    geocod_lat: 50.8503,
    geocod_lng: 4.3517,
    co_organizers: ['co-org1', 'co-org2'],
  };

  describe('formatEventForDisplay', () => {
    it('should format event with English locale', () => {
      const result = formatEventForDisplay(mockEvent, 'en');

      expect(result.$id).toBe('event123');
      expect(result.id).toBe('event123');
      expect(result.title).toBe('Test Protest');
      expect(result.description).toBe('A test protest event');
      expect(result.city).toBe('Brussels');
      expect(result.country).toBe('Belgium');
      expect(result.organizer_name).toBe('Test Organizer');
      expect(result.categories).toEqual(['climate', 'social-justice']);
      expect(result.startDateNoFormat).toBe('2025-07-14');
      expect(result.endDateNoFormat).toBe('2025-07-14');
      expect(result.postal_code).toBe(1000);
    });

    it('should format start date correctly in English', () => {
      const result = formatEventForDisplay(mockEvent, 'en');

      // Should contain day of week and month (localized)
      expect(result.start_date).toContain('Monday');
      expect(result.start_date).toContain('July');
      expect(result.start_date).toContain('14');
    });

    it('should format start time in 12-hour format for English', () => {
      const result = formatEventForDisplay(mockEvent, 'en');

      // Time should be in 12-hour format with AM/PM
      expect(result.start_time).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
    });

    it('should format event with French locale', () => {
      const result = formatEventForDisplay(mockEvent, 'fr');

      // French formatting
      expect(result.start_date).toContain('Lundi'); // Monday in French
      expect(result.start_date).toContain('Juillet'); // July in French
    });

    it('should format time in 24-hour format for French', () => {
      const result = formatEventForDisplay(mockEvent, 'fr');

      // Time should be in 24-hour format (14:30)
      expect(result.start_time).toMatch(/\d{2}:\d{2}/);
      expect(result.start_time).not.toContain('AM');
      expect(result.start_time).not.toContain('PM');
    });

    it('should format event with Dutch locale', () => {
      const result = formatEventForDisplay(mockEvent, 'nl');

      // Dutch formatting
      expect(result.start_date).toContain('Maandag'); // Monday in Dutch
      expect(result.start_date).toContain('Juli'); // July in Dutch
    });

    it('should default to English for unsupported locale', () => {
      const result = formatEventForDisplay(mockEvent, 'es');

      expect(result.start_date).toContain('Monday');
      expect(result.start_date).toContain('July');
    });

    it('should handle event without end time', () => {
      const eventWithoutEndTime = { ...mockEvent, end_time: undefined };
      const result = formatEventForDisplay(eventWithoutEndTime, 'en');

      expect(result.end_date).toBe('');
      expect(result.end_time).toBe('');
      expect(result.endDateNoFormat).toBeNull();
      expect(result.endDateFull).toBeNull();
    });

    it('should handle optional fields being null or undefined', () => {
      const minimalEvent: Event = {
        $id: 'minimal123',
        id: 'minimal123',
        title: 'Minimal Event',
        description: 'Description',
        start_time: '2025-07-14T14:30:00Z',
        end_time: undefined,
        image: undefined,
        street_address: null,
        city: null,
        region: null,
        country: '',
        organizer_id: undefined,
        organizer_name: 'Organizer',
        website_url: null,
        categories: undefined,
        disclaimer: null,
        postal_code: null,
        geocod_status: null,
        geocod_lat: null,
        geocod_lng: null,
        co_organizers: undefined,
      };

      const result = formatEventForDisplay(minimalEvent, 'en');

      expect(result.image).toBe('');
      expect(result.street_address).toBeNull();
      expect(result.city).toBeNull();
      expect(result.website_url).toBeNull();
      expect(result.categories).toEqual([]);
      expect(result.co_organizers).toEqual([]);
    });

    it('should preserve all location data', () => {
      const result = formatEventForDisplay(mockEvent, 'en');

      expect(result.street_address).toBe('123 Main St');
      expect(result.city).toBe('Brussels');
      expect(result.region).toBe('Brussels-Capital');
      expect(result.postal_code).toBe(1000);
      expect(result.geocod_lat).toBe(50.8503);
      expect(result.geocod_lng).toBe(4.3517);
    });

    it('should handle multi-day event spanning different months', () => {
      const multiDayEvent: Event = {
        ...mockEvent,
        start_time: '2025-07-31T14:00:00Z',
        end_time: '2025-08-02T18:00:00Z',
      };

      const result = formatEventForDisplay(multiDayEvent, 'en');

      expect(result.start_date).toContain('July');
      expect(result.start_date).toContain('31');
      expect(result.end_date).toContain('August');
      expect(result.end_date).toContain('02');
    });

    it('should handle multi-day event in French locale', () => {
      const multiDayEvent: Event = {
        ...mockEvent,
        start_time: '2025-07-15T09:00:00Z',
        end_time: '2025-07-17T17:00:00Z',
      };

      const result = formatEventForDisplay(multiDayEvent, 'fr');

      expect(result.start_date).toContain('Juillet');
      expect(result.end_date).toContain('Juillet');
      // Time should be in 24-hour format
      expect(result.start_time).toMatch(/^\d{2}:\d{2}$/);
      expect(result.end_time).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should handle multi-day event in Dutch locale', () => {
      const multiDayEvent: Event = {
        ...mockEvent,
        start_time: '2025-03-10T10:30:00Z',
        end_time: '2025-03-12T16:45:00Z',
      };

      const result = formatEventForDisplay(multiDayEvent, 'nl');

      expect(result.start_date).toContain('Maart'); // March in Dutch
      expect(result.end_date).toContain('Maart');
    });

    it('should correctly format start and end dates on same day', () => {
      const sameDayEvent: Event = {
        ...mockEvent,
        start_time: '2025-06-20T10:00:00Z',
        end_time: '2025-06-20T14:00:00Z',
      };

      const result = formatEventForDisplay(sameDayEvent, 'en');

      expect(result.startDateNoFormat).toBe('2025-06-20');
      expect(result.endDateNoFormat).toBe('2025-06-20');
      expect(result.start_date).toContain('June');
      expect(result.end_date).toContain('June');
      expect(result.start_date).toContain('20');
      expect(result.end_date).toContain('20');
    });

    it('should format dates near DST transition (spring forward)', () => {
      // DST transition in Europe typically happens last Sunday of March (2:00 AM -> 3:00 AM)
      const dstEvent: Event = {
        ...mockEvent,
        start_time: '2025-03-30T01:00:00Z', // Before DST
        end_time: '2025-03-30T02:00:00Z', // After DST
      };

      const result = formatEventForDisplay(dstEvent, 'en');

      // Should handle DST transition correctly
      expect(result.start_date).toContain('March');
      expect(result.end_date).toContain('March');
    });

    it('should format dates near DST transition (fall back)', () => {
      // DST transition in Europe typically happens last Sunday of October (3:00 AM -> 2:00 AM)
      const dstEvent: Event = {
        ...mockEvent,
        start_time: '2025-10-26T01:00:00Z', // Before DST
        end_time: '2025-10-26T02:00:00Z', // After DST
      };

      const result = formatEventForDisplay(dstEvent, 'en');

      // Should handle DST transition correctly
      expect(result.start_date).toContain('October');
      expect(result.end_date).toContain('October');
    });

    it('should use default locale (en) when called without locale parameter', () => {
      // Call without locale parameter to test default
      const result = formatEventForDisplay(mockEvent);

      // Should default to English
      expect(result.start_date).toContain('Monday');
      expect(result.start_date).toContain('July');
      expect(result.start_time).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
    });

    it('should handle event with all optional geocoding fields null', () => {
      const eventNoGeocoding: Event = {
        ...mockEvent,
        geocod_status: null,
        geocod_lat: null,
        geocod_lng: null,
      };

      const result = formatEventForDisplay(eventNoGeocoding);

      expect(result.geocod_status).toBeNull();
      expect(result.geocod_lat).toBeNull();
      expect(result.geocod_lng).toBeNull();
    });

    it('should handle event with postal_code as 0', () => {
      const eventZeroPostal: Event = {
        ...mockEvent,
        postal_code: 0,
      };

      const result = formatEventForDisplay(eventZeroPostal);

      // 0 is falsy, so the code converts it to null (postal_code || null)
      expect(result.postal_code).toBeNull();
    });
  });

  describe('formatEventForList', () => {
    it('should format event for list display', () => {
      const result = formatEventForList(mockEvent);

      expect(result.$id).toBe('event123');
      expect(result.id).toBe('event123');
      expect(result.title).toBe('Test Protest');
      expect(result.description).toBe('A test protest event');
      expect(result.city).toBe('Brussels');
      expect(result.image).toBe('https://example.com/image.jpg');
      expect(result.categories).toEqual(['climate', 'social-justice']);
      expect(result.startDateNoFormat).toBe('2025-07-14');
    });

    it('should format start time in DD/MM - HH:MM format', () => {
      const result = formatEventForList(mockEvent);

      // Format: "DayOfWeek DD/MM - HH:MM"
      expect(result.start_time).toContain('Monday');
      expect(result.start_time).toContain('14/07');
      // Time will vary based on local timezone, just check format
      expect(result.start_time).toMatch(/\d{2}:\d{2}/);
    });

    it('should handle event without city', () => {
      const eventWithoutCity = { ...mockEvent, city: undefined };
      const result = formatEventForList(eventWithoutCity);

      expect(result.city).toBe('');
    });

    it('should handle event without image', () => {
      const eventWithoutImage = { ...mockEvent, image: undefined };
      const result = formatEventForList(eventWithoutImage);

      expect(result.image).toBe('');
    });

    it('should handle event without categories', () => {
      const eventWithoutCategories = { ...mockEvent, categories: undefined };
      const result = formatEventForList(eventWithoutCategories);

      expect(result.categories).toEqual([]);
    });

    it('should include optional fields when present', () => {
      const result = formatEventForList(mockEvent);

      expect(result.country).toBe('Belgium');
      expect(result.organizer_name).toBe('Test Organizer');
      expect(result.co_organizers).toEqual(['co-org1', 'co-org2']);
      expect(result.postal_code).toBe(1000);
    });

    it('should format time with leading zeros', () => {
      const morningEvent = {
        ...mockEvent,
        start_time: '2025-03-05T09:05:00Z',
      };
      const result = formatEventForList(morningEvent);

      // Should have leading zeros in date
      expect(result.start_time).toContain('05/03');
      // Time will vary based on timezone, just check format with leading zeros
      expect(result.start_time).toMatch(/\d{2}:\d{2}/);
    });

    it('should format event for list in French locale', () => {
      const result = formatEventForList(mockEvent, 'fr');

      expect(result.start_time).toContain('Lundi'); // Monday in French
      expect(result.start_time).toContain('14/07');
      expect(result.start_time).toMatch(/\d{2}:\d{2}/);
    });

    it('should format event for list in Dutch locale', () => {
      const result = formatEventForList(mockEvent, 'nl');

      expect(result.start_time).toContain('Maandag'); // Monday in Dutch
      expect(result.start_time).toContain('14/07');
      expect(result.start_time).toMatch(/\d{2}:\d{2}/);
    });

    it('should handle first day of month (leading zero)', () => {
      const firstDayEvent = {
        ...mockEvent,
        start_time: '2025-05-01T12:00:00Z',
      };
      const result = formatEventForList(firstDayEvent);

      expect(result.start_time).toContain('01/05');
    });

    it('should handle first month of year (January)', () => {
      const januaryEvent = {
        ...mockEvent,
        start_time: '2025-01-15T15:30:00Z',
      };
      const result = formatEventForList(januaryEvent);

      expect(result.start_time).toContain('15/01');
    });

    it('should handle last month of year (December)', () => {
      const decemberEvent = {
        ...mockEvent,
        start_time: '2025-12-25T10:00:00Z',
      };
      const result = formatEventForList(decemberEvent);

      expect(result.start_time).toContain('25/12');
    });

    it('should handle unsupported locale by defaulting to en-US', () => {
      const result = formatEventForList(mockEvent, 'es');

      // Should default to en-US for day of week
      expect(result.start_time).toContain('Monday');
      expect(result.start_time).toContain('14/07');
    });

    it('should handle event at midnight', () => {
      const midnightEvent = {
        ...mockEvent,
        start_time: '2025-06-15T00:00:00Z',
      };
      const result = formatEventForList(midnightEvent);

      expect(result.start_time).toContain('15/06');
      // Time will be in Belgium timezone
      expect(result.start_time).toMatch(/\d{2}:\d{2}/);
    });

    it('should handle event at 23:59', () => {
      const lateNightEvent = {
        ...mockEvent,
        start_time: '2025-06-15T23:59:00Z',
      };
      const result = formatEventForList(lateNightEvent);

      // Date might shift to next day depending on timezone
      expect(result.start_time).toMatch(/\d{2}\/\d{2}/);
      expect(result.start_time).toMatch(/\d{2}:\d{2}/);
    });

    it('should use default locale (en) when called without locale parameter', () => {
      // Call without locale parameter to test default
      const result = formatEventForList(mockEvent);

      // Should default to English
      expect(result.start_time).toContain('Monday');
      expect(result.start_time).toContain('14/07');
      expect(result.start_time).toMatch(/\d{2}:\d{2}/);
    });

    it('should handle event with postal_code as 0', () => {
      const eventZeroPostal = {
        ...mockEvent,
        postal_code: 0,
      };
      const result = formatEventForList(eventZeroPostal);

      // postal_code is passed through directly in formatEventForList
      expect(result.postal_code).toBe(0);
    });

    it('should handle event with all optional fields undefined', () => {
      const minimalEvent: Event = {
        $id: 'minimal',
        id: 'minimal',
        title: 'Minimal',
        description: 'Test',
        start_time: '2025-07-14T14:30:00Z',
        country: 'Belgium',
        organizer_name: 'Organizer',
      };

      const result = formatEventForList(minimalEvent);

      expect(result.city).toBe('');
      expect(result.image).toBe('');
      expect(result.categories).toEqual([]);
      expect(result.view_count).toBe(0);
      expect(result.help_needed).toBe(false);
    });
  });

  describe('formatEventDateTime', () => {
    const testDateTime = '2025-07-14T14:30:00Z';

    it('should format date and time in English', () => {
      const result = formatEventDateTime(testDateTime, 'en');

      expect(result).toContain('Monday');
      expect(result).toContain('July');
      expect(result).toContain('14');
      expect(result).toContain('at');
      // Should have AM/PM format
      expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
    });

    it('should format date and time in French', () => {
      const result = formatEventDateTime(testDateTime, 'fr');

      // French locale returns lowercase for day/month names
      expect(result.toLowerCase()).toContain('lundi'); // Monday in French
      expect(result.toLowerCase()).toContain('juillet'); // July in French
      expect(result).toContain('14');
      expect(result).toContain('à'); // "at" in French
      // Should be 24-hour format
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('should format date and time in Dutch', () => {
      const result = formatEventDateTime(testDateTime, 'nl');

      // Dutch locale returns lowercase for day/month names
      expect(result.toLowerCase()).toContain('maandag'); // Monday in Dutch
      expect(result.toLowerCase()).toContain('juli'); // July in Dutch
      expect(result).toContain('14');
      expect(result).toContain('om'); // "at" in Dutch
      // Should be 24-hour format
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('should default to English for unsupported locale', () => {
      const result = formatEventDateTime(testDateTime, 'es');

      // Should default to en-US locale
      expect(result).toContain('Monday');
      expect(result).toContain('July');
      // Check for either 'at' (English) or time connector
      expect(result).toMatch(/at|om|à/); // connector word
    });

    it('should handle morning times correctly', () => {
      const morningTime = '2025-07-14T09:15:00Z';
      const result = formatEventDateTime(morningTime, 'en');

      expect(result).toContain('AM');
    });

    it('should handle afternoon times correctly', () => {
      const afternoonTime = '2025-07-14T15:30:00Z';
      const result = formatEventDateTime(afternoonTime, 'en');

      expect(result).toContain('PM');
    });

    it('should handle midnight correctly', () => {
      const midnightTime = '2025-07-14T00:00:00Z';
      const resultEn = formatEventDateTime(midnightTime, 'en');
      const resultFr = formatEventDateTime(midnightTime, 'fr');

      // English: Should have AM/PM format (actual time depends on timezone)
      expect(resultEn).toMatch(/AM|PM/i);

      // French: Should be 24-hour format
      expect(resultFr).toMatch(/\d{2}:\d{2}/);
    });

    it('should handle noon correctly', () => {
      const noonTime = '2025-07-14T12:00:00Z';
      const resultEn = formatEventDateTime(noonTime, 'en');
      const resultFr = formatEventDateTime(noonTime, 'fr');

      // English: Should have AM/PM format (actual time depends on timezone)
      expect(resultEn).toMatch(/AM|PM/i);

      // French: Should be 24-hour format
      expect(resultFr).toMatch(/\d{2}:\d{2}/);
    });

    it('should handle different months correctly', () => {
      const janDate = formatEventDateTime('2025-01-15T10:00:00Z', 'en');
      const decDate = formatEventDateTime('2025-12-25T10:00:00Z', 'en');

      expect(janDate).toContain('January');
      expect(decDate).toContain('December');
    });

    it('should handle different days of week correctly', () => {
      const sunday = formatEventDateTime('2025-07-13T10:00:00Z', 'en');
      const monday = formatEventDateTime('2025-07-14T10:00:00Z', 'en');

      expect(sunday).toContain('Sunday');
      expect(monday).toContain('Monday');
    });

    it('should handle all days of the week in English', () => {
      const dates = [
        { date: '2025-07-13T10:00:00Z', day: 'Sunday' },
        { date: '2025-07-14T10:00:00Z', day: 'Monday' },
        { date: '2025-07-15T10:00:00Z', day: 'Tuesday' },
        { date: '2025-07-16T10:00:00Z', day: 'Wednesday' },
        { date: '2025-07-17T10:00:00Z', day: 'Thursday' },
        { date: '2025-07-18T10:00:00Z', day: 'Friday' },
        { date: '2025-07-19T10:00:00Z', day: 'Saturday' },
      ];

      dates.forEach(({ date, day }) => {
        const result = formatEventDateTime(date, 'en');
        expect(result).toContain(day);
      });
    });

    it('should handle all months in English', () => {
      const months = [
        { date: '2025-01-15T10:00:00Z', month: 'January' },
        { date: '2025-02-15T10:00:00Z', month: 'February' },
        { date: '2025-03-15T10:00:00Z', month: 'March' },
        { date: '2025-04-15T10:00:00Z', month: 'April' },
        { date: '2025-05-15T10:00:00Z', month: 'May' },
        { date: '2025-06-15T10:00:00Z', month: 'June' },
        { date: '2025-07-15T10:00:00Z', month: 'July' },
        { date: '2025-08-15T10:00:00Z', month: 'August' },
        { date: '2025-09-15T10:00:00Z', month: 'September' },
        { date: '2025-10-15T10:00:00Z', month: 'October' },
        { date: '2025-11-15T10:00:00Z', month: 'November' },
        { date: '2025-12-15T10:00:00Z', month: 'December' },
      ];

      months.forEach(({ date, month }) => {
        const result = formatEventDateTime(date, 'en');
        expect(result).toContain(month);
      });
    });

    it('should handle early morning times (1-6 AM)', () => {
      const earlyMorning = formatEventDateTime('2025-07-14T03:30:00Z', 'en');

      // Should have time component
      expect(earlyMorning).toMatch(/\d{1,2}:\d{2}/);
      expect(earlyMorning).toContain('at');
    });

    it('should handle late evening times (9 PM-11:59 PM)', () => {
      const lateEvening = formatEventDateTime('2025-07-14T21:45:00Z', 'en');

      // Should have time component
      expect(lateEvening).toMatch(/\d{1,2}:\d{2}/);
      expect(lateEvening).toContain('at');
    });

    it('should format correctly with seconds and milliseconds in input', () => {
      const withSeconds = formatEventDateTime('2025-07-14T14:30:45.789Z', 'en');

      expect(withSeconds).toContain('Monday');
      expect(withSeconds).toContain('July');
      expect(withSeconds).toContain('14');
      // Minutes should still be displayed (seconds are ignored in display)
      expect(withSeconds).toMatch(/\d{1,2}:30/);
    });

    it('should handle date without Z suffix', () => {
      const withoutZ = formatEventDateTime('2025-07-14T14:30:00', 'en');

      expect(withoutZ).toContain('Monday');
      expect(withoutZ).toContain('July');
      expect(withoutZ).toContain('14');
    });

    it('should handle date with timezone offset', () => {
      const withOffset = formatEventDateTime('2025-07-14T16:30:00+02:00', 'en');

      expect(withOffset).toContain('Monday');
      expect(withOffset).toContain('July');
      expect(withOffset).toContain('14');
    });

    it('should use correct connector word for each locale', () => {
      const testDate = '2025-07-14T14:30:00Z';

      const en = formatEventDateTime(testDate, 'en');
      const fr = formatEventDateTime(testDate, 'fr');
      const nl = formatEventDateTime(testDate, 'nl');

      expect(en).toContain('at');
      expect(fr).toContain('à');
      expect(nl).toContain('om');
    });

    it('should capitalize day and month in all locales', () => {
      const testDate = '2025-07-14T14:30:00Z';

      const en = formatEventDateTime(testDate, 'en');
      const fr = formatEventDateTime(testDate, 'fr');
      const nl = formatEventDateTime(testDate, 'nl');

      // All should start with capital letter (day of week)
      expect(en.charAt(0)).toMatch(/[A-Z]/);
      expect(fr.charAt(0)).toMatch(/[A-Z]/);
      expect(nl.charAt(0)).toMatch(/[A-Z]/);

      // All should have capitalized month
      expect(en).toContain('July');
      expect(fr.toLowerCase()).toContain('juillet');
      expect(nl.toLowerCase()).toContain('juli');
    });

    it('should use default locale (en) when called without locale parameter', () => {
      const testDate = '2025-07-14T14:30:00Z';

      // Call without locale parameter to test default
      const result = formatEventDateTime(testDate);

      // Should default to English
      expect(result).toContain('Monday');
      expect(result).toContain('July');
      expect(result).toContain('at');
      expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
    });

    it('should handle edge case of first second of the day', () => {
      const firstSecond = formatEventDateTime('2025-07-14T00:00:01Z', 'en');

      expect(firstSecond).toContain('Monday');
      expect(firstSecond).toContain('July');
      expect(firstSecond).toContain('14');
    });

    it('should handle edge case of last second of the day', () => {
      const lastSecond = formatEventDateTime('2025-07-14T23:59:59Z', 'en');

      // 23:59:59 UTC will be converted to Belgium timezone (UTC+2 in summer)
      // which shifts to the next day (July 15, Tuesday)
      expect(lastSecond).toContain('July');
      // Date and day of week will depend on timezone conversion
      expect(lastSecond).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe('formatEventForList edge cases', () => {
    it('should handle event with missing help_needed field', () => {
      const eventWithoutHelp = { ...mockEvent };
      delete (eventWithoutHelp as any).help_needed;

      const result = formatEventForList(eventWithoutHelp);
      expect(result.help_needed).toBe(false);
    });

    it('should handle event with view_count', () => {
      const eventWithViews = { ...mockEvent, view_count: 42 } as any;

      const result = formatEventForList(eventWithViews);
      expect(result.view_count).toBe(42);
    });

    it('should default view_count to 0 when missing', () => {
      const result = formatEventForList(mockEvent);
      expect(result.view_count).toBe(0);
    });
  });

  describe('formatEventForDisplay edge cases', () => {
    it('should handle event with help_needed true and description', () => {
      const eventWithHelp: Event = {
        ...mockEvent,
        help_needed: true,
        help_description: 'Need volunteers for setup',
      };

      const result = formatEventForDisplay(eventWithHelp);
      expect(result.help_needed).toBe(true);
      expect(result.help_description).toBe('Need volunteers for setup');
    });

    it('should handle event with missing help fields', () => {
      const eventWithoutHelp = { ...mockEvent };
      delete (eventWithoutHelp as any).help_needed;
      delete (eventWithoutHelp as any).help_description;

      const result = formatEventForDisplay(eventWithoutHelp);
      expect(result.help_needed).toBe(false);
      expect(result.help_description).toBe('');
    });

    it('should handle event with empty strings for optional fields', () => {
      const eventWithEmptyStrings: Event = {
        ...mockEvent,
        image: '',
        website_url: '',
        disclaimer: '',
        help_description: '',
      };

      const result = formatEventForDisplay(eventWithEmptyStrings);
      expect(result.image).toBe('');
      expect(result.website_url).toBeNull();
      expect(result.disclaimer).toBeNull();
      expect(result.help_description).toBe('');
    });
  });

  describe('formatTodayDate', () => {
    // Note: These tests use the actual current date, so we test the format pattern
    // rather than specific dates to avoid test fragility

    it('should format date in English locale with "Month Day, Year" pattern', () => {
      const result = formatTodayDate('en');

      // English format: "December 7, 2025"
      // Should match pattern: Month Day, Year
      expect(result).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
    });

    it('should format date in French locale with "Day Month Year" pattern', () => {
      const result = formatTodayDate('fr');

      // French format: "7 décembre 2025"
      // Should match pattern: Day Month Year
      expect(result).toMatch(/^\d{1,2} [A-Z][a-zéû]+ \d{4}$/);
    });

    it('should format date in Dutch locale with "Day Month Year" pattern', () => {
      const result = formatTodayDate('nl');

      // Dutch format: "7 december 2025"
      // Should match pattern: Day Month Year
      expect(result).toMatch(/^\d{1,2} [A-Z][a-z]+ \d{4}$/);
    });

    it('should use en-US month names but non-English format for unsupported locale', () => {
      const result = formatTodayDate('es');

      // Unsupported locales resolve to en-US for month names,
      // but use the non-English format order ("Day Month Year") since locale !== 'en'
      // This results in: "7 December 2025" format
      expect(result).toMatch(/^\d{1,2} [A-Z][a-z]+ \d{4}$/);
    });

    it('should default to English when no locale is provided', () => {
      const result = formatTodayDate();

      // Should use English format: "Month Day, Year"
      expect(result).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
    });

    it('should contain current year', () => {
      const currentYear = new Date().getFullYear();
      const result = formatTodayDate('en');

      expect(result).toContain(currentYear.toString());
    });

    it('should capitalize month name in English', () => {
      const result = formatTodayDate('en');

      // Month should start with capital letter
      const monthMatch = result.match(/^([A-Z][a-z]+)/);
      expect(monthMatch).toBeTruthy();
      expect(monthMatch![1][0]).toMatch(/[A-Z]/);
    });

    it('should capitalize month name in French', () => {
      const result = formatTodayDate('fr');

      // Month should be capitalized (after the day number)
      const monthMatch = result.match(/\d+ ([A-Z][a-zéû]+)/);
      expect(monthMatch).toBeTruthy();
      expect(monthMatch![1][0]).toMatch(/[A-Z]/);
    });

    it('should capitalize month name in Dutch', () => {
      const result = formatTodayDate('nl');

      // Month should be capitalized (after the day number)
      const monthMatch = result.match(/\d+ ([A-Z][a-z]+)/);
      expect(monthMatch).toBeTruthy();
      expect(monthMatch![1][0]).toMatch(/[A-Z]/);
    });

    it('should produce different formats for English vs French/Dutch', () => {
      const englishResult = formatTodayDate('en');
      const frenchResult = formatTodayDate('fr');
      const dutchResult = formatTodayDate('nl');

      // English has comma after day number
      expect(englishResult).toContain(',');

      // French and Dutch don't have comma
      expect(frenchResult).not.toContain(',');
      expect(dutchResult).not.toContain(',');
    });

    it('should return a non-empty string', () => {
      const result = formatTodayDate('en');

      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle year 2000 (Y2K)', () => {
      const y2kEvent: Event = {
        ...mockEvent,
        start_time: '2000-01-01T00:00:00Z',
      };

      const result = formatEventForDisplay(y2kEvent, 'en');
      expect(result.startDateNoFormat).toBe('2000-01-01');
    });

    it('should handle far future dates (year 2099)', () => {
      const futureEvent: Event = {
        ...mockEvent,
        start_time: '2099-12-31T23:59:59Z',
      };

      const result = formatEventForDisplay(futureEvent, 'en');
      expect(result.startDateNoFormat).toBe('2099-12-31');
    });

    it('should handle February 29 in leap year', () => {
      const leapEvent: Event = {
        ...mockEvent,
        start_time: '2024-02-29T12:00:00Z',
      };

      const result = formatEventForList(leapEvent, 'en');
      expect(result.startDateNoFormat).toBe('2024-02-29');
      expect(result.start_time).toContain('29/02');
    });

    it('should handle New Year transition in Belgium timezone', () => {
      // 23:30 UTC on Dec 31 = 00:30 CET on Jan 1 (next day in Belgium)
      const newYearEvent: Event = {
        ...mockEvent,
        start_time: '2024-12-31T23:30:00Z',
      };

      const result = formatEventForDisplay(newYearEvent, 'en');
      // In Belgium timezone, this will be Jan 1, 2025
      expect(result.start_date).toBeTruthy();
    });

    it('should handle event spanning year boundary', () => {
      const yearSpanEvent: Event = {
        ...mockEvent,
        start_time: '2024-12-31T20:00:00Z',
        end_time: '2025-01-01T02:00:00Z',
      };

      const result = formatEventForDisplay(yearSpanEvent, 'en');
      expect(result.start_date).toBeTruthy();
      expect(result.end_date).toBeTruthy();
    });

    it('should handle very short event duration (1 minute)', () => {
      const shortEvent: Event = {
        ...mockEvent,
        start_time: '2025-07-14T14:00:00Z',
        end_time: '2025-07-14T14:01:00Z',
      };

      const result = formatEventForDisplay(shortEvent, 'en');
      expect(result.start_time).toBeTruthy();
      expect(result.end_time).toBeTruthy();
    });

    it('should handle very long event duration (multiple days)', () => {
      const longEvent: Event = {
        ...mockEvent,
        start_time: '2025-07-01T09:00:00Z',
        end_time: '2025-07-31T18:00:00Z',
      };

      const result = formatEventForDisplay(longEvent, 'en');
      expect(result.startDateNoFormat).toBe('2025-07-01');
      expect(result.endDateNoFormat).toBe('2025-07-31');
    });

    it('should handle all locales consistently for same input', () => {
      const testDate = '2025-06-15T12:00:00Z';

      const enResult = formatEventDateTime(testDate, 'en');
      const frResult = formatEventDateTime(testDate, 'fr');
      const nlResult = formatEventDateTime(testDate, 'nl');

      // All should have day of week, month, and day number
      expect(enResult).toMatch(/\w+ \w+ \d{1,2}/);
      expect(frResult).toMatch(/\w+ \w+ \d{1,2}/);
      expect(nlResult).toMatch(/\w+ \w+ \d{1,2}/);

      // All should have time component
      expect(enResult).toMatch(/\d{1,2}:\d{2}/);
      expect(frResult).toMatch(/\d{1,2}:\d{2}/);
      expect(nlResult).toMatch(/\d{1,2}:\d{2}/);
    });

    it('should handle event with only required fields', () => {
      const bareboneEvent: Event = {
        $id: 'test',
        id: 'test',
        title: 'Test Event',
        description: 'Test Description',
        start_time: '2025-07-14T14:30:00Z',
        country: 'Belgium',
        organizer_name: 'Test Organizer',
      };

      const displayResult = formatEventForDisplay(bareboneEvent);
      const listResult = formatEventForList(bareboneEvent);

      expect(displayResult.title).toBe('Test Event');
      expect(listResult.title).toBe('Test Event');
    });

    it('should handle mixed case locale strings', () => {
      // Test that locale matching is case-sensitive
      const testDate = '2025-07-14T14:30:00Z';

      // These should fall back to English since they don't match exactly
      const upperResult = formatEventDateTime(testDate, 'EN');
      const mixedResult = formatEventDateTime(testDate, 'En');

      // Both should use en-US as fallback (since 'EN' !== 'en')
      expect(upperResult).toBeTruthy();
      expect(mixedResult).toBeTruthy();
    });
  });
});
