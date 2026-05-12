/**
 * Navigation Type Definitions
 *
 * This file contains type definitions for navigation parameters
 * used throughout the app's routing system.
 */

/**
 * Parameters for the Create Event Options screen.
 * This screen allows users to choose between creating from scratch or using a template.
 */
export type CreateEventOptionsScreenParams = undefined;

/**
 * Parameters for the Event Templates screen.
 * @property mode - 'management' for viewing/editing templates, 'selection' for picking a template to create an event
 */
export type EventTemplatesScreenParams = {
  mode?: 'management' | 'selection';
};

/**
 * Parameters for the Create Event screen.
 * @property templateId - Optional template ID to pre-fill the form with template data
 * @property source - Indicates how the user arrived at this screen (for analytics/UX)
 */
export type CreateEventScreenParams = {
  templateId?: string;
  source?: 'scratch' | 'template';
};

/**
 * Search params for create-template screen when pre-filling from past event.
 */
export type CreateTemplateSearchParams = {
  /** JSON stringified TemplateEventData from a past event */
  sourceEventData?: string;
  /** Source event ID for reference (optional, for analytics/debugging) */
  sourceEventId?: string;
  /** Pre-fill template name suggestion (e.g., "From: Monthly Meetup") */
  suggestedName?: string;
};
