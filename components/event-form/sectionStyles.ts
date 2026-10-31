import { StyleSheet } from 'react-native';

import { Spacing, Typography } from '@/constants/DesignTokens';

export const sectionStyles = StyleSheet.create({
  fieldSpacing: {
    marginTop: 24,
  },
  fieldLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.semiBold,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: 8,
  },
  controlSpacing: {
    marginTop: 8,
  },
  labelWithLoadingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldLoadingIndicator: {
    marginLeft: 8,
  },
});
