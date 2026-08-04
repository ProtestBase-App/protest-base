// Mock dependencies BEFORE imports
jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key) => key),
}));

jest.mock('@/services/organizer.service', () => {
  // Real error class so the screen's instanceof branch works against rejections
  // created in these tests.
  class OrganizationNotFoundError extends Error {
    code = 'ORGANIZATION_NOT_FOUND' as const;
  }
  return {
    getOrganizationById: jest.fn(),
    OrganizationNotFoundError,
  };
});

jest.mock('@/services/event.service', () => ({
  getEventsBackend: jest.fn(),
}));

jest.mock('@/utils/eventFormatters', () => ({
  formatEventForDisplay: jest.fn((event) => ({ ...event })),
}));

jest.mock('@/hooks/useLogoScheme', () => ({
  useLogoScheme: jest.fn(() => ({ uri: 'mock-logo' })),
}));

jest.mock('@/utils/themeColors', () => ({
  getThemeColors: jest.fn(() => ({
    tint: '#F94460',
    text: '#000000',
    subtleText: '#666666',
    separator: '#EEEEEE',
    cardBackground: '#FFFFFF',
    cardBorder: '#E5E5E5',
    chevron: '#CCCCCC',
    secondaryText: '#333333',
    buttonSecondaryBackground: '#F0F0F0',
  })),
}));

jest.mock('@/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import React from 'react';
import { renderWithProviders } from '@/test-utils/render';
import OrganizerProfile from '../organizer/[id]';

const { useLocalSearchParams } = require('expo-router');
const { getOrganizationById, OrganizationNotFoundError } = require('@/services/organizer.service');
const { getEventsBackend } = require('@/services/event.service');

const makeDetail = () => ({
  $id: 'org-1',
  Name: 'Test Org',
  $createdAt: '2025-01-01T00:00:00.000Z',
  follower_count: 5,
  bio: 'We organize things',
});

/** Renders the screen with the followed-orgs context stubbed out. */
function renderScreen(followedOrgsContext = {}) {
  return renderWithProviders(<OrganizerProfile />, {
    providerOverrides: {
      globalContext: { userLanguage: 'en' },
      followedOrgsContext,
    },
  });
}

describe('OrganizerProfile — deleted organizations (REQ-FE-002)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLocalSearchParams.mockReturnValue({ id: 'org-1' });
    getOrganizationById.mockResolvedValue(makeDetail());
    getEventsBackend.mockResolvedValue({ events: [], total: 0 });
  });

  describe('when the backend confirms the organization is gone', () => {
    beforeEach(() => {
      getOrganizationById.mockRejectedValue(new OrganizationNotFoundError('org-1'));
    });

    it('shows the "no longer exists" state', async () => {
      const { findByText } = renderScreen();

      expect(await findByText('organizer.notFoundTitle')).toBeTruthy();
      expect(await findByText('organizer.notFoundBody')).toBeTruthy();
    });

    it('announces the state to screen readers', async () => {
      const { findByRole } = renderScreen();

      const alert = await findByRole('alert');
      expect(alert.props.accessibilityLabel).toBe(
        'organizer.notFoundTitle. organizer.notFoundBody'
      );
    });

    it('withholds the follow button so a dead org cannot be followed', async () => {
      const { findByText, queryByText } = renderScreen();

      await findByText('organizer.notFoundTitle');

      expect(queryByText('organizer.follow')).toBeNull();
      expect(queryByText('organizer.following')).toBeNull();
      expect(queryByText('organizer.seeAll')).toBeNull();
    });

    it('drops the local follow via markOrganizationDeleted', async () => {
      const markOrganizationDeleted = jest.fn();
      const { findByText } = renderScreen({
        followedOrgIds: ['org-1'],
        isFollowing: jest.fn().mockReturnValue(true),
        markOrganizationDeleted,
      });

      await findByText('organizer.notFoundTitle');

      expect(markOrganizationDeleted).toHaveBeenCalledWith('org-1');
    });
  });

  describe('when the organization already 404d earlier this session', () => {
    it('does not re-fetch it', async () => {
      const { findByText } = renderScreen({
        isKnownDeletedOrg: jest.fn().mockReturnValue(true),
      });

      await findByText('organizer.notFoundTitle');

      expect(getOrganizationById).not.toHaveBeenCalled();
      expect(getEventsBackend).not.toHaveBeenCalled();
    });

    // Seeded initial state, so no frame of the profile renders first.
    it('paints the gone state on the first render, without a flash', () => {
      const { queryByText } = renderScreen({
        isKnownDeletedOrg: jest.fn().mockReturnValue(true),
      });

      expect(queryByText('organizer.notFoundTitle')).toBeTruthy();
      expect(queryByText('organizer.follow')).toBeNull();
    });
  });

  describe('when the fetch fails for any other reason', () => {
    it('keeps the profile rather than claiming the org is deleted', async () => {
      getOrganizationById.mockRejectedValue(new Error('Network Error'));
      const markOrganizationDeleted = jest.fn();

      const { findByText, queryByText } = renderScreen({ markOrganizationDeleted });

      // Falls back to the cached-listing name path; the follow button survives.
      expect(await findByText('organizer.follow')).toBeTruthy();
      expect(queryByText('organizer.notFoundTitle')).toBeNull();
      expect(markOrganizationDeleted).not.toHaveBeenCalled();
    });
  });

  describe('happy path', () => {
    it('renders the profile and keeps the follow button', async () => {
      const { findByText } = renderScreen();

      expect(await findByText('Test Org')).toBeTruthy();
      expect(await findByText('organizer.follow')).toBeTruthy();
    });
  });
});
