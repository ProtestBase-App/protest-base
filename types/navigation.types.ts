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
 * Parameters for the Create Event screen.
 * @property templateId - Optional template ID to pre-fill the form with template data
 * @property source - Indicates how the user arrived at this screen (for analytics/UX)
 */
export type CreateEventScreenParams = {
  templateId?: string;
  source?: 'scratch' | 'template';
};
