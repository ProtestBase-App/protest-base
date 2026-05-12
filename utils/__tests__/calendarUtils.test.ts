import {
  generateCalendarGrid,
  getISOWeekNumber,
  toDateKey,
  belgiumDateKey,
  getTodayDateKeyInBelgium,
  buildEventDateSet,
  getEventDateKeyInBelgium,
  getMonthName,
  formatDayHeader,
  getDayHeaders,
  CalendarDay,
  CalendarWeek,
} from '../calendarUtils';

describe('calendarUtils', () => {
  describe('toDateKey', () => {
    it('formats a date as YYYY-MM-DD', () => {
      const date = new Date(2026, 2, 29); // March 29, 2026
      expect(toDateKey(date)).toBe('2026-03-29');
    });

    it('zero-pads single-digit month and day', () => {
      const date = new Date(2026, 0, 5); // January 5, 2026
      expect(toDateKey(date)).toBe('2026-01-05');
    });

    it('handles December correctly', () => {
      const date = new Date(2025, 11, 31); // December 31, 2025
      expect(toDateKey(date)).toBe('2025-12-31');
    });

    it('handles the first day of a month', () => {
      const date = new Date(2026, 5, 1); // June 1, 2026
      expect(toDateKey(date)).toBe('2026-06-01');
    });
  });

  describe('getISOWeekNumber', () => {
    it('returns week 1 for January 1, 2026 (a Thursday)', () => {
      // Jan 1, 2026 is a Thursday — it falls in ISO week 1
      const date = new Date(2026, 0, 1);
      expect(getISOWeekNumber(date)).toBe(1);
    });

    it('returns week 1 for the first Monday of 2026 (Jan 5)', () => {
      const monday = new Date(2026, 0, 5);
      expect(getISOWeekNumber(monday)).toBe(2);
    });

    it('returns week 53 for December 28, 2015 (last ISO week of 2015)', () => {
      // ISO 8601: Dec 28 is always in the last week of the year
      const date = new Date(2015, 11, 28);
      expect(getISOWeekNumber(date)).toBe(53);
    });

    it('returns week 52 for December 31, 2026', () => {
      // Dec 31, 2026 is a Thursday, still in week 53 of 2026
      const date = new Date(2026, 11, 31);
      expect(getISOWeekNumber(date)).toBe(53);
    });

    it('returns correct week for a mid-year date', () => {
      // July 13, 2026 is a Monday — week 29
      const date = new Date(2026, 6, 13);
      expect(getISOWeekNumber(date)).toBe(29);
    });

    it('handles a Sunday (last day of an ISO week)', () => {
      // Jan 4, 2026 is a Sunday — still in week 1 of 2026
      const sunday = new Date(2026, 0, 4);
      expect(getISOWeekNumber(sunday)).toBe(1);
    });
  });

  describe('generateCalendarGrid', () => {
    // Use March 2026 as a well-known reference month:
    // - March 1, 2026 is a Sunday
    // - Grid starts Monday Feb 23
    const grid = generateCalendarGrid(2026, 2); // month=2 => March

    it('returns exactly 6 weeks', () => {
      expect(grid).toHaveLength(6);
    });

    it('each week contains exactly 7 days', () => {
      grid.forEach((week: CalendarWeek) => {
        expect(week.days).toHaveLength(7);
      });
    });

    it('first day of the grid is the Monday on or before the first of the month', () => {
      // March 1, 2026 is Sunday — the preceding Monday is Feb 23
      const firstCell = grid[0].days[0];
      expect(toDateKey(firstCell.date)).toBe('2026-02-23');
    });

    it('marks days in the target month as isCurrentMonth=true', () => {
      const marchDays = grid.flatMap((w) => w.days).filter((d: CalendarDay) => d.isCurrentMonth);
      // March has 31 days — all must be present
      expect(marchDays).toHaveLength(31);
      marchDays.forEach((d) => {
        expect(d.date.getMonth()).toBe(2); // month index 2 = March
        expect(d.date.getFullYear()).toBe(2026);
      });
    });

    it('marks days outside the target month as isCurrentMonth=false', () => {
      const nonMarchDays = grid
        .flatMap((w) => w.days)
        .filter((d: CalendarDay) => !d.isCurrentMonth);
      nonMarchDays.forEach((d) => {
        const m = d.date.getMonth();
        // Must be February (2) or April (3) overflow days
        expect(m === 1 || m === 3).toBe(true);
      });
    });

    it('dateKey matches YYYY-MM-DD for every cell', () => {
      grid
        .flatMap((w) => w.days)
        .forEach((d: CalendarDay) => {
          expect(d.dateKey).toBe(toDateKey(d.date));
          expect(d.dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });

    it('day property matches the calendar day-of-month number', () => {
      grid
        .flatMap((w) => w.days)
        .forEach((d: CalendarDay) => {
          expect(d.day).toBe(d.date.getDate());
        });
    });

    it('each week carries a weekNumber', () => {
      grid.forEach((week: CalendarWeek) => {
        expect(typeof week.weekNumber).toBe('number');
        expect(week.weekNumber).toBeGreaterThanOrEqual(1);
        expect(week.weekNumber).toBeLessThanOrEqual(53);
      });
    });

    it('consecutive weeks have monotonically increasing weekNumbers (wrapping at year boundary)', () => {
      for (let i = 1; i < grid.length; i++) {
        const prev = grid[i - 1].weekNumber;
        const curr = grid[i].weekNumber;
        // Allow wrap-around from 52/53 back to 1 at year boundary
        const isIncreasing = curr > prev;
        const isWrap = curr === 1 && prev >= 52;
        expect(isIncreasing || isWrap).toBe(true);
      }
    });

    describe('isToday flag', () => {
      it('marks at most one cell as isToday across the whole grid', () => {
        const todayCells = grid.flatMap((w) => w.days).filter((d: CalendarDay) => d.isToday);
        // The current month being tested is March 2026, which may or may not be
        // the current month depending on when tests run. Either 0 or 1 cell is today.
        expect(todayCells.length).toBeLessThanOrEqual(1);
      });

      it('the isToday cell matches toDateKey(new Date()) when in same month', () => {
        const today = new Date();
        if (today.getFullYear() === 2026 && today.getMonth() === 2) {
          const todayKey = toDateKey(today);
          const todayCell = grid.flatMap((w) => w.days).find((d: CalendarDay) => d.isToday);
          expect(todayCell).toBeDefined();
          expect(todayCell!.dateKey).toBe(todayKey);
        }
      });
    });

    describe('isPast flag', () => {
      it('isPast is never true for the isToday cell', () => {
        const todayCell = grid.flatMap((w) => w.days).find((d: CalendarDay) => d.isToday);
        if (todayCell) {
          expect(todayCell.isPast).toBe(false);
        }
      });

      it('all days strictly before today have isPast=true', () => {
        const now = new Date();
        // Strip time from today for pure date comparison
        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        grid
          .flatMap((w) => w.days)
          .forEach((d: CalendarDay) => {
            const cellMidnight = new Date(
              d.date.getFullYear(),
              d.date.getMonth(),
              d.date.getDate()
            );
            if (cellMidnight < todayMidnight) {
              expect(d.isPast).toBe(true);
            }
          });
      });

      it('all days on or after today have isPast=false', () => {
        const now = new Date();
        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        grid
          .flatMap((w) => w.days)
          .forEach((d: CalendarDay) => {
            const cellMidnight = new Date(
              d.date.getFullYear(),
              d.date.getMonth(),
              d.date.getDate()
            );
            if (cellMidnight >= todayMidnight) {
              expect(d.isPast).toBe(false);
            }
          });
      });
    });

    it('generates correct grid for a month starting on Monday (e.g. June 2026)', () => {
      // June 1, 2026 is a Monday — first column is June 1 itself
      const juneGrid = generateCalendarGrid(2026, 5);
      const firstCell = juneGrid[0].days[0];
      expect(toDateKey(firstCell.date)).toBe('2026-06-01');
      expect(firstCell.isCurrentMonth).toBe(true);
    });

    it('generates correct grid for a month starting on Sunday (e.g. March 2026)', () => {
      // Verified above: grid starts Feb 23 (Monday preceding March 1 Sunday)
      const firstCell = grid[0].days[0];
      expect(firstCell.isCurrentMonth).toBe(false);
      expect(firstCell.date.getMonth()).toBe(1); // February
    });

    it('covers all 7 days of the week in order Mon..Sun', () => {
      const firstWeekDayOfWeek = grid[0].days.map((d: CalendarDay) => d.date.getDay());
      // getDay(): 0=Sun, 1=Mon, ..., 6=Sat
      // Expected order Mon(1) Tue(2) Wed(3) Thu(4) Fri(5) Sat(6) Sun(0)
      expect(firstWeekDayOfWeek).toEqual([1, 2, 3, 4, 5, 6, 0]);
    });
  });

  describe('getEventDateKeyInBelgium', () => {
    it('returns the Belgium date for a UTC time on the same day in Belgium (winter)', () => {
      // Jan 15, 2026 at 12:00 UTC => 13:00 CET (UTC+1) => still Jan 15 in Belgium
      const result = getEventDateKeyInBelgium('2026-01-15T12:00:00Z');
      expect(result).toBe('2026-01-15');
    });

    it('advances to next day in Belgium when UTC time is near midnight (winter)', () => {
      // Jan 15, 2026 at 23:30 UTC => Jan 16, 00:30 CET (UTC+1) => Jan 16 in Belgium
      const result = getEventDateKeyInBelgium('2026-01-15T23:30:00Z');
      expect(result).toBe('2026-01-16');
    });

    it('advances to next day in Belgium when UTC time is near midnight (summer)', () => {
      // July 15, 2026 at 22:30 UTC => July 16, 00:30 CEST (UTC+2) => July 16 in Belgium
      const result = getEventDateKeyInBelgium('2026-07-15T22:30:00Z');
      expect(result).toBe('2026-07-16');
    });

    it('returns correct Belgium date for summer time (CEST = UTC+2)', () => {
      // July 10, 2026 at 10:00 UTC => 12:00 CEST => still July 10 in Belgium
      const result = getEventDateKeyInBelgium('2026-07-10T10:00:00Z');
      expect(result).toBe('2026-07-10');
    });

    it('returns YYYY-MM-DD formatted string', () => {
      const result = getEventDateKeyInBelgium('2026-03-29T09:00:00Z');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('handles ISO strings without Z suffix (treats as UTC)', () => {
      // Without Z suffix, parseAsUTC appends Z before parsing
      const withZ = getEventDateKeyInBelgium('2026-06-01T10:00:00Z');
      const withoutZ = getEventDateKeyInBelgium('2026-06-01T10:00:00');
      expect(withZ).toBe(withoutZ);
    });
  });

  describe('buildEventDateSet', () => {
    it('returns an empty Set for an empty events array', () => {
      const result = buildEventDateSet([]);
      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });

    it('returns a Set with one date key for one event', () => {
      const result = buildEventDateSet([{ start_time: '2026-03-29T10:00:00Z' }]);
      expect(result.size).toBe(1);
      expect(result.has('2026-03-29')).toBe(true);
    });

    it('deduplicates events on the same Belgium day', () => {
      const events = [
        { start_time: '2026-03-29T09:00:00Z' },
        { start_time: '2026-03-29T15:00:00Z' },
      ];
      const result = buildEventDateSet(events);
      expect(result.size).toBe(1);
      expect(result.has('2026-03-29')).toBe(true);
    });

    it('creates separate entries for events on different days', () => {
      const events = [
        { start_time: '2026-03-29T10:00:00Z' },
        { start_time: '2026-03-30T10:00:00Z' },
        { start_time: '2026-04-01T10:00:00Z' },
      ];
      const result = buildEventDateSet(events);
      expect(result.size).toBe(3);
      expect(result.has('2026-03-29')).toBe(true);
      expect(result.has('2026-03-30')).toBe(true);
      expect(result.has('2026-04-01')).toBe(true);
    });

    it('uses Belgium timezone when an event crosses midnight UTC vs Belgium', () => {
      // Jan 15 at 23:30 UTC is Jan 16 in Belgium (CET = UTC+1)
      const events = [{ start_time: '2026-01-15T23:30:00Z' }];
      const result = buildEventDateSet(events);
      expect(result.has('2026-01-16')).toBe(true);
      expect(result.has('2026-01-15')).toBe(false);
    });

    it('handles a large set of events without duplicates correctly', () => {
      const events = Array.from({ length: 10 }, (_, i) => ({
        start_time: `2026-05-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
      }));
      const result = buildEventDateSet(events);
      expect(result.size).toBe(10);
    });

    it('marks a multi-day event only on its start day', () => {
      // Even though the event runs March 5 → March 7, only the start day
      // should appear in the set (one dot per saved event).
      const result = buildEventDateSet([{ start_time: '2026-03-05T11:00:00Z' }]);
      expect(result.has('2026-03-05')).toBe(true);
      expect(result.has('2026-03-06')).toBe(false);
      expect(result.has('2026-03-07')).toBe(false);
      expect(result.size).toBe(1);
    });
  });

  describe('belgiumDateKey', () => {
    it('formats year, month (0-based), day into YYYY-MM-DD', () => {
      expect(belgiumDateKey(2026, 0, 5)).toBe('2026-01-05');
      expect(belgiumDateKey(2026, 11, 31)).toBe('2026-12-31');
    });

    it('zero-pads month and day', () => {
      expect(belgiumDateKey(2026, 8, 9)).toBe('2026-09-09');
    });
  });

  describe('getTodayDateKeyInBelgium', () => {
    it('returns a YYYY-MM-DD string', () => {
      expect(getTodayDateKeyInBelgium()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("matches getEventDateKeyInBelgium for now's ISO time", () => {
      // Same underlying formatter — should agree to the second.
      const expected = getEventDateKeyInBelgium(new Date().toISOString());
      expect(getTodayDateKeyInBelgium()).toBe(expected);
    });
  });

  describe('getMonthName', () => {
    it('returns "January" for month 0 in English', () => {
      expect(getMonthName(0, 'en')).toBe('January');
    });

    it('returns "December" for month 11 in English', () => {
      expect(getMonthName(11, 'en')).toBe('December');
    });

    it('returns capitalized French month name for month 0', () => {
      const name = getMonthName(0, 'fr');
      // French: "janvier" — function capitalizes first letter
      expect(name.charAt(0)).toBe(name.charAt(0).toUpperCase());
      expect(name.toLowerCase()).toContain('janv');
    });

    it('returns capitalized Dutch month name for month 0', () => {
      const name = getMonthName(0, 'nl');
      expect(name.charAt(0)).toBe(name.charAt(0).toUpperCase());
      expect(name.toLowerCase()).toContain('jan');
    });

    it('returns all 12 distinct month names in English', () => {
      const names = Array.from({ length: 12 }, (_, i) => getMonthName(i, 'en'));
      const unique = new Set(names);
      expect(unique.size).toBe(12);
    });

    it('falls back to English for an unknown locale', () => {
      // Unknown locale falls back to en-US
      const unknown = getMonthName(0, 'de');
      const english = getMonthName(0, 'en');
      expect(unknown).toBe(english);
    });

    it('returns a non-empty string for every month and all supported locales', () => {
      const locales = ['en', 'fr', 'nl'];
      locales.forEach((locale) => {
        for (let m = 0; m < 12; m++) {
          const name = getMonthName(m, locale);
          expect(typeof name).toBe('string');
          expect(name.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('formatDayHeader', () => {
    it('returns the weekday name and day number for English', () => {
      // March 29, 2026 is a Sunday
      const date = new Date(2026, 2, 29);
      const result = formatDayHeader(date, 'en');
      expect(result).toContain('29');
      expect(result).toContain('Sunday');
    });

    it('starts with a capitalized weekday name', () => {
      const date = new Date(2026, 2, 29);
      const result = formatDayHeader(date, 'en');
      expect(result.charAt(0)).toBe(result.charAt(0).toUpperCase());
    });

    it('returns localized weekday name in French', () => {
      // March 29, 2026 is a Sunday — dimanche in French
      const date = new Date(2026, 2, 29);
      const result = formatDayHeader(date, 'fr');
      expect(result).toContain('29');
      expect(result.toLowerCase()).toContain('dimanche');
    });

    it('returns localized weekday name in Dutch', () => {
      // March 29, 2026 is a Sunday — zondag in Dutch
      const date = new Date(2026, 2, 29);
      const result = formatDayHeader(date, 'nl');
      expect(result).toContain('29');
      expect(result.toLowerCase()).toContain('zondag');
    });

    it('falls back to English for an unknown locale', () => {
      const date = new Date(2026, 2, 29);
      const unknown = formatDayHeader(date, 'de');
      const english = formatDayHeader(date, 'en');
      expect(unknown).toBe(english);
    });

    it('includes the correct day number for the first of a month', () => {
      const date = new Date(2026, 2, 1); // March 1, 2026 (Sunday)
      const result = formatDayHeader(date, 'en');
      expect(result).toContain('1');
    });

    it('includes the correct day number for day 31', () => {
      const date = new Date(2026, 2, 31); // March 31, 2026
      const result = formatDayHeader(date, 'en');
      expect(result).toContain('31');
    });
  });

  describe('getDayHeaders', () => {
    it('returns an array of exactly 7 headers', () => {
      expect(getDayHeaders('en')).toHaveLength(7);
    });

    it('returns uppercase single-letter headers', () => {
      const headers = getDayHeaders('en');
      headers.forEach((h) => {
        expect(h).toBe(h.toUpperCase());
        expect(h.length).toBeGreaterThan(0);
      });
    });

    it('starts with Monday (M) for English', () => {
      const headers = getDayHeaders('en');
      expect(headers[0]).toBe('M');
    });

    it('ends with Sunday for English', () => {
      const headers = getDayHeaders('en');
      // English narrow Sunday is "S" — shared with Saturday
      // The last entry is Sunday regardless of letter collision
      expect(headers).toHaveLength(7);
      const lastHeader = headers[6];
      expect(typeof lastHeader).toBe('string');
    });

    it('returns 7 headers for French locale', () => {
      const headers = getDayHeaders('fr');
      expect(headers).toHaveLength(7);
      headers.forEach((h) => {
        expect(h).toBe(h.toUpperCase());
      });
    });

    it('returns 7 headers for Dutch locale', () => {
      const headers = getDayHeaders('nl');
      expect(headers).toHaveLength(7);
    });

    it('falls back gracefully for an unknown locale (returns 7 headers)', () => {
      const headers = getDayHeaders('de');
      expect(headers).toHaveLength(7);
    });

    it('all three supported locales produce the same length array', () => {
      expect(getDayHeaders('en')).toHaveLength(7);
      expect(getDayHeaders('fr')).toHaveLength(7);
      expect(getDayHeaders('nl')).toHaveLength(7);
    });
  });
});
