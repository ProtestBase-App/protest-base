import { Text, type TextProps, StyleSheet } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';
import { Typography } from '@/constants/DesignTokens';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | 'default'
    | 'title'
    | 'defaultSemiBold'
    | 'subtitle'
    | 'link'
    | 'subtitleBold'
    | 'subtitleMedium'
    | 'thin'
    | 'cardTitle'
    | 'cardMetadata'
    | 'categoryBadge'
    | 'toolbarButton';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'subtitleBold' ? styles.subtitleBold : undefined,
        type === 'subtitleMedium' ? styles.subtitleMedium : undefined,
        type === 'thin' ? styles.thin : undefined,
        type === 'link' ? styles.link : undefined,
        type === 'cardTitle' ? styles.cardTitle : undefined,
        type === 'cardMetadata' ? styles.cardMetadata : undefined,
        type === 'categoryBadge' ? styles.categoryBadge : undefined,
        type === 'toolbarButton' ? styles.toolbarButton : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.base,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.base,
    lineHeight: 24,
  },
  title: {
    fontFamily: Typography.families.bold,
    fontSize: Typography.sizes['2xl'],
    lineHeight: 29,
    padding: 5,
  },
  subtitleBold: {
    fontFamily: Typography.families.bold,
    fontSize: Typography.sizes.xl,
  },
  subtitleMedium: {
    fontFamily: Typography.families.medium,
    fontSize: Typography.sizes.xl,
  },
  thin: {
    fontFamily: Typography.families.thin,
    fontSize: Typography.sizes.xl,
  },
  link: {
    fontFamily: Typography.families.regular,
    lineHeight: 30,
    fontSize: Typography.sizes.base,
    color: '#0a7ea4',
  },
  cardTitle: {
    fontFamily: Typography.families.bold,
    fontSize: Typography.sizes.lg,
    lineHeight: 24,
  },
  cardMetadata: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  categoryBadge: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
  },
  toolbarButton: {
    fontFamily: Typography.families.medium,
    fontSize: Typography.sizes.xs,
  },
});
