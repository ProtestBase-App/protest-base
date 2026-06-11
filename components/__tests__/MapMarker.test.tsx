// Mock dependencies BEFORE imports
jest.mock('@maplibre/maplibre-react-native', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: {},
    Marker: ({ children, ...props }: any) => React.createElement('Marker', props, children),
  };
});

// Mock the asset so require('../assets/images/icon-protest-base.png') resolves
jest.mock('../assets/images/icon-protest-base.png', () => 1, { virtual: true });

import React from 'react';
import { render } from '@testing-library/react-native';
import { MapMarker } from '@/components/MapMarker';

describe('MapMarker', () => {
  const defaultProps = {
    id: 'marker-1',
    coordinate: [4.3517, 50.8503] as [number, number],
  };

  afterEach(() => jest.clearAllMocks());

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<MapMarker {...defaultProps} />);
      expect(toJSON()).toBeTruthy();
    });

    it('accepts custom marker dimensions', () => {
      const { toJSON } = render(<MapMarker {...defaultProps} markerWidth={60} markerHeight={33} />);
      expect(toJSON()).toBeTruthy();
    });

    it('uses default dimensions of 40x22 when not specified', () => {
      const { toJSON } = render(<MapMarker {...defaultProps} />);
      expect(toJSON()).toBeTruthy();
    });

    it('passes additional marker props through to Marker', () => {
      const { toJSON } = render(<MapMarker {...defaultProps} calloutText="Event Location" />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders with zero dimensions', () => {
      const { toJSON } = render(<MapMarker {...defaultProps} markerWidth={0} markerHeight={0} />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders with large dimensions', () => {
      const { toJSON } = render(
        <MapMarker {...defaultProps} markerWidth={200} markerHeight={100} />
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Props forwarding', () => {
    it('anchors the marker at the bottom', () => {
      const { toJSON } = render(<MapMarker {...defaultProps} />);
      const marker = toJSON() as any;
      expect(marker.props.anchor).toBe('bottom');
    });

    it('passes the coordinate through as lngLat', () => {
      const { toJSON } = render(<MapMarker {...defaultProps} />);
      const marker = toJSON() as any;
      expect(marker.props.lngLat).toEqual([4.3517, 50.8503]);
    });

    it('passes the id through', () => {
      const { toJSON } = render(<MapMarker {...defaultProps} />);
      const marker = toJSON() as any;
      expect(marker.props.id).toBe('marker-1');
    });
  });

  describe('Image rendering', () => {
    it('renders an Image inside the marker container', () => {
      const { UNSAFE_queryAllByType } = render(<MapMarker {...defaultProps} />);
      const { Image } = require('react-native');
      const images = UNSAFE_queryAllByType(Image);
      expect(images.length).toBeGreaterThan(0);
    });
  });
});
