import { extractTemplateData, formatPastEventDate } from '../templateUtils';
import { Event } from '@/types/event.types';
import { TemplateEventData } from '@/types/template.types';

describe('templateUtils', () => {
  describe('extractTemplateData', () => {
    describe('Happy path - complete event extraction', () => {
      it('should extract all included fields from a complete event', () => {
        const completeEvent: Event = {
          $id: 'event123',
          $createdAt: '2025-01-01T00:00:00Z',
          $updatedAt: '2025-01-02T00:00:00Z',
          id: 'event123',
          title: 'Climate Strike',
          description: 'Join us for climate action',
          image: 'https://example.com/image.jpg',
          street_address: '123 Main St',
          city: 'Brussels',
          region: 'Brussels-Capital',
          country: 'Belgium',
          postal_code: 1000,
          geocod_status: 'success',
          geocod_lat: 50.8503,
          geocod_lng: 4.3517,
          start_time: '2025-07-14T14:00:00Z',
          end_time: '2025-07-14T18:00:00Z',
          organizer_id: 'org123',
          organizer_name: 'John Doe',
          co_organizers: ['Jane Smith', 'Bob Johnson'],
          website_url: 'https://example.com',
          categories: ['climate', 'environment'],
          disclaimer: 'Please be respectful',
          help_needed: true,
          help_description: 'Need volunteers for setup',
          view_count: 150,
        };

        const result = extractTemplateData(completeEvent);

        // Included fields
        expect(result.title).toBe('Climate Strike');
        expect(result.description).toBe('Join us for climate action');
        expect(result.street_address).toBe('123 Main St');
        expect(result.city).toBe('Brussels');
        expect(result.region).toBe('Brussels-Capital');
        expect(result.country).toBe('Belgium');
        expect(result.postal_code).toBe(1000);
        expect(result.website_url).toBe('https://example.com');
        expect(result.categories).toEqual(['climate', 'environment']);
        expect(result.disclaimer).toBe('Please be respectful');
        expect(result.co_organizers).toEqual(['Jane Smith', 'Bob Johnson']);
        expect(result.help_needed).toBe(true);
        expect(result.help_description).toBe('Need volunteers for setup');

        // Excluded fields should not exist
        expect(result).not.toHaveProperty('$id');
        expect(result).not.toHaveProperty('$createdAt');
        expect(result).not.toHaveProperty('$updatedAt');
        expect(result).not.toHaveProperty('id');
        expect(result).not.toHaveProperty('image');
        expect(result).not.toHaveProperty('start_time');
        expect(result).not.toHaveProperty('end_time');
        expect(result).not.toHaveProperty('organizer_id');
        expect(result).not.toHaveProperty('organizer_name');
        expect(result).not.toHaveProperty('view_count');
        expect(result).not.toHaveProperty('geocod_status');
        expect(result).not.toHaveProperty('geocod_lat');
        expect(result).not.toHaveProperty('geocod_lng');
      });
    });

    describe('Minimal event - only required fields', () => {
      it('should extract only provided fields from a minimal event', () => {
        const minimalEvent: Event = {
          $id: 'event123',
          id: 'event123',
          title: 'Minimal Event',
          description: 'Basic description',
          start_time: '2025-07-14T14:00:00Z',
          country: 'Belgium',
          organizer_name: 'Organizer',
        };

        const result = extractTemplateData(minimalEvent);

        expect(result.title).toBe('Minimal Event');
        expect(result.description).toBe('Basic description');
        expect(result.country).toBe('Belgium');

        // Optional fields should not exist
        expect(result).not.toHaveProperty('street_address');
        expect(result).not.toHaveProperty('city');
        expect(result).not.toHaveProperty('region');
        expect(result).not.toHaveProperty('postal_code');
        expect(result).not.toHaveProperty('website_url');
        expect(result).not.toHaveProperty('categories');
        expect(result).not.toHaveProperty('disclaimer');
        expect(result).not.toHaveProperty('co_organizers');
        expect(result).not.toHaveProperty('help_needed');
        expect(result).not.toHaveProperty('help_description');
      });
    });

    describe('Null and undefined field handling', () => {
      it('should exclude fields that are null', () => {
        const eventWithNulls: Event = {
          $id: 'event123',
          id: 'event123',
          title: 'Test Event',
          description: 'Description',
          start_time: '2025-07-14T14:00:00Z',
          country: 'Belgium',
          organizer_name: 'Organizer',
          street_address: null,
          city: null,
          region: null,
          postal_code: null,
          website_url: null,
          disclaimer: null,
          geocod_status: null,
          geocod_lat: null,
          geocod_lng: null,
        };

        const result = extractTemplateData(eventWithNulls);

        expect(result.title).toBe('Test Event');
        expect(result.description).toBe('Description');
        expect(result.country).toBe('Belgium');

        // Null fields should not be included
        expect(result).not.toHaveProperty('street_address');
        expect(result).not.toHaveProperty('city');
        expect(result).not.toHaveProperty('region');
        expect(result).not.toHaveProperty('postal_code');
        expect(result).not.toHaveProperty('website_url');
        expect(result).not.toHaveProperty('disclaimer');
      });

      it('should exclude fields that are undefined', () => {
        const eventWithUndefined: Event = {
          $id: 'event123',
          id: 'event123',
          title: 'Test Event',
          description: 'Description',
          start_time: '2025-07-14T14:00:00Z',
          country: 'Belgium',
          organizer_name: 'Organizer',
          street_address: undefined,
          city: undefined,
          region: undefined,
          postal_code: undefined,
          website_url: undefined,
          categories: undefined,
          disclaimer: undefined,
          co_organizers: undefined,
          help_needed: undefined,
          help_description: undefined,
        };

        const result = extractTemplateData(eventWithUndefined);

        expect(result.title).toBe('Test Event');
        expect(result).not.toHaveProperty('street_address');
        expect(result).not.toHaveProperty('city');
        expect(result).not.toHaveProperty('categories');
        expect(result).not.toHaveProperty('co_organizers');
        expect(result).not.toHaveProperty('help_needed');
      });
    });

    describe('Empty string and empty array handling', () => {
      it('should exclude fields that are empty strings', () => {
        const eventWithEmptyStrings: Event = {
          $id: 'event123',
          id: 'event123',
          title: '',
          description: '',
          start_time: '2025-07-14T14:00:00Z',
          country: 'Belgium',
          organizer_name: 'Organizer',
          street_address: '',
          city: '',
          region: '',
          website_url: '',
          disclaimer: '',
          help_description: '',
        };

        const result = extractTemplateData(eventWithEmptyStrings);

        // Empty strings are falsy, so they should not be included
        expect(result).not.toHaveProperty('title');
        expect(result).not.toHaveProperty('description');
        expect(result).not.toHaveProperty('street_address');
        expect(result).not.toHaveProperty('city');
        expect(result).not.toHaveProperty('region');
        expect(result).not.toHaveProperty('website_url');
        expect(result).not.toHaveProperty('disclaimer');
        expect(result).not.toHaveProperty('help_description');
      });

      it('should exclude empty arrays', () => {
        const eventWithEmptyArrays: Event = {
          $id: 'event123',
          id: 'event123',
          title: 'Test Event',
          description: 'Description',
          start_time: '2025-07-14T14:00:00Z',
          country: 'Belgium',
          organizer_name: 'Organizer',
          categories: [],
          co_organizers: [],
        };

        const result = extractTemplateData(eventWithEmptyArrays);

        expect(result.title).toBe('Test Event');
        // Empty arrays have length 0, which is falsy
        expect(result).not.toHaveProperty('categories');
        expect(result).not.toHaveProperty('co_organizers');
      });

      it('should include non-empty arrays', () => {
        const eventWithArrays: Event = {
          $id: 'event123',
          id: 'event123',
          title: 'Test Event',
          description: 'Description',
          start_time: '2025-07-14T14:00:00Z',
          country: 'Belgium',
          organizer_name: 'Organizer',
          categories: ['climate'],
          co_organizers: ['Co-Organizer 1'],
        };

        const result = extractTemplateData(eventWithArrays);

        expect(result.categories).toEqual(['climate']);
        expect(result.co_organizers).toEqual(['Co-Organizer 1']);
      });
    });

    describe('help_needed conditional logic', () => {
      it('should include help_description when help_needed is true', () => {
        const eventWithHelp: Event = {
          $id: 'event123',
          id: 'event123',
          title: 'Test Event',
          description: 'Description',
          start_time: '2025-07-14T14:00:00Z',
          country: 'Belgium',
          organizer_name: 'Organizer',
          help_needed: true,
          help_description: 'Need volunteers',
        };

        const result = extractTemplateData(eventWithHelp);

        expect(result.help_needed).toBe(true);
        expect(result.help_description).toBe('Need volunteers');
      });

      it('should not include help_description when help_needed is false', () => {
        const eventNoHelp: Event = {
          $id: 'event123',
          id: 'event123',
          title: 'Test Event',
          description: 'Description',
          start_time: '2025-07-14T14:00:00Z',
          country: 'Belgium',
          organizer_name: 'Organizer',
          help_needed: false,
          help_description: 'This should not be included',
        };

        const result = extractTemplateData(eventNoHelp);

        expect(result).not.toHaveProperty('help_needed');
        expect(result).not.toHaveProperty('help_description');
      });

      it('should not include help_description when help_needed is undefined', () => {
        const eventHelpUndefined: Event = {
          $id: 'event123',
          id: 'event123',
          title: 'Test Event',
          description: 'Description',
          start_time: '2025-07-14T14:00:00Z',
          country: 'Belgium',
          organizer_name: 'Organizer',
          help_needed: undefined,
          help_description: 'This should not be included',
        };

        const result = extractTemplateData(eventHelpUndefined);

        expect(result).not.toHaveProperty('help_needed');
        expect(result).not.toHaveProperty('help_description');
      });

      it('should include help_needed without help_description when description is empty', () => {
        const eventHelpNoDesc: Event = {
          $id: 'event123',
          id: 'event123',
          title: 'Test Event',
          description: 'Description',
          start_time: '2025-07-14T14:00:00Z',
          country: 'Belgium',
          organizer_name: 'Organizer',
          help_needed: true,
          help_description: '',
        };

        const result = extractTemplateData(eventHelpNoDesc);

        expect(result.help_needed).toBe(true);
        expect(result).not.toHaveProperty('help_description');
      });
    });

    describe('Special characters and edge cases', () => {
      it('should preserve special characters in strings', () => {
        const eventWithSpecialChars: Event = {
          $id: 'event123',
          id: 'event123',
          title: 'Event with "quotes" & <tags>',
          description: 'Description with\nnewlines\tand\ttabs',
          start_time: '2025-07-14T14:00:00Z',
          country: 'Belgium',
          organizer_name: 'Organizer',
          street_address: '123 Main St. #4A',
          disclaimer: 'Emoji test 🌍🔥',
        };

        const result = extractTemplateData(eventWithSpecialChars);

        expect(result.title).toBe('Event with "quotes" & <tags>');
        expect(result.description).toBe('Description with\nnewlines\tand\ttabs');
        expect(result.street_address).toBe('123 Main St. #4A');
        expect(result.disclaimer).toBe('Emoji test 🌍🔥');
      });

      it('should handle very long strings', () => {
        const longString = 'a'.repeat(10000);
        const eventWithLongStrings: Event = {
          $id: 'event123',
          id: 'event123',
          title: longString,
          description: longString,
          start_time: '2025-07-14T14:00:00Z',
          country: 'Belgium',
          organizer_name: 'Organizer',
        };

        const result = extractTemplateData(eventWithLongStrings);

        expect(result.title).toBe(longString);
        expect(result.description).toBe(longString);
        expect(result.title?.length).toBe(10000);
      });

      it('should handle postal_code with value 0', () => {
        // Edge case: postal code 0 is falsy but might be valid
        const eventWithZeroPostal: Event = {
          $id: 'event123',
          id: 'event123',
          title: 'Test Event',
          description: 'Description',
          start_time: '2025-07-14T14:00:00Z',
          country: 'Belgium',
          organizer_name: 'Organizer',
          postal_code: 0,
        };

        const result = extractTemplateData(eventWithZeroPostal);

        // 0 is falsy, so it won't be included per current implementation
        expect(result).not.toHaveProperty('postal_code');
      });

      it('should handle valid postal codes', () => {
        const eventWithPostalCode: Event = {
          $id: 'event123',
          id: 'event123',
          title: 'Test Event',
          description: 'Description',
          start_time: '2025-07-14T14:00:00Z',
          country: 'Belgium',
          organizer_name: 'Organizer',
          postal_code: 1000,
        };

        const result = extractTemplateData(eventWithPostalCode);

        expect(result.postal_code).toBe(1000);
      });

      it('should handle arrays with single item', () => {
        const eventWithSingleItems: Event = {
          $id: 'event123',
          id: 'event123',
          title: 'Test Event',
          description: 'Description',
          start_time: '2025-07-14T14:00:00Z',
          country: 'Belgium',
          organizer_name: 'Organizer',
          categories: ['climate'],
          co_organizers: ['Jane Doe'],
        };

        const result = extractTemplateData(eventWithSingleItems);

        expect(result.categories).toEqual(['climate']);
        expect(result.co_organizers).toEqual(['Jane Doe']);
      });

      it('should handle arrays with many items', () => {
        const manyCategories = Array.from({ length: 100 }, (_, i) => `category${i}`);
        const manyCoOrganizers = Array.from({ length: 50 }, (_, i) => `organizer${i}`);

        const eventWithManyItems: Event = {
          $id: 'event123',
          id: 'event123',
          title: 'Test Event',
          description: 'Description',
          start_time: '2025-07-14T14:00:00Z',
          country: 'Belgium',
          organizer_name: 'Organizer',
          categories: manyCategories,
          co_organizers: manyCoOrganizers,
        };

        const result = extractTemplateData(eventWithManyItems);

        expect(result.categories).toEqual(manyCategories);
        expect(result.co_organizers).toEqual(manyCoOrganizers);
        expect(result.categories?.length).toBe(100);
        expect(result.co_organizers?.length).toBe(50);
      });
    });

    describe('Return type and structure', () => {
      it('should return a TemplateEventData object', () => {
        const event: Event = {
          $id: 'event123',
          id: 'event123',
          title: 'Test Event',
          description: 'Description',
          start_time: '2025-07-14T14:00:00Z',
          country: 'Belgium',
          organizer_name: 'Organizer',
        };

        const result: TemplateEventData = extractTemplateData(event);

        expect(typeof result).toBe('object');
        expect(result).not.toBeNull();
      });

      it('should return an empty object when no extractable fields are present', () => {
        const minimalEvent: Event = {
          $id: 'event123',
          id: 'event123',
          title: '',
          description: '',
          start_time: '2025-07-14T14:00:00Z',
          country: '',
          organizer_name: 'Organizer',
        };

        const result = extractTemplateData(minimalEvent);

        expect(result).toEqual({});
        expect(Object.keys(result).length).toBe(0);
      });
    });

    describe('URL validation', () => {
      it('should preserve valid URLs', () => {
        const eventWithURLs: Event = {
          $id: 'event123',
          id: 'event123',
          title: 'Test Event',
          description: 'Description',
          start_time: '2025-07-14T14:00:00Z',
          country: 'Belgium',
          organizer_name: 'Organizer',
          website_url: 'https://example.com/path?query=value#anchor',
        };

        const result = extractTemplateData(eventWithURLs);

        expect(result.website_url).toBe('https://example.com/path?query=value#anchor');
      });

      it('should preserve URLs with special characters', () => {
        const eventWithEncodedURL: Event = {
          $id: 'event123',
          id: 'event123',
          title: 'Test Event',
          description: 'Description',
          start_time: '2025-07-14T14:00:00Z',
          country: 'Belgium',
          organizer_name: 'Organizer',
          website_url: 'https://example.com/path?name=John%20Doe&tag=climate%20action',
        };

        const result = extractTemplateData(eventWithEncodedURL);

        expect(result.website_url).toBe(
          'https://example.com/path?name=John%20Doe&tag=climate%20action'
        );
      });
    });

    describe('Categories edge cases', () => {
      it('should preserve categories with special characters', () => {
        const eventWithSpecialCategories: Event = {
          $id: 'event123',
          id: 'event123',
          title: 'Test Event',
          description: 'Description',
          start_time: '2025-07-14T14:00:00Z',
          country: 'Belgium',
          organizer_name: 'Organizer',
          categories: ['climate-action', 'social_justice', 'LGBTQ+'],
        };

        const result = extractTemplateData(eventWithSpecialCategories);

        expect(result.categories).toEqual(['climate-action', 'social_justice', 'LGBTQ+']);
      });

      it('should preserve categories with mixed case', () => {
        const eventWithMixedCaseCategories: Event = {
          $id: 'event123',
          id: 'event123',
          title: 'Test Event',
          description: 'Description',
          start_time: '2025-07-14T14:00:00Z',
          country: 'Belgium',
          organizer_name: 'Organizer',
          categories: ['Climate', 'ENVIRONMENT', 'social-JUSTICE'],
        };

        const result = extractTemplateData(eventWithMixedCaseCategories);

        expect(result.categories).toEqual(['Climate', 'ENVIRONMENT', 'social-JUSTICE']);
      });
    });
  });

  describe('formatPastEventDate', () => {
    describe('Valid ISO date formatting', () => {
      it('should format ISO date string with Z suffix correctly', () => {
        const result = formatPastEventDate('2025-10-26T14:00:00Z');

        expect(result).toBe('Oct 26, 2025');
      });

      it('should format ISO date string with milliseconds and Z suffix', () => {
        const result = formatPastEventDate('2025-10-26T14:30:45.123Z');

        expect(result).toBe('Oct 26, 2025');
      });

      it('should format ISO date string without Z suffix', () => {
        const result = formatPastEventDate('2025-10-26T14:00:00');

        expect(result).toBe('Oct 26, 2025');
      });

      it('should format ISO date string with positive timezone offset', () => {
        const result = formatPastEventDate('2025-10-26T15:00:00+01:00');

        expect(result).toBe('Oct 26, 2025');
      });

      it('should format ISO date string with negative timezone offset', () => {
        const result = formatPastEventDate('2025-10-26T09:00:00-05:00');

        expect(result).toBe('Oct 26, 2025');
      });
    });

    describe('Different months', () => {
      it('should format January correctly', () => {
        const result = formatPastEventDate('2025-01-15T10:00:00Z');
        expect(result).toBe('Jan 15, 2025');
      });

      it('should format February correctly', () => {
        const result = formatPastEventDate('2025-02-20T10:00:00Z');
        expect(result).toBe('Feb 20, 2025');
      });

      it('should format March correctly', () => {
        const result = formatPastEventDate('2025-03-10T10:00:00Z');
        expect(result).toBe('Mar 10, 2025');
      });

      it('should format April correctly', () => {
        const result = formatPastEventDate('2025-04-05T10:00:00Z');
        expect(result).toBe('Apr 5, 2025');
      });

      it('should format May correctly', () => {
        const result = formatPastEventDate('2025-05-01T10:00:00Z');
        expect(result).toBe('May 1, 2025');
      });

      it('should format June correctly', () => {
        const result = formatPastEventDate('2025-06-30T10:00:00Z');
        expect(result).toBe('Jun 30, 2025');
      });

      it('should format July correctly', () => {
        const result = formatPastEventDate('2025-07-14T10:00:00Z');
        expect(result).toBe('Jul 14, 2025');
      });

      it('should format August correctly', () => {
        const result = formatPastEventDate('2025-08-22T10:00:00Z');
        expect(result).toBe('Aug 22, 2025');
      });

      it('should format September correctly', () => {
        const result = formatPastEventDate('2025-09-11T10:00:00Z');
        expect(result).toBe('Sep 11, 2025');
      });

      it('should format October correctly', () => {
        const result = formatPastEventDate('2025-10-31T10:00:00Z');
        expect(result).toBe('Oct 31, 2025');
      });

      it('should format November correctly', () => {
        const result = formatPastEventDate('2025-11-11T10:00:00Z');
        expect(result).toBe('Nov 11, 2025');
      });

      it('should format December correctly', () => {
        const result = formatPastEventDate('2025-12-25T10:00:00Z');
        expect(result).toBe('Dec 25, 2025');
      });
    });

    describe('Different day values', () => {
      it('should format single-digit days correctly', () => {
        const result1 = formatPastEventDate('2025-01-01T10:00:00Z');
        const result2 = formatPastEventDate('2025-01-05T10:00:00Z');
        const result3 = formatPastEventDate('2025-01-09T10:00:00Z');

        expect(result1).toBe('Jan 1, 2025');
        expect(result2).toBe('Jan 5, 2025');
        expect(result3).toBe('Jan 9, 2025');
      });

      it('should format double-digit days correctly', () => {
        const result1 = formatPastEventDate('2025-01-10T10:00:00Z');
        const result2 = formatPastEventDate('2025-01-20T10:00:00Z');
        const result3 = formatPastEventDate('2025-01-31T10:00:00Z');

        expect(result1).toBe('Jan 10, 2025');
        expect(result2).toBe('Jan 20, 2025');
        expect(result3).toBe('Jan 31, 2025');
      });
    });

    describe('Different years', () => {
      it('should format different years correctly', () => {
        const result2023 = formatPastEventDate('2023-06-15T10:00:00Z');
        const result2024 = formatPastEventDate('2024-06-15T10:00:00Z');
        const result2025 = formatPastEventDate('2025-06-15T10:00:00Z');
        const result2026 = formatPastEventDate('2026-06-15T10:00:00Z');

        expect(result2023).toBe('Jun 15, 2023');
        expect(result2024).toBe('Jun 15, 2024');
        expect(result2025).toBe('Jun 15, 2025');
        expect(result2026).toBe('Jun 15, 2026');
      });
    });

    describe('Edge cases - month boundaries', () => {
      it('should handle last day of month at midday', () => {
        // Using midday times to avoid timezone conversion issues
        const jan31 = formatPastEventDate('2025-01-31T12:00:00Z');
        const feb28 = formatPastEventDate('2025-02-28T12:00:00Z');
        const apr30 = formatPastEventDate('2025-04-30T12:00:00Z');

        expect(jan31).toBe('Jan 31, 2025');
        expect(feb28).toBe('Feb 28, 2025');
        expect(apr30).toBe('Apr 30, 2025');
      });

      it('should handle first day of month', () => {
        const jan1 = formatPastEventDate('2025-01-01T00:00:00Z');
        const jul1 = formatPastEventDate('2025-07-01T00:00:00Z');
        const dec1 = formatPastEventDate('2025-12-01T00:00:00Z');

        expect(jan1).toBe('Jan 1, 2025');
        expect(jul1).toBe('Jul 1, 2025');
        expect(dec1).toBe('Dec 1, 2025');
      });
    });

    describe('Edge cases - year boundaries', () => {
      it('should handle New Year transition', () => {
        // Using midday to avoid timezone conversion issues
        const newYearEve = formatPastEventDate('2024-12-31T12:00:00Z');
        const newYearDay = formatPastEventDate('2025-01-01T00:00:00Z');

        expect(newYearEve).toBe('Dec 31, 2024');
        expect(newYearDay).toBe('Jan 1, 2025');
      });
    });

    describe('Leap year handling', () => {
      it('should handle leap year February 29th', () => {
        const leapDay = formatPastEventDate('2024-02-29T10:00:00Z');
        expect(leapDay).toBe('Feb 29, 2024');
      });

      it('should handle non-leap year February 28th', () => {
        const nonLeapFeb = formatPastEventDate('2025-02-28T10:00:00Z');
        expect(nonLeapFeb).toBe('Feb 28, 2025');
      });
    });

    describe('Different time values', () => {
      it('should format dates with different times but same day correctly', () => {
        const midnight = formatPastEventDate('2025-07-14T00:00:00Z');
        const noon = formatPastEventDate('2025-07-14T12:00:00Z');
        const afternoon = formatPastEventDate('2025-07-14T18:00:00Z');

        // All should show the same date regardless of time
        // Note: midnight UTC may show as the previous day in timezones behind UTC,
        // or the same day in timezones ahead of UTC
        expect(midnight).toMatch(/Jul (13|14), 2025/);
        expect(noon).toBe('Jul 14, 2025');
        expect(afternoon).toBe('Jul 14, 2025');
      });
    });

    describe('Invalid date handling', () => {
      it('should handle invalid date strings gracefully', () => {
        const result = formatPastEventDate('invalid-date');

        // Invalid dates will be parsed to Invalid Date, which toString as "Invalid Date"
        expect(result).toContain('Invalid Date');
      });

      it('should handle malformed ISO strings', () => {
        const result1 = formatPastEventDate('2025-13-01T10:00:00Z'); // Invalid month
        const result2 = formatPastEventDate('2025-02-30T10:00:00Z'); // Invalid day for February
        const result3 = formatPastEventDate('2025/10/26'); // Wrong separator

        // These may parse to valid dates or Invalid Date depending on JS engine
        // Just verify they don't throw errors
        expect(typeof result1).toBe('string');
        expect(typeof result2).toBe('string');
        expect(typeof result3).toBe('string');
      });

      it('should handle empty string', () => {
        const result = formatPastEventDate('');

        expect(result).toContain('Invalid Date');
      });

      it('should handle partial date strings', () => {
        const result1 = formatPastEventDate('2025-10');
        const result2 = formatPastEventDate('2025');

        // Partial dates may be parsed differently by different JS engines
        expect(typeof result1).toBe('string');
        expect(typeof result2).toBe('string');
      });
    });

    describe('Date object behavior', () => {
      it('should handle dates near Unix epoch', () => {
        const epoch = formatPastEventDate('1970-01-01T00:00:00Z');
        expect(epoch).toBe('Jan 1, 1970');
      });

      it('should handle very old dates', () => {
        const oldDate = formatPastEventDate('1900-01-01T00:00:00Z');
        expect(oldDate).toBe('Jan 1, 1900');
      });

      it('should handle far future dates', () => {
        const futureDate = formatPastEventDate('2099-12-31T12:00:00Z');
        expect(futureDate).toBe('Dec 31, 2099');
      });
    });

    describe('Consistent formatting pattern', () => {
      it('should always use three-letter month abbreviation', () => {
        const dates = [
          '2025-01-15T10:00:00Z',
          '2025-02-15T10:00:00Z',
          '2025-03-15T10:00:00Z',
          '2025-04-15T10:00:00Z',
          '2025-05-15T10:00:00Z',
          '2025-06-15T10:00:00Z',
          '2025-07-15T10:00:00Z',
          '2025-08-15T10:00:00Z',
          '2025-09-15T10:00:00Z',
          '2025-10-15T10:00:00Z',
          '2025-11-15T10:00:00Z',
          '2025-12-15T10:00:00Z',
        ];

        const results = dates.map(formatPastEventDate);

        results.forEach((result) => {
          // Should match pattern: "Mmm DD, YYYY" (3-letter month, space, day, comma, space, year)
          expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
        });
      });

      it('should always include comma after day', () => {
        const result = formatPastEventDate('2025-10-26T14:00:00Z');
        expect(result).toContain(',');
        expect(result.split(',').length).toBe(2);
      });

      it('should always have space after comma', () => {
        const result = formatPastEventDate('2025-10-26T14:00:00Z');
        expect(result).toMatch(/\d, \d{4}$/);
      });

      it('should always have 4-digit year', () => {
        const result = formatPastEventDate('2025-10-26T14:00:00Z');
        expect(result).toMatch(/\d{4}$/);
      });
    });
  });
});
