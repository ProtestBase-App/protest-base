/**
 * Integration Test Utilities
 *
 * Provides real provider wrappers and mock helpers for integration tests.
 * These tests wire real providers together, mocking ONLY at the API/storage boundary.
 */
import React, { ReactNode } from 'react';
import { renderHook, act, RenderHookResult } from '@testing-library/react-native';
import type { Event } from '@/types/event.types';
import type { User } from '@/types/auth.types';
import type { ParsedEventTemplate } from '@/types/template.types';

// ============================================
// Mock Data Factories
// ============================================

let eventIdCounter = 0;

export function createMockEvent(overrides: Partial<Event> = {}): Event {
  eventIdCounter++;
  const id = `event-${eventIdCounter}`;
  return {
    $id: id,
    id,
    title: `Test Event ${eventIdCounter}`,
    description: 'A test event',
    organizer_name: 'Test Organizer',
    country: 'BE',
    start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // tomorrow
    ...overrides,
  };
}

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    $id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    emailVerification: true,
    status: true,
    registration: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockTemplate(
  overrides: Partial<ParsedEventTemplate> = {}
): ParsedEventTemplate {
  return {
    $id: `template-${Date.now()}`,
    $createdAt: new Date().toISOString(),
    $updatedAt: new Date().toISOString(),
    name: 'Test Template',
    organizer_id: 'user-1',
    event_data: {
      title: 'Template Event',
      description: 'Template description',
      country: 'BE',
    },
    ...overrides,
  };
}

export function createMockSession(userId: string, sessionId: string) {
  return {
    $id: sessionId,
    $createdAt: new Date().toISOString(),
    $updatedAt: new Date().toISOString(),
    userId,
    expire: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    provider: 'email',
    providerUid: '',
    clientName: 'ProtestBaseMobile',
    clientVersion: '2.0.6',
    current: true,
    factors: [],
  };
}

// ============================================
// Async Test Helpers
// ============================================

/**
 * Wait for all pending promises/timers to resolve.
 * Useful after triggering state updates in providers.
 */
export async function flushPromises(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/**
 * Wait for a condition to become true (with timeout).
 */
export async function waitFor(
  condition: () => boolean,
  { timeout = 5000, interval = 50 } = {}
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error(`waitFor timed out after ${timeout}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

// Reset counters between tests
export function resetTestState(): void {
  eventIdCounter = 0;
}
