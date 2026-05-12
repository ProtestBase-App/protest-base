import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { MarkerView } from '@maplibre/maplibre-react-native';

interface MapMarkerProps {
  /**
   * The coordinate as [longitude, latitude] (GeoJSON order)
   */
  coordinate: [number, number];
  /**
   * Unique identifier for the annotation
   */
  id: string;
  /**
   * Text to display in the callout bubble when the marker is tapped
   */
  calloutText?: string;
  /**
   * Width of the marker in logical pixels
   * @default 40
   */
  markerWidth?: number;
  /**
   * Height of the marker in logical pixels
   * @default 22
   */
  markerHeight?: number;
}

/**
 * Custom map marker component that displays the ProtestBase logo
 * using MapLibre's MarkerView (renders native React Native views
 * reliably on both iOS and Android).
 */
export const MapMarker: React.FC<MapMarkerProps> = ({
  coordinate,
  markerWidth = 40,
  markerHeight = 22,
}) => {
  return (
    <MarkerView coordinate={coordinate} anchor={{ x: 0.5, y: 1 }}>
      <View style={styles.markerContainer}>
        <View style={{ width: markerWidth, height: markerHeight }}>
          <Image
            source={require('../assets/images/icon-protest-base.png')}
            style={styles.markerImage}
            resizeMode="contain"
          />
        </View>
      </View>
    </MarkerView>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    padding: 4,
  },
  markerImage: {
    width: '100%',
    height: '100%',
  },
});
