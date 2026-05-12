import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGlobalContext } from './GlobalProvider';
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '@/services/template.service';
import {
  ParsedEventTemplate,
  CreateTemplateRequest,
  UpdateTemplateRequest,
} from '@/types/template.types';
import { logger } from '@/utils/logger';
import { API_LIMITS } from '@/constants/ApiConfig';
import { STORAGE_KEYS } from '@/constants/StorageConfig';

const TEMPLATES_CACHE_KEY = STORAGE_KEYS.TEMPLATES_CACHE;
const TEMPLATES_TIMESTAMP_KEY = STORAGE_KEYS.TEMPLATES_CACHE_TIMESTAMP;
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

interface TemplatesContextType {
  templates: ParsedEventTemplate[];
  loading: boolean;
  error: string | null;
  refreshTemplates: () => Promise<void>;
  addTemplate: (templateData: CreateTemplateRequest) => Promise<ParsedEventTemplate>;
  editTemplate: (
    templateId: string,
    updates: UpdateTemplateRequest
  ) => Promise<ParsedEventTemplate>;
  removeTemplate: (templateId: string) => Promise<void>;
  isStale: () => boolean;
  lastFetchTime: number | null;
}

const TemplatesContext = createContext<TemplatesContextType | undefined>(undefined);

export function TemplatesProvider({ children }: { children: ReactNode }) {
  const { user, isLogged } = useGlobalContext();
  const [templates, setTemplates] = useState<ParsedEventTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

  // Tracks the user we've fetched templates for, to avoid duplicate fetches.
  const fetchedForUserRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  const isStale = useCallback((): boolean => {
    if (!lastFetchTime) return true;
    return Date.now() - lastFetchTime > CACHE_EXPIRY_MS;
  }, [lastFetchTime]);

  const loadCachedData = useCallback(async (): Promise<{
    cache: ParsedEventTemplate[] | null;
    timestamp: number | null;
  }> => {
    try {
      const [cachedData, cachedTimestamp] = await Promise.all([
        AsyncStorage.getItem(TEMPLATES_CACHE_KEY),
        AsyncStorage.getItem(TEMPLATES_TIMESTAMP_KEY),
      ]);

      if (cachedData && cachedTimestamp) {
        const cache = JSON.parse(cachedData) as ParsedEventTemplate[];
        const timestamp = parseInt(cachedTimestamp, 10);
        return { cache, timestamp };
      }
    } catch (err) {
      logger.error('Failed to load templates cache:', { error: err });
    }
    return { cache: null, timestamp: null };
  }, []);

  const saveCacheData = useCallback(async (templatesData: ParsedEventTemplate[]) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(TEMPLATES_CACHE_KEY, JSON.stringify(templatesData)),
        AsyncStorage.setItem(TEMPLATES_TIMESTAMP_KEY, Date.now().toString()),
      ]);
    } catch (err) {
      logger.error('Failed to save templates cache:', { error: err });
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(TEMPLATES_CACHE_KEY),
        AsyncStorage.removeItem(TEMPLATES_TIMESTAMP_KEY),
      ]);
      setTemplates([]);
      setLastFetchTime(null);
      fetchedForUserRef.current = null;
    } catch (err) {
      logger.error('Failed to clear templates cache:', { error: err });
    }
  }, []);

  const fetchFromBackend = useCallback(async (): Promise<ParsedEventTemplate[]> => {
    const response = await getTemplates({ limit: API_LIMITS.TEMPLATES_DEFAULT, offset: 0 });
    return response;
  }, []);

  /** Force refetch from the backend, bypassing cache freshness checks. */
  const refreshTemplates = useCallback(async () => {
    if (!user?.$id || !isLogged) {
      setLoading(false);
      return;
    }

    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setError(null);

    try {
      const fetchedTemplates = await fetchFromBackend();

      const sortedTemplates = fetchedTemplates.sort((a, b) => {
        return new Date(b.$updatedAt).getTime() - new Date(a.$updatedAt).getTime();
      });

      setTemplates(sortedTemplates);
      setLastFetchTime(Date.now());
      fetchedForUserRef.current = user.$id;

      await saveCacheData(sortedTemplates);
    } catch (err: any) {
      logger.error('Failed to fetch templates:', { error: err });
      setError(err.message || 'Failed to fetch templates');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user?.$id, isLogged, fetchFromBackend, saveCacheData]);

  /** Optimistically prepend a new template; persists to cache in the background. */
  const addTemplate = useCallback(
    async (templateData: CreateTemplateRequest): Promise<ParsedEventTemplate> => {
      const createdTemplate = await createTemplate(templateData);

      setTemplates((prev) => {
        const updated = [createdTemplate, ...prev];
        saveCacheData(updated);
        return updated;
      });

      return createdTemplate;
    },
    [saveCacheData]
  );

  const editTemplate = useCallback(
    async (templateId: string, updates: UpdateTemplateRequest): Promise<ParsedEventTemplate> => {
      const updatedTemplate = await updateTemplate(templateId, updates);

      setTemplates((prev) => {
        const updated = prev.map((t) => (t.$id === templateId ? updatedTemplate : t));
        saveCacheData(updated);
        return updated;
      });

      return updatedTemplate;
    },
    [saveCacheData]
  );

  /** Optimistically remove a template, rolling back local state if the API call fails. */
  const removeTemplate = useCallback(
    async (templateId: string): Promise<void> => {
      const previousTemplates = templates;

      setTemplates((prev) => {
        const updated = prev.filter((t) => t.$id !== templateId);
        saveCacheData(updated);
        return updated;
      });

      try {
        await deleteTemplate(templateId);
      } catch (err) {
        setTemplates(previousTemplates);
        await saveCacheData(previousTemplates);
        throw err;
      }
    },
    [templates, saveCacheData]
  );

  // Load cached data first for instant UI, then fetch fresh if stale.
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      if (!isLogged || !user?.$id) {
        await clearCache();
        setLoading(false);
        return;
      }

      if (fetchedForUserRef.current === user.$id || isFetchingRef.current) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { cache, timestamp } = await loadCachedData();

        if (cache && timestamp && isMounted) {
          setTemplates(cache);
          setLastFetchTime(timestamp);

          const isCacheFresh = Date.now() - timestamp < CACHE_EXPIRY_MS;

          if (isCacheFresh) {
            fetchedForUserRef.current = user.$id;
            setLoading(false);
            return;
          }
        }

        if (isMounted && !isFetchingRef.current) {
          isFetchingRef.current = true;

          try {
            const fetchedTemplates = await fetchFromBackend();

            if (isMounted) {
              const sortedTemplates = fetchedTemplates.sort((a, b) => {
                return new Date(b.$updatedAt).getTime() - new Date(a.$updatedAt).getTime();
              });

              setTemplates(sortedTemplates);
              setLastFetchTime(Date.now());
              fetchedForUserRef.current = user.$id;

              await saveCacheData(sortedTemplates);
            }
          } catch (err: any) {
            if (isMounted) {
              logger.error('Failed to fetch templates:', { error: err });
              setError(err.message || 'Failed to fetch templates');
            }
          } finally {
            isFetchingRef.current = false;
          }
        }
      } catch (err: any) {
        if (isMounted) {
          logger.error('Failed to initialize templates:', { error: err });
          setError(err.message || 'Failed to initialize templates');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [user?.$id, isLogged, loadCachedData, fetchFromBackend, saveCacheData, clearCache]);

  return (
    <TemplatesContext.Provider
      value={{
        templates,
        loading,
        error,
        refreshTemplates,
        addTemplate,
        editTemplate,
        removeTemplate,
        isStale,
        lastFetchTime,
      }}
    >
      {children}
    </TemplatesContext.Provider>
  );
}

export function useTemplates(): TemplatesContextType {
  const context = useContext(TemplatesContext);
  if (context === undefined) {
    throw new Error('useTemplates must be used within a TemplatesProvider');
  }
  return context;
}
