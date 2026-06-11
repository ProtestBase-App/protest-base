import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/StorageConfig';
import { logger } from '@/utils/logger';

export type HomeViewMode = 'month' | 'agenda';

const DEFAULT_VIEW: HomeViewMode = 'month';

/** Values persisted before the calendar tab redesign map onto the new modes. */
const LEGACY_VIEW_MAP: Record<string, HomeViewMode> = {
  calendar: 'month',
  list: 'agenda',
};

function toHomeViewMode(value: unknown): HomeViewMode | null {
  if (value === 'month' || value === 'agenda') return value;
  if (typeof value === 'string' && value in LEGACY_VIEW_MAP) return LEGACY_VIEW_MAP[value];
  return null;
}

export function useHomeViewPreference() {
  const [viewMode, setViewModeState] = useState<HomeViewMode>(DEFAULT_VIEW);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.HOME_VIEW_PREFERENCE);
        const mode = toHomeViewMode(stored);
        if (!cancelled && mode) {
          setViewModeState(mode);
        }
      } catch (error) {
        logger.warn('[useHomeViewPreference] Failed to load preference', {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setViewMode = useCallback((next: HomeViewMode) => {
    setViewModeState(next);
    AsyncStorage.setItem(STORAGE_KEYS.HOME_VIEW_PREFERENCE, next).catch((error) => {
      logger.warn('[useHomeViewPreference] Failed to persist preference', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, []);

  return { viewMode, setViewMode, ready };
}
