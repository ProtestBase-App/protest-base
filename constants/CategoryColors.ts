/**
 * Per-category accent colors for the calendar tab redesign.
 *
 * Keys match the backend category values in `constants/EventCategories.ts`.
 * Values are theme-independent brand colors (same in light and dark mode),
 * following the bright-palette precedent set by `app/organizer/[id].tsx` —
 * the purple is lightened from the design handoff's #9C27B0 to #B35CC9 so it
 * stays readable on both backgrounds.
 *
 * If the category list changes, update this map together with
 * `constants/EventCategories.ts` and the explore screen filters.
 */

export interface CategoryColorSet {
  /** Solid dot / text color. */
  color: string;
  /** Tinted container background (~13% alpha). */
  bg: string;
  /** Tinted container border (~27% alpha). */
  border: string;
  /** Badge background (~11% alpha). */
  badgeBg: string;
}

const CATEGORY_COLORS: Record<string, CategoryColorSet> = {
  Protest: {
    // App tint (#F94460) — the handoff maps "Manifestation" to the accent color.
    color: '#F94460',
    bg: 'rgba(249, 68, 96, 0.13)',
    border: 'rgba(249, 68, 96, 0.27)',
    badgeBg: 'rgba(249, 68, 96, 0.11)',
  },
  Strike: {
    color: '#FF9800',
    bg: 'rgba(255, 152, 0, 0.13)',
    border: 'rgba(255, 152, 0, 0.27)',
    badgeBg: 'rgba(255, 152, 0, 0.11)',
  },
  Learn: {
    color: '#2196F3',
    bg: 'rgba(33, 150, 243, 0.13)',
    border: 'rgba(33, 150, 243, 0.27)',
    badgeBg: 'rgba(33, 150, 243, 0.11)',
  },
  Support: {
    color: '#B35CC9',
    bg: 'rgba(179, 92, 201, 0.13)',
    border: 'rgba(179, 92, 201, 0.27)',
    badgeBg: 'rgba(179, 92, 201, 0.11)',
  },
  Act: {
    color: '#4CAF50',
    bg: 'rgba(76, 175, 80, 0.13)',
    border: 'rgba(76, 175, 80, 0.27)',
    badgeBg: 'rgba(76, 175, 80, 0.11)',
  },
};

/** Neutral fallback for events without a known category. */
const FALLBACK_CATEGORY_COLORS: CategoryColorSet = {
  color: '#8E8E93',
  bg: 'rgba(142, 142, 147, 0.13)',
  border: 'rgba(142, 142, 147, 0.27)',
  badgeBg: 'rgba(142, 142, 147, 0.11)',
};

/**
 * Resolve the color set for a category value (case-sensitive backend value,
 * e.g. 'Protest'). Unknown or missing categories get a neutral grey.
 */
export function getCategoryColors(category: string | undefined | null): CategoryColorSet {
  if (!category) return FALLBACK_CATEGORY_COLORS;
  return CATEGORY_COLORS[category] ?? FALLBACK_CATEGORY_COLORS;
}

/**
 * Category to surface for an event while category filters are active.
 *
 * Filters match events on ANY of their categories (calendar and map tabs,
 * plus the backend's explore filter), so a multi-category event can match
 * through a non-primary category. Surfacing the primary one would then look
 * like a foreign result — e.g. filtering "Learn" while a ['Strike', 'Learn']
 * event shows a Strike-colored pin and badge. Prefer the primary category
 * whenever no category filter is active or it matches the filter; otherwise
 * fall back to the first event category that does match.
 */
export function getDisplayCategory(
  categories: string[] | undefined | null,
  selectedCategories: string[]
): string | undefined {
  const primary = categories?.[0];
  if (!categories || selectedCategories.length === 0) return primary;
  if (primary && selectedCategories.includes(primary)) return primary;
  return categories.find((category) => selectedCategories.includes(category)) ?? primary;
}
