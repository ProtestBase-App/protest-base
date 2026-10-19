/**
 * HomeAreaProvider — the France gate on a stored home area: a French token is
 * kept in storage but exposed only while France is offered, and counts as
 * loading until the backend has answered, so the Maps recenter waits for it.
 */
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';

let mockFrance = { franceEnabled: false, franceLoading: false };
const mockExpand = (values: string[]) => ({ codes: values, truncated: false });
jest.mock('@/context/PostalCodeProvider', () => ({
  usePostalCodes: () => ({
    locationFilterOptions: [],
    expandLocationTokens: mockExpand,
    resolveLocationLabel: (value: string) => `label:${value}`,
    ...mockFrance,
  }),
}));

jest.mock('@/services/localStorageService', () => ({
  getHomeArea: jest.fn(),
  setHomeArea: jest.fn().mockResolvedValue(undefined),
  clearHomeArea: jest.fn().mockResolvedValue(undefined),
}));

import { HomeAreaProvider, useHomeArea } from '@/context/HomeAreaProvider';
import { clearHomeArea, getHomeArea, setHomeArea } from '@/services/localStorageService';

const mockGetHomeArea = getHomeArea as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <HomeAreaProvider>{children}</HomeAreaProvider>
);

describe('HomeAreaProvider — France gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrance = { franceEnabled: false, franceLoading: false };
  });

  it('hides a stored French home area while France is off, without deleting it', async () => {
    mockGetHomeArea.mockResolvedValue('p:fr:75');
    const { result } = renderHook(() => useHomeArea(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.homeAreaToken).toBeNull();
    expect(result.current.homeAreaMatch).toBeNull();
    expect(result.current.homeAreaLabel).toBe('');
    expect(clearHomeArea).not.toHaveBeenCalled();
    expect(setHomeArea).not.toHaveBeenCalled();
  });

  it('counts a French home area as loading until the backend answers', async () => {
    mockFrance = { franceEnabled: false, franceLoading: true };
    mockGetHomeArea.mockResolvedValue('r:fr:corse');
    const { result, rerender } = renderHook(() => useHomeArea(), { wrapper });

    await act(async () => {});
    expect(result.current.loading).toBe(true);
    expect(result.current.homeAreaToken).toBeNull();

    mockFrance = { franceEnabled: true, franceLoading: false };
    rerender({});

    expect(result.current.loading).toBe(false);
    expect(result.current.homeAreaToken).toBe('r:fr:corse');
    expect(result.current.homeAreaLabel).toBe('label:r:fr:corse');
    expect(result.current.homeAreaMatch?.country).toBe('france');
  });

  it('leaves a Belgian home area alone whatever the France gate says', async () => {
    mockFrance = { franceEnabled: false, franceLoading: true };
    mockGetHomeArea.mockResolvedValue('m:be:7500');
    const { result } = renderHook(() => useHomeArea(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.homeAreaToken).toBe('m:be:7500');
  });

  it('lets a new pick replace a hidden French home area', async () => {
    mockGetHomeArea.mockResolvedValue('p:fr:75');
    const { result } = renderHook(() => useHomeArea(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setHomeArea('p:be:hainaut');
    });

    expect(result.current.homeAreaToken).toBe('p:be:hainaut');
    expect(setHomeArea).toHaveBeenCalledWith('p:be:hainaut');
  });
});
