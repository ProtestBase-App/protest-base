import api from './api';
import { logger } from '@/utils/logger';

export interface EventViewResponse {
  success: boolean;
  view_count: number;
}

/**
 * Record a view for an event — anonymous aggregate counter bump.
 *
 * The request sends no identifying data: only the event ID in the URL and an
 * empty body. Every page load increments the counter.
 *
 * Fails silently — errors are logged but never thrown, so view tracking can't
 * break the UX.
 *
 * @param eventId - The ID of the event being viewed
 * @returns Promise<EventViewResponse> containing view count
 *
 * @example
 * const result = await trackEventView('event-123');
 * console.log(result.view_count); // Total view count
 */
export const trackEventView = async (eventId: string): Promise<EventViewResponse> => {
  const defaultResponse: EventViewResponse = {
    success: false,
    view_count: 0,
  };

  try {
    // Empty body — only the event ID in the URL travels to the backend.
    // skipAuth: true keeps the user's JWT off this request so the view ping
    // cannot be tied to a specific account at the network layer.
    const response = await api.post<{
      success: boolean;
      view_count?: number;
      data?: {
        view_count: number;
      };
    }>(`/events/${eventId}/view`, {}, { skipAuth: true });

    if (!response.data.success) {
      logger.warn('Event view tracking returned unsuccessful response', {
        eventId,
        response: response.data,
      });
      return defaultResponse;
    }

    // Accept both response formats: { success, data: { view_count } } and { success, view_count }.
    const viewCount = response.data.data?.view_count ?? response.data.view_count ?? 0;

    return {
      success: true,
      view_count: viewCount,
    };
  } catch (error: any) {
    // Log but never throw — view tracking must fail silently.
    logger.error('Failed to track event view', {
      eventId,
      error: error.response?.data?.error || error.message || 'Unknown error',
      status: error.response?.status,
    });

    return defaultResponse;
  }
};
