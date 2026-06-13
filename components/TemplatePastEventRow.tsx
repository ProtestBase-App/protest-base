import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ActionPill } from '@/components/ui/ActionPill';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getCategoryColors } from '@/constants/CategoryColors';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { PastEventForTemplate } from '@/types/template.types';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

export interface TemplatePastEventRowProps {
  event: PastEventForTemplate;
  /** "Use" — auto-creates a template from the event, then opens Create Event. */
  onUse: () => void;
  /** True while THIS row's template is being created. */
  using?: boolean;
  disabled?: boolean;
}

/**
 * Compact "reuse a past event" row: history-icon category tile, single-line
 * title, date · location meta, and a ghost Use pill.
 */
export default function TemplatePastEventRow({
  event,
  onUse,
  using = false,
  disabled = false,
}: TemplatePastEventRowProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const categoryColors = getCategoryColors(event.firstCategory);

  const meta = event.city ? `${event.formattedDate} · ${event.city}` : event.formattedDate;

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: themeColors.cardBackground, borderColor: themeColors.cardBorder },
      ]}
      testID={`past-event-row-${event.$id}`}
    >
      <View
        style={[
          styles.tile,
          { backgroundColor: categoryColors.bg, borderColor: categoryColors.border },
        ]}
      >
        <IconSymbol name="clock.arrow.circlepath" size={15} color={categoryColors.color} />
      </View>

      <View style={styles.info}>
        <ThemedText style={styles.title} numberOfLines={1}>
          {event.title}
        </ThemedText>
        <ThemedText style={[styles.meta, { color: themeColors.secondaryText }]} numberOfLines={1}>
          {meta}
        </ThemedText>
      </View>

      <ActionPill
        label={using ? t('templates.using') : t('templates.use')}
        onPress={onUse}
        disabled={disabled || using}
        testID={`past-event-use-${event.$id}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingVertical: 9,
    paddingHorizontal: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
  },
  tile: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.semiBold,
    lineHeight: 19,
  },
  meta: {
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 1,
  },
});
