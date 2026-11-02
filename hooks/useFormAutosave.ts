import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { DRAFT_CONFIG } from '@/constants/StorageConfig';
import { t } from '@/utils/i18n';
import { logger } from '@/utils/logger';

export interface UseFormAutosaveOptions<T> {
  value: T;
  /** False until there is something worth keeping. */
  enabled: boolean;
  save: (value: T) => Promise<{ success: boolean; error?: unknown }>;
}

const MAX_ATTEMPTS = 3;

/** Saves `value` a moment after it stops changing, and warns once saving keeps failing. */
export function useFormAutosave<T>({ value, enabled, save }: UseFormAutosaveOptions<T>) {
  const failuresRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const timeout = setTimeout(async () => {
      let lastError: unknown = null;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const result = await save(value);
        if (result.success) {
          failuresRef.current = 0;
          return;
        }
        lastError = result.error;
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        }
      }

      failuresRef.current += 1;
      logger.warn('Draft save failed after retries', { error: String(lastError) });

      if (failuresRef.current === DRAFT_CONFIG.SAVE_FAILURE_THRESHOLD) {
        Alert.alert(t('draft.saveWarningTitle'), t('draft.saveWarningMessage'), [
          { text: t('common.ok') },
        ]);
      }
    }, DRAFT_CONFIG.AUTO_SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [value, enabled, save]);
}
