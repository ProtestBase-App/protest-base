import React, { useState } from 'react';
import { StyleSheet, TurboModuleRegistry, View } from 'react-native';

import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { MAP_STYLE_URLS } from '@/constants/MapStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { logger } from '@/utils/logger';
import { getThemeColors } from '@/utils/themeColors';

// MapLibre throws at import when its native modules are missing (Expo Go, Jest).
function loadMapComponents() {
  if (!TurboModuleRegistry.get('MLRNMapViewModule')) return null;
  try {
    const { MapLibreMap, Camera, MapMarker } = require('@/components/MapComponents');
    return MapLibreMap && Camera && MapMarker ? { MapLibreMap, Camera, MapMarker } : null;
  } catch (error) {
    logger.warn('[EventMapPreview] MapLibre failed to load', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

const mapComponents = loadMapComponents();

export interface EventMapPreviewProps {
  latitude: number;
  longitude: number;
}

/**
 * A still map with the event's pin. Renders nothing where MapLibre is unavailable.
 * Hidden from screen readers: the address is in the text beside it, and MapLibre's own
 * description is English and offers gestures this map turns off.
 */
export function EventMapPreview({ latitude, longitude }: EventMapPreviewProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const [mapLoaded, setMapLoaded] = useState(false);

  if (!mapComponents) return null;
  const { MapLibreMap, Camera, MapMarker } = mapComponents;

  return (
    <View aria-hidden style={styles.map}>
      <MapLibreMap
        style={styles.map}
        mapStyle={MAP_STYLE_URLS[colorScheme]}
        attribution={true}
        logo={false}
        dragPan={false}
        touchZoom={false}
        doubleTapZoom={false}
        doubleTapHoldZoom={false}
        touchRotate={false}
        touchPitch={false}
        onDidFinishLoadingMap={() => setMapLoaded(true)}
      >
        <Camera initialViewState={{ center: [longitude, latitude], zoom: 13 }} />
        <MapMarker coordinate={[longitude, latitude]} markerWidth={40} markerHeight={22} />
      </MapLibreMap>
      {!mapLoaded && (
        <View style={[styles.loading, { backgroundColor: themeColors.cardBackground }]}>
          <BrandLoader />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
