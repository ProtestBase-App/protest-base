/**
 * Design Tokens - Central source of truth for design values
 *
 * This file centralizes all design constants used throughout the app
 * to ensure consistency and make global design changes easier.
 */

export const Typography = {
  sizes: {
    xxs: 10, // Very small metadata, category badges in lists
    xs: 12, // Small metadata, helper text
    sm: 14, // Labels, secondary text
    base: 16, // Body text
    lg: 18, // Buttons, card titles
    xl: 20, // Section headings
    '2xl': 24, // Page titles
    '3xl': 32, // Main titles
  },
  lineHeights: {
    tight: 16,
    normal: 20,
    relaxed: 24,
    loose: 32,
  },
  families: {
    regular: 'Poppins-Regular',
    medium: 'Poppins-Medium',
    semiBold: 'Poppins-SemiBold',
    bold: 'Poppins-Bold',
    extraBold: 'Poppins-ExtraBold',
    black: 'Poppins-Black',
    thin: 'Poppins-Thin',
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  touchTargetPadding: 11, // Ensures 44x44pt minimum touch target (44 - 22 icon = 11 padding each side)
  bottomTabOffset: 50, // Account for tab bar height
} as const;

export const BorderRadius = {
  sm: 6, // Badges, small elements
  md: 8, // Buttons, inputs
  lg: 12, // Cards
  xl: 16, // Modals, large containers
  full: 9999, // Circular elements
} as const;

export const Shadows = {
  card: {
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
  },
  modal: {
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
    },
    android: {
      elevation: 5,
    },
  },
} as const;

export const IconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 22,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;
