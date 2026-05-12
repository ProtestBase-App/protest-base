import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/StorageConfig';
import { logger } from '@/utils/logger';

export type HomeViewMode = 'calendar' | 'list';

const DEFAULT_VIEW: HomeViewMode = 'calendar';

function isHomeViewMode(value: unknown): value is HomeViewMode {
  return value === 'calendar' || value === 'list';
}

export function useHomeViewPreference() {
  const [viewMode, setViewModeState] = useState<HomeViewMode>(DEFAULT_VIEW);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.HOME_VIEW_PREFERENCE);
        if (!cancelled && isHomeViewMode(stored)) {
          setViewModeState(stored);
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
