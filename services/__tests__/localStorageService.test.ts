import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS, SECURE_LIST_KEYS, DRAFT_CONFIG } from '@/constants/StorageConfig';
import {
  saveEventIdLocally,
  fetchSavedEventIdsLocally,
  removeEventIdLocally,
  clearSavedEventIdsLocally,
  fetchSavedEntriesLocally,
  writeSavedEntriesLocally,
  fetchLikedEntriesLocally,
  fetchFollowedOrgIdsLocally,
  writeFollowedOrgIdsLocally,
  saveEventDraft,
  getEventDraft,
  clearEventDraft,
  hasEventDraft,
  clearAllUserData,
  getHomeArea,
  setHomeArea,
  clearHomeArea,
  SavedEntry,
} from '../localStorageService';

// ============================================================================
// Stateful in-memory SecureStore mock (overrides the global jest.setup mock).
// ============================================================================

let secureStoreMem: Map<string, string>;

beforeEach(() => {
  jest.clearAllMocks();
  secureStoreMem = new Map();

  (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) =>
    secureStoreMem.has(key) ? secureStoreMem.get(key)! : null
  );
  (SecureStore.setItemAsync as jest.Mock).mockImplementation(async (key: string, value: string) => {
    secureStoreMem.set(key, value);
  });
  (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(async (key: string) => {
    secureStoreMem.delete(key);
  });

  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);
});

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// ============================================================================
// Saved events (entry-based, encrypted)
// ============================================================================

describe('saveEventIdLocally', () => {
  it('writes a new entry to SecureStore with the provided endsAt', async () => {
    await saveEventIdLocally('evt-1', 1234567890);

    const raw = secureStoreMem.get(SECURE_LIST_KEYS.SAVED_EVENT_IDS);
    expect(raw).toBeDefined();
    expect(JSON.parse(raw!)).toEqual([{ id: 'evt-1', endsAt: 1234567890 }]);
  });

  it('uses 1-year fallback when no endsAt provided', async () => {
    const before = Date.now();
    await saveEventIdLocally('evt-1');
    const after = Date.now();

    const entries = JSON.parse(secureStoreMem.get(SECURE_LIST_KEYS.SAVED_EVENT_IDS)!);
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('evt-1');
    expect(entries[0].endsAt).toBeGreaterThanOrEqual(before + ONE_YEAR_MS);
    expect(entries[0].endsAt).toBeLessThanOrEqual(after + ONE_YEAR_MS);
  });

  it('appends to existing entries', async () => {
    secureStoreMem.set(
      SECURE_LIST_KEYS.SAVED_EVENT_IDS,
      JSON.stringify([{ id: 'evt-1', endsAt: 100 }])
    );
    await saveEventIdLocally('evt-2', 200);

    const entries = JSON.parse(secureStoreMem.get(SECURE_LIST_KEYS.SAVED_EVENT_IDS)!);
    expect(entries).toEqual([
      { id: 'evt-1', endsAt: 100 },
      { id: 'evt-2', endsAt: 200 },
    ]);
  });

  it('does not duplicate an existing event ID', async () => {
    secureStoreMem.set(
      SECURE_LIST_KEYS.SAVED_EVENT_IDS,
      JSON.stringify([{ id: 'evt-1', endsAt: 100 }])
    );
    await saveEventIdLocally('evt-1', 999);

    const entries = JSON.parse(secureStoreMem.get(SECURE_LIST_KEYS.SAVED_EVENT_IDS)!);
    expect(entries).toEqual([{ id: 'evt-1', endsAt: 100 }]);
  });

  it('handles SecureStore failure gracefully (does not throw)', async () => {
    (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(new Error('Storage full'));
    await expect(saveEventIdLocally('evt-1', 100)).resolves.toBeUndefined();
  });
});

describe('fetchSavedEventIdsLocally', () => {
  it('returns IDs only (drops endsAt) from stored entries', async () => {
    secureStoreMem.set(
      SECURE_LIST_KEYS.SAVED_EVENT_IDS,
      JSON.stringify([
        { id: 'evt-1', endsAt: 100 },
        { id: 'evt-2', endsAt: 200 },
      ])
    );
    const result = await fetchSavedEventIdsLocally();
    expect(result).toEqual(['evt-1', 'evt-2']);
  });

  it('returns empty array when nothing saved', async () => {
    const result = await fetchSavedEventIdsLocally();
    expect(result).toEqual([]);
  });

  it('returns empty array on storage failure', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('fail'));
    const result = await fetchSavedEventIdsLocally();
    expect(result).toEqual([]);
  });
});

describe('removeEventIdLocally', () => {
  it('removes the entry from SecureStore', async () => {
    secureStoreMem.set(
      SECURE_LIST_KEYS.SAVED_EVENT_IDS,
      JSON.stringify([
        { id: 'evt-1', endsAt: 100 },
        { id: 'evt-2', endsAt: 200 },
      ])
    );
    await removeEventIdLocally('evt-1');

    const entries = JSON.parse(secureStoreMem.get(SECURE_LIST_KEYS.SAVED_EVENT_IDS)!);
    expect(entries).toEqual([{ id: 'evt-2', endsAt: 200 }]);
  });

  it('is a no-op when removing a non-existent ID', async () => {
    secureStoreMem.set(
      SECURE_LIST_KEYS.SAVED_EVENT_IDS,
      JSON.stringify([{ id: 'evt-1', endsAt: 100 }])
    );
    await removeEventIdLocally('evt-999');

    const entries = JSON.parse(secureStoreMem.get(SECURE_LIST_KEYS.SAVED_EVENT_IDS)!);
    expect(entries).toEqual([{ id: 'evt-1', endsAt: 100 }]);
  });
});

describe('clearSavedEventIdsLocally', () => {
  it('deletes the SecureStore key', async () => {
    secureStoreMem.set(SECURE_LIST_KEYS.SAVED_EVENT_IDS, JSON.stringify([{ id: 'a', endsAt: 1 }]));
    await clearSavedEventIdsLocally();
    expect(secureStoreMem.has(SECURE_LIST_KEYS.SAVED_EVENT_IDS)).toBe(false);
  });
});

// ============================================================================
// Migration from legacy AsyncStorage
// ============================================================================

describe('legacy AsyncStorage → SecureStore migration', () => {
  it('migrates legacy savedEventIds (string[]) and upgrades to SavedEntry[]', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === STORAGE_KEYS.SAVED_EVENT_IDS) return JSON.stringify(['evt-a', 'evt-b']);
      return null;
    });

    const before = Date.now();
    const entries = await fetchSavedEntriesLocally();
    const after = Date.now();

    expect(entries.map((e) => e.id)).toEqual(['evt-a', 'evt-b']);
    // Each upgraded entry has endsAt ≈ now + 1 year
    entries.forEach((entry: SavedEntry) => {
      expect(entry.endsAt).toBeGreaterThanOrEqual(before + ONE_YEAR_MS);
      expect(entry.endsAt).toBeLessThanOrEqual(after + ONE_YEAR_MS);
    });

    // Legacy AsyncStorage key was removed
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.SAVED_EVENT_IDS);

    // SecureStore now holds the upgraded SavedEntry[] (subsequent reads skip the upgrade)
    const stored = JSON.parse(secureStoreMem.get(SECURE_LIST_KEYS.SAVED_EVENT_IDS)!);
    expect(stored).toHaveLength(2);
    expect(stored[0]).toHaveProperty('id', 'evt-a');
    expect(stored[0]).toHaveProperty('endsAt');
  });

  it('returns SavedEntry[] as-is when SecureStore already holds the new shape', async () => {
    const entries = [{ id: 'a', endsAt: 100 }];
    secureStoreMem.set(SECURE_LIST_KEYS.SAVED_EVENT_IDS, JSON.stringify(entries));

    const result = await fetchSavedEntriesLocally();
    expect(result).toEqual(entries);
    // No migration write should happen
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('migrates legacy likedEventIds and upgrades shape', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === STORAGE_KEYS.LIKED_EVENT_IDS) return JSON.stringify(['like-1']);
      return null;
    });

    const result = await fetchLikedEntriesLocally();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('like-1');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.LIKED_EVENT_IDS);
  });

  it('migrates legacy followedOrgIds without shape change', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === STORAGE_KEYS.FOLLOWED_ORG_IDS) return JSON.stringify(['org-1', 'org-2']);
      return null;
    });

    const result = await fetchFollowedOrgIdsLocally();
    expect(result).toEqual(['org-1', 'org-2']);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.FOLLOWED_ORG_IDS);
    // Stored as plain string[] in SecureStore
    const stored = JSON.parse(secureStoreMem.get(SECURE_LIST_KEYS.FOLLOWED_ORG_IDS)!);
    expect(stored).toEqual(['org-1', 'org-2']);
  });
});

// ============================================================================
// Followed orgs round-trip
// ============================================================================

describe('writeFollowedOrgIdsLocally / fetchFollowedOrgIdsLocally', () => {
  it('round-trips followed org IDs', async () => {
    await writeFollowedOrgIdsLocally(['org-a', 'org-b']);
    const result = await fetchFollowedOrgIdsLocally();
    expect(result).toEqual(['org-a', 'org-b']);
  });
});

// ============================================================================
// clearAllUserData
// ============================================================================

describe('clearAllUserData', () => {
  it('clears AsyncStorage user data and the three SecureStore lists', async () => {
    secureStoreMem.set(SECURE_LIST_KEYS.SAVED_EVENT_IDS, JSON.stringify([{ id: 'a', endsAt: 1 }]));
    secureStoreMem.set(SECURE_LIST_KEYS.LIKED_EVENT_IDS, JSON.stringify([{ id: 'b', endsAt: 1 }]));
    secureStoreMem.set(SECURE_LIST_KEYS.FOLLOWED_ORG_IDS, JSON.stringify(['org']));

    await clearAllUserData();

    // AsyncStorage multiRemove was invoked with the legacy keys
    expect(AsyncStorage.multiRemove).toHaveBeenCalled();
    const removedKeys = (AsyncStorage.multiRemove as jest.Mock).mock.calls[0][0] as string[];
    expect(removedKeys).toEqual(expect.arrayContaining([STORAGE_KEYS.SAVED_EVENT_IDS]));
    expect(removedKeys).toEqual(expect.arrayContaining([STORAGE_KEYS.LIKED_EVENT_IDS]));
    expect(removedKeys).toEqual(expect.arrayContaining([STORAGE_KEYS.FOLLOWED_ORG_IDS]));
    expect(removedKeys).toEqual(expect.arrayContaining(['rsvpedEventIds']));

    // SecureStore lists are gone
    expect(secureStoreMem.has(SECURE_LIST_KEYS.SAVED_EVENT_IDS)).toBe(false);
    expect(secureStoreMem.has(SECURE_LIST_KEYS.LIKED_EVENT_IDS)).toBe(false);
    expect(secureStoreMem.has(SECURE_LIST_KEYS.FOLLOWED_ORG_IDS)).toBe(false);
  });
});

// ============================================================================
// Event Drafts (unchanged - stays in AsyncStorage)
// ============================================================================

describe('saveEventDraft', () => {
  it('saves draft with timestamp', async () => {
    const formData = { title: 'Draft Event' };
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    const result = await saveEventDraft(formData);

    expect(result).toEqual({ success: true });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.EVENT_DRAFT,
      JSON.stringify({ formData, savedAt: now })
    );

    jest.restoreAllMocks();
  });

  it('returns error on failure', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage full'));
    const result = await saveEventDraft({ title: 'X' });
    expect(result).toEqual({ success: false, error: 'Storage full' });
  });
});

describe('getEventDraft', () => {
  it('returns draft when valid and not expired', async () => {
    const now = Date.now();
    const savedAt = now - 1000;
    jest.spyOn(Date, 'now').mockReturnValue(now);

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({ formData: { title: 'Draft' }, savedAt })
    );

    const result = await getEventDraft();
    expect(result).toEqual({ formData: { title: 'Draft' }, savedAt });
    jest.restoreAllMocks();
  });

  it('returns null when draft is expired', async () => {
    const now = Date.now();
    const savedAt = now - DRAFT_CONFIG.EXPIRY_MS - 1000;
    jest.spyOn(Date, 'now').mockReturnValue(now);

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({ formData: { title: 'Old Draft' }, savedAt })
    );

    const result = await getEventDraft();
    expect(result).toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.EVENT_DRAFT);
    jest.restoreAllMocks();
  });

  it('returns null when no draft exists', async () => {
    const result = await getEventDraft();
    expect(result).toBeNull();
  });

  it('returns null on error', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('fail'));
    const result = await getEventDraft();
    expect(result).toBeNull();
  });
});

describe('clearEventDraft', () => {
  it('removes draft from storage', async () => {
    await clearEventDraft();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.EVENT_DRAFT);
  });
});

describe('hasEventDraft', () => {
  it('returns true when valid draft exists', async () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({ formData: {}, savedAt: now - 1000 })
    );

    const result = await hasEventDraft();
    expect(result).toBe(true);
    jest.restoreAllMocks();
  });

  it('returns false when no draft', async () => {
    const result = await hasEventDraft();
    expect(result).toBe(false);
  });

  it('returns false on error', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('fail'));
    const result = await hasEventDraft();
    expect(result).toBe(false);
  });
});

// ============================================================================
// writeSavedEntriesLocally direct API (large payload chunking smoke test)
// ============================================================================

// ============================================================================
// Home area (anonymous "near me" preference, AsyncStorage)
// ============================================================================

describe('home area (get/set/clear)', () => {
  // Stateful AsyncStorage mock so a set→get round-trip actually persists
  // (the outer beforeEach stubs getItem to always return null).
  let asyncMem: Map<string, string>;

  beforeEach(() => {
    asyncMem = new Map();
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) =>
      asyncMem.has(key) ? asyncMem.get(key)! : null
    );
    (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
      asyncMem.set(key, value);
    });
    (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
      asyncMem.delete(key);
    });
  });

  it('round-trips a token via set then get', async () => {
    await setHomeArea('m:be:7500');
    expect(asyncMem.get(STORAGE_KEYS.HOME_AREA)).toBe('m:be:7500');
    expect(await getHomeArea()).toBe('m:be:7500');
  });

  it('returns null when no home area is stored', async () => {
    expect(await getHomeArea()).toBeNull();
  });

  it('clear removes the stored token', async () => {
    await setHomeArea('p:nl:zuid-holland');
    await clearHomeArea();
    expect(asyncMem.has(STORAGE_KEYS.HOME_AREA)).toBe(false);
    expect(await getHomeArea()).toBeNull();
  });

  it('returns null and does not throw when getItem fails', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('boom'));
    await expect(getHomeArea()).resolves.toBeNull();
  });

  it('does not throw when setItem fails', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('boom'));
    await expect(setHomeArea('m:be:1000')).resolves.toBeUndefined();
  });
});

describe('writeSavedEntriesLocally', () => {
  it('chunks large payloads transparently', async () => {
    const big = Array.from({ length: 200 }, (_, i) => ({
      id: `event-${i}-padded-padded-padded`,
      endsAt: Date.now() + i,
    }));
    await writeSavedEntriesLocally(big);

    const top = JSON.parse(secureStoreMem.get(SECURE_LIST_KEYS.SAVED_EVENT_IDS)!);
    expect(top).toHaveProperty('__chunks');
    expect(top.__chunks).toBeGreaterThan(1);

    // Round-trip
    const result = await fetchSavedEntriesLocally();
    expect(result).toEqual(big);
  });
});
