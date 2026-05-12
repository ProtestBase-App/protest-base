/**
 * secureListStorage unit tests.
 *
 * The global jest.setup mock for expo-secure-store returns null. These tests
 * install a stateful in-memory mock so we can verify round-trips, chunking,
 * and migration end-to-end.
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readList, writeList, clearList } from '../secureListStorage';

// ============================================================================
// In-memory SecureStore mock
// ============================================================================

let secureStoreMem: Map<string, string>;

beforeEach(() => {
  secureStoreMem = new Map();
  jest.clearAllMocks();

  (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) => {
    return secureStoreMem.has(key) ? secureStoreMem.get(key)! : null;
  });
  (SecureStore.setItemAsync as jest.Mock).mockImplementation(async (key: string, value: string) => {
    secureStoreMem.set(key, value);
  });
  (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(async (key: string) => {
    secureStoreMem.delete(key);
  });

  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
});

// ============================================================================
// Tests
// ============================================================================

describe('secureListStorage', () => {
  describe('readList', () => {
    it('returns empty array when SecureStore is empty and no legacy key', async () => {
      const result = await readList('securelist.test');
      expect(result).toEqual([]);
    });

    it('returns empty array when SecureStore is empty and legacy AsyncStorage is also empty', async () => {
      const result = await readList('securelist.test', 'testLegacy');
      expect(result).toEqual([]);
    });

    it('returns parsed array from a small SecureStore payload', async () => {
      secureStoreMem.set('securelist.test', JSON.stringify(['a', 'b', 'c']));
      const result = await readList<string>('securelist.test');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('returns concatenated array from a chunked SecureStore payload', async () => {
      const items = Array.from({ length: 200 }, (_, i) => ({ id: `evt-${i}`, endsAt: 1000 + i }));
      await writeList('securelist.big', items);
      // Sanity: this produced a manifest, not a single payload
      const top = secureStoreMem.get('securelist.big');
      expect(top).toBeDefined();
      const parsed = JSON.parse(top!);
      expect(parsed).toHaveProperty('__chunks');
      expect(parsed.__chunks).toBeGreaterThan(1);

      const result = await readList<{ id: string; endsAt: number }>('securelist.big');
      expect(result).toEqual(items);
    });

    it('returns [] when stored value is not an array (corruption defense)', async () => {
      secureStoreMem.set('securelist.bad', JSON.stringify({ random: 'object' }));
      const result = await readList('securelist.bad');
      expect(result).toEqual([]);
    });

    it('returns [] on JSON parse failure', async () => {
      secureStoreMem.set('securelist.bad', 'not valid json{{{');
      const result = await readList('securelist.bad');
      expect(result).toEqual([]);
    });
  });

  describe('legacy AsyncStorage migration', () => {
    it('migrates legacy string[] data on first read', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === 'savedEventIds') return JSON.stringify(['evt-1', 'evt-2']);
        return null;
      });

      const result = await readList<string>('securelist.savedEventIds', 'savedEventIds');

      expect(result).toEqual(['evt-1', 'evt-2']);
      // Wrote to SecureStore as-is (string[])
      expect(secureStoreMem.get('securelist.savedEventIds')).toBe(
        JSON.stringify(['evt-1', 'evt-2'])
      );
      // Removed legacy key
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('savedEventIds');
    });

    it('migrates legacy entry[] data without altering shape', async () => {
      const entries = [{ id: 'a', endsAt: 1 }];
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === 'savedEventIds') return JSON.stringify(entries);
        return null;
      });

      const result = await readList('securelist.savedEventIds', 'savedEventIds');
      expect(result).toEqual(entries);
      expect(secureStoreMem.get('securelist.savedEventIds')).toBe(JSON.stringify(entries));
    });

    it('does NOT remove legacy key when SecureStore write fails', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === 'legacyKey') return JSON.stringify(['x']);
        return null;
      });
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(new Error('write failed'));

      // The wrapper rethrows from writeList; readList catches and returns [].
      const result = await readList('securelist.test', 'legacyKey');
      expect(result).toEqual([]);
      expect(AsyncStorage.removeItem).not.toHaveBeenCalledWith('legacyKey');
    });

    it('does not migrate when SecureStore already has data', async () => {
      secureStoreMem.set('securelist.test', JSON.stringify(['fromSecure']));
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(['fromAsync']));

      const result = await readList<string>('securelist.test', 'legacyKey');
      expect(result).toEqual(['fromSecure']);
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    });

    it('returns [] when legacy data is not an array', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ notAnArray: true }));
      const result = await readList('securelist.test', 'legacyKey');
      expect(result).toEqual([]);
      // Legacy key is left alone (not removed) since we didn't successfully migrate
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('writeList', () => {
    it('round-trips small payloads', async () => {
      await writeList('securelist.small', ['a', 'b']);
      const result = await readList<string>('securelist.small');
      expect(result).toEqual(['a', 'b']);
    });

    it('chunks large payloads (>1800 bytes)', async () => {
      const items = Array.from({ length: 200 }, (_, i) => ({
        id: `event-${i}-aaaaaaaaaaaaaaaa`,
        endsAt: Date.now() + i,
      }));
      await writeList('securelist.big', items);

      // Top-level should be a manifest
      const manifest = JSON.parse(secureStoreMem.get('securelist.big')!);
      expect(manifest).toHaveProperty('__chunks');
      expect(manifest.__chunks).toBeGreaterThan(1);

      // Each chunk key exists
      for (let i = 0; i < manifest.__chunks; i += 1) {
        expect(secureStoreMem.has(`securelist.big.${i}`)).toBe(true);
      }

      // Round-trip restores the data
      const result = await readList('securelist.big');
      expect(result).toEqual(items);
    });

    it('cleans up leftover chunks when shrinking from chunked to small', async () => {
      const big = Array.from({ length: 200 }, (_, i) => ({ id: `e-${i}`, endsAt: i }));
      await writeList('securelist.k', big);
      const initialChunkCount = JSON.parse(secureStoreMem.get('securelist.k')!).__chunks;
      expect(initialChunkCount).toBeGreaterThan(0);

      // Shrink to 1 entry
      await writeList('securelist.k', [{ id: 'only', endsAt: 0 }]);

      // Top key now holds the small payload directly (not a manifest)
      const top = secureStoreMem.get('securelist.k');
      expect(JSON.parse(top!)).toEqual([{ id: 'only', endsAt: 0 }]);

      // Old chunks were deleted
      for (let i = 0; i < initialChunkCount; i += 1) {
        expect(secureStoreMem.has(`securelist.k.${i}`)).toBe(false);
      }
    });

    it('cleans up extra chunks when chunked payload shrinks but stays chunked', async () => {
      const huge = Array.from({ length: 400 }, (_, i) => ({ id: `e-${i}`, endsAt: i }));
      await writeList('securelist.k', huge);
      const oldCount = JSON.parse(secureStoreMem.get('securelist.k')!).__chunks;

      const smaller = Array.from({ length: 100 }, (_, i) => ({ id: `e-${i}`, endsAt: i }));
      await writeList('securelist.k', smaller);
      const newCount = JSON.parse(secureStoreMem.get('securelist.k')!).__chunks;

      expect(newCount).toBeLessThan(oldCount);
      for (let i = newCount; i < oldCount; i += 1) {
        expect(secureStoreMem.has(`securelist.k.${i}`)).toBe(false);
      }
    });

    it('writes manifest LAST when chunking', async () => {
      const writeOrder: string[] = [];
      (SecureStore.setItemAsync as jest.Mock).mockImplementation(
        async (key: string, value: string) => {
          writeOrder.push(key);
          secureStoreMem.set(key, value);
        }
      );

      const big = Array.from({ length: 200 }, (_, i) => ({ id: `e-${i}`, endsAt: i }));
      await writeList('securelist.order', big);

      const manifestIndex = writeOrder.lastIndexOf('securelist.order');
      const allChunkKeys = writeOrder.filter((k) => k.startsWith('securelist.order.'));
      const lastChunkIndex = writeOrder.lastIndexOf(allChunkKeys[allChunkKeys.length - 1]);

      expect(manifestIndex).toBeGreaterThan(lastChunkIndex);
    });
  });

  describe('clearList', () => {
    it('removes a small-payload key', async () => {
      await writeList('securelist.k', ['a']);
      expect(secureStoreMem.has('securelist.k')).toBe(true);

      await clearList('securelist.k');
      expect(secureStoreMem.has('securelist.k')).toBe(false);
    });

    it('removes manifest + all chunks for a chunked payload', async () => {
      const big = Array.from({ length: 200 }, (_, i) => ({ id: `e-${i}`, endsAt: i }));
      await writeList('securelist.k', big);
      const chunks = JSON.parse(secureStoreMem.get('securelist.k')!).__chunks;
      expect(chunks).toBeGreaterThan(0);

      await clearList('securelist.k');
      expect(secureStoreMem.has('securelist.k')).toBe(false);
      for (let i = 0; i < chunks; i += 1) {
        expect(secureStoreMem.has(`securelist.k.${i}`)).toBe(false);
      }
    });

    it('does not throw when the key is already absent', async () => {
      await expect(clearList('securelist.never-existed')).resolves.toBeUndefined();
    });
  });
});
