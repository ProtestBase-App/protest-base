import { canUserEditEvent, canUserDeleteEvent } from '../eventPermissions';

describe('canUserEditEvent', () => {
  beforeEach(() => {
    // 2025-01-15 at 12:00:00 UTC
    jest.useFakeTimers().setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Successful edit scenarios', () => {
    it('should return true when user belongs to org and event end date is in the future', () => {
      expect(
        canUserEditEvent(
          'org123',
          ['org123', 'org456'],
          '2025-01-20T10:00:00Z',
          '2025-01-20T14:00:00Z'
        )
      ).toBe(true);
    });

    it('should return true when event has no end date and start + 2h is in the future', () => {
      // Start at 14:00 today, no end date => effective end = 16:00, now = 12:00
      expect(canUserEditEvent('org123', ['org123'], '2025-01-15T14:00:00Z', null)).toBe(true);
    });

    it('should return true when event has no end date (undefined) and start + 2h is in the future', () => {
      expect(canUserEditEvent('org123', ['org123'], '2025-01-15T14:00:00Z', undefined)).toBe(true);
    });

    it('should return true when event has no end date (omitted) and start + 2h is in the future', () => {
      expect(canUserEditEvent('org123', ['org123'], '2025-01-15T14:00:00Z')).toBe(true);
    });

    it('should return true for events far in the future', () => {
      expect(
        canUserEditEvent('org123', ['org123'], '2026-12-31T10:00:00Z', '2026-12-31T18:00:00Z')
      ).toBe(true);
    });

    it('should return true when user has multiple organizations including the event org', () => {
      expect(
        canUserEditEvent(
          'org456',
          ['org123', 'org456', 'org789'],
          '2025-01-20T10:00:00Z',
          '2025-01-20T14:00:00Z'
        )
      ).toBe(true);
    });

    it('should return true when event has started but end date has not passed', () => {
      // Event started at 10:00, ends at 14:00, now is 12:00
      expect(
        canUserEditEvent('org123', ['org123'], '2025-01-15T10:00:00Z', '2025-01-15T14:00:00Z')
      ).toBe(true);
    });

    it('should return true when now equals end date exactly', () => {
      // now = 12:00:00, end = 12:00:00 => Date.now() <= effectiveEnd
      expect(
        canUserEditEvent('org123', ['org123'], '2025-01-15T10:00:00Z', '2025-01-15T12:00:00Z')
      ).toBe(true);
    });
  });

  describe('Failed edit scenarios - end date has passed', () => {
    it('should return false when event end date is in the past', () => {
      expect(
        canUserEditEvent('org123', ['org123'], '2025-01-14T10:00:00Z', '2025-01-14T14:00:00Z')
      ).toBe(false);
    });

    it('should return false when event has no end date and start + 2h has passed', () => {
      // Start at 08:00, no end date => effective end = 10:00, now = 12:00
      expect(canUserEditEvent('org123', ['org123'], '2025-01-15T08:00:00Z', null)).toBe(false);
    });

    it('should return false when end date was just 1 second ago', () => {
      // End at 11:59:59, now is 12:00:00
      expect(
        canUserEditEvent('org123', ['org123'], '2025-01-15T10:00:00Z', '2025-01-15T11:59:59Z')
      ).toBe(false);
    });
  });

  describe('Failed edit scenarios - user not in organization', () => {
    it('should return false when user does not belong to the event organization', () => {
      expect(
        canUserEditEvent(
          'org123',
          ['org456', 'org789'],
          '2025-01-20T10:00:00Z',
          '2025-01-20T14:00:00Z'
        )
      ).toBe(false);
    });

    it('should return false when user has no organizations', () => {
      expect(canUserEditEvent('org123', [], '2025-01-20T10:00:00Z', '2025-01-20T14:00:00Z')).toBe(
        false
      );
    });

    it('should return false when event has no organization_id', () => {
      expect(
        canUserEditEvent(undefined, ['org123'], '2025-01-20T10:00:00Z', '2025-01-20T14:00:00Z')
      ).toBe(false);
    });

    it('should return false when event organization_id is empty string', () => {
      expect(canUserEditEvent('', ['org123'], '2025-01-20T10:00:00Z', '2025-01-20T14:00:00Z')).toBe(
        false
      );
    });
  });

  describe('Failed edit scenarios - combined failures', () => {
    it('should return false when user not in organization AND event end date is past', () => {
      expect(
        canUserEditEvent('org123', ['org456'], '2025-01-10T10:00:00Z', '2025-01-10T14:00:00Z')
      ).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle null/undefined userOrganizationIds gracefully', () => {
      // @ts-expect-error - testing invalid input
      expect(canUserEditEvent('org123', null, '2025-01-20T10:00:00Z', '2025-01-20T14:00:00Z')).toBe(
        false
      );
      expect(
        // @ts-expect-error - testing invalid input
        canUserEditEvent('org123', undefined, '2025-01-20T10:00:00Z', '2025-01-20T14:00:00Z')
      ).toBe(false);
    });

    it('should be case-sensitive for organization IDs', () => {
      expect(
        canUserEditEvent('ORG123', ['org123'], '2025-01-20T10:00:00Z', '2025-01-20T14:00:00Z')
      ).toBe(false);
    });

    it('should handle invalid date string gracefully', () => {
      expect(canUserEditEvent('org123', ['org123'], 'not-a-date', null)).toBe(false);
    });

    it('should handle invalid end date string by falling back to start + 2h', () => {
      // Invalid end date => empty string is falsy, falls back to start + 2h
      expect(canUserEditEvent('org123', ['org123'], '2025-01-15T14:00:00Z', '')).toBe(true);
    });
  });
});

describe('canUserDeleteEvent', () => {
  beforeEach(() => {
    // 2025-01-15 at 12:00:00 UTC
    jest.useFakeTimers().setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Successful delete scenarios', () => {
    it('should return true when event starts more than 1 hour from now', () => {
      // Event at 14:00, now is 12:00 => 2 hours away > 1 hour threshold
      expect(canUserDeleteEvent('org123', ['org123'], '2025-01-15T14:00:00Z')).toBe(true);
    });

    it('should return true for events far in the future', () => {
      expect(canUserDeleteEvent('org123', ['org123'], '2025-02-01T10:00:00Z')).toBe(true);
    });

    it('should return true when user has multiple orgs including the event org', () => {
      expect(
        canUserDeleteEvent('org456', ['org123', 'org456', 'org789'], '2025-01-15T14:00:00Z')
      ).toBe(true);
    });
  });

  describe('Failed delete scenarios - within 1 hour threshold', () => {
    it('should return false when event starts exactly 1 hour from now', () => {
      // Event at 13:00, now is 12:00 => exactly 1 hour, NOT > 1 hour
      expect(canUserDeleteEvent('org123', ['org123'], '2025-01-15T13:00:00Z')).toBe(false);
    });

    it('should return false when event starts less than 1 hour from now', () => {
      // Event at 12:30, now is 12:00 => 30 minutes
      expect(canUserDeleteEvent('org123', ['org123'], '2025-01-15T12:30:00Z')).toBe(false);
    });

    it('should return false when event has already started', () => {
      // Event at 11:00, now is 12:00 => already past
      expect(canUserDeleteEvent('org123', ['org123'], '2025-01-15T11:00:00Z')).toBe(false);
    });

    it('should return false when event is in the past', () => {
      expect(canUserDeleteEvent('org123', ['org123'], '2025-01-10T10:00:00Z')).toBe(false);
    });
  });

  describe('1 hour boundary precision', () => {
    it('should return true when event is 1 hour and 1 second from now', () => {
      // 12:00:00 + 1h = 13:00:00, event at 13:00:01 => just over threshold
      expect(canUserDeleteEvent('org123', ['org123'], '2025-01-15T13:00:01Z')).toBe(true);
    });

    it('should return false when event is 59 minutes from now', () => {
      expect(canUserDeleteEvent('org123', ['org123'], '2025-01-15T12:59:00Z')).toBe(false);
    });
  });

  describe('Failed delete scenarios - organization checks', () => {
    it('should return false when event has no organization_id', () => {
      expect(canUserDeleteEvent(undefined, ['org123'], '2025-01-15T14:00:00Z')).toBe(false);
    });

    it('should return false when event organization_id is empty string', () => {
      expect(canUserDeleteEvent('', ['org123'], '2025-01-15T14:00:00Z')).toBe(false);
    });

    it('should return false when user has no organizations', () => {
      expect(canUserDeleteEvent('org123', [], '2025-01-15T14:00:00Z')).toBe(false);
    });

    it('should return false when user does not belong to event organization', () => {
      expect(canUserDeleteEvent('org123', ['org456'], '2025-01-15T14:00:00Z')).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle null/undefined userOrganizationIds gracefully', () => {
      // @ts-expect-error - testing invalid input
      expect(canUserDeleteEvent('org123', null, '2025-01-15T14:00:00Z')).toBe(false);
      // @ts-expect-error - testing invalid input
      expect(canUserDeleteEvent('org123', undefined, '2025-01-15T14:00:00Z')).toBe(false);
    });

    it('should be case-sensitive for organization IDs', () => {
      expect(canUserDeleteEvent('ORG123', ['org123'], '2025-01-15T14:00:00Z')).toBe(false);
    });

    it('should handle invalid date string gracefully', () => {
      expect(canUserDeleteEvent('org123', ['org123'], 'not-a-date')).toBe(false);
    });

    it('should return false and not throw when an error is thrown internally', () => {
      // Force an error in the try block by making Date.now throw
      const originalDateNow = Date.now;
      Date.now = () => {
        throw new Error('Date.now broke');
      };

      try {
        const result = canUserEditEvent('org123', ['org123'], '2025-01-20T10:00:00Z');
        expect(result).toBe(false);
      } finally {
        Date.now = originalDateNow;
      }
    });
  });
});

describe('canUserDeleteEvent', () => {
  // Mock time to 2025-01-15T12:00:00Z
  const mockNow = new Date('2025-01-15T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(mockNow);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Successful delete scenarios', () => {
    it('should return true when user belongs to the org and event is more than 1 hour away', () => {
      // Arrange: event starts 2 hours from mock now
      const eventStartDateFull = '2025-01-15T14:00:00Z';

      // Act & Assert
      expect(canUserDeleteEvent('org123', ['org123'], eventStartDateFull)).toBe(true);
    });

    it('should return true when event is exactly 2 hours away', () => {
      const eventStartDateFull = '2025-01-15T14:00:00Z';
      expect(canUserDeleteEvent('org123', ['org123'], eventStartDateFull)).toBe(true);
    });

    it('should return true when event is far in the future', () => {
      const futureEvent = '2026-12-31T10:00:00Z';
      expect(canUserDeleteEvent('org123', ['org123'], futureEvent)).toBe(true);
    });

    it('should return true when user has multiple orgs including the event org', () => {
      const eventStartDateFull = '2025-01-15T14:00:00Z';
      expect(canUserDeleteEvent('org456', ['org123', 'org456', 'org789'], eventStartDateFull)).toBe(
        true
      );
    });
  });

  describe('Failed delete scenarios - event within 1 hour', () => {
    it('should return false when event starts in exactly 30 minutes', () => {
      // Event starts 30 minutes from now (12:30), within the 1-hour window
      const eventStartDateFull = '2025-01-15T12:30:00Z';
      expect(canUserDeleteEvent('org123', ['org123'], eventStartDateFull)).toBe(false);
    });

    it('should return false when event starts in exactly 1 hour', () => {
      // Event starts at exactly 1 hour from now (13:00), boundary: NOT more than 1 hour
      const eventStartDateFull = '2025-01-15T13:00:00Z';
      expect(canUserDeleteEvent('org123', ['org123'], eventStartDateFull)).toBe(false);
    });

    it('should return false when event is currently happening (started in the past)', () => {
      // Event started 30 minutes ago
      const eventStartDateFull = '2025-01-15T11:30:00Z';
      expect(canUserDeleteEvent('org123', ['org123'], eventStartDateFull)).toBe(false);
    });

    it('should return false when event is in the past', () => {
      const pastEvent = '2025-01-10T10:00:00Z';
      expect(canUserDeleteEvent('org123', ['org123'], pastEvent)).toBe(false);
    });

    it('should return false when event was yesterday', () => {
      const yesterday = '2025-01-14T10:00:00Z';
      expect(canUserDeleteEvent('org123', ['org123'], yesterday)).toBe(false);
    });
  });

  describe('Failed delete scenarios - user not in organization', () => {
    it('should return false when user does not belong to the event organization', () => {
      const futureEvent = '2025-01-15T14:00:00Z';
      expect(canUserDeleteEvent('org123', ['org456', 'org789'], futureEvent)).toBe(false);
    });

    it('should return false when user has no organizations', () => {
      const futureEvent = '2025-01-15T14:00:00Z';
      expect(canUserDeleteEvent('org123', [], futureEvent)).toBe(false);
    });

    it('should return false when event has no organization_id', () => {
      const futureEvent = '2025-01-15T14:00:00Z';
      expect(canUserDeleteEvent(undefined, ['org123'], futureEvent)).toBe(false);
    });

    it('should return false when event organization_id is empty string', () => {
      const futureEvent = '2025-01-15T14:00:00Z';
      expect(canUserDeleteEvent('', ['org123'], futureEvent)).toBe(false);
    });
  });

  describe('Failed delete scenarios - combined failures', () => {
    it('should return false when user not in org AND event within 1 hour', () => {
      const soonEvent = '2025-01-15T12:30:00Z'; // 30 minutes from now
      expect(canUserDeleteEvent('org123', ['org456'], soonEvent)).toBe(false);
    });

    it('should return false when user not in org AND event is in the past', () => {
      const pastEvent = '2025-01-10T10:00:00Z';
      expect(canUserDeleteEvent('org123', ['org456'], pastEvent)).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle null/undefined userOrganizationIds gracefully', () => {
      const futureEvent = '2025-01-15T14:00:00Z';

      // @ts-expect-error - testing invalid input
      expect(canUserDeleteEvent('org123', null, futureEvent)).toBe(false);
      // @ts-expect-error - testing invalid input
      expect(canUserDeleteEvent('org123', undefined, futureEvent)).toBe(false);
    });

    it('should be case-sensitive for organization IDs', () => {
      const futureEvent = '2025-01-15T14:00:00Z';
      expect(canUserDeleteEvent('ORG123', ['org123'], futureEvent)).toBe(false);
    });

    it('should handle an invalid date string gracefully and return false', () => {
      // An invalid date string causes new Date().getTime() to return NaN
      // The comparison NaN > oneHourFromNow is false, so the function returns false
      const result = canUserDeleteEvent('org123', ['org123'], 'not-a-date');
      expect(result).toBe(false);
    });

    it('should return false and not throw when Date.now throws internally', () => {
      // Force an error in the try block by making Date.now throw
      const originalDateNow = Date.now;
      Date.now = () => {
        throw new Error('Date.now broke');
      };

      try {
        const result = canUserDeleteEvent('org123', ['org123'], '2025-01-15T14:00:00Z');
        expect(result).toBe(false);
      } finally {
        Date.now = originalDateNow;
      }
    });

    it('should distinguish between just-over and just-under 1 hour', () => {
      // 1 hour + 1 second from now = should be allowed (>1 hour away)
      const justOverOneHour = new Date(mockNow.getTime() + 60 * 60 * 1000 + 1000).toISOString();
      expect(canUserDeleteEvent('org123', ['org123'], justOverOneHour)).toBe(true);

      // Exactly 1 hour from now = NOT allowed (must be MORE than 1 hour)
      const exactlyOneHour = new Date(mockNow.getTime() + 60 * 60 * 1000).toISOString();
      expect(canUserDeleteEvent('org123', ['org123'], exactlyOneHour)).toBe(false);
    });
  });
});
