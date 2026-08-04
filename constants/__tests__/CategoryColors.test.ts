/**
 * CategoryColors Tests
 *
 * Validates the category color resolution helpers and the filter-aware
 * display-category selection used by the map and calendar tabs.
 */

import {
  formatCategoryLabel,
  getCategoryColors,
  getDisplayCategory,
} from '@/constants/CategoryColors';
import { eventCategories } from '@/constants/EventCategories';

describe('CategoryColors', () => {
  describe('getCategoryColors', () => {
    it('returns a color set for every known category', () => {
      for (const { value } of eventCategories) {
        const colors = getCategoryColors(value);
        expect(colors.color).toMatch(/^#/);
        expect(colors.bg).toContain('rgba');
        expect(colors.border).toContain('rgba');
        expect(colors.badgeBg).toContain('rgba');
      }
    });

    it('falls back to the neutral grey for unknown or missing categories', () => {
      const fallback = getCategoryColors(undefined);
      expect(getCategoryColors(null)).toEqual(fallback);
      expect(getCategoryColors('NotACategory')).toEqual(fallback);
      expect(fallback.color).toBe('#8E8E93');
    });
  });

  describe('getDisplayCategory', () => {
    it('returns the primary category when no category filter is active', () => {
      expect(getDisplayCategory(['Strike', 'Learn'], [])).toBe('Strike');
    });

    it('returns the primary category when it matches the filter', () => {
      expect(getDisplayCategory(['Strike', 'Learn'], ['Strike'])).toBe('Strike');
      expect(getDisplayCategory(['Strike', 'Learn'], ['Learn', 'Strike'])).toBe('Strike');
    });

    it('returns the first matching category when the primary does not match', () => {
      // A ['Strike', 'Learn'] event matched the "Learn" filter through its
      // secondary category — it must surface as Learn, not Strike.
      expect(getDisplayCategory(['Strike', 'Learn'], ['Learn'])).toBe('Learn');
      expect(getDisplayCategory(['Protest', 'Support', 'Act'], ['Act', 'Support'])).toBe('Support');
    });

    it('falls back to the primary category when nothing matches', () => {
      expect(getDisplayCategory(['Protest'], ['Learn'])).toBe('Protest');
    });

    it('handles events without categories', () => {
      expect(getDisplayCategory(undefined, ['Learn'])).toBeUndefined();
      expect(getDisplayCategory(null, [])).toBeUndefined();
      expect(getDisplayCategory([], ['Learn'])).toBeUndefined();
    });
  });

  describe('formatCategoryLabel', () => {
    it('translates every canonical category', () => {
      for (const { value } of eventCategories) {
        const label = formatCategoryLabel(value);
        expect(label).not.toContain('categories.');
        expect(label.length).toBeGreaterThan(0);
      }
    });

    it('matches canonical categories case-insensitively', () => {
      expect(formatCategoryLabel('protest')).toBe(formatCategoryLabel('Protest'));
    });

    it('returns the raw value for categories outside the canonical list', () => {
      // Backend data can carry imported values (e.g. 'Betoging') that have no
      // translation — the badge must not render "categories.betoging".
      expect(formatCategoryLabel('Betoging')).toBe('Betoging');
      expect(formatCategoryLabel('Manifestation')).toBe('Manifestation');
    });
  });
});
