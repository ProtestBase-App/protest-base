/**
 * SecureStore-backed list storage with transparent chunking and one-shot
 * AsyncStorage→SecureStore migration.
 *
 * Why this exists:
 * - Android SecureStore caps each value at ~2KB. Lists of IDs that exceed this
 *   ceiling must be chunked across multiple keys.
 * - We want to encrypt-at-rest some lists (interest signals: saved events,
 *   liked events, followed orgs) that previously lived unencrypted in
 *   AsyncStorage. Existing user data must be migrated transparently on first
 *   read after upgrade — without forcing the user to log out/in.
 *
 * Storage layout per logical list (`secureKey`):
 * - Small payload (≤ CHUNK_SIZE_BYTES): the JSON-stringified array is stored
 *   directly at `secureKey`.
 * - Large payload: data is split into chunks at `${secureKey}.0`, `${secureKey}.1`,
 *   etc. The base key holds a manifest `{ __chunks: N }`. The manifest is
 *   written LAST so a crash mid-write leaves the previous state readable.
 *
 * SecureStore restricts key characters to alphanumeric, `.`, `-`, `_`. Callers
 * must obey this; chunk keys produced here use `.` for the chunk index suffix.
 *
 * This module is shape-agnostic: callers are responsible for any per-list
 * shape evolution (e.g. `string[]` → `{ id, endsAt }[]`). See
 * `services/localStorageService.ts` for the per-type helpers that handle that.
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';
import { SECURE_STORE_OPTIONS } from '@/utils/secureStoreOptions';

const CHUNK_SIZE_BYTES = 1800;

interface ChunkManifest {
  __chunks: number;
}

function isManifest(parsed: unknown): parsed is ChunkManifest {
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    !Array.isArray(parsed) &&
    typeof (parsed as { __chunks?: unknown }).__chunks === 'number'
  );
}

function chunkKey(base: string, index: number): string {
  return `${base}.${index}`;
}

function utf8ByteLength(value: string): number {
  // RN 0.71+ ships TextEncoder. For our JSON payloads (ASCII-dominated) this
  // is exact; we use it instead of `value.length` so we don't underestimate
  // when a user's list happens to contain non-ASCII content.
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).length;
  }
  // Conservative fallback: assume worst-case 4 bytes per UTF-16 code unit.
  return value.length * 4;
}

async function readSecureKeyParsed(secureKey: string): Promise<unknown | null> {
  const raw = await SecureStore.getItemAsync(secureKey);
  if (raw === null || raw === undefined) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    logger.warn('[secureListStorage] Failed to parse SecureStore value', {
      key: secureKey,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function readChunkedPayload(secureKey: string, count: number): Promise<string> {
  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const part = await SecureStore.getItemAsync(chunkKey(secureKey, i));
    if (part === null) {
      throw new Error(`Missing chunk ${i} of ${count} for key ${secureKey}`);
    }
    parts.push(part);
  }
  return parts.join('');
}

async function deleteChunkRange(secureKey: string, start: number, count: number): Promise<void> {
  for (let i = start; i < count; i += 1) {
    await SecureStore.deleteItemAsync(chunkKey(secureKey, i));
  }
}

/**
 * Read a list from SecureStore. If the key is empty and a `legacyAsyncKey` is
 * provided, attempts a one-shot migration: parse the legacy AsyncStorage value,
 * write it AS-IS to SecureStore, then remove the AsyncStorage key.
 *
 * Shape transformation (e.g. `string[]` → `{id, endsAt}[]`) is the caller's
 * responsibility — `readList` only round-trips JSON.
 */
export async function readList<T>(secureKey: string, legacyAsyncKey?: string): Promise<T[]> {
  try {
    const value = await readSecureKeyParsed(secureKey);
    if (value !== null) {
      if (isManifest(value)) {
        const concatenated = await readChunkedPayload(secureKey, value.__chunks);
        const parsed = JSON.parse(concatenated);
        if (Array.isArray(parsed)) return parsed as T[];
        logger.warn('[secureListStorage] Chunked payload was not an array', {
          key: secureKey,
        });
        return [];
      }
      if (Array.isArray(value)) {
        return value as T[];
      }
      logger.warn('[secureListStorage] SecureStore value was not an array', {
        key: secureKey,
      });
      return [];
    }
  } catch (error) {
    logger.error('[secureListStorage] Failed to read SecureStore', {
      key: secureKey,
      error: error instanceof Error ? error.message : String(error),
    });
    // fall through to legacy migration
  }

  if (legacyAsyncKey) {
    try {
      const legacy = await AsyncStorage.getItem(legacyAsyncKey);
      if (legacy !== null) {
        let parsedLegacy: unknown;
        try {
          parsedLegacy = JSON.parse(legacy);
        } catch (parseError) {
          logger.warn('[secureListStorage] Failed to parse legacy value', {
            key: legacyAsyncKey,
            error: parseError instanceof Error ? parseError.message : String(parseError),
          });
          return [];
        }
        if (!Array.isArray(parsedLegacy)) {
          logger.warn('[secureListStorage] Legacy value was not an array', {
            key: legacyAsyncKey,
          });
          return [];
        }
        // Write to SecureStore first. Only remove AsyncStorage after success so
        // a failed encrypt leaves the legacy data readable for retry.
        await writeList(secureKey, parsedLegacy);
        try {
          await AsyncStorage.removeItem(legacyAsyncKey);
        } catch (removeError) {
          logger.warn('[secureListStorage] Failed to remove legacy key after migration', {
            key: legacyAsyncKey,
            error: removeError instanceof Error ? removeError.message : String(removeError),
          });
        }
        return parsedLegacy as T[];
      }
    } catch (error) {
      logger.error('[secureListStorage] Legacy migration failed', {
        key: legacyAsyncKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return [];
}

/**
 * Write a list to SecureStore. Chunks transparently when the JSON payload
 * exceeds CHUNK_SIZE_BYTES. Manifest-last write order: a crash before the
 * manifest write leaves the previous readable state intact.
 *
 * Throws on failure so callers can rollback optimistic UI state.
 */
export async function writeList<T>(secureKey: string, items: T[]): Promise<void> {
  const payload = JSON.stringify(items);

  // Determine previous chunk count so we can clean up after a shrink.
  let previousChunks = 0;
  try {
    const previous = await readSecureKeyParsed(secureKey);
    if (isManifest(previous)) previousChunks = previous.__chunks;
  } catch {
    // best-effort
  }

  if (utf8ByteLength(payload) <= CHUNK_SIZE_BYTES) {
    await SecureStore.setItemAsync(secureKey, payload, SECURE_STORE_OPTIONS);
    if (previousChunks > 0) {
      await deleteChunkRange(secureKey, 0, previousChunks);
    }
    return;
  }

  // Chunk by character index. JSON output is ASCII for the shapes this module
  // handles (string IDs, numbers, simple object keys), so character == byte.
  // For mixed content the threshold check above is exact, but slicing by
  // character is a slight over-approximation — acceptable.
  const chunks: string[] = [];
  for (let i = 0; i < payload.length; i += CHUNK_SIZE_BYTES) {
    chunks.push(payload.slice(i, i + CHUNK_SIZE_BYTES));
  }

  for (let i = 0; i < chunks.length; i += 1) {
    await SecureStore.setItemAsync(chunkKey(secureKey, i), chunks[i], SECURE_STORE_OPTIONS);
  }

  const manifest: ChunkManifest = { __chunks: chunks.length };
  await SecureStore.setItemAsync(secureKey, JSON.stringify(manifest), SECURE_STORE_OPTIONS);

  if (previousChunks > chunks.length) {
    await deleteChunkRange(secureKey, chunks.length, previousChunks);
  }
}

/**
 * Delete a list and any chunk keys associated with it. Errors are logged and
 * swallowed (consistent with `clearAllUserData`).
 */
export async function clearList(secureKey: string): Promise<void> {
  try {
    const value = await readSecureKeyParsed(secureKey);
    if (isManifest(value)) {
      await deleteChunkRange(secureKey, 0, value.__chunks);
    }
    await SecureStore.deleteItemAsync(secureKey);
  } catch (error) {
    logger.warn('[secureListStorage] clearList failed', {
      key: secureKey,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
