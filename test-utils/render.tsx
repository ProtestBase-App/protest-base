/**
 * Shared test render utility for component and screen tests.
 *
 * Provides `renderWithProviders()` which mocks all context hooks with sensible
 * defaults. Each test can override individual hook return values via options.
 *
 * Usage:
 * ```tsx
 * import { renderWithProviders, createMockEvent } from '@/test-utils/render';
 *
 * it('renders event card', () => {
 *   const { getByText } = renderWithProviders(<MyComponent />, {
 *     globalContext: { isLogged: true, user: createMockUser() },
 *   });
 *   expect(getByText('My Event')).toBeTruthy();
 * });
 * ```
 */
import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Re-export everything from testing library
export * from '@testing-library/react-native';

// Re-export mock factories from integration test utils
export {
  createMockEvent,
  createMockUser,
  createMockTemplate,
  flushPromises,
  resetTestState,
} from '../__integration_tests__/test-utils';

// ============================================================================
// Context mock types — each matches the real hook return type
// ============================================================================

export interface MockGlobalContext {
  isLogged?: boolean;
  setIsLogged?: jest.Mock;
  user?: { $id: string; email: string; name: string; [key: string]: any } | null;
  setUser?: jest.Mock;
  loading?: boolean;
  setLoading?: jest.Mock;
  userLanguage?: string;
  eventsCache?: Record<string, any>;
  eventsLoading?: boolean;
  refetchEvents?: jest.Mock;
  upsertEventInCache?: jest.Mock;
  removeEventFromCache?: jest.Mock;
  userEventCounts?: { total: number; upcoming: number; past: number } | null;
  userEventCountsLoading?: boolean;
  refreshUserEventCounts?: jest.Mock;
  clearAuthState?: jest.Mock;
}

export interface MockSavedEventsContext {
  savedEventIds?: string[];
  saveEvent?: jest.Mock;
  unsaveEvent?: jest.Mock;
  isSaved?: jest.Mock;
  loading?: boolean;
}

export interface MockLikedEventsContext {
  likedEventIds?: string[];
  likeEvent?: jest.Mock;
  unlikeEvent?: jest.Mock;
  isLiked?: jest.Mock;
  loading?: boolean;
}

export interface MockFollowedOrgsContext {
  followedOrgIds?: string[];
  followOrganization?: jest.Mock;
  unfollowOrganization?: jest.Mock;
  isFollowing?: jest.Mock;
  loading?: boolean;
}

export interface MockPostalCodeContext {
  getSubMunicipalityName?: jest.Mock;
  loading?: boolean;
  loadPostalCodesForCountry?: jest.Mock;
  cacheVersion?: number;
  getPostalCodeData?: jest.Mock;
}

export interface MockExploreTabContext {
  valueCategoryOpeningModal?: string | null;
  setValueCategoryOpeningModal?: jest.Mock;
  valueDateOpeningModal?: string | null;
  setValueDateOpeningModal?: jest.Mock;
  searchQuery?: string;
  setSearchQuery?: jest.Mock;
  locationFilter?: string[];
  setLocationFilter?: jest.Mock;
  valueLocationOpeningModal?: string[];
  setValueLocationOpeningModal?: jest.Mock;
  globalLocationFilterValue?: string[];
  setGlobalLocationFilterValue?: jest.Mock;
  organizationFilter?: string[];
  setOrganizationFilter?: jest.Mock;
  valueOrganizationOpeningModal?: string[];
  setValueOrganizationOpeningModal?: jest.Mock;
  globalOrganizationFilterValue?: string[];
  setGlobalOrganizationFilterValue?: jest.Mock;
  shouldScrollToTop?: boolean;
  setShouldScrollToTop?: jest.Mock;
}

export interface MockOrganizationsContext {
  organizations?: any[];
  dropdownItems?: any[];
  loading?: boolean;
  error?: string | null;
  refreshOrganizations?: jest.Mock;
}

export interface MockUserOrganizationsContext {
  userOrganizations?: any[];
  dropdownItems?: any[];
  selectedOrganizationId?: string | null;
  setSelectedOrganizationId?: jest.Mock;
  hasOrganizations?: boolean;
  hasSingleOrganization?: boolean;
  hasMultipleOrganizations?: boolean;
  loading?: boolean;
  error?: string | null;
  refreshOrganizations?: jest.Mock;
}

export interface MockTemplatesContext {
  templates?: any[];
  loading?: boolean;
  error?: string | null;
  refreshTemplates?: jest.Mock;
  addTemplate?: jest.Mock;
  editTemplate?: jest.Mock;
  removeTemplate?: jest.Mock;
  isStale?: jest.Mock;
  lastFetchTime?: number | null;
}

export interface MockPastEventsContext {
  pastEvents?: any[];
  pastEventsTotal?: number;
  loading?: boolean;
  error?: string | null;
  refreshPastEvents?: jest.Mock;
  isStale?: jest.Mock;
  lastFetchTime?: number | null;
}

export interface MockVersionCheckContext {
  canProceed?: boolean;
  showMaintenanceScreen?: boolean;
  showBlockingUpdateScreen?: boolean;
  showDismissibleUpdatePrompt?: boolean;
  showUpdateBadge?: boolean;
  maintenanceMessage?: string | null;
  updateMessage?: string | null;
  updateUrl?: string;
  isLoading?: boolean;
  dismissUpdatePrompt?: jest.Mock;
  openStore?: jest.Mock;
  retryCheck?: jest.Mock;
}

export interface ProviderOverrides {
  globalContext?: MockGlobalContext;
  savedEventsContext?: MockSavedEventsContext;
  likedEventsContext?: MockLikedEventsContext;
  followedOrgsContext?: MockFollowedOrgsContext;
  postalCodeContext?: MockPostalCodeContext;
  exploreTabContext?: MockExploreTabContext;
  organizationsContext?: MockOrganizationsContext;
  userOrganizationsContext?: MockUserOrganizationsContext;
  templatesContext?: MockTemplatesContext;
  pastEventsContext?: MockPastEventsContext;
  versionCheckContext?: MockVersionCheckContext;
}

// ============================================================================
// Default context values
// ============================================================================

const defaultGlobalContext: Required<MockGlobalContext> = {
  isLogged: false,
  setIsLogged: jest.fn(),
  user: null,
  setUser: jest.fn(),
  loading: false,
  setLoading: jest.fn(),
  userLanguage: 'en',
  eventsCache: {},
  eventsLoading: false,
  refetchEvents: jest.fn().mockResolvedValue(undefined),
  upsertEventInCache: jest.fn(),
  removeEventFromCache: jest.fn(),
  userEventCounts: null,
  userEventCountsLoading: false,
  refreshUserEventCounts: jest.fn().mockResolvedValue(undefined),
  clearAuthState: jest.fn().mockResolvedValue(undefined),
};

const defaultSavedEventsContext: Required<MockSavedEventsContext> = {
  savedEventIds: [],
  saveEvent: jest.fn().mockResolvedValue(null),
  unsaveEvent: jest.fn().mockResolvedValue(null),
  isSaved: jest.fn().mockReturnValue(false),
  loading: false,
};

const defaultLikedEventsContext: Required<MockLikedEventsContext> = {
  likedEventIds: [],
  likeEvent: jest.fn().mockResolvedValue(null),
  unlikeEvent: jest.fn().mockResolvedValue(null),
  isLiked: jest.fn().mockReturnValue(false),
  loading: false,
};

const defaultFollowedOrgsContext: Required<MockFollowedOrgsContext> = {
  followedOrgIds: [],
  followOrganization: jest.fn().mockResolvedValue(null),
  unfollowOrganization: jest.fn().mockResolvedValue(null),
  isFollowing: jest.fn().mockReturnValue(false),
  loading: false,
};

const defaultPostalCodeContext: Required<MockPostalCodeContext> = {
  getSubMunicipalityName: jest.fn().mockReturnValue(''),
  loading: false,
  loadPostalCodesForCountry: jest.fn().mockResolvedValue(undefined),
  cacheVersion: 0,
  getPostalCodeData: jest.fn().mockReturnValue([]),
};

const defaultExploreTabContext: Required<MockExploreTabContext> = {
  valueCategoryOpeningModal: 'allCategories',
  setValueCategoryOpeningModal: jest.fn(),
  valueDateOpeningModal: 'allDates',
  setValueDateOpeningModal: jest.fn(),
  searchQuery: '',
  setSearchQuery: jest.fn(),
  locationFilter: [],
  setLocationFilter: jest.fn(),
  valueLocationOpeningModal: [],
  setValueLocationOpeningModal: jest.fn(),
  globalLocationFilterValue: [],
  setGlobalLocationFilterValue: jest.fn(),
  organizationFilter: [],
  setOrganizationFilter: jest.fn(),
  valueOrganizationOpeningModal: [],
  setValueOrganizationOpeningModal: jest.fn(),
  globalOrganizationFilterValue: [],
  setGlobalOrganizationFilterValue: jest.fn(),
  shouldScrollToTop: false,
  setShouldScrollToTop: jest.fn(),
};

const defaultOrganizationsContext: Required<MockOrganizationsContext> = {
  organizations: [],
  dropdownItems: [],
  loading: false,
  error: null,
  refreshOrganizations: jest.fn().mockResolvedValue(undefined),
};

const defaultUserOrganizationsContext: Required<MockUserOrganizationsContext> = {
  userOrganizations: [],
  dropdownItems: [],
  selectedOrganizationId: null,
  setSelectedOrganizationId: jest.fn(),
  hasOrganizations: false,
  hasSingleOrganization: false,
  hasMultipleOrganizations: false,
  loading: false,
  error: null,
  refreshOrganizations: jest.fn().mockResolvedValue(undefined),
};

const defaultTemplatesContext: Required<MockTemplatesContext> = {
  templates: [],
  loading: false,
  error: null,
  refreshTemplates: jest.fn().mockResolvedValue(undefined),
  addTemplate: jest.fn().mockResolvedValue({}),
  editTemplate: jest.fn().mockResolvedValue({}),
  removeTemplate: jest.fn().mockResolvedValue(undefined),
  isStale: jest.fn().mockReturnValue(false),
  lastFetchTime: null,
};

const defaultPastEventsContext: Required<MockPastEventsContext> = {
  pastEvents: [],
  pastEventsTotal: 0,
  loading: false,
  error: null,
  refreshPastEvents: jest.fn().mockResolvedValue(undefined),
  isStale: jest.fn().mockReturnValue(false),
  lastFetchTime: null,
};

const defaultVersionCheckContext: Required<MockVersionCheckContext> = {
  canProceed: true,
  showMaintenanceScreen: false,
  showBlockingUpdateScreen: false,
  showDismissibleUpdatePrompt: false,
  showUpdateBadge: false,
  maintenanceMessage: null,
  updateMessage: null,
  updateUrl: '',
  isLoading: false,
  dismissUpdatePrompt: jest.fn(),
  openStore: jest.fn(),
  retryCheck: jest.fn().mockResolvedValue(undefined),
};

// ============================================================================
// Setup and teardown helpers
// ============================================================================

/**
 * Apply context mocks before rendering. Call this in beforeEach or at the top
 * of individual tests. This uses jest.mock at the module level for each
 * context module so the hooks return the mocked values.
 */
function applyContextMocks(overrides: ProviderOverrides = {}) {
  const global = { ...defaultGlobalContext, ...overrides.globalContext };
  const saved = { ...defaultSavedEventsContext, ...overrides.savedEventsContext };
  const liked = { ...defaultLikedEventsContext, ...overrides.likedEventsContext };
  const followed = { ...defaultFollowedOrgsContext, ...overrides.followedOrgsContext };
  const postal = { ...defaultPostalCodeContext, ...overrides.postalCodeContext };
  const explore = { ...defaultExploreTabContext, ...overrides.exploreTabContext };
  const orgs = { ...defaultOrganizationsContext, ...overrides.organizationsContext };
  const userOrgs = { ...defaultUserOrganizationsContext, ...overrides.userOrganizationsContext };
  const templates = { ...defaultTemplatesContext, ...overrides.templatesContext };
  const pastEvents = { ...defaultPastEventsContext, ...overrides.pastEventsContext };
  const version = { ...defaultVersionCheckContext, ...overrides.versionCheckContext };

  // Mock each context module's hook
  jest
    .spyOn(require('@/context/GlobalProvider'), 'useGlobalContext')
    .mockReturnValue(global as any);
  jest
    .spyOn(require('@/context/SavedEventsProvider'), 'useSavedEvents')
    .mockReturnValue(saved as any);
  jest
    .spyOn(require('@/context/LikedEventsProvider'), 'useLikedEvents')
    .mockReturnValue(liked as any);
  jest
    .spyOn(require('@/context/FollowedOrgsProvider'), 'useFollowedOrgs')
    .mockReturnValue(followed as any);
  jest
    .spyOn(require('@/context/PostalCodeProvider'), 'usePostalCodes')
    .mockReturnValue(postal as any);
  jest
    .spyOn(require('@/context/ExploreTabProvider'), 'useExploreTabContext')
    .mockReturnValue(explore as any);
  jest
    .spyOn(require('@/context/OrganizationsProvider'), 'useOrganizations')
    .mockReturnValue(orgs as any);
  jest
    .spyOn(require('@/context/UserOrganizationsProvider'), 'useUserOrganizations')
    .mockReturnValue(userOrgs as any);
  jest
    .spyOn(require('@/context/TemplatesProvider'), 'useTemplates')
    .mockReturnValue(templates as any);
  jest
    .spyOn(require('@/context/PastEventsProvider'), 'usePastEvents')
    .mockReturnValue(pastEvents as any);
  jest
    .spyOn(require('@/context/VersionCheckProvider'), 'useVersionCheck')
    .mockReturnValue(version as any);
}

// ============================================================================
// Wrapper component
// ============================================================================

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 375, height: 812 },
        insets: { top: 44, left: 0, right: 0, bottom: 34 },
      }}
    >
      {children}
    </SafeAreaProvider>
  );
}

// ============================================================================
// Main render function
// ============================================================================

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  providerOverrides?: ProviderOverrides;
}

/**
 * Render a component with all context hooks mocked and SafeAreaProvider wrapper.
 *
 * @example
 * ```tsx
 * const { getByText } = renderWithProviders(<MyScreen />, {
 *   providerOverrides: {
 *     globalContext: { isLogged: true, user: createMockUser() },
 *     savedEventsContext: { savedEventIds: ['event-1'] },
 *   },
 * });
 * ```
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options: RenderWithProvidersOptions = {}
) {
  const { providerOverrides = {}, ...renderOptions } = options;

  // Apply context mocks before rendering
  applyContextMocks(providerOverrides);

  return render(ui, {
    wrapper: TestWrapper,
    ...renderOptions,
  });
}
