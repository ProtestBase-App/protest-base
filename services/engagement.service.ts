import api from './api';
import { logger } from '@/utils/logger';

/**
 * Engagement endpoints — anonymous aggregate counters for save / like / follow.
 *
 * Design notes:
 * - Requests send no identifying data in body or params — only the event/org ID
 *   in the URL. The backend persists the aggregate count and nothing more.
 * - Whether the current user engaged with an item is device-local state, managed
 *   by the matching provider (SavedEventsProvider, LikedEventsProvider, etc.).
 *   The server never tells us.
 * - Treat the returned count as authoritative.
 */

interface EventSaveCountResponse {
  success: boolean;
  data: { save_count: number };
}

interface EventLikeCountResponse {
  success: boolean;
  data: { like_count: number };
}

interface OrgFollowerCountResponse {
  success: boolean;
  data: { follower_count: number };
}

const handleEngagementError = (action: string, error: any): never => {
  if (error.response?.status === 401) {
    throw new Error('Please log in to perform this action');
  }
  if (error.response?.status === 403) {
    throw new Error('You do not have permission to perform this action');
  }
  if (error.response?.status === 404) {
    throw new Error('Resource not found');
  }
  throw new Error(error.response?.data?.error || error.message || `Failed to ${action}`);
};

// Save / Unsave event — counter only. Local bookmark state stays in SavedEventsProvider.

export async function saveEventOnServer(eventId: string): Promise<number> {
  try {
    const response = await api.post<EventSaveCountResponse>(`/events/${eventId}/save`);
    if (!response.data.success) {
      throw new Error('Failed to save event');
    }
    logger.debug('[Engagement] save', { eventId, count: response.data.data.save_count });
    return response.data.data.save_count;
  } catch (error: any) {
    return handleEngagementError('save event', error);
  }
}

export async function unsaveEventOnServer(eventId: string): Promise<number> {
  try {
    const response = await api.delete<EventSaveCountResponse>(`/events/${eventId}/save`);
    if (!response.data.success) {
      throw new Error('Failed to unsave event');
    }
    logger.debug('[Engagement] unsave', { eventId, count: response.data.data.save_count });
    return response.data.data.save_count;
  } catch (error: any) {
    return handleEngagementError('unsave event', error);
  }
}

// Like / Unlike event

export async function likeEventOnServer(eventId: string): Promise<number> {
  try {
    const response = await api.post<EventLikeCountResponse>(`/events/${eventId}/like`);
    if (!response.data.success) {
      throw new Error('Failed to like event');
    }
    logger.debug('[Engagement] like', { eventId, count: response.data.data.like_count });
    return response.data.data.like_count;
  } catch (error: any) {
    return handleEngagementError('like event', error);
  }
}

export async function unlikeEventOnServer(eventId: string): Promise<number> {
  try {
    const response = await api.delete<EventLikeCountResponse>(`/events/${eventId}/like`);
    if (!response.data.success) {
      throw new Error('Failed to unlike event');
    }
    logger.debug('[Engagement] unlike', { eventId, count: response.data.data.like_count });
    return response.data.data.like_count;
  } catch (error: any) {
    return handleEngagementError('unlike event', error);
  }
}

// Follow / unfollow organization

export async function followOrganizationOnServer(organizationId: string): Promise<number> {
  try {
    const response = await api.post<OrgFollowerCountResponse>(
      `/organizations/${organizationId}/follow`
    );
    if (!response.data.success) {
      throw new Error('Failed to follow organization');
    }
    logger.debug('[Engagement] follow-org', {
      organizationId,
      count: response.data.data.follower_count,
    });
    return response.data.data.follower_count;
  } catch (error: any) {
    return handleEngagementError('follow organization', error);
  }
}

export async function unfollowOrganizationOnServer(organizationId: string): Promise<number> {
  try {
    const response = await api.delete<OrgFollowerCountResponse>(
      `/organizations/${organizationId}/follow`
    );
    if (!response.data.success) {
      throw new Error('Failed to unfollow organization');
    }
    logger.debug('[Engagement] unfollow-org', {
      organizationId,
      count: response.data.data.follower_count,
    });
    return response.data.data.follower_count;
  } catch (error: any) {
    return handleEngagementError('unfollow organization', error);
  }
}
