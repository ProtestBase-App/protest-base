import { useEffect } from 'react';

import { apiPrefixReady } from '@/services/api';
import { isEventsPrefetchSafe, startEventsPrefetch } from '@/services/eventsBootstrap';
import { logger } from '@/utils/logger';

/**
 * Invisible bridge component that starts the cold-start events fetch as early
 * as possible, instead of waiting for the version and integrity gates to render
 * their children. Mounted above VersionCheckProvider in app/_layout.tsx;
 * GlobalProvider adopts the in-flight request, so this never adds a request.
 *
 * Best-effort by design: it waits for the persisted API prefix to hydrate (the
 * request needs it, and it is the one thing /app/config would otherwise supply)
 * and for the integrity credential to be usable, then eventsBootstrap decides
 * whether to run at all.
 */
export function EventsPrefetch() {
  useEffect(() => {
    let cancelled = false;

    apiPrefixReady
      .then(() => (cancelled ? false : isEventsPrefetchSafe()))
      .then((safe) => {
        if (cancelled || !safe) return;
        startEventsPrefetch();
      })
      .catch((error) => {
        // apiPrefixReady swallows its own errors, so this is belt-and-braces:
        // a failed prefetch must never keep the app from starting.
        logger.warn('[EventsPrefetch] Could not start the early events fetch', {
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
