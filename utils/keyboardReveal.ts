import { Spacing } from '@/constants/DesignTokens';

/**
 * Room reserved below a focused picker for its downward-expanding dropdown
 * (~5 rows), so focusing it clears the keyboard for the list, not just the input.
 */
export const DROPDOWN_HEADROOM = 240;

/**
 * Kept visible above a focused input — its label and row padding — when the
 * screen is too short for the full headroom: the input wins over its dropdown.
 */
export const DROPDOWN_LABEL_ROOM = Spacing['3xl'];

/**
 * Scroll offset that brings the band [bandTop, bandBottom] (content
 * coordinates) into a viewport of `viewportHeight` currently at `scrollY`,
 * moving as little as possible. A band taller than the viewport is aligned to
 * its top, so the input at the top of the band stays in view.
 */
export function getRevealScrollOffset(
  scrollY: number,
  viewportHeight: number,
  bandTop: number,
  bandBottom: number
): number {
  return Math.max(0, Math.min(Math.max(scrollY, bandBottom - viewportHeight), bandTop));
}

export interface DropdownHeadroomMetrics {
  /** Top edge of the soft keyboard, in window coordinates. */
  keyboardTop: number;
  /** Top edge of the scroll viewport, in window coordinates. */
  viewportTop: number;
  /** Space pinned between the input and the keyboard (sticky footer, gap). */
  bottomInset: number;
  inputHeight: number;
}

/**
 * Dropdown room that still fits below a focused input once the input sits
 * DROPDOWN_LABEL_ROOM below the top of the viewport, capped at DROPDOWN_HEADROOM.
 */
export function getDropdownHeadroom({
  keyboardTop,
  viewportTop,
  bottomInset,
  inputHeight,
}: DropdownHeadroomMetrics): number {
  const room = keyboardTop - bottomInset - inputHeight - viewportTop - DROPDOWN_LABEL_ROOM;
  return Math.max(0, Math.min(DROPDOWN_HEADROOM, room));
}
