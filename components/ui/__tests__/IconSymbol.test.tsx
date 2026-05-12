// Mock dependencies BEFORE imports
jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: any) => React.createElement('MaterialIcons', props),
  };
});

// expo-symbols is only used by the iOS variant (IconSymbol.ios.tsx).
// Mock it so the import resolves cleanly in a non-iOS test environment.
jest.mock('expo-symbols', () => ({
  SymbolView: (props: any) => {
    const React = require('react');
    return React.createElement('SymbolView', props);
  },
}));

// NOTE: The jest-expo preset resolves imports with defaultPlatform='ios', so
// `require('@/components/ui/IconSymbol')` loads IconSymbol.ios.tsx instead of
// IconSymbol.tsx. We use the explicit .tsx extension to force the Android/web
// fallback to be loaded for coverage and functional testing.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { IconSymbol } = require('../IconSymbol.tsx');

import React from 'react';
import { render } from '@testing-library/react-native';

describe('IconSymbol (Android/web fallback - MaterialIcons)', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders without crashing', () => {
    const { toJSON } = render(<IconSymbol name="house.fill" color="#000000" />);
    expect(toJSON()).toBeTruthy();
  });

  it('maps house.fill to home', () => {
    const { toJSON } = render(<IconSymbol name="house.fill" color="#000000" />);
    const tree = toJSON() as any;
    expect(tree.props.name).toBe('home');
  });

  it('maps chevron.right to chevron-right', () => {
    const { toJSON } = render(<IconSymbol name="chevron.right" color="#000000" />);
    const tree = toJSON() as any;
    expect(tree.props.name).toBe('chevron-right');
  });

  it('maps chevron.left to chevron-left', () => {
    const { toJSON } = render(<IconSymbol name="chevron.left" color="#000000" />);
    const tree = toJSON() as any;
    expect(tree.props.name).toBe('chevron-left');
  });

  it('maps heart.fill to favorite', () => {
    const { toJSON } = render(<IconSymbol name="heart.fill" color="#FF0000" />);
    const tree = toJSON() as any;
    expect(tree.props.name).toBe('favorite');
  });

  it('maps heart to favorite-border', () => {
    const { toJSON } = render(<IconSymbol name="heart" color="#FF0000" />);
    const tree = toJSON() as any;
    expect(tree.props.name).toBe('favorite-border');
  });

  it('maps magnifyingglass to search', () => {
    const { toJSON } = render(<IconSymbol name="magnifyingglass" color="#000000" />);
    const tree = toJSON() as any;
    expect(tree.props.name).toBe('search');
  });

  it('maps trash to delete', () => {
    const { toJSON } = render(<IconSymbol name="trash" color="#FF0000" />);
    const tree = toJSON() as any;
    expect(tree.props.name).toBe('delete');
  });

  it('maps plus to add', () => {
    const { toJSON } = render(<IconSymbol name="plus" color="#000000" />);
    const tree = toJSON() as any;
    expect(tree.props.name).toBe('add');
  });

  it('maps gear to settings', () => {
    const { toJSON } = render(<IconSymbol name="gear" color="#000000" />);
    const tree = toJSON() as any;
    expect(tree.props.name).toBe('settings');
  });

  it('maps pencil to edit', () => {
    const { toJSON } = render(<IconSymbol name="pencil" color="#000000" />);
    const tree = toJSON() as any;
    expect(tree.props.name).toBe('edit');
  });

  it('passes color prop through to MaterialIcons', () => {
    const { toJSON } = render(<IconSymbol name="house.fill" color="#FF0000" />);
    const tree = toJSON() as any;
    expect(tree.props.color).toBe('#FF0000');
  });

  it('passes custom size prop to MaterialIcons', () => {
    const { toJSON } = render(<IconSymbol name="house.fill" color="#000000" size={32} />);
    const tree = toJSON() as any;
    expect(tree.props.size).toBe(32);
  });

  it('uses default size of 24 when no size provided', () => {
    const { toJSON } = render(<IconSymbol name="house.fill" color="#000000" />);
    const tree = toJSON() as any;
    expect(tree.props.size).toBe(24);
  });

  it('passes style prop to MaterialIcons', () => {
    const style = { marginRight: 8 };
    const { toJSON } = render(<IconSymbol name="chevron.right" color="#000000" style={style} />);
    const tree = toJSON() as any;
    expect(tree.props.style).toEqual(style);
  });

  it('maps calendar to event', () => {
    const { toJSON } = render(<IconSymbol name="calendar" color="#000000" />);
    const tree = toJSON() as any;
    expect(tree.props.name).toBe('event');
  });

  it('maps checkmark to check', () => {
    const { toJSON } = render(<IconSymbol name="checkmark" color="#000000" />);
    const tree = toJSON() as any;
    expect(tree.props.name).toBe('check');
  });

  it('maps xmark to close', () => {
    const { toJSON } = render(<IconSymbol name="xmark" color="#000000" />);
    const tree = toJSON() as any;
    expect(tree.props.name).toBe('close');
  });

  it('maps gearshape.fill to settings', () => {
    const { toJSON } = render(<IconSymbol name="gearshape.fill" color="#000000" />);
    const tree = toJSON() as any;
    expect(tree.props.name).toBe('settings');
  });

  it('maps location.fill to location-on', () => {
    const { toJSON } = render(<IconSymbol name="location.fill" color="#000000" />);
    const tree = toJSON() as any;
    expect(tree.props.name).toBe('location-on');
  });

  it('maps flag to flag', () => {
    const { toJSON } = render(<IconSymbol name="flag" color="#000000" />);
    const tree = toJSON() as any;
    expect(tree.props.name).toBe('flag');
  });

  it('renders various icon names without error', () => {
    const iconNames = [
      'list.bullet',
      'eye',
      'eye.fill',
      'map.fill',
      'arrow.backward',
      'square.and.arrow.up',
      'arrow.right',
      'photo.badge.plus',
      'iphone.and.arrow.forward.inward',
      'iphone.and.arrow.right.outward',
      'info.circle',
      'exclamationmark.bubble',
      'document.badge.plus',
      'arrow.down',
      'arrow.up',
      'arrow.down.right.and.arrow.up.left',
      'arrow.up.left.and.arrow.down.right',
      'list.bullet.clipboard',
      'line.3.horizontal.decrease',
      'rectangle.fill',
      'key',
      'exclamationmark.triangle',
      'bookmark',
      'bookmark.fill',
      'person.2',
      'checkmark.shield',
      'shield',
      'checkmark.square.fill',
      'square',
      'ladybug',
      'megaphone',
      'chart.line.uptrend.xyaxis',
      'plus.circle',
      'clock',
      'doc.text',
      'chevron.forward',
      'rectangle.portrait.and.arrow.right',
      'ellipsis.circle.fill',
      'person.crop.circle',
      'hand.raised.fill',
      'text.document',
      'map',
      'doc.on.doc',
      'rectangle.stack',
      'arrow.down.to.line',
      'lock.shield',
      'lock.shield.fill',
      'xmark.shield',
      'iphone',
      'globe.europe.africa',
      'building.columns',
      'arrow.up.forward',
      'checkmark.circle.fill',
      'xmark.circle.fill',
      'questionmark.circle',
      'minus.circle',
    ] as const;

    iconNames.forEach((name) => {
      const { toJSON } = render(<IconSymbol name={name} color="#000000" />);
      expect(toJSON()).toBeTruthy();
    });
  });

  it('renders with dark theme color', () => {
    const { toJSON } = render(<IconSymbol name="house.fill" color="#FFFFFF" />);
    const tree = toJSON() as any;
    expect(tree.props.color).toBe('#FFFFFF');
  });

  it('renders with light theme color', () => {
    const { toJSON } = render(<IconSymbol name="house.fill" color="#1A1A2E" />);
    const tree = toJSON() as any;
    expect(tree.props.color).toBe('#1A1A2E');
  });
});
