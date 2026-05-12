import { FormattedEventListItem } from './eventFormatters';
import { isEventOngoing, isEventActiveDuringDate, isEventActiveDuringRange } from './eventStatus';

/**
 * Event type alias used by filter functions.
 * `FormattedEventListItem` includes startDateFull/endDateFull for ongoing checks.
 */
export type Event = FormattedEventListItem;

export type LocationFilterValue = string[] | null;
export type DateFilterValue = string | null;
export type OrganizersFilterValue = string[] | null;
export type CategoryFilterValue = string | null;

/**
 * Options for applyCombinedFilters
 */
export interface FilterOptions {
  /** Filter out events that have ended (default: true) */
  filterEndedEvents?: boolean;
}

/**
 * Logger interface. Callers can pass a custom logger (e.g. Sentry); the default
 * is intentionally a no-op so this module stays independent of UI logging.
 */
interface Logger {
  error: (message: string, details?: any) => void;
  warn: (message: string, details?: any) => void;
}

const defaultLogger: Logger = {
  error: (_message: string, _details?: any) => {},
  warn: (_message: string, _details?: any) => {},
};

function getEventStartTime(event: Event): string {
  return event.startDateFull;
}

function getEventEndTime(event: Event): string | undefined {
  return event.endDateFull ?? undefined;
}

/**
 * Applies combined filters to an array of events
 * @param events - Array of event objects to filter
 * @param searchValue - Search string to filter by title, city, country, organizer, or co-organizers
 * @param location - Array of postal codes (as strings) to filter by
 * @param dateValue - Date filter option
 * @param organizers - Array of organization IDs to filter by
 * @param categoryValue - Category to filter by
 * @param logger - Optional custom logger implementation
 * @param options - Optional filter options (e.g., filterEndedEvents)
 * @returns Filtered array of events
 */
export function applyCombinedFilters(
  events: Event[],
  searchValue: string,
  location: LocationFilterValue,
  dateValue: DateFilterValue,
  organizers: OrganizersFilterValue,
  categoryValue: CategoryFilterValue,
  logger: Logger = defaultLogger,
  options: FilterOptions = {}
): Event[] {
  const { filterEndedEvents = true } = options;

  try {
    if (!Array.isArray(events)) {
      logger.error('Invalid events parameter: expected array', {
        receivedType: typeof events,
        receivedValue: events,
      });
      return [];
    }

    let filtered = [...events];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Drop ended events up front so the remaining filters only run on
    // candidates that are still ongoing.
    if (filterEndedEvents) {
      filtered = filtered.filter((event) => {
        try {
          const startTime = getEventStartTime(event);
          const endTime = getEventEndTime(event);
          return isEventOngoing({ start_time: startTime, end_time: endTime });
        } catch (err) {
          logger.error('Error checking if event is ongoing', {
            eventId: event.id,
            error: err instanceof Error ? err.message : err,
          });
          // Keep event if we can't determine status.
          return true;
        }
      });
    }

    if (Array.isArray(location) && location.length > 0) {
      try {
        // Set for O(1) membership checks.
        const postalCodeSet = new Set(
          location.map((loc) => {
            if (typeof loc !== 'string') {
              logger.warn('Non-string postal code value detected', { value: loc });
              return String(loc);
            }
            return loc;
          })
        );

        filtered = filtered.filter((event) => {
          try {
            if (!event.postal_code) return false;
            return postalCodeSet.has(String(event.postal_code));
          } catch (err) {
            logger.error('Error filtering by postal code for event', {
              eventId: event.id,
              error: err instanceof Error ? err.message : err,
            });
            return false;
          }
        });
      } catch (err) {
        logger.error('Error in postal code filtering', {
          location,
          error: err instanceof Error ? err.message : err,
        });
      }
    }

    // Date filtering includes events active anywhere in the target window
    // (not only those starting in it — important for multi-day events).
    if (dateValue && dateValue !== 'allDates') {
      try {
        switch (dateValue) {
          case 'today':
            filtered = filtered.filter((event) => {
              try {
                const startTime = getEventStartTime(event);
                const endTime = getEventEndTime(event);
                return isEventActiveDuringDate({ start_time: startTime, end_time: endTime }, today);
              } catch (err) {
                logger.error('Error parsing date for event', {
                  eventId: event.id,
                  error: err instanceof Error ? err.message : err,
                });
                return false;
              }
            });
            break;

          case 'tomorrow':
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            filtered = filtered.filter((event) => {
              try {
                const startTime = getEventStartTime(event);
                const endTime = getEventEndTime(event);
                return isEventActiveDuringDate(
                  { start_time: startTime, end_time: endTime },
                  tomorrow
                );
              } catch (err) {
                logger.error('Error parsing date for event', {
                  eventId: event.id,
                  error: err instanceof Error ? err.message : err,
                });
                return false;
              }
            });
            break;

          case 'thisWeek':
            const dayOfWeek = today.getDay();
            const firstDayOfWeek = new Date(today);
            firstDayOfWeek.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
            firstDayOfWeek.setHours(0, 0, 0, 0);
            const lastDayOfWeek = new Date(firstDayOfWeek);
            lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
            lastDayOfWeek.setHours(23, 59, 59, 999);

            filtered = filtered.filter((event) => {
              try {
                const startTime = getEventStartTime(event);
                const endTime = getEventEndTime(event);
                return isEventActiveDuringRange(
                  { start_time: startTime, end_time: endTime },
                  firstDayOfWeek,
                  lastDayOfWeek
                );
              } catch (err) {
                logger.error('Error parsing date for event', {
                  eventId: event.id,
                  error: err instanceof Error ? err.message : err,
                });
                return false;
              }
            });
            break;

          case 'thisWeekend':
            const currentDayOfWeek = today.getDay();
            let saturday: Date;
            let sunday: Date;

            if (currentDayOfWeek === 0) {
              // Today is Sunday, so Saturday was yesterday
              saturday = new Date(today);
              saturday.setDate(today.getDate() - 1);
              sunday = new Date(today);
            } else if (currentDayOfWeek === 6) {
              // Today is Saturday
              saturday = new Date(today);
              sunday = new Date(today);
              sunday.setDate(today.getDate() + 1);
            } else {
              // Weekday (Monday-Friday), get upcoming weekend
              saturday = new Date(today);
              saturday.setDate(today.getDate() + (6 - currentDayOfWeek));
              sunday = new Date(saturday);
              sunday.setDate(saturday.getDate() + 1);
            }

            saturday.setHours(0, 0, 0, 0);
            sunday.setHours(23, 59, 59, 999);

            filtered = filtered.filter((event) => {
              try {
                const startTime = getEventStartTime(event);
                const endTime = getEventEndTime(event);
                return isEventActiveDuringRange(
                  { start_time: startTime, end_time: endTime },
                  saturday,
                  sunday
                );
              } catch (err) {
                logger.error('Error parsing date for event', {
                  eventId: event.id,
                  error: err instanceof Error ? err.message : err,
                });
                return false;
              }
            });
            break;

          default:
            break;
        }
      } catch (err) {
        logger.error('Error in date filtering', {
          dateValue,
          error: err instanceof Error ? err.message : err,
        });
      }
    }

    if (organizers && organizers.length > 0) {
      try {
        const organizerIdsSet = new Set(
          organizers.map((org) => {
            if (typeof org !== 'string') {
              logger.warn('Non-string organizer value detected', { value: org });
              return String(org);
            }
            return org;
          })
        );

        filtered = filtered.filter((event) => {
          try {
            if (event.organization_id && organizerIdsSet.has(event.organization_id)) {
              return true;
            }
            return false;
          } catch (err) {
            logger.error('Error filtering by organizer for event', {
              eventId: event.id,
              error: err instanceof Error ? err.message : err,
            });
            return false;
          }
        });
      } catch (err) {
        logger.error('Error in organizer filtering', {
          organizers,
          error: err instanceof Error ? err.message : err,
        });
      }
    }

    if (categoryValue && categoryValue !== 'allCategories') {
      try {
        filtered = filtered.filter((event) => {
          try {
            if (!Array.isArray(event.categories)) {
              if (event.categories) {
                logger.warn('Non-array categories detected', {
                  eventId: event.id,
                  categories: event.categories,
                });
              }
              return false;
            }
            return event.categories.includes(categoryValue);
          } catch (err) {
            logger.error('Error filtering by category for event', {
              eventId: event.id,
              error: err instanceof Error ? err.message : err,
            });
            return false;
          }
        });
      } catch (err) {
        logger.error('Error in category filtering', {
          categoryValue,
          error: err instanceof Error ? err.message : err,
        });
      }
    }

    if (searchValue && searchValue.trim() !== '') {
      try {
        const searchLower = searchValue.toLowerCase();

        filtered = filtered.filter((event) => {
          try {
            const titleMatch = event.title && event.title.toLowerCase().includes(searchLower);
            const descriptionMatch =
              event.description && event.description.toLowerCase().includes(searchLower);

            let categoryMatch = false;
            if (Array.isArray(event.categories)) {
              categoryMatch = event.categories.some((category) => {
                if (typeof category !== 'string') {
                  logger.warn('Non-string category detected in search', {
                    eventId: event.id,
                    category,
                  });
                  return false;
                }
                return category.toLowerCase().includes(searchLower);
              });
            }

            return titleMatch || descriptionMatch || categoryMatch;
          } catch (err) {
            logger.error('Error in search filter for event', {
              eventId: event.id,
              searchValue,
              error: err instanceof Error ? err.message : err,
            });
            return false;
          }
        });
      } catch (err) {
        logger.error('Error in search filtering', {
          searchValue,
          error: err instanceof Error ? err.message : err,
        });
      }
    }

    return filtered;
  } catch (err) {
    logger.error('Unexpected error in applyCombinedFilters', {
      error: err instanceof Error ? err.message : err,
      stack: err instanceof Error ? err.stack : undefined,
    });
    return [];
  }
}

/**
 * Filter events to only include ongoing events (not ended)
 * Standalone function for use outside of applyCombinedFilters
 */
export function filterOngoingEvents(events: Event[]): Event[] {
  return events.filter((event) => {
    const startTime = getEventStartTime(event);
    const endTime = getEventEndTime(event);
    return isEventOngoing({ start_time: startTime, end_time: endTime });
  });
}
