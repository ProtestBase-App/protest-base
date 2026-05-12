import {
  getEffectiveEndTime,
  isEventOngoing,
  hasEventEnded,
  isEventActiveDuringDate,
  isEventActiveDuringRange,
} from '../eventStatus';

describe('eventStatus utilities', () => {
  describe('getEffectiveEndTime', () => {
    it('should return end_time when provided', () => {
      const event = {
        start_time: '2025-01-15T10:00:00.000Z',
        end_time: '2025-01-15T15:00:00.000Z',
      };
      const result = getEffectiveEndTime(event);
      expect(result.toISOString()).toBe('2025-01-15T15:00:00.000Z');
    });

    it('should return start_time + 2 hours when end_time is not provided', () => {
      const event = {
        start_time: '2025-01-15T10:00:00.000Z',
      };
      const result = getEffectiveEndTime(event);
      expect(result.toISOString()).toBe('2025-01-15T12:00:00.000Z');
    });

    it('should return start_time + 2 hours when end_time is undefined', () => {
      const event = {
        start_time: '2025-01-15T14:30:00.000Z',
        end_time: undefined,
      };
      const result = getEffectiveEndTime(event);
      expect(result.toISOString()).toBe('2025-01-15T16:30:00.000Z');
    });
  });

  describe('isEventOngoing', () => {
    beforeEach(() => {
      // Mock current time to 2025-01-15T11:00:00.000Z
      jest.useFakeTimers().setSystemTime(new Date('2025-01-15T11:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return true if event has not ended yet (using end_time)', () => {
      const event = {
        start_time: '2025-01-15T10:00:00.000Z',
        end_time: '2025-01-15T15:00:00.000Z', // Ends at 15:00, current is 11:00
      };
      expect(isEventOngoing(event)).toBe(true);
    });

    it('should return false if event has ended (using end_time)', () => {
      const event = {
        start_time: '2025-01-15T08:00:00.000Z',
        end_time: '2025-01-15T10:00:00.000Z', // Ended at 10:00, current is 11:00
      };
      expect(isEventOngoing(event)).toBe(false);
    });

    it('should return true if event is within 2 hours of start (no end_time)', () => {
      const event = {
        start_time: '2025-01-15T10:00:00.000Z', // Started at 10:00, effective end 12:00
        // No end_time
      };
      expect(isEventOngoing(event)).toBe(true);
    });

    it('should return false if event started more than 2 hours ago (no end_time)', () => {
      const event = {
        start_time: '2025-01-15T08:00:00.000Z', // Started at 08:00, effective end 10:00
        // No end_time
      };
      expect(isEventOngoing(event)).toBe(false);
    });

    it('should return true for future events', () => {
      const event = {
        start_time: '2025-01-15T14:00:00.000Z', // Starts at 14:00, current is 11:00
      };
      expect(isEventOngoing(event)).toBe(true);
    });
  });

  describe('hasEventEnded', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2025-01-15T11:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return true if event has ended', () => {
      const event = {
        start_time: '2025-01-15T08:00:00.000Z',
        end_time: '2025-01-15T10:00:00.000Z',
      };
      expect(hasEventEnded(event)).toBe(true);
    });

    it('should return false if event has not ended', () => {
      const event = {
        start_time: '2025-01-15T10:00:00.000Z',
        end_time: '2025-01-15T15:00:00.000Z',
      };
      expect(hasEventEnded(event)).toBe(false);
    });
  });

  describe('isEventActiveDuringDate', () => {
    it('should return true for event that starts and ends on target date', () => {
      const event = {
        start_time: '2025-01-15T10:00:00.000Z',
        end_time: '2025-01-15T18:00:00.000Z',
      };
      const targetDate = new Date('2025-01-15T00:00:00.000Z');
      expect(isEventActiveDuringDate(event, targetDate)).toBe(true);
    });

    it('should return true for multi-day event that spans target date', () => {
      const event = {
        start_time: '2025-01-14T10:00:00.000Z', // Started yesterday
        end_time: '2025-01-16T18:00:00.000Z', // Ends tomorrow
      };
      const targetDate = new Date('2025-01-15T00:00:00.000Z'); // Today
      expect(isEventActiveDuringDate(event, targetDate)).toBe(true);
    });

    it('should return true for event that started before and ends on target date', () => {
      const event = {
        start_time: '2025-01-14T20:00:00.000Z', // Started yesterday
        end_time: '2025-01-15T06:00:00.000Z', // Ends today morning
      };
      const targetDate = new Date('2025-01-15T00:00:00.000Z');
      expect(isEventActiveDuringDate(event, targetDate)).toBe(true);
    });

    it('should return false for event that ended before target date', () => {
      const event = {
        start_time: '2025-01-13T10:00:00.000Z',
        end_time: '2025-01-13T18:00:00.000Z', // Ended 2 days ago
      };
      const targetDate = new Date('2025-01-15T00:00:00.000Z');
      expect(isEventActiveDuringDate(event, targetDate)).toBe(false);
    });

    it('should return false for event that starts after target date', () => {
      const event = {
        start_time: '2025-01-16T10:00:00.000Z', // Starts tomorrow
      };
      const targetDate = new Date('2025-01-15T00:00:00.000Z');
      expect(isEventActiveDuringDate(event, targetDate)).toBe(false);
    });

    it('should use start_time + 2 hours as effective end when no end_time', () => {
      const event = {
        start_time: '2025-01-15T22:00:00.000Z', // Starts at 22:00, effective end 00:00 next day
      };
      const targetDate = new Date('2025-01-15T00:00:00.000Z');
      expect(isEventActiveDuringDate(event, targetDate)).toBe(true);
    });
  });

  describe('isEventActiveDuringRange', () => {
    it('should return true for event within range', () => {
      const event = {
        start_time: '2025-01-15T10:00:00.000Z',
        end_time: '2025-01-15T18:00:00.000Z',
      };
      const rangeStart = new Date('2025-01-14T00:00:00.000Z');
      const rangeEnd = new Date('2025-01-16T23:59:59.999Z');
      expect(isEventActiveDuringRange(event, rangeStart, rangeEnd)).toBe(true);
    });

    it('should return true for event that overlaps start of range', () => {
      const event = {
        start_time: '2025-01-13T20:00:00.000Z',
        end_time: '2025-01-15T10:00:00.000Z', // Ends during range
      };
      const rangeStart = new Date('2025-01-15T00:00:00.000Z');
      const rangeEnd = new Date('2025-01-17T23:59:59.999Z');
      expect(isEventActiveDuringRange(event, rangeStart, rangeEnd)).toBe(true);
    });

    it('should return true for event that overlaps end of range', () => {
      const event = {
        start_time: '2025-01-16T20:00:00.000Z', // Starts during range
        end_time: '2025-01-18T10:00:00.000Z',
      };
      const rangeStart = new Date('2025-01-15T00:00:00.000Z');
      const rangeEnd = new Date('2025-01-17T23:59:59.999Z');
      expect(isEventActiveDuringRange(event, rangeStart, rangeEnd)).toBe(true);
    });

    it('should return true for event that spans entire range', () => {
      const event = {
        start_time: '2025-01-10T10:00:00.000Z',
        end_time: '2025-01-25T18:00:00.000Z', // Spans entire range
      };
      const rangeStart = new Date('2025-01-15T00:00:00.000Z');
      const rangeEnd = new Date('2025-01-17T23:59:59.999Z');
      expect(isEventActiveDuringRange(event, rangeStart, rangeEnd)).toBe(true);
    });

    it('should return false for event before range', () => {
      const event = {
        start_time: '2025-01-10T10:00:00.000Z',
        end_time: '2025-01-12T18:00:00.000Z',
      };
      const rangeStart = new Date('2025-01-15T00:00:00.000Z');
      const rangeEnd = new Date('2025-01-17T23:59:59.999Z');
      expect(isEventActiveDuringRange(event, rangeStart, rangeEnd)).toBe(false);
    });

    it('should return false for event after range', () => {
      const event = {
        start_time: '2025-01-20T10:00:00.000Z',
        end_time: '2025-01-22T18:00:00.000Z',
      };
      const rangeStart = new Date('2025-01-15T00:00:00.000Z');
      const rangeEnd = new Date('2025-01-17T23:59:59.999Z');
      expect(isEventActiveDuringRange(event, rangeStart, rangeEnd)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    describe('getEffectiveEndTime edge cases', () => {
      it('should handle event with empty string end_time (treated as no end_time)', () => {
        const event = {
          start_time: '2025-01-15T10:00:00.000Z',
          end_time: '',
        };
        // Empty string is falsy, so should use start_time + 2 hours
        const result = getEffectiveEndTime(event);
        expect(result.toISOString()).toBe('2025-01-15T12:00:00.000Z');
      });

      it('should handle dates without timezone indicator', () => {
        const event = {
          start_time: '2025-01-15T10:00:00', // No 'Z' suffix
          end_time: '2025-01-15T15:00:00',
        };
        const result = getEffectiveEndTime(event);
        // parseAsUTC should add 'Z' suffix
        expect(result.toISOString()).toBe('2025-01-15T15:00:00.000Z');
      });

      it('should handle event spanning midnight', () => {
        const event = {
          start_time: '2025-01-15T22:00:00.000Z',
          end_time: '2025-01-16T02:00:00.000Z',
        };
        const result = getEffectiveEndTime(event);
        expect(result.toISOString()).toBe('2025-01-16T02:00:00.000Z');
      });
    });

    describe('isEventOngoing edge cases', () => {
      it('should return true for event ending just after now', () => {
        const now = new Date('2025-01-15T12:00:00.000Z');
        jest.useFakeTimers().setSystemTime(now);

        const event = {
          start_time: '2025-01-15T10:00:00.000Z',
          end_time: '2025-01-15T12:00:00.001Z', // Just 1ms after "now"
        };
        expect(isEventOngoing(event)).toBe(true);

        jest.useRealTimers();
      });

      it('should return false for event that ended at now', () => {
        const now = new Date('2025-01-15T12:00:00.000Z');
        jest.useFakeTimers().setSystemTime(now);

        const event = {
          start_time: '2025-01-15T10:00:00.000Z',
          end_time: '2025-01-15T12:00:00.000Z', // Exactly at "now"
        };
        // end_time > now is false when they're equal
        expect(isEventOngoing(event)).toBe(false);

        jest.useRealTimers();
      });

      it('should handle very long events (multi-week)', () => {
        jest.useFakeTimers().setSystemTime(new Date('2025-01-20T10:00:00.000Z'));

        const event = {
          start_time: '2025-01-01T10:00:00.000Z', // Started 19 days ago
          end_time: '2025-01-31T18:00:00.000Z', // Ends in 11 days
        };
        expect(isEventOngoing(event)).toBe(true);

        jest.useRealTimers();
      });

      it('should handle event with end_time before start_time (invalid but handled)', () => {
        jest.useFakeTimers().setSystemTime(new Date('2025-01-15T11:00:00.000Z'));

        const event = {
          start_time: '2025-01-15T14:00:00.000Z',
          end_time: '2025-01-15T10:00:00.000Z', // End before start (invalid)
        };
        // Should use end_time as-is, which is in the past
        expect(isEventOngoing(event)).toBe(false);

        jest.useRealTimers();
      });
    });

    describe('isEventActiveDuringDate edge cases', () => {
      it('should handle event that ends exactly at midnight of target date', () => {
        const event = {
          start_time: '2025-01-14T20:00:00.000Z',
          end_time: '2025-01-15T00:00:00.000Z', // Ends at midnight
        };
        const targetDate = new Date('2025-01-15T00:00:00.000Z');
        // Event ends at start of target date, so it should be active
        expect(isEventActiveDuringDate(event, targetDate)).toBe(true);
      });

      it('should handle event that starts during target date', () => {
        const event = {
          start_time: '2025-01-15T14:00:00.000Z', // Starts in the afternoon
        };
        // Use a date object with local time to match implementation behavior
        const targetDate = new Date(2025, 0, 15); // Jan 15, 2025 local time
        expect(isEventActiveDuringDate(event, targetDate)).toBe(true);
      });

      it('should return false for event that ended well before target date', () => {
        const event = {
          start_time: '2025-01-13T10:00:00.000Z',
          end_time: '2025-01-13T18:00:00.000Z', // Ended 2 days before target
        };
        const targetDate = new Date(2025, 0, 15); // Jan 15, 2025
        expect(isEventActiveDuringDate(event, targetDate)).toBe(false);
      });

      it('should handle single-minute event', () => {
        const event = {
          start_time: '2025-01-15T10:00:00.000Z',
          end_time: '2025-01-15T10:01:00.000Z', // 1 minute event
        };
        const targetDate = new Date('2025-01-15T00:00:00.000Z');
        expect(isEventActiveDuringDate(event, targetDate)).toBe(true);
      });
    });

    describe('isEventActiveDuringRange edge cases', () => {
      it('should handle event that touches range boundary', () => {
        const event = {
          start_time: '2025-01-14T23:59:59.999Z',
          end_time: '2025-01-15T00:00:00.000Z', // Ends exactly at range start
        };
        const rangeStart = new Date('2025-01-15T00:00:00.000Z');
        const rangeEnd = new Date('2025-01-17T23:59:59.999Z');
        // Event ends exactly when range starts
        expect(isEventActiveDuringRange(event, rangeStart, rangeEnd)).toBe(true);
      });

      it('should handle single-day range', () => {
        const event = {
          start_time: '2025-01-15T10:00:00.000Z',
          end_time: '2025-01-15T18:00:00.000Z',
        };
        const rangeStart = new Date('2025-01-15T00:00:00.000Z');
        const rangeEnd = new Date('2025-01-15T23:59:59.999Z');
        expect(isEventActiveDuringRange(event, rangeStart, rangeEnd)).toBe(true);
      });

      it('should handle very short range (1 hour)', () => {
        const event = {
          start_time: '2025-01-15T10:30:00.000Z',
          end_time: '2025-01-15T10:45:00.000Z',
        };
        const rangeStart = new Date('2025-01-15T10:00:00.000Z');
        const rangeEnd = new Date('2025-01-15T11:00:00.000Z');
        expect(isEventActiveDuringRange(event, rangeStart, rangeEnd)).toBe(true);
      });
    });
  });

  describe('Integration with DEFAULT_EVENT_DURATION', () => {
    it('should correctly use 2-hour default duration', () => {
      // At 11:59:59, event starting at 10:00 should be ongoing (ends at 12:00)
      jest.useFakeTimers().setSystemTime(new Date('2025-01-15T11:59:59.000Z'));

      const event = {
        start_time: '2025-01-15T10:00:00.000Z',
        // No end_time - should use start + 2 hours = 12:00
      };

      expect(isEventOngoing(event)).toBe(true);

      // At exactly 12:00, event should not be ongoing (end time equals now, not > now)
      jest.setSystemTime(new Date('2025-01-15T12:00:00.000Z'));
      expect(isEventOngoing(event)).toBe(false);

      // At 12:00:01, event should definitely not be ongoing
      jest.setSystemTime(new Date('2025-01-15T12:00:01.000Z'));
      expect(isEventOngoing(event)).toBe(false);

      jest.useRealTimers();
    });

    it('should prefer explicit end_time over default duration', () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-01-15T11:00:00.000Z'));

      // Event with explicit end_time of 18:00 (6 hours, not 2)
      const event = {
        start_time: '2025-01-15T10:00:00.000Z',
        end_time: '2025-01-15T18:00:00.000Z',
      };

      expect(isEventOngoing(event)).toBe(true);

      // At 17:59, still ongoing
      jest.setSystemTime(new Date('2025-01-15T17:59:00.000Z'));
      expect(isEventOngoing(event)).toBe(true);

      // At 18:01, not ongoing
      jest.setSystemTime(new Date('2025-01-15T18:01:00.000Z'));
      expect(isEventOngoing(event)).toBe(false);

      jest.useRealTimers();
    });
  });
});
