/**
 * Whether the user can edit an event.
 *
 * The user must belong to the event's organization and the event must not
 * have ended yet. Missing end_time falls back to `start_time + 2h`.
 */
export const canUserEditEvent = (
  eventOrganizationId: string | undefined,
  userOrganizationIds: string[],
  eventStartDateFull: string,
  eventEndDateFull?: string | null
): boolean => {
  try {
    if (!eventOrganizationId) {
      return false;
    }

    if (!userOrganizationIds || userOrganizationIds.length === 0) {
      return false;
    }

    const userBelongsToOrganization = userOrganizationIds.includes(eventOrganizationId);
    if (!userBelongsToOrganization) {
      return false;
    }

    let effectiveEnd: number;
    if (eventEndDateFull) {
      effectiveEnd = new Date(eventEndDateFull).getTime();
    } else {
      effectiveEnd = new Date(eventStartDateFull).getTime() + 2 * 60 * 60 * 1000;
    }

    if (isNaN(effectiveEnd)) {
      return false;
    }

    return Date.now() <= effectiveEnd;
  } catch (error) {
    return false;
  }
};

/**
 * Whether the user can delete an event.
 *
 * The user must belong to the event's organization and the event must start
 * more than one hour from now.
 */
export const canUserDeleteEvent = (
  eventOrganizationId: string | undefined,
  userOrganizationIds: string[],
  eventStartDateFull: string
): boolean => {
  try {
    if (!eventOrganizationId) {
      return false;
    }

    if (!userOrganizationIds || userOrganizationIds.length === 0) {
      return false;
    }

    const userBelongsToOrganization = userOrganizationIds.includes(eventOrganizationId);
    if (!userBelongsToOrganization) {
      return false;
    }

    const eventStart = new Date(eventStartDateFull).getTime();
    const oneHourFromNow = Date.now() + 60 * 60 * 1000;

    return eventStart > oneHourFromNow;
  } catch (error) {
    return false;
  }
};
