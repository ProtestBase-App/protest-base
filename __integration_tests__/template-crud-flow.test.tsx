/**
 * Template CRUD Flow Integration Tests
 *
 * Wires real GlobalProvider + TemplatesProvider with mocked API responses.
 * Tests: create template appears in list, edit template updates,
 * delete template removes, optimistic updates with rollback.
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GlobalProvider, { useGlobalContext } from '@/context/GlobalProvider';
import { TemplatesProvider, useTemplates } from '@/context/TemplatesProvider';
import {
  createMockUser,
  createMockSession,
  createMockTemplate,
  flushPromises,
  resetTestState,
} from './test-utils';
import type { ParsedEventTemplate } from '@/types/template.types';
import { SECURE_STORE_KEYS } from '@/constants/StorageConfig';

// ============================================
// Mock ONLY the API/storage boundary
// ============================================

const mockSecureStore: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockSecureStore[key] || null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockSecureStore[key] = value;
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    delete mockSecureStore[key];
    return Promise.resolve();
  }),
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { apiBaseUrl: 'http://test' } },
}));

// Mock auth service - logged in user
const mockUser = createMockUser();
const mockSession = createMockSession(mockUser.$id, 'session-1');

jest.mock('@/services/auth.service', () => ({
  getCurrentUser: jest.fn(() => Promise.resolve(mockUser)),
  getCurrentUserSessions: jest.fn(() => Promise.resolve({ total: 1, session: [mockSession] })),
}));

// Mock event service
jest.mock('@/services/event.service', () => ({
  getEventsBackend: jest.fn(() => Promise.resolve({ events: [], total: 0, limit: 100, offset: 0 })),
  fetchEventCounts: jest.fn(() => Promise.resolve({ upcoming: 0, past: 0 })),
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {},
  setTokenExpirationCallback: jest.fn(),
}));

jest.mock('react-native/Libraries/Alert/Alert', () => ({
  __esModule: true,
  default: { alert: jest.fn() },
}));

// Mock template service (API boundary)
const mockGetTemplates = jest.fn();
const mockCreateTemplate = jest.fn();
const mockUpdateTemplate = jest.fn();
const mockDeleteTemplate = jest.fn();
jest.mock('@/services/template.service', () => ({
  getTemplates: (...args: any[]) => mockGetTemplates(...args),
  createTemplate: (...args: any[]) => mockCreateTemplate(...args),
  updateTemplate: (...args: any[]) => mockUpdateTemplate(...args),
  deleteTemplate: (...args: any[]) => mockDeleteTemplate(...args),
}));

// ============================================
// Tests
// ============================================

describe('Template CRUD Flow Integration', () => {
  let template1: ParsedEventTemplate;
  let template2: ParsedEventTemplate;

  beforeEach(() => {
    jest.clearAllMocks();
    resetTestState();
    Object.keys(mockSecureStore).forEach((key) => delete mockSecureStore[key]);

    // Setup logged-in state
    mockSecureStore[SECURE_STORE_KEYS.ACCESS_TOKEN] = 'valid-token';
    mockSecureStore[SECURE_STORE_KEYS.SESSION_ID] = 'session-1';

    template1 = createMockTemplate({
      $id: 't1',
      name: 'Weekly Protest',
      $updatedAt: '2025-01-01T00:00:00.000Z',
    });
    template2 = createMockTemplate({
      $id: 't2',
      name: 'Monthly Rally',
      $updatedAt: '2025-01-02T00:00:00.000Z',
    });

    // Default: no cached templates
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  function wrapper({ children }: { children: React.ReactNode }) {
    return (
      <GlobalProvider>
        <TemplatesProvider>{children}</TemplatesProvider>
      </GlobalProvider>
    );
  }

  function useTestHook() {
    const global = useGlobalContext();
    const templates = useTemplates();
    return { global, templates };
  }

  it('should load templates from API on mount for logged-in user', async () => {
    mockGetTemplates.mockResolvedValue([template1, template2]);

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    // Wait for templates to load (may need extra flush for nested provider)
    await act(async () => {
      await flushPromises();
    });

    expect(result.current.templates.templates).toHaveLength(2);
    // Should be sorted by updatedAt DESC
    expect(result.current.templates.templates[0].name).toBe('Monthly Rally');
    expect(result.current.templates.templates[1].name).toBe('Weekly Protest');
    expect(result.current.templates.loading).toBe(false);
  });

  it('should add a new template to the list (optimistic update)', async () => {
    mockGetTemplates.mockResolvedValue([template1]);

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await act(async () => {
      await flushPromises();
    });
    await act(async () => {
      await flushPromises();
    });

    expect(result.current.templates.templates).toHaveLength(1);

    // Create a new template
    const newTemplate = createMockTemplate({
      $id: 't-new',
      name: 'New Template',
      $updatedAt: new Date().toISOString(),
    });
    mockCreateTemplate.mockResolvedValue(newTemplate);

    await act(async () => {
      await result.current.templates.addTemplate({
        organization_id: 'org-1',
        name: 'New Template',
        event_data: { title: 'New Event', country: 'BE' },
      });
    });

    // New template should appear in list
    expect(result.current.templates.templates).toHaveLength(2);
    expect(result.current.templates.templates.find((t) => t.$id === 't-new')).toBeDefined();
  });

  it('should update an existing template in the list', async () => {
    mockGetTemplates.mockResolvedValue([template1]);

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await act(async () => {
      await flushPromises();
    });
    await act(async () => {
      await flushPromises();
    });

    const updatedTemplate = {
      ...template1,
      name: 'Updated Weekly Protest',
      $updatedAt: new Date().toISOString(),
    };
    mockUpdateTemplate.mockResolvedValue(updatedTemplate);

    await act(async () => {
      await result.current.templates.editTemplate('t1', {
        name: 'Updated Weekly Protest',
      });
    });

    // Template should be updated in place
    expect(result.current.templates.templates).toHaveLength(1);
    expect(result.current.templates.templates[0].name).toBe('Updated Weekly Protest');
  });

  it('should remove a template from the list (optimistic with rollback)', async () => {
    mockGetTemplates.mockResolvedValue([template1, template2]);

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await act(async () => {
      await flushPromises();
    });
    await act(async () => {
      await flushPromises();
    });

    expect(result.current.templates.templates).toHaveLength(2);

    // Delete template
    mockDeleteTemplate.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.templates.removeTemplate('t1');
    });

    // Template should be removed
    expect(result.current.templates.templates).toHaveLength(1);
    expect(result.current.templates.templates[0].$id).toBe('t2');
  });

  it('should rollback on delete failure', async () => {
    mockGetTemplates.mockResolvedValue([template1, template2]);

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await act(async () => {
      await flushPromises();
    });
    await act(async () => {
      await flushPromises();
    });

    expect(result.current.templates.templates).toHaveLength(2);

    // Delete fails
    mockDeleteTemplate.mockRejectedValue(new Error('Server error'));

    await expect(
      act(async () => {
        await result.current.templates.removeTemplate('t1');
      })
    ).rejects.toThrow('Server error');

    // Template should be rolled back (still present)
    expect(result.current.templates.templates).toHaveLength(2);
    expect(result.current.templates.templates.find((t) => t.$id === 't1')).toBeDefined();
  });

  it('should report stale cache correctly', async () => {
    mockGetTemplates.mockResolvedValue([template1]);

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await act(async () => {
      await flushPromises();
    });
    await act(async () => {
      await flushPromises();
    });

    // Just fetched, should not be stale
    expect(result.current.templates.isStale()).toBe(false);
    expect(result.current.templates.lastFetchTime).not.toBeNull();
  });

  it('should not load templates when user is not logged in', async () => {
    // Override logged-in state from beforeEach
    delete mockSecureStore['access_token'];
    delete mockSecureStore['session_id'];

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await act(async () => {
      await flushPromises();
    });
    await act(async () => {
      await flushPromises();
    });

    expect(result.current.templates.templates).toHaveLength(0);
    expect(result.current.templates.loading).toBe(false);
    expect(mockGetTemplates).not.toHaveBeenCalled();
  });

  it('should set error state when template fetch fails', async () => {
    mockGetTemplates.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await act(async () => {
      await flushPromises();
    });
    await act(async () => {
      await flushPromises();
    });

    expect(result.current.templates.error).toBe('Server error');
    expect(result.current.templates.templates).toHaveLength(0);
    expect(result.current.templates.loading).toBe(false);
  });

  it('should throw error when create template API fails', async () => {
    mockGetTemplates.mockResolvedValue([template1]);

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await act(async () => {
      await flushPromises();
    });
    await act(async () => {
      await flushPromises();
    });

    expect(result.current.templates.templates).toHaveLength(1);

    mockCreateTemplate.mockRejectedValue(new Error('Validation error'));

    await expect(
      act(async () => {
        await result.current.templates.addTemplate({
          organization_id: 'org-1',
          name: 'Bad Template',
          event_data: { title: 'Bad', country: 'BE' },
        });
      })
    ).rejects.toThrow('Validation error');

    // Templates list should be unchanged
    expect(result.current.templates.templates).toHaveLength(1);
    expect(result.current.templates.templates[0].$id).toBe('t1');
  });

  it('should throw error when update template API fails', async () => {
    mockGetTemplates.mockResolvedValue([template1]);

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await act(async () => {
      await flushPromises();
    });
    await act(async () => {
      await flushPromises();
    });

    mockUpdateTemplate.mockRejectedValue(new Error('Update failed'));

    await expect(
      act(async () => {
        await result.current.templates.editTemplate('t1', { name: 'Failed Update' });
      })
    ).rejects.toThrow('Update failed');

    // Template should be unchanged
    expect(result.current.templates.templates[0].name).toBe('Weekly Protest');
  });

  it('should use fresh cached data without calling backend', async () => {
    const cachedTemplates = [template1, template2];
    const recentTimestamp = Date.now() - 60000; // 1 minute ago (within 5min freshness)

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'templatesCache') {
        return Promise.resolve(JSON.stringify(cachedTemplates));
      }
      if (key === 'templatesCacheTimestamp') {
        return Promise.resolve(recentTimestamp.toString());
      }
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await act(async () => {
      await flushPromises();
    });
    await act(async () => {
      await flushPromises();
    });

    // Should have loaded from cache
    expect(result.current.templates.templates).toHaveLength(2);
    // Backend should NOT have been called (cache is fresh)
    expect(mockGetTemplates).not.toHaveBeenCalled();
  });

  it('should refresh templates from backend when refreshTemplates is called', async () => {
    mockGetTemplates
      .mockResolvedValueOnce([template1]) // initial load
      .mockResolvedValueOnce([template1, template2]); // refresh

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await act(async () => {
      await flushPromises();
    });
    await act(async () => {
      await flushPromises();
    });

    expect(result.current.templates.templates).toHaveLength(1);

    // Call refreshTemplates
    await act(async () => {
      await result.current.templates.refreshTemplates();
    });

    expect(result.current.templates.templates).toHaveLength(2);
    expect(mockGetTemplates).toHaveBeenCalledTimes(2);
  });

  it('should set error state when refreshTemplates fails', async () => {
    mockGetTemplates
      .mockResolvedValueOnce([template1]) // initial load
      .mockRejectedValueOnce(new Error('Refresh failed')); // refresh fails

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await act(async () => {
      await flushPromises();
    });
    await act(async () => {
      await flushPromises();
    });

    expect(result.current.templates.templates).toHaveLength(1);

    // Refresh fails
    await act(async () => {
      await result.current.templates.refreshTemplates();
    });

    expect(result.current.templates.error).toBe('Refresh failed');
  });

  it('should show loading state while templates are being fetched', async () => {
    let resolveTemplates: (value: any) => void;
    const templatesPromise = new Promise((resolve) => {
      resolveTemplates = resolve;
    });

    mockGetTemplates.mockReturnValue(templatesPromise);

    const { result } = renderHook(() => useTestHook(), { wrapper });

    await act(async () => {
      await flushPromises();
    });

    // Should be loading while fetch is pending
    expect(result.current.templates.loading).toBe(true);

    // Resolve the fetch
    await act(async () => {
      resolveTemplates!([template1]);
      await flushPromises();
    });
    await act(async () => {
      await flushPromises();
    });

    expect(result.current.templates.loading).toBe(false);
    expect(result.current.templates.templates).toHaveLength(1);
  });
});
