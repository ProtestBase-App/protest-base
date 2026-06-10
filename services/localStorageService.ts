import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';
import { DRAFT_CONFIG, STORAGE_KEYS, SECURE_LIST_KEYS } from '@/constants/StorageConfig';
import { cancelAllSavedEventNotifications } from '@/services/notifications.service';
import { readList, writeList, clearList } from '@/services/secureListStorage';

const EVENT_DRAFT_KEY = STORAGE_KEYS.EVENT_DRAFT;

// Retention fallback used when neither the caller nor the events cache can
// supply an `endsAt` for a save (e.g. deep-linked event detail with a cold
// start). One year is generous enough that a far-future event won't get pruned
// before the user can attend it.
const ENDS_AT_FALLBACK_MS = 365 * 24 * 60 * 60 * 1000;

export interface SavedEntry {
  id: string;
  endsAt: number;
}

export interface LikedEntry {
  id: string;
  endsAt: number;
}

// All user-specific AsyncStorage keys that must be cleared on logout / account deletion.
// SAVED_EVENT_IDS / LIKED_EVENT_IDS / FOLLOWED_ORG_IDS are kept here as
// defense-in-depth: these AsyncStorage keys are removed lazily by
// `secureListStorage.readList`, but if the user logs out before any read
// triggers migration the data would otherwise linger unencrypted.
const USER_DATA_KEYS = [
  STORAGE_KEYS.SAVED_EVENT_IDS,
  STORAGE_KEYS.LIKED_EVENT_IDS,
  // 'rsvpedEventIds' was removed in 2.0.6 — kept here so existing users'
  // stale RSVP data still gets cleared on logout.
  'rsvpedEventIds',
  STORAGE_KEYS.FOLLOWED_ORG_IDS,
  STORAGE_KEYS.EVENT_DRAFT,
  STORAGE_KEYS.SELECTED_ORGANIZATION_ID,
  STORAGE_KEYS.PAST_EVENTS_CACHE,
  STORAGE_KEYS.PAST_EVENTS_CACHE_TIMESTAMP,
  STORAGE_KEYS.TEMPLATES_CACHE,
  STORAGE_KEYS.TEMPLATES_CACHE_TIMESTAMP,
  STORAGE_KEYS.USER_EVENT_COUNTS,
];

/**
 * Clear all user-specific data from AsyncStorage AND SecureStore (logout / account deletion).
 */
export const clearAllUserData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove(USER_DATA_KEYS);
  } catch (error: any) {
    logger.error('Failed to clear all user data from AsyncStorage', {
      errorMessage: error.message,
    });
  }
  // SecureStore-backed lists. Each call has its own try/catch inside clearList.
  await clearList(SECURE_LIST_KEYS.SAVED_EVENT_IDS);
  await clearList(SECURE_LIST_KEYS.LIKED_EVENT_IDS);
  await clearList(SECURE_LIST_KEYS.FOLLOWED_ORG_IDS);
  // OS-scheduled saved-event reminders are user data too: without this they
  // keep firing at 08:30 after logout/account deletion. Never throws.
  await cancelAllSavedEventNotifications();
};

function isLegacyStringArray(value: unknown[]): value is string[] {
  return value.length > 0 && typeof value[0] === 'string';
}

function upgradeStringIdsToEntries(ids: string[]): SavedEntry[] {
  const endsAt = Date.now() + ENDS_AT_FALLBACK_MS;
  return ids.map((id) => ({ id, endsAt }));
}

/**
 * Read saved event entries from SecureStore, migrating from legacy
 * AsyncStorage data and upgrading the legacy string[] shape to SavedEntry[]
 * if needed. Idempotent.
 */
export const fetchSavedEntriesLocally = async (): Promise<SavedEntry[]> => {
  try {
    const raw = await readList<unknown>(
      SECURE_LIST_KEYS.SAVED_EVENT_IDS,
      STORAGE_KEYS.SAVED_EVENT_IDS
    );
    if (raw.length === 0) return [];
    if (isLegacyStringArray(raw)) {
      const upgraded = upgradeStringIdsToEntries(raw);
      try {
        await writeList(SECURE_LIST_KEYS.SAVED_EVENT_IDS, upgraded);
      } catch (writeError) {
        logger.warn('[localStorageService] Failed to persist upgraded saved entries', {
          error: writeError instanceof Error ? writeError.message : String(writeError),
        });
      }
      return upgraded;
    }
    return raw as SavedEntry[];
  } catch (error: any) {
    logger.error('Failed to fetch saved entries', { errorMessage: error.message });
    return [];
  }
};

export const writeSavedEntriesLocally = async (entries: SavedEntry[]): Promise<void> => {
  try {
    await writeList(SECURE_LIST_KEYS.SAVED_EVENT_IDS, entries);
  } catch (error: any) {
    logger.error('Failed to persist saved entries', { errorMessage: error.message });
    throw error;
  }
};

export const addSavedEntryLocally = async (entry: SavedEntry): Promise<void> => {
  const current = await fetchSavedEntriesLocally();
  if (current.some((e) => e.id === entry.id)) return;
  current.push(entry);
  await writeSavedEntriesLocally(current);
};

export const removeSavedIdLocally = async (id: string): Promise<void> => {
  const current = await fetchSavedEntriesLocally();
  const filtered = current.filter((e) => e.id !== id);
  if (filtered.length === current.length) return;
  await writeSavedEntriesLocally(filtered);
};

// String-id shims so callers that operate on `string[]` continue to compile.
// The provider uses the entry-based functions above; these shims are kept for
// occasional external callers and for tests.

export const saveEventIdLocally = async (eventId: string, endsAt?: number): Promise<void> => {
  const resolvedEndsAt = endsAt ?? Date.now() + ENDS_AT_FALLBACK_MS;
  try {
    await addSavedEntryLocally({ id: eventId, endsAt: resolvedEndsAt });
  } catch (error: any) {
    logger.error('Failed to save event ID locally', {
      hasEventId: !!eventId,
      errorMessage: error.message,
    });
  }
};

export const fetchSavedEventIdsLocally = async (): Promise<string[]> => {
  const entries = await fetchSavedEntriesLocally();
  return entries.map((e) => e.id);
};

export const removeEventIdLocally = async (eventId: string): Promise<void> => {
  try {
    await removeSavedIdLocally(eventId);
  } catch (error: any) {
    logger.error('Failed to remove event ID locally', {
      hasEventId: !!eventId,
      errorMessage: error.message,
    });
  }
};

export const clearSavedEventIdsLocally = async (): Promise<void> => {
  await clearList(SECURE_LIST_KEYS.SAVED_EVENT_IDS);
};

// Liked events (entry-based, encrypted)

export const fetchLikedEntriesLocally = async (): Promise<LikedEntry[]> => {
  try {
    const raw = await readList<unknown>(
      SECURE_LIST_KEYS.LIKED_EVENT_IDS,
      STORAGE_KEYS.LIKED_EVENT_IDS
    );
    if (raw.length === 0) return [];
    if (isLegacyStringArray(raw)) {
      const upgraded = upgradeStringIdsToEntries(raw);
      try {
        await writeList(SECURE_LIST_KEYS.LIKED_EVENT_IDS, upgraded);
      } catch (writeError) {
        logger.warn('[localStorageService] Failed to persist upgraded liked entries', {
          error: writeError instanceof Error ? writeError.message : String(writeError),
        });
      }
      return upgraded;
    }
    return raw as LikedEntry[];
  } catch (error: any) {
    logger.error('Failed to fetch liked entries', { errorMessage: error.message });
    return [];
  }
};

export const writeLikedEntriesLocally = async (entries: LikedEntry[]): Promise<void> => {
  try {
    await writeList(SECURE_LIST_KEYS.LIKED_EVENT_IDS, entries);
  } catch (error: any) {
    logger.error('Failed to persist liked entries', { errorMessage: error.message });
    throw error;
  }
};

export const addLikedEntryLocally = async (entry: LikedEntry): Promise<void> => {
  const current = await fetchLikedEntriesLocally();
  if (current.some((e) => e.id === entry.id)) return;
  current.push(entry);
  await writeLikedEntriesLocally(current);
};

export const removeLikedIdLocally = async (id: string): Promise<void> => {
  const current = await fetchLikedEntriesLocally();
  const filtered = current.filter((e) => e.id !== id);
  if (filtered.length === current.length) return;
  await writeLikedEntriesLocally(filtered);
};

// Followed organizations (plain string[], encrypted)

export const fetchFollowedOrgIdsLocally = async (): Promise<string[]> => {
  try {
    const raw = await readList<unknown>(
      SECURE_LIST_KEYS.FOLLOWED_ORG_IDS,
      STORAGE_KEYS.FOLLOWED_ORG_IDS
    );
    return raw.filter((v): v is string => typeof v === 'string');
  } catch (error: any) {
    logger.error('Failed to fetch followed org IDs', { errorMessage: error.message });
    return [];
  }
};

export const writeFollowedOrgIdsLocally = async (ids: string[]): Promise<void> => {
  try {
    await writeList(SECURE_LIST_KEYS.FOLLOWED_ORG_IDS, ids);
  } catch (error: any) {
    logger.error('Failed to persist followed org IDs', { errorMessage: error.message });
    throw error;
  }
};

// Event Draft (kept in AsyncStorage)

/**
 * Save event draft with a timestamp.
 * Returns `{ success, error? }` so callers can surface feedback to the user.
 */
export const saveEventDraft = async (
  formData: any
): Promise<{ success: boolean; error?: string }> => {
  try {
    const draftData = {
      formData,
      savedAt: Date.now(),
    };
    await AsyncStorage.setItem(EVENT_DRAFT_KEY, JSON.stringify(draftData));
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to save event draft', { errorMessage: error.message });
    return { success: false, error: error.message };
  }
};

/** Get event draft if not expired; returns null when expired or absent. */
export const getEventDraft = async (): Promise<{
  formData: any;
  savedAt: number;
} | null> => {
  try {
    const draftString = await AsyncStorage.getItem(EVENT_DRAFT_KEY);
    if (!draftString) {
      return null;
    }

    const draftData = JSON.parse(draftString);
    const now = Date.now();

    if (now - draftData.savedAt > DRAFT_CONFIG.EXPIRY_MS) {
      await clearEventDraft();
      return null;
    }

    return draftData;
  } catch (error: any) {
    logger.error('Failed to get event draft', { errorMessage: error.message });
    return null;
  }
};

export const clearEventDraft = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(EVENT_DRAFT_KEY);
  } catch (error: any) {
    logger.error('Failed to clear event draft', { errorMessage: error.message });
  }
};

export const hasEventDraft = async (): Promise<boolean> => {
  try {
    const draft = await getEventDraft();
    return draft !== null;
  } catch (error: any) {
    logger.error('Failed to check event draft', { errorMessage: error.message });
    return false;
  }
};
