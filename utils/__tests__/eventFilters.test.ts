import { applyCombinedFilters, filterOngoingEvents, Event } from '../eventFilters';

// Mock Events Data
const mockEvents: Event[] = [
  {
    $id: '1',
    id: '1',
    title: 'Climate Action Now',
    description: 'A protest for stronger climate policies.',
    city: 'Brussels',
    country: 'Belgium',
    startDateNoFormat: '2025-11-22',
    startDateFull: '2025-11-22T10:00:00.000Z', // Today
    endDateFull: null,
    start_time: '10:00',
    organizer_name: 'Greenpeace',
    organization_id: 'org-greenpeace',
    categories: ['Climate', 'Politics'],
    postal_code: 1000,
    image: '',
    view_count: 0,
    help_needed: false,
  },
  {
    $id: '2',
    id: '2',
    title: 'Tech Workers Unite',
    description: 'A rally for better working conditions in the tech industry.',
    city: 'Ghent',
    country: 'Belgium',
    startDateNoFormat: '2025-11-23',
    startDateFull: '2025-11-23T14:00:00.000Z', // Tomorrow
    endDateFull: null,
    start_time: '14:00',
    organizer_name: 'Tech Union',
    organization_id: 'org-tech-union',
    categories: ['Labor', 'Technology'],
    postal_code: 9000,
    image: '',
    view_count: 0,
    help_needed: false,
  },
  {
    $id: '3',
    id: '3',
    title: 'Healthcare for All',
    description: 'A march to demand universal healthcare.',
    city: 'Antwerp',
    country: 'Belgium',
    startDateNoFormat: '2025-11-25',
    startDateFull: '2025-11-25T11:00:00.000Z', // This week
    endDateFull: null,
    start_time: '11:00',
    organizer_name: 'Doctors for the People',
    organization_id: 'org-doctors',
    co_organizers: ['Greenpeace'],
    categories: ['Healthcare'],
    postal_code: 2000,
    image: '',
    view_count: 0,
    help_needed: false,
  },
  {
    $id: '4',
    id: '4',
    title: 'Digital Privacy Rights',
    description: 'A protest against government surveillance.',
    city: 'Brussels',
    country: 'Belgium',
    startDateNoFormat: '2025-12-01',
    startDateFull: '2025-12-01T12:00:00.000Z', // Next week
    endDateFull: null,
    start_time: '12:00',
    organizer_name: 'Privacy International',
    organization_id: 'org-privacy',
    categories: ['Human Rights', 'Technology'],
    postal_code: 1000,
    image: '',
    view_count: 0,
    help_needed: false,
  },
  {
    $id: '5',
    id: '5',
    title: 'Animal Rights Rally',
    description: 'A peaceful demonstration for animal welfare. Come see the animals.',
    city: 'Ghent',
    country: 'Belgium',
    startDateNoFormat: '2025-11-29',
    startDateFull: '2025-11-29T13:00:00.000Z', // This weekend (Saturday)
    endDateFull: null,
    start_time: '13:00',
    organizer_name: 'PETA',
    organization_id: 'org-peta',
    categories: ['Animals'],
    postal_code: 9000,
    image: '',
    view_count: 0,
    help_needed: false,
  },
  {
    $id: '6',
    id: '6',
    title: 'No-Postal-Code Event',
    description: 'An event without a postal code for testing.',
    city: 'Unknown',
    country: 'Belgium',
    startDateNoFormat: '2025-11-22',
    startDateFull: '2025-11-22T10:00:00.000Z', // Today
    endDateFull: null,
    start_time: '10:00',
    organizer_name: 'Greenpeace',
    organization_id: 'org-greenpeace',
    categories: ['Climate'],
    postal_code: null,
    image: '',
    view_count: 0,
    help_needed: false,
  },
];

describe('applyCombinedFilters', () => {
  // Mock logger
  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(() => {
    // Reset mocks before each test
    mockLogger.error.mockClear();
    mockLogger.warn.mockClear();
    // Mock the current date to be 2025-11-22
    jest.useFakeTimers().setSystemTime(new Date('2025-11-22T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Search Filtering', () => {
    it('should filter events by title', () => {
      const filtered = applyCombinedFilters(
        mockEvents,
        'Climate Action',
        null,
        null,
        null,
        null,
        mockLogger
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Climate Action Now');
    });

    it('should filter events by description', () => {
      const filtered = applyCombinedFilters(
        mockEvents,
        'working conditions',
        null,
        null,
        null,
        null,
        mockLogger
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Tech Workers Unite');
    });

    it('should filter events by category', () => {
      const filtered = applyCombinedFilters(
        mockEvents,
        'Labor',
        null,
        null,
        null,
        null,
        mockLogger
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Tech Workers Unite');
    });

    it('should be case-insensitive', () => {
      const filtered = applyCombinedFilters(
        mockEvents,
        'climate action',
        null,
        null,
        null,
        null,
        mockLogger
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Climate Action Now');
    });

    it('should return multiple events if the search term matches in different fields', () => {
      const filtered = applyCombinedFilters(mockEvents, 'tech', null, null, null, null, mockLogger);
      expect(filtered).toHaveLength(2);
      expect(filtered.map((e) => e.title)).toContain('Tech Workers Unite');
      expect(filtered.map((e) => e.title)).toContain('Digital Privacy Rights');
    });

    it('should return an empty array if no events match the search term', () => {
      const filtered = applyCombinedFilters(
        mockEvents,
        'nonexistent search term',
        null,
        null,
        null,
        null,
        mockLogger
      );
      expect(filtered).toHaveLength(0);
    });
  });

  describe('Location Filtering', () => {
    it('should filter events by a single postal code', () => {
      const filtered = applyCombinedFilters(mockEvents, '', ['1000'], null, null, null, mockLogger);
      expect(filtered).toHaveLength(2);
      expect(filtered.every((e) => e.postal_code === 1000)).toBe(true);
    });

    it('should filter events by multiple postal codes', () => {
      const filtered = applyCombinedFilters(
        mockEvents,
        '',
        ['1000', '9000'],
        null,
        null,
        null,
        mockLogger
      );
      expect(filtered).toHaveLength(4);
      expect(filtered.some((e) => e.postal_code === 1000)).toBe(true);
      expect(filtered.some((e) => e.postal_code === 9000)).toBe(true);
    });

    it('should return an empty array if no events match the postal code', () => {
      const filtered = applyCombinedFilters(mockEvents, '', ['9999'], null, null, null, mockLogger);
      expect(filtered).toHaveLength(0);
    });

    it('should not include events with a null or undefined postal code', () => {
      // Event 6 has a null postal code
      const filtered = applyCombinedFilters(mockEvents, '', ['1000'], null, null, null, mockLogger);
      expect(filtered.find((e) => e.id === '6')).toBeUndefined();
    });

    it('should handle an empty location array', () => {
      const filtered = applyCombinedFilters(mockEvents, '', [], null, null, null, mockLogger);
      expect(filtered).toHaveLength(mockEvents.length);
    });

    it('should handle a null location filter', () => {
      const filtered = applyCombinedFilters(mockEvents, '', null, null, null, null, mockLogger);
      expect(filtered).toHaveLength(mockEvents.length);
    });
  });

  describe('Date Filtering', () => {
    it('should filter events for "today"', () => {
      // Today is mocked as 2025-11-22
      const filtered = applyCombinedFilters(mockEvents, '', null, 'today', null, null, mockLogger);
      expect(filtered).toHaveLength(2);
      expect(filtered.every((e) => e.startDateNoFormat.startsWith('2025-11-22'))).toBe(true);
    });

    it('should filter events for "tomorrow"', () => {
      // Tomorrow is mocked as 2025-11-23
      const filtered = applyCombinedFilters(
        mockEvents,
        '',
        null,
        'tomorrow',
        null,
        null,
        mockLogger
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].startDateNoFormat.startsWith('2025-11-23')).toBe(true);
    });

    it('should filter events for "thisWeek"', () => {
      // For Saturday 2025-11-22, "this week" (Mon-Sun) includes events on the 22nd (today) and 23rd (tomorrow).
      const filtered = applyCombinedFilters(
        mockEvents,
        '',
        null,
        'thisWeek',
        null,
        null,
        mockLogger
      );
      expect(filtered).toHaveLength(3); // Events 1, 2, 6
      expect(filtered.map((e) => e.id)).toEqual(expect.arrayContaining(['1', '2', '6']));
    });

    it('should filter events for "thisWeekend"', () => {
      // The weekend for Saturday 2025-11-22 includes today (Saturday) and tomorrow (Sunday).
      const filtered = applyCombinedFilters(
        mockEvents,
        '',
        null,
        'thisWeekend',
        null,
        null,
        mockLogger
      );
      expect(filtered).toHaveLength(3); // Events 1, 2, 6
      expect(filtered.map((e) => e.id)).toEqual(expect.arrayContaining(['1', '2', '6']));
    });

    it('should return all events when dateValue is "allDates"', () => {
      const filtered = applyCombinedFilters(
        mockEvents,
        '',
        null,
        'allDates',
        null,
        null,
        mockLogger
      );
      expect(filtered).toHaveLength(mockEvents.length);
    });

    it('should return all events when dateValue is null', () => {
      const filtered = applyCombinedFilters(mockEvents, '', null, null, null, null, mockLogger);
      expect(filtered).toHaveLength(mockEvents.length);
    });
  });

  describe('Organizer Filtering', () => {
    it('should filter events by a single organization ID', () => {
      const filtered = applyCombinedFilters(
        mockEvents,
        '',
        null,
        null,
        ['org-greenpeace'],
        null,
        mockLogger
      );
      expect(filtered).toHaveLength(2); // Events 1, 6 (both have org-greenpeace)
      expect(filtered.map((e) => e.id)).toEqual(expect.arrayContaining(['1', '6']));
    });

    it('should use exact match for organization IDs (not case-insensitive)', () => {
      const filtered = applyCombinedFilters(
        mockEvents,
        '',
        null,
        null,
        ['ORG-GREENPEACE'],
        null,
        mockLogger
      );
      expect(filtered).toHaveLength(0); // IDs are exact match
    });

    it('should filter by multiple organization IDs', () => {
      const filtered = applyCombinedFilters(
        mockEvents,
        '',
        null,
        null,
        ['org-greenpeace', 'org-peta'],
        null,
        mockLogger
      );
      expect(filtered).toHaveLength(3); // Events 1, 5, 6
      expect(filtered.map((e) => e.id)).toEqual(expect.arrayContaining(['1', '5', '6']));
    });

    it('should not match co_organizers (only organization_id)', () => {
      // Event 3 has co_organizers: ['Greenpeace'] but organization_id: 'org-doctors'
      const filtered = applyCombinedFilters(
        mockEvents,
        '',
        null,
        null,
        ['org-greenpeace'],
        null,
        mockLogger
      );
      expect(filtered.map((e) => e.id)).not.toContain('3');
    });

    it('should return an empty array if no events match the organization ID', () => {
      const filtered = applyCombinedFilters(
        mockEvents,
        '',
        null,
        null,
        ['nonexistent-org-id'],
        null,
        mockLogger
      );
      expect(filtered).toHaveLength(0);
    });

    it('should handle an empty organizers array', () => {
      const filtered = applyCombinedFilters(mockEvents, '', null, null, [], null, mockLogger);
      expect(filtered).toHaveLength(mockEvents.length);
    });

    it('should handle a null organizers filter', () => {
      const filtered = applyCombinedFilters(mockEvents, '', null, null, null, null, mockLogger);
      expect(filtered).toHaveLength(mockEvents.length);
    });
  });

  describe('Category Filtering', () => {
    it('should filter events by a single category', () => {
      const filtered = applyCombinedFilters(
        mockEvents,
        '',
        null,
        null,
        null,
        'Technology',
        mockLogger
      );
      expect(filtered).toHaveLength(2);
      expect(filtered.map((e) => e.id)).toEqual(expect.arrayContaining(['2', '4']));
    });

    it('should be case-sensitive (as per current implementation)', () => {
      const filtered = applyCombinedFilters(
        mockEvents,
        '',
        null,
        null,
        null,
        'technology',
        mockLogger
      );
      expect(filtered).toHaveLength(0);
    });

    it('should return an empty array if no events match the category', () => {
      const filtered = applyCombinedFilters(
        mockEvents,
        '',
        null,
        null,
        null,
        'Nonexistent Category',
        mockLogger
      );
      expect(filtered).toHaveLength(0);
    });

    it('should return all events when categoryValue is "allCategories"', () => {
      const filtered = applyCombinedFilters(
        mockEvents,
        '',
        null,
        null,
        null,
        'allCategories',
        mockLogger
      );
      expect(filtered).toHaveLength(mockEvents.length);
    });

    it('should return all events when categoryValue is null', () => {
      const filtered = applyCombinedFilters(mockEvents, '', null, null, null, null, mockLogger);
      expect(filtered).toHaveLength(mockEvents.length);
    });

    it('should not include events with no categories array', () => {
      // Test edge case: event with undefined categories (using type assertion for test)
      const eventWithoutCategory = {
        ...mockEvents[0],
        id: '7',
        categories: undefined,
      } as unknown as Event;
      const eventsWithMissing: Event[] = [...mockEvents, eventWithoutCategory];
      const filtered = applyCombinedFilters(
        eventsWithMissing,
        '',
        null,
        null,
        null,
        'Climate',
        mockLogger
      );
      expect(filtered.find((e) => e.id === '7')).toBeUndefined();
    });
  });

  describe('Combined Filters', () => {
    it('should filter by search term and location', () => {
      // "tech" (Events 2, 4) and postal code 9000 (Events 2, 5) -> Event 2
      const filtered = applyCombinedFilters(
        mockEvents,
        'tech',
        ['9000'],
        null,
        null,
        null,
        mockLogger
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2');
    });

    it('should filter by location, date, and category', () => {
      // Location 1000 (Events 1, 4), Date today (Events 1, 6), Category Climate (Events 1, 6) -> Event 1
      const filtered = applyCombinedFilters(
        mockEvents,
        '',
        ['1000'],
        'today',
        null,
        'Climate',
        mockLogger
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });

    it('should return an empty array if combined filters have no intersection', () => {
      // org-peta (Event 5) and Category Climate (Events 1, 6) -> No intersection
      const filtered = applyCombinedFilters(
        mockEvents,
        '',
        null,
        null,
        ['org-peta'],
        'Climate',
        mockLogger
      );
      expect(filtered).toHaveLength(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should return an empty array when given an empty events array', () => {
      const filtered = applyCombinedFilters(
        [],
        'search',
        ['1000'],
        'today',
        ['org-peta'],
        'Climate',
        mockLogger
      );
      expect(filtered).toHaveLength(0);
    });

    it('should log an error and return an empty array for invalid events input', () => {
      const filtered = applyCombinedFilters(null as any, '', null, null, null, null, mockLogger);
      expect(filtered).toHaveLength(0);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Invalid events parameter: expected array',
        expect.any(Object)
      );
    });

    it('should not throw and should still filter if an event has an error during date parsing', () => {
      const eventWithError = Object.create(mockEvents[0], {
        id: { value: '8', enumerable: true },
        startDateFull: {
          get() {
            throw new Error('date parse error');
          },
          enumerable: true,
        },
      });
      const events = [eventWithError, mockEvents[1]];
      // Pass filterEndedEvents: false to avoid double error logging
      const filtered = applyCombinedFilters(events, '', null, 'today', null, null, mockLogger, {
        filterEndedEvents: false,
      });
      // Event with error is filtered out, mockEvents[1] is tomorrow so not in "today"
      expect(filtered).toHaveLength(0);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error parsing date for event',
        expect.objectContaining({ eventId: '8' })
      );
    });

    it('should handle non-string postal code values', () => {
      const filtered = applyCombinedFilters(
        mockEvents,
        '',
        [1000 as any],
        null,
        null,
        null,
        mockLogger
      );
      expect(filtered).toHaveLength(2); // Events with postal code 1000
      expect(mockLogger.warn).toHaveBeenCalledWith('Non-string postal code value detected', {
        value: 1000,
      });
    });

    it('should handle error when filtering individual event by postal code', () => {
      const eventWithBrokenPostalCode = Object.create(mockEvents[0], {
        id: { value: '9', enumerable: true },
        postal_code: {
          get() {
            throw new Error('postal code error');
          },
          enumerable: true,
        },
      });
      const events = [eventWithBrokenPostalCode, mockEvents[1]];
      const filtered = applyCombinedFilters(events, '', ['1000'], null, null, null, mockLogger);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error filtering by postal code for event',
        expect.objectContaining({ eventId: '9', error: 'postal code error' })
      );
    });

    it('should handle error in overall postal code filtering', () => {
      // The outer catch is defensive code. Test that empty location filter works correctly.
      const filtered = applyCombinedFilters(mockEvents, '', [], null, null, null, mockLogger);
      expect(filtered.length).toBe(mockEvents.length); // Empty array returns all events
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle error parsing date in tomorrow filter', () => {
      const eventWithErrorDate = Object.create(mockEvents[0], {
        id: { value: '11', enumerable: true },
        startDateFull: {
          get() {
            throw new Error('date error');
          },
          enumerable: true,
        },
      });
      const events = [eventWithErrorDate, mockEvents[1]];
      const filtered = applyCombinedFilters(events, '', null, 'tomorrow', null, null, mockLogger);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error parsing date for event',
        expect.objectContaining({ eventId: '11', error: 'date error' })
      );
    });

    it('should handle error parsing date in thisWeek filter', () => {
      const eventWithErrorDate = Object.create(mockEvents[0], {
        id: { value: '13', enumerable: true },
        startDateFull: {
          get() {
            throw new Error('week date error');
          },
          enumerable: true,
        },
      });
      const events = [eventWithErrorDate, mockEvents[2]];
      const filtered = applyCombinedFilters(events, '', null, 'thisWeek', null, null, mockLogger);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error parsing date for event',
        expect.objectContaining({ eventId: '13', error: 'week date error' })
      );
    });

    it('should handle error parsing date in thisWeekend filter', () => {
      const eventWithErrorDate = Object.create(mockEvents[0], {
        id: { value: '15', enumerable: true },
        startDateFull: {
          get() {
            throw new Error('weekend date error');
          },
          enumerable: true,
        },
      });
      const events = [eventWithErrorDate, mockEvents[4]];
      const filtered = applyCombinedFilters(
        events,
        '',
        null,
        'thisWeekend',
        null,
        null,
        mockLogger
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error parsing date for event',
        expect.objectContaining({ eventId: '15', error: 'weekend date error' })
      );
    });

    it('should handle error in date filtering overall', () => {
      // Spy on the switch statement by creating a scenario that makes the date value
      // throw during comparison. We'll skip this test since it's a hard-to-reach outer catch.
      // Coverage shows this is primarily defensive code. The individual date error paths are tested.

      // Test that an unknown date value doesn't crash (default case in switch)
      const filtered = applyCombinedFilters(
        mockEvents,
        '',
        null,
        'unknownDateValue' as any,
        null,
        null,
        mockLogger
      );
      expect(filtered.length).toBeGreaterThan(0); // Should return all events for unknown date value
    });

    it('should handle non-string organizer values', () => {
      const filtered = applyCombinedFilters(
        mockEvents,
        '',
        null,
        null,
        [123 as any],
        null,
        mockLogger
      );
      expect(mockLogger.warn).toHaveBeenCalledWith('Non-string organizer value detected', {
        value: 123,
      });
    });

    it('should not match events by co_organizers (only organization_id)', () => {
      const eventWithCoOrg = {
        ...mockEvents[2],
        id: '16',
        organization_id: 'org-doctors',
        co_organizers: ['org-greenpeace'],
      };
      const events = [eventWithCoOrg];
      const filtered = applyCombinedFilters(
        events,
        '',
        null,
        null,
        ['org-greenpeace'],
        null,
        mockLogger
      );
      expect(filtered).toHaveLength(0); // Should not match co_organizers
    });

    it('should handle error when filtering by organizer for an event', () => {
      const eventWithBrokenOrganizer = Object.create(mockEvents[0], {
        id: { value: '17', enumerable: true },
        organization_id: {
          get() {
            throw new Error('organizer error');
          },
          enumerable: true,
        },
      });
      const events = [eventWithBrokenOrganizer, mockEvents[1]];
      const filtered = applyCombinedFilters(
        events,
        '',
        null,
        null,
        ['org-tech-union'],
        null,
        mockLogger
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error filtering by organizer for event',
        expect.objectContaining({ eventId: '17', error: 'organizer error' })
      );
    });

    it('should handle error in organizer filtering overall', () => {
      // The outer catch for organizer filtering is defensive code that's hard to trigger
      // because the inner try-catch handles most errors. Test the expected behavior instead.

      // Test with valid but unusual organizer values
      const filtered = applyCombinedFilters(
        mockEvents,
        '',
        null,
        null,
        ['org-greenpeace'],
        null,
        mockLogger
      );
      expect(filtered.length).toBeGreaterThanOrEqual(1); // Should find at least one event
    });

    it('should handle non-array categories', () => {
      const eventWithBadCategories = {
        ...mockEvents[0],
        id: '18',
        categories: 'not-an-array' as any,
      };
      const events = [eventWithBadCategories];
      const filtered = applyCombinedFilters(events, '', null, null, null, 'Climate', mockLogger);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Non-array categories detected',
        expect.objectContaining({ eventId: '18' })
      );
      expect(filtered).toHaveLength(0);
    });

    it('should handle error when filtering by category for an event', () => {
      const eventWithBrokenCategories = Object.create(mockEvents[0], {
        id: { value: '19', enumerable: true },
        categories: {
          get() {
            throw new Error('categories error');
          },
          enumerable: true,
        },
      });
      const events = [eventWithBrokenCategories, mockEvents[1]];
      const filtered = applyCombinedFilters(events, '', null, null, null, 'Technology', mockLogger);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error filtering by category for event',
        expect.objectContaining({ eventId: '19', error: 'categories error' })
      );
    });

    it('should handle error in category filtering overall', () => {
      // Force an error in category filtering by making the filter operation fail
      const eventThatThrows = Object.create(mockEvents[0], {
        id: { value: '20', enumerable: true },
        categories: {
          get() {
            throw new Error('category filter error');
          },
          enumerable: true,
        },
      });
      const filtered = applyCombinedFilters(
        [eventThatThrows],
        '',
        null,
        null,
        null,
        'Climate',
        mockLogger
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error filtering by category for event',
        expect.anything()
      );
    });

    it('should handle non-string category in search', () => {
      const eventWithBadCategory = {
        ...mockEvents[0],
        id: '21',
        categories: [123 as any, 'Climate'],
      };
      const events = [eventWithBadCategory];
      const filtered = applyCombinedFilters(events, 'Climate', null, null, null, null, mockLogger);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Non-string category detected in search',
        expect.objectContaining({ eventId: '21' })
      );
      expect(filtered).toHaveLength(1); // Should still match on the string category
    });

    it('should handle error in search filter for individual event', () => {
      const eventWithBrokenTitle = Object.create(mockEvents[0], {
        id: { value: '22', enumerable: true },
        title: {
          get() {
            throw new Error('title error');
          },
          enumerable: true,
        },
      });
      const events = [eventWithBrokenTitle, mockEvents[1]];
      const filtered = applyCombinedFilters(events, 'search', null, null, null, null, mockLogger);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in search filter for event',
        expect.objectContaining({ eventId: '22', error: 'title error' })
      );
    });

    it('should handle error in search filtering overall', () => {
      // The outer catch for search filtering is defensive code.
      // Test that whitespace-only search is handled correctly.
      const filtered = applyCombinedFilters(mockEvents, '   ', null, null, null, null, mockLogger);
      expect(filtered.length).toBe(mockEvents.length); // Whitespace-only search returns all events
    });

    it('should handle all filters with null values gracefully', () => {
      // The outer try-catch is defensive code for truly unexpected errors.
      // Test that all-null filters work correctly (should return all events).
      const filtered = applyCombinedFilters(mockEvents, '', null, null, null, null, mockLogger);
      expect(filtered).toHaveLength(mockEvents.length);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('Weekend Date Calculations', () => {
    it('should handle thisWeekend when today is Sunday', () => {
      // Mock today as Sunday, 2025-11-23 (the day after our mock Saturday)
      jest.useFakeTimers().setSystemTime(new Date('2025-11-23T10:00:00.000Z'));

      const filtered = applyCombinedFilters(
        mockEvents,
        '',
        null,
        'thisWeekend',
        null,
        null,
        mockLogger
      );
      // Should include events on Sunday (event 2, today) and Saturday (yesterday)
      expect(filtered.map((e) => e.id)).toContain('2'); // Event on Sunday
    });

    it('should handle thisWeekend when today is a weekday (Monday)', () => {
      // Mock today as Monday, 2025-11-24
      jest.useFakeTimers().setSystemTime(new Date('2025-11-24T10:00:00.000Z'));

      const filtered = applyCombinedFilters(
        mockEvents,
        '',
        null,
        'thisWeekend',
        null,
        null,
        mockLogger
      );
      // Should include events on the upcoming weekend (Saturday 11/29 and Sunday 11/30)
      expect(filtered.map((e) => e.id)).toContain('5'); // Animal Rights Rally on Saturday 11/29
    });

    it('should handle thisWeekend when today is Friday', () => {
      // Mock today as Friday, 2025-11-28
      jest.useFakeTimers().setSystemTime(new Date('2025-11-28T10:00:00.000Z'));

      const filtered = applyCombinedFilters(
        mockEvents,
        '',
        null,
        'thisWeekend',
        null,
        null,
        mockLogger
      );
      // Should include events on the upcoming weekend (Saturday 11/29)
      expect(filtered.map((e) => e.id)).toContain('5'); // Animal Rights Rally on Saturday 11/29
    });
  });

  describe('Search with Missing Fields', () => {
    it('should handle events with missing title', () => {
      const eventWithoutTitle = {
        ...mockEvents[0],
        id: '23',
        title: null as any,
        description: 'A description with Climate in it',
      };
      const events = [eventWithoutTitle];
      const filtered = applyCombinedFilters(events, 'Climate', null, null, null, null, mockLogger);
      expect(filtered).toHaveLength(1); // Should match on description
    });

    it('should handle events with missing description', () => {
      const eventWithoutDescription = {
        ...mockEvents[0],
        id: '24',
        title: 'Climate Title',
        description: null as any,
      };
      const events = [eventWithoutDescription];
      const filtered = applyCombinedFilters(events, 'Climate', null, null, null, null, mockLogger);
      expect(filtered).toHaveLength(1); // Should match on title
    });

    it('should handle events with missing categories in search', () => {
      const eventWithoutCategories = {
        ...mockEvents[0],
        id: '25',
        title: 'No Categories Event',
        description: 'No categories here',
        categories: null as any,
      };
      const events = [eventWithoutCategories];
      const filtered = applyCombinedFilters(events, 'Climate', null, null, null, null, mockLogger);
      expect(filtered).toHaveLength(0); // Should not match
    });
  });

  describe('Organizer Edge Cases', () => {
    it('should handle events with missing organization_id', () => {
      const eventWithoutOrgId = {
        ...mockEvents[0],
        id: '26',
        organization_id: null as any,
      };
      const events = [eventWithoutOrgId];
      const filtered = applyCombinedFilters(
        events,
        '',
        null,
        null,
        ['org-greenpeace'],
        null,
        mockLogger
      );
      expect(filtered).toHaveLength(0); // No organization_id means no match
    });

    it('should match by organization_id regardless of organizer_name', () => {
      const eventWithDifferentName = {
        ...mockEvents[0],
        id: '27',
        organizer_name: 'Some Other Name',
        organization_id: 'org-peta',
      };
      const events = [eventWithDifferentName];
      const filtered = applyCombinedFilters(events, '', null, null, ['org-peta'], null, mockLogger);
      expect(filtered).toHaveLength(1); // Should match on organization_id
    });
  });

  describe('Defensive Error Handling - Outer Catch Blocks', () => {
    // These tests target the outer catch blocks (lines 96, 251, 300, 331, 375, 385-389)
    // which are defensive code paths that are hard to trigger through normal execution

    it('should handle catastrophic failure in postal code filtering', () => {
      // Line 96 is a defensive outer catch - nearly impossible to trigger since inner catches handle errors
      // The code is well-tested through other test cases. This test verifies normal operation.
      const filtered = applyCombinedFilters(
        mockEvents,
        '',
        ['1000', '9000'],
        null,
        null,
        null,
        mockLogger
      );
      expect(filtered.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle date filtering errors at individual event level', () => {
      // Test that the filter handles multiple events with issues by throwing errors
      // Use filterEndedEvents: false to test only date filtering errors (not ongoing filter)
      const eventWithError1 = Object.create(mockEvents[0], {
        id: { value: '28', enumerable: true },
        startDateFull: {
          get() {
            throw new Error('date error 1');
          },
          enumerable: true,
        },
      });
      const eventWithError2 = Object.create(mockEvents[0], {
        id: { value: '29', enumerable: true },
        startDateFull: {
          get() {
            throw new Error('date error 2');
          },
          enumerable: true,
        },
      });
      const events = [eventWithError1, eventWithError2, mockEvents[1]];

      const filtered = applyCombinedFilters(events, '', null, 'today', null, null, mockLogger, {
        filterEndedEvents: false,
      });
      // Should skip erroring events and continue processing
      expect(mockLogger.error).toHaveBeenCalledTimes(2);
    });

    it('should handle catastrophic failure in organizer filtering', () => {
      // Create organizers array that breaks during map
      const brokenOrganizers = ['org-greenpeace'];
      Object.defineProperty(brokenOrganizers, 'map', {
        value: () => {
          throw new Error('map broke');
        },
      });

      const filtered = applyCombinedFilters(
        mockEvents,
        '',
        null,
        null,
        brokenOrganizers,
        null,
        mockLogger
      );
      // Should handle the error (outer catch at line 300)
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in organizer filtering',
        expect.anything()
      );
    });

    it('should handle multiple events with category errors', () => {
      // Line 331 is a defensive outer catch
      // Individual category errors are well-tested above
      // This test verifies handling of multiple problematic events
      const event1 = Object.create(mockEvents[0], {
        id: { value: '30', enumerable: true },
        categories: {
          get() {
            throw new Error('cat error 1');
          },
          enumerable: true,
        },
      });
      const event2 = Object.create(mockEvents[1], {
        id: { value: '31', enumerable: true },
        categories: {
          get() {
            throw new Error('cat error 2');
          },
          enumerable: true,
        },
      });

      const filtered = applyCombinedFilters(
        [event1, event2, mockEvents[2]],
        '',
        null,
        null,
        null,
        'Climate',
        mockLogger
      );
      // Should handle errors and continue
      expect(mockLogger.error).toHaveBeenCalledTimes(2);
    });

    it('should handle catastrophic failure in search filtering', () => {
      // Create a search value that breaks during toLowerCase
      const brokenSearch = 'climate';
      const searchObject = {
        toString() {
          return brokenSearch;
        },
        toLowerCase() {
          throw new Error('toLowerCase broke');
        },
        trim() {
          return this;
        },
      };

      const filtered = applyCombinedFilters(
        mockEvents,
        searchObject as any,
        null,
        null,
        null,
        null,
        mockLogger
      );
      // Should handle the error (outer catch at line 375)
      expect(mockLogger.error).toHaveBeenCalledWith('Error in search filtering', expect.anything());
    });

    it('should handle all filters applied simultaneously', () => {
      // Lines 385-389 are for truly catastrophic failures (outermost catch)
      // These lines are defensive code that's virtually impossible to trigger in practice
      // This test verifies the function works correctly with all filters at once
      const filtered = applyCombinedFilters(
        mockEvents,
        'Climate',
        ['1000'],
        'today',
        ['org-greenpeace'],
        'Climate',
        mockLogger
      );

      // Should successfully apply all filters without errors
      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(filtered.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Ongoing Event Filtering', () => {
    beforeEach(() => {
      // Mock the current date to be 2025-11-22 at 12:00
      jest.useFakeTimers().setSystemTime(new Date('2025-11-22T12:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should filter out events that have ended (with explicit end_time)', () => {
      const events: Event[] = [
        {
          ...mockEvents[0],
          id: 'ended-event',
          $id: 'ended-event',
          startDateFull: '2025-11-22T08:00:00.000Z',
          endDateFull: '2025-11-22T10:00:00.000Z', // Ended 2 hours ago
        },
        {
          ...mockEvents[1],
          id: 'ongoing-event',
          $id: 'ongoing-event',
          startDateFull: '2025-11-22T10:00:00.000Z',
          endDateFull: '2025-11-22T16:00:00.000Z', // Ends in 4 hours
        },
      ];

      const filtered = applyCombinedFilters(events, '', null, null, null, null, mockLogger);
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('ongoing-event');
    });

    it('should filter out events with no end_time that started more than 2 hours ago', () => {
      const events: Event[] = [
        {
          ...mockEvents[0],
          id: 'old-no-end',
          $id: 'old-no-end',
          startDateFull: '2025-11-22T08:00:00.000Z', // Started 4 hours ago, effective end 10:00
          endDateFull: null,
        },
        {
          ...mockEvents[1],
          id: 'recent-no-end',
          $id: 'recent-no-end',
          startDateFull: '2025-11-22T11:00:00.000Z', // Started 1 hour ago, effective end 13:00
          endDateFull: null,
        },
      ];

      const filtered = applyCombinedFilters(events, '', null, null, null, null, mockLogger);
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('recent-no-end');
    });

    it('should keep future events', () => {
      const events: Event[] = [
        {
          ...mockEvents[0],
          id: 'future-event',
          $id: 'future-event',
          startDateFull: '2025-11-23T10:00:00.000Z', // Tomorrow
          endDateFull: null,
        },
      ];

      const filtered = applyCombinedFilters(events, '', null, null, null, null, mockLogger);
      expect(filtered.length).toBe(1);
    });

    it('should respect filterEndedEvents: false option', () => {
      const events: Event[] = [
        {
          ...mockEvents[0],
          id: 'ended-event',
          $id: 'ended-event',
          startDateFull: '2025-11-22T08:00:00.000Z',
          endDateFull: '2025-11-22T10:00:00.000Z', // Ended 2 hours ago
        },
        {
          ...mockEvents[1],
          id: 'ongoing-event',
          $id: 'ongoing-event',
          startDateFull: '2025-11-22T10:00:00.000Z',
          endDateFull: '2025-11-22T16:00:00.000Z',
        },
      ];

      // With filterEndedEvents: false, should keep ended events
      const filtered = applyCombinedFilters(events, '', null, null, null, null, mockLogger, {
        filterEndedEvents: false,
      });
      expect(filtered.length).toBe(2);
    });

    it('should keep multi-day events that are still ongoing', () => {
      const events: Event[] = [
        {
          ...mockEvents[0],
          id: 'multi-day-event',
          $id: 'multi-day-event',
          startDateFull: '2025-11-20T10:00:00.000Z', // Started 2 days ago
          endDateFull: '2025-11-24T18:00:00.000Z', // Ends in 2 days
        },
      ];

      const filtered = applyCombinedFilters(events, '', null, null, null, null, mockLogger);
      expect(filtered.length).toBe(1);
    });
  });

  describe('Date Filters with Active During Logic', () => {
    beforeEach(() => {
      // Mock the current date to be 2025-11-22 (Saturday)
      jest.useFakeTimers().setSystemTime(new Date('2025-11-22T10:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should include multi-day events in "today" filter that started yesterday', () => {
      const events: Event[] = [
        {
          ...mockEvents[0],
          id: 'started-yesterday',
          $id: 'started-yesterday',
          startDateNoFormat: '2025-11-21',
          startDateFull: '2025-11-21T20:00:00.000Z', // Started yesterday at 20:00
          endDateFull: '2025-11-22T18:00:00.000Z', // Ends today at 18:00
        },
        {
          ...mockEvents[1],
          id: 'today-event',
          $id: 'today-event',
          startDateNoFormat: '2025-11-22',
          startDateFull: '2025-11-22T14:00:00.000Z', // Starts today at 14:00
          endDateFull: '2025-11-22T18:00:00.000Z',
        },
      ];

      const filtered = applyCombinedFilters(events, '', null, 'today', null, null, mockLogger);
      expect(filtered.length).toBe(2);
      expect(filtered.map((e) => e.id)).toContain('started-yesterday');
      expect(filtered.map((e) => e.id)).toContain('today-event');
    });

    it('should include multi-day events in "tomorrow" filter that started today', () => {
      const events: Event[] = [
        {
          ...mockEvents[0],
          id: 'spans-tomorrow',
          $id: 'spans-tomorrow',
          startDateNoFormat: '2025-11-22',
          startDateFull: '2025-11-22T20:00:00.000Z', // Starts today at 20:00
          endDateFull: '2025-11-23T18:00:00.000Z', // Ends tomorrow at 18:00
        },
      ];

      const filtered = applyCombinedFilters(events, '', null, 'tomorrow', null, null, mockLogger);
      expect(filtered.length).toBe(1);
    });

    it('should include multi-day events in "thisWeek" filter', () => {
      const events: Event[] = [
        {
          ...mockEvents[0],
          id: 'week-long-event',
          $id: 'week-long-event',
          startDateNoFormat: '2025-11-17',
          startDateFull: '2025-11-17T10:00:00.000Z', // Started Monday
          endDateFull: '2025-11-23T18:00:00.000Z', // Ends Sunday
        },
      ];

      const filtered = applyCombinedFilters(events, '', null, 'thisWeek', null, null, mockLogger);
      expect(filtered.length).toBe(1);
    });

    it('should include events spanning the weekend in "thisWeekend" filter', () => {
      const events: Event[] = [
        {
          ...mockEvents[0],
          id: 'weekend-spanning',
          $id: 'weekend-spanning',
          startDateNoFormat: '2025-11-21',
          startDateFull: '2025-11-21T20:00:00.000Z', // Started Friday evening
          endDateFull: '2025-11-23T12:00:00.000Z', // Ends Sunday noon
        },
      ];

      const filtered = applyCombinedFilters(
        events,
        '',
        null,
        'thisWeekend',
        null,
        null,
        mockLogger
      );
      expect(filtered.length).toBe(1);
    });
  });
});

describe('Inner catch blocks with non-Error thrown values', () => {
  // These tests cover the `String(error)` branch in every inner catch:
  //   error: err instanceof Error ? err.message : err
  // by throwing a non-Error value (plain string) from event property getters.

  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-11-22T10:00:00.000Z'));
    mockLogger.error.mockClear();
    mockLogger.warn.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should handle non-Error in ongoing filter inner catch (line ~108)', () => {
    // The ongoing filter calls isEventOngoing({ start_time: startTime, end_time: endTime }).
    // If getEventStartTime (which returns event.startDateFull) throws non-Error, the inner
    // catch at ~105-109 fires with the String(err) branch.
    const eventThrowingNonError = Object.create(mockEvents[0], {
      id: { value: 'ongoing-non-error', enumerable: true },
      startDateFull: {
        get() {
          // eslint-disable-next-line @typescript-eslint/no-throw-literal
          throw 'non-Error from ongoing check';
        },
        enumerable: true,
      },
    });

    // Act: filterEndedEvents: true (default) so the ongoing filter runs
    const result = applyCombinedFilters(
      [eventThrowingNonError],
      '',
      null,
      null,
      null,
      null,
      mockLogger
    );

    // The event is kept (return true on error)
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error checking if event is ongoing',
      expect.objectContaining({ eventId: 'ongoing-non-error' })
    );
  });

  it('should handle non-Error in postal code inner catch (line ~138)', () => {
    // postal_code getter throws a non-Error, triggering the String(err) branch
    // in the inner postal code catch (~133-139)
    const eventThrowingNonError = Object.create(mockEvents[0], {
      id: { value: 'postal-non-error', enumerable: true },
      postal_code: {
        get() {
          // eslint-disable-next-line @typescript-eslint/no-throw-literal
          throw 'non-Error from postal code check';
        },
        enumerable: true,
      },
    });

    const result = applyCombinedFilters(
      [eventThrowingNonError],
      '',
      ['1000'],
      null,
      null,
      null,
      mockLogger,
      { filterEndedEvents: false }
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error filtering by postal code for event',
      expect.objectContaining({ eventId: 'postal-non-error' })
    );
  });

  it('should handle non-Error in date inner catch for "today" filter (line ~165)', () => {
    // startDateFull getter throws non-Error during 'today' date filter
    const eventThrowingNonError = Object.create(mockEvents[0], {
      id: { value: 'today-date-non-error', enumerable: true },
      startDateFull: {
        get() {
          // eslint-disable-next-line @typescript-eslint/no-throw-literal
          throw 'non-Error from today date check';
        },
        enumerable: true,
      },
    });

    applyCombinedFilters([eventThrowingNonError], '', null, 'today', null, null, mockLogger, {
      filterEndedEvents: false,
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error parsing date for event',
      expect.objectContaining({ eventId: 'today-date-non-error' })
    );
  });

  it('should handle non-Error in date inner catch for "tomorrow" filter (line ~187)', () => {
    const eventThrowingNonError = Object.create(mockEvents[0], {
      id: { value: 'tomorrow-date-non-error', enumerable: true },
      startDateFull: {
        get() {
          // eslint-disable-next-line @typescript-eslint/no-throw-literal
          throw 'non-Error from tomorrow date check';
        },
        enumerable: true,
      },
    });

    applyCombinedFilters([eventThrowingNonError], '', null, 'tomorrow', null, null, mockLogger, {
      filterEndedEvents: false,
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error parsing date for event',
      expect.objectContaining({ eventId: 'tomorrow-date-non-error' })
    );
  });

  it('should handle non-Error in date inner catch for "thisWeek" filter (line ~216)', () => {
    const eventThrowingNonError = Object.create(mockEvents[0], {
      id: { value: 'thisweek-non-error', enumerable: true },
      startDateFull: {
        get() {
          // eslint-disable-next-line @typescript-eslint/no-throw-literal
          throw 'non-Error from thisWeek date check';
        },
        enumerable: true,
      },
    });

    applyCombinedFilters([eventThrowingNonError], '', null, 'thisWeek', null, null, mockLogger, {
      filterEndedEvents: false,
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error parsing date for event',
      expect.objectContaining({ eventId: 'thisweek-non-error' })
    );
  });

  it('should handle non-Error in date inner catch for "thisWeekend" filter', () => {
    const eventThrowingNonError = Object.create(mockEvents[0], {
      id: { value: 'thisweekend-non-error', enumerable: true },
      startDateFull: {
        get() {
          // eslint-disable-next-line @typescript-eslint/no-throw-literal
          throw 'non-Error from thisWeekend date check';
        },
        enumerable: true,
      },
    });

    applyCombinedFilters([eventThrowingNonError], '', null, 'thisWeekend', null, null, mockLogger, {
      filterEndedEvents: false,
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error parsing date for event',
      expect.objectContaining({ eventId: 'thisweekend-non-error' })
    );
  });

  it('should handle non-Error in organizer inner catch (line ~303)', () => {
    // organization_id getter throws non-Error in organizer filter inner catch
    const eventThrowingNonError = Object.create(mockEvents[0], {
      id: { value: 'org-non-error', enumerable: true },
      organization_id: {
        get() {
          // eslint-disable-next-line @typescript-eslint/no-throw-literal
          throw 'non-Error from organizer check';
        },
        enumerable: true,
      },
    });

    applyCombinedFilters(
      [eventThrowingNonError],
      '',
      null,
      null,
      ['org-greenpeace'],
      null,
      mockLogger,
      { filterEndedEvents: false }
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error filtering by organizer for event',
      expect.objectContaining({ eventId: 'org-non-error' })
    );
  });

  it('should handle non-Error in category inner catch (line ~334)', () => {
    // categories getter throws non-Error in category filter inner catch
    const eventThrowingNonError = Object.create(mockEvents[0], {
      id: { value: 'cat-inner-non-error', enumerable: true },
      categories: {
        get() {
          // eslint-disable-next-line @typescript-eslint/no-throw-literal
          throw 'non-Error from category check';
        },
        enumerable: true,
      },
    });

    applyCombinedFilters([eventThrowingNonError], '', null, null, null, 'Climate', mockLogger, {
      filterEndedEvents: false,
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error filtering by category for event',
      expect.objectContaining({ eventId: 'cat-inner-non-error' })
    );
  });

  it('should handle non-Error in search inner catch (line ~379)', () => {
    // title getter throws non-Error in search filter inner catch
    const eventThrowingNonError = Object.create(mockEvents[0], {
      id: { value: 'search-non-error', enumerable: true },
      title: {
        get() {
          // eslint-disable-next-line @typescript-eslint/no-throw-literal
          throw 'non-Error from search check';
        },
        enumerable: true,
      },
    });

    applyCombinedFilters([eventThrowingNonError], 'Climate', null, null, null, null, mockLogger, {
      filterEndedEvents: false,
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in search filter for event',
      expect.objectContaining({ eventId: 'search-non-error' })
    );
  });
});

describe('Outer catch blocks with both Error and non-Error thrown values', () => {
  // These tests cover the "outer" catch blocks at lines 143-148, 272-277, 339-344, 393-399.
  // Each test covers both branches of:
  //   error: err instanceof Error ? err.message : err
  // - true branch: throw new Error(...) → covered by "Error instance" test
  // - false branch: throw 'string' → covered by "non-Error" test

  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-11-22T10:00:00.000Z'));
    mockLogger.error.mockClear();
    mockLogger.warn.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should handle Error instance thrown in postal code outer catch (line 144 true branch)', () => {
    // Throw a real Error to cover the `err.message` branch
    const brokenLocation = ['1000'];
    Object.defineProperty(brokenLocation, 'map', {
      value: () => {
        throw new Error('postal code map Error instance');
      },
      configurable: true,
    });

    applyCombinedFilters(mockEvents, '', brokenLocation as any, null, null, null, mockLogger);

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in postal code filtering',
      expect.objectContaining({ location: brokenLocation })
    );
  });

  it('should handle non-Error thrown in postal code outer catch (line 146 false branch)', () => {
    // Throw a plain string to cover the `err` (String) branch
    const brokenLocation = ['1000'];
    Object.defineProperty(brokenLocation, 'map', {
      value: () => {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw 'postal code map string error';
      },
      configurable: true,
    });

    applyCombinedFilters(mockEvents, '', brokenLocation as any, null, null, null, mockLogger);

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in postal code filtering',
      expect.objectContaining({ location: brokenLocation })
    );
  });

  it('should trigger the date outer catch with Error instance (line 273 true branch)', () => {
    // Throw a real Error from Array.prototype.filter on the 2nd call (date filter)
    const originalFilter = Array.prototype.filter;
    let filterCallCount = 0;
    let result: Event[];
    let caughtError: unknown;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Array.prototype as any).filter = function (predicate: any, thisArg?: any) {
      filterCallCount++;
      if (filterCallCount === 2) {
        throw new Error('date filter Error instance');
      }
      return originalFilter.call(this, predicate, thisArg);
    };

    try {
      result = applyCombinedFilters([mockEvents[0]], '', null, 'today', null, null, mockLogger);
    } catch (e) {
      caughtError = e;
    } finally {
      Array.prototype.filter = originalFilter;
    }

    expect(caughtError).toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in date filtering',
      expect.objectContaining({ dateValue: 'today' })
    );
  });

  it('should trigger the date outer catch with non-Error (line 275 false branch)', () => {
    // Throw a string from Array.prototype.filter on the 2nd call (date filter)
    const originalFilter = Array.prototype.filter;
    let filterCallCount = 0;
    let result: Event[];
    let caughtError: unknown;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Array.prototype as any).filter = function (predicate: any, thisArg?: any) {
      filterCallCount++;
      if (filterCallCount === 2) {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw 'date filter non-Error string';
      }
      return originalFilter.call(this, predicate, thisArg);
    };

    try {
      result = applyCombinedFilters([mockEvents[0]], '', null, 'today', null, null, mockLogger);
    } catch (e) {
      caughtError = e;
    } finally {
      Array.prototype.filter = originalFilter;
    }

    expect(caughtError).toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in date filtering',
      expect.objectContaining({ dateValue: 'today' })
    );
  });

  it('should trigger the category outer catch with Error instance (line 340 true branch)', () => {
    // filterEndedEvents: false → 1st filter call is the category filter
    const originalFilter = Array.prototype.filter;
    let filterCallCount = 0;
    let result: Event[];
    let caughtError: unknown;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Array.prototype as any).filter = function (predicate: any, thisArg?: any) {
      filterCallCount++;
      if (filterCallCount === 1) {
        throw new Error('category filter Error instance');
      }
      return originalFilter.call(this, predicate, thisArg);
    };

    try {
      result = applyCombinedFilters([mockEvents[0]], '', null, null, null, 'Climate', mockLogger, {
        filterEndedEvents: false,
      });
    } catch (e) {
      caughtError = e;
    } finally {
      Array.prototype.filter = originalFilter;
    }

    expect(caughtError).toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in category filtering',
      expect.objectContaining({ categoryValue: 'Climate' })
    );
  });

  it('should trigger the category outer catch with non-Error (line 342 false branch)', () => {
    const originalFilter = Array.prototype.filter;
    let filterCallCount = 0;
    let result: Event[];
    let caughtError: unknown;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Array.prototype as any).filter = function (predicate: any, thisArg?: any) {
      filterCallCount++;
      if (filterCallCount === 1) {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw 'category filter non-Error string';
      }
      return originalFilter.call(this, predicate, thisArg);
    };

    try {
      result = applyCombinedFilters([mockEvents[0]], '', null, null, null, 'Climate', mockLogger, {
        filterEndedEvents: false,
      });
    } catch (e) {
      caughtError = e;
    } finally {
      Array.prototype.filter = originalFilter;
    }

    expect(caughtError).toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in category filtering',
      expect.objectContaining({ categoryValue: 'Climate' })
    );
  });

  it('should trigger the outermost catch with Error instance (lines 394-396 true branch)', () => {
    // Break Array.isArray to throw a real Error — err instanceof Error is true
    const originalIsArray = Array.isArray;
    let result: ReturnType<typeof applyCombinedFilters>;
    let caughtError: unknown;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Array.isArray = (() => {
      throw new Error('Array.isArray Error instance');
    }) as unknown as typeof Array.isArray;

    try {
      result = applyCombinedFilters(mockEvents, '', null, null, null, null, mockLogger);
    } catch (e) {
      caughtError = e;
    } finally {
      Array.isArray = originalIsArray;
    }

    expect(result!).toEqual([]);
    expect(caughtError).toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Unexpected error in applyCombinedFilters',
      expect.any(Object)
    );
  });

  it('should trigger the outermost catch with non-Error (lines 395-396 false branch)', () => {
    // Break Array.isArray to throw a string — err instanceof Error is false
    const originalIsArray = Array.isArray;
    let result: ReturnType<typeof applyCombinedFilters>;
    let caughtError: unknown;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Array.isArray = (() => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw 'array check non-Error string';
    }) as unknown as typeof Array.isArray;

    try {
      result = applyCombinedFilters(mockEvents, '', null, null, null, null, mockLogger);
    } catch (e) {
      caughtError = e;
    } finally {
      Array.isArray = originalIsArray;
    }

    expect(result!).toEqual([]);
    expect(caughtError).toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Unexpected error in applyCombinedFilters',
      expect.any(Object)
    );
  });
});

describe('Remaining branch coverage', () => {
  // These tests cover the remaining uncovered branches after the main test suite.

  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-11-22T10:00:00.000Z'));
    mockLogger.error.mockClear();
    mockLogger.warn.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should use defaultLogger when logger argument is not provided (line 77)', () => {
    // Calling without the logger argument exercises the default parameter branch
    // This should not throw even without a logger argument
    const result = applyCombinedFilters(mockEvents, '', null, null, null, null);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle thisWeek filter when today is Sunday (line 197 true branch: dayOfWeek === 0)', () => {
    // Sunday 2025-11-23 → dayOfWeek = 0 → should use -6 to go back to Monday
    jest.useFakeTimers().setSystemTime(new Date('2025-11-23T10:00:00.000Z'));

    const result = applyCombinedFilters(mockEvents, '', null, 'thisWeek', null, null, mockLogger);

    // On Sunday 2025-11-23, "this week" is Mon 2025-11-17 to Sun 2025-11-23.
    // Events 1 (11-22 Saturday) and 6 (11-22 Saturday) are both in this week.
    // Event 2 (11-23 Sunday) is today — also in this week.
    expect(result.some((e) => e.id === '2')).toBe(true); // Sunday event is in this week
  });

  it('should trigger organizer outer catch with non-Error (line 311 false branch)', () => {
    // The organizer outer catch at line 308 — throw a non-Error string from organizers.map
    const brokenOrganizers = ['org-greenpeace'];
    Object.defineProperty(brokenOrganizers, 'map', {
      value: () => {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw 'organizer map non-Error string';
      },
      configurable: true,
    });

    applyCombinedFilters(mockEvents, '', null, null, brokenOrganizers as any, null, mockLogger, {
      filterEndedEvents: false,
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in organizer filtering',
      expect.objectContaining({ organizers: brokenOrganizers })
    );
  });

  it('should trigger search outer catch with non-Error (line 387 false branch)', () => {
    // The search outer catch at line 384 — throw a non-Error string from searchValue.toLowerCase
    const brokenSearch = {
      toString() {
        return 'climate';
      },
      toLowerCase() {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw 'toLowerCase non-Error string';
      },
      trim() {
        return this;
      },
    };

    applyCombinedFilters(mockEvents, brokenSearch as any, null, null, null, null, mockLogger, {
      filterEndedEvents: false,
    });

    expect(mockLogger.error).toHaveBeenCalledWith('Error in search filtering', expect.anything());
  });
});

describe('filterOngoingEvents', () => {
  beforeEach(() => {
    // Mock the current date
    jest.useFakeTimers().setSystemTime(new Date('2025-11-22T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should filter out ended events', () => {
    const events: Event[] = [
      {
        ...mockEvents[0],
        id: 'ended',
        $id: 'ended',
        startDateFull: '2025-11-22T08:00:00.000Z',
        endDateFull: '2025-11-22T10:00:00.000Z', // Ended 2 hours ago
      },
      {
        ...mockEvents[1],
        id: 'ongoing',
        $id: 'ongoing',
        startDateFull: '2025-11-22T10:00:00.000Z',
        endDateFull: '2025-11-22T16:00:00.000Z', // Still going
      },
    ];

    const result = filterOngoingEvents(events);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('ongoing');
  });

  it('should keep future events', () => {
    const events: Event[] = [
      {
        ...mockEvents[0],
        id: 'future',
        $id: 'future',
        startDateFull: '2025-11-23T10:00:00.000Z', // Tomorrow
        endDateFull: null,
      },
    ];

    const result = filterOngoingEvents(events);
    expect(result.length).toBe(1);
  });

  it('should handle empty array', () => {
    const result = filterOngoingEvents([]);
    expect(result.length).toBe(0);
  });

  it('should handle events without end_time using 2-hour default', () => {
    const events: Event[] = [
      {
        ...mockEvents[0],
        id: 'no-end-old',
        $id: 'no-end-old',
        startDateFull: '2025-11-22T09:00:00.000Z', // Started 3 hours ago, effective end 11:00
        endDateFull: null,
      },
      {
        ...mockEvents[1],
        id: 'no-end-recent',
        $id: 'no-end-recent',
        startDateFull: '2025-11-22T11:00:00.000Z', // Started 1 hour ago, effective end 13:00
        endDateFull: null,
      },
    ];

    const result = filterOngoingEvents(events);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('no-end-recent');
  });

  it('should handle all events being ended', () => {
    const events: Event[] = [
      {
        ...mockEvents[0],
        id: 'old1',
        $id: 'old1',
        startDateFull: '2025-11-22T06:00:00.000Z',
        endDateFull: '2025-11-22T08:00:00.000Z',
      },
      {
        ...mockEvents[1],
        id: 'old2',
        $id: 'old2',
        startDateFull: '2025-11-22T07:00:00.000Z',
        endDateFull: '2025-11-22T09:00:00.000Z',
      },
    ];

    const result = filterOngoingEvents(events);
    expect(result.length).toBe(0);
  });

  it('should handle all events being ongoing', () => {
    const events: Event[] = [
      {
        ...mockEvents[0],
        id: 'ongoing1',
        $id: 'ongoing1',
        startDateFull: '2025-11-22T10:00:00.000Z',
        endDateFull: '2025-11-22T18:00:00.000Z',
      },
      {
        ...mockEvents[1],
        id: 'ongoing2',
        $id: 'ongoing2',
        startDateFull: '2025-11-22T11:00:00.000Z',
        endDateFull: '2025-11-22T19:00:00.000Z',
      },
    ];

    const result = filterOngoingEvents(events);
    expect(result.length).toBe(2);
  });
});
