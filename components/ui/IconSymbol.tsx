// This file is a fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import React from 'react';
import { OpaqueColorValue, StyleProp, TextStyle } from 'react-native';

// Add your SFSymbol to MaterialIcons mappings here.
const MAPPING = {
  // See MaterialIcons here: https://icons.expo.fyi
  // See SF Symbols in the SF Symbols app on Mac.
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  'heart.fill': 'favorite',
  heart: 'favorite-border',
  'list.bullet': 'list',
  'gearshape.fill': 'settings',
  eye: 'visibility',
  'eye.fill': 'remove-red-eye',
  magnifyingglass: 'search',
  'map.fill': 'map',
  map: 'map',
  'arrow.backward': 'arrow-back',
  'square.and.arrow.up': 'ios-share',
  calendar: 'event',
  'arrow.right': 'arrow-forward-ios',
  'photo.badge.plus': 'add-a-photo',
  'iphone.and.arrow.forward.inward': 'login',
  'iphone.and.arrow.right.outward': 'logout',
  'info.circle': 'info-outline',
  'exclamationmark.bubble': 'feedback',
  'document.badge.plus': 'post-add',
  'arrow.down': 'arrow-downward',
  'arrow.up': 'arrow-upward',
  checkmark: 'check',
  xmark: 'close',
  pencil: 'edit',
  'square.and.pencil': 'edit-note',
  'arrow.down.right.and.arrow.up.left': 'unfold-less',
  'arrow.up.left.and.arrow.down.right': 'unfold-more',
  'list.bullet.clipboard': 'list-alt',
  'line.3.horizontal.decrease': 'filter-list',
  'rectangle.fill': 'rectangle',
  key: 'key',
  'exclamationmark.triangle': 'warning-amber',
  bookmark: 'bookmark-border',
  'bookmark.fill': 'bookmark',
  'person.2': 'people',
  'checkmark.shield': 'verified-user',
  shield: 'shield',
  'checkmark.square.fill': 'check-box',
  square: 'check-box-outline-blank',
  ladybug: 'bug-report',
  megaphone: 'campaign',
  'chart.line.uptrend.xyaxis': 'trending-up',
  'plus.circle': 'add-circle-outline',
  clock: 'schedule',
  'doc.text': 'description',
  flag: 'flag',
  'chevron.forward': 'chevron-right',
  'rectangle.portrait.and.arrow.right': 'logout',
  'ellipsis.circle.fill': 'more-horiz',
  'person.crop.circle': 'account-circle',
  'hand.raised.fill': 'volunteer-activism',
  'text.document': 'description',
  plus: 'add',
  'doc.on.doc': 'content-copy',
  'rectangle.stack': 'library-books',
  trash: 'delete',
  'location.fill': 'location-on',
  'arrow.down.to.line': 'file-download',
  'lock.shield': 'security',
  'lock.shield.fill': 'security',
  'xmark.shield': 'gpp-bad',
  iphone: 'smartphone',
  'globe.europe.africa': 'public',
  'building.columns': 'account-balance',
  gear: 'settings',
  'arrow.up.forward': 'open-in-new',
  'checkmark.circle.fill': 'check-circle',
  'xmark.circle.fill': 'cancel',
  'questionmark.circle': 'help-outline',
  'minus.circle': 'remove-circle-outline',
  'arrow.triangle.turn.up.right.diamond': 'directions',
  star: 'star',
  'star.fill': 'star',
  ellipsis: 'more-horiz',
  'chart.bar': 'bar-chart',
  'bell.badge': 'notifications-active',
  'xmark.circle': 'cancel',
} as Partial<
  Record<
    Extract<import('expo-symbols').SymbolViewProps['name'], string>,
    React.ComponentProps<typeof MaterialIcons>['name']
  >
>;

export type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons on Android and web. This ensures a consistent look across platforms, and optimal resource usage.
 *
 * Icon `name`s are based on SFSymbols and require manual mapping to MaterialIcons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
