/**
 * EventCategories Tests
 *
 * Validates the eventCategories constant contains all expected categories
 * with matching label and value fields, and no duplicates.
 */

import { eventCategories } from '@/constants/EventCategories';

describe('EventCategories', () => {
  afterEach(() => jest.clearAllMocks());

  describe('eventCategories array', () => {
    it('should be defined', () => {
      expect(eventCategories).toBeDefined();
    });

    it('should be an array', () => {
      expect(Array.isArray(eventCategories)).toBe(true);
    });

    it('should contain 5 categories', () => {
      expect(eventCategories).toHaveLength(5);
    });
  });

  describe('individual categories', () => {
    it('should include Protest category', () => {
      const category = eventCategories.find((c) => c.value === 'Protest');
      expect(category).toBeDefined();
      expect(category?.label).toBe('Protest');
    });

    it('should include Act category', () => {
      const category = eventCategories.find((c) => c.value === 'Act');
      expect(category).toBeDefined();
      expect(category?.label).toBe('Act');
    });

    it('should include Learn category', () => {
      const category = eventCategories.find((c) => c.value === 'Learn');
      expect(category).toBeDefined();
      expect(category?.label).toBe('Learn');
    });

    it('should include Support category', () => {
      const category = eventCategories.find((c) => c.value === 'Support');
      expect(category).toBeDefined();
      expect(category?.label).toBe('Support');
    });

    it('should include Strike category', () => {
      const category = eventCategories.find((c) => c.value === 'Strike');
      expect(category).toBeDefined();
      expect(category?.label).toBe('Strike');
    });
  });

  describe('data integrity', () => {
    it('should have matching label and value for each category', () => {
      for (const category of eventCategories) {
        expect(category.label).toBe(category.value);
      }
    });

    it('should have unique values', () => {
      const values = eventCategories.map((c) => c.value);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it('should have unique labels', () => {
      const labels = eventCategories.map((c) => c.label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);
    });

    it('should have non-empty label and value strings for every category', () => {
      for (const category of eventCategories) {
        expect(typeof category.label).toBe('string');
        expect(category.label.length).toBeGreaterThan(0);
        expect(typeof category.value).toBe('string');
        expect(category.value.length).toBeGreaterThan(0);
      }
    });

    it('should have categories in the expected order', () => {
      const values = eventCategories.map((c) => c.value);
      expect(values).toEqual(['Protest', 'Act', 'Learn', 'Support', 'Strike']);
    });
  });
});
