import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TurboModuleRegistry } from 'react-native';

import { MAP_STYLE_URLS } from '@/constants/MapStyles';

const mockColorScheme = jest.fn<'light' | 'dark', []>(() => 'light');
jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: () => mockColorScheme() }));

// The preview loads MapLibre once, at import, and only when its native module exists.
const realGet = TurboModuleRegistry.get;
jest
  .spyOn(TurboModuleRegistry, 'get')
  .mockImplementation(((name: string) =>
    name === 'MLRNMapViewModule' ? {} : realGet(name)) as typeof TurboModuleRegistry.get);
const { EventMapPreview } =
  require('@/components/EventMapPreview') as typeof import('@/components/EventMapPreview');

describe('EventMapPreview', () => {
  it.each(['light', 'dark'] as const)('uses the %s basemap in the matching theme', (scheme) => {
    mockColorScheme.mockReturnValue(scheme);

    render(<EventMapPreview latitude={50.8466} longitude={4.3528} />);

    // The preview is aria-hidden, so the query has to include hidden elements.
    const map = screen.getByTestId('map-view', { includeHiddenElements: true });
    expect(map.props.mapStyle).toBe(MAP_STYLE_URLS[scheme]);
  });
});
