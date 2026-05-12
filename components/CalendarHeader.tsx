import React from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getThemeColors } from '@/utils/themeColors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Typography, Spacing, BorderRadius } from '@/constants/DesignTokens';
import { getMonthName } from '@/utils/calendarUtils';

interface CalendarHeaderProps {
  /** Currently displayed year */
  year: number;
  /** Currently displayed month (0-based) */
  month: number;
  /** User language for localized month name */
  userLanguage: string;
  /** Called when the month/chevron is tapped to open the picker */
  onOpenPicker: () => void;
  /** Called when the "today" button is tapped */
  onGoToToday: () => void;
}

export default function CalendarHeader({
  year,
  month,
  userLanguage,
  onOpenPicker,
  onGoToToday,
}: CalendarHeaderProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const today = new Date();

  const monthName = getMonthName(month, userLanguage);

  return (
    <ThemedView style={styles.container}>
      <Pressable
        onPress={onOpenPicker}
        style={({ pressed }) => [styles.monthButton, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
        accessibilityLabel={`${monthName} ${year}, open month picker`}
      >
        <ThemedText style={styles.monthText}>{monthName}</ThemedText>
        <IconSymbol name="chevron.down" size={14} color={themeColors.text} />
      </Pressable>

      <View style={styles.rightSection}>
        <Pressable
          onPress={onGoToToday}
          style={({ pressed }) => [
            styles.todayButton,
            { borderColor: themeColors.text },
            pressed && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go to today"
        >
          <ThemedText style={styles.todayText}>{today.getDate()}</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  monthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  monthText: {
    fontFamily: Typography.families.bold,
    fontSize: Typography.sizes['2xl'],
    // Default ThemedText lineHeight is 24 — equal to the 24px font size, which
    // clips the cap of "M". Pin to ~1.25× so ascenders aren't cut off.
    lineHeight: 30,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayText: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.sm,
  },
});
