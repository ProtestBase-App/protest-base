/**
 * Alpha compositing for the hex colors in `constants/CategoryColors.ts` and
 * `constants/Colors.ts`. Extracted from DraftEventCard when the drafts list was
 * split into a row + a triage card, both of which tint by category.
 */

/**
 * Convert a `#RRGGBB` color to `rgba()` at the given alpha.
 *
 * Returns the input untouched when it isn't a 6-digit hex string, so a token
 * that is already `rgba(...)` passes through instead of producing `rgba(NaN…)`.
 *
 * @param hex - Color in `#RRGGBB` form
 * @param alpha - Opacity between 0 and 1
 */
export function hexAlpha(hex: string, alpha: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
